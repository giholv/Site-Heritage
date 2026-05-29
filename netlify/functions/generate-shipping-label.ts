import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FRENET_URL =
  process.env.FRENET_URL || "https://whitelabel-hml.frenet.dev/v1/shipments/oneclick";

function onlyNumbers(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function centsToMoney(cents: number | null | undefined) {
  return Number(cents || 0) / 100;
}

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Método não permitido" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const orderId = body.order_id;

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "order_id não informado" }),
      };
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        payment_status,
        total_cents,
        shipping_cents,
        customer_id,
        shipping_address_id,
        customers (
          id,
          full_name,
          email,
          phone,
          document
        ),
        addresses (
          id,
          recipient_name,
          phone,
          cep,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          country
        ),
        order_items (
          id,
          quantity,
          unit_price_cents,
          line_total_cents,
          skus (
            id,
            sku_code,
            variant_name,
            weight_kg,
            height_cm,
            width_cm,
            length_cm,
            products (
              id,
              name
            )
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Pedido não encontrado",
          details: orderError?.message,
        }),
      };
    }

    if (order.payment_status !== "paid") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ignored: true,
          reason: "Pedido ainda não está pago",
          payment_status: order.payment_status,
        }),
      };
    }

    const customer = Array.isArray(order.customers)
      ? order.customers[0]
      : order.customers;

    const address = Array.isArray(order.addresses)
      ? order.addresses[0]
      : order.addresses;

    const items = order.order_items || [];

    if (!customer || !address) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Cliente ou endereço não encontrado no pedido",
        }),
      };
    }

    const totalWeightKg = items.reduce((sum: number, item: any) => {
      const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
      const weight = Number(sku?.weight_kg || 0.3);
      return sum + weight * Number(item.quantity || 1);
    }, 0);

    const maxHeight = Math.max(
      4,
      ...items.map((item: any) => {
        const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
        return Number(sku?.height_cm || 4);
      })
    );

    const maxWidth = Math.max(
      16,
      ...items.map((item: any) => {
        const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
        return Number(sku?.width_cm || 16);
      })
    );

    const maxLength = Math.max(
      22,
      ...items.map((item: any) => {
        const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
        return Number(sku?.length_cm || 22);
      })
    );

    const payload = {
      order: {
        code: order.order_number || order.id,
        declared_value: centsToMoney(order.total_cents),
      },

      shipper: {
        name: env("CALEA_FROM_NAME"),
        document: onlyNumbers(env("CALEA_FROM_DOCUMENT")),
        phone: onlyNumbers(env("CALEA_FROM_PHONE")),
        email: env("CALEA_FROM_EMAIL"),
        address: {
          zipcode: onlyNumbers(env("CALEA_FROM_CEP")),
          street: env("CALEA_FROM_STREET"),
          number: env("CALEA_FROM_NUMBER"),
          complement: process.env.CALEA_FROM_COMPLEMENT || "",
          neighborhood: env("CALEA_FROM_NEIGHBORHOOD"),
          city: env("CALEA_FROM_CITY"),
          state: env("CALEA_FROM_STATE"),
        },
      },

      recipient: {
        name: address.recipient_name || customer.full_name,
        document: onlyNumbers(customer.document),
        phone: onlyNumbers(address.phone || customer.phone),
        email: customer.email,
        address: {
          zipcode: onlyNumbers(address.cep),
          street: address.street,
          number: address.number,
          complement: address.complement || "",
          neighborhood: address.neighborhood || "",
          city: address.city,
          state: address.state,
        },
      },

      package: {
        weight: Number(totalWeightKg || 0.3),
        height: maxHeight,
        width: maxWidth,
        length: maxLength,
      },

      items: items.map((item: any) => {
        const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
        const product = Array.isArray(sku?.products)
          ? sku.products[0]
          : sku?.products;

        return {
          sku_id: sku?.id,
          sku_code: sku?.sku_code,
          name: product?.name || sku?.variant_name || "Produto",
          quantity: item.quantity,
          unit_price: centsToMoney(item.unit_price_cents),
          total_price: centsToMoney(item.line_total_cents),
        };
      }),
    };

    await supabase
      .from("orders")
      .update({
        carrier: "frenet",
        shipping_status: "awaiting_post",
        shipping_payload: payload,
        shipping_error: null,
      })
      .eq("id", order.id);

    const response = await fetch(FRENET_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        token: env("FRENET_TOKEN"),
        "x-partner-token": env("FRENET_PARTNER_TOKEN"),
        "x-printing-format": process.env.FRENET_PRINTING_FORMAT || "pdf",
      },
      body: JSON.stringify(payload),
    });

    const frenetJson: any = await response.json().catch(() => null);

    if (!response.ok) {
      await supabase
        .from("orders")
        .update({
          shipping_error: JSON.stringify(frenetJson),
          shipping_response: frenetJson,
        })
        .eq("id", order.id);

      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: "Erro ao gerar etiqueta",
          frenet: frenetJson,
        }),
      };
    }

    const labelUrl =
      frenetJson?.label_url ||
      frenetJson?.labelUrl ||
      frenetJson?.url ||
      frenetJson?.data?.label_url ||
      null;

    const trackingCode =
      frenetJson?.tracking_code ||
      frenetJson?.trackingCode ||
      frenetJson?.data?.tracking_code ||
      null;

    await supabase
      .from("orders")
      .update({
        carrier: "frenet",
        shipping_status: "awaiting_post",
        tracking_code: trackingCode,
        shipping_label_url: labelUrl,
        shipping_response: frenetJson,
        shipping_generated_at: new Date().toISOString(),
        shipping_error: null,
      })
      .eq("id", order.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        tracking_code: trackingCode,
        shipping_label_url: labelUrl,
        frenet: frenetJson,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Erro interno ao gerar etiqueta",
      }),
    };
  }
};
// netlify/functions/generate-shipping-label.ts

import { createClient } from "@supabase/supabase-js";

console.log("ENV CHECK", {
  hasFrenetToken: Boolean(process.env.FRENET_TOKEN),
  hasPartnerToken: Boolean(process.env.FRENET_PARTNER_TOKEN),
  fromCep: process.env.CALEA_FROM_CEP,
  hasSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
  hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function centsToBRL(value: unknown) {
  return Number(value || 0) / 100;
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchFrenetQuotation(params: {
  frenetToken: string;
  fromCep: string;
  toCep: string;
  serviceCode: string;
  invoiceValue: number;
  weight: number;
  height: number;
  width: number;
  length: number;
}) {
  const quotePayload = {
    SellerCEP: params.fromCep,
    RecipientCEP: params.toCep,
    ShipmentInvoiceValue: params.invoiceValue,
    ShippingServiceCode: params.serviceCode,
    RecipientCountry: "BR",
    ShippingItemArray: [
      {
        Height: params.height,
        Length: params.length,
        Width: params.width,
        Weight: params.weight,
        Quantity: 1,
        SKU: "CALEA-PACKAGE",
        Category: "Semijoias",
      },
    ],
  };

  const resp = await fetch("https://api.frenet.com.br/shipping/quote", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      token: params.frenetToken,
    },
    body: JSON.stringify(quotePayload),
  });

  const text = await resp.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Erro ao consultar pré-cotação Frenet."
    );
  }

  const services =
    data?.ShippingSevicesArray ||
    data?.ShippingServicesArray ||
    data?.shippingServicesArray ||
    [];

  console.log(
    "SERVIÇOS FRENET RETORNADOS",
    services.map((s: any) => ({
      ServiceCode: s.ServiceCode,
      Code: s.Code,
      ServiceDescription: s.ServiceDescription,
      Carrier: s.Carrier,
      ShippingPrice: s.ShippingPrice,
      DeliveryTime: s.DeliveryTime,
      Error: s.Error,
      Msg: s.Msg,
    }))
  );

  const selected =
    services.find((s: any) => String(s.ServiceCode) === String(params.serviceCode)) ||
    services.find((s: any) => String(s.Code) === String(params.serviceCode));

  if (!selected) {
    throw new Error(
      `Serviço Frenet ${params.serviceCode} não encontrado na pré-cotação. Serviços retornados: ${services
        .map(
          (s: any) =>
            `${s.ServiceCode || s.Code} - ${s.ServiceDescription || s.Description || s.Carrier || "Sem descrição"
            }`
        )
        .join(", ")
      }`
    );
  }

  return selected;
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }



  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const frenetToken = process.env.FRENET_TOKEN;
  const partnerToken = process.env.FRENET_PARTNER_TOKEN;
  const fromCep = onlyDigits(process.env.CALEA_FROM_CEP ?? "18071093");


  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "Supabase env não configurado." }, 500);
  }

  if (!frenetToken) {
    return json({ ok: false, error: "FRENET_TOKEN não definido." }, 500);
  }

  if (!partnerToken) {
    return json({ ok: false, error: "FRENET_PARTNER_TOKEN não definido." }, 500);
  }

  if (fromCep.length !== 8) {
    return json({ ok: false, error: "FRENET_FROM_CEP inválido." }, 500);
  }

  try {
    const body = (await req.json()) as {
      order_id?: string;
    };

    const orderId = body.order_id;

    if (!orderId) {
      return json({ ok: false, error: "order_id obrigatório." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
      },
    });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        status,
        payment_status,
        total_cents,
        subtotal_cents,
        shipping_cents,
        discount_cents,
        gift_wrap_cents,
        tracking_code,
        carrier,
        shipping_label_generated,
        shipping_label_url,
        shipping_service_code,
        shipping_service_description,
        shipping_delivery_time,
        shipping_quote_raw,
        customers (
          id,
          email,
          full_name,
          phone,
          document
        ),
        addresses (
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
        )
      `
      )
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;

    if (!order) {
      return json({ ok: false, error: "Pedido não encontrado." }, 404);
    }

    if (order.payment_status !== "paid") {
      return json(
        { ok: false, error: "Só é possível gerar etiqueta de pedido pago." },
        400
      );
    }

    if (order.shipping_label_generated) {
      return json(
        {
          ok: false,
          error: "Etiqueta já foi gerada para este pedido.",
          shipping_label_url: order.shipping_label_url,
          tracking_code: order.tracking_code,
        },
        400
      );
    }

    if (!order.shipping_service_code) {
      return json(
        {
          ok: false,
          error:
            "Pedido sem serviço de frete escolhido. Gere etiqueta apenas para pedidos feitos após a integração da Frenet ou preencha o serviço de frete no pedido.",
          debug: {
            order_id: order.id,
            order_number: order.order_number,
            shipping_service_code: order.shipping_service_code,
            shipping_service_description: order.shipping_service_description,
            carrier: order.carrier,
          },
        },
        400
      );
    }



    const address = Array.isArray(order.addresses)
      ? order.addresses[0]
      : order.addresses;

    const customer = Array.isArray(order.customers)
      ? order.customers[0]
      : order.customers;

    if (!address) {
      return json({ ok: false, error: "Pedido sem endereço de entrega." }, 400);
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(
        `
        id,
        quantity,
        unit_price_cents,
        line_total_cents,
        skus (
          id,
          sku_code,
          weight_kg,
          height_cm,
          width_cm,
          length_cm,
          products (
            name
          )
        )
      `
      )
      .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    if (!items?.length) {
      return json({ ok: false, error: "Pedido sem itens." }, 400);
    }

    const endpoint =
      process.env.FRENET_URL ||
      "https://whitelabel.apifrenet.com.br/v1/shipments/oneclick";

    const packageWeight = items.reduce((acc: number, item: any) => {
      const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
      const weight = safeNumber(sku?.weight_kg, 0.03);
      return acc + weight * Number(item.quantity || 1);
    }, 0);

    const maxHeight = Math.max(
      2,
      ...items.map((item: any) => {
        const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
        return safeNumber(sku?.height_cm, 8);
      })
    );

    const maxWidth = Math.max(
      12,
      ...items.map((item: any) => {
        const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
        return safeNumber(sku?.width_cm, 12);
      })
    );

    const maxLength = Math.max(
      16,
      ...items.map((item: any) => {
        const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
        return safeNumber(sku?.length_cm, 16);
      })
    );

    /**
     * ATENÇÃO:
     * A estrutura abaixo pode precisar de ajuste fino conforme o payload liberado
     * no seu contrato/ambiente Frenet.
     *
     * Primeiro vamos mandar, ver o erro/retorno da Frenet e ajustar os nomes
     * dos campos se necessário.
     */
    const serviceCode = String(order.shipping_service_code || "");

    const recipientDocument = onlyDigits(customer?.document);
    const recipientPhone = onlyDigits(address.phone || customer?.phone);

    if (!serviceCode) {
      return json(
        {
          ok: false,
          error: "Pedido sem código de serviço Frenet.",
        },
        400
      );
    }

    if (!recipientDocument || recipientDocument.length < 11) {
      return json(
        {
          ok: false,
          error: "Cliente sem CPF/CNPJ válido para emissão da etiqueta.",
        },
        400
      );
    }

    if (!recipientPhone || recipientPhone.length < 10) {
      return json(
        {
          ok: false,
          error: "Cliente sem telefone válido para emissão da etiqueta.",
        },
        400
      );
    }

    if (!address.neighborhood) {
      return json(
        {
          ok: false,
          error: "Endereço sem bairro. A Frenet exige AddressQuarter.",
        },
        400
      );
    }

    if (!address.state || String(address.state).length !== 2) {
      return json(
        {
          ok: false,
          error: "Endereço sem UF válida.",
        },
        400
      );
    }

    const quotation = await fetchFrenetQuotation({
      frenetToken,
      fromCep,
      toCep: onlyDigits(address.cep),
      serviceCode,
      invoiceValue: centsToBRL(order.total_cents),
      weight: Number(Math.max(0.03, packageWeight).toFixed(3)),
      height: Number(Math.max(2, maxHeight)),
      width: Number(Math.max(11, maxWidth)),
      length: Number(Math.max(16, maxLength)),
    });

    const frenetPayload = {
      Quotation: quotation,

      Volumes: {
        Weight: Number(Math.max(0.03, packageWeight).toFixed(3)),
        Height: Number(Math.max(2, maxHeight)),
        Width: Number(Math.max(11, maxWidth)),
        Length: Number(Math.max(16, maxLength)),
      },

      Order: {
        Id: order.order_number || order.id,
        Value: centsToBRL(order.total_cents),

        To: {
          Name:
            address.recipient_name ||
            customer?.full_name ||
            "Cliente Caléa Blanc",
          Email: customer?.email || "",
          Phone: recipientPhone,
          Document: recipientDocument,

          Address: {
            ZipCode: onlyDigits(address.cep),
            Street: address.street,
            Number: address.number,
            Complement: address.complement || "",

            AddressQuarter: address.neighborhood || "",
            City: address.city,
            AddressState: address.state,

            Country: address.country || "BR",
          },
        },

        Items: items.map((item: any) => {
          const sku = Array.isArray(item.skus) ? item.skus[0] : item.skus;
          const product = Array.isArray(sku?.products)
            ? sku.products[0]
            : sku?.products;

          return {
            Sku: sku?.sku_code || sku?.id,
            Name: product?.name || "Produto",
            Quantity: Number(item.quantity || 1),
            Value: centsToBRL(item.unit_price_cents),
          };
        }),
      },
    };

    if (!serviceCode) {
      return json(
        {
          ok: false,
          error: "Pedido sem código de serviço Frenet.",
        },
        400
      );
    }

    if (!recipientDocument || recipientDocument.length < 11) {
      return json(
        {
          ok: false,
          error: "Cliente sem CPF/CNPJ válido para emissão da etiqueta.",
        },
        400
      );
    }

    if (!recipientPhone || recipientPhone.length < 10) {
      return json(
        {
          ok: false,
          error: "Cliente sem telefone válido para emissão da etiqueta.",
        },
        400
      );
    }

    if (!address.neighborhood) {
      return json(
        {
          ok: false,
          error: "Endereço sem bairro. A Frenet exige AddressQuarter.",
        },
        400
      );
    }

    if (!address.state || String(address.state).length !== 2) {
      return json(
        {
          ok: false,
          error: "Endereço sem UF válida.",
        },
        400
      );
    }
    await supabase
      .from("orders")
      .update({
        shipping_payload: [frenetPayload],
        shipping_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        token: frenetToken,
        "x-partner-token": partnerToken,
        "x-printing-format": process.env.FRENET_PRINTING_FORMAT || "pdf",
      },
      body: JSON.stringify([frenetPayload]),
    });

    const text = await resp.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      await supabase
        .from("orders")
        .update({
          shipping_response: data,
          shipping_error:
            data?.message ||
            data?.error ||
            data?.errors?.[0]?.message ||
            "Erro ao gerar etiqueta Frenet.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return json(
        {
          ok: false,
          error: "Erro ao gerar etiqueta Frenet.",
          details: data,
        },
        resp.status
      );
    }

    const labelUrl =
      data?.labelUrl ||
      data?.label_url ||
      data?.labelsUrl ||
      data?.labels_url ||
      data?.url ||
      data?.data?.labelUrl ||
      data?.data?.label_url ||
      null;

    const trackingCode =
      data?.trackingCode ||
      data?.tracking_code ||
      data?.data?.trackingCode ||
      data?.data?.tracking_code ||
      null;

    const frenetOrderId =
      data?.orderId ||
      data?.order_id ||
      data?.data?.orderId ||
      data?.data?.order_id ||
      null;

    const frenetShipmentId =
      data?.shipmentId ||
      data?.shipment_id ||
      data?.data?.shipmentId ||
      data?.data?.shipment_id ||
      null;

    await supabase
      .from("orders")
      .update({
        shipping_response: data,
        shipping_label_url: labelUrl,
        tracking_code: trackingCode,
        frenet_order_id: frenetOrderId,
        frenet_shipment_id: frenetShipmentId,
        shipping_generated_at: new Date().toISOString(),
        shipping_label_generated: Boolean(labelUrl || trackingCode || frenetOrderId),
        shipping_status: trackingCode ? "posted" : "awaiting_post",
        shipping_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return json({
      ok: true,
      label_url: labelUrl,
      tracking_code: trackingCode,
      frenet_order_id: frenetOrderId,
      frenet_shipment_id: frenetShipmentId,
      raw: data,
    });
  } catch (err: any) {
    return json(
      {
        ok: false,
        error: err?.message || "Erro interno ao gerar etiqueta.",
      },
      500
    );
  }
};
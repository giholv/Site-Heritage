import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function toCents(value: number | string | null | undefined) {
  return Math.round(Number(value || 0) * 100);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Método não permitido." });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, {
        ok: false,
        error: "Supabase service role não configurado.",
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = JSON.parse(event.body || "{}");

    const {
      form,
      items,
      checkoutDraft,
      customerId: oldCustomerId,
      addressId: oldAddressId,
      orderId: oldOrderId,
      orderNumber: oldOrderNumber,
    } = body;

    if (!form) throw new Error("Dados do cliente não enviados.");
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Carrinho vazio.");
    }

    const cleanEmail = String(form.email || "").trim().toLowerCase();
    const cleanPhone = onlyDigits(form.phone);
    const cleanDocument = onlyDigits(form.document);
    const cleanCep = onlyDigits(form.cep);

    if (!form.name) throw new Error("Nome obrigatório.");
    if (!cleanEmail) throw new Error("E-mail obrigatório.");
    if (!cleanDocument) throw new Error("CPF obrigatório.");
    if (!cleanCep || cleanCep.length !== 8) throw new Error("CEP inválido.");

    const now = new Date().toISOString();

    let customerId = oldCustomerId || null;
    let addressId = oldAddressId || null;
    let orderId = oldOrderId || null;
    let orderNumber = oldOrderNumber || null;

    const customerPayload = {
      email: cleanEmail,
      full_name: String(form.name || "").trim(),
      phone: cleanPhone,
      document: cleanDocument,
      updated_at: now,
    };

    if (customerId) {
      const { error } = await supabase
        .from("customers")
        .update(customerPayload)
        .eq("id", customerId);

      if (error) throw error;
    } else {
      const { data: existingCustomer, error: existingCustomerError } =
        await supabase
          .from("customers")
          .select("id")
          .eq("email", cleanEmail)
          .eq("document", cleanDocument)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (existingCustomerError) throw existingCustomerError;

      if (existingCustomer?.id) {
        customerId = existingCustomer.id;

        const { error } = await supabase
          .from("customers")
          .update(customerPayload)
          .eq("id", customerId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            ...customerPayload,
            created_at: now,
          })
          .select("id")
          .single();

        if (error) throw error;
        customerId = data.id;
      }
    }

    const addressPayload = {
      customer_id: customerId,
      label: "Entrega",
      recipient_name: String(form.name || "").trim(),
      phone: cleanPhone,
      cep: cleanCep,
      street: String(form.street || "").trim(),
      number: String(form.number || "").trim(),
      complement: String(form.complement || "").trim() || null,
      neighborhood: String(form.neighborhood || "").trim() || null,
      city: String(form.city || "").trim(),
      state: String(form.state || "").trim().toUpperCase(),
      country: "BR",
      is_default: true,
      updated_at: now,
    };

    if (addressId) {
      const { error } = await supabase
        .from("addresses")
        .update(addressPayload)
        .eq("id", addressId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          ...addressPayload,
          created_at: now,
        })
        .select("id")
        .single();

      if (error) throw error;
      addressId = data.id;
    }

    const selectedShipping = checkoutDraft?.shipping || null;

    if (!selectedShipping?.id) {
      throw new Error("Pedido sem serviço de frete escolhido.");
    }

    const merchandiseSubtotalCents = items.reduce((acc: number, item: any) => {
      const price = Number(item?.price || 0);
      const qty = Number(item?.qty || item?.quantity || 1);
      return acc + toCents(price) * qty;
    }, 0);

    const shippingCents = toCents(
      checkoutDraft?.shippingPrice ?? selectedShipping?.price ?? 0
    );

    const giftWrapCents = checkoutDraft?.giftWrap
      ? toCents(checkoutDraft?.giftWrapPrice || 0)
      : 0;

    const discountCents = Number(checkoutDraft?.discount_cents || 0);

    const totalCents = Math.max(
      merchandiseSubtotalCents + shippingCents + giftWrapCents - discountCents,
      0
    );

    const couponCode =
      checkoutDraft?.couponCode ||
      checkoutDraft?.coupon?.code ||
      null;

    const orderPayload = {
      customer_id: customerId,
      shipping_address_id: addressId,
      status: "draft",

      subtotal_cents: merchandiseSubtotalCents,
      shipping_cents: shippingCents,
      gift_wrap_cents: giftWrapCents,
      discount_cents: discountCents,
      total_cents: totalCents,

      coupon_code: couponCode,

      carrier: selectedShipping.carrier || null,
      shipping_service_code: selectedShipping.id || null,
      shipping_service_description: selectedShipping.name || null,
      shipping_delivery_time: selectedShipping.delivery_time || null,
      shipping_quote_raw: selectedShipping.raw || selectedShipping,

      origin: "site",
      updated_at: now,
    };

    if (orderId) {
      const { error } = await supabase
        .from("orders")
        .update(orderPayload)
        .eq("id", orderId);

      if (error) throw error;

      const { data: existingOrder, error: existingOrderError } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", orderId)
        .maybeSingle();

      if (existingOrderError) throw existingOrderError;

      orderNumber = existingOrder?.order_number || orderNumber;
    } else {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          ...orderPayload,
          created_at: now,
        })
        .select("id, order_number")
        .single();

      if (error) throw error;

      orderId = data.id;
      orderNumber = data.order_number || null;
    }

    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteItemsError) throw deleteItemsError;

    const orderItemsPayload = items
      .map((item: any) => {
        const skuId = item?.sku_id || item?.skuId || null;
        const qty = Number(item?.qty || item?.quantity || 1);
        const unitPriceCents = toCents(item?.price || 0);

        if (!skuId) return null;

        return {
          order_id: orderId,
          sku_id: skuId,
          quantity: qty,
          unit_price_cents: unitPriceCents,
          line_total_cents: unitPriceCents * qty,
        };
      })
      .filter(Boolean);

    if (!orderItemsPayload.length) {
      throw new Error("Nenhum item válido para salvar no pedido.");
    }

    const { error: insertItemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (insertItemsError) throw insertItemsError;

    return json(200, {
      ok: true,
      customerId,
      addressId,
      orderId,
      orderNumber,
      totalCents,
      discountCents,
      shippingCents,
      couponCode,
      selectedShipping,
    });
  } catch (error: any) {
    console.error("save-checkout error:", error);

    return json(500, {
      ok: false,
      error: error?.message || "Erro ao salvar checkout.",
      details: error,
    });
  }
};
// netlify/functions/pagarme-webhook.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "payment_failed"
  | "canceled"
  | "refunded"
  | "chargedback";

type UpdateOrderResult = {
  updated: boolean;
  matchedBy: string | null;
  orderId: string | null;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, {
        ok: false,
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas",
      });
    }

    const body = safeJson(event.body);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const eventType = getEventType(body);
    const payload = body?.data || body;

    const order = extractOrder(payload);
    const charge = extractCharge(payload);
    const transaction = extractTransaction(charge, payload);

    const providerOrderId = order?.id || payload?.order_id || null;
    const providerChargeId = charge?.id || payload?.charge_id || null;
    const providerTransactionId = transaction?.id || null;

    const localOrderId =
      order?.metadata?.local_order_id ||
      charge?.metadata?.local_order_id ||
      payload?.metadata?.local_order_id ||
      payload?.order?.metadata?.local_order_id ||
      null;

    const orderNumber =
      order?.metadata?.order_number ||
      order?.metadata?.local_order_number ||
      charge?.metadata?.order_number ||
      payload?.metadata?.order_number ||
      payload?.order?.metadata?.order_number ||
      null;

    const orderCode =
      order?.code ||
      charge?.code ||
      payload?.code ||
      payload?.order?.code ||
      orderNumber ||
      localOrderId ||
      null;

    const paymentMethod =
      charge?.payment_method ||
      transaction?.payment_method ||
      transaction?.transaction_type ||
      payload?.payment_method ||
      null;

    const newStatus = mapStatus(eventType, order?.status || charge?.status);
    const now = new Date().toISOString();

    const updateData: Record<string, any> = {
      status: newStatus,
      payment_status: newStatus,
      payment_method: paymentMethod,
      pagarme_order_id: providerOrderId,
      pagarme_charge_id: providerChargeId,
      pagarme_transaction_id: providerTransactionId,
      pagarme_event_type: eventType,
      pagarme_payload: body,
      updated_at: now,
    };

    if (newStatus === "paid") {
      updateData.paid_at = now;
      updateData.stock_reserved = false;
      updateData.stock_released_at = null;
      updateData.canceled_reason = null;
    }

    if (newStatus === "payment_failed") {
      updateData.payment_failed_at = now;
      updateData.canceled_reason = eventType;
    }

    if (newStatus === "canceled") {
      updateData.canceled_at = now;
      updateData.canceled_reason = eventType;
    }

    const updateResult = await updateOrderSafely({
      supabase,
      updateData,
      localOrderId,
      orderCode,
      orderNumber,
      providerOrderId,
      providerChargeId,
    });

    if (!updateResult.updated || !updateResult.orderId) {
      return json(200, {
        ok: true,
        received: true,
        updated: false,
        warning: "Webhook recebido, mas nenhum pedido local foi encontrado.",
        eventType,
        localOrderId,
        orderNumber,
        orderCode,
        providerOrderId,
        providerChargeId,
        status: newStatus,
      });
    }

    let stockReleased = false;
    let stockReleaseWarning: string | null = null;

    if (newStatus === "payment_failed" || newStatus === "canceled") {
      const releaseResult = await releaseReservedStock({
        supabase,
        orderId: updateResult.orderId,
        reason:
          newStatus === "canceled"
            ? "Pagamento cancelado pela Pagar.me"
            : "Pagamento recusado pela Pagar.me",
      });

      stockReleased = releaseResult.released;
      stockReleaseWarning = releaseResult.warning;
    }

    return json(200, {
      ok: true,
      received: true,
      updated: true,
      matchedBy: updateResult.matchedBy,
      eventType,
      localOrderId: updateResult.orderId,
      orderNumber,
      orderCode,
      providerOrderId,
      providerChargeId,
      status: newStatus,
      stockReleased,
      stockReleaseWarning,
    });
  } catch (error: any) {
    console.error("Erro ao processar webhook:", error);

    return json(500, {
      ok: false,
      error: "Erro ao processar webhook",
      details: error?.message || String(error),
    });
  }
};

function safeJson(raw: string | null) {
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getEventType(body: any) {
  return body?.type || body?.event || body?.event_type || "unknown";
}

function extractOrder(payload: any) {
  if (payload?.object === "order") return payload;
  if (payload?.order) return payload.order;
  if (payload?.data?.order) return payload.data.order;
  if (payload?.charges?.length) return payload;

  return null;
}

function extractCharge(payload: any) {
  if (payload?.object === "charge") return payload;
  if (payload?.charge) return payload.charge;
  if (payload?.data?.charge) return payload.data.charge;

  const order = extractOrder(payload);

  if (order?.charges?.length) {
    return order.charges[0];
  }

  return null;
}

function extractTransaction(charge: any, payload: any) {
  if (charge?.last_transaction) return charge.last_transaction;
  if (charge?.transactions?.length) return charge.transactions[0];
  if (payload?.last_transaction) return payload.last_transaction;
  if (payload?.transaction) return payload.transaction;

  return null;
}

function mapStatus(eventType: string, providerStatus?: string): OrderStatus {
  const event = String(eventType || "").toLowerCase();
  const status = String(providerStatus || "").toLowerCase();

  if (
    event.includes("paid") ||
    status === "paid" ||
    status === "approved" ||
    status === "captured"
  ) {
    return "paid";
  }

  if (
    event.includes("payment_failed") ||
    event.includes("failed") ||
    event.includes("refused") ||
    status === "failed" ||
    status === "refused" ||
    status === "denied"
  ) {
    return "payment_failed";
  }

  if (
    event.includes("canceled") ||
    event.includes("cancelled") ||
    status === "canceled" ||
    status === "cancelled"
  ) {
    return "canceled";
  }

  if (event.includes("refunded") || status === "refunded") {
    return "refunded";
  }

  if (event.includes("chargedback") || status === "chargedback") {
    return "chargedback";
  }

  return "pending_payment";
}

function isUuid(value?: string | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function updateOrderSafely(params: {
  supabase: any;
  updateData: Record<string, any>;
  localOrderId?: string | null;
  orderCode?: string | null;
  orderNumber?: string | null;
  providerOrderId?: string | null;
  providerChargeId?: string | null;
}): Promise<UpdateOrderResult> {
  const {
    supabase,
    updateData,
    localOrderId,
    orderCode,
    orderNumber,
    providerOrderId,
    providerChargeId,
  } = params;

  const attempts: Array<{
    column: string;
    value?: string | null;
    enabled: boolean;
  }> = [
    {
      column: "id",
      value: localOrderId,
      enabled: isUuid(localOrderId),
    },
    {
      column: "order_number",
      value: orderNumber,
      enabled: !!orderNumber,
    },
    {
      column: "order_number",
      value: orderCode,
      enabled: !!orderCode && !isUuid(orderCode),
    },
    {
      column: "order_code",
      value: orderCode,
      enabled: !!orderCode,
    },
    {
      column: "code",
      value: orderCode,
      enabled: !!orderCode,
    },
    {
      column: "pagarme_order_id",
      value: providerOrderId,
      enabled: !!providerOrderId,
    },
    {
      column: "pagarme_charge_id",
      value: providerChargeId,
      enabled: !!providerChargeId,
    },
  ];

  for (const attempt of attempts) {
    if (!attempt.enabled || !attempt.value) continue;

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq(attempt.column, attempt.value)
      .select("id")
      .limit(1);

    if (error) {
      const message = String(error.message || "");

      const columnDoesNotExist =
        message.includes("does not exist") ||
        message.includes("Could not find");

      if (columnDoesNotExist) {
        continue;
      }

      throw error;
    }

    if (data?.length) {
      return {
        updated: true,
        matchedBy: attempt.column,
        orderId: data[0].id,
      };
    }
  }

  return {
    updated: false,
    matchedBy: null,
    orderId: null,
  };
}

async function releaseReservedStock(params: {
  supabase: any;
  orderId: string;
  reason: string;
}) {
  const { supabase, orderId, reason } = params;

  const { data: localOrder, error: orderError } = await supabase
    .from("orders")
    .select("id, stock_reserved, stock_released_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  if (!localOrder) {
    return {
      released: false,
      warning: "Pedido local não encontrado para liberar estoque.",
    };
  }

  if (!localOrder.stock_reserved) {
    return {
      released: false,
      warning: "Pedido não estava com estoque reservado.",
    };
  }

  if (localOrder.stock_released_at) {
    return {
      released: false,
      warning: "Estoque já havia sido liberado anteriormente.",
    };
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("sku_id, quantity")
    .eq("order_id", orderId);

  if (itemsError) {
    throw itemsError;
  }

  for (const item of orderItems || []) {
    if (!item.sku_id || !item.quantity) continue;

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        sku_id: item.sku_id,
        movement_type: "release",
        quantity: Number(item.quantity),
        reason,
        reference_type: "order",
        reference_id: orderId,
        created_at: new Date().toISOString(),
      });

    if (movementError) {
      throw movementError;
    }
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      stock_reserved: false,
      stock_released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    throw updateError;
  }

  return {
    released: true,
    warning: null,
  };
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

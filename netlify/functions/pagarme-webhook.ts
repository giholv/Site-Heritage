// netlify/functions/pagarme-webhook.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas",
        }),
      };
    }

    const eventBody = JSON.parse(event.body || "{}");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const eventType = eventBody?.type || eventBody?.event || null;
    const data = eventBody?.data || eventBody;

    const providerOrderId =
      data?.id ||
      data?.order?.id ||
      data?.charge?.order_id ||
      null;

    const localOrderId =
      data?.metadata?.local_order_id ||
      data?.order?.metadata?.local_order_id ||
      null;

    let newStatus = "pending";

    switch (eventType) {
      case "order.paid":
      case "charge.paid":
        newStatus = "paid";
        break;

      case "order.payment_failed":
      case "charge.payment_failed":
        newStatus = "payment_failed";
        break;

      case "order.canceled":
        newStatus = "canceled";
        break;

      case "charge.refunded":
        newStatus = "refunded";
        break;

      case "charge.chargedback":
        newStatus = "chargedback";
        break;

      default:
        newStatus = "pending";
        break;
    }

    if (localOrderId) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: newStatus,
          pagarme_order_id: providerOrderId,
          pagarme_event_type: eventType,
          pagarme_payload: data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", localOrderId);

      if (updateError) {
        throw updateError;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        received: true,
        eventType,
        localOrderId,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "Erro ao processar webhook",
        details: error?.message || String(error),
      }),
    };
  }
};
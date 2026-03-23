// netlify/functions/pagarme-webhook.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const eventType = event?.type || event?.event || null;
    const data = event?.data || event;
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
      case "charge.refunded":
        newStatus = "canceled";
        break;
      case "charge.chargedback":
        newStatus = "chargedback";
        break;
      default:
        newStatus = "pending";
        break;
    }

    if (localOrderId) {
      await supabase
        .from("orders")
        .update({
          payment_status: newStatus,
          pagarme_order_id: providerOrderId,
          pagarme_event_type: eventType,
          pagarme_payload: data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", localOrderId);
    }

    return json({ ok: true });
  } catch (error: any) {
    return json(
      { error: "Erro ao processar webhook", details: error?.message || String(error) },
      500
    );
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(),
  });
}
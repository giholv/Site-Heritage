import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase envs não configuradas.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export const handler: Handler = async () => {
  const now = new Date().toISOString();

  const { data: expiredOrders, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("stock_reserved", true)
    .is("stock_released_at", null)
    .lte("pix_expires_at", now)
    .in("status", ["draft", "pending", "pending_payment", "waiting_payment"]);

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }

  let released = 0;

  for (const order of expiredOrders || []) {
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("sku_id, quantity")
      .eq("order_id", order.id);

    if (itemsError) {
      console.error("Erro ao buscar itens:", itemsError);
      continue;
    }

    for (const item of orderItems || []) {
      if (!item.sku_id || !item.quantity) continue;

      await supabase.from("inventory_movements").insert({
        sku_id: item.sku_id,
        movement_type: "release",
        quantity: Number(item.quantity),
        reason: "Pix expirado - estoque liberado",
        reference_type: "order",
        reference_id: order.id,
        created_at: new Date().toISOString(),
      });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "canceled",
        stock_reserved: false,
        stock_released_at: new Date().toISOString(),
        canceled_reason: "Pix expirado em 10 minutos",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (!updateError) released++;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      checked: expiredOrders?.length || 0,
      released,
    }),
  };
};
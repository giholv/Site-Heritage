import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        ok: false,
        error: "Método não permitido.",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const orderId = String(body.orderId || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Pedido não informado.",
        }),
      };
    }

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "E-mail não informado.",
        }),
      };
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        payment_status,
        external_customer_email,
        customer_id
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          ok: false,
          error: "Pedido não encontrado.",
        }),
      };
    }

    /*
      Validação do comprador.

      Primeiro tenta o e-mail gravado no próprio pedido.
      Se não estiver disponível, consulta customers.
    */

    let orderEmail = String(
      order.external_customer_email || ""
    )
      .trim()
      .toLowerCase();

    if (!orderEmail && order.customer_id) {
      const { data: customer, error: customerError } =
        await supabaseAdmin
          .from("customers")
          .select("email")
          .eq("id", order.customer_id)
          .maybeSingle();

      if (customerError) {
        throw customerError;
      }

      orderEmail = String(customer?.email || "")
        .trim()
        .toLowerCase();
    }

    if (!orderEmail || orderEmail !== email) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          ok: false,
          error: "Pedido não autorizado.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        ok: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          paymentStatus: order.payment_status,
        },
      }),
    };
  } catch (error: any) {
    console.error("get-order-status:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Não foi possível consultar o pedido.",
      }),
    };
  }
};
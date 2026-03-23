// netlify/functions/pagarme-create-order.ts
export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const secretKey = Deno.env.get("PAGARME_SECRET_KEY");
    if (!secretKey) {
      return json({ error: "PAGARME_SECRET_KEY não configurada" }, 500);
    }

    const body = await req.json();

    const {
      orderId,
      customer,
      items,
      shippingAmount = 0,
      discountAmount = 0,
      pixExpiresInSeconds = 1800,
    } = body ?? {};

    if (!orderId) return json({ error: "orderId é obrigatório" }, 400);
    if (!customer?.name) return json({ error: "customer.name é obrigatório" }, 400);
    if (!customer?.email) return json({ error: "customer.email é obrigatório" }, 400);
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: "items é obrigatório" }, 400);
    }

    const pagarmeItems = items.map((item: any) => ({
      amount: Number(item.amount), // centavos
      description: String(item.description),
      quantity: Number(item.quantity ?? 1),
      code: item.code ? String(item.code) : undefined,
    }));

    const payload = {
      code: String(orderId),
      customer: {
        name: String(customer.name),
        email: String(customer.email),
        type: "individual",
        document: digitsOnly(customer.document || ""),
        phones: customer.phone
          ? {
              mobile_phone: {
                country_code: "55",
                area_code: digitsOnly(customer.phone).slice(0, 2),
                number: digitsOnly(customer.phone).slice(2),
              },
            }
          : undefined,
      },
      items: pagarmeItems,
      shipping: shippingAmount > 0
        ? {
            amount: Number(shippingAmount),
            description: "Frete",
          }
        : undefined,
      payments: [
        {
          payment_method: "pix",
          pix: {
            expires_in: Number(pixExpiresInSeconds),
            additional_information: [
              {
                name: "Pedido",
                value: String(orderId),
              },
            ],
          },
          amount:
            pagarmeItems.reduce((acc: number, item: any) => acc + item.amount * item.quantity, 0) +
            Number(shippingAmount) -
            Number(discountAmount),
        },
      ],
      metadata: {
        local_order_id: String(orderId),
      },
    };

    const auth = "Basic " + btoa(`${secretKey}:`);

    const pagarmeRes = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await pagarmeRes.json();

    if (!pagarmeRes.ok) {
      return json(
        {
          error: "Erro ao criar pedido na Pagar.me",
          pagarme_status: pagarmeRes.status,
          details: data,
        },
        400
      );
    }

    // Salve no Supabase aqui, se quiser
    // Ex.: provider_order_id, provider_status, payload

    return json({
      ok: true,
      provider: "pagarme",
      order: data,
    });
  } catch (error: any) {
    return json(
      {
        error: "Erro interno",
        details: error?.message || String(error),
      },
      500
    );
  }
};

function digitsOnly(value: string) {
  return String(value || "").replace(/\D/g, "");
}

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
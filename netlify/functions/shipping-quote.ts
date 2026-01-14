// netlify/functions/shipping-quote.ts
export default async (req: Request) => {
  // CORS (se seu front reclamar)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const token = process.env.SUPERFRETE_TOKEN;
    if (!token) return new Response("SUPERFRETE_TOKEN não definido", { status: 500 });

    const body = await req.json();

    const to_postcode = String(body.to_postcode ?? "").replace(/\D/g, "");
    if (to_postcode.length !== 8) {
      return new Response(JSON.stringify({ error: "CEP inválido" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const FROM_CEP = String(process.env.SUPERFRETE_FROM_CEP ?? "06053020").replace(/\D/g, "");

    const products = Array.isArray(body.products) ? body.products : [];
    if (!products.length) {
      return new Response(JSON.stringify({ error: "products obrigatório" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const insurance_value = Number(body.insurance_value ?? 0);

    const superfretePayload = {
      from: { postal_code: FROM_CEP },
      to: { postal_code: to_postcode },
      services: String(body.services ?? "1,2,17,3,31"),
      options: {
        own_hand: false,
        receipt: false,
        insurance_value,
        use_insurance_value: insurance_value > 0,
      },
      products: products.map((p: any) => ({
        quantity: Math.max(1, Math.floor(Number(p.quantity ?? 1))),
        weight: Math.max(0.001, Number(p.weight ?? 0.03)),
        height: Math.max(1, Number(p.height ?? 2)),
        width: Math.max(1, Number(p.width ?? 11)),
        length: Math.max(1, Number(p.length ?? 16)),
      })),
    };

    const resp = await fetch("https://api.superfrete.com/api/v0/calculator", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "SuaLoja (integracao@sualoja.com)",
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(superfretePayload),
    });

    const text = await resp.text();
    if (!resp.ok) return new Response(text, { status: resp.status });

    const data = JSON.parse(text);

    const raw = Array.isArray(data?.services)
      ? data.services
      : Array.isArray(data?.options)
        ? data.options
        : Array.isArray(data)
          ? data
          : [];

    const options = raw
      .map((s: any) => {
        // >>> AQUI: prioridade pro preço com desconto <<<
        const price = Number(
          s.price_with_discount ??
            s.discounted_price ??
            s.price_discounted ??
            s.final_price ??
            s.total ??
            s.price ??
            s.value ??
            0
        );

        const original_price = Number(
          s.original_price ??
            s.list_price ??
            s.price_without_discount ??
            s.price_original ??
            NaN
        );

        const d = Number(s.delivery_time ?? s.deadline ?? s.time ?? NaN);
        const deadline =
          Number.isFinite(d) && d > 0 ? `Até ${d} dias úteis` : String(s.deadline ?? s.delivery_time ?? s.time ?? "");

        return {
          id: String(s.id ?? s.service_id ?? s.service ?? s.code ?? s.name),
          name: String(s.name ?? s.service_name ?? "Frete"),
          price,
          original_price: Number.isFinite(original_price) && original_price > price ? original_price : undefined,
          deadline,
          posting_type: String(s.posting_type ?? s.posting ?? s.dropoff ?? ""), // se vier
        };
      })
      .filter((x: any) => Number.isFinite(x.price) && x.price > 0)
      .sort((a: any, b: any) => a.price - b.price);

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Erro interno" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};

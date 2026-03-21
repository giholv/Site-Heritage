// netlify/functions/shipping-quote.ts
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

function onlyDigits(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  try {
    const token = process.env.SUPERFRETE_TOKEN;
    const fromCep = onlyDigits(process.env.SUPERFRETE_FROM_CEP ?? "06053020");
    const userAgent =
      process.env.SUPERFRETE_USER_AGENT ?? "Calea/1.0 (contato@calea.com.br)";

    if (!token) {
      return json({ error: "SUPERFRETE_TOKEN não definido" }, 500);
    }

    if (fromCep.length !== 8) {
      return json({ error: "SUPERFRETE_FROM_CEP inválido" }, 500);
    }

    const body = await req.json();

    const to_postcode = onlyDigits(body.to_postcode);
    if (to_postcode.length !== 8) {
      return json({ error: "CEP inválido" }, 400);
    }

    const insurance_value = Number(body.insurance_value ?? 0);

    // Seu padrão:
    // caixa fixa 16x12x8 e peso configurável
    const weight = Math.max(0.001, Number(body.weight ?? 0.03));

    const superfretePayload = {
      from: { postal_code: fromCep },
      to: { postal_code: to_postcode },
      services: String(body.services ?? "1,2,17,3"),
      options: {
        own_hand: false,
        receipt: false,
        insurance_value,
        use_insurance_value: insurance_value > 0,
      },
      package: {
        length: 16,
        width: 12,
        height: 8,
        weight,
      },
    };

    const resp = await fetch("https://api.superfrete.com/api/v0/calculator", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(superfretePayload),
    });

    const text = await resp.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      return json(
        {
          error: "Erro ao consultar SuperFrete",
          details: data,
        },
        resp.status
      );
    }

    const raw = Array.isArray(data?.services)
      ? data.services
      : Array.isArray(data?.options)
      ? data.options
      : Array.isArray(data)
      ? data
      : [];

    const options = raw
      .map((s: any) => {
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
          Number.isFinite(d) && d > 0
            ? `Até ${d} dias úteis`
            : String(s.deadline ?? s.delivery_time ?? s.time ?? "");

        return {
          id: String(s.id ?? s.service_id ?? s.service ?? s.code ?? s.name),
          name: String(s.name ?? s.service_name ?? "Frete"),
          price,
          original_price:
            Number.isFinite(original_price) && original_price > price
              ? original_price
              : undefined,
          deadline,
          posting_type: String(
            s.posting_type ?? s.posting ?? s.dropoff ?? ""
          ),
        };
      })
      .filter((x: any) => Number.isFinite(x.price) && x.price > 0)
      .sort((a: any, b: any) => a.price - b.price);

    return json({ options });
  } catch (err: any) {
    return json({ error: err?.message ?? "Erro interno" }, 500);
  }
};
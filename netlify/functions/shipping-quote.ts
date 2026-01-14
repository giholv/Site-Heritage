export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const token = process.env.SUPERFRETE_TOKEN;
    if (!token) return new Response("SUPERFRETE_TOKEN não definido", { status: 500 });

    const body = await req.json();

    const to_postcode = String(body.to_postcode ?? "").replace(/\D/g, "");
    if (to_postcode.length !== 8) return new Response("CEP destino inválido", { status: 400 });

    // COLOQUE O CEP DE ORIGEM DA SUA LOJA AQUI:
    const FROM_CEP = "06053020"; // ajuste pro seu CEP real (sem traço)

    const products = Array.isArray(body.products) ? body.products : [];
    if (!products.length) return new Response("products obrigatório", { status: 400 });

    const insurance_value = Number(body.insurance_value ?? 0);

    // Monta request no formato da SuperFrete
    const superfretePayload = {
      from: { postal_code: FROM_CEP },
      to: { postal_code: to_postcode },
      services: "1,2,17", // PAC, Sedex, Mini Envios
      options: {
        own_hand: false,
        receipt: false,
        insurance_value,
        use_insurance_value: insurance_value > 0,
      },
      products: products.map((p: any) => ({
        quantity: Number(p.quantity ?? 1),
        weight: Number(p.weight ?? 0.03),
        height: Number(p.height ?? 2),
        width: Number(p.width ?? 11),
        length: Number(p.length ?? 16),
      })),
    };

    const url = "https://api.superfrete.com/api/v0/calculator"; // sandbox
    // produção seria: https://api.superfrete.com/api/v0/calculator

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "SuaLoja (integracao@sualoja.com)", // obrigatório :contentReference[oaicite:2]{index=2}
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(superfretePayload),
    });

    const text = await resp.text();
    if (!resp.ok) {
      return new Response(text, { status: resp.status });
    }

    const data = JSON.parse(text);

    // Normaliza pro formato que seu Checkout espera
    const options = (data?.services ?? data?.options ?? data ?? [])
      .map((s: any) => ({
        id: String(s.id ?? s.service ?? s.code ?? s.name),
        name: String(s.name ?? s.service_name ?? "Frete"),
        price: Number(s.price ?? s.value ?? s.total ?? 0),
        deadline: String(s.deadline ?? s.delivery_time ?? s.time ?? ""),
      }))
      .filter((x: any) => Number.isFinite(x.price) && x.price > 0);

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(err?.message ?? "Erro interno", { status: 500 });
  }
};

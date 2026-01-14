// netlify/functions/shipping-quote.ts
import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const token = process.env.SUPERFRETE_TOKEN;
    if (!token) {
      return { statusCode: 500, body: "SUPERFRETE_TOKEN não configurado" };
    }

    const body = JSON.parse(event.body || "{}");

    // Você manda do front: { to_postcode, items, from_postcode? }
    // Aqui você monta no formato que a SuperFrete espera.
    // ATENÇÃO: o formato exato do JSON pode variar conforme sua conta/versão.
    // Ajuste os campos abaixo conforme a documentação/painel da SuperFrete.
    const payload = {
      // origem (configure fixo do seu CEP)
      from_postcode: body.from_postcode || "06000000", // <-- seu CEP de envio
      to_postcode: body.to_postcode,

      // pacote (use medidas reais)
      package: {
        weight: body.package?.weight ?? 0.2, // kg
        height: body.package?.height ?? 2,   // cm
        width: body.package?.width ?? 11,    // cm
        length: body.package?.length ?? 16,  // cm
      },

      // valor declarado (soma dos itens)
      declared_value:
        body.declared_value ??
        (body.items || []).reduce((acc: number, it: any) => acc + (it.price || 0) * (it.qty || 1), 0),

      // itens (se a API pedir)
      items: body.items || [],
    };

    const res = await fetch("https://sandbox.superfrete.com/api/v0/calculator", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Superfrete (integracao@superfrete.com)",
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data || "Erro SuperFrete" }),
      };
    }

    // Normaliza para o formato que seu front já usa
    // Ajuste os campos conforme o retorno real do sandbox.
    const options =
      (data?.services || data?.options || data || []).map((x: any) => ({
        id: String(x.id ?? x.service ?? x.name),
        name: String(x.name ?? x.service ?? "Frete"),
        price: Number(x.price ?? x.total ?? x.valor ?? 0),
        deadline: String(x.deadline ?? x.delivery_time ?? x.prazo ?? ""),
      })) || [];

    return {
      statusCode: 200,
      body: JSON.stringify({ options }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e?.message || "Erro interno" }) };
  }
};

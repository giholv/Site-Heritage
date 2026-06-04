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

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    const token = process.env.FRENET_TOKEN;
    const fromCep = onlyDigits(process.env.FRENET_FROM_CEP ?? "06053020");

    if (!token) {
      return json({ error: "FRENET_TOKEN não definido" }, 500);
    }

    if (fromCep.length !== 8) {
      return json({ error: "FRENET_FROM_CEP inválido" }, 500);
    }

    const body = (await req.json()) as {
      to_postcode?: string;
      insurance_value?: number | string;
      weight?: number | string;
      services?: string;
    };

    const to_postcode = onlyDigits(body.to_postcode ?? "");

    if (to_postcode.length !== 8) {
      return json({ error: "CEP inválido" }, 400);
    }

    const insurance_value = toNumber(body.insurance_value ?? 0, 0);

    /**
     * Mantive compatível com seu frontend atual:
     * - to_postcode
     * - insurance_value
     * - weight
     *
     * Caixa padrão da Caléa:
     * 16 x 12 x 8 cm
     */
    const weight = Math.max(
      0.001,
      toNumber(body.weight ?? 0.03, 0.03)
    );

    const frenetPayload = {
      SellerCEP: fromCep,
      RecipientCEP: to_postcode,
      ShipmentInvoiceValue: insurance_value,
      ShippingServiceCode: null,
      RecipientCountry: "BR",
      ShippingItemArray: [
        {
          Height: 8,
          Length: 16,
          Width: 12,
          Weight: weight,
          Quantity: 1,
          SKU: "CALEA-PACKAGE",
          Category: "Semijoias",
        },
      ],
    };

    const resp = await fetch("https://api.frenet.com.br/shipping/quote", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(frenetPayload),
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
          error: "Erro ao consultar Frenet",
          details: data,
        },
        resp.status
      );
    }

    const raw = Array.isArray(data?.ShippingSevicesArray)
      ? data.ShippingSevicesArray
      : Array.isArray(data?.ShippingServicesArray)
        ? data.ShippingServicesArray
        : [];

    const options = raw
      .filter((s: any) => s?.Error !== true)
      .map((s: any) => {
        const price = toNumber(s.ShippingPrice, 0);
        const original_price = toNumber(
          s.OriginalShippingPrice ?? s.ShippingPrice,
          NaN
        );
        const deliveryTime = toNumber(s.DeliveryTime, NaN);

        return {
          id: String(s.ServiceCode ?? ""),
          name: String(s.ServiceDescription ?? "Frete"),
          carrier: String(s.Carrier ?? ""),
          carrier_code: String(s.CarrierCode ?? ""),
          price,
          original_price:
            Number.isFinite(original_price) && original_price > price
              ? original_price
              : undefined,
          deadline:
            Number.isFinite(deliveryTime) && deliveryTime > 0
              ? `Até ${deliveryTime} dias úteis`
              : "",
          delivery_time: Number.isFinite(deliveryTime)
            ? deliveryTime
            : undefined,
          allow_buy_label: Boolean(s.AllowBuyLabel),
          posting_type: "",
          raw: s,
        };
      })
      .filter((x: any) => Number.isFinite(x.price) && x.price > 0)
      .sort((a: any, b: any) => a.price - b.price);

    return json({
      options,
      raw: data,
    });
  } catch (err: any) {
    return json({ error: err?.message ?? "Erro interno" }, 500);
  }
};
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
      height?: number | string;
      width?: number | string;
      length?: number | string;
      services?: string;
    };

    const toPostcode = onlyDigits(body.to_postcode ?? "");

    if (toPostcode.length !== 8) {
      return json({ error: "CEP inválido" }, 400);
    }

    const insuranceValue = toNumber(body.insurance_value ?? 0, 0);

    // Caixa padrão Caléa
    const weight = Math.max(0.03, toNumber(body.weight ?? 0.03, 0.03));
    const height = Math.ceil(Math.max(1, toNumber(body.height ?? 8, 8)));
    const width = Math.ceil(Math.max(1, toNumber(body.width ?? 12, 12)));
    const length = Math.ceil(Math.max(1, toNumber(body.length ?? 16, 16)));

    const services =
      body.services === null || body.services === undefined
        ? ""
        : String(body.services).trim();
        
    const frenetPayload = {
      SellerCEP: fromCep,
      RecipientCEP: toPostcode,
      ShipmentInvoiceValue: insuranceValue,
      ShippingServiceCode: services || null,
      RecipientCountry: "BR",
      ShippingItemArray: [
        {
          Height: height,
          Length: length,
          Width: width,
          Weight: weight,
          Quantity: 1,
          SKU: "CALEA-PACKAGE",
          Category: "Semijoias",
        },
      ],
    };

    console.log("FRENET PAYLOAD:", JSON.stringify(frenetPayload));

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

    console.log("FRENET RESPONSE:", JSON.stringify(data));

    if (!resp.ok) {
      return json(
        {
          error: "Erro ao consultar Frenet",
          details: data,
          sentPayload: frenetPayload,
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

        const originalPrice = toNumber(
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
            Number.isFinite(originalPrice) && originalPrice > price
              ? originalPrice
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
      sentPayload: frenetPayload,
    });
  } catch (err: any) {
    return json(
      {
        error: err?.message ?? "Erro interno",
      },
      500
    );
  }
};
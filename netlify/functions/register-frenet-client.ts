// netlify/functions/register-frenet-client.ts

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

function onlyDigits(value: unknown) {
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
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  const partnerToken = process.env.FRENET_PARTNER_TOKEN;

  if (!partnerToken) {
    return json(
      { ok: false, error: "FRENET_PARTNER_TOKEN não definido." },
      500
    );
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      federal_document?: string;
      company_name?: string;
      state_document?: string;
      site?: string;
      zip_code?: string;
      city?: string;
      state?: string;
      street?: string;
      address_number?: string;
      address_complement?: string;
      neighborhood?: string;
      phone_number?: string;
      sponsor_name?: string;
      sponsor_mail?: string;
      sponsor_document?: string;
    };

    const requiredFields = [
      ["name", body.name],
      ["email", body.email],
      ["federal_document", body.federal_document],
      ["zip_code", body.zip_code],
      ["city", body.city],
      ["state", body.state],
      ["street", body.street],
      ["address_number", body.address_number],
      ["neighborhood", body.neighborhood],
      ["phone_number", body.phone_number],
    ];

    const missing = requiredFields
      .filter(([, value]) => !String(value || "").trim())
      .map(([key]) => key);

    if (missing.length) {
      return json(
        {
          ok: false,
          error: `Campos obrigatórios ausentes: ${missing.join(", ")}`,
        },
        400
      );
    }

    const payload = {
      Name: body.name,
      Email: body.email,
      Password: body.password || undefined,

      FederalDocument: onlyDigits(body.federal_document),

      // 1 normalmente PF, 2 normalmente PJ.
      // Para loja/empresa, vamos usar 2.
      Type: 2,
      Person: "PJ",

      CompanyName: body.company_name || body.name,
      StateDocument: body.state_document || "",

      UrlSite: body.site || "https://calea.com.br",

      ZipCode: Number(onlyDigits(body.zip_code)),
      City: body.city,
      State: String(body.state || "").toUpperCase(),
      Street: body.street,
      AddressNumber: body.address_number,
      AddressComplement: body.address_complement || "",
      Neighborhood: body.neighborhood,

      PhoneNumber: Number(onlyDigits(body.phone_number)),

      SponsorName: body.sponsor_name || "Caléa Blanc",
      SponsorMail: body.sponsor_mail || body.email,
      SponsorFederalDocument: onlyDigits(
        body.sponsor_document || body.federal_document
      ),

      SendEmail: true,
      SendEmailConfirmation: true,

      Platform: "Caléa Blanc",
      PlatformPartnerName: "Caléa Blanc",
      Source: "Site Caléa Blanc",

      PartnerEmailConfirmed: true,
      PartnerPhoneConfirmed: true,
      PartnerPlanPay: true,
    };

    const endpoint =
      process.env.FRENET_REGISTER_URL ||
      "https://register.apifrenet.com.br/v1/partner/register";

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-partner-token": partnerToken,
      },
      body: JSON.stringify(payload),
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
          ok: false,
          error: "Erro ao cadastrar cliente na Frenet.",
          details: data,
          sent_payload: payload,
        },
        resp.status
      );
    }

    return json({
      ok: true,
      data,
      sent_payload: payload,
    });
  } catch (err: any) {
    return json(
      {
        ok: false,
        error: err?.message || "Erro interno ao cadastrar cliente Frenet.",
      },
      500
    );
  }
};
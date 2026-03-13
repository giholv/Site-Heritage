import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getAllowedRedirectTo(input?: string) {
  const fallback = Deno.env.get("PASSWORD_RESET_REDIRECT_URL")?.trim();

  const allowedOrigins = (Deno.env.get("ALLOWED_REDIRECT_ORIGINS") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!input) return fallback || null;

  try {
    const url = new URL(input);

    if (allowedOrigins.length > 0 && !allowedOrigins.includes(url.origin)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(
      { ok: false, code: "METHOD_NOT_ALLOWED", message: "Método não permitido." },
      405
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const rawEmail = String(body?.email ?? "").trim().toLowerCase();

    if (!rawEmail) {
      return json(
        { ok: false, code: "EMAIL_REQUIRED", message: "Informe seu e-mail." },
        400
      );
    }

    if (!isEmail(rawEmail)) {
      return json(
        { ok: false, code: "EMAIL_INVALID", message: "E-mail inválido." },
        400
      );
    }

    const redirectTo = getAllowedRedirectTo(body?.redirectTo);

    if (!redirectTo) {
      return json(
        {
          ok: false,
          code: "REDIRECT_INVALID",
          message: "URL de redefinição inválida ou não permitida.",
        },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json(
        {
          ok: false,
          code: "ENV_MISSING",
          message: "Variáveis de ambiente obrigatórias não configuradas.",
        },
        500
      );
    }

    // Cliente admin: consulta profiles sem depender de RLS
    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Cliente anon: dispara o fluxo normal de recovery
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: profile, error: profileError } = await adminDb
      .from("profiles")
      .select("user_id")
      .eq("email", rawEmail)
      .maybeSingle();

    if (profileError) {
      console.error("profile lookup error:", profileError);
      return json(
        {
          ok: false,
          code: "PROFILE_LOOKUP_FAILED",
          message: "Erro ao validar o e-mail.",
        },
        500
      );
    }

    if (!profile) {
      return json(
        {
          ok: false,
          code: "EMAIL_NOT_FOUND",
          message: "E-mail não encontrado.",
        },
        404
      );
    }

    const { error: resetError } = await authClient.auth.resetPasswordForEmail(
      rawEmail,
      { redirectTo }
    );

    if (resetError) {
      console.error("reset password error:", resetError);
      return json(
        {
          ok: false,
          code: "RESET_SEND_FAILED",
          message: "Não foi possível enviar o link de redefinição.",
        },
        500
      );
    }

    return json({
      ok: true,
      code: "RESET_SENT",
      message: "Link de redefinição enviado com sucesso.",
    });
  } catch (error) {
    console.error("forgot-password function error:", error);
    return json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: "Erro interno do servidor.",
      },
      500
    );
  }
});
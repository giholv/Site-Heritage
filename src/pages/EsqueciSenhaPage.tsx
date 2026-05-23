import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function getResetRedirectUrl() {
  return "https://calea.com.br/redefinir-senha";
}

function mapResetEmailError(message?: string) {
  const m = (message || "").toLowerCase();

  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  if (m.includes("redirect")) {
    return "URL de redirecionamento não autorizada no Supabase.";
  }

  if (m.includes("email")) {
    return "Não foi possível enviar o e-mail de recuperação.";
  }

  return message || "Não foi possível enviar o e-mail.";
}

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailError = useMemo(() => {
    if (!email.trim()) return "Informe seu e-mail.";
    if (!isEmail(email)) return "E-mail inválido.";
    return "";
  }, [email]);

  const showError = (submitted || touched) && !!emailError;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitted(true);
    setServerError(null);
    setSuccess(false);

    if (emailError) return;

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const redirectTo = getResetRedirectUrl();

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) {
        console.error("Erro resetPasswordForEmail:", error);
        setServerError(mapResetEmailError(error.message));
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Falha ao enviar recuperação:", err);
      setServerError("Falha de rede ou servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FCFAF6_0%,#F7F2E8_100%)] text-[#2b554e]">
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-[#b08d57]">
              Caléa Blanc
            </p>

            <h1 className="mt-3 text-3xl font-semibold">
              Esqueci minha senha
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#2b554e]/70">
              Informe seu e-mail para receber o link de redefinição.
            </p>
          </div>

          <div className="rounded-[28px] border border-[#2b554e]/10 bg-white/80 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
            {serverError && (
              <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                E-mail enviado com sucesso! Verifique também a caixa de spam.
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#2b554e]"
                >
                  E-mail
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (serverError) setServerError(null);
                    if (success) setSuccess(false);
                  }}
                  onBlur={() => setTouched(true)}
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  disabled={loading}
                  className={`h-12 w-full rounded-2xl bg-[#FCFAF6] px-4 text-sm outline-none transition placeholder:text-[#2b554e]/35 disabled:cursor-not-allowed disabled:opacity-60 ${
                    showError
                      ? "border border-red-400 focus:ring-4 focus:ring-red-100"
                      : "border border-[#2b554e]/12 focus:border-[#b08d57] focus:ring-4 focus:ring-[#b08d57]/10"
                  }`}
                />

                {showError && (
                  <p className="mt-2 text-xs text-red-600">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-[#2b554e] px-5 text-sm font-semibold text-white transition hover:bg-[#23463f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>

              <p className="text-center text-sm text-[#2b554e]/65">
                <Link
                  to="/login"
                  className="font-medium text-[#b08d57] hover:underline"
                >
                  Voltar para o login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
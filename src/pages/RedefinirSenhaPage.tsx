import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type FormState = {
  password: string;
  confirmPassword: string;
};

export default function RedefinirSenhaPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    password: "",
    confirmPassword: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.password) e.password = "Informe a nova senha.";
    else if (form.password.length < 6) e.password = "Use pelo menos 6 caracteres.";

    if (!form.confirmPassword) e.confirmPassword = "Confirme a nova senha.";
    else if (form.confirmPassword !== form.password) {
      e.confirmPassword = "As senhas não coincidem.";
    }

    return e;
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (serverError) setServerError(null);
  }

  function shouldShowError(field: keyof FormState) {
    return (submitted || touched[field]) && errors[field];
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (error) {
        setServerError(error.message || "Não foi possível redefinir a senha.");
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch {
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
            <h1 className="mt-3 text-3xl font-semibold">Redefinir senha</h1>
            <p className="mt-2 text-sm leading-6 text-[#2b554e]/70">
              Digite sua nova senha para concluir o acesso.
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
                Senha atualizada com sucesso. Redirecionando para o login...
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#2b554e]"
                >
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, password: true }))
                    }
                    className={`h-12 w-full rounded-2xl bg-[#FCFAF6] px-4 pr-24 text-sm outline-none transition ${
                      shouldShowError("password")
                        ? "border border-red-400 focus:ring-4 focus:ring-red-100"
                        : "border border-[#2b554e]/12 focus:border-[#b08d57] focus:ring-4 focus:ring-[#b08d57]/10"
                    }`}
                    placeholder="Digite sua nova senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-sm text-[#2b554e]/75 transition hover:bg-[#f3f0e0] hover:text-[#2b554e]"
                  >
                    {showPass ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {shouldShowError("password") && (
                  <p className="mt-2 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-[#2b554e]"
                >
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, confirmPassword: true }))
                    }
                    className={`h-12 w-full rounded-2xl bg-[#FCFAF6] px-4 pr-24 text-sm outline-none transition ${
                      shouldShowError("confirmPassword")
                        ? "border border-red-400 focus:ring-4 focus:ring-red-100"
                        : "border border-[#2b554e]/12 focus:border-[#b08d57] focus:ring-4 focus:ring-[#b08d57]/10"
                    }`}
                    placeholder="Confirme sua nova senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-sm text-[#2b554e]/75 transition hover:bg-[#f3f0e0] hover:text-[#2b554e]"
                  >
                    {showConfirm ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {shouldShowError("confirmPassword") && (
                  <p className="mt-2 text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="h-12 w-full rounded-2xl bg-[#2b554e] px-5 text-sm font-semibold text-white transition hover:bg-[#23463f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
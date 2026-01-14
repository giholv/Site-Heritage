import React, { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function cleanPhone(v: string) {
  return v.replace(/\D/g, "").slice(0, 11);
}

function formatPhoneBR(v: string) {
  const n = cleanPhone(v);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export default function CadastroUsuariosPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) e.name = "Informe seu nome.";
    if (!form.email.trim()) e.email = "Informe seu e-mail.";
    else if (!isEmail(form.email)) e.email = "E-mail inválido.";

    const phoneDigits = cleanPhone(form.phone);

    if (!phoneDigits) e.phone = "Informe seu telefone.";
    else if (phoneDigits.length < 10) e.phone = "Telefone deve ter DDD + número (10 ou 11 dígitos).";

    if (!form.password) e.password = "Crie uma senha.";
    else if (form.password.length < 8) e.password = "Senha precisa ter no mínimo 8 caracteres.";

    if (!form.confirmPassword) e.confirmPassword = "Confirme a senha.";
    else if (form.confirmPassword !== form.password) e.confirmPassword = "As senhas não conferem.";

    if (!form.acceptTerms) e.acceptTerms = "Você precisa aceitar os termos.";

    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function markTouched<K extends keyof FormState>(key: K) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);

    // marca tudo como touched pra aparecerem os erros
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
    });

    if (hasErrors) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: cleanPhone(form.phone),
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setServerError(data?.message || "Não foi possível cadastrar. Tente novamente.");
        return;
      }

      setSuccess("Cadastro realizado com sucesso! Redirecionando...");
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        acceptTerms: false,
      });
      setTouched({});

      setTimeout(() => navigate("/login"), 700);
    } catch {
      setServerError("Falha de rede/servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const fieldBase =
    "mt-1 w-full rounded-xl bg-white border px-4 py-3 outline-none transition " +
    "placeholder:text-[#2b554e]/45 text-[#2b554e]";

  const okBorder = "border-[#2b554e]/20 focus:border-[#b08d57]/50 focus:ring-2 focus:ring-[#b08d57]/20";
  const badBorder = "border-red-400/60 focus:border-red-400 focus:ring-2 focus:ring-red-300/30";

  const showError = <K extends keyof FormState>(k: K) => touched[k] && errors[k];

  return (
    <div className="min-h-screen bg-[#FCFAF6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* topo / identidade */}
        <div className="mb-6 text-center">
          <img
            src="/logo_fundo_claro2.png"
            alt="Heritage"
            className="mx-auto h-20 w-auto object-contain"
          />
          <h1 className="mt-2 text-2xl font-semibold text-[#2b554e]">Criar conta</h1>
          <p className="text-[#2b554e]/70 mt-1">
            Acompanhe pedidos, favoritos e novidades.
          </p>
        </div>

        <div className="rounded-2xl border border-[#2b554e]/10 bg-white p-6 shadow-sm">
          {serverError && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="text-sm text-[#2b554e]">Nome completo</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                onBlur={() => markTouched("name")}
                className={`${fieldBase} ${showError("name") ? badBorder : okBorder}`}
                placeholder="Ex: Giovanna Pires"
                autoComplete="name"
              />
              {showError("name") && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-[#2b554e]">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                onBlur={() => markTouched("email")}
                className={`${fieldBase} ${showError("email") ? badBorder : okBorder}`}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                inputMode="email"
              />
              {showError("email") && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Telefone */}
            <div>
              <label className="text-sm text-[#2b554e]">Telefone </label>
              <input
                required
                value={form.phone}
                onChange={(e) => update("phone", formatPhoneBR(e.target.value))}
                onBlur={() => markTouched("phone")}
                className={`${fieldBase} ${showError("phone") ? badBorder : okBorder}`}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
                inputMode="tel"
              />
              {showError("phone") && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}

            </div>

            {/* Senha */}
            <div>
              <label className="text-sm text-[#2b554e]">Senha</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  onBlur={() => markTouched("password")}
                  type={showPass ? "text" : "password"}
                  className={`${fieldBase} ${showError("password") ? badBorder : okBorder}`}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  className="h-[48px] w-[48px] rounded-xl border border-[#2b554e]/20 bg-[#FCFAF6] flex items-center justify-center text-[#2b554e] hover:border-[#b08d57]/40 hover:text-[#b08d57] transition"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {showError("password") && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="text-sm text-[#2b554e]">Confirmar senha</label>
              <div className="mt-1 flex gap-2">
                <input
                  required
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  onBlur={() => markTouched("confirmPassword")}
                  type={showConfirmPass ? "text" : "password"}
                  className={`${fieldBase} ${showError("confirmPassword") ? badBorder : okBorder}`}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass((v) => !v)}
                  aria-label={showConfirmPass ? "Ocultar senha" : "Mostrar senha"}
                  className="h-[48px] w-[48px] rounded-xl border border-[#2b554e]/20 bg-[#FCFAF6] flex items-center justify-center text-[#2b554e] hover:border-[#b08d57]/40 hover:text-[#b08d57] transition"
                >
                  {showConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {showError("confirmPassword") && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Termos */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => {
                  update("acceptTerms", e.target.checked);
                  markTouched("acceptTerms");
                }}
                className="mt-1 h-4 w-4 rounded border-[#2b554e]/30"
              />
              <div className="text-sm text-[#2b554e]/80">
                Aceito os{" "}
                <a href="/termos" className="underline hover:text-[#b08d57]">termos de uso</a>{" "}
                e a{" "}
                <a href="/privacidade" className="underline hover:text-[#b08d57]">política de privacidade</a>.
                {showError("acceptTerms") && (
                  <p className="mt-1 text-xs text-red-600">{errors.acceptTerms}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#2b554e] text-white font-medium py-3 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "Cadastrando..." : "Cadastrar"}
            </button>

            <p className="text-center text-sm text-[#2b554e]/75">
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="underline hover:text-[#b08d57]"
              >
                Entrar
              </button>
            </p>

            <p className="text-center text-[11px] text-[#2b554e]/55">
              Heritage Maison • Elegância sem esforço.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

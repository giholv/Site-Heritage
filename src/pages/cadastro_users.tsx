import React, { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type FormState = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

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

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "Informe seu nome.";
  }

  if (!form.email.trim()) {
    errors.email = "Informe seu e-mail.";
  } else if (!isEmail(form.email)) {
    errors.email = "E-mail inválido.";
  }

  const phoneDigits = cleanPhone(form.phone);
  if (!phoneDigits) {
    errors.phone = "Informe seu telefone.";
  } else if (phoneDigits.length < 10) {
    errors.phone = "Telefone deve ter DDD + número (10 ou 11 dígitos).";
  }

  if (form.birthDate) {
    const selectedDate = new Date(form.birthDate);
    const today = new Date();
    if (Number.isNaN(selectedDate.getTime())) {
      errors.birthDate = "Data de nascimento inválida.";
    } else if (selectedDate > today) {
      errors.birthDate = "A data de nascimento não pode ser no futuro.";
    }
  }

  if (!form.password) {
    errors.password = "Crie uma senha.";
  } else if (form.password.length < 8) {
    errors.password = "Senha precisa ter no mínimo 8 caracteres.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirme a senha.";
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "As senhas não conferem.";
  }

  if (!form.acceptTerms) {
    errors.acceptTerms = "Você precisa aceitar os termos.";
  }

  return errors;
}

function mapAuthErrorMessage(message?: string) {
  const m = (message || "").toLowerCase();

  if (m.includes("user already registered") || m.includes("already registered")) {
    return "Esse e-mail já está cadastrado.";
  }

  if (m.includes("password") && m.includes("should be at least")) {
    return "Senha muito curta. Use no mínimo 8 caracteres.";
  }

  if (m.includes("invalid") && m.includes("email")) {
    return "E-mail inválido.";
  }

  return message || "Não foi possível cadastrar. Tente novamente.";
}

export default function CadastroUsuariosPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    marketingOptIn: false,
    whatsappOptIn: false,
  });

  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (serverError) setServerError(null);
  }

  function markTouched<K extends keyof FormState>(key: K) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function showError<K extends keyof FormState>(field: K) {
    return (touched[field] || loading) && errors[field];
  }

  function markAllTouched() {
    setTouched({
      name: true,
      email: true,
      phone: true,
      birthDate: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
      marketingOptIn: true,
      whatsappOptIn: true,
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setServerError(null);
    setSuccess(null);
    markAllTouched();

    if (hasErrors) return;

    setLoading(true);

    try {
      const email = form.email.trim().toLowerCase();
      const phone = cleanPhone(form.phone);
      const fullName = form.name.trim();

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (signUpErr) {
        setServerError(mapAuthErrorMessage(signUpErr.message));
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        setServerError("Não foi possível criar o usuário.");
        return;
      }

      const customerPayload = {
        user_id: userId,
        email,
        full_name: fullName,
        phone,
        birth_date: form.birthDate || null,
        marketing_opt_in: form.marketingOptIn,
        whatsapp_opt_in: form.whatsappOptIn,
      };

      const { error: customerUpsertError } = await supabase
        .from("customers")
        .upsert(customerPayload, { onConflict: "user_id" });

      if (customerUpsertError) {
        const { error: customerFallbackError } = await supabase
          .from("customers")
          .update({
            user_id: userId,
            full_name: fullName,
            phone,
            birth_date: form.birthDate || null,
            marketing_opt_in: form.marketingOptIn,
            whatsapp_opt_in: form.whatsappOptIn,
            updated_at: new Date().toISOString(),
          })
          .eq("email", email);

        if (customerFallbackError) {
          setServerError("Usuário criado, mas falhou ao salvar cliente no banco.");
          return;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, role: "customer" }, { onConflict: "user_id" });

      if (profileError) {
        setServerError("Usuário criado, mas falhou ao salvar perfil no banco.");
        return;
      }

      setSuccess("Cadastro realizado com sucesso! Redirecionando...");

      setForm({
        name: "",
        email: "",
        phone: "",
        birthDate: "",
        password: "",
        confirmPassword: "",
        acceptTerms: false,
        marketingOptIn: false,
        whatsappOptIn: false,
      });

      setTouched({});

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch {
      setServerError("Falha de rede ou servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const fieldBase =
    "mt-1 w-full rounded-xl bg-white border px-4 py-3 outline-none transition " +
    "placeholder:text-[#2b554e]/45 text-[#2b554e]";

  const okBorder =
    "border-[#2b554e]/20 focus:border-[#b08d57]/50 focus:ring-2 focus:ring-[#b08d57]/20";

  const badBorder =
    "border-red-400/60 focus:border-red-400 focus:ring-2 focus:ring-red-300/30";

  return (
    <div className="min-h-screen bg-[#FCFAF6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img
            src="/logo_fundo_claro2.png"
            alt="Caléa"
            className="mx-auto h-20 w-auto object-contain"
          />
          <h1 className="mt-2 text-2xl font-semibold text-[#2b554e]">Criar conta</h1>
          <p className="mt-1 text-[#2b554e]/70">
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

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-sm text-[#2b554e]">Nome completo</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                onBlur={() => markTouched("name")}
                className={`${fieldBase} ${showError("name") ? badBorder : okBorder}`}
                placeholder="Nome e sobrenome"
                autoComplete="name"
              />
              {showError("name") && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

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
              {showError("email") && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-[#2b554e]">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", formatPhoneBR(e.target.value))}
                onBlur={() => markTouched("phone")}
                className={`${fieldBase} ${showError("phone") ? badBorder : okBorder}`}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
                inputMode="tel"
              />
              {showError("phone") && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-[#2b554e]">Data de nascimento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
                onBlur={() => markTouched("birthDate")}
                className={`${fieldBase} ${showError("birthDate") ? badBorder : okBorder}`}
              />
              {showError("birthDate") ? (
                <p className="mt-1 text-xs text-red-600">{errors.birthDate}</p>
              ) : (
                <p className="mt-1 text-xs text-[#2b554e]/55">
                  Opcional. Pode ser usado para ações de aniversário e relacionamento.
                </p>
              )}
            </div>

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
              {showError("password") && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-[#2b554e]">Confirmar senha</label>
              <div className="mt-1 flex gap-2">
                <input
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
                  {showConfirmPass ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {showError("confirmPassword") && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm text-[#2b554e]/80">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => {
                    update("acceptTerms", e.target.checked);
                    markTouched("acceptTerms");
                  }}
                  className="mt-1 h-4 w-4 rounded border-[#2b554e]/30"
                />
                <span>
                  Aceito os{" "}
                  <a href="/termos" className="underline hover:text-[#b08d57]">
                    termos de uso
                  </a>{" "}
                  e a{" "}
                  <a
                    href="/politica-de-privacidade"
                    className="underline hover:text-[#b08d57]"
                  >
                    política de privacidade
                  </a>
                  .
                </span>
              </label>
              {showError("acceptTerms") && (
                <p className="text-xs text-red-600">{errors.acceptTerms}</p>
              )}

              <label className="flex items-start gap-3 text-sm text-[#2b554e]/80">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(e) => update("marketingOptIn", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#2b554e]/30"
                />
                <span>Quero receber novidades e ofertas por e-mail.</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[#2b554e]/80">
                <input
                  type="checkbox"
                  checked={form.whatsappOptIn}
                  onChange={(e) => update("whatsappOptIn", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#2b554e]/30"
                />
                <span>Quero receber novidades e ofertas por WhatsApp.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#2b554e] py-3 font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
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
              Caléa • Elegância sem esforço.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
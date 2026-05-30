import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
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
  receiveNews: boolean;
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

function passwordStrength(password: string) {
  if (!password) return { label: "", width: "0%" };
  if (password.length < 8) return { label: "Senha fraca", width: "33%" };
  if (/[A-Z]/.test(password) && /\d/.test(password) && password.length >= 10) {
    return { label: "Senha forte", width: "100%" };
  }
  return { label: "Senha média", width: "66%" };
}

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) errors.name = "Informe seu nome.";
  if (!form.email.trim()) errors.email = "Informe seu e-mail.";
  else if (!isEmail(form.email)) errors.email = "E-mail inválido.";

  const phoneDigits = cleanPhone(form.phone);
  if (!phoneDigits) errors.phone = "Informe seu telefone.";
  else if (phoneDigits.length < 10) errors.phone = "Telefone inválido.";

  if (form.birthDate) {
    const selectedDate = new Date(form.birthDate);
    const today = new Date();
    if (Number.isNaN(selectedDate.getTime())) {
      errors.birthDate = "Data inválida.";
    } else if (selectedDate > today) {
      errors.birthDate = "A data não pode ser no futuro.";
    }
  }

  if (!form.password) errors.password = "Crie uma senha.";
  else if (form.password.length < 8) errors.password = "Use no mínimo 8 caracteres.";

  if (!form.confirmPassword) errors.confirmPassword = "Confirme a senha.";
  else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "As senhas não conferem.";
  }

  if (!form.acceptTerms) errors.acceptTerms = "Você precisa aceitar os termos.";

  return errors;
}

function mapAuthErrorMessage(message?: string) {
  const m = (message || "").toLowerCase();

  if (
    m.includes("weak") ||
    m.includes("easy to guess") ||
    m.includes("authweakpassword")
  ) {
    return "Senha muito fraca. Use maiúscula, minúscula, número e símbolo. Ex: Calea@2026";
  }

  if (
    m.includes("already") ||
    m.includes("registered") ||
    m.includes("duplicate")
  ) {
    return "Esse e-mail já está cadastrado. Faça login ou recupere sua senha.";
  }

  if (m.includes("password")) {
    return "Senha inválida. Use uma senha mais forte.";
  }

  if (m.includes("email")) return "E-mail inválido.";

  return "Não foi possível concluir seu cadastro. Tente novamente.";
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
    receiveNews: false,
  });

  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const strength = passwordStrength(form.password);

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
      receiveNews: true,
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
        console.error("Erro Auth:", signUpErr);
        setServerError(mapAuthErrorMessage(signUpErr.message));
        return;
      }

      const userId = signUpData.user?.id;

      if (!userId) {
        setServerError("Não foi possível criar o usuário.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setSuccess(
          "Conta criada com sucesso. Verifique seu e-mail para confirmar o cadastro."
        );

        setTimeout(() => {
          navigate("/login");
        }, 2500);

        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            role: "customer",
            nome_completo: fullName,
            email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        console.error("Erro profiles:", profileError);
        setServerError("Cadastro criado, mas não foi possível salvar seu perfil.");
        return;
      }

      setSuccess("Cadastro realizado com sucesso. Redirecionando...");

      setTimeout(() => {
        navigate("/login");
      }, 900);
    } catch (error) {
      console.error("Erro geral cadastro:", error);
      setServerError("Falha de rede ou servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-2xl border border-[#e3d9ca] bg-[#fffdf9] px-4 text-sm text-[#2b554e] outline-none transition placeholder:text-[#2b554e]/40 focus:border-[#b08d57] focus:ring-4 focus:ring-[#b08d57]/10";

  const errorClass =
    "mt-2 h-12 w-full rounded-2xl border border-red-300 bg-white px-4 text-sm text-[#2b554e] outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100";

  return (
    <div className="min-h-screen bg-[#fcfaf6] px-4 py-8 lg:flex lg:items-center lg:justify-center">
      <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-[34px] bg-white shadow-[0_24px_90px_rgba(43,85,78,0.10)] ring-1 ring-[#eee5d8] lg:grid-cols-[42%_58%]">
        <aside className="hidden bg-[#2b554e] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <img
              src="/logo_fundo_escuro.svg"
              alt="Caléa"
              className="h-24 w-auto object-contain"
            />

            <div className="mt-20 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/80">
              <Sparkles className="h-4 w-4" />
              Caléa Blanc
            </div>

            <h2 className="mt-8 text-5xl font-light leading-tight tracking-[-0.05em]">
              Bem-vinda à Caléa
            </h2>

            <p className="mt-6 max-w-sm text-lg leading-8 text-white/75">
              Crie sua conta para acompanhar pedidos, favoritos e lançamentos exclusivos.
            </p>
          </div>

          <p className="text-sm text-white/55">
            Elegância sem esforço.
          </p>
        </aside>

        <main className="p-6 sm:p-8 lg:p-12">
          <div className="mb-8 text-center lg:text-left">
            <img
              src="/logo_fundo_escuro_mobile.svg"
              alt="Caléa"
              className="mx-auto h-24 w-auto object-contain lg:hidden"
            />

            <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-[#b08d57] lg:mt-0">
              Criar conta
            </p>

            <h1 className="mt-3 text-[34px] font-light leading-tight tracking-[-0.04em] text-[#2b554e]">
              Sua conta Caléa
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#7a746c]">
              Acompanhe seus pedidos, favoritos e novidades em um só lugar.
            </p>
          </div>

          {serverError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium text-[#2b554e]">
                Nome completo
              </label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                onBlur={() => markTouched("name")}
                className={showError("name") ? errorClass : inputClass}
                placeholder="Nome e sobrenome"
                autoComplete="name"
              />
              {showError("name") && (
                <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[#2b554e]">
                  E-mail
                </label>
                <input
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  className={showError("email") ? errorClass : inputClass}
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  inputMode="email"
                />
                {showError("email") && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[#2b554e]">
                  WhatsApp
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => update("phone", formatPhoneBR(e.target.value))}
                  onBlur={() => markTouched("phone")}
                  className={showError("phone") ? errorClass : inputClass}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  inputMode="tel"
                />
                {showError("phone") && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#2b554e]">
                Data de nascimento
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
                onBlur={() => markTouched("birthDate")}
                className={showError("birthDate") ? errorClass : inputClass}
              />
              {showError("birthDate") ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.birthDate}</p>
              ) : (
                <p className="mt-1.5 text-xs text-[#7a746c]">
                  Opcional. Usado para ações de relacionamento.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[#2b554e]">
                  Senha
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    onBlur={() => markTouched("password")}
                    type={showPass ? "text" : "password"}
                    className={showError("password") ? errorClass : inputClass}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="mt-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e3d9ca] bg-[#fcfaf6] text-[#2b554e] transition hover:border-[#b08d57] hover:text-[#b08d57]"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {form.password && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eee5d8]">
                      <div
                        className="h-full rounded-full bg-[#2b554e] transition-all"
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#7a746c]">{strength.label}</p>
                  </div>
                )}

                {showError("password") && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[#2b554e]">
                  Confirmar senha
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    onBlur={() => markTouched("confirmPassword")}
                    type={showConfirmPass ? "text" : "password"}
                    className={showError("confirmPassword") ? errorClass : inputClass}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPass((v) => !v)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e3d9ca] bg-[#fcfaf6] text-[#2b554e] transition hover:border-[#b08d57] hover:text-[#b08d57]"
                  >
                    {showConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {showError("confirmPassword") && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-3xl bg-[#fcfaf6] p-4 ring-1 ring-[#eee5d8]">
              <label className="flex items-start gap-3 text-sm leading-6 text-[#5f5850]">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => {
                    update("acceptTerms", e.target.checked);
                    markTouched("acceptTerms");
                  }}
                  className="mt-1 h-4 w-4 rounded border-[#2b554e]/30"
                  style={{ accentColor: "#2b554e" }}
                />
                <span>
                  Aceito os{" "}
                  <a href="/termos" className="font-medium underline hover:text-[#b08d57]">
                    termos de uso
                  </a>{" "}
                  e a{" "}
                  <a
                    href="/politica-de-privacidade"
                    className="font-medium underline hover:text-[#b08d57]"
                  >
                    política de privacidade
                  </a>
                  .
                </span>
              </label>

              {showError("acceptTerms") && (
                <p className="text-xs text-red-600">{errors.acceptTerms}</p>
              )}

              <label className="flex items-start gap-3 text-sm leading-6 text-[#5f5850]">
                <input
                  type="checkbox"
                  checked={form.receiveNews}
                  onChange={(e) => update("receiveNews", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#2b554e]/30"
                  style={{ accentColor: "#2b554e" }}
                />
                <span>Quero receber novidades e ofertas da Caléa.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[58px] w-full items-center justify-center gap-2 rounded-full bg-[#2b554e] text-sm font-semibold uppercase tracking-[0.10em] text-white shadow-[0_14px_30px_rgba(43,85,78,0.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Criar minha conta"
              )}
            </button>

            <p className="text-center text-sm text-[#7a746c]">
              Já possui conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-semibold text-[#2b554e] underline decoration-[#b08d57]/40 underline-offset-4 hover:text-[#b08d57]"
              >
                Entrar
              </button>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
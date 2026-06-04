import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type FormState = {
  email: string;
  password: string;
  remember: boolean;
};

type TouchedState = {
  email: boolean;
  password: boolean;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    remember: true,
  });

  const [touched, setTouched] = useState<TouchedState>({
    email: false,
    password: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/minha-conta");
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.email.trim()) e.email = "Informe seu e-mail.";
    else if (!isEmail(form.email)) e.email = "E-mail inválido.";

    if (!form.password) e.password = "Informe sua senha.";

    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (serverError) setServerError(null);
  }

  function markTouched<K extends keyof TouchedState>(key: K) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function shouldShowError(field: keyof TouchedState) {
    return (touched[field] || submitted) && errors[field];
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);

    if (hasErrors) return;

    setLoading(true);

    try {
      const email = form.email.trim().toLowerCase();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });

      if (authError || !authData.user) {
        setServerError(authError?.message || "E-mail ou senha inválidos.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (profileError) {
        console.log("profileError:", profileError);
      }

      if (profileError) {
        console.log("profileError:", profileError);
      }

      if (profile?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/minha-conta");
      }
    } catch {
      setServerError("Falha de rede ou servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FCFAF6_0%,#F7F2E8_100%)] text-[#2b554e]">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        {/* Coluna visual / branding */}
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[#2b554e]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(176,141,87,0.18),transparent_30%)]" />

          <div className="relative flex w-full flex-col justify-between px-12 py-14 text-[#FCFAF6] xl:px-16">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#d8c3a0]">
                Caléa Blanc
              </p>

              <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight xl:text-5xl">
                Entre na sua conta e acompanhe seus pedidos com elegância.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-[#FCFAF6]/75">
                Acesse seus favoritos, acompanhe entregas e tenha uma
                experiência mais fluida no seu próximo pedido.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="font-medium">Acesso seguro</p>
                <p className="mt-1 text-sm text-[#FCFAF6]/70">
                  Seus dados protegidos com autenticação e navegação segura.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="font-medium">Favoritos salvos</p>
                <p className="mt-1 text-sm text-[#FCFAF6]/70">
                  Guarde suas peças preferidas e retome depois sem perder nada.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="font-medium">Acompanhamento de pedidos</p>
                <p className="mt-1 text-sm text-[#FCFAF6]/70">
                  Consulte status, histórico e andamento das suas compras.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Coluna do formulário */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <p className="text-sm uppercase tracking-[0.24em] text-[#b08d57]">
                Caléa Blanc
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-semibold">Entrar</h2>
              <p className="mt-2 text-sm leading-6 text-[#2b554e]/70">
                Acesse sua conta para acompanhar pedidos e favoritos.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#2b554e]/10 bg-white/80 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
              {serverError && (
                <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-[#2b554e]"
                  >
                    E-mail
                  </label>
                  <input
                    id="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    onBlur={() => markTouched("email")}
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={!!shouldShowError("email")}
                    className={`h-12 w-full rounded-2xl bg-[#FCFAF6] px-4 text-sm outline-none transition placeholder:text-[#2b554e]/35 ${shouldShowError("email")
                        ? "border border-red-400 focus:ring-4 focus:ring-red-100"
                        : "border border-[#2b554e]/12 focus:border-[#b08d57] focus:ring-4 focus:ring-[#b08d57]/10"
                      }`}
                  />
                  {shouldShowError("email") && (
                    <p className="mt-2 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Senha */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-[#2b554e]"
                  >
                    Senha
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      onBlur={() => markTouched("password")}
                      type={showPass ? "text" : "password"}
                      placeholder="Sua senha"
                      autoComplete="current-password"
                      aria-invalid={!!shouldShowError("password")}
                      className={`h-12 w-full rounded-2xl bg-[#FCFAF6] px-4 pr-24 text-sm outline-none transition placeholder:text-[#2b554e]/35 ${shouldShowError("password")
                          ? "border border-red-400 focus:ring-4 focus:ring-red-100"
                          : "border border-[#2b554e]/12 focus:border-[#b08d57] focus:ring-4 focus:ring-[#b08d57]/10"
                        }`}
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
                    <p className="mt-2 text-xs text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* lembrar / esqueceu */}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 text-[#2b554e]/75">
                    <input
                      type="checkbox"
                      checked={form.remember}
                      onChange={(e) => update("remember", e.target.checked)}
                      className="h-4 w-4 rounded border-[#2b554e]/20"
                    />
                    Lembrar de mim
                  </label>

                  <button
                    type="button"
                    onClick={() => navigate("/esqueci-senha")}
                    className="font-medium text-[#2b554e]/75 transition hover:text-[#b08d57]"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl bg-[#2b554e] px-5 text-sm font-semibold text-white transition hover:bg-[#23463f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <p className="text-center text-sm text-[#2b554e]/65">
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/cadastro")}
                    className="font-medium text-[#b08d57] transition hover:underline"
                  >
                    Criar conta
                  </button>
                </p>
              </form>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-[#2b554e]/45">
              Login via Supabase Auth + perfil em <code>profiles</code>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
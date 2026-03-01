import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase"; // ajuste o caminho

type FormState = {
  email: string;
  password: string;
  remember: boolean;
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

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (hasErrors) return;

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();

      // 1) Login no Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });

      if (authError || !authData.user) {
        setServerError(authError?.message || "E-mail ou senha inválidos.");
        return;
      }

      // 2) (Opcional) Persistência "remember me"
      // O supabase-js já persiste sessão por padrão no localStorage.
      // Se você quiser simular "não lembrar", dá pra forçar storage em memória (mais chato),
      // então aqui só mantemos o comportamento padrão.

      // 3) Busca role no profiles (admin vs customer)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();
        
      if (profileError) {
        console.log("profileError:", profileError);
      }

      if (profileError || !profile) {
        // se não encontrou perfil, encerra sessão por segurança
        await supabase.auth.signOut();
        setServerError("Seu perfil não foi encontrado. Contate o suporte.");
        return;
      }

      // 4) Redireciona baseado no role
      if (profile.role === "admin") navigate("/admin");
      else navigate("/minha-conta");
    } catch {
      setServerError("Falha de rede/servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFAF6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#2b554e]">Entrar</h1>
          <p className="text-[#2b554e]/70 mt-1">
            Acesse sua conta para acompanhar pedidos e favoritos.
          </p>
        </div>

        <div className="rounded-2xl border border-[#2b554e]/10 bg-white p-6 shadow-sm">
          {serverError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm text-[#2b554e]">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="mt-1 w-full rounded-xl bg-white border border-[#2b554e]/20 px-4 py-3 outline-none focus:ring-2 focus:ring-[#b08d57]/25 focus:border-[#b08d57]/40"
                placeholder="voce@exemplo.com"
                autoComplete="email"
                inputMode="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Senha */}
            <div>
              <label className="text-sm text-[#2b554e]">Senha</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  type={showPass ? "text" : "password"}
                  className="w-full rounded-xl bg-white border border-[#2b554e]/20 px-4 py-3 outline-none focus:ring-2 focus:ring-[#b08d57]/25 focus:border-[#b08d57]/40"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="rounded-xl border border-[#2b554e]/20 bg-[#FCFAF6] px-3 text-sm text-[#2b554e] hover:bg-[#f3f0e0]"
                >
                  {showPass ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            {/* Lembrar + Esqueci */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#2b554e]/80">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => update("remember", e.target.checked)}
                  className="h-4 w-4 rounded border-[#2b554e]/30"
                />
                Lembrar de mim
              </label>

              <button
                type="button"
                onClick={() => navigate("/esqueci-senha")}
                className="text-sm text-[#2b554e] underline hover:text-[#b08d57]"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || hasErrors}
              className="w-full rounded-xl bg-[#2b554e] text-white font-medium py-3 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-center text-sm text-[#2b554e]/75">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/cadastro")}
                className="underline hover:text-[#b08d57]"
              >
                Criar conta
              </button>
            </p>
          </form>
        </div>

        <p className="mt-6 text-xs text-[#2b554e]/60">
          Login via Supabase Auth + role em <code>profiles</code> (admin/customer).
        </p>
      </div>
    </div>
  );
}

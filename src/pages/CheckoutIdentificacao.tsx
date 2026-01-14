import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, User, CreditCard, CheckCircle, ArrowLeft } from "lucide-react";
import { useCart } from "../context/CartContext";

function Step({
  label,
  active,
  Icon,
}: {
  label: string;
  active?: boolean;
  Icon: React.ElementType;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <span
        className={[
          "inline-flex h-10 w-10 items-center justify-center rounded-full border shrink-0",
          active ? "border-black text-black" : "border-gray-300 text-gray-400",
        ].join(" ")}
      >
        <Icon className="h-5 w-5 block" />
      </span>
      <span
        className={[
          "whitespace-nowrap text-xs sm:text-sm",
          active ? "font-semibold text-black" : "text-gray-400",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

function isEmail(v: string) {
  const s = String(v ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidCPF(cpf: string) {
  // validação simples (tira repetidos e checa dígitos)
  const c = onlyDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1+$/.test(c)) return false;

  const calc = (base: string, factor: number) => {
    let total = 0;
    for (let i = 0; i < base.length; i++) total += Number(base[i]) * (factor - i);
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(c.slice(0, 9), 10);
  const d2 = calc(c.slice(0, 10), 11);
  return d1 === Number(c[9]) && d2 === Number(c[10]);
}

type Form = {
  name: string;
  email: string;
  phone: string;

  docType: "CPF" | "CNPJ";
  document: string;

  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const STORAGE_KEY = "checkout_identificacao_v1";

export default function CheckoutIdentificacao() {
  const navigate = useNavigate();
  const { state } = useCart();

  const items = state.items ?? [];
  useEffect(() => {
    // se carrinho vazio, volta
    if (!items.length) navigate("/checkout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const [form, setForm] = useState<Form>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      name: "",
      email: "",
      phone: "",
      docType: "CPF",
      document: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const requiredOk = useMemo(() => {
    const cepOk = onlyDigits(form.cep).length === 8;
    const emailOk = isEmail(form.email);
    const phoneOk = onlyDigits(form.phone).length >= 10; // DDD + número
    const docOk =
      form.docType === "CPF" ? isValidCPF(form.document) : onlyDigits(form.document).length >= 14;

    const addrOk =
      form.street.trim() &&
      form.number.trim() &&
      form.neighborhood.trim() &&
      form.city.trim() &&
      form.state.trim().length === 2;

    return Boolean(
      form.name.trim() &&
        emailOk &&
        phoneOk &&
        docOk &&
        cepOk &&
        addrOk
    );
  }, [form]);

  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[String(key)];
      return copy;
    });
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};

    if (!form.name.trim()) e.name = "Informe seu nome.";
    if (!isEmail(form.email)) e.email = "E-mail inválido.";
    if (onlyDigits(form.phone).length < 10) e.phone = "Telefone inválido (com DDD).";

    if (form.docType === "CPF") {
      if (!isValidCPF(form.document)) e.document = "CPF inválido.";
    } else {
      if (onlyDigits(form.document).length < 14) e.document = "CNPJ inválido.";
    }

    if (onlyDigits(form.cep).length !== 8) e.cep = "CEP inválido.";
    if (!form.street.trim()) e.street = "Rua/Av. obrigatório.";
    if (!form.number.trim()) e.number = "Número obrigatório.";
    if (!form.neighborhood.trim()) e.neighborhood = "Bairro obrigatório.";
    if (!form.city.trim()) e.city = "Cidade obrigatória.";
    if (form.state.trim().length !== 2) e.state = "UF com 2 letras (ex: SP).";

    return e;
  }

  async function handleContinue() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      // Se você tiver um CheckoutContext, salve aqui também.
      // Por enquanto, já está no localStorage.
      navigate("/checkout/pagamento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        {/* topo */}
        <div className="mb-8 sm:mb-10 text-center">
          <img
            src="/logo_fundo_claro3.svg"
            alt="Logo da loja"
            className="mx-auto h-[110px] sm:h-[150px] w-auto object-contain"
          />

          <div className="mx-auto mt-4 max-w-3xl">
            <div className="flex items-center gap-6 overflow-x-auto px-2 pb-2 [-webkit-overflow-scrolling:touch] sm:px-0 sm:justify-between sm:overflow-visible">
              <Step label="Sacola" Icon={ShoppingBag} />
              <div className="hidden sm:block h-px flex-1 bg-gray-300" />
              <Step label="Identificação" active Icon={User} />
              <div className="hidden sm:block h-px flex-1 bg-gray-300" />
              <Step label="Pagamento" Icon={CreditCard} />
              <div className="hidden sm:block h-px flex-1 bg-gray-300" />
              <Step label="Confirmação" Icon={CheckCircle} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* formulário */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Identificação</h2>
                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              </div>

              {/* Dados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold">Nome completo</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="Seu nome"
                  />
                  {errors.name && <div className="mt-1 text-sm text-red-600">{errors.name}</div>}
                </div>

                <div>
                  <label className="text-sm font-semibold">E-mail</label>
                  <input
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="voce@exemplo.com"
                    inputMode="email"
                  />
                  {errors.email && <div className="mt-1 text-sm text-red-600">{errors.email}</div>}
                </div>

                <div>
                  <label className="text-sm font-semibold">WhatsApp</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="(11) 99999-9999"
                    inputMode="numeric"
                  />
                  {errors.phone && <div className="mt-1 text-sm text-red-600">{errors.phone}</div>}
                </div>

                <div>
                  <label className="text-sm font-semibold">Documento</label>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={form.docType}
                      onChange={(e) => setField("docType", e.target.value as any)}
                      className="h-11 rounded-md border border-gray-300 px-3 bg-white"
                    >
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                    </select>
                    <input
                      value={form.document}
                      onChange={(e) => setField("document", e.target.value)}
                      className="h-11 flex-1 rounded-md border border-gray-300 px-3"
                      placeholder={form.docType === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                      inputMode="numeric"
                    />
                  </div>
                  {errors.document && <div className="mt-1 text-sm text-red-600">{errors.document}</div>}
                </div>
              </div>

              <div className="my-6 h-px bg-gray-200" />

              {/* Endereço */}
              <h3 className="font-semibold mb-3">Endereço de entrega</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold">CEP</label>
                  <input
                    value={form.cep}
                    onChange={(e) => setField("cep", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  {errors.cep && <div className="mt-1 text-sm text-red-600">{errors.cep}</div>}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold">Rua / Avenida</label>
                  <input
                    value={form.street}
                    onChange={(e) => setField("street", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="Rua Exemplo"
                  />
                  {errors.street && <div className="mt-1 text-sm text-red-600">{errors.street}</div>}
                </div>

                <div>
                  <label className="text-sm font-semibold">Número</label>
                  <input
                    value={form.number}
                    onChange={(e) => setField("number", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="123"
                    inputMode="numeric"
                  />
                  {errors.number && <div className="mt-1 text-sm text-red-600">{errors.number}</div>}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold">Complemento (opcional)</label>
                  <input
                    value={form.complement}
                    onChange={(e) => setField("complement", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="Apto, bloco, casa..."
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Bairro</label>
                  <input
                    value={form.neighborhood}
                    onChange={(e) => setField("neighborhood", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="Centro"
                  />
                  {errors.neighborhood && (
                    <div className="mt-1 text-sm text-red-600">{errors.neighborhood}</div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold">Cidade</label>
                  <input
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="São Paulo"
                  />
                  {errors.city && <div className="mt-1 text-sm text-red-600">{errors.city}</div>}
                </div>

                <div>
                  <label className="text-sm font-semibold">UF</label>
                  <input
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value.toUpperCase())}
                    className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3"
                    placeholder="SP"
                    maxLength={2}
                  />
                  {errors.state && <div className="mt-1 text-sm text-red-600">{errors.state}</div>}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  className="h-12 w-full sm:w-auto rounded-md border border-gray-300 px-5 font-semibold hover:bg-gray-50"
                >
                  Voltar para sacola
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!requiredOk || saving}
                  className="h-12 w-full sm:flex-1 rounded-md bg-[#c9b38a] px-5 font-semibold text-white disabled:opacity-50 hover:brightness-95"
                  title={!requiredOk ? "Preencha os campos obrigatórios" : ""}
                >
                  {saving ? "Salvando..." : "Continuar para pagamento"}
                </button>
              </div>
            </div>
          </div>

          {/* resumo */}
          <div className="space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
              <div className="text-sm font-semibold mb-2">Resumo</div>
              <div className="text-sm text-gray-600">
                Itens no carrinho: <span className="font-semibold text-black">{items.length}</span>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Seus dados ficam salvos só para finalizar a compra.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

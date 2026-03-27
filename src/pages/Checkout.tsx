import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  User,
  CreditCard,
  CheckCircle,
  Trash2,
  Gift,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import CombineWith from "../components/CombineWith";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#fcfaf6",
  soft: "#f6f3ee",
  line: "#e9e2d6",
};

function moneyBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

function formatCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

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
          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
          active ? "text-white" : "border-[#d8d1c6] text-[#9a9388]",
        ].join(" ")}
        style={{
          backgroundColor: active ? CALEA.primary : "white",
          borderColor: active ? CALEA.primary : "#d8d1c6",
        }}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span
        className={[
          "whitespace-nowrap text-xs sm:text-sm",
          active ? "font-semibold" : "text-gray-400",
        ].join(" ")}
        style={{ color: active ? CALEA.primary : undefined }}
      >
        {label}
      </span>
    </div>
  );
}

type ShippingOption = {
  id: string;
  name: string;
  price: number;
  deadline: string;
  original_price?: number;
  posting_type?: string;
};

export default function Checkout() {
  const navigate = useNavigate();
  const { state, subtotal, remove, setQty } = useCart();

  const items = state.items ?? [];

  const [giftWrap, setGiftWrap] = useState(false);
  const giftWrapPrice = 32;

  const [cep, setCep] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] =
    useState<ShippingOption | null>(null);

  const count = useMemo(
    () => items.reduce((acc, it) => acc + (it.qty ?? 1), 0),
    [items]
  );

  const shippingPrice = selectedShipping?.price ?? 0;
  const total = subtotal + (giftWrap ? giftWrapPrice : 0) + shippingPrice;

  useEffect(() => {
    if (!items.length) {
      setShippingOptions([]);
      setSelectedShipping(null);
      setShippingError(null);
    }
  }, [items.length]);

  useEffect(() => {
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingError(null);
  }, [cep]);

  function saveCheckoutDraft() {
  const payload = {
    items,
    subtotal,
    cep: onlyDigits(cep),
    giftWrap,
    giftWrapPrice: giftWrap ? giftWrapPrice : 0,
    shipping: selectedShipping
      ? {
          id: selectedShipping.id,
          name: selectedShipping.name,
          price: selectedShipping.price,
          deadline: selectedShipping.deadline,
        }
      : null,
    shippingPrice,
    total,
    updatedAt: new Date().toISOString(),
  };

  sessionStorage.setItem("calea_checkout", JSON.stringify(payload));
}

  async function handleCalcShipping() {
    const cleanCep = onlyDigits(cep);

    if (cleanCep.length !== 8) {
      setShippingError("CEP inválido. Digite os 8 números.");
      setShippingOptions([]);
      setSelectedShipping(null);
      return;
    }

    if (!items.length) {
      setShippingError("Seu carrinho está vazio.");
      return;
    }

    setShippingLoading(true);
    setShippingError(null);
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      const totalWeight = Math.max(
        0.03,
        items.reduce((acc, item) => acc + 0.03 * (item.qty ?? 1), 0)
      );

      const payload = {
        to_postcode: cleanCep,
        insurance_value: 0,
        weight: Number(totalWeight.toFixed(2)),
        services: "1,2,17,3",
      };

      const res = await fetch("/.netlify/functions/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.details?.error ||
          `Falha ao calcular frete (${res.status})`;

        throw new Error(msg);
      }

      const opts: ShippingOption[] = Array.isArray(data?.options)
        ? data.options
        : [];

      setShippingOptions(opts);

      if (!opts.length) {
        setShippingError("Nenhuma opção de frete encontrada para esse CEP.");
      }
    } catch (e: any) {
      setShippingError(e?.message ?? "Erro ao calcular frete.");
    } finally {
      setShippingLoading(false);
    }
  }

  function handleContinue() {
    if (!items.length || !selectedShipping) return;

    saveCheckoutDraft();
    navigate("/checkout/identificacao");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CALEA.bg }}>
      <Header />

      <main>
        <section className="border-b" style={{ borderColor: CALEA.line }}>
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="text-center">
              <p
                className="text-[11px] uppercase tracking-[0.28em]"
                style={{ color: CALEA.accent }}
              >
                Checkout
              </p>

              <h1
                className="mt-2 text-2xl font-medium sm:text-3xl"
                style={{ color: CALEA.primary }}
              >
                Finalize sua compra
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Seus detalhes, frete e pagamento em poucos passos.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl">
              <div className="flex items-center gap-6 overflow-x-auto px-2 pb-2 [-webkit-overflow-scrolling:touch] sm:justify-between sm:overflow-visible sm:px-0">
                <Step label="Sacola" active Icon={ShoppingBag} />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Identificação" Icon={User} />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Pagamento" Icon={CreditCard} />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Confirmação" Icon={CheckCircle} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Sua sacola
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {count} item(ns) selecionado(s)
                    </p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d8d1c6] bg-[#fcfaf6] px-6 py-12 text-center">
                    <p className="text-base font-medium text-gray-700">
                      Seu carrinho está vazio.
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Adicione produtos para continuar.
                    </p>

                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="mt-5 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                      style={{ backgroundColor: CALEA.primary }}
                    >
                      Continuar comprando
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#efe8dc]">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="grid grid-cols-[80px_1fr] gap-4 py-5 sm:flex sm:items-center"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f7f3ec] ring-1 ring-black/5">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt={it.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 sm:flex-1">
                          <div
                            className="truncate text-base font-semibold"
                            style={{ color: CALEA.primary }}
                          >
                            {it.name}
                          </div>

                          {it.variant ? (
                            <div className="mt-1 truncate text-sm text-gray-500">
                              {it.variant}
                            </div>
                          ) : null}
                        </div>

                        <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end sm:gap-4">
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              className="h-9 w-9 rounded-full border border-[#d8d1c6] bg-white text-base hover:bg-[#faf7f1]"
                              onClick={() =>
                                setQty(it.id, Math.max(1, (it.qty ?? 1) - 1))
                              }
                              type="button"
                              aria-label="Diminuir quantidade"
                            >
                              -
                            </button>

                            <div className="w-8 text-center text-sm font-medium">
                              {it.qty ?? 1}
                            </div>

                            <button
                              className="h-9 w-9 rounded-full border border-[#d8d1c6] bg-white text-base hover:bg-[#faf7f1]"
                              onClick={() => setQty(it.id, (it.qty ?? 1) + 1)}
                              type="button"
                              aria-label="Aumentar quantidade"
                            >
                              +
                            </button>
                          </div>

                          <div
                            className="shrink-0 text-sm font-semibold sm:text-base"
                            style={{ color: CALEA.primary }}
                          >
                            {moneyBRL((it.price ?? 0) * (it.qty ?? 1))}
                          </div>

                          <button
                            className="shrink-0 text-gray-400 transition hover:text-red-500"
                            onClick={() => remove(it.id)}
                            type="button"
                            aria-label="Remover item"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                                {items.length > 0 && <CombineWith items={items} />}

                {items.length > 0 && (
                  <div className="mt-6 rounded-[22px] border border-[#eadfce] bg-[#fcfaf6] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: "#efe6d7" }}
                      >
                        <Gift
                          className="h-5 w-5"
                          style={{ color: CALEA.accent }}
                        />
                      </div>

                      <div className="flex-1">
                        <div
                          className="text-sm font-semibold sm:text-base"
                          style={{ color: CALEA.primary }}
                        >
                          Embalagem para presente
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Caixa premium + finalização especial para presente.
                        </p>
                      </div>

                      <div
                        className="text-sm font-semibold"
                        style={{ color: CALEA.primary }}
                      >
                        {moneyBRL(giftWrapPrice)}
                      </div>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-3">
                      <input
                        type="checkbox"
                        checked={giftWrap}
                        onChange={(e) => setGiftWrap(e.target.checked)}
                        className="h-5 w-5 shrink-0"
                        style={{ accentColor: CALEA.primary }}
                      />

                      <span className="text-sm font-medium text-gray-700">
                        Adicionar embalagem para presente
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <aside className="h-fit space-y-6 lg:sticky lg:top-24">
              <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="flex items-center gap-2">
                  <MapPin
                    className="h-4 w-4"
                    style={{ color: CALEA.accent }}
                  />
                  <h3
                    className="text-base font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Entrega
                  </h3>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    placeholder="Digite seu CEP"
                    className="h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e] sm:flex-1"
                    inputMode="numeric"
                    maxLength={9}
                  />

                  <button
                    onClick={handleCalcShipping}
                    className="h-11 w-full rounded-xl px-4 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    style={{ backgroundColor: CALEA.primary }}
                    disabled={shippingLoading || items.length === 0}
                    type="button"
                  >
                    {shippingLoading ? "Calculando..." : "Calcular"}
                  </button>
                </div>

                {shippingError && (
                  <div className="mt-3 text-sm text-red-600">
                    {shippingError}
                  </div>
                )}

                {shippingOptions.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {shippingOptions.map((op) => {
                      const checked = selectedShipping?.id === op.id;

                      return (
                        <label
                          key={op.id}
                          className="block cursor-pointer rounded-2xl border p-4 transition"
                          style={{
                            borderColor: checked ? CALEA.primary : "#e5ddd1",
                            backgroundColor: checked ? "#f7f3ec" : "#fff",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shipping"
                                checked={checked}
                                onChange={() => setSelectedShipping(op)}
                                className="mt-1 h-4 w-4 shrink-0"
                                style={{ accentColor: CALEA.primary }}
                              />

                              <div>
                                <div
                                  className="font-semibold"
                                  style={{ color: CALEA.primary }}
                                >
                                  {op.name}
                                </div>

                                <div className="mt-1 text-xs text-gray-500">
                                  {op.deadline || "Prazo indisponível"}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div
                                className="font-semibold"
                                style={{ color: CALEA.primary }}
                              >
                                {moneyBRL(op.price)}
                              </div>

                              {op.original_price &&
                              op.original_price > op.price ? (
                                <div className="text-xs text-gray-400 line-through">
                                  {moneyBRL(op.original_price)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="my-6 h-px bg-[#eee5d8]" />

                <h3
                  className="text-base font-semibold"
                  style={{ color: CALEA.primary }}
                >
                  Resumo do pedido
                </h3>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">{moneyBRL(subtotal)}</span>
                  </div>

                  {giftWrap && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Embalagem presente</span>
                      <span className="font-semibold">
                        {moneyBRL(giftWrapPrice)}
                      </span>
                    </div>
                  )}

                  {selectedShipping && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        Frete ({selectedShipping.name})
                      </span>
                      <span className="font-semibold">
                        {moneyBRL(shippingPrice)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="my-6 h-px bg-[#eee5d8]" />

                <div className="flex items-center justify-between">
                  <span
                    className="text-lg font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Total
                  </span>
                  <span
                    className="text-2xl font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    {moneyBRL(total)}
                  </span>
                </div>

                <button
                  className="mt-6 w-full rounded-full py-4 text-sm font-semibold tracking-[0.08em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: CALEA.accent }}
                  onClick={handleContinue}
                  type="button"
                  disabled={items.length === 0 || !selectedShipping}
                  title={!selectedShipping ? "Selecione o frete para continuar" : ""}
                >
                  FINALIZAR COMPRA
                </button>

                <div className="mt-4 rounded-2xl bg-[#fcfaf6] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: CALEA.primary }}
                    />
                    <p className="text-xs leading-5 text-gray-500">
                      Ambiente seguro. Seus dados são protegidos durante toda a
                      compra.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
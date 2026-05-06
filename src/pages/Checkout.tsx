// src/pages/Checkout.tsx
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
  TicketPercent,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import CombineWith from "../components/CombineWith";
import { supabase } from "../lib/supabase";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#fcfaf6",
  soft: "#f6f3ee",
  line: "#e9e2d6",
};

function moneyBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatCEP(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 5) return digits;

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
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

type AppliedCoupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed" | "free_shipping";
  percent: number | null;
  amount_cents: number | null;
  max_discount_cents: number | null;
  min_subtotal_cents: number;
  first_purchase_only: boolean;
};

function calculateCouponDiscountCents(params: {
  coupon: AppliedCoupon | null;
  subtotalCents: number;
  shippingCents: number;
}) {
  const { coupon, subtotalCents, shippingCents } = params;

  if (!coupon) return 0;

  if (coupon.discount_type === "percent") {
    let discount = Math.round(subtotalCents * (Number(coupon.percent || 0) / 100));

    if (coupon.max_discount_cents) {
      discount = Math.min(discount, Number(coupon.max_discount_cents));
    }

    return Math.min(discount, subtotalCents);
  }

  if (coupon.discount_type === "fixed") {
    return Math.min(Number(coupon.amount_cents || 0), subtotalCents);
  }

  if (coupon.discount_type === "free_shipping") {
    return Math.max(shippingCents, 0);
  }

  return 0;
}

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

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const count = useMemo(
    () => items.reduce((acc, item) => acc + (item.qty ?? 1), 0),
    [items]
  );

  const shippingPrice = selectedShipping?.price ?? 0;
  const subtotalCents = Math.round(Number(subtotal || 0) * 100);
  const shippingCents = Math.round(Number(shippingPrice || 0) * 100);

  const discountCents = useMemo(() => {
    return calculateCouponDiscountCents({
      coupon: appliedCoupon,
      subtotalCents,
      shippingCents,
    });
  }, [appliedCoupon, subtotalCents, shippingCents]);

  const discountValue = discountCents / 100;

  const total = Math.max(
    subtotal + (giftWrap ? giftWrapPrice : 0) + shippingPrice - discountValue,
    0
  );

  useEffect(() => {
    if (!items.length) {
      setShippingOptions([]);
      setSelectedShipping(null);
      setShippingError(null);
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError(null);
      setCouponSuccess(null);
    }
  }, [items.length]);

  useEffect(() => {
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingError(null);

    if (appliedCoupon?.discount_type === "free_shipping") {
      setCouponSuccess(null);
      setCouponError("Recalcule o frete e reaplique o cupom de frete grátis.");
      setAppliedCoupon(null);
    }
  }, [cep]);

  useEffect(() => {
    if (!appliedCoupon) return;

    if (subtotalCents < appliedCoupon.min_subtotal_cents) {
      setCouponError(
        `Cupom removido. Pedido mínimo de ${moneyBRL(
          appliedCoupon.min_subtotal_cents / 100
        )}.`
      );
      setCouponSuccess(null);
      setAppliedCoupon(null);
    }
  }, [subtotalCents, appliedCoupon]);

  async function applyCoupon() {
    setCouponError(null);
    setCouponSuccess(null);

    const code = couponCode.trim().toUpperCase();

    if (!code) {
      setCouponError("Digite um cupom.");
      return;
    }

    if (!items.length) {
      setCouponError("Adicione produtos para usar um cupom.");
      return;
    }

    setCouponLoading(true);

    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select(
          `
          id,
          code,
          active,
          discount_type,
          percent,
          amount_cents,
          max_discount_cents,
          min_subtotal_cents,
          starts_at,
          ends_at,
          first_purchase_only
        `
        )
        .ilike("code", `%${code}%`)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        setAppliedCoupon(null);
        setCouponError("Cupom não encontrado.");
        return;
      }

      if (!coupon.active) {
        setAppliedCoupon(null);
        setCouponError("Este cupom está inativo.");
        return;
      }

      const now = new Date();

      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        setAppliedCoupon(null);
        setCouponError("Este cupom ainda não está disponível.");
        return;
      }

      if (coupon.ends_at && new Date(coupon.ends_at) < now) {
        setAppliedCoupon(null);
        setCouponError("Este cupom está expirado.");
        return;
      }

      const minSubtotalCents = Number(coupon.min_subtotal_cents || 0);

      if (subtotalCents < minSubtotalCents) {
        setAppliedCoupon(null);
        setCouponError(
          `Pedido mínimo de ${moneyBRL(minSubtotalCents / 100)} para usar este cupom.`
        );
        return;
      }

      if (coupon.discount_type === "free_shipping" && !selectedShipping) {
        setAppliedCoupon(null);
        setCouponError("Selecione o frete antes de aplicar este cupom.");
        return;
      }

      const normalizedCoupon: AppliedCoupon = {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        percent: coupon.percent === null ? null : Number(coupon.percent),
        amount_cents:
          coupon.amount_cents === null ? null : Number(coupon.amount_cents),
        max_discount_cents:
          coupon.max_discount_cents === null
            ? null
            : Number(coupon.max_discount_cents),
        min_subtotal_cents: minSubtotalCents,
        first_purchase_only: Boolean(coupon.first_purchase_only),
      };

      const nextDiscountCents = calculateCouponDiscountCents({
        coupon: normalizedCoupon,
        subtotalCents,
        shippingCents,
      });

      if (nextDiscountCents <= 0 && normalizedCoupon.discount_type !== "free_shipping") {
        setAppliedCoupon(null);
        setCouponError("Este cupom não gerou desconto para este pedido.");
        return;
      }

      setAppliedCoupon(normalizedCoupon);
      setCouponCode(normalizedCoupon.code);
      setCouponSuccess(
        `Cupom ${normalizedCoupon.code} aplicado. Desconto de ${moneyBRL(
          nextDiscountCents / 100
        )}.`
      );
    } catch (error: any) {
      console.error("Erro ao aplicar cupom:", error);
      setAppliedCoupon(null);
      setCouponError(error?.message || "Erro ao aplicar cupom.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    setCouponSuccess(null);
  }

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
      couponCode: appliedCoupon?.code || null,
      coupon_id: appliedCoupon?.id || null,
      coupon: appliedCoupon,
      discount: discountValue,
      discount_cents: discountCents,
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

    if (appliedCoupon?.discount_type === "free_shipping") {
      setAppliedCoupon(null);
      setCouponSuccess(null);
      setCouponError("Reaplique o cupom após recalcular o frete.");
    }

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
        const message =
          data?.error ||
          data?.details?.error ||
          `Falha ao calcular frete (${res.status})`;

        throw new Error(message);
      }

      const options: ShippingOption[] = Array.isArray(data?.options)
        ? data.options
        : [];

      setShippingOptions(options);

      if (!options.length) {
        setShippingError("Nenhuma opção de frete encontrada para esse CEP.");
      }
    } catch (error: any) {
      setShippingError(error?.message ?? "Erro ao calcular frete.");
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

      <main className="pt-[160px] md:pt-[180px]">
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
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[80px_1fr] gap-4 py-5 sm:flex sm:items-center"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f7f3ec] ring-1 ring-black/5">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 sm:flex-1">
                          <div
                            className="truncate text-base font-semibold"
                            style={{ color: CALEA.primary }}
                          >
                            {item.name}
                          </div>

                          {item.variant ? (
                            <div className="mt-1 truncate text-sm text-gray-500">
                              {item.variant}
                            </div>
                          ) : null}
                        </div>

                        <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end sm:gap-4">
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              className="h-9 w-9 rounded-full border border-[#d8d1c6] bg-white text-base hover:bg-[#faf7f1]"
                              onClick={() =>
                                setQty(
                                  item.id,
                                  Math.max(1, (item.qty ?? 1) - 1)
                                )
                              }
                              type="button"
                              aria-label="Diminuir quantidade"
                            >
                              -
                            </button>

                            <div className="w-8 text-center text-sm font-medium">
                              {item.qty ?? 1}
                            </div>

                            <button
                              className="h-9 w-9 rounded-full border border-[#d8d1c6] bg-white text-base hover:bg-[#faf7f1]"
                              onClick={() =>
                                setQty(item.id, (item.qty ?? 1) + 1)
                              }
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
                            {moneyBRL((item.price ?? 0) * (item.qty ?? 1))}
                          </div>

                          <button
                            className="shrink-0 text-gray-400 transition hover:text-red-500"
                            onClick={() => remove(item.id)}
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
                        onChange={(event) => setGiftWrap(event.target.checked)}
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
                    onChange={(event) => setCep(formatCEP(event.target.value))}
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
                    {shippingOptions.map((option) => {
                      const checked = selectedShipping?.id === option.id;

                      return (
                        <label
                          key={option.id}
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
                                onChange={() => setSelectedShipping(option)}
                                className="mt-1 h-4 w-4 shrink-0"
                                style={{ accentColor: CALEA.primary }}
                              />

                              <div>
                                <div
                                  className="font-semibold"
                                  style={{ color: CALEA.primary }}
                                >
                                  {option.name}
                                </div>

                                <div className="mt-1 text-xs text-gray-500">
                                  {option.deadline || "Prazo indisponível"}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div
                                className="font-semibold"
                                style={{ color: CALEA.primary }}
                              >
                                {moneyBRL(option.price)}
                              </div>

                              {option.original_price &&
                              option.original_price > option.price ? (
                                <div className="text-xs text-gray-400 line-through">
                                  {moneyBRL(option.original_price)}
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

                <div>
                  <div className="flex items-center gap-2">
                    <TicketPercent
                      className="h-4 w-4"
                      style={{ color: CALEA.accent }}
                    />

                    <h3
                      className="text-base font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Cupom de desconto
                    </h3>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      value={couponCode}
                      onChange={(event) =>
                        setCouponCode(event.target.value.toUpperCase())
                      }
                      placeholder="Digite seu cupom"
                      className="h-11 w-full rounded-xl border border-[#d8d1c6] px-3 uppercase outline-none transition focus:border-[#2b554e] sm:flex-1"
                      disabled={couponLoading || Boolean(appliedCoupon)}
                    />

                    {appliedCoupon ? (
                      <button
                        onClick={removeCoupon}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d8d1c6] px-4 font-semibold text-red-600 transition hover:bg-red-50 sm:w-auto"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                        Remover
                      </button>
                    ) : (
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || items.length === 0}
                        className="h-11 w-full rounded-xl px-4 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        style={{ backgroundColor: CALEA.primary }}
                        type="button"
                      >
                        {couponLoading ? "Aplicando..." : "Aplicar"}
                      </button>
                    )}
                  </div>

                  {couponError && (
                    <div className="mt-3 text-sm text-red-600">
                      {couponError}
                    </div>
                  )}

                  {couponSuccess && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      {couponSuccess}
                    </div>
                  )}

                  {appliedCoupon?.first_purchase_only && (
                    <div className="mt-2 text-xs text-gray-500">
                      Este cupom será revalidado como primeira compra antes do pagamento.
                    </div>
                  )}
                </div>

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

                  {discountCents > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        Desconto ({appliedCoupon?.code})
                      </span>

                      <span className="font-semibold text-emerald-700">
                        - {moneyBRL(discountValue)}
                      </span>
                    </div>
                  )}

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
                  title={
                    !selectedShipping ? "Selecione o frete para continuar" : ""
                  }
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

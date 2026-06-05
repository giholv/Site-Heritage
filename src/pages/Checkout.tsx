// src/pages/Checkout.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
  Minus,
  Plus,
  Truck,
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

type ShippingOption = {
  id: string;
  name: string;
  price: number;
  deadline: string;
  original_price?: number;
  posting_type?: string;

  carrier?: string;
  carrier_code?: string;
  delivery_time?: number;
  allow_buy_label?: boolean;
  raw?: any;
};

type AppliedCoupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  free_shipping?: boolean;
  percent: number | null;
  amount_cents: number | null;
  max_discount_cents: number | null;
  min_subtotal_cents: number;
  first_purchase_only: boolean;
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

function itemCountLabel(count: number) {
  return `${count} ${count === 1 ? "peça" : "peças"}`;
}

function formatCEP(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
function getCartSkuId(item: any) {
  return (
    item?.sku_id ||
    item?.skuId ||
    item?.sku ||
    item?.variant_id ||
    item?.variantId ||
    null
  );
}

function calculateCouponDiscountCents(params: {
  coupon: AppliedCoupon | null;
  subtotalCents: number;
  shippingCents: number;
}) {
  const { coupon, subtotalCents, shippingCents } = params;

  if (!coupon) return 0;

  let discount = 0;

  if (coupon.discount_type === "percent") {
    discount = Math.round(
      subtotalCents * (Number(coupon.percent || 0) / 100)
    );

    if (coupon.max_discount_cents) {
      discount = Math.min(
        discount,
        Number(coupon.max_discount_cents)
      );
    }
  }

  if (coupon.discount_type === "fixed") {
    discount = Math.min(
      Number(coupon.amount_cents || 0),
      subtotalCents
    );
  }

  if (coupon.free_shipping) {
    discount += shippingCents;
  }

  return Math.min(
    discount,
    subtotalCents + shippingCents
  );
}

function Step({
  label,
  active,
  done,
  Icon,
}: {
  label: string;
  active?: boolean;
  done?: boolean;
  Icon: React.ElementType;
}) {
  return (
    <div className="flex min-w-[78px] flex-col items-center gap-2">
      <span
        className={[
          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all",
          active
            ? "border-[#2b554e] bg-[#2b554e] text-white shadow-[0_10px_22px_rgba(43,85,78,0.18)]"
            : done
              ? "border-[#b08d57] bg-[#fff8ed] text-[#b08d57]"
              : "border-[#ddd5ca] bg-white text-[#aaa197]",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span
        className={[
          "whitespace-nowrap text-[11px] sm:text-xs",
          active ? "font-semibold text-[#2b554e]" : "text-[#9a9187]",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { state, subtotal, remove, setQty } = useCart();

  const items = state.items ?? [];

  const [giftWrap, setGiftWrap] = useState(false);
  const giftWrapPrice = 15.0;

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
  const [stockBySku, setStockBySku] = useState<Record<string, number>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const count = useMemo(
    () => items.reduce((acc, item) => acc + (item.qty ?? 1), 0),
    [items]
  );

  const FREE_SHIPPING_THRESHOLD = 299;
  const FREE_SHIPPING_THRESHOLD_CENTS = FREE_SHIPPING_THRESHOLD * 100;

  const subtotalCents = Math.round(Number(subtotal || 0) * 100);

  const originalShippingPrice = selectedShipping?.price ?? 0;
  const hasAutomaticFreeShipping =
    subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS && Boolean(selectedShipping);

  const hasCouponFreeShipping = Boolean(appliedCoupon?.free_shipping);

  const shippingPrice =
    hasAutomaticFreeShipping || hasCouponFreeShipping
      ? 0
      : originalShippingPrice;

  const originalShippingCents = Math.round(Number(originalShippingPrice || 0) * 100);

  const productDiscountCents = useMemo(() => {
    if (!appliedCoupon) return 0;

    let discount = 0;

    if (appliedCoupon.discount_type === "percent") {
      discount = Math.round(
        subtotalCents * (Number(appliedCoupon.percent || 0) / 100)
      );

      if (appliedCoupon.max_discount_cents) {
        discount = Math.min(
          discount,
          Number(appliedCoupon.max_discount_cents)
        );
      }
    }

    if (appliedCoupon.discount_type === "fixed") {
      discount = Math.min(
        Number(appliedCoupon.amount_cents || 0),
        subtotalCents
      );
    }

    return discount;
  }, [appliedCoupon, subtotalCents]);

  const effectiveDiscountCents = productDiscountCents;

  const discountValue = effectiveDiscountCents / 100;

  const total = Math.max(
    subtotal + (giftWrap ? giftWrapPrice : 0) + shippingPrice - discountValue,
    0
  );

  const canContinue = items.length > 0 && Boolean(selectedShipping);

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

    if (appliedCoupon?.free_shipping) {
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
          free_shipping,
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
          `Pedido mínimo de ${moneyBRL(
            minSubtotalCents / 100
          )} para usar este cupom.`
        );
        return;
      }

      if (coupon.free_shipping && !selectedShipping) {
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
        free_shipping: Boolean(coupon.free_shipping),
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
        shippingCents: originalShippingCents,
      });

      if (
        nextDiscountCents <= 0 &&
        !normalizedCoupon.free_shipping
      ) {
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
  async function checkCartStock() {
    if (!items.length) return true;

    setStockLoading(true);
    setStockError(null);

    try {
      const skuIds = items
        .map((item) => getCartSkuId(item))
        .filter(Boolean);

      if (!skuIds.length) {
        setStockError("Não foi possível validar o estoque dos itens.");
        return false;
      }

      const { data, error } = await supabase
        .from("sku_availability")
        .select("sku_id, available_qty")
        .in("sku_id", skuIds);

      if (error) throw error;

      const map: Record<string, number> = {};

      data?.forEach((row: any) => {
        map[row.sku_id] = Number(row.available_qty || 0);
      });

      setStockBySku(map);

      const invalidItems = items.filter((item: any) => {
        const skuId = getCartSkuId(item);
        const availableQty = map[skuId] ?? 0;
        const qty = item.qty ?? 1;

        return qty > availableQty || availableQty <= 0;
      });

      if (invalidItems.length > 0) {
        setStockError(
          "Alguns itens da sacola não possuem estoque suficiente. Ajuste a quantidade para continuar."
        );
        return false;
      }

      return true;
    } catch (error: any) {
      console.error("Erro ao validar estoque:", error);
      setStockError("Erro ao verificar estoque. Tente novamente.");
      return false;
    } finally {
      setStockLoading(false);
    }
  }

  useEffect(() => {
    if (!items.length) return;

    checkCartStock();
  }, [items.length]);

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
          carrier: selectedShipping.carrier || null,
          carrier_code: selectedShipping.carrier_code || null,
          price: shippingPrice,
          original_price: originalShippingPrice,
          deadline: selectedShipping.deadline,
          delivery_time: selectedShipping.delivery_time || null,
          allow_buy_label: selectedShipping.allow_buy_label || false,
          raw: selectedShipping.raw || null,
          free_shipping_applied: hasAutomaticFreeShipping,
        }
        : null,

      shippingPrice,
      originalShippingPrice,
      original_shipping_cents: originalShippingCents,
      free_shipping_applied: hasAutomaticFreeShipping,
      free_shipping_threshold: FREE_SHIPPING_THRESHOLD,
      couponCode: appliedCoupon?.code || null,
      coupon_id: appliedCoupon?.id || null,
      coupon: appliedCoupon,
      discount: discountValue,
      discount_cents: effectiveDiscountCents,
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

    if (appliedCoupon?.free_shipping) {
      setAppliedCoupon(null);
      setCouponSuccess(null);
      setCouponError("Reaplique o cupom após recalcular o frete.");
    }

    try {
      const totalWeight = Math.max(
        0.03,
        items.reduce((acc, item) => acc + 0.03 * Number(item.qty ?? 1), 0)
      );

      const payload = {
        to_postcode: cleanCep,
        insurance_value: Number(subtotal.toFixed(2)),

        // Caixa padrão Caléa
        weight: Number(totalWeight.toFixed(3)),
        height: 8,
        width: 12,
        length: 16,
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

  async function handleContinue() {
    if (!canContinue || stockLoading) return;

    const stockOk = await checkCartStock();

    if (!stockOk) return;

    saveCheckoutDraft();
    navigate("/checkout/identificacao");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcfaf6]">
      <Header />

      <main className="pb-16 pt-[112px] md:pt-[145px]">
        <section className="border-b border-[#e9e2d6] bg-[#fcfaf6]">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-5 inline-flex items-center gap-2 text-sm text-[#756d63] transition hover:text-[#2b554e]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#b08d57]">
                  Checkout
                </p>

                <h1 className="mt-2 text-[30px] font-light leading-tight tracking-[-0.04em] text-[#2b554e] sm:text-[40px]">
                  Revise sua sacola
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7a746c]">
                  Confira seus produtos, escolha a entrega e avance para a
                  identificação com segurança.
                </p>
              </div>


            </div>

            <div className="mt-8 overflow-x-auto pb-2">
              <div className="flex min-w-max items-center gap-4 sm:min-w-0 sm:justify-between">
                <Step label="Sacola" active Icon={ShoppingBag} />
                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />
                <Step label="Identificação" Icon={User} />
                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />
                <Step label="Pagamento" Icon={CreditCard} />
                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />
                <Step label="Confirmação" Icon={CheckCircle} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_390px] lg:items-start">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-[#eee5d8] bg-white p-4 shadow-[0_14px_40px_rgba(43,85,78,0.05)] sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#2b554e]">
                      Produtos
                    </h2>

                    <p className="mt-1 text-sm text-[#7a746c]">
                      Ajuste quantidades ou remova itens da sua sacola.
                    </p>
                  </div>

                  {items.length > 0 && (
                    <span className="rounded-full bg-[#f7f1e7] px-3 py-1 text-xs font-medium text-[#8a6a38]">
                      {itemCountLabel(count)}
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <EmptyCart onContinue={() => navigate("/")} />
                ) : (
                  <div className="divide-y divide-[#efe8dc]">
                    {items.map((item) => (
                      <CartItemRow
                        key={item.id}
                        item={item}
                        availableQty={
                          getCartSkuId(item) ? stockBySku[getCartSkuId(item) as string] : undefined
                        }
                        onRemove={() => remove(item.id)}
                        onDecrease={() =>
                          setQty(item.id, Math.max(1, (item.qty ?? 1) - 1))
                        }
                        onIncrease={async () => {
                          const skuId = getCartSkuId(item);

                          if (!skuId) {
                            setStockError("Não foi possível validar o estoque deste item.");
                            return;
                          }

                          const { data, error } = await supabase
                            .from("sku_availability")
                            .select("available_qty")
                            .eq("sku_id", skuId)
                            .maybeSingle();

                          if (error) {
                            console.error("Erro ao verificar estoque:", error);
                            setStockError("Erro ao verificar estoque.");
                            return;
                          }

                          const availableQty = Number(data?.available_qty || 0);
                          const nextQty = (item.qty ?? 1) + 1;

                          setStockBySku((prev) => ({
                            ...prev,
                            [skuId]: availableQty,
                          }));

                          if (nextQty > availableQty) {
                            setStockError(`Estoque insuficiente. Disponível: ${availableQty}.`);
                            return;
                          }

                          setQty(item.id, nextQty);
                        }}
                      />
                    ))}
                  </div>
                )}

                {items.length > 0 && <CuradoriaCalea items={items} />}

                {stockError && (
                  <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {stockError}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <GiftWrapCard
                  checked={giftWrap}
                  price={giftWrapPrice}
                  onChange={setGiftWrap}
                />
              )}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-[120px]">
              <CheckoutPanel
                cep={cep}
                setCep={setCep}
                shippingLoading={shippingLoading}
                shippingError={shippingError}
                shippingOptions={shippingOptions}
                selectedShipping={selectedShipping}
                setSelectedShipping={setSelectedShipping}
                handleCalcShipping={handleCalcShipping}
                itemsLength={items.length}
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                appliedCoupon={appliedCoupon}
                couponLoading={couponLoading}
                couponError={couponError}
                couponSuccess={couponSuccess}
                applyCoupon={applyCoupon}
                removeCoupon={removeCoupon}
                subtotal={subtotal}
                discountCents={effectiveDiscountCents}
                discountValue={discountValue}
                giftWrap={giftWrap}
                giftWrapPrice={giftWrapPrice}
                shippingPrice={shippingPrice}
                originalShippingPrice={originalShippingPrice}
                hasAutomaticFreeShipping={hasAutomaticFreeShipping}
                total={total}
                canContinue={canContinue}
                handleContinue={handleContinue}
                stockLoading={stockLoading}
                stockError={stockError}
                hasCouponFreeShipping={hasCouponFreeShipping}
              />
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function CuradoriaCalea({ items }: { items: any[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      if (!el || el.scrollWidth <= el.clientWidth) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      const isAtEnd = el.scrollLeft >= maxScroll - 16;

      if (isAtEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 280, behavior: "smooth" });
      }
    }, 3800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-7 rounded-[26px] border border-[#eadfce] bg-[#fcfaf6] p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#b08d57]">
            Curadoria Caléa
          </p>

          <h3 className="mt-1 text-base font-semibold text-[#2b554e]">
            Combine com sua escolha
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#7a746c]">
            Arraste para o lado e veja mais peças selecionadas.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#e1d6c7] bg-white px-3 py-1.5 text-xs font-medium text-[#2b554e] shadow-sm">
          ver mais
          <span className="text-base leading-none">›</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 overflow-x-auto px-4 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="min-w-max">
          <CombineWith items={items} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 sm:hidden">
        <span className="h-1.5 w-5 rounded-full bg-[#2b554e]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#d8c9b4]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#d8c9b4]" />
      </div>
    </div>
  );
}


function EmptyCart({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d8d1c6] bg-[#fcfaf6] px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#2b554e] shadow-sm">
        <ShoppingBag className="h-6 w-6" />
      </div>

      <p className="mt-5 text-base font-semibold text-[#2b554e]">
        Sua sacola está vazia.
      </p>

      <p className="mt-2 text-sm text-[#7a746c]">
        Escolha uma peça para continuar.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 rounded-full bg-[#2b554e] px-7 py-3 text-sm font-semibold text-white transition hover:brightness-95"
      >
        Continuar comprando
      </button>
    </div>
  );
}

function CartItemRow({
  item,
  availableQty,
  onRemove,
  onDecrease,
  onIncrease,
}: {
  item: any;
  availableQty?: number;
  onRemove: () => void;
  onDecrease: () => void;
  onIncrease: () => void | Promise<void>;
}) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-4 py-5 sm:grid-cols-[92px_1fr_auto] sm:items-center">
      <div className="h-[84px] w-[84px] overflow-hidden rounded-[22px] bg-[#f7f3ec] ring-1 ring-black/5 sm:h-[92px] sm:w-[92px]">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-[#2b554e] sm:text-base">
          {item.name}
        </h3>

        {item.variant ? (
          <p className="mt-1 text-sm text-[#8a8175]">{item.variant}</p>
        ) : null}

        {typeof availableQty === "number" && availableQty <= 0 && (
          <p className="mt-2 text-xs font-medium text-red-600">
            Produto indisponível no estoque.
          </p>
        )}

        {typeof availableQty === "number" &&
          availableQty > 0 &&
          (item.qty ?? 1) > availableQty && (
            <p className="mt-2 text-xs font-medium text-red-600">
              Estoque insuficiente. Disponível: {availableQty}.
            </p>
          )}

        <p className="mt-2 text-sm font-semibold text-[#b08d57] sm:hidden">
          {moneyBRL((item.price ?? 0) * (item.qty ?? 1))}
        </p>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end sm:gap-5">
        <div className="flex h-10 items-center rounded-full border border-[#d8d1c6] bg-white px-2">
          <button
            type="button"
            onClick={onDecrease}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#2b554e] transition hover:bg-[#f7f3ec]"
            aria-label="Diminuir quantidade"
          >
            <Minus className="h-4 w-4" />
          </button>

          <span className="w-8 text-center text-sm font-semibold text-[#2b554e]">
            {item.qty ?? 1}
          </span>

          <button
            type="button"
            onClick={onIncrease}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#2b554e] transition hover:bg-[#f7f3ec]"
            aria-label="Aumentar quantidade"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden min-w-[90px] text-right text-sm font-semibold text-[#2b554e] sm:block">
          {moneyBRL((item.price ?? 0) * (item.qty ?? 1))}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#a49b91] transition hover:bg-red-50 hover:text-red-600"
          aria-label="Remover item"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}

function GiftWrapCard({
  checked,
  price,
  onChange,
}: {
  checked: boolean;
  price: number;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-[0_14px_40px_rgba(43,85,78,0.04)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#efe6d7] text-[#b08d57]">
          <Gift className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#2b554e] sm:text-base">
                Embalagem para presente
              </p>

              <p className="mt-1 text-sm leading-5 text-[#7a746c]">
                Caixinha para sua Jóia + finalização especial.
              </p>
            </div>

            <p className="text-sm font-semibold text-[#2b554e]">
              {moneyBRL(price)}
            </p>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-[#fcfaf6] p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onChange(event.target.checked)}
              className="h-5 w-5 shrink-0"
              style={{ accentColor: CALEA.primary }}
            />

            <span className="text-sm font-medium text-[#5f5850]">
              Adicionar embalagem ao pedido
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function CheckoutPanel(props: any) {
  return (
    <div className="rounded-[28px] border border-[#eee5d8] bg-white p-4 shadow-[0_18px_50px_rgba(43,85,78,0.07)] sm:p-6">
      <DeliverySection {...props} />
      <Divider />
      <CouponSection {...props} />
      <Divider />
      <OrderSummary {...props} />

    </div>
  );
}

function DeliverySection({
  cep,
  setCep,
  shippingLoading,
  shippingError,
  shippingOptions,
  selectedShipping,
  setSelectedShipping,
  handleCalcShipping,
  itemsLength,
}: any) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f1e7] text-[#b08d57]">
          <MapPin className="h-4 w-4" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-[#2b554e]">
            Entrega <span className="text-red-500">*</span>
          </h3>
          <p className="text-xs text-[#8a8175]">Calcule prazo e frete.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
        <input
          value={cep}
          onChange={(event) => setCep(formatCEP(event.target.value))}
          placeholder="Digite seu CEP *"
          className={[
            "h-12 w-full rounded-full border bg-[#fcfaf6] px-4 text-sm outline-none transition",
            shippingError
              ? "border-red-300 focus:border-red-500"
              : "border-[#d8d1c6] focus:border-[#2b554e]",
          ].join(" ")}
          inputMode="numeric"
          maxLength={9}
          required
          aria-required="true"
        />
        <button
          onClick={handleCalcShipping}
          className="h-12 rounded-full bg-[#2b554e] px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={shippingLoading || itemsLength === 0}
          type="button"
        >
          {shippingLoading ? "..." : "Calcular"}
        </button>
      </div>

      {!cep && itemsLength > 0 && (
        <p className="mt-2 text-xs text-red-600">
          O CEP é obrigatório para calcular a entrega.
        </p>
      )}

      {shippingError && (
        <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {shippingError}
        </div>
      )}


      {shippingOptions.length > 0 && (
        <div className="mt-4 space-y-3">
          {shippingOptions.map((option: ShippingOption) => {
            const checked = selectedShipping?.id === option.id;

            return (
              <label
                key={option.id}
                className={[
                  "block cursor-pointer rounded-[22px] border p-4 transition",
                  checked
                    ? "border-[#2b554e] bg-[#f7f3ec]"
                    : "border-[#e5ddd1] bg-white hover:border-[#b08d57]",
                ].join(" ")}
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
                      <div className="flex items-center gap-1 font-semibold text-[#2b554e]">
                        <Truck className="h-3.5 w-3.5" />
                        {option.name}
                      </div>

                      <div className="mt-1 text-xs text-[#7a746c]">
                        {option.carrier ? `${option.carrier} • ` : ""}
                        {option.deadline || "Prazo indisponível"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-[#2b554e]">
                      {moneyBRL(option.price)}
                    </div>

                    {(() => {
                      const priceCents = Math.round(Number(option.price || 0) * 100);
                      const originalPriceCents = Math.round(Number(option.original_price || 0) * 100);

                      const hasDiscount =
                        originalPriceCents > 0 && originalPriceCents > priceCents;

                      return hasDiscount ? (
                        <div className="text-xs text-gray-400 line-through">
                          {moneyBRL(Number(option.original_price || 0))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CouponSection({
  couponCode,
  setCouponCode,
  appliedCoupon,
  couponLoading,
  couponError,
  couponSuccess,
  applyCoupon,
  removeCoupon,
  itemsLength,
}: any) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f1e7] text-[#b08d57]">
          <TicketPercent className="h-4 w-4" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-[#2b554e]">
            Cupom
          </h3>
          <p className="text-xs text-[#8a8175]">
            Aplique antes de continuar.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px]">
        <input
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          placeholder="Digite seu cupom"
          className="h-12 w-full rounded-full border border-[#d8d1c6] bg-[#fcfaf6] px-4 text-sm uppercase outline-none transition focus:border-[#2b554e]"
          disabled={couponLoading || Boolean(appliedCoupon)}
        />

        {appliedCoupon ? (
          <button
            onClick={removeCoupon}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#d8d1c6] px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            type="button"
          >
            <X className="h-4 w-4" />
            Remover
          </button>
        ) : (
          <button
            onClick={applyCoupon}
            disabled={couponLoading || itemsLength === 0}
            className="h-12 rounded-full bg-[#2b554e] px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
          >
            {couponLoading ? "..." : "Aplicar"}
          </button>
        )}
      </div>

      {couponError && (
        <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {couponError}
        </div>
      )}

      {couponSuccess && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {couponSuccess}
        </div>
      )}

      {appliedCoupon?.first_purchase_only && (
        <div className="mt-2 text-xs text-[#8a8175]">
          Este cupom será revalidado antes do pagamento.
        </div>
      )}
    </section>
  );
}

function OrderSummary({
  subtotal,
  discountCents,
  discountValue,
  appliedCoupon,
  giftWrap,
  giftWrapPrice,
  selectedShipping,
  shippingPrice,
  originalShippingPrice,
  hasAutomaticFreeShipping,
  total,
  canContinue,
  handleContinue,
  stockLoading,
  stockError,
  hasCouponFreeShipping,
}: any) {
  return (
    <section>
      <h3 className="text-base font-semibold text-[#2b554e]">
        Resumo do pedido
      </h3>

      <div className="mt-4 space-y-3 text-sm">
        <SummaryLine label="Subtotal" value={moneyBRL(subtotal)} />

        {discountCents > 0 && (
          <SummaryLine
            label={`Desconto ${appliedCoupon?.code ? `(${appliedCoupon.code})` : ""}`}
            value={`- ${moneyBRL(discountValue)}`}
            success
          />
        )}

        {giftWrap && (
          <SummaryLine label="Embalagem presente" value={moneyBRL(giftWrapPrice)} />
        )}

        {selectedShipping && (
          <SummaryLine
            label={`Frete (${selectedShipping.name})`}
            value={
              hasAutomaticFreeShipping || hasCouponFreeShipping
                ? `Grátis ${originalShippingPrice > 0 ? `(${moneyBRL(originalShippingPrice)})` : ""}`
                : moneyBRL(shippingPrice)
            }
            success={hasAutomaticFreeShipping || hasCouponFreeShipping}
          />
        )}
      </div>

      <div className="my-6 h-px bg-[#eee5d8]" />

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#8a8175]">Total</p>
          <p className="text-xs text-[#9a9187]">Impostos inclusos</p>
        </div>

        <span className="text-[28px] font-semibold tracking-[-0.04em] text-[#2b554e]">
          {moneyBRL(total)}
        </span>
      </div>

      <button
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-[#2b554e] py-4 text-sm font-semibold tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(43,85,78,0.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleContinue}
        type="button"
        disabled={!canContinue || stockLoading || Boolean(stockError)}
      >
        {stockLoading ? "Verificando estoque..." : "Continuar"}
      </button>

      {stockError && (
        <p className="mt-3 text-center text-xs text-red-600">
          Ajuste os itens sem estoque para continuar.
        </p>
      )}

      {!canContinue && (
        <p className="mt-3 text-center text-xs text-[#8a8175]">
          Selecione uma opção de entrega para continuar.
        </p >
      )}

      <div className="mt-4 rounded-2xl bg-[#fcfaf6] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2b554e]" />

          <p className="text-xs leading-5 text-[#7a746c]">
            Ambiente seguro. Seus dados são protegidos durante toda a compra.
          </p>
        </div>
      </div>
    </section>
  );
}

function SummaryLine({
  label,
  value,
  success,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#6f675e]">{label}</span>
      <span
        className={[
          "font-semibold",
          success ? "text-emerald-700" : "text-[#2b554e]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="my-6 h-px bg-[#eee5d8]" />;
}


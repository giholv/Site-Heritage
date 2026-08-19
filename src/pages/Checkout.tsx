// src/pages/Checkout.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
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
  LockKeyhole,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";
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

  // Autenticação é exigida apenas quando a cliente avança para identificação.
  // Assim ela pode revisar a sacola, calcular frete e aplicar cupom sem atrito.
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);


  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;
        setCurrentUser(session?.user ?? null);
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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
    if (!canContinue || stockLoading || authLoading) return;

    const stockOk = await checkCartStock();

    if (!stockOk) return;

    // Preserva frete, cupom, presente e totais.
    saveCheckoutDraft();

    // Não sai do checkout.
    if (!currentUser) {
      setShowAuthGate(true);
      return;
    }

    navigate("/checkout/identificacao");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcfaf6] text-[#2b554e]">
      <CheckoutHeader onBack={() => navigate("/")} />

      <main className="pb-24 lg:pb-16">
        <section className="mx-auto max-w-6xl px-4 pb-4 pt-7 sm:px-6 sm:pb-6 sm:pt-9">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#b08d57]">
                Checkout Caléa
              </p>

              <div className="mt-2 flex items-baseline gap-3">
                <h1 className="font-serif text-[34px] font-normal leading-none tracking-[-0.03em] text-[#2b554e] sm:text-[42px]">
                  Sua sacola
                </h1>

                {items.length > 0 && (
                  <span className="text-sm text-[#2b554e]/45">
                    {itemCountLabel(count)}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden text-right sm:block">
              <p className="font-serif text-lg italic text-[#b08d57]">
                Quase sua.
              </p>
              <p className="mt-1 text-xs text-[#2b554e]/45">
                Revise e siga para finalizar.
              </p>
            </div>
          </div>

          <CheckoutProgress />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:gap-7">
            <div className="space-y-4">
              <div className="border-y border-[#e8dfd3] bg-white pb-3 sm:rounded-[24px] sm:border sm:pb-0">
                {items.length === 0 ? (
                  <EmptyCart onContinue={() => navigate("/")} />
                ) : (
                  <div className="px-4 sm:px-6">
                    <div className="flex items-center justify-between border-b border-[#eee7dc] py-4">
                      <div>
                        <h2 className="text-base font-semibold text-[#2b554e]">
                          Suas escolhas
                        </h2>
                        <p className="mt-0.5 text-xs text-[#2b554e]/45">
                          Ajuste a quantidade se precisar.
                        </p>
                      </div>

                      <ShoppingBag className="h-5 w-5 text-[#b08d57]" />
                    </div>

                    <div className="divide-y divide-[#eee7dc]">
                      {items.map((item) => (
                        <CartItemRow
                          key={item.id}
                          item={item}
                          availableQty={
                            getCartSkuId(item)
                              ? stockBySku[getCartSkuId(item) as string]
                              : undefined
                          }
                          onRemove={() => remove(item.id)}
                          onDecrease={() =>
                            setQty(item.id, Math.max(1, (item.qty ?? 1) - 1))
                          }
                          onIncrease={async () => {
                            const skuId = getCartSkuId(item);

                            if (!skuId) {
                              setStockError(
                                "Não foi possível validar o estoque deste item."
                              );
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
                              setStockError(
                                `Estoque insuficiente. Disponível: ${availableQty}.`
                              );
                              return;
                            }

                            setStockError(null);
                            setQty(item.id, nextQty);
                          }}
                        />
                      ))}
                    </div>

                    {stockError && (
                      <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        {stockError}
                      </div>
                    )}
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

            <aside className="lg:sticky lg:top-24">
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
                authLoading={authLoading}
                isAuthenticated={Boolean(currentUser)}
                stockError={stockError}
                hasCouponFreeShipping={hasCouponFreeShipping}
              />
            </aside>
          </div>
        </section>
      </main>

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5ddd2] bg-[#fcfaf6]/96 px-4 py-3 shadow-[0_-12px_35px_rgba(43,85,78,0.06)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-[112px]">
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#2b554e]/40">
                Total
              </p>
              <p className="font-serif text-xl text-[#2b554e]">
                {moneyBRL(total)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={
                !canContinue || stockLoading || authLoading || Boolean(stockError)
              }
              className="flex h-12 flex-1 items-center justify-center gap-2 bg-[#2b554e] px-5 text-sm font-semibold text-white transition hover:bg-[#23463f] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {authLoading
                ? "Só um instante..."
                : stockLoading
                  ? "Verificando..."
                  : "Finalizar"}
              {!authLoading && !stockLoading && (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {showAuthGate && (
        <CheckoutAuthGate
          onClose={() => setShowAuthGate(false)}
          onAuthenticated={() => {
            setShowAuthGate(false);
            navigate("/checkout/identificacao");
          }}
        />
      )}
    </div>
  );
}

function CheckoutHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e8dfd3] bg-[#fcfaf6]/95 backdrop-blur">
      <div className="mx-auto grid h-[68px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-[76px] sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 justify-self-start text-xs font-medium text-[#2b554e]/55 transition hover:text-[#2b554e]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar à loja</span>
        </button>

        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="justify-self-center text-center"
          aria-label="Ir para a loja Caléa"
        >
          <span className="block font-serif text-[20px] tracking-[0.11em] text-[#2b554e] sm:text-[22px]">
            CALÉA
          </span>
          <span className="mt-[-2px] block text-[7px] font-medium uppercase tracking-[0.38em] text-[#b08d57]">
            Blanc
          </span>
        </button>

        <div className="inline-flex items-center gap-2 justify-self-end text-[10px] font-medium uppercase tracking-[0.12em] text-[#2b554e]/45">
          <LockKeyhole className="h-3.5 w-3.5 text-[#2b554e]" />
          <span className="hidden sm:inline">Compra segura</span>
        </div>
      </div>
    </header>
  );
}

function CheckoutProgress() {
  return (
    <div className="mt-7">
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className="text-[#2b554e]">
          Carrinho
        </span>

        <span className="text-[#2b554e]/35">
          1 de 4
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#e4dbcf]" />
        <div className="h-[3px] bg-[#e4dbcf]" />
        <div className="h-[3px] bg-[#e4dbcf]" />
      </div>
    </div>
  );
}

function CheckoutAuthGate({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Informe seu e-mail e senha.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Não foi possível acessar sua conta.");
      }

      onAuthenticated();
    } catch (error: any) {
      console.error("Erro no login do checkout:", error);

      if (
        error?.message?.toLowerCase().includes("invalid login credentials")
      ) {
        setError("E-mail ou senha incorretos.");
      } else {
        setError(error?.message || "Não foi possível entrar.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();

    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    if (password.length < 6) {
      setError("Sua senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      /*
       * Quando o Supabase cria sessão imediatamente,
       * podemos continuar a compra sem sair do checkout.
       */
      if (data.session && data.user) {
        onAuthenticated();
        return;
      }

      /*
       * Caso confirmação de e-mail esteja habilitada
       * no Supabase.
       */
      setMessage(
        "Conta criada. Confirme seu e-mail para continuar sua compra."
      );
    } catch (error: any) {
      console.error("Erro no cadastro do checkout:", error);

      const message = String(error?.message || "").toLowerCase();

      if (
        message.includes("already registered") ||
        message.includes("already been registered") ||
        message.includes("user already")
      ) {
        setError("Este e-mail já possui uma conta. Entre com sua senha.");
        setMode("login");
      } else {
        setError(error?.message || "Não foi possível criar sua conta.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 backdrop-blur-[2px] sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 w-full bg-[#FCFAF6] px-5 pb-7 pt-5 shadow-2xl sm:max-w-[470px] sm:px-8 sm:pb-8 sm:pt-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#b08d57]">
              Checkout Caléa
            </p>

            <h2 className="mt-3 font-serif text-[30px] font-normal leading-none text-[#2b554e]">
              Entre para finalizar
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#2b554e]/60">
              Para seguir com entrega e pagamento, entre na sua conta ou crie uma agora. Sua sacola continua salva.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-[#2b554e]/55 transition hover:bg-[#2b554e]/5 hover:text-[#2b554e]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-7 grid grid-cols-2 border-b border-[#2b554e]/10">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setMessage(null);
            }}
            className={[
              "border-b-2 px-3 pb-3 text-sm font-medium transition",
              mode === "login"
                ? "border-[#2b554e] text-[#2b554e]"
                : "border-transparent text-[#2b554e]/45",
            ].join(" ")}
          >
            Já tenho conta
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
              setMessage(null);
            }}
            className={[
              "border-b-2 px-3 pb-3 text-sm font-medium transition",
              mode === "register"
                ? "border-[#2b554e] text-[#2b554e]"
                : "border-transparent text-[#2b554e]/45",
            ].join(" ")}
          >
            Criar conta
          </button>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="checkout-auth-email"
              className="text-xs font-medium text-[#2b554e]/70"
            >
              E-mail
            </label>

            <input
              id="checkout-auth-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              className="mt-2 h-12 w-full border border-[#2b554e]/15 bg-white px-4 text-sm text-[#2b554e] outline-none transition focus:border-[#2b554e]"
            />
          </div>

          <div>
            <label
              htmlFor="checkout-auth-password"
              className="text-xs font-medium text-[#2b554e]/70"
            >
              Senha
            </label>

            <input
              id="checkout-auth-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                mode === "login" ? "Sua senha" : "Crie uma senha"
              }
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="mt-2 h-12 w-full border border-[#2b554e]/15 bg-white px-4 text-sm text-[#2b554e] outline-none transition focus:border-[#2b554e]"
            />
          </div>

          {mode === "register" && (
            <div>
              <label
                htmlFor="checkout-auth-confirm-password"
                className="text-xs font-medium text-[#2b554e]/70"
              >
                Confirme sua senha
              </label>

              <input
                id="checkout-auth-confirm-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Digite novamente"
                autoComplete="new-password"
                className="mt-2 h-12 w-full border border-[#2b554e]/15 bg-white px-4 text-sm text-[#2b554e] outline-none transition focus:border-[#2b554e]"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-[#f4efe6] px-4 py-3 text-sm leading-6 text-[#2b554e]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-13 w-full items-center justify-center bg-[#2b554e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#23463f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Só um instante..."
              : mode === "login"
                ? "Entrar e continuar"
                : "Criar conta e continuar"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              /*
               * Podemos transformar recuperação de senha em modal
               * depois também.
               */
              window.location.href = "/esqueci-senha";
            }}
            className="mt-4 w-full text-center text-xs text-[#2b554e]/55 underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </button>
        )}

        <div className="mt-6 flex items-start gap-2 border-t border-[#2b554e]/10 pt-5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2b554e]" />

          <p className="text-[11px] leading-5 text-[#2b554e]/50">
            Sua conta permite acompanhar pedidos, entregas e manter suas
            preferências Caléa em um só lugar.
          </p>
        </div>
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
    <label className="flex cursor-pointer items-center gap-4 border-y border-[#e8dfd3] bg-white px-4 py-4 transition hover:bg-[#fffdf9] sm:rounded-[20px] sm:border sm:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f4eee4] text-[#b08d57]">
        <Gift className="h-4.5 w-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#2b554e]">
              É para presente?
            </p>
            <p className="mt-0.5 text-xs text-[#2b554e]/45">
              Adicione nossa embalagem especial.
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold text-[#b08d57]">
              + {moneyBRL(price)}
            </p>

            <input
              id="checkout-gift-wrap"
              name="giftWrap"
              type="checkbox"
              checked={checked}
              onChange={(event) => onChange(event.target.checked)}
              className="mt-2 h-4 w-4"
              style={{ accentColor: CALEA.primary }}
              aria-label="Adicionar embalagem para presente"
            />
          </div>
        </div>
      </div>
    </label>
  );
}

function CheckoutPanel(props: any) {
  return (
    <div className="border-y border-[#e8dfd3] bg-white sm:rounded-[24px] sm:border">
      <div className="px-4 pb-1 pt-5 sm:px-6 sm:pt-6">
        <p className="font-serif text-[26px] italic leading-none text-[#2b554e]">
          Quase sua.
        </p>
        <p className="mt-2 text-xs leading-5 text-[#2b554e]/45">
          Escolha a entrega e confira o total antes de seguir.
        </p>
      </div>

      <div className="px-4 sm:px-6">
        <Divider />
        <DeliverySection {...props} />
        <Divider />
        <CouponSection {...props} />
        <Divider />
        <OrderSummary {...props} />
      </div>
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
          id="checkout-cep"
          name="postalCode"
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
                  "block cursor-pointer border px-3.5 py-3 transition",
                  checked
                    ? "border-[#2b554e] bg-[#f8f5ef]"
                    : "border-[#e5ddd1] bg-white hover:border-[#b08d57]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      id={`shipping-${option.id}`}
                      type="radio"
                      name="shipping"
                      checked={checked}
                      onChange={() => setSelectedShipping(option)}
                      className="mt-1 h-4 w-4 shrink-0"
                      style={{ accentColor: CALEA.primary }}
                      aria-label={`Selecionar frete ${option.name}`}
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
  const [open, setOpen] = useState(Boolean(appliedCoupon));

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value: boolean) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f1e7] text-[#b08d57]">
            <TicketPercent className="h-4 w-4" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#2b554e]">
              Tem um cupom?
            </h3>
            <p className="text-xs text-[#8a8175]">Opcional</p>
          </div>
        </div>

        <span className="text-lg leading-none text-[#2b554e]/60">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_104px]">
            <input
              id="checkout-coupon"
              name="coupon"
              value={couponCode}
              onChange={(event) =>
                setCouponCode(event.target.value.toUpperCase())
              }
              placeholder="Digite seu cupom"
              className="h-11 w-full rounded-full border border-[#d8d1c6] bg-[#fcfaf6] px-4 text-sm uppercase outline-none transition focus:border-[#2b554e]"
              disabled={couponLoading || Boolean(appliedCoupon)}
            />

            {appliedCoupon ? (
              <button
                onClick={removeCoupon}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#d8d1c6] px-4 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                type="button"
              >
                <X className="h-4 w-4" />
                Remover
              </button>
            ) : (
              <button
                onClick={applyCoupon}
                disabled={couponLoading || itemsLength === 0}
                className="h-11 rounded-full bg-[#2b554e] px-4 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                {couponLoading ? "..." : "Aplicar"}
              </button>
            )}
          </div>

          {couponError && (
            <p className="mt-2 text-xs text-red-600">{couponError}</p>
          )}

          {couponSuccess && (
            <p className="mt-2 text-xs text-emerald-700">{couponSuccess}</p>
          )}

          {appliedCoupon?.first_purchase_only && (
            <p className="mt-2 text-xs text-[#8a8175]">
              Este cupom será revalidado antes do pagamento.
            </p>
          )}
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
  authLoading,
  isAuthenticated,
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

      <div className="mb-2 mt-4 h-px bg-[#eee5d8] lg:my-6" />

      <div className="hidden items-end justify-between gap-4 lg:flex">
        <div>
          <p className="text-sm text-[#8a8175]">Total</p>
          <p className="text-xs text-[#9a9187]">Impostos inclusos</p>
        </div>

        <span className="text-[28px] font-semibold tracking-[-0.04em] text-[#2b554e]">
          {moneyBRL(total)}
        </span>
      </div>

      <button
        className="mt-6 hidden w-full items-center justify-center gap-3 rounded-full bg-[#2b554e] py-4 text-sm font-semibold tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(43,85,78,0.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
        onClick={handleContinue}
        type="button"
        disabled={
          !canContinue || stockLoading || authLoading || Boolean(stockError)
        }
      >
        {authLoading
          ? "Verificando acesso..."
          : stockLoading
            ? "Verificando estoque..."
            : "Continuar para finalizar"}
      </button>

      {!isAuthenticated && !authLoading && (
        <p className="mt-3 hidden text-center text-[11px] leading-4 text-[#8a8175] lg:block">
          Para finalizar, é necessário entrar ou criar sua conta.
        </p>
      )}

      {stockError && (
        <p className="mt-3 hidden text-center text-xs text-red-600 lg:block">
          Ajuste os itens sem estoque para continuar.
        </p>
      )}

      {!canContinue && (
        <p className="mt-3 hidden text-center text-xs text-[#8a8175] lg:block">
          Selecione uma opção de entrega para continuar.
        </p >
      )}

      <div className="py-3">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#2b554e]" />
          <p className="text-[10px] leading-none text-[#2b554e]/45">
            Pagamento seguro · seus dados protegidos
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
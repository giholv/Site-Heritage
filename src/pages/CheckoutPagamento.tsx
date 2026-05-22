// src/pages/CheckoutPagamento.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  CreditCard,
  Landmark,
  ShieldCheck,
  ShoppingBag,
  User,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabase";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#fcfaf6",
  line: "#e9e2d6",
};

type PaymentMethod = "pix" | "boleto" | "credit_card";

type CardForm = {
  number: string;
  holderName: string;
  expiry: string;
  cvv: string;
  installments: string;
};

type PaymentSettings = {
  max_installments: number;
  interest_free_installments: number;
  monthly_interest_rate: number;
  min_installment_cents: number;
  pix_enabled: boolean;
  boleto_enabled: boolean;
  credit_card_enabled: boolean;
};

type InstallmentOption = {
  installments: number;
  installmentAmountCents: number;
  totalAmountCents: number;
  interestCents: number;
  interestRate: number;
  hasInterest: boolean;
  label: string;
};

const fallbackPaymentSettings: PaymentSettings = {
  max_installments: 6,
  interest_free_installments: 3,
  monthly_interest_rate: 2.99,
  min_installment_cents: 5000,
  pix_enabled: true,
  boleto_enabled: true,
  credit_card_enabled: true,
};

const initialCardForm: CardForm = {
  number: "",
  holderName: "",
  expiry: "",
  cvv: "",
  installments: "1",
};

function moneyBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  const digits = onlyDigits(value).slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);

  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function parseExpiry(value: string) {
  const digits = onlyDigits(value);

  const expMonth = Number(digits.slice(0, 2));
  const yearDigits = digits.slice(2, 4);
  const expYear = yearDigits ? Number(`20${yearDigits}`) : 0;

  return {
    expMonth,
    expYear,
  };
}

function detectCardBrand(value: string) {
  const number = onlyDigits(value);

  if (/^4/.test(number)) return "Visa";

  if (
    /^(5[1-5])/.test(number) ||
    /^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(number)
  ) {
    return "Mastercard";
  }

  if (/^(34|37)/.test(number)) return "Amex";

  if (
    /^(4011|4312|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363)/.test(
      number
    )
  ) {
    return "Elo";
  }

  if (/^(606282|3841)/.test(number)) return "Hipercard";
  if (/^(30[0-5]|36|38)/.test(number)) return "Diners Club";
  if (/^35/.test(number)) return "JCB";
  if (/^(6011|65|64[4-9])/.test(number)) return "Discover";

  return "";
}

function maskCardPreview(value: string) {
  return formatCardNumber(value) || "0000 0000 0000 0000";
}

function calculateInstallments(
  totalCents: number,
  settings: PaymentSettings
): InstallmentOption[] {
  const options: InstallmentOption[] = [];

  const maxInstallments = Math.max(Number(settings.max_installments || 1), 1);
  const interestFree = Math.max(
    Number(settings.interest_free_installments || 1),
    1
  );
  const minInstallmentCents = Math.max(
    Number(settings.min_installment_cents || 1),
    1
  );
  const monthlyRate = Number(settings.monthly_interest_rate || 0);

  for (let i = 1; i <= maxInstallments; i++) {
    const isInterestFree = i <= interestFree;

    let totalAmountCents = totalCents;

    if (!isInterestFree && monthlyRate > 0) {
      const rate = monthlyRate / 100;
      totalAmountCents = Math.round(totalCents * Math.pow(1 + rate, i));
    }

    const installmentAmountCents = Math.round(totalAmountCents / i);

    if (installmentAmountCents < minInstallmentCents) {
      continue;
    }

    const interestCents = Math.max(totalAmountCents - totalCents, 0);

    options.push({
      installments: i,
      installmentAmountCents,
      totalAmountCents,
      interestCents,
      interestRate: isInterestFree ? 0 : monthlyRate,
      hasInterest: !isInterestFree && interestCents > 0,
      label: `${i}x de ${moneyBRL(installmentAmountCents / 100)} ${isInterestFree || interestCents === 0 ? "sem juros" : "com juros"
        }`,
    });
  }

  if (options.length) return options;

  return [
    {
      installments: 1,
      installmentAmountCents: totalCents,
      totalAmountCents: totalCents,
      interestCents: 0,
      interestRate: 0,
      hasInterest: false,
      label: `1x de ${moneyBRL(totalCents / 100)} sem juros`,
    },
  ];
}

function getCheckoutCouponCode(checkoutDraft: any) {
  return (
    checkoutDraft?.couponCode ||
    checkoutDraft?.coupon_code ||
    checkoutDraft?.coupon?.code ||
    checkoutDraft?.coupon?.couponCode ||
    null
  );
}

function getCheckoutDiscountCents(checkoutDraft: any) {
  if (typeof checkoutDraft?.discount_cents === "number") {
    return checkoutDraft.discount_cents;
  }

  if (typeof checkoutDraft?.discountCents === "number") {
    return checkoutDraft.discountCents;
  }

  if (typeof checkoutDraft?.coupon?.discount_cents === "number") {
    return checkoutDraft.coupon.discount_cents;
  }

  if (typeof checkoutDraft?.coupon?.discountCents === "number") {
    return checkoutDraft.coupon.discountCents;
  }

  const discountReais =
    checkoutDraft?.discount ||
    checkoutDraft?.discountValue ||
    checkoutDraft?.coupon?.discount ||
    0;

  return Math.round(Number(discountReais || 0) * 100);
}

async function validateFirstPurchaseCoupon(params: {
  couponCode?: string | null;
  customerId?: string | null;
  email?: string | null;
}) {
  const couponCode = params.couponCode?.trim().toUpperCase();

  if (!couponCode) {
    return {
      valid: true,
      message: "",
      coupon: null,
    };
  }

  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select(
      `
      id,
      code,
      active,
      starts_at,
      ends_at,
      first_purchase_only
    `
    )
    .eq("code", couponCode)
    .maybeSingle();

  if (couponError) {
    throw couponError;
  }

  if (!coupon) {
    return {
      valid: false,
      message: "Cupom não encontrado.",
      coupon: null,
    };
  }

  if (!coupon.active) {
    return {
      valid: false,
      message: "Este cupom está inativo.",
      coupon,
    };
  }

  const now = new Date();

  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return {
      valid: false,
      message: "Este cupom ainda não está disponível.",
      coupon,
    };
  }

  if (coupon.ends_at && new Date(coupon.ends_at) < now) {
    return {
      valid: false,
      message: "Este cupom está expirado.",
      coupon,
    };
  }

  if (!coupon.first_purchase_only) {
    return {
      valid: true,
      message: "",
      coupon,
    };
  }

  let resolvedCustomerId = params.customerId || null;

  if (!resolvedCustomerId && params.email) {
    const { data: customerByEmail, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", params.email)
      .maybeSingle();

    if (customerError) {
      throw customerError;
    }

    resolvedCustomerId = customerByEmail?.id || null;
  }

  let totalPreviousOrders = 0;

  if (resolvedCustomerId) {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", resolvedCustomerId)
      .in("status", ["paid", "processing", "shipped", "delivered"]);

    if (error) {
      throw error;
    }

    totalPreviousOrders += count || 0;
  }

  if (params.email) {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("external_customer_email", params.email)
      .in("status", ["paid", "processing", "shipped", "delivered"]);

    if (error) {
      throw error;
    }

    totalPreviousOrders += count || 0;
  }

  if (totalPreviousOrders > 0) {
    return {
      valid: false,
      message: "Este cupom é válido apenas para a primeira compra.",
      coupon,
    };
  }

  return {
    valid: true,
    message: "",
    coupon,
  };
}

async function createPagarmeCardToken(card: CardForm) {
  const publicKey = import.meta.env.VITE_PAGARME_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("VITE_PAGARME_PUBLIC_KEY não configurada no .env");
  }

  const number = onlyDigits(card.number);
  const { expMonth, expYear } = parseExpiry(card.expiry);
  const cvv = onlyDigits(card.cvv);

  if (number.length < 13) {
    throw new Error("Número do cartão inválido.");
  }

  if (!card.holderName.trim()) {
    throw new Error("Informe o nome impresso no cartão.");
  }

  if (!expMonth || expMonth < 1 || expMonth > 12) {
    throw new Error("Validade inválida.");
  }

  if (!expYear || expYear < new Date().getFullYear()) {
    throw new Error("Validade inválida.");
  }

  if (cvv.length < 3) {
    throw new Error("CVV inválido.");
  }

  const res = await fetch(
    `https://api.pagar.me/core/v5/tokens?appId=${publicKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "card",
        card: {
          number,
          holder_name: card.holderName.trim(),
          exp_month: expMonth,
          exp_year: expYear,
          cvv,
        },
      }),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.id) {
    console.error("Erro ao tokenizar cartão:", data);
    throw new Error(
      data?.message || "Não foi possível validar os dados do cartão."
    );
  }

  return data.id as string;
}

function Step({
  label,
  active,
  Icon,
  onClick,
}: {
  label: string;
  active?: boolean;
  Icon: React.ElementType;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        "flex shrink-0 flex-col items-center gap-2",
        clickable ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      aria-current={active ? "step" : undefined}
      title={clickable ? `Ir para ${label}` : label}
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
        style={{
          backgroundColor: active ? CALEA.primary : "white",
          borderColor: active ? CALEA.primary : "#d8d1c6",
          color: active ? "white" : clickable ? "#8f897f" : "#b3aca2",
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
    </button>
  );
}

function buildPagarmeItemsWithDiscount(params: {
  items: any[];
  discountCents: number;
}) {
  const { items, discountCents } = params;

  const baseItems = items.map((item: any) => {
    const quantity = Number(item.qty || item.quantity || 1);
    const unitAmountCents = Math.round(Number(item.price || 0) * 100);
    const totalAmountCents = unitAmountCents * quantity;

    return {
      originalItem: item,
      quantity,
      unitAmountCents,
      totalAmountCents,
    };
  });

  const itemsSubtotalCents = baseItems.reduce(
    (acc, item) => acc + item.totalAmountCents,
    0
  );

  if (!discountCents || discountCents <= 0 || itemsSubtotalCents <= 0) {
    return baseItems.map((item) => ({
      code: String(
        item.originalItem.id ||
        item.originalItem.sku_id ||
        item.originalItem.slug ||
        item.originalItem.name
      ),
      description: item.originalItem.name,
      amount: item.unitAmountCents,
      quantity: item.quantity,
    }));
  }

  let remainingDiscount = Math.min(discountCents, itemsSubtotalCents);

  return baseItems.map((item, index) => {
    const isLast = index === baseItems.length - 1;

    const itemDiscount = isLast
      ? remainingDiscount
      : Math.round((item.totalAmountCents / itemsSubtotalCents) * discountCents);

    const safeItemDiscount = Math.min(itemDiscount, remainingDiscount);
    remainingDiscount -= safeItemDiscount;

    const discountedTotal = Math.max(item.totalAmountCents - safeItemDiscount, 1);
    const discountedUnitAmount = Math.max(
      Math.round(discountedTotal / item.quantity),
      1
    );

    return {
      code: String(
        item.originalItem.id ||
        item.originalItem.sku_id ||
        item.originalItem.slug ||
        item.originalItem.name
      ),
      description:
        discountCents > 0
          ? `${item.originalItem.name} - cupom aplicado`
          : item.originalItem.name,
      amount: discountedUnitAmount,
      quantity: item.quantity,
    };
  });
}

export default function CheckoutPagamento() {
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cardForm, setCardForm] = useState<CardForm>(initialCardForm);
  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings>(fallbackPaymentSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutDraft = useMemo(() => {
    const raw = sessionStorage.getItem("calea_checkout");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const identification = useMemo(() => {
    const raw = sessionStorage.getItem("calea_checkout_identificacao");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const isCard = paymentMethod === "credit_card";

  const cardBrand = useMemo(
    () => detectCardBrand(cardForm.number),
    [cardForm.number]
  );

  const totalCents = useMemo(() => {
    return Math.round(Number(checkoutDraft?.total || 0) * 100);
  }, [checkoutDraft?.total]);

  const couponCode = useMemo(() => {
    return getCheckoutCouponCode(checkoutDraft);
  }, [checkoutDraft]);

  const discountCents = useMemo(() => {
    return getCheckoutDiscountCents(checkoutDraft);
  }, [checkoutDraft]);

  const installmentOptions = useMemo(() => {
    return calculateInstallments(totalCents, paymentSettings);
  }, [paymentSettings, totalCents]);

  const selectedInstallment = useMemo(() => {
    return (
      installmentOptions.find(
        (option) => option.installments === Number(cardForm.installments)
      ) || installmentOptions[0]
    );
  }, [installmentOptions, cardForm.installments]);

  function updateCardField<K extends keyof CardForm>(
    key: K,
    value: CardForm[K]
  ) {
    setCardForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function getFriendlyError(message: string) {
    if (message.includes("Authorization has been denied")) {
      return "Pagamento indisponível no momento. A integração com a Pagar.me ainda precisa ser liberada.";
    }

    if (message.includes("Failed to fetch")) {
      return "Não foi possível conectar ao serviço de pagamento. Tente novamente.";
    }

    return message || "Erro ao processar pagamento.";
  }

  useEffect(() => {
    async function loadPaymentSettings() {
      setLoadingSettings(true);

      const { data, error } = await supabase
        .from("payment_settings")
        .select(
          "max_installments, interest_free_installments, monthly_interest_rate, min_installment_cents, pix_enabled, boleto_enabled, credit_card_enabled"
        )
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar configurações de pagamento:", error);
        setPaymentSettings(fallbackPaymentSettings);
        setLoadingSettings(false);
        return;
      }

      if (data) {
        setPaymentSettings({
          max_installments: Number(data.max_installments || 1),
          interest_free_installments: Number(
            data.interest_free_installments || 1
          ),
          monthly_interest_rate: Number(data.monthly_interest_rate || 0),
          min_installment_cents: Number(data.min_installment_cents || 1),
          pix_enabled: Boolean(data.pix_enabled),
          boleto_enabled: Boolean(data.boleto_enabled),
          credit_card_enabled: Boolean(data.credit_card_enabled),
        });
      }

      setLoadingSettings(false);
    }

    loadPaymentSettings();
  }, []);

  useEffect(() => {
    if (!installmentOptions.length) return;

    const exists = installmentOptions.some(
      (option) => option.installments === Number(cardForm.installments)
    );

    if (!exists) {
      updateCardField("installments", String(installmentOptions[0].installments));
    }
  }, [installmentOptions]);

  useEffect(() => {
    if (paymentMethod === "pix" && !paymentSettings.pix_enabled) {
      if (paymentSettings.credit_card_enabled) setPaymentMethod("credit_card");
      else if (paymentSettings.boleto_enabled) setPaymentMethod("boleto");
      else setPaymentMethod("pix");
    }

    if (paymentMethod === "boleto" && !paymentSettings.boleto_enabled) {
      if (paymentSettings.pix_enabled) setPaymentMethod("pix");
      else if (paymentSettings.credit_card_enabled)
        setPaymentMethod("credit_card");
      else setPaymentMethod("pix");
    }

    if (
      paymentMethod === "credit_card" &&
      !paymentSettings.credit_card_enabled
    ) {
      if (paymentSettings.pix_enabled) setPaymentMethod("pix");
      else if (paymentSettings.boleto_enabled) setPaymentMethod("boleto");
      else setPaymentMethod("pix");
    }
  }, [paymentSettings, paymentMethod]);

  async function handleCreateOrder() {
    setError(null);

    if (!checkoutDraft?.items?.length) {
      setError("Carrinho vazio.");
      return;
    }

    if (!checkoutDraft?.shipping) {
      setError("Selecione o frete.");
      return;
    }

    if (!identification?.name || !identification?.email) {
      setError("Dados de identificação incompletos.");
      return;
    }

    if (paymentMethod === "pix" && !paymentSettings.pix_enabled) {
      setError("Pix indisponível no momento.");
      return;
    }

    if (paymentMethod === "boleto" && !paymentSettings.boleto_enabled) {
      setError("Boleto indisponível no momento.");
      return;
    }

    if (
      paymentMethod === "credit_card" &&
      !paymentSettings.credit_card_enabled
    ) {
      setError("Cartão de crédito indisponível no momento.");
      return;
    }

    setLoading(true);

    try {
      const customerId =
        identification?.customer_id ||
        identification?.customerId ||
        sessionStorage.getItem("calea_customer_id");

      const couponValidation = await validateFirstPurchaseCoupon({
        couponCode,
        customerId,
        email: identification?.email,
      });

      if (!couponValidation.valid) {
        setError(couponValidation.message);
        setLoading(false);
        return;
      }

      const orderId =
        sessionStorage.getItem("calea_order_id") || `PED-${Date.now()}`;

      const address = {
        line1: `${identification.street || ""}, ${identification.number || ""
          }`.trim(),
        line2: identification.complement || undefined,
        zipCode: identification.zipCode || identification.cep,
        city: identification.city,
        state: identification.state,
        country: "BR",
      };

      const paymentTotalCents =
        paymentMethod === "credit_card"
          ? selectedInstallment?.totalAmountCents || totalCents
          : totalCents;

      const isFreeShippingCoupon =
        checkoutDraft?.coupon?.discount_type === "free_shipping";


      const itemDiscountCents = isFreeShippingCoupon ? 0 : discountCents;




      const pagarmeItems = buildPagarmeItemsWithDiscount({
        items: checkoutDraft.items,
        discountCents: itemDiscountCents,
      });

      const shippingAmountCents = isFreeShippingCoupon
        ? 0
        : Math.round(Number(checkoutDraft.shippingPrice || 0) * 100);


      const localOrderItems = checkoutDraft.items.map((item: any) => {
        const skuId = item.sku_id || item.skuId || item.id;

        if (!skuId) {
          throw new Error(`Produto ${item.name} sem SKU. Não é possível finalizar.`);
        }

        const quantity = Number(item.qty || item.quantity || 1);
        const unitPriceCents = Math.round(Number(item.price || 0) * 100);

        return {
          sku_id: skuId,
          quantity,
          unit_price_cents: unitPriceCents,
          line_total_cents: unitPriceCents * quantity,
        };
      });



      const payload: any = {
        orderId,
        paymentMethod,

        customer: {
          name: identification.name,
          email: identification.email,
          document: identification.document,
          phone: identification.phone,
          address,
        },

        // itens para Pagar.me
        items: pagarmeItems,

        // itens reais para salvar em order_items
        orderItems: localOrderItems,

        shipping: {
          amount: shippingAmountCents,
          description: isFreeShippingCoupon
            ? `${checkoutDraft.shipping.name || "Frete"} - cupom frete grátis`
            : checkoutDraft.shipping.name || "Frete",
          recipientName: identification.name,
          recipientPhone: identification.phone,
          address,
        },

        metadata: {
          source: "calea-web",
          local_order_id: orderId,
          order_number: identification?.order_number || null,
          original_subtotal_cents: Math.round(Number(checkoutDraft?.subtotal || 0) * 100),
          original_shipping_cents: Math.round(Number(checkoutDraft.shippingPrice || 0) * 100),
          pagarme_shipping_cents: shippingAmountCents,
          original_total_cents: totalCents,
          payment_total_cents: paymentTotalCents,
          coupon_code: couponCode,
          coupon_type: checkoutDraft?.coupon?.discount_type || null,
          discount_cents: discountCents,
          discount_applied_to_items: itemDiscountCents > 0,
          free_shipping_applied: isFreeShippingCoupon,
          pix_expires_at:
            paymentMethod === "pix"
              ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
              : null,
        },
      };
      
      if (paymentMethod === "pix") {
        payload.pix = {
          expiresIn: 600,
        };
      }

      if (paymentMethod === "boleto") {
        payload.boleto = {
          instructions: "Pagar até o vencimento",
        };
      }

      if (paymentMethod === "credit_card") {
        const cardToken = await createPagarmeCardToken(cardForm);

        payload.creditCard = {
          cardToken,
          installments:
            selectedInstallment?.installments ||
            Number(cardForm.installments || 1),
          statementDescriptor: "CALEA",
          operationType: "auth_and_capture",
        };

        payload.metadata = {
          ...payload.metadata,
          installments: selectedInstallment?.installments || 1,
          installment_amount_cents:
            selectedInstallment?.installmentAmountCents || totalCents,
          interest_rate: selectedInstallment?.interestRate || 0,
          interest_cents: selectedInstallment?.interestCents || 0,
          payment_total_cents:
            selectedInstallment?.totalAmountCents || totalCents,
        };
      }

      const res = await fetch("/.netlify/functions/pagarme-create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("Erro Pagar.me:", data);
        throw new Error(
          data?.details?.message ||
          data?.error ||
          "Erro ao criar pedido na Pagar.me"
        );
      }

      sessionStorage.setItem("calea_payment_response", JSON.stringify(data));
      navigate("/checkout/confirmacao");
    } catch (e: any) {
      setError(getFriendlyError(e?.message || ""));
    } finally {
      setLoading(false);
    }
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
                Escolha o pagamento
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Confirme o resumo e selecione a forma de pagamento.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl">
              <div className="flex items-center gap-6 overflow-x-auto px-2 pb-2 [-webkit-overflow-scrolling:touch] sm:justify-between sm:overflow-visible sm:px-0">
                <Step
                  label="Sacola"
                  Icon={ShoppingBag}
                  onClick={() => navigate("/checkout")}
                />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step
                  label="Identificação"
                  Icon={User}
                  onClick={() => navigate("/checkout/identificacao")}
                />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Pagamento" active Icon={CreditCard} />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Confirmação" Icon={CheckCircle} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Pagamento
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Escolha como deseja concluir seu pedido.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/checkout/identificacao")}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 transition hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                </div>

                {loadingSettings && (
                  <p className="mb-4 rounded-2xl bg-[#fcfaf6] px-4 py-3 text-sm text-gray-500">
                    Carregando configurações de pagamento...
                  </p>
                )}

                {couponCode && (
                  <div className="mb-5 rounded-2xl border border-[#e7dccb] bg-[#fcfaf6] px-4 py-3 text-sm">
                    <span className="text-gray-500">Cupom aplicado: </span>
                    <span
                      className="font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      {couponCode}
                    </span>

                    {discountCents > 0 && (
                      <span className="ml-2 text-gray-500">
                        desconto de {moneyBRL(discountCents / 100)}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {paymentSettings.pix_enabled && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4 transition hover:bg-[#fcfaf6]">
                      <input
                        type="radio"
                        checked={paymentMethod === "pix"}
                        onChange={() => setPaymentMethod("pix")}
                        style={{ accentColor: CALEA.primary }}
                      />
                      <QrCode className="h-5 w-5" />
                      <span className="font-medium">Pix</span>
                    </label>
                  )}

                  {paymentSettings.boleto_enabled && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4 transition hover:bg-[#fcfaf6]">
                      <input
                        type="radio"
                        checked={paymentMethod === "boleto"}
                        onChange={() => setPaymentMethod("boleto")}
                        style={{ accentColor: CALEA.primary }}
                      />
                      <Landmark className="h-5 w-5" />
                      <span className="font-medium">Boleto</span>
                    </label>
                  )}

                  {paymentSettings.credit_card_enabled && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4 transition hover:bg-[#fcfaf6]">
                      <input
                        type="radio"
                        checked={paymentMethod === "credit_card"}
                        onChange={() => setPaymentMethod("credit_card")}
                        style={{ accentColor: CALEA.primary }}
                      />
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Cartão de crédito</span>
                    </label>
                  )}
                </div>

                {isCard && (
                  <div className="mt-6 rounded-[24px] border border-[#e7dccb] bg-[#fcfaf6] p-5">
                    <div className="mb-5 rounded-[22px] bg-[#2b554e] p-5 text-white shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                            Cartão de crédito
                          </p>

                          <p className="mt-5 text-lg tracking-[0.16em]">
                            {maskCardPreview(cardForm.number)}
                          </p>
                        </div>

                        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                          {cardBrand || "Bandeira"}
                        </div>
                      </div>

                      <div className="mt-7 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">
                            Titular
                          </p>
                          <p className="mt-1 text-sm font-medium uppercase">
                            {cardForm.holderName || "NOME DO TITULAR"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">
                            Validade
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {cardForm.expiry || "MM/AA"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <h3
                      className="text-base font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Dados do cartão
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            Número do cartão
                          </label>

                          {cardBrand && (
                            <span className="rounded-full border border-[#e7dccb] bg-white px-3 py-1 text-xs font-semibold text-[#2b554e]">
                              {cardBrand}
                            </span>
                          )}
                        </div>

                        <input
                          value={cardForm.number}
                          onChange={(e) =>
                            updateCardField(
                              "number",
                              formatCardNumber(e.target.value)
                            )
                          }
                          placeholder="0000 0000 0000 0000"
                          inputMode="numeric"
                          className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] bg-white px-3 outline-none transition focus:border-[#2b554e]"
                        />

                        <p className="mt-2 text-xs text-gray-500">
                          {cardBrand
                            ? `Bandeira detectada: ${cardBrand}`
                            : "Digite o número do cartão para identificar a bandeira."}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">
                          Nome impresso no cartão
                        </label>
                        <input
                          value={cardForm.holderName}
                          onChange={(e) =>
                            updateCardField("holderName", e.target.value)
                          }
                          placeholder="Nome como está no cartão"
                          className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] bg-white px-3 outline-none transition focus:border-[#2b554e]"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Validade
                        </label>
                        <input
                          value={cardForm.expiry}
                          onChange={(e) =>
                            updateCardField(
                              "expiry",
                              formatExpiry(e.target.value)
                            )
                          }
                          placeholder="MM/AA"
                          inputMode="numeric"
                          maxLength={5}
                          className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] bg-white px-3 outline-none transition focus:border-[#2b554e]"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          CVV
                        </label>
                        <input
                          value={cardForm.cvv}
                          onChange={(e) =>
                            updateCardField(
                              "cvv",
                              onlyDigits(e.target.value).slice(0, 4)
                            )
                          }
                          placeholder="123"
                          inputMode="numeric"
                          maxLength={4}
                          className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] bg-white px-3 outline-none transition focus:border-[#2b554e]"
                        />
                      </div>

                      {paymentMethod === "credit_card" && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            Parcelas
                          </label>
                          <select
                            value={cardForm.installments}
                            onChange={(e) =>
                              updateCardField("installments", e.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] bg-white px-3 outline-none transition focus:border-[#2b554e]"
                          >
                            {installmentOptions.map((option) => (
                              <option
                                key={option.installments}
                                value={option.installments}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {selectedInstallment?.hasInterest && (
                            <p className="mt-2 text-xs text-gray-500">
                              Total com juros:{" "}
                              <span className="font-medium text-[#2b554e]">
                                {moneyBRL(
                                  selectedInstallment.totalAmountCents / 100
                                )}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={loading}
                  className="mt-6 w-full rounded-full py-4 text-sm font-semibold tracking-[0.08em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: CALEA.accent }}
                >
                  {loading ? "PROCESSANDO..." : "FINALIZAR PAGAMENTO"}
                </button>

                <div className="mt-4 rounded-2xl bg-[#fcfaf6] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: CALEA.primary }}
                    />
                    <p className="text-xs leading-5 text-gray-500">
                      Seu pedido será criado agora. Aguarde a confirmação de
                      pagamento.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="h-fit space-y-6 lg:sticky lg:top-24">
              <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: CALEA.primary }}
                >
                  Resumo do pedido
                </h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">
                      {moneyBRL(checkoutDraft?.subtotal || 0)}
                    </span>
                  </div>

                  {discountCents > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        Desconto {couponCode ? `(${couponCode})` : ""}
                      </span>
                      <span className="font-semibold text-emerald-700">
                        - {moneyBRL(discountCents / 100)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Frete</span>
                    <span className="font-semibold">
                      {moneyBRL(checkoutDraft?.shippingPrice || 0)}
                    </span>
                  </div>

                  {!!checkoutDraft?.giftWrapPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Presente</span>
                      <span className="font-semibold">
                        {moneyBRL(checkoutDraft?.giftWrapPrice || 0)}
                      </span>
                    </div>
                  )}

                  {paymentMethod === "credit_card" &&
                    selectedInstallment?.hasInterest && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Juros</span>
                        <span className="font-semibold">
                          {moneyBRL(selectedInstallment.interestCents / 100)}
                        </span>
                      </div>
                    )}
                </div>

                <div className="my-5 h-px bg-[#eee5d8]" />

                <div className="flex items-center justify-between text-base">
                  <span
                    className="font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Total
                  </span>
                  <span
                    className="text-xl font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    {paymentMethod === "credit_card" && selectedInstallment
                      ? moneyBRL(selectedInstallment.totalAmountCents / 100)
                      : moneyBRL(checkoutDraft?.total || 0)}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-[#fcfaf6] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: CALEA.primary }}
                    />
                    <p className="text-xs leading-5 text-gray-500">
                      Seu pagamento será processado em ambiente seguro.
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

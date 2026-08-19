// src/pages/CheckoutPagamento.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  CreditCard,
  Landmark,
  ShieldCheck,
  ArrowLeft,
  LockKeyhole,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  PackageCheck,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";

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


type CheckoutView = "payment" | "confirmation";

function getPagarmeOrder(paymentResponse: any) {
  return paymentResponse?.order || paymentResponse?.data || paymentResponse || null;
}

function getPagarmeCharge(order: any) {
  return order?.charges?.[0] || null;
}

function getPagarmeTransaction(charge: any) {
  return charge?.last_transaction || charge?.transactions?.[0] || null;
}

function normalizePaymentStatus(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (["paid", "approved", "captured"].includes(value)) return "paid";
  if (["failed", "refused", "denied", "not_authorized"].includes(value)) return "failed";
  if (["canceled", "cancelled"].includes(value)) return "canceled";
  if (["processing", "authorized"].includes(value)) return "processing";

  return "pending";
}

function getConfirmationStatusLabel(status?: string | null) {
  switch (normalizePaymentStatus(status)) {
    case "paid":
      return "Pagamento aprovado";
    case "failed":
      return "Pagamento recusado";
    case "canceled":
      return "Pedido cancelado";
    case "processing":
      return "Pagamento em análise";
    default:
      return "Aguardando pagamento";
  }
}

function getConfirmationTitle(status?: string | null) {
  switch (normalizePaymentStatus(status)) {
    case "paid":
      return "Pedido confirmado";
    case "failed":
      return "Pagamento recusado";
    case "canceled":
      return "Pedido cancelado";
    case "processing":
      return "Pagamento em análise";
    default:
      return "Pedido recebido";
  }
}

function getConfirmationMessage(status?: string | null) {
  switch (normalizePaymentStatus(status)) {
    case "paid":
      return "Seu pagamento foi aprovado. Agora vamos preparar seu pedido com todo cuidado.";
    case "failed":
      return "Não conseguimos aprovar o pagamento. Você pode tentar novamente.";
    case "canceled":
      return "Este pedido foi cancelado.";
    case "processing":
      return "Seu pagamento está em análise. A atualização acontecerá automaticamente.";
    default:
      return "Recebemos seu pedido. Aguardando a confirmação oficial do pagamento.";
  }
}

function getConfirmationStatusIcon(status?: string | null) {
  switch (normalizePaymentStatus(status)) {
    case "paid":
      return <CheckCircle size={30} />;
    case "failed":
      return <XCircle size={30} />;
    case "canceled":
      return <AlertCircle size={30} />;
    case "processing":
      return <Clock size={30} />;
    default:
      return <Clock size={30} />;
  }
}

function getConfirmationStatusColors(status?: string | null) {
  switch (normalizePaymentStatus(status)) {
    case "paid":
      return { bg: "#edf5f2", color: "#2b554e", border: "#cfe3dc" };
    case "failed":
      return { bg: "#fff1f2", color: "#b42318", border: "#fecdd3" };
    case "canceled":
      return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
    case "processing":
      return { bg: "#fffbeb", color: "#a16207", border: "#fde68a" };
    default:
      return { bg: "#edf5f2", color: "#2b554e", border: "#cfe3dc" };
  }
}

function getPaymentMethodLabel(method?: string | null) {
  switch (method) {
    case "pix":
      return "Pix";
    case "boleto":
      return "Boleto";
    case "credit_card":
      return "Cartão de crédito";
    case "debit_card":
      return "Cartão de débito";
    default:
      return "Pagamento";
  }
}

function isUuid(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

async function copyToClipboard(value?: string | null, onCopied?: () => void) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  onCopied?.();
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
  const [checkoutView, setCheckoutView] = useState<CheckoutView>("payment");
  const [paymentResponse, setPaymentResponse] = useState<any>(null);

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

      const isAutomaticFreeShipping =
        Boolean(checkoutDraft?.free_shipping_applied) ||
        Number(checkoutDraft?.shippingPrice || 0) === 0;

      const isFreeShippingApplied =
        isFreeShippingCoupon || isAutomaticFreeShipping;

      const itemDiscountCents = isFreeShippingCoupon ? 0 : discountCents;




      const pagarmeItems = buildPagarmeItemsWithDiscount({
        items: checkoutDraft.items,
        discountCents: itemDiscountCents,
      });

      const shippingAmountCents = isFreeShippingApplied
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
          description: isFreeShippingApplied
            ? `${checkoutDraft.shipping.name || "Frete"} - frete grátis`
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
          original_shipping_cents:
            typeof checkoutDraft?.original_shipping_cents === "number"
              ? checkoutDraft.original_shipping_cents
              : Math.round(
                Number(
                  checkoutDraft?.originalShippingPrice ??
                  checkoutDraft?.shipping?.original_price ??
                  checkoutDraft?.shippingPrice ??
                  0
                ) * 100
              ),

          pagarme_shipping_cents: shippingAmountCents,
          free_shipping_applied: isFreeShippingApplied,
          free_shipping_reason: isFreeShippingCoupon
            ? "coupon"
            : isAutomaticFreeShipping
              ? "subtotal_threshold"
              : null,
          original_total_cents: totalCents,
          payment_total_cents: paymentTotalCents,
          coupon_code: couponCode,
          coupon_type: checkoutDraft?.coupon?.discount_type || null,
          discount_cents: discountCents,
          discount_applied_to_items: itemDiscountCents > 0,

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
      setPaymentResponse(data);
      setCheckoutView("confirmation");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    } catch (e: any) {
      setError(getFriendlyError(e?.message || ""));
    } finally {
      setLoading(false);
    }
  }

  const displayTotal =
    paymentMethod === "credit_card" && selectedInstallment
      ? selectedInstallment.totalAmountCents / 100
      : Number(checkoutDraft?.total || 0);

  if (checkoutView === "confirmation" && paymentResponse) {
    return (
      <CheckoutConfirmationView
        paymentResponse={paymentResponse}
        checkoutDraft={checkoutDraft}
        identification={identification}
        selectedPaymentMethod={paymentMethod}
        fallbackTotal={displayTotal}
        onTryAgain={() => {
          setError(null);
          setCheckoutView("payment");
          window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#2b554e]">
      <CheckoutHeader onBack={() => navigate("/checkout/identificacao")} />

      <main className="pb-28 lg:pb-16">
        <section className="mx-auto max-w-6xl px-4 pb-5 pt-7 sm:px-6 sm:pb-7 sm:pt-9">
          <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#b08d57]">
            Último passo
          </p>
          <h1 className="mt-2 font-serif text-[34px] font-normal leading-none tracking-[-0.03em] text-[#2b554e] sm:text-[42px]">
            Como deseja pagar?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#2b554e]/55">
            Escolha a forma de pagamento e finalize sua compra com segurança.
          </p>
          <CheckoutProgress />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-7">
            <div className="space-y-6">
              <section className="border-y border-[#e8dfd3] bg-white p-4 sm:rounded-[24px] sm:border sm:p-6">                <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-semibold text-[#2b554e] ring-1 ring-[#e9e2d6]">
                    <CreditCard className="h-3.5 w-3.5" />
                    Pagamento
                  </div>

                  <h2 className="mt-3 text-xl font-semibold text-[#2b554e]">
                    Como deseja pagar?
                  </h2>

                </div>


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
                    <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-[#e7dccb] bg-[#fffdf9] p-4 transition hover:border-[#b08d57] hover:bg-[#fcfaf6]">                      <input
                      id="payment-pix"
                      name="paymentMethod"
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
                    <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-[#e7dccb] bg-[#fffdf9] p-4 transition hover:border-[#b08d57] hover:bg-[#fcfaf6]">
                      <input
                        id="payment-boleto"
                        name="paymentMethod"
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
                    <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-[#e7dccb] bg-[#fffdf9] p-4 transition hover:border-[#b08d57] hover:bg-[#fcfaf6]">
                      <input
                        id="payment-credit-card"
                        name="paymentMethod"
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
                          <label htmlFor="card-number" className="text-sm font-medium text-gray-700">
                            Número do cartão
                          </label>

                          {cardBrand && (
                            <span className="rounded-full border border-[#e7dccb] bg-white px-3 py-1 text-xs font-semibold text-[#2b554e]">
                              {cardBrand}
                            </span>
                          )}
                        </div>

                        <input
                          id="card-number"
                          name="cardNumber"
                          autoComplete="cc-number"
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
                        <label htmlFor="card-holder-name" className="text-sm font-medium text-gray-700">
                          Nome impresso no cartão
                        </label>
                        <input
                          id="card-holder-name"
                          name="cardHolderName"
                          autoComplete="cc-name"
                          value={cardForm.holderName}
                          onChange={(e) =>
                            updateCardField("holderName", e.target.value)
                          }
                          placeholder="Nome como está no cartão"
                          className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] bg-white px-3 outline-none transition focus:border-[#2b554e]"
                        />
                      </div>

                      <div>
                        <label htmlFor="card-expiry" className="text-sm font-medium text-gray-700">
                          Validade
                        </label>
                        <input
                          id="card-expiry"
                          name="cardExpiry"
                          autoComplete="cc-exp"
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
                        <label htmlFor="card-cvv" className="text-sm font-medium text-gray-700">
                          CVV
                        </label>
                        <input
                          id="card-cvv"
                          name="cardCvv"
                          autoComplete="cc-csc"
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
                          <label htmlFor="card-installments" className="text-sm font-medium text-gray-700">
                            Parcelas
                          </label>
                          <select
                            id="card-installments"
                            name="cardInstallments"
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
                  className="mt-6 hidden w-full py-4 text-sm font-semibold tracking-[0.08em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 lg:block"
                  style={{ backgroundColor: CALEA.primary }}
                >
                  {loading ? "Processando..." : "Finalizar pagamento"}
                </button>

                <div className="mt-4 rounded-2xl bg-[#fcfaf6] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: CALEA.primary }}
                    />
                    <p className="text-xs leading-5 text-gray-500">
                      Aguarde a confirmação do pagamento.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="hidden h-fit space-y-6 lg:sticky lg:top-24 lg:block">
              <div className="border-y border-[#e8dfd3] bg-white p-4 sm:rounded-[24px] sm:border sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b08d57]">
                  Resumo
                </p>

                <h2 className="mt-2 text-lg font-semibold text-[#2b554e]">
                  Seu pedido
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

                    <span
                      className={[
                        "font-semibold",
                        Boolean(checkoutDraft?.shipping) &&
                          (
                            checkoutDraft?.free_shipping_applied ||
                            checkoutDraft?.coupon?.discount_type === "free_shipping" ||
                            Number(checkoutDraft?.shippingPrice || 0) === 0
                          )
                          ? "text-emerald-700"
                          : "",
                      ].join(" ")}
                    >
                      {Boolean(checkoutDraft?.shipping) &&
                        (
                          checkoutDraft?.free_shipping_applied ||
                          checkoutDraft?.coupon?.discount_type === "free_shipping" ||
                          Number(checkoutDraft?.shippingPrice || 0) === 0
                        )
                        ? "Grátis"
                        : moneyBRL(checkoutDraft?.shippingPrice || 0)}
                    </span>
                  </div>

                  {Boolean(checkoutDraft?.giftWrap) && Number(checkoutDraft?.giftWrapPrice || 0) > 0 && (
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
                <div className="rounded-3xl bg-[#2b554e] p-5 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm opacity-80">Total</span>

                    <span className="text-2xl font-semibold">
                      {paymentMethod === "credit_card" && selectedInstallment
                        ? moneyBRL(selectedInstallment.totalAmountCents / 100)
                        : moneyBRL(checkoutDraft?.total || 0)}
                    </span>
                  </div>
                </div>

    
                    <div className="mt-4 rounded-2xl bg-[#2b554e] px-4 py-3">
                      <div className="flex items-center justify-center">
                        <img
                          src="/Selo Pagar.me - Fundo colorido.svg"
                          alt="Pagamento seguro via Pagar.me"
                          className="h-10 w-auto object-contain"
                        />
                      </div>
                    </div>
                
              </div>
            </aside>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5ddd2] bg-[#fcfaf6]/96 px-4 py-3 shadow-[0_-12px_35px_rgba(43,85,78,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-[112px]">
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#2b554e]/40">
              Total
            </p>
            <p className="font-serif text-xl text-[#2b554e]">
              {moneyBRL(displayTotal)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={loading}
            className="flex h-12 flex-1 items-center justify-center gap-2 bg-[#2b554e] px-5 text-sm font-semibold text-white transition hover:bg-[#23463f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Processando..." : "Finalizar pagamento"}
            {!loading && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutHeader({
  onBack,
  backLabel = "Voltar para seus dados",
}: {
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e8dfd3] bg-[#fcfaf6]/95 backdrop-blur">
      <div className="mx-auto grid h-[68px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-[76px] sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 justify-self-start text-xs font-medium text-[#2b554e]/55 transition hover:text-[#2b554e]"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{backLabel}</span>
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
          Pagamento
        </span>

        <span className="text-[#2b554e]/35">
          3 de 4
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#e4dbcf]" />
      </div>
    </div>
  );
}

function CheckoutConfirmationView({
  paymentResponse,
  checkoutDraft,
  identification,
  selectedPaymentMethod,
  fallbackTotal,
  onTryAgain,
}: {
  paymentResponse: any;
  checkoutDraft: any;
  identification: any;
  selectedPaymentMethod: PaymentMethod;
  fallbackTotal: number;
  onTryAgain: () => void;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [dbOrderStatus, setDbOrderStatus] = useState<string | null>(null);
  const [dbPaymentStatus, setDbPaymentStatus] = useState<string | null>(null);

  const order = getPagarmeOrder(paymentResponse);
  const charge = getPagarmeCharge(order);
  const transaction = getPagarmeTransaction(charge);

  const confirmationPaymentMethod =
    charge?.payment_method ||
    transaction?.payment_method ||
    order?.payments?.[0]?.payment_method ||
    paymentResponse?.paymentMethod ||
    selectedPaymentMethod;

  const rawStatus =
    dbPaymentStatus ||
    dbOrderStatus ||
    charge?.status ||
    transaction?.status ||
    order?.status ||
    paymentResponse?.status ||
    "pending";

  const status = normalizePaymentStatus(rawStatus);
  const statusColors = getConfirmationStatusColors(status);

  const initialOrderNumber =
    paymentResponse?.local_order_number ||
    paymentResponse?.order_number ||
    paymentResponse?.orderNumber ||
    identification?.order_number ||
    identification?.orderNumber ||
    sessionStorage.getItem("calea_order_number") ||
    order?.metadata?.order_number ||
    order?.metadata?.local_order_number ||
    null;

  const orderNumber =
    initialOrderNumber && !isUuid(initialOrderNumber)
      ? initialOrderNumber
      : "Pedido em processamento";

  const internalOrderId =
    paymentResponse?.local_order_id ||
    paymentResponse?.metadata?.local_order_id ||
    paymentResponse?.order?.metadata?.local_order_id ||
    order?.metadata?.local_order_id ||
    sessionStorage.getItem("calea_order_id") ||
    null;

  useEffect(() => {
    let mounted = true;
    let intervalId: number | null = null;

    async function loadOrderStatus() {
      if (!internalOrderId || !isUuid(internalOrderId)) return;

      const email = String(identification?.email || "").trim().toLowerCase();
      if (!email) return;

      try {
        const response = await fetch("/.netlify/functions/get-order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: internalOrderId,
            email,
          }),
        });

        const result = await response.json().catch(() => null);
        if (!mounted) return;

        if (!response.ok || !result?.ok) {
          console.error(
            "Erro ao buscar status do pedido:",
            result?.error || `HTTP ${response.status}`
          );
          return;
        }

        const nextOrderStatus = result.order?.status || null;
        const nextPaymentStatus = result.order?.paymentStatus || null;

        setDbOrderStatus(nextOrderStatus);
        setDbPaymentStatus(nextPaymentStatus);

        const normalizedOrderStatus = normalizePaymentStatus(nextOrderStatus);
        const normalizedPaymentStatus = normalizePaymentStatus(nextPaymentStatus);

        if (
          normalizedOrderStatus === "paid" ||
          normalizedOrderStatus === "failed" ||
          normalizedOrderStatus === "canceled" ||
          normalizedPaymentStatus === "paid" ||
          normalizedPaymentStatus === "failed" ||
          normalizedPaymentStatus === "canceled"
        ) {
          if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (pollError) {
        if (!mounted) return;
        console.error("Erro ao consultar status do pedido:", pollError);
      }
    }

    loadOrderStatus();
    intervalId = window.setInterval(loadOrderStatus, 5000);

    return () => {
      mounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [internalOrderId, identification?.email]);

  const pixQrCode =
    transaction?.qr_code ||
    transaction?.qrCode ||
    transaction?.pix_qr_code ||
    transaction?.payload ||
    transaction?.emv;

  const pixQrCodeUrl =
    transaction?.qr_code_url ||
    transaction?.qrCodeUrl ||
    transaction?.pix_qr_code_url;

  const boletoUrl =
    transaction?.url ||
    transaction?.pdf ||
    transaction?.boleto_url ||
    transaction?.document_url;

  const boletoBarcode =
    transaction?.barcode ||
    transaction?.line ||
    transaction?.digitable_line ||
    transaction?.nosso_numero;

  const providerTotal =
    Number(order?.amount || charge?.amount || 0) > 0
      ? Number(order?.amount || charge?.amount || 0) / 100
      : 0;

  const total = providerTotal || fallbackTotal || Number(checkoutDraft?.total || 0);
  const couponCode = getCheckoutCouponCode(checkoutDraft);
  const discountCents = getCheckoutDiscountCents(checkoutDraft);
  const discountValue = discountCents / 100;

  const isPix = confirmationPaymentMethod === "pix";
  const isBoleto = confirmationPaymentMethod === "boleto";
  const isCard =
    confirmationPaymentMethod === "credit_card" ||
    confirmationPaymentMethod === "debit_card";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcfaf6] text-[#2b554e]">
      <CheckoutHeader
        onBack={() => navigate("/")}
        backLabel="Voltar para a loja"
      />

      <main className="pb-16">
        <section className="border-b border-[#e9e2d6] bg-[#fcfaf6]">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#b08d57]">
                  Checkout
                </p>

                <h1 className="mt-2 font-serif text-[34px] font-normal leading-none tracking-[-0.03em] text-[#2b554e] sm:text-[42px]">
                  Confirmação do pedido
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-[#2b554e]/55">
                  Acompanhe o status do pagamento e os detalhes da sua compra.
                </p>
              </div>

              <div className="rounded-full border border-[#e5dbce] bg-white px-4 py-2 text-sm text-[#2b554e] shadow-sm">
                {getConfirmationStatusLabel(status)}
              </div>
            </div>

            <ConfirmationProgress />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:gap-7">
            <div className="space-y-5">
              <section className="border-y border-[#e8dfd3] bg-white p-5 sm:rounded-[24px] sm:border sm:p-7">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: statusColors.bg,
                      color: statusColors.color,
                      borderColor: statusColors.border,
                    }}
                  >
                    {getConfirmationStatusIcon(status)}
                  </div>

                  <div>
                    <h2
                      className="font-serif text-[30px] font-normal leading-tight tracking-[-0.03em] sm:text-[36px]"
                      style={{ color: statusColors.color }}
                    >
                      {getConfirmationTitle(status)}
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f675e]">
                      {getConfirmationMessage(status)}
                    </p>
                  </div>
                </div>

                <div
                  className="mt-7 rounded-[24px] border bg-[#fcfaf6] p-5"
                  style={{ borderColor: statusColors.border }}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a9187]">
                    Número do pedido
                  </p>

                  <p className="mt-2 break-all text-2xl font-semibold tracking-[-0.03em] text-[#2b554e]">
                    {orderNumber}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <ConfirmationInfoBox
                      label="Status"
                      value={getConfirmationStatusLabel(status)}
                      color={statusColors.color}
                    />
                    <ConfirmationInfoBox
                      label="Pagamento"
                      value={getPaymentMethodLabel(confirmationPaymentMethod)}
                    />
                    <ConfirmationInfoBox label="Total" value={moneyBRL(total)} />
                  </div>
                </div>

                {isPix && status !== "failed" && (
                  <ConfirmationPaymentBox
                    icon={<QrCode />}
                    title="Pagamento via Pix"
                    description="Escaneie o QR Code ou copie o código Pix abaixo."
                  >
                    {pixQrCodeUrl && (
                      <div className="mt-5 flex justify-center">
                        <img
                          src={pixQrCodeUrl}
                          alt="QR Code Pix"
                          className="h-56 w-56 rounded-3xl border border-[#e9e2d6] bg-white p-3"
                        />
                      </div>
                    )}

                    {pixQrCode && (
                      <div className="mt-5">
                        <label
                          htmlFor="pix-copy-paste"
                          className="text-sm font-medium text-[#5f5850]"
                        >
                          Pix copia e cola
                        </label>

                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
                          <textarea
                            id="pix-copy-paste"
                            name="pix-copy-paste"
                            readOnly
                            value={pixQrCode}
                            className="h-24 resize-none rounded-2xl border border-[#e9e2d6] bg-[#fcfaf6] p-3 text-xs text-[#5f5850] outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(pixQrCode, () => {
                                setCopied(true);
                                window.setTimeout(() => setCopied(false), 1800);
                              })
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2b554e] px-4 text-sm font-semibold text-white"
                          >
                            <Copy size={17} />
                            {copied ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </ConfirmationPaymentBox>
                )}

                {isBoleto && status !== "failed" && (
                  <ConfirmationPaymentBox
                    icon={<Landmark />}
                    title="Pagamento via boleto"
                    description="Use a linha digitável ou abra o boleto para pagamento."
                  >
                    {boletoBarcode && (
                      <div className="mt-5">
                        <label
                          htmlFor="boleto-barcode"
                          className="text-sm font-medium text-[#5f5850]"
                        >
                          Linha digitável
                        </label>

                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
                          <input
                            id="boleto-barcode"
                            name="boleto-barcode"
                            readOnly
                            value={boletoBarcode}
                            className="h-12 rounded-full border border-[#e9e2d6] bg-[#fcfaf6] px-4 text-sm text-[#5f5850] outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(boletoBarcode, () => {
                                setCopied(true);
                                window.setTimeout(() => setCopied(false), 1800);
                              })
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2b554e] px-4 text-sm font-semibold text-white"
                          >
                            <Copy size={17} />
                            {copied ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}

                    {boletoUrl && (
                      <a
                        href={boletoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex rounded-full bg-[#b08d57] px-6 py-3 text-sm font-semibold text-white"
                      >
                        Abrir boleto
                      </a>
                    )}
                  </ConfirmationPaymentBox>
                )}

                {isCard && (
                  <ConfirmationPaymentBox
                    icon={<CreditCard />}
                    title="Pagamento com cartão"
                    description={
                      status === "failed"
                        ? "O pagamento foi recusado. Confira os dados do cartão ou tente outra forma de pagamento."
                        : status === "paid"
                          ? "Pagamento aprovado com sucesso."
                          : "Seu pagamento foi enviado para processamento."
                    }
                  />
                )}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  {status === "failed" && (
                    <button
                      type="button"
                      onClick={onTryAgain}
                      className="rounded-full bg-[#b08d57] px-6 py-3 text-center text-sm font-semibold text-white"
                    >
                      Tentar novamente
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-full border border-[#e9e2d6] px-6 py-3 text-center text-sm font-semibold text-[#2b554e]"
                  >
                    Voltar para início
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/joias")}
                    className="rounded-full bg-[#2b554e] px-6 py-3 text-center text-sm font-semibold text-white"
                  >
                    Continuar comprando
                  </button>
                </div>
              </section>
            </div>

            <aside className="h-fit space-y-5 lg:sticky lg:top-24">
              <div className="border-y border-[#e8dfd3] bg-white p-5 sm:rounded-[24px] sm:border sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b08d57]">
                  Resumo
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[#2b554e]">
                  Seu pedido
                </h2>

                <div className="mt-5 space-y-5 text-sm">
                  <ConfirmationSummaryBlock title="Cliente">
                    <p className="font-medium text-[#2b554e]">
                      {identification?.name || "-"}
                    </p>
                    <p className="text-[#7a746c]">
                      {identification?.email || "-"}
                    </p>
                  </ConfirmationSummaryBlock>

                  <ConfirmationSummaryBlock title="Entrega">
                    <p className="text-[#5f5850]">
                      {identification?.street || "-"}, {identification?.number || "-"}
                    </p>
                    <p className="text-[#7a746c]">
                      {identification?.neighborhood || "-"} - {identification?.city || "-"}/
                      {identification?.state || "-"}
                    </p>
                    <p className="text-[#7a746c]">
                      CEP: {identification?.zipCode || identification?.cep || "-"}
                    </p>
                  </ConfirmationSummaryBlock>

                  <ConfirmationSummaryBlock title="Itens">
                    <div className="space-y-3">
                      {checkoutDraft?.items?.length ? (
                        checkoutDraft.items.map((item: any) => (
                          <div
                            key={item.id || item.sku_id || item.name}
                            className="flex justify-between gap-3"
                          >
                            <div>
                              <p className="font-medium text-[#2b554e]">
                                {item.name}
                              </p>
                              <p className="text-xs text-[#8a8175]">
                                Qtd: {item.qty || item.quantity || 1}
                              </p>
                            </div>

                            <p className="font-medium text-[#2b554e]">
                              {moneyBRL(Number(item.price || 0))}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#7a746c]">Nenhum item encontrado.</p>
                      )}
                    </div>
                  </ConfirmationSummaryBlock>

                  <div className="space-y-3">
                    <ConfirmationSummaryLine
                      label="Subtotal"
                      value={moneyBRL(checkoutDraft?.subtotal || 0)}
                    />

                    {discountCents > 0 && (
                      <ConfirmationSummaryLine
                        label={`Desconto${couponCode ? ` (${couponCode})` : ""}`}
                        value={`- ${moneyBRL(discountValue)}`}
                        success
                      />
                    )}

                    <ConfirmationSummaryLine
                      label="Frete"
                      value={
                        Boolean(checkoutDraft?.shipping) &&
                        (
                          checkoutDraft?.free_shipping_applied ||
                          checkoutDraft?.coupon?.discount_type === "free_shipping" ||
                          Number(checkoutDraft?.shippingPrice || 0) === 0
                        )
                          ? "Grátis"
                          : moneyBRL(checkoutDraft?.shippingPrice || 0)
                      }
                      success={
                        Boolean(checkoutDraft?.shipping) &&
                        (
                          checkoutDraft?.free_shipping_applied ||
                          checkoutDraft?.coupon?.discount_type === "free_shipping" ||
                          Number(checkoutDraft?.shippingPrice || 0) === 0
                        )
                      }
                    />

                    {!!checkoutDraft?.giftWrapPrice && (
                      <ConfirmationSummaryLine
                        label="Presente"
                        value={moneyBRL(checkoutDraft.giftWrapPrice)}
                      />
                    )}
                  </div>

                  <div className="h-px bg-[#eee5d8]" />

                  <div className="rounded-3xl bg-[#2b554e] p-5 text-white">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-white/70">Total</p>
                        <p className="text-xs text-white/50">Pedido finalizado</p>
                      </div>

                      <span className="text-[26px] font-semibold tracking-[-0.04em]">
                        {moneyBRL(total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-[#fcfaf6] p-4">
                  <div className="flex items-start gap-3">
                    <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2b554e]" />
                    <p className="text-xs leading-5 text-[#7a746c]">
                      Você receberá atualizações pelo e-mail informado na compra.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function ConfirmationProgress() {
  return (
    <div className="mt-7">
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className="text-[#2b554e]">
          Confirmação
        </span>

        <span className="text-[#2b554e]/35">
          4 de 4
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#2b554e]" />
      </div>
    </div>
  );
}

function ConfirmationInfoBox({
  label,
  value,
  color = "#2b554e",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs text-[#9a9187]">{label}</p>
      <p className="mt-1 font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function ConfirmationPaymentBox({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-[24px] border border-[#e9e2d6] bg-white p-5">
      <div className="flex items-center gap-3 text-[#2b554e]">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#7a746c]">{description}</p>
      {children}
    </div>
  );
}

function ConfirmationSummaryBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[#9a9187]">
        {title}
      </p>
      {children}
      <div className="mt-5 h-px bg-[#eee5d8]" />
    </div>
  );
}

function ConfirmationSummaryLine({
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
        className={
          success
            ? "font-semibold text-emerald-700"
            : "font-semibold text-[#2b554e]"
        }
      >
        {value}
      </span>
    </div>
  );
}
// src/pages/CheckoutPagamento.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, CreditCard, Landmark, ShieldCheck } from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabase";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#fcfaf6",
  line: "#e9e2d6",
};

type PaymentMethod = "pix" | "boleto" | "credit_card" | "debit_card";

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
  debit_card_enabled: boolean;
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
  debit_card_enabled: true,
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
      label: `${i}x de ${moneyBRL(installmentAmountCents / 100)} ${
        isInterestFree || interestCents === 0 ? "sem juros" : "com juros"
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

  const isCard =
    paymentMethod === "credit_card" || paymentMethod === "debit_card";

  const cardBrand = useMemo(
    () => detectCardBrand(cardForm.number),
    [cardForm.number]
  );

  const totalCents = useMemo(() => {
    return Math.round(Number(checkoutDraft?.total || 0) * 100);
  }, [checkoutDraft?.total]);

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
          "max_installments, interest_free_installments, monthly_interest_rate, min_installment_cents, pix_enabled, boleto_enabled, credit_card_enabled, debit_card_enabled"
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
          debit_card_enabled: Boolean(data.debit_card_enabled),
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
      else if (paymentSettings.debit_card_enabled)
        setPaymentMethod("debit_card");
    }

    if (paymentMethod === "boleto" && !paymentSettings.boleto_enabled) {
      if (paymentSettings.pix_enabled) setPaymentMethod("pix");
      else if (paymentSettings.credit_card_enabled)
        setPaymentMethod("credit_card");
      else if (paymentSettings.debit_card_enabled)
        setPaymentMethod("debit_card");
    }

    if (
      paymentMethod === "credit_card" &&
      !paymentSettings.credit_card_enabled
    ) {
      if (paymentSettings.pix_enabled) setPaymentMethod("pix");
      else if (paymentSettings.boleto_enabled) setPaymentMethod("boleto");
      else if (paymentSettings.debit_card_enabled)
        setPaymentMethod("debit_card");
    }

    if (paymentMethod === "debit_card" && !paymentSettings.debit_card_enabled) {
      if (paymentSettings.pix_enabled) setPaymentMethod("pix");
      else if (paymentSettings.credit_card_enabled)
        setPaymentMethod("credit_card");
      else if (paymentSettings.boleto_enabled) setPaymentMethod("boleto");
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

    if (paymentMethod === "debit_card" && !paymentSettings.debit_card_enabled) {
      setError("Cartão de débito indisponível no momento.");
      return;
    }

    setLoading(true);

    try {
      const orderId =
        sessionStorage.getItem("calea_order_id") || `PED-${Date.now()}`;

      const address = {
        line1: `${identification.street || ""}, ${
          identification.number || ""
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
        items: checkoutDraft.items.map((item: any) => ({
          code: String(item.id || item.sku_id || item.slug || item.name),
          description: item.name,
          amount: Math.round(Number(item.price || 0) * 100),
          quantity: Number(item.qty || item.quantity || 1),
        })),
        shipping: {
          amount: Math.round(Number(checkoutDraft.shippingPrice || 0) * 100),
          description: checkoutDraft.shipping.name || "Frete",
          recipientName: identification.name,
          recipientPhone: identification.phone,
          address,
        },
        metadata: {
          source: "calea-web",
          original_total_cents: totalCents,
          payment_total_cents: paymentTotalCents,
        },
      };

      if (paymentMethod === "pix") {
        payload.pix = {
          expiresIn: 1800,
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

      if (paymentMethod === "debit_card") {
        const cardToken = await createPagarmeCardToken(cardForm);

        payload.debitCard = {
          cardToken,
          statementDescriptor: "CALEA",
          recurrence: false,
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

      <main className="px-4 pt-[160px] md:pt-[180px]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h1
              className="text-2xl font-semibold"
              style={{ color: CALEA.primary }}
            >
              Pagamento
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Escolha como deseja concluir seu pedido.
            </p>

            {loadingSettings && (
              <p className="mt-4 text-sm text-gray-500">
                Carregando configurações de pagamento...
              </p>
            )}

            <div className="mt-6 space-y-3">
              {paymentSettings.pix_enabled && (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4 transition hover:bg-[#fcfaf6]">
                  <input
                    type="radio"
                    checked={paymentMethod === "pix"}
                    onChange={() => setPaymentMethod("pix")}
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
                  />
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Cartão de crédito</span>
                </label>
              )}

              {paymentSettings.debit_card_enabled && (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4 transition hover:bg-[#fcfaf6]">
                  <input
                    type="radio"
                    checked={paymentMethod === "debit_card"}
                    onChange={() => setPaymentMethod("debit_card")}
                  />
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Cartão de débito</span>
                </label>
              )}
            </div>

            {isCard && (
              <div className="mt-6 rounded-[24px] border border-[#e7dccb] bg-[#fcfaf6] p-5">
                <div className="mb-5 rounded-[22px] bg-[#2b554e] p-5 text-white shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                        {paymentMethod === "credit_card"
                          ? "Cartão de crédito"
                          : "Cartão de débito"}
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

                <h2
                  className="text-lg font-semibold"
                  style={{ color: CALEA.primary }}
                >
                  Dados do cartão
                </h2>

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
                      className="mt-1 w-full rounded-xl border border-[#e7dccb] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#b08d57]/30"
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
                      className="mt-1 w-full rounded-xl border border-[#e7dccb] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#b08d57]/30"
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
                      className="mt-1 w-full rounded-xl border border-[#e7dccb] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#b08d57]/30"
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
                      className="mt-1 w-full rounded-xl border border-[#e7dccb] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#b08d57]/30"
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
                        className="mt-1 w-full rounded-xl border border-[#e7dccb] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#b08d57]/30"
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
              className="mt-6 w-full rounded-full py-4 text-sm font-semibold tracking-[0.08em] text-white transition hover:brightness-95 disabled:opacity-50"
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
                  Seu pedido será criado agora. Aguarde a confirmação de pagamento.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2
              className="text-lg font-semibold"
              style={{ color: CALEA.primary }}
            >
              Resumo
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  {moneyBRL(checkoutDraft?.subtotal || 0)}
                </span>
              </div>

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
                {paymentMethod === "credit_card" && selectedInstallment
                  ? moneyBRL(selectedInstallment.totalAmountCents / 100)
                  : moneyBRL(checkoutDraft?.total || 0)}
              </span>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
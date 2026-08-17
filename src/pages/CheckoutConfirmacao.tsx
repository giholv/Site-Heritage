// src/pages/CheckoutConfirmacao.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  Landmark,
  PackageCheck,
  QrCode,
  ShoppingBag,
  User,
  XCircle,
  ArrowLeft,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";


function moneyBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function safeJsonParse(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getPaymentResponse() {
  return safeJsonParse(sessionStorage.getItem("calea_payment_response"));
}

function getCheckoutDraft() {
  return safeJsonParse(sessionStorage.getItem("calea_checkout"));
}

function getIdentification() {
  return safeJsonParse(sessionStorage.getItem("calea_checkout_identificacao"));
}

function getCheckoutCouponCode(checkoutDraft: any) {
  return (
    checkoutDraft?.couponCode ||
    checkoutDraft?.coupon_code ||
    checkoutDraft?.coupon?.code ||
    null
  );
}

function getCheckoutDiscountCents(checkoutDraft: any) {
  if (typeof checkoutDraft?.discount_cents === "number") return checkoutDraft.discount_cents;
  if (typeof checkoutDraft?.discountCents === "number") return checkoutDraft.discountCents;
  if (typeof checkoutDraft?.coupon?.discount_cents === "number") return checkoutDraft.coupon.discount_cents;
  if (typeof checkoutDraft?.coupon?.discountCents === "number") return checkoutDraft.coupon.discountCents;
  if (typeof checkoutDraft?.discount === "number") return Math.round(checkoutDraft.discount * 100);
  return 0;
}

function getOrder(paymentResponse: any) {
  return paymentResponse?.order || paymentResponse?.data || paymentResponse || null;
}

function getCharge(order: any) {
  return order?.charges?.[0] || null;
}

function getTransaction(charge: any) {
  return charge?.last_transaction || charge?.transactions?.[0] || null;
}

function normalizeStatus(status?: string) {
  const value = String(status || "").toLowerCase();

  if (["paid", "approved", "captured"].includes(value)) return "paid";
  if (["failed", "refused", "denied", "not_authorized"].includes(value)) return "failed";
  if (["canceled", "cancelled"].includes(value)) return "canceled";
  if (["processing", "authorized"].includes(value)) return "processing";

  return "pending";
}

function getStatusLabel(status?: string) {
  switch (normalizeStatus(status)) {
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

function getTitle(status?: string) {
  switch (normalizeStatus(status)) {
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

function getMessage(status?: string) {
  switch (normalizeStatus(status)) {
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

function getStatusIcon(status?: string) {
  switch (normalizeStatus(status)) {
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

function getStatusColors(status?: string) {
  switch (normalizeStatus(status)) {
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

function getPaymentMethodLabel(method?: string) {
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

async function copyToClipboard(value?: string, onCopied?: () => void) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  onCopied?.();
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
    <div className="flex min-w-[82px] flex-col items-center gap-2">
      <span
        className={[
          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
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

export default function CheckoutConfirmacao() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [resolvedOrderNumber] = useState<string | null>(null);
  const [dbOrderStatus, setDbOrderStatus] = useState<string | null>(null);
  const [dbPaymentStatus, setDbPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const paymentResponse = useMemo(() => getPaymentResponse(), []);
  const checkoutDraft = useMemo(() => getCheckoutDraft(), []);
  const identification = useMemo(() => getIdentification(), []);

  const order = getOrder(paymentResponse);
  const charge = getCharge(order);
  const transaction = getTransaction(charge);

  const paymentMethod =
    charge?.payment_method ||
    transaction?.payment_method ||
    order?.payments?.[0]?.payment_method ||
    paymentResponse?.paymentMethod;

  const rawStatus =
    dbPaymentStatus ||
    dbOrderStatus ||
    charge?.status ||
    transaction?.status ||
    order?.status ||
    paymentResponse?.status ||
    "pending";

  const status = normalizeStatus(rawStatus);
  const statusColors = getStatusColors(status);

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
      : resolvedOrderNumber || "Pedido em processamento";

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
      if (!internalOrderId || !isUuid(internalOrderId)) {
        return;
      }

      const email = String(identification?.email || "")
        .trim()
        .toLowerCase();

      if (!email) {
        console.error(
          "E-mail do checkout não encontrado para consultar o pedido."
        );
        return;
      }

      try {
        const response = await fetch(
          "/.netlify/functions/get-order-status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: internalOrderId,
              email,
            }),
          }
        );

        const result = await response.json().catch(() => null);

        if (!mounted) return;

        if (!response.ok || !result?.ok) {
          console.error(
            "Erro ao buscar status do pedido:",
            result?.error || `HTTP ${response.status}`
          );

          return;
        }

        const nextOrderStatus =
          result.order?.status || null;

        const nextPaymentStatus =
          result.order?.paymentStatus || null;

        setDbOrderStatus(nextOrderStatus);
        setDbPaymentStatus(nextPaymentStatus);

        const normalizedOrderStatus =
          normalizeStatus(nextOrderStatus);

        const normalizedPaymentStatus =
          normalizeStatus(nextPaymentStatus);

        // Para o polling quando chegarmos a um estado final.
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
      } catch (error) {
        if (!mounted) return;

        console.error(
          "Erro ao consultar status do pedido:",
          error
        );
      }
    }

    loadOrderStatus();

    intervalId = window.setInterval(
      loadOrderStatus,
      5000
    );

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

  const total =
    checkoutDraft?.total ||
    Number(order?.amount || charge?.amount || 0) / 100 ||
    0;

  const couponCode = getCheckoutCouponCode(checkoutDraft);
  const discountCents = getCheckoutDiscountCents(checkoutDraft);
  const discountValue = discountCents / 100;

  const isPix = paymentMethod === "pix";
  const isBoleto = paymentMethod === "boleto";
  const isCard = paymentMethod === "credit_card" || paymentMethod === "debit_card";

  function handleTryAgain() {
    navigate("/checkout/pagamento");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcfaf6]">
      <Header />

      <main className="pt-[112px] md:pt-[145px]">
        <section className="border-b border-[#e9e2d6] bg-[#fcfaf6]">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-5 inline-flex items-center gap-2 text-sm text-[#756d63] transition hover:text-[#2b554e]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a loja
            </button>

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#b08d57]">
                  Checkout
                </p>

                <h1 className="mt-2 text-[30px] font-light leading-tight tracking-[-0.04em] text-[#2b554e] sm:text-[40px]">
                  Confirmação do pedido
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7a746c]">
                  Acompanhe o status do pagamento e os detalhes da sua compra.
                </p>
              </div>

              <div className="rounded-full border border-[#e5dbce] bg-white px-4 py-2 text-sm text-[#2b554e] shadow-sm">
                {getStatusLabel(status)}
              </div>
            </div>

            <div className="mt-8 overflow-x-auto pb-2">
              <div className="flex min-w-max items-center gap-4 sm:min-w-0 sm:justify-between">
                <Step label="Sacola" done Icon={ShoppingBag} />
                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />
                <Step label="Identificação" done Icon={User} />
                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />
                <Step label="Pagamento" done Icon={CreditCard} />
                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />
                <Step label="Confirmação" active Icon={CheckCircle} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_390px] lg:items-start">
            <div className="space-y-5">
              <section className="rounded-[28px] border border-[#eee5d8] bg-white p-5 shadow-[0_18px_50px_rgba(43,85,78,0.06)] sm:p-7">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: statusColors.bg,
                      color: statusColors.color,
                      borderColor: statusColors.border,
                    }}
                  >
                    {getStatusIcon(status)}
                  </div>

                  <div>
                    <h2
                      className="text-[28px] font-light leading-tight tracking-[-0.04em] sm:text-[36px]"
                      style={{ color: statusColors.color }}
                    >
                      {getTitle(status)}
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f675e]">
                      {getMessage(status)}
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
                    {isUuid(orderNumber) ? "Pedido em processamento" : orderNumber}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <InfoBox label="Status" value={getStatusLabel(status)} color={statusColors.color} />
                    <InfoBox label="Pagamento" value={getPaymentMethodLabel(paymentMethod)} />
                    <InfoBox label="Total" value={moneyBRL(total)} />
                  </div>
                </div>

                {isPix && status !== "failed" && (
                  <PaymentBox
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
                        <label className="text-sm font-medium text-[#5f5850]">
                          Pix copia e cola
                        </label>

                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
                          <textarea
                            readOnly
                            value={pixQrCode}
                            className="h-24 resize-none rounded-2xl border border-[#e9e2d6] bg-[#fcfaf6] p-3 text-xs text-[#5f5850] outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(pixQrCode, () => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1800);
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
                  </PaymentBox>
                )}

                {isBoleto && status !== "failed" && (
                  <PaymentBox
                    icon={<Landmark />}
                    title="Pagamento via boleto"
                    description="Use a linha digitável ou abra o boleto para pagamento."
                  >
                    {boletoBarcode && (
                      <div className="mt-5">
                        <label className="text-sm font-medium text-[#5f5850]">
                          Linha digitável
                        </label>

                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
                          <input
                            readOnly
                            value={boletoBarcode}
                            className="h-12 rounded-full border border-[#e9e2d6] bg-[#fcfaf6] px-4 text-sm text-[#5f5850] outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(boletoBarcode, () => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1800);
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
                  </PaymentBox>
                )}

                {isCard && (
                  <PaymentBox
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
                      onClick={handleTryAgain}
                      className="rounded-full bg-[#b08d57] px-6 py-3 text-center text-sm font-semibold text-white"
                    >
                      Tentar novamente
                    </button>
                  )}

                  <Link
                    to="/"
                    className="rounded-full border border-[#e9e2d6] px-6 py-3 text-center text-sm font-semibold text-[#2b554e]"
                  >
                    Voltar para início
                  </Link>

                  <Link
                    to="/joias"
                    className="rounded-full bg-[#2b554e] px-6 py-3 text-center text-sm font-semibold text-white"
                  >
                    Continuar comprando
                  </Link>
                </div>
              </section>
            </div>

            <aside className="h-fit space-y-5 lg:sticky lg:top-[120px]">
              <div className="rounded-[28px] border border-[#eee5d8] bg-white p-5 shadow-[0_18px_50px_rgba(43,85,78,0.07)] sm:p-6">
                <h2 className="text-base font-semibold text-[#2b554e]">
                  Resumo do pedido
                </h2>

                <div className="mt-5 space-y-5 text-sm">
                  <SummaryBlock title="Cliente">
                    <p className="font-medium text-[#2b554e]">{identification?.name || "-"}</p>
                    <p className="text-[#7a746c]">{identification?.email || "-"}</p>
                  </SummaryBlock>

                  <SummaryBlock title="Entrega">
                    <p className="text-[#5f5850]">
                      {identification?.street || "-"}, {identification?.number || "-"}
                    </p>
                    <p className="text-[#7a746c]">
                      {identification?.neighborhood || "-"} - {identification?.city || "-"}/{identification?.state || "-"}
                    </p>
                    <p className="text-[#7a746c]">
                      CEP: {identification?.zipCode || identification?.cep || "-"}
                    </p>
                  </SummaryBlock>

                  <SummaryBlock title="Itens">
                    <div className="space-y-3">
                      {checkoutDraft?.items?.length ? (
                        checkoutDraft.items.map((item: any) => (
                          <div
                            key={item.id || item.sku_id || item.name}
                            className="flex justify-between gap-3"
                          >
                            <div>
                              <p className="font-medium text-[#2b554e]">{item.name}</p>
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
                  </SummaryBlock>

                  <div className="space-y-3">
                    <SummaryLine label="Subtotal" value={moneyBRL(checkoutDraft?.subtotal || 0)} />

                    {discountCents > 0 && (
                      <SummaryLine
                        label={`Desconto${couponCode ? ` (${couponCode})` : ""}`}
                        value={`- ${moneyBRL(discountValue)}`}
                        success
                      />
                    )}

                    <SummaryLine label="Frete" value={moneyBRL(checkoutDraft?.shippingPrice || 0)} />

                    {!!checkoutDraft?.giftWrapPrice && (
                      <SummaryLine label="Presente" value={moneyBRL(checkoutDraft.giftWrapPrice)} />
                    )}
                  </div>

                  <div className="h-px bg-[#eee5d8]" />

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#8a8175]">Total</p>
                      <p className="text-xs text-[#9a9187]">Pedido finalizado</p>
                    </div>

                    <span className="text-[26px] font-semibold tracking-[-0.04em] text-[#2b554e]">
                      {moneyBRL(total)}
                    </span>
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

      <Footer />
    </div>
  );
}

function InfoBox({
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

function PaymentBox({
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

function SummaryBlock({
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
      <span className={success ? "font-semibold text-emerald-700" : "font-semibold text-[#2b554e]"}>
        {value}
      </span>
    </div>
  );
}
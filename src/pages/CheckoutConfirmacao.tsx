// src/pages/CheckoutConfirmacao.tsx
import { useMemo, useState } from "react";
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
  XCircle,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#fcfaf6",
  line: "#e9e2d6",
};

function moneyBRL(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", {
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
  if (["failed", "refused", "denied", "not_authorized"].includes(value)) {
    return "failed";
  }
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
      return "Não conseguimos aprovar o pagamento. Você pode tentar novamente com outro cartão ou escolher outra forma de pagamento.";
    case "canceled":
      return "Este pedido foi cancelado. Você pode refazer a compra quando desejar.";
    case "processing":
      return "Seu pagamento foi enviado para análise. A confirmação será atualizada assim que a Pagar.me retornar o status oficial.";
    default:
      return "Obrigado pela sua compra. A confirmação do pagamento será atualizada automaticamente assim que a Pagar.me retornar o status oficial.";
  }
}

function getStatusIcon(status?: string) {
  switch (normalizeStatus(status)) {
    case "paid":
      return <CheckCircle size={28} />;
    case "failed":
      return <XCircle size={28} />;
    case "canceled":
      return <AlertCircle size={28} />;
    case "processing":
      return <Clock size={28} />;
    default:
      return <CheckCircle size={28} />;
  }
}

function getStatusColors(status?: string) {
  switch (normalizeStatus(status)) {
    case "paid":
      return {
        bg: "#edf5f2",
        color: "#2b554e",
        border: "#cfe3dc",
      };
    case "failed":
      return {
        bg: "#fff1f2",
        color: "#b42318",
        border: "#fecdd3",
      };
    case "canceled":
      return {
        bg: "#fff7ed",
        color: "#c2410c",
        border: "#fed7aa",
      };
    case "processing":
      return {
        bg: "#fffbeb",
        color: "#a16207",
        border: "#fde68a",
      };
    default:
      return {
        bg: "#edf5f2",
        color: "#2b554e",
        border: "#cfe3dc",
      };
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

async function copyToClipboard(value?: string, onCopied?: () => void) {
  if (!value) return;

  await navigator.clipboard.writeText(value);
  onCopied?.();
}

export default function CheckoutConfirmacao() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

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
    charge?.status ||
    transaction?.status ||
    order?.status ||
    paymentResponse?.status ||
    "pending";

  const status = normalizeStatus(rawStatus);
  const statusColors = getStatusColors(status);

  const orderCode =
    order?.code ||
    order?.id ||
    paymentResponse?.orderId ||
    sessionStorage.getItem("calea_order_id") ||
    "Pedido";

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

  const isPix = paymentMethod === "pix";
  const isBoleto = paymentMethod === "boleto";
  const isCard =
    paymentMethod === "credit_card" || paymentMethod === "debit_card";

  function handleTryAgain() {
    navigate("/checkout/pagamento");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CALEA.bg }}>
      <Header />

      <main className="px-4 pt-[160px] md:pt-[180px]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: statusColors.bg,
                  color: statusColors.color,
                }}
              >
                {getStatusIcon(status)}
              </div>

              <div>
                <h1
                  className="text-2xl font-semibold"
                  style={{ color: statusColors.color }}
                >
                  {getTitle(status)}
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {getMessage(status)}
                </p>
              </div>
            </div>

            <div
              className="mt-6 rounded-2xl border bg-[#fcfaf6] p-5"
              style={{ borderColor: statusColors.border }}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                Número do pedido
              </p>

              <p
                className="mt-1 break-all text-xl font-semibold"
                style={{ color: CALEA.primary }}
              >
                {orderCode}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="font-medium" style={{ color: statusColors.color }}>
                    {getStatusLabel(status)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Pagamento</p>
                  <p className="font-medium text-gray-800">
                    {getPaymentMethodLabel(paymentMethod)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-medium text-gray-800">{moneyBRL(total)}</p>
                </div>
              </div>
            </div>

            {isPix && status !== "failed" && (
              <div className="mt-6 rounded-2xl border border-[#e9e2d6] bg-white p-5">
                <div className="flex items-center gap-3">
                  <QrCode style={{ color: CALEA.primary }} />
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Pagamento via Pix
                  </h2>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Escaneie o QR Code ou copie o código Pix abaixo.
                </p>

                {pixQrCodeUrl && (
                  <div className="mt-5 flex justify-center">
                    <img
                      src={pixQrCodeUrl}
                      alt="QR Code Pix"
                      className="h-56 w-56 rounded-2xl border border-[#e9e2d6] bg-white p-3"
                    />
                  </div>
                )}

                {pixQrCode && (
                  <div className="mt-5">
                    <label className="text-sm font-medium text-gray-700">
                      Pix copia e cola
                    </label>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <textarea
                        readOnly
                        value={pixQrCode}
                        className="h-24 flex-1 resize-none rounded-2xl border border-[#e9e2d6] bg-[#fcfaf6] p-3 text-xs text-gray-600 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(pixQrCode, () => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1800);
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                        style={{ backgroundColor: CALEA.primary }}
                      >
                        <Copy size={18} />
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                )}

                {!pixQrCode && !pixQrCodeUrl && (
                  <p className="mt-4 rounded-2xl bg-[#fcfaf6] p-4 text-sm text-gray-500">
                    O pedido foi criado, mas o QR Code Pix ainda não retornou.
                    Verifique o retorno da Pagar.me.
                  </p>
                )}
              </div>
            )}

            {isBoleto && status !== "failed" && (
              <div className="mt-6 rounded-2xl border border-[#e9e2d6] bg-white p-5">
                <div className="flex items-center gap-3">
                  <Landmark style={{ color: CALEA.primary }} />
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Pagamento via boleto
                  </h2>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Use a linha digitável ou abra o boleto para pagamento.
                </p>

                {boletoBarcode && (
                  <div className="mt-5">
                    <label className="text-sm font-medium text-gray-700">
                      Linha digitável
                    </label>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        readOnly
                        value={boletoBarcode}
                        className="flex-1 rounded-2xl border border-[#e9e2d6] bg-[#fcfaf6] p-3 text-sm text-gray-600 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(boletoBarcode, () => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1800);
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                        style={{ backgroundColor: CALEA.primary }}
                      >
                        <Copy size={18} />
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
                    className="mt-5 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: CALEA.accent }}
                  >
                    Abrir boleto
                  </a>
                )}
              </div>
            )}

            {isCard && (
              <div className="mt-6 rounded-2xl border border-[#e9e2d6] bg-white p-5">
                <div className="flex items-center gap-3">
                  <CreditCard style={{ color: CALEA.primary }} />
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Pagamento com cartão
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {status === "failed"
                    ? "O pagamento foi recusado pela operadora ou pela análise da Pagar.me. Confira os dados do cartão ou tente outra forma de pagamento."
                    : status === "paid"
                    ? "Pagamento aprovado com sucesso."
                    : "Seu pagamento foi enviado para processamento. Em alguns casos, a aprovação pode levar alguns instantes."}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {status === "failed" && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="rounded-full px-6 py-3 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: CALEA.accent }}
                >
                  Tentar novamente
                </button>
              )}

              <Link
                to="/"
                className="rounded-full border border-[#e9e2d6] px-6 py-3 text-center text-sm font-semibold"
                style={{ color: CALEA.primary }}
              >
                Voltar para início
              </Link>

              <Link
                to="/joias"
                className="rounded-full px-6 py-3 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: CALEA.primary }}
              >
                Continuar comprando
              </Link>
            </div>
          </section>

          <aside className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2
              className="text-lg font-semibold"
              style={{ color: CALEA.primary }}
            >
              Resumo
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="font-medium text-gray-800">
                  {identification?.name || "-"}
                </p>
                <p className="text-gray-500">{identification?.email || "-"}</p>
              </div>

              <div className="h-px bg-[#eee5d8]" />

              <div>
                <p className="text-xs text-gray-400">Entrega</p>
                <p className="text-gray-700">
                  {identification?.street || "-"}, {identification?.number || "-"}
                </p>
                <p className="text-gray-500">
                  {identification?.neighborhood || "-"} -{" "}
                  {identification?.city || "-"}/{identification?.state || "-"}
                </p>
                <p className="text-gray-500">
                  CEP: {identification?.zipCode || identification?.cep || "-"}
                </p>
              </div>

              <div className="h-px bg-[#eee5d8]" />

              <div>
                <p className="text-xs text-gray-400">Itens</p>

                <div className="mt-3 space-y-3">
                  {checkoutDraft?.items?.length ? (
                    checkoutDraft.items.map((item: any) => (
                      <div
                        key={item.id || item.sku_id || item.name}
                        className="flex justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qtd: {item.qty || item.quantity || 1}
                          </p>
                        </div>

                        <p className="font-medium text-gray-800">
                          {moneyBRL(Number(item.price || 0))}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Nenhum item encontrado.</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-[#eee5d8]" />

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">
                  {moneyBRL(checkoutDraft?.subtotal || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Frete</span>
                <span className="font-medium">
                  {moneyBRL(checkoutDraft?.shippingPrice || 0)}
                </span>
              </div>

              {!!checkoutDraft?.giftWrapPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Presente</span>
                  <span className="font-medium">
                    {moneyBRL(checkoutDraft.giftWrapPrice)}
                  </span>
                </div>
              )}

              <div className="h-px bg-[#eee5d8]" />

              <div className="flex items-center justify-between">
                <span
                  className="text-lg font-semibold"
                  style={{ color: CALEA.primary }}
                >
                  Total
                </span>
                <span
                  className="text-xl font-semibold"
                  style={{ color: CALEA.primary }}
                >
                  {moneyBRL(total)}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#fcfaf6] p-4">
              <div className="flex items-start gap-3">
                <PackageCheck
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: CALEA.primary }}
                />
                <p className="text-xs leading-5 text-gray-500">
                  Você receberá atualizações sobre o pedido pelo e-mail
                  informado na compra.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
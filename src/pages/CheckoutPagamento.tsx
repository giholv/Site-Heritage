// src/pages/CheckoutPagamento.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#fcfaf6",
  line: "#e9e2d6",
};

function moneyBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type PaymentMethod = "pix" | "boleto" | "credit_card" | "debit_card";

export default function CheckoutPagamento() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
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

    setLoading(true);

    try {
      const orderId = `PED-${Date.now()}`;

      const payload: any = {
        orderId,
        paymentMethod,
        customer: {
          name: identification.name,
          email: identification.email,
          document: identification.document,
          phone: identification.phone,
          address: {
            line1: `${identification.street || ""}, ${identification.number || ""}`.trim(),
            line2: identification.complement || undefined,
            zipCode: identification.zipCode || identification.cep,
            city: identification.city,
            state: identification.state,
            country: "BR",
          },
        },
        items: checkoutDraft.items.map((item: any) => ({
          code: item.id,
          description: item.name,
          amount: Math.round((item.price || 0) * 100),
          quantity: item.qty || 1,
        })),
        shipping: {
          amount: Math.round((checkoutDraft.shippingPrice || 0) * 100),
          description: checkoutDraft.shipping.name,
        },
        metadata: {
          source: "calea-web",
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

      // cartão e débito entram depois com tokenização
      if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
        setError("Cartão entra no próximo passo com tokenização.");
        setLoading(false);
        return;
      }

      const res = await fetch("/.netlify/functions/pagarme-create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao criar pedido");
      }

      sessionStorage.setItem("calea_payment_response", JSON.stringify(data));
      navigate("/checkout/confirmacao");
    } catch (e: any) {
      setError(e?.message || "Erro ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CALEA.bg }}>
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

            <div className="mt-6 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4">
                <input
                  type="radio"
                  checked={paymentMethod === "pix"}
                  onChange={() => setPaymentMethod("pix")}
                />
                <QrCode className="h-5 w-5" />
                <span className="font-medium">Pix</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4">
                <input
                  type="radio"
                  checked={paymentMethod === "boleto"}
                  onChange={() => setPaymentMethod("boleto")}
                />
                <Landmark className="h-5 w-5" />
                <span className="font-medium">Boleto</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4 opacity-60">
                <input
                  type="radio"
                  checked={paymentMethod === "credit_card"}
                  onChange={() => setPaymentMethod("credit_card")}
                />
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Cartão de crédito</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white p-4 opacity-60">
                <input
                  type="radio"
                  checked={paymentMethod === "debit_card"}
                  onChange={() => setPaymentMethod("debit_card")}
                />
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Cartão de débito</span>
              </label>
            </div>

            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

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
                  O pedido é criado agora. A confirmação oficial vem pelo retorno
                  da Pagar.me.
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
                {moneyBRL(checkoutDraft?.total || 0)}
              </span>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
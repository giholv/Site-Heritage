// src/pages/Checkout.tsx
import React, { useMemo, useState } from "react";
import { ShoppingBag, User, CreditCard, CheckCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { products } from "../data/Products";

function moneyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
          "inline-flex h-10 w-10 items-center justify-center rounded-full border shrink-0",
          active ? "border-black text-black" : "border-gray-300 text-gray-400",
        ].join(" ")}
      >
        <Icon className="h-5 w-5 block" />
      </span>
      <span
        className={[
          "whitespace-nowrap text-xs sm:text-sm",
          active ? "font-semibold text-black" : "text-gray-400",
        ].join(" ")}
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
  deadline: string; // dias úteis
};

export default function Checkout() {
  const navigate = useNavigate();
  const { state, subtotal, remove, setQty } = useCart();

  const items = state.items ?? [];

  // presente
  const [giftWrap, setGiftWrap] = useState(false);
  const giftWrapPrice = 32;

  // cupom (placeholder visual)
  const [coupon, setCoupon] = useState("");

  // frete
  const [cep, setCep] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

  const shippingPrice = selectedShipping?.price ?? 0;
  const total = subtotal + (giftWrap ? giftWrapPrice : 0) + shippingPrice;

  const count = useMemo(
    () => items.reduce((acc, it) => acc + (it.qty ?? 1), 0),
    [items]
  );

  async function handleCalcShipping() {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setShippingError("CEP inválido. Use 8 dígitos.");
      return;
    }

    setShippingLoading(true);
    setShippingError(null);
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      const payload = {
        to_postcode: cleanCep,
        insurance_value: 0,
        products: items.map((it: any) => ({
          quantity: it.qty ?? 1,
          weight: it.weight ?? 0.03,
          height: it.height ?? 8,
          width: it.width ?? 12,
          length: it.length ?? 16,
        })),
      };

      const res = await fetch("/.netlify/functions/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let msg = "Falha ao calcular frete";
        try {
          const err = await res.json();
          const errors = err?.errors || err?.error?.errors;
          const cepInvalid =
            errors?.["correios.destination_postcode"]?.[0] ||
            errors?.to_postcode?.[0] ||
            err?.message;

          if (cepInvalid && String(cepInvalid).toLowerCase().includes("inválido")) {
            msg = "CEP inválido";
          } else if (errors) {
            const firstKey = Object.keys(errors)[0];
            msg = errors[firstKey]?.[0] || msg;
          } else if (err?.message) {
            msg = err.message;
          }
        } catch {
          const t = await res.text().catch(() => "");
          if (t) msg = t;
        }
        throw new Error(msg);
      }

      const opts: ShippingOption[] = data.options ?? [];
      setShippingOptions(opts);
      if (!opts.length) setShippingError("Nenhuma opção de frete encontrada.");
    } catch (e: any) {
      setShippingError(e?.message ?? "Erro ao calcular frete");
    } finally {
      setShippingLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        {/* topo */}
        <div className="mb-8 sm:mb-10 text-center">
          <img
            src="/logo_fundo_claro3.svg"
            alt="Logo da loja"
            className="mx-auto h-[110px] sm:h-[150px] w-auto object-contain"
          />

          {/* stepper: mobile scroll + desktop alinhado */}
          <div className="mx-auto mt-4 max-w-3xl">
            <div className="flex items-center gap-6 overflow-x-auto px-2 pb-2 [-webkit-overflow-scrolling:touch] sm:px-0 sm:justify-between sm:overflow-visible">
              <Step label="Sacola" active Icon={ShoppingBag} />
              <div className="hidden sm:block h-px flex-1 bg-gray-300" />
              <Step label="Identificação" Icon={User} />
              <div className="hidden sm:block h-px flex-1 bg-gray-300" />
              <Step label="Pagamento" Icon={CreditCard} />
              <div className="hidden sm:block h-px flex-1 bg-gray-300" />
              <Step label="Confirmação" Icon={CheckCircle} />
            </div>
          </div>
        </div>

        {/* layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* esquerda */}
          <div className="lg:col-span-2 space-y-6">
            {/* sacola */}
            <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sacola</h2>
                <span className="text-sm text-gray-500">{count} item(ns)</span>
              </div>

              <div className="divide-y">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="py-5 grid grid-cols-[64px_1fr] gap-4 sm:flex sm:items-center"
                  >
                    {/* imagem */}
                    <div className="h-16 w-16 rounded-md bg-gray-100 overflow-hidden shrink-0">
                      {it.image ? (
                        <img
                          src={it.image}
                          alt={it.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    {/* nome */}
                    <div className="min-w-0 sm:flex-1">
                      <div className="font-semibold truncate">{it.name}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {it.variant ?? ""}
                      </div>
                    </div>

                    {/* ações: mobile embaixo / desktop à direita */}
                    <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end sm:gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="h-9 w-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                          onClick={() => setQty(it.id, Math.max(1, (it.qty ?? 1) - 1))}
                          type="button"
                          aria-label="Diminuir quantidade"
                        >
                          -
                        </button>
                        <div className="w-10 text-center">{it.qty ?? 1}</div>
                        <button
                          className="h-9 w-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                          onClick={() => setQty(it.id, (it.qty ?? 1) + 1)}
                          type="button"
                          aria-label="Aumentar quantidade"
                        >
                          +
                        </button>
                      </div>

                      <div className="shrink-0 font-semibold">
                        {moneyBRL((it.price ?? 0) * (it.qty ?? 1))}
                      </div>

                      <button
                        className="shrink-0 text-gray-400 hover:text-black"
                        onClick={() => remove(it.id)}
                        type="button"
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="py-10 text-center text-gray-500">
                    Seu carrinho está vazio.
                  </div>
                )}
              </div>

              {/* presente */}
              <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="overflow-hidden rounded-xl bg-[#f6f3ee]">
                  <img
                    src="/banner_presente.svg"
                    alt="Embalagem para presente"
                    className="h-28 w-full object-contain object-center sm:h-32"
                    loading="lazy"
                  />
                </div>

                <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-3 leading-none">
                    <input
                      type="checkbox"
                      checked={giftWrap}
                      onChange={(e) => setGiftWrap(e.target.checked)}
                      className="h-5 w-5 shrink-0 align-middle"
                      style={{ accentColor: "#2b554e" }}
                    />
                    <div>
                      <div className="font-semibold">Adicionar embalagem para presente</div>
                      <div className="text-sm text-gray-500">
                        Inclui embalagem premium + finalização
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold">{moneyBRL(giftWrapPrice)}</div>
                </label>
              </div>
            </div>
          </div>

          {/* direita */}
          <div className="space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
              {/* cupom */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Cupom de Desconto"
                  className="h-11 w-full sm:flex-1 rounded-md border border-gray-300 px-3"
                />
                <button
                  className="h-11 w-full sm:w-auto rounded-md border border-gray-300 px-4 font-semibold hover:bg-gray-50"
                  type="button"
                >
                  Adicionar
                </button>
              </div>

              <div className="my-6 h-px bg-gray-200" />

              {/* subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{moneyBRL(subtotal)}</span>
              </div>

              {/* embalagem */}
              {giftWrap && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Embalagem para presente</span>
                  <span className="font-semibold">{moneyBRL(giftWrapPrice)}</span>
                </div>
              )}

              {/* frete */}
              <div className="my-6 h-px bg-gray-200" />
              <div className="text-sm font-semibold mb-2">Entrega</div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="Digite seu CEP"
                  className="h-11 w-full sm:flex-1 rounded-md border border-gray-300 px-3"
                  inputMode="numeric"
                />
                <button
                  onClick={handleCalcShipping}
                  className="h-11 w-full sm:w-auto rounded-md border border-gray-300 px-4 font-semibold hover:bg-gray-50 disabled:opacity-50"
                  disabled={shippingLoading || items.length === 0}
                  type="button"
                >
                  {shippingLoading ? "Calculando..." : "Calcular"}
                </button>
              </div>

              {shippingError && (
                <div className="mt-2 text-sm text-red-600">{shippingError}</div>
              )}

              {shippingOptions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {shippingOptions.map((op) => (
                    <label
                      key={op.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping?.id === op.id}
                          onChange={() => setSelectedShipping(op)}
                          className="h-4 w-4 shrink-0 align-middle"
                          style={{ accentColor: "#2b554e" }}
                        />
                        <div>
                          <div className="font-semibold">{op.name}</div>
                          <div className="text-xs text-gray-500">
                            {op.deadline ? op.deadline : ""}

                          </div>
                        </div>
                      </div>
                      <div className="font-semibold">{moneyBRL(op.price)}</div>
                    </label>
                  ))}
                </div>
              )}

              {selectedShipping && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Frete ({selectedShipping.name})
                  </span>
                  <span className="font-semibold">{moneyBRL(shippingPrice)}</span>
                </div>
              )}

              {/* total */}
              <div className="my-6 h-px bg-gray-200" />
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">Total</span>
                <span className="text-xl font-semibold">{moneyBRL(total)}</span>
              </div>

              <button
                className="mt-6 w-full rounded-md bg-[#c9b38a] py-4 text-white font-semibold disabled:opacity-50 hover:brightness-95"
                onClick={() => navigate("/checkout/identificacao")}
                type="button"
                disabled={items.length === 0 || !selectedShipping}
                title={!selectedShipping ? "Selecione o frete para continuar" : ""}
              >
                FINALIZAR COMPRA
              </button>

              <p className="mt-3 text-xs text-gray-500">
                Pagamento seguro • Dados protegidos • Suporte via WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/pages/Checkout.tsx
import React, { useMemo } from "react";
import { ShoppingBag, User, CreditCard, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";


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
    <div className="flex flex-col items-center gap-2 min-w-[90px]">
      <span
        className={[
          "inline-flex h-10 w-10 items-center justify-center rounded-full border",
          active ? "border-black text-black" : "border-gray-300 text-gray-400",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className={active ? "text-sm font-semibold" : "text-sm text-gray-400"}>
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
};

export default function Checkout() {
  const navigate = useNavigate();
  const { state, subtotal, remove, setQty } = useCart();

  const items = state.items ?? [];

  // presente
  const [giftWrap, setGiftWrap] = React.useState(false);
  const giftWrapPrice = 32;

  // frete
  const [cep, setCep] = React.useState("");
  const [shippingLoading, setShippingLoading] = React.useState(false);
  const [shippingError, setShippingError] = React.useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = React.useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = React.useState<ShippingOption | null>(null);

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
        // opcional: valor declarado (seguro)
        insurance_value: subtotal,
        products: items.map((it) => ({
          quantity: it.qty ?? 1,
          weight: (it as any).weight ?? 0.03, // kg (joia é leve)
          height: (it as any).height ?? 8,    // cm
          width: (it as any).width ?? 12,     // cm
          length: (it as any).length ?? 16,   // cm
        })),
      };

      // CHAMA A FUNCTION NO PATH CERTO
      const res = await fetch("/.netlify/functions/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Falha ao calcular frete";
        try {
          const err = await res.json();

          // caso SuperFrete/Correios
          const errors = err?.errors || err?.error?.errors;
          const cepInvalid =
            errors?.["correios.destination_postcode"]?.[0] ||
            errors?.to_postcode?.[0] ||
            err?.message;

          if (cepInvalid && String(cepInvalid).toLowerCase().includes("inválido")) {
            msg = "CEP inválido";
          } else if (errors) {
            // pega a primeira msg de erro que existir
            const firstKey = Object.keys(errors)[0];
            msg = errors[firstKey]?.[0] || "Falha ao calcular frete";
          } else if (err?.message) {
            msg = err.message;
          }
        } catch {
          // se não for JSON, tenta texto
          const t = await res.text().catch(() => "");
          if (t) msg = t;
        }

        throw new Error(msg);
      }


      const data = await res.json();
      setShippingOptions(data.options ?? []);
      if (!data.options?.length) setShippingError("Nenhuma opção de frete encontrada.");
    } catch (e: any) {
      setShippingError(e?.message ?? "Erro ao calcular frete");
    } finally {
      setShippingLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* topo */}
        <div className="mb-10 text-center">
          <img
            src="/logo_fundo_claro3.svg"
            alt="Logo da loja"
            className="mx-auto h-[150px] w-auto object-contain"
          />
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Step label="Sacola" active Icon={ShoppingBag} />
            <div className="h-px flex-1 bg-gray-300 mx-4" />
            <Step label="Identificação" Icon={User} />
            <div className="h-px flex-1 bg-gray-300 mx-4" />
            <Step label="Pagamento" Icon={CreditCard} />
            <div className="h-px flex-1 bg-gray-300 mx-4" />
            <Step label="Confirmação" Icon={CheckCircle} />
          </div>

        </div>


        {/* layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ESQUERDA */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sacola */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sacola</h2>
                <span className="text-sm text-gray-500">{count} item(ns)</span>
              </div>

              <div className="divide-y">
                {items.map((it) => (
                  <div key={it.id} className="py-5 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md bg-gray-100 overflow-hidden">
                      {it.image ? (
                        <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>

                    <div className="flex-1">
                      <div className="font-semibold">{it.name}</div>
                      <div className="text-sm text-gray-500">{it.variant ?? ""}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="h-9 w-9 rounded border"
                        onClick={() => setQty(it.id, Math.max(1, (it.qty ?? 1) - 1))}
                      >
                        -
                      </button>
                      <div className="w-10 text-center">{it.qty ?? 1}</div>
                      <button
                        className="h-9 w-9 rounded border"
                        onClick={() => setQty(it.id, (it.qty ?? 1) + 1)}
                      >
                        +
                      </button>
                    </div>

                    <div className="w-28 text-right font-semibold">
                      {moneyBRL((it.price ?? 0) * (it.qty ?? 1))}
                    </div>

                    <button className="ml-2 text-gray-400 hover:text-black" onClick={() => remove(it.id)}>
                      ✕
                    </button>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="py-10 text-center text-gray-500">Seu carrinho está vazio.</div>
                )}
              </div>

              {/* Presente */}
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
                <div className="overflow-hidden rounded-lg">
                  <img
                    src="/banner_presente.svg"
                    alt="Embalagem para presente"
                    className="h-28 w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={giftWrap}
                      onChange={(e) => setGiftWrap(e.target.checked)}
                      className="h-5 w-5"
                    />
                    <div>
                      <div className="font-semibold">Adicionar embalagem para presente</div>
                      <div className="text-sm text-gray-500">Inclui embalagem premium + finalização</div>
                    </div>
                  </div>
                  <div className="font-semibold">{moneyBRL(giftWrapPrice)}</div>
                </label>
              </div>
            </div>
          </div>

          {/* DIREITA (TUDO AQUI DENTRO) */}
          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              {/* Cupom */}
              <div className="flex gap-3">
                <input placeholder="Cupom de Desconto" className="h-11 flex-1 rounded-md border px-3" />
                <button className="h-11 rounded-md border px-4 font-semibold">Adicionar</button>
              </div>

              <div className="my-6 h-px bg-gray-200" />

              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{moneyBRL(subtotal)}</span>
              </div>

              {/* Embalagem */}
              {giftWrap && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Embalagem para presente</span>
                  <span className="font-semibold">{moneyBRL(giftWrapPrice)}</span>
                </div>
              )}

              {/* FRETE (AGORA NO CARD DA DIREITA, ACIMA DO TOTAL) */}
              <div className="my-6 h-px bg-gray-200" />
              <div className="text-sm font-semibold mb-2">Entrega</div>

              <div className="flex gap-3 items-center">
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="Digite seu CEP"
                  className="h-11 flex-1 rounded-md border px-3"
                  inputMode="numeric"
                />
                <button
                  onClick={handleCalcShipping}
                  className="h-11 rounded-md border px-4 font-semibold"
                  disabled={shippingLoading || items.length === 0}
                  type="button"
                >
                  {shippingLoading ? "..." : "Calcular"}
                </button>
              </div>

              {shippingError && <div className="mt-2 text-sm text-red-600">{shippingError}</div>}

              {shippingOptions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {shippingOptions.map((op) => (
                    <label key={op.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping?.id === op.id}
                          onChange={() => setSelectedShipping(op)}
                        />
                        <div>
                          <div className="font-semibold">{op.name}</div>
                          <div className="text-xs text-gray-500">
                            {op.deadline ? `Entrega em até ${op.deadline} dias úteis` : ""}
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
                  <span className="text-gray-600">Frete ({selectedShipping.name})</span>
                  <span className="font-semibold">{moneyBRL(shippingPrice)}</span>
                </div>
              )}

              {/* Total */}
              <div className="my-6 h-px bg-gray-200" />
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">Total</span>
                <span className="text-xl font-semibold">{moneyBRL(total)}</span>
              </div>

              <button
                className="mt-6 w-full rounded-md bg-[#c9b38a] py-4 text-white font-semibold disabled:opacity-50"
                onClick={() => navigate("/checkout/identificacao")}
                type="button"
                disabled={items.length === 0 || !selectedShipping}
                title={!selectedShipping ? "Selecione o frete para continuar" : ""}
              >
                FINALIZAR COMPRA
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

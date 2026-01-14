// src/components/CartDrawer.tsx
import React, { useEffect, useMemo } from "react";
import { X, Trash2, Minus, Plus } from "lucide-react";
import type { CartItem } from "../context/CartContext";

type Props = {
  open: boolean;
  onClose: () => void;
  items?: CartItem[];
  subtotal: number;
  freeShippingThreshold?: number; // 699
  onContinueShopping: () => void;
  onCheckout?: () => void;
  onRemove: (id: string) => void;
  onSetQty: (id: string, qty: number) => void;
};

function moneyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CartDrawer({
  open,
  onClose,
  items,
  subtotal,
  freeShippingThreshold = 699,
  onContinueShopping,
  onCheckout,
  onRemove,
  onSetQty,
}: Props) {
  // garante que sempre é array
  const safeItems = Array.isArray(items) ? items : [];
  const hasItems = safeItems.length > 0;

  // blindagem (evita NaN/undefined)
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;

  const missingForFreeShipping = Math.max(0, freeShippingThreshold - safeSubtotal);
  const progress =
    freeShippingThreshold > 0
      ? Math.min(100, (safeSubtotal / freeShippingThreshold) * 100)
      : 0;

  // HOOKS SEMPRE ANTES DE QUALQUER RETURN
  const titleMsg = useMemo(() => {
    if (safeSubtotal <= 0) return null;
    if (missingForFreeShipping <= 0) return "Frete grátis desbloqueado ✨";
    return `Falta ${moneyBRL(missingForFreeShipping)} para frete grátis.`;
  }, [safeSubtotal, missingForFreeShipping]);

  // ESC fecha + trava scroll
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // AGORA sim pode retornar
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* overlay */}
      <button
        type="button"
        aria-label="Fechar carrinho"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      {/* painel */}
      <aside className="absolute right-0 top-0 h-full w-[92%] max-w-[480px] bg-[#FCFAF6] shadow-2xl flex flex-col">
        {/* topo */}
        <div className="shrink-0 border-t border-[#2b554e]/10 px-6 py-4 bg-[#FCFAF6]">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-[#2b554e]/70 hover:text-[#2b554e] transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* faixa frete */}
          <div className="mt-4 rounded-md bg-[#f3f0e0] px-4 py-3 text-sm text-[#2b554e] border border-[#2b554e]/10">
            <span>
              Compre a partir de <strong>R$699</strong> e ganhe <strong>FRETE GRÁTIS</strong>!
            </span>

            <div className="mt-3 h-1.5 w-full bg-[#2b554e]/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#b08d57] transition-all" style={{ width: `${progress}%` }} />
            </div>

            {titleMsg && <div className="mt-1 text-xs text-[#2b554e]/70">{titleMsg}</div>}
          </div>
        </div>

        {/* corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!hasItems ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-sm tracking-[0.25em] font-medium text-[#2b554e]">
                SUA SACOLA ESTÁ VAZIA.
              </p>
              <p className="mt-3 text-[#2b554e]/70 text-sm">Descubra peças que combinam com você.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeItems.map((it) => (
                <div key={it.id} className="flex gap-3 border-b border-[#2b554e]/10 pb-4">
                  <div className="h-20 w-20 bg-white border border-[#2b554e]/10 rounded-md overflow-hidden flex items-center justify-center">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-[#2b554e]/50">Sem imagem</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[#2b554e]">{it.name}</p>
                        {it.variant && <p className="text-xs text-[#2b554e]/60">{it.variant}</p>}
                        <p className="mt-1 text-sm text-[#2b554e]/80">{moneyBRL(it.price)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemove(it.id)}
                        className="text-[#2b554e]/60 hover:text-red-600 transition"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSetQty(it.id, Math.max(1, it.qty - 1))}
                        className="h-9 w-9 rounded-md border border-[#2b554e]/20 bg-white hover:border-[#b08d57]/50 hover:text-[#b08d57] transition flex items-center justify-center"
                        aria-label="Diminuir"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <div className="h-9 min-w-[44px] rounded-md border border-[#2b554e]/20 bg-white flex items-center justify-center text-sm text-[#2b554e]">
                        {it.qty}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSetQty(it.id, it.qty + 1)}
                        className="h-9 w-9 rounded-md border border-[#2b554e]/20 bg-white hover:border-[#b08d57]/50 hover:text-[#b08d57] transition flex items-center justify-center"
                        aria-label="Aumentar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      <div className="ml-auto text-sm text-[#2b554e]/80">
                        {moneyBRL(it.price * it.qty)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* rodapé */}
        <div className="border-t border-[#2b554e]/10 px-6 py-4 bg-[#FCFAF6]">
          {hasItems && (
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-[#2b554e]/70">Subtotal</span>
              <span className="font-medium text-[#2b554e]">{moneyBRL(safeSubtotal)}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onContinueShopping();
              onClose();
            }}
            className="w-full h-12 rounded-xl bg-[#f3f0e0] text-[#2b554e] font-semibold tracking-[0.18em] text-xs hover:opacity-90 transition"
          >
            CONTINUAR COMPRANDO
          </button>

          {hasItems && (
            <button
              type="button"
              onClick={() => onCheckout?.()}
              className="mt-3 w-full h-12 rounded-xl bg-[#2b554e] text-[#FCFAF6] font-semibold tracking-[0.18em] text-xs hover:opacity-95 transition"
            >
              FINALIZAR COMPRA
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

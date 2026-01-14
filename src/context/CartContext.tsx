// src/context/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number; // em R$
  image?: string;
  variant?: string;
  qty: number;
};

type CartState = { items: CartItem[] };

type Action =
  | { type: "ADD"; payload: Omit<CartItem, "qty"> & { qty?: number } }
  | { type: "REMOVE"; payload: { id: string } }
  | { type: "SET_QTY"; payload: { id: string; qty: number } }
  | { type: "CLEAR" };

type CartContextValue = {
  state: CartState;
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "heritage_cart_v1";

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD": {
      const qtyToAdd = Math.max(1, action.payload.qty ?? 1);
      const idx = state.items.findIndex((i) => i.id === action.payload.id);

      if (idx >= 0) {
        const items = [...state.items];
        items[idx] = { ...items[idx], qty: Math.min(99, items[idx].qty + qtyToAdd) };
        return { items };
      }
      return { items: [...state.items, { ...action.payload, qty: qtyToAdd }] };
    }

    case "REMOVE":
      return { items: state.items.filter((i) => i.id !== action.payload.id) };

    case "SET_QTY": {
      const qty = Math.max(1, Math.min(99, action.payload.qty));
      return {
        items: state.items.map((i) => (i.id === action.payload.id ? { ...i, qty } : i)),
      };
    }

    case "CLEAR":
      return { items: [] };

    default:
      return state;
  }
}

function loadInitial(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed?.items || !Array.isArray(parsed.items)) return { items: [] };
    return { items: parsed.items };
  } catch {
    return { items: [] };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const subtotal = useMemo(
    () => state.items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [state.items]
  );

  const count = useMemo(() => state.items.reduce((acc, it) => acc + it.qty, 0), [state.items]);

  const value: CartContextValue = useMemo(
    () => ({
      state,
      add: (item) => dispatch({ type: "ADD", payload: item }),
      remove: (id) => dispatch({ type: "REMOVE", payload: { id } }),
      setQty: (id, qty) => dispatch({ type: "SET_QTY", payload: { id, qty } }),
      clear: () => dispatch({ type: "CLEAR" }),
      count,
      subtotal,
    }),
    [state, count, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}

// src/context/CartContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number; // em R$
  image?: string;
  variant?: string;
  qty: number;

  // estoque
  stockQty?: number;
  available?: boolean;
};

type CartState = {
  items: CartItem[];
};

type AddPayload = Omit<CartItem, "qty"> & { qty?: number };

type Action =
  | { type: "ADD"; payload: AddPayload }
  | { type: "REMOVE"; payload: { id: string } }
  | { type: "SET_QTY"; payload: { id: string; qty: number } }
  | { type: "CLEAR" }
  | { type: "SYNC_STOCK"; payload: { id: string; stockQty: number; available?: boolean } };

type CartContextValue = {
  state: CartState;
  add: (item: AddPayload) => boolean;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => boolean;
  clear: () => void;
  syncStock: (id: string, stockQty: number, available?: boolean) => void;
  count: number;
  subtotal: number;
  hasUnavailableItems: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "heritage_cart_v1";

function isAvailable(item: Pick<CartItem, "stockQty" | "available">) {
  if (item.available === false) return false;
  if (typeof item.stockQty === "number" && item.stockQty <= 0) return false;
  return true;
}

function limitQty(qty: number, stockQty?: number) {
  const maxStock = typeof stockQty === "number" ? stockQty : 99;
  return Math.max(1, Math.min(99, maxStock, qty));
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD": {
      const itemAvailable = isAvailable(action.payload);

      if (!itemAvailable) {
        return state;
      }

      const qtyToAdd = Math.max(1, action.payload.qty ?? 1);
      const idx = state.items.findIndex((i) => i.id === action.payload.id);

      if (idx >= 0) {
        const items = [...state.items];
        const current = items[idx];

        const newQty = limitQty(
          current.qty + qtyToAdd,
          action.payload.stockQty ?? current.stockQty
        );

        items[idx] = {
          ...current,
          ...action.payload,
          qty: newQty,
        };

        return { items };
      }

      return {
        items: [
          ...state.items,
          {
            ...action.payload,
            qty: limitQty(qtyToAdd, action.payload.stockQty),
          },
        ],
      };
    }

    case "REMOVE":
      return {
        items: state.items.filter((i) => i.id !== action.payload.id),
      };

    case "SET_QTY":
      return {
        items: state.items.map((i) => {
          if (i.id !== action.payload.id) return i;

          if (!isAvailable(i)) {
            return i;
          }

          return {
            ...i,
            qty: limitQty(action.payload.qty, i.stockQty),
          };
        }),
      };

    case "SYNC_STOCK":
      return {
        items: state.items
          .map((i) => {
            if (i.id !== action.payload.id) return i;

            const stockQty = Number(action.payload.stockQty || 0);
            const available = action.payload.available ?? stockQty > 0;

            return {
              ...i,
              stockQty,
              available,
              qty: limitQty(i.qty, stockQty),
            };
          })
          .filter((i) => isAvailable(i)),
      };

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

    return {
      items: parsed.items.filter((item: CartItem) => isAvailable(item)),
    };
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

  const count = useMemo(
    () => state.items.reduce((acc, it) => acc + it.qty, 0),
    [state.items]
  );

  const hasUnavailableItems = useMemo(
    () => state.items.some((it) => !isAvailable(it)),
    [state.items]
  );

  const value: CartContextValue = useMemo(
    () => ({
      state,

      add: (item) => {
        if (!isAvailable(item)) {
          return false;
        }

        dispatch({ type: "ADD", payload: item });
        return true;
      },

      remove: (id) => dispatch({ type: "REMOVE", payload: { id } }),

      setQty: (id, qty) => {
        const item = state.items.find((i) => i.id === id);

        if (!item) return false;
        if (!isAvailable(item)) return false;

        if (typeof item.stockQty === "number" && qty > item.stockQty) {
          return false;
        }

        dispatch({ type: "SET_QTY", payload: { id, qty } });
        return true;
      },

      clear: () => dispatch({ type: "CLEAR" }),

      syncStock: (id, stockQty, available) =>
        dispatch({
          type: "SYNC_STOCK",
          payload: { id, stockQty, available },
        }),

      count,
      subtotal,
      hasUnavailableItems,
    }),
    [state, count, subtotal, hasUnavailableItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
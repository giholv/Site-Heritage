import React, { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCart } from "../context/CartContext";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  cream: "#fcfaf6",
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  qty?: number;
  variant?: string;
};

type CatalogProduct = {
  id: string;
  slug?: string;
  name: string;
  min_price_cents: number | null;
  image_path: string | null;
  image_alt: string | null;
  status?: string;
};

type Props = {
  items: CartItem[];
};

function moneyBRLFromCents(value: number | null) {
  return ((value ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalize(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function CombineWith({ items }: Props) {
  const { add } = useCart();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  const cartIds = useMemo(() => items.map((item) => item.id), [items]);

  const cartNames = useMemo(
    () => items.map((item) => normalize(item.name)),
    [items]
  );

  useEffect(() => {
    let active = true;

    async function loadSuggestions() {
      if (!items.length) {
        setProducts([]);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("v_catalog_products_with_filters")
          .select(
            `
            id,
            slug,
            name,
            min_price_cents,
            image_path,
            image_alt,
            status
          `
          )
          .eq("status", "active")
          .not("image_path", "is", null)
          .limit(24);

        if (error) throw error;

        const filtered = (data ?? [])
          .filter((product) => {
            const sameId = cartIds.includes(product.id);
            const sameName = cartNames.includes(normalize(product.name));
            return !sameId && !sameName;
          })
          .slice(0, 4);

        if (active) {
          setProducts(filtered);
        }
      } catch (error) {
        console.error("Erro ao carregar sugestões:", error);

        if (active) {
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSuggestions();

    return () => {
      active = false;
    };
  }, [items, cartIds, cartNames]);

  if (!items.length) return null;
  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-8 rounded-[32px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_48px_rgba(43,85,78,0.10)] backdrop-blur-xl sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4ecde] shadow-[0_8px_22px_rgba(176,141,87,0.18)]">
          <Sparkles className="h-5 w-5 text-[#b08d57]" />
        </div>

        <div>
          <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[#2b554e] sm:text-xl">
            Combine com
          </h3>

          <p className="mt-1 text-sm leading-relaxed text-[#7d746b]">
            Curadoria especial para completar sua escolha.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-[26px] border border-[#eee5d8] bg-[#fcfaf6]"
            >
              <div className="aspect-[4/5] animate-pulse bg-[#eee8df]" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-28 animate-pulse rounded-full bg-[#eee8df]" />
                <div className="h-5 w-full animate-pulse rounded-full bg-[#eee8df]" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-[#eee8df]" />
                <div className="h-11 w-full animate-pulse rounded-full bg-[#eee8df]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {products.map((product) => {
            const imageUrl = product.image_path
              ? supabase.storage
                  .from("product-images")
                  .getPublicUrl(product.image_path).data.publicUrl
              : "";

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-[26px] border border-white/70 bg-white/85 shadow-[0_12px_36px_rgba(43,85,78,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(43,85,78,0.14)]"
              >
                <div className="aspect-[4/5] overflow-hidden bg-[#f8f5ef]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.image_alt || product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#9b9288]">
                      Sem imagem
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <span className="inline-flex items-center rounded-full bg-[#f4ecde] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7a42]">
                    Curadoria Caléa
                  </span>

                  <h4 className="mt-3 line-clamp-2 min-h-[44px] text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[#2b554e]">
                    {product.name}
                  </h4>

                  <div className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-[#2b554e]">
                    {moneyBRLFromCents(product.min_price_cents)}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      add({
                        id: product.id,
                        name: product.name,
                        price: (product.min_price_cents ?? 0) / 100,
                        image: imageUrl,
                        qty: 1,
                      })
                    }
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2b554e] text-sm font-medium text-white shadow-[0_8px_20px_rgba(43,85,78,0.14)] transition duration-300 hover:brightness-95 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
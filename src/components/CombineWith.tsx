import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";
import { useCart } from "../context/CartContext";


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
  <section className="mt-8">
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#b08d57]">
          Curadoria Caléa
        </p>

        <h3 className="mt-1 text-lg font-light tracking-[-0.03em] text-[#2b554e]">
          Combine com sua escolha
        </h3>
      </div>
    </div>

    {loading ? (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="min-w-[150px] overflow-hidden rounded-[22px] bg-[#f8f5ef]"
          >
            <div className="aspect-[4/5] animate-pulse bg-[#eee8df]" />

            <div className="space-y-2 p-3">
              <div className="h-4 w-full animate-pulse rounded-full bg-[#eee8df]" />
              <div className="h-4 w-20 animate-pulse rounded-full bg-[#eee8df]" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
        {products.map((product) => {
          const imageUrl = product.image_path
            ? supabase.storage
                .from("product-images")
                .getPublicUrl(product.image_path).data.publicUrl
            : "";

          return (
            <article
              key={product.id}
              className="group min-w-[150px] max-w-[150px] sm:min-w-[180px] sm:max-w-[180px]"
            >
              <div className="overflow-hidden rounded-[24px] bg-[#f8f5ef] shadow-[0_10px_28px_rgba(43,85,78,0.06)] ring-1 ring-[#eee5d8]">
                <div className="aspect-[4/5] overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.image_alt || product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#9b9288]">
                      Sem imagem
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3">
                <h4 className="line-clamp-2 min-h-[38px] text-sm font-medium leading-5 text-[#2b554e]">
                  {product.name}
                </h4>

                <p className="mt-1 text-sm font-semibold text-[#2b554e]">
                  {moneyBRLFromCents(product.min_price_cents)}
                </p>

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
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#d8d1c6] bg-white px-4 text-xs font-semibold text-[#2b554e] transition hover:border-[#2b554e] hover:bg-[#2b554e] hover:text-white"
                >
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
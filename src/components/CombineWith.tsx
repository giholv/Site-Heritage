import React, { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCart } from "../context/CartContext";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
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

function moneyBRLFromCents(v: number | null) {
  return ((v ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalize(str: string) {
  return String(str ?? "")
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
    async function loadSuggestions() {
      if (!items.length) {
        setProducts([]);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("v_catalog_products_with_filters")
          .select(`
            id,
            slug,
            name,
            min_price_cents,
            image_path,
            image_alt,
            status
          `)
          .eq("status", "active")
          .not("image_path", "is", null)
          .limit(20);

        if (error) throw error;

        const filtered = (data ?? []).filter((product) => {
          const sameId = cartIds.includes(product.id);
          const sameName = cartNames.includes(normalize(product.name));
          return !sameId && !sameName;
        });

        setProducts(filtered.slice(0, 4));
      } catch (err) {
        console.error("Erro ao carregar sugestões:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadSuggestions();
  }, [items, cartIds, cartNames]);

  if (!items.length) return null;
  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-6 rounded-[24px] border bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "#f4ecde" }}
        >
          <Sparkles className="h-5 w-5" style={{ color: CALEA.accent }} />
        </div>

        <div>
          <h3
            className="text-base font-semibold sm:text-lg"
            style={{ color: CALEA.primary }}
          >
            Combine com
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Outras joias para complementar sua escolha.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Carregando sugestões...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => {
            const imageUrl = product.image_path
              ? supabase.storage
                  .from("product-images")
                  .getPublicUrl(product.image_path).data.publicUrl
              : "";

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-[20px] border border-[#ece2d4] bg-[#fcfaf6]"
              >
                <div className="aspect-square overflow-hidden bg-white">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.image_alt || product.name}
                      className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      Sem imagem
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-4">
                  <span className="inline-flex rounded-full bg-[#efe6d7] px-2.5 py-1 text-[11px] font-medium text-[#8b6b2f]">
                    Sugestão para você
                  </span>

                  <h4
                    className="mt-2 line-clamp-2 min-h-[40px] text-sm font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    {product.name}
                  </h4>

                  <div
                    className="mt-2 text-base font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    {moneyBRLFromCents(product.min_price_cents)}
                  </div>

                  <button
                    type="button"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                    style={{ backgroundColor: CALEA.primary }}
                    onClick={() =>
                      add({
                        id: product.id,
                        name: product.name,
                        price: (product.min_price_cents ?? 0) / 100,
                        image: imageUrl,
                        qty: 1,
                      })
                    }
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
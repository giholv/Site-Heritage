import  { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabase";

const FAVORITES_KEY = "calea_favorites";
const VIEW = "v_catalog_products_with_filters";
const BUCKET = "product-images";

type FavoriteProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
};

function imageUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function FavoritosPage() {
  const navigate = useNavigate();

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Favoritos | Caléa";

    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      const ids = saved ? JSON.parse(saved) : [];
      setFavoriteIds(Array.isArray(ids) ? ids : []);
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadFavorites() {
      if (favoriteIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from(VIEW)
        .select("id,slug,name,min_price_cents,image_path,status")
        .eq("status", "active")
        .in("id", favoriteIds);

      if (!alive) return;

      if (error) {
        console.error("Erro ao carregar favoritos:", error.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      const mapped: FavoriteProduct[] = (data ?? []).map((item: any) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        price: Number((item.min_price_cents ?? 0) / 100),
        image: imageUrl(item.image_path),
      }));

      setProducts(mapped);
      setLoading(false);
    }

    loadFavorites();

    return () => {
      alive = false;
    };
  }, [favoriteIds]);

  const orderedProducts = useMemo(() => {
    const positions = new Map(
      favoriteIds.map((id, index) => [id, index] as const)
    );

    return [...products].sort(
      (a, b) =>
        (positions.get(a.id) ?? 9999) - (positions.get(b.id) ?? 9999)
    );
  }, [products, favoriteIds]);

  function removeFavorite(productId: string) {
    const next = favoriteIds.filter((id) => id !== productId);

    setFavoriteIds(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("calea-favorites-updated"));
  }

  return (
    <div className="min-h-screen bg-[#FCFAF6] text-[#173a35]">
      <Header />

      <main className="pt-[96px] md:pt-[108px]">
        <section className="mx-auto max-w-[1500px] px-4 py-10 md:px-7 md:py-14 xl:px-10">
          <div className="max-w-[620px]">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b8176]">
              Sua seleção
            </div>

            <h1 className="mt-2 text-[34px] font-medium leading-tight text-[#2b554e] md:text-[44px]">
              Favoritos
            </h1>

            <div className="mt-3 h-px w-14 bg-[#b08d57]" />

            <p className="mt-4 text-[14px] leading-6 text-[#6f655b] md:text-[15px]">
              As peças que você salvou para ver depois.
            </p>
          </div>

          {loading ? (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[3/4] bg-[#eee7dc]" />
                  <div className="mt-3 h-4 w-3/4 bg-[#eee7dc]" />
                  <div className="mt-2 h-4 w-1/3 bg-[#eee7dc]" />
                </div>
              ))}
            </div>
          ) : orderedProducts.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">
              {orderedProducts.map((product) => (
                <article
                  key={product.id}
                  className="group min-w-0 cursor-pointer"
                  onClick={() =>
                    navigate(`/produto/${product.slug}?from=favoritos`)
                  }
                >
                  <div className="relative overflow-hidden bg-[#f3efe8]">
                    <div className="aspect-[3/4] overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#eee7dc]" />
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label={`Remover ${product.name} dos favoritos`}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFavorite(product.id);
                      }}
                      className="absolute bottom-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#173a35] text-white shadow-sm transition hover:scale-105"
                    >
                      <Heart
                        className="h-[19px] w-[19px]"
                        strokeWidth={1.5}
                        fill="currentColor"
                      />
                    </button>
                  </div>

                  <div className="pb-1 pt-3">
                    <h2 className="truncate text-[14px] font-normal leading-snug text-[#2b2b2b] md:text-[15px]">
                      {product.name}
                    </h2>

                    <div className="mt-2 text-[15px] font-semibold leading-none text-[#173a35] md:text-[16px]">
                      {formatBRL(product.price)}
                    </div>

                    <div className="mt-1.5 text-[12px] text-[#6e6a64]">
                      6x de {formatBRL(product.price / 6)} sem juros
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-14 border-t border-[#e8dfd2] py-16 text-center">
              <Heart
                className="mx-auto h-7 w-7 text-[#b08d57]"
                strokeWidth={1.4}
              />
              <h2 className="mt-4 text-[22px] font-medium text-[#2b554e]">
                Você ainda não salvou nenhuma peça.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#6f655b]">
                Toque no coração dos produtos para criar sua seleção.
              </p>
              <button
                type="button"
                onClick={() => navigate("/joias")}
                className="mt-6 border-b border-[#173a35] pb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-[#173a35]"
              >
                Ver joias
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Peca = {
  id: string;
  slug: string;
  nome: string;
  preco: number;
  imagem: string;
  tag?: string;
  searchTags: string[];
  tagSlugs: string[];
};

type TabKey = "novidades" | "best-sellers" | "essenciais";

const VIEW = "v_catalog_products_with_filters";
const BUCKET = "product-images";
const FAVORITES_KEY = "calea_favorites";

const TABS: { key: TabKey; label: string }[] = [
  { key: "novidades", label: "Novidades" },
  { key: "best-sellers", label: "Best Sellers" },
  { key: "essenciais", label: "Essenciais" },
];

function imgUrl(path?: string | null) {
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

function getInstallment(value: number) {
  return formatBRL(value / 6);
}

function includesAny(values: string[], options: string[]) {
  const normalized = values.map((value) => value.toLowerCase());
  return options.some((option) => normalized.includes(option.toLowerCase()));
}

function getBadge(peca: Peca) {
  if (includesAny(peca.searchTags, ["lancamento"])) return "NOVIDADE";
  return null;
}

function ProductCard({
  peca,
  onOpen,
  isFavorite,
  onToggleFavorite,
}: {
  peca: Peca;
  onOpen: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const badge = getBadge(peca);

  return (
    <article
      onClick={onOpen}
      className="group min-w-0 cursor-pointer"
    >
      <div className="relative overflow-hidden bg-[#f3efe8]">
        <div className="aspect-[3/4] overflow-hidden">
          {peca.imagem ? (
            <img
              src={peca.imagem}
              alt={peca.nome}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            />
          ) : (
            <div className="h-full w-full bg-[#eee7dc]" />
          )}
        </div>

        {badge && (
          <span className="absolute left-3 top-3 bg-[#173a35]/88 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
            {badge}
          </span>
        )}

        <button
          type="button"
          aria-label={
            isFavorite
              ? `Remover ${peca.nome} dos favoritos`
              : `Favoritar ${peca.nome}`
          }
          aria-pressed={isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          className={[
            "absolute bottom-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-full",
            "shadow-sm backdrop-blur-sm transition duration-200 hover:scale-105",
            isFavorite
              ? "bg-[#173a35] text-white"
              : "bg-[#FCFAF6]/90 text-[#173a35] hover:bg-white",
          ].join(" ")}
        >
          <Heart
            className="h-[19px] w-[19px]"
            strokeWidth={1.5}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="pt-3 pb-1">
        <h3 className="truncate text-[15px] font-normal leading-snug text-[#2b2b2b] md:text-[17px]">
          {peca.nome}
        </h3>

        <div className="mt-2 text-[16px] font-semibold leading-none text-[#173a35] md:text-[17px]">
          {formatBRL(peca.preco)}
        </div>

        <div className="mt-1.5 text-[13px] text-[#6e6a64] md:text-[13px]">
          6x de {getInstallment(peca.preco)} sem juros
        </div>
      </div>
    </article>
  );
}

export default function SemijoiasCarousel() {
  const navigate = useNavigate();
  const location = useLocation();
  const carouselRef = useRef<HTMLDivElement>(null);

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("novidades");
  const [sales90d, setSales90d] = useState<Record<string, number>>({});
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");

    if (
      tab === "novidades" ||
      tab === "best-sellers" ||
      tab === "essenciais"
    ) {
      setActiveTab(tab);
    }

  }, [location.search, location.hash]);


  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      const parsed = saved ? JSON.parse(saved) : [];

      setFavoriteIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];

      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("calea-favorites-updated"));
      return next;
    });
  }

  useEffect(() => {
    let alive = true;

    async function loadBestSellers90d() {
      const { data, error } = await supabase.rpc(
        "get_public_best_sellers"
      );

      if (!alive) return;

      if (error) {
        console.error(
          "Erro ao carregar Best Sellers:",
          error.message
        );

        setSales90d({});
        return;
      }

      const ranking = Array.isArray(data) ? data : [];

      if (!ranking.length) {
        setSales90d({});
        return;
      }

      const skuIds = ranking
        .map((item: any) => item.sku_id)
        .filter(Boolean);

      if (!skuIds.length) {
        setSales90d({});
        return;
      }

      /*
       * A RPC retorna SKU.
       * O carousel trabalha com PRODUCT ID.
       * Então convertemos SKU -> product_id.
       */
      const { data: skus, error: skuError } = await supabase
        .from("skus")
        .select("id, product_id")
        .in("id", skuIds);

      if (!alive) return;

      if (skuError) {
        console.error(
          "Erro ao relacionar SKUs aos produtos:",
          skuError.message
        );

        setSales90d({});
        return;
      }

      const skuToProduct = new Map<string, string>();

      (skus ?? []).forEach((sku: any) => {
        if (sku?.id && sku?.product_id) {
          skuToProduct.set(sku.id, sku.product_id);
        }
      });

      const totals: Record<string, number> = {};

      ranking.forEach((item: any) => {
        const productId = skuToProduct.get(item.sku_id);

        if (!productId) return;

        totals[productId] =
          (totals[productId] ?? 0) +
          Number(item.total_sold ?? 0);
      });

      setSales90d(totals);
    }
    async function loadProducts() {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from(VIEW)
        .select(
          "id,slug,name,min_price_cents,image_path,status,search_tags,tag_slugs,created_at"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setPecas([]);
        setLoading(false);
        return;
      }

      const mapped: Peca[] = (data ?? []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        nome: p.name,
        preco: Number((p.min_price_cents ?? 0) / 100),
        imagem: imgUrl(p.image_path),
        searchTags: Array.isArray(p.search_tags) ? p.search_tags : [],
        tagSlugs: Array.isArray(p.tag_slugs) ? p.tag_slugs : [],
      }));

      setPecas(mapped);
      setLoading(false);
    }

    loadProducts();
    loadBestSellers90d();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === "novidades") {
      return pecas.filter((peca) =>
        includesAny(peca.searchTags, ["lancamento"])
      );
    }

    if (activeTab === "best-sellers") {
      return [...pecas]
        .filter((peca) => (sales90d[peca.id] ?? 0) > 0)
        .sort(
          (a, b) =>
            (sales90d[b.id] ?? 0) - (sales90d[a.id] ?? 0)
        )
        .slice(0, 12);
    }

    return pecas.filter((peca) =>
      includesAny(peca.searchTags, [
        "essencial",
        "essenciais",
        "basico",
        "básico",
        "basics",
      ])
    );
  }, [activeTab, pecas, sales90d]);

  useEffect(() => {
    carouselRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeTab]);

  function scroll(direction: "left" | "right") {
    const el = carouselRef.current;
    if (!el) return;

    const amount = Math.max(el.clientWidth * 0.72, 300);

    el.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <section
      id="semijoias"
      className="bg-[#FCFAF6] py-8 md:py-12 lg:py-14 scroll-mt-[110px]"
    >
      <div className="mx-auto w-full max-w-[1560px]">
        <div className="mx-auto mb-5 max-w-[1500px] px-4 md:mb-6 md:px-6 lg:px-10">
          <div className="max-w-[520px]">
            <h2 className="mt-2 text-[36px] font-medium leading-[1.02] text-[#2b554e] md:text-[44px]">
              <span className="mt-1 block font-serif font-normal italic tracking-[-0.02em]">
                Escolhas Caléa
              </span>
            </h2>

            <div className="mt-3 h-px w-14 bg-[#b08d57]" />

            <p className="mt-4 text-[15px] leading-7 text-[#6f655b] md:text-[17px]">
              Descubra as peças que estão em alta na Caléa.
            </p>
          </div>
        </div>

        <div className="mb-5 flex justify-center md:mb-6">
          <nav
            className="flex items-center gap-8 md:gap-16 lg:gap-20"
            aria-label="Filtrar produtos"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "relative pb-2 text-[16px] transition-colors md:text-[18px]",
                    active
                      ? "font-medium text-[#173a35]"
                      : "font-normal text-[#45423f] hover:text-[#173a35]",
                  ].join(" ")}
                >
                  {tab.label}

                  <span
                    className={[
                      "absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-[#173a35] transition-all duration-300",
                      active ? "w-full opacity-100" : "w-0 opacity-0",
                    ].join(" ")}
                  />
                </button>
              );
            })}
          </nav>
        </div>

        {err && (
          <div className="px-5 pb-5 text-center text-sm text-red-600">
            Erro ao carregar produtos: {err}
          </div>
        )}

        <div className="relative">
          {loading ? (
            <div className="flex justify-center gap-4 overflow-hidden px-4 md:gap-6 md:px-6 lg:px-10">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="w-[72vw] max-w-[300px] shrink-0 animate-pulse sm:w-[44vw] md:w-[30vw] lg:w-[260px] xl:w-[280px]"
                >
                  <div className="aspect-[3/4] bg-[#eee7dc]" />
                  <div className="mt-3 h-4 w-3/4 bg-[#eee7dc]" />
                  <div className="mt-2 h-4 w-1/3 bg-[#eee7dc]" />
                </div>
              ))}
            </div>
          ) : filtered.length ? (
            <>
              <div
                ref={carouselRef}
                className="
                  grid grid-flow-col
                  auto-cols-[72vw]
                  gap-4 overflow-x-auto
                  scroll-smooth px-4 pb-3
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden

                  sm:auto-cols-[44vw]
                  md:auto-cols-[30vw] md:gap-6 md:px-6

                  lg:auto-cols-[260px]
                  lg:justify-start
                  lg:px-10

                  xl:auto-cols-[280px]
                  xl:gap-6
                "
              >
                {filtered.map((peca) => (
                  <ProductCard
                    key={peca.id}
                    peca={peca}
                    onOpen={() =>
                      navigate(`/produto/${peca.slug}?from=semijoias`)
                    }
                    isFavorite={favoriteIds.includes(peca.id)}
                    onToggleFavorite={() => toggleFavorite(peca.id)}
                  />
                ))}
              </div>

              {filtered.length > 4 && (
                <>
                  <button
                    type="button"
                    aria-label="Produtos anteriores"
                    onClick={() => scroll("left")}
                    className="
                      absolute -left-1 top-[40%] hidden h-10 w-10 -translate-y-1/2
                      items-center justify-center rounded-full border border-[#173a35]/10
                      bg-[#FCFAF6]/92 text-[#173a35] shadow-sm backdrop-blur-md
                      transition hover:bg-white lg:flex
                    "
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                  </button>

                  <button
                    type="button"
                    aria-label="Próximos produtos"
                    onClick={() => scroll("right")}
                    className="
                      absolute -right-1 top-[40%] hidden h-10 w-10 -translate-y-1/2
                      items-center justify-center rounded-full border border-[#173a35]/10
                      bg-[#FCFAF6]/92 text-[#173a35] shadow-sm backdrop-blur-md
                      transition hover:bg-white lg:flex
                    "
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="px-5 py-16 text-center">
              <p className="text-[14px] text-[#6e6a64]">
                Nenhuma peça cadastrada nesta categoria ainda.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
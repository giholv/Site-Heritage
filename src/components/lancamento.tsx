import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase"; // ajuste o caminho

type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  min_price_cents: number | null;
  image_path: string | null;
  image_alt: string | null;
  tag_slugs: string[] | null;
  created_at: string;
  status: string;
};

const PRODUCT_BUCKET = "product-images"; // <<< TROQUE pro seu bucket real
const FEATURE_TAG = "destaque"; // <<< TROQUE pra "lancamentos" se preferir

function moneyBRLFromCents(cents?: number | null) {
  const v = ((cents ?? 0) / 100) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function publicUrl(bucket: string, path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function pickBadge(tagSlugs?: string[] | null) {
  const t = tagSlugs ?? [];
  if (t.includes("novo")) return "Novo";
  if (t.includes("destaque")) return "Destaque";
  if (t.includes("mais-vendido")) return "Mais vendido";
  return undefined;
}

export default function Semijoias() {
  const navigate = useNavigate();

  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("v_catalog_products")
        .select("id,slug,name,min_price_cents,image_path,image_alt,tag_slugs,created_at,status")
        .eq("status", "active")
        .contains("tag_slugs", [FEATURE_TAG])
        .order("created_at", { ascending: false })
        .limit(12);

      if (!alive) return;

      if (error) {
        console.error("Semijoias:", error.message);
        setItems([]);
      } else {
        setItems((data ?? []) as CatalogProduct[]);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const scrollBy = (dir: "left" | "right") => {
    const el = document.getElementById("lancamentos-scroll");
    if (!el) return;
    const step = Math.max(320, Math.floor(el.clientWidth * 0.8));
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  };

  const title = useMemo(() => {
    // Se FEATURE_TAG for destaque, o texto “Lançamentos” pode continuar como na sua imagem.
    return "Linha SEMIJOIAS";
  }, []);

  return (
    <section id="lancamentos" className="bg-[#FCFAF6] py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-[#2b554e]">{title}</h2>
          <div className="mx-auto mt-4 h-[2px] w-24 bg-[#b08d57] rounded-full" />
          <p className="mt-6 text-sm md:text-base text-black/55">
            Peças com banho premium — brilho marcante, acabamento impecável.
          </p>
        </div>

        <div className="relative mt-12">
          {/* setas */}
          <button
            type="button"
            onClick={() => scrollBy("left")}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/90 border border-black/10 shadow-sm"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5 text-[#2b554e]" />
          </button>

          <button
            type="button"
            onClick={() => scrollBy("right")}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/90 border border-black/10 shadow-sm"
            aria-label="Próximo"
          >
            <ChevronRight className="h-5 w-5 text-[#2b554e]" />
          </button>

          {/* trilho */}
          <div
            id="lancamentos-scroll"
            className="flex gap-6 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory"
          >
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="min-w-[260px] md:min-w-[320px] snap-start rounded-3xl bg-white/80 border border-black/10 overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/5] bg-black/5" />
                  <div className="p-5">
                    <div className="h-4 bg-black/5 rounded w-2/3" />
                    <div className="h-4 bg-black/5 rounded w-1/3 mt-3" />
                    <div className="h-10 bg-black/5 rounded-2xl mt-5" />
                  </div>
                </div>
              ))}

            {!loading &&
              items.map((p) => {
                const img = publicUrl(PRODUCT_BUCKET, p.image_path);
                const badge = pickBadge(p.tag_slugs);

                return (
                  <div
                    key={p.id}
                    className="min-w-[260px] md:min-w-[340px] snap-start rounded-3xl bg-white/80 border border-black/10 overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="relative">
                      <div className="aspect-[4/5] bg-black/5">
                        {img ? (
                          <img
                            src={img}
                            alt={p.image_alt ?? p.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>

                      {badge && (
                        <span className="absolute top-4 left-4 text-xs font-semibold bg-[#2b554e] text-[#F8F3EA] px-3 py-1 rounded-full">
                          {badge}
                        </span>
                      )}
                    </div>

                    <div className="p-6">
                      <div className="text-xl font-semibold text-[#2b554e]">{p.name}</div>
                      <div className="mt-2 text-sm text-black/55">Minimalista • combina com tudo</div>

                      <div className="mt-4 text-lg font-semibold text-[#b08d57]">
                        {moneyBRLFromCents(p.min_price_cents)}
                      </div>

                      <div className="mt-5 flex gap-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/produto/${p.slug}`)}
                          className="flex-1 h-11 rounded-2xl bg-[#2b554e] text-white text-sm font-semibold"
                        >
                          Ver
                        </button>

                        <Link
                          to={`/produto/${p.slug}`}
                          className="h-11 px-5 inline-flex items-center justify-center rounded-2xl border border-[#2b554e]/15 text-[#2b554e] text-sm font-semibold hover:text-[#b08d57] hover:border-[#b08d57]/35 transition"
                        >
                          Detalhes
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

            {!loading && items.length === 0 && (
              <div className="w-full rounded-3xl bg-white/80 border border-black/10 p-10 text-center text-black/60">
                Nenhum produto marcado como “{FEATURE_TAG}”.
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/joias"
            className="inline-flex h-11 px-6 items-center justify-center rounded-2xl bg-white/80 border border-black/10 text-sm font-semibold text-[#2b554e] hover:shadow-sm transition"
          >
            Ver catálogo completo
          </Link>
        </div>
      </div>
    </section>
  );
}
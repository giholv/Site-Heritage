import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase"; // ajuste o caminho

type Category = {
  id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  position: number;
};

const CATEGORY_BUCKET = "product-images"; // ajuste se necessário

function publicUrl(bucket: string, path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export default function EncontreSuaJoia() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // carousel controls
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  const scrollByCards = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.85);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("category_tree")
        .select("id,name,slug,cover_image_path,position,parent_id,active")
        .eq("active", true)
        .is("parent_id", null)
        .order("position", { ascending: true });

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setCats([]);
      } else {
        setCats((data ?? []) as Category[]);
      }

      setLoading(false);

      // dá um tempo pro DOM calcular scrollWidth
      requestAnimationFrame(updateArrows);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateArrows();

    const onScroll = () => updateArrows();
    const onResize = () => updateArrows();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll as any);
      window.removeEventListener("resize", onResize);
    };
  }, [cats.length]);

  return (
    <section id="categorias" className="bg-[#FCFAF6] py-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.18em] text-black/45 uppercase">Catálogo</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold text-[#2b554e]">
              Encontre sua joia
            </h2>
            <div className="mt-3 h-[2px] w-20 bg-[#b08d57] rounded-full" />
            <p className="mt-3 text-sm text-black/55">
              Selecione uma categoria para ver todas as peças.
            </p>

            {err && <div className="mt-3 text-sm text-red-600">Erro: {err}</div>}
          </div>

          <Link
            to="/joias"
            className="hidden md:inline-flex h-11 px-5 rounded-2xl bg-white/80 border border-black/10 text-sm font-semibold text-[#2b554e] hover:shadow-sm transition"
          >
            Ver tudo
          </Link>
        </div>

        {/* CAROUSEL */}
        <div className="relative mt-8">
          {/* botão esquerda */}
          {canLeft && (
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              aria-label="Voltar categorias"
              className="hidden md:inline-flex absolute -left-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white shadow-xl border border-black/10 items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-[#2b554e]" />
            </button>
          )}

          {/* botão direita */}
          {canRight && (
            <button
              type="button"
              onClick={() => scrollByCards("right")}
              aria-label="Avançar categorias"
              className="hidden md:inline-flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white shadow-xl border border-black/10 items-center justify-center"
            >
              <ChevronRight className="h-5 w-5 text-[#2b554e]" />
            </button>
          )}

          <div
            ref={scrollerRef}
            className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 pr-2
                       [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="snap-start shrink-0 w-[260px] md:w-[300px] rounded-3xl overflow-hidden border border-black/10 bg-white/80 animate-pulse"
                >
                  <div className="aspect-[4/3] bg-black/5" />
                  <div className="p-4">
                    <div className="h-4 bg-black/5 rounded w-2/3" />
                    <div className="h-3 bg-black/5 rounded w-1/3 mt-3" />
                  </div>
                </div>
              ))}

            {!loading &&
              cats.map((c) => {
                const img = publicUrl(CATEGORY_BUCKET, c.cover_image_path);
                return (
                  <Link
                    key={c.id}
                    to={`/joias/categoria/${c.slug}`}
                    className="snap-start shrink-0 w-[260px] md:w-[300px] group rounded-3xl overflow-hidden border border-black/10 bg-white/80 shadow-sm hover:shadow-md transition"
                  >
                    <div className="aspect-[4/3] bg-black/5">
                      {img ? (
                        <img
                          src={img}
                          alt={c.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                          loading="lazy"
                        />
                      ) : null}
                    </div>

                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#2b554e]">{c.name}</div>
                        <div className="mt-1 text-xs text-black/50">Ver peças</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#2b554e]/40" />
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        <div className="mt-8 md:hidden">
          <Link
            to="/joias"
            className="inline-flex w-full h-11 items-center justify-center rounded-2xl bg-[#2b554e] text-white text-sm font-semibold"
          >
            Ver todo o catálogo
          </Link>
        </div>
      </div>
    </section>
  );
}
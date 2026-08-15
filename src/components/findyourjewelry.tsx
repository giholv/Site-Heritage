import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";

type Category = {
  id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  position: number;
};

const CATEGORY_BUCKET = "product-images";

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

    const amount = Math.max(el.clientWidth * 0.72, 300);

    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
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
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [cats.length]);

  return (
    <section
      id="categorias"
      className="bg-[#FCFAF6] pt-0 pb-10 md:pt-2 md:pb-14 lg:pt-3 lg:pb-16 scroll-mt-[120px]"
    >
      <div className="mx-auto w-full max-w-[1560px] px-4 md:px-6 lg:px-10">
        {/* CABEÇALHO */}
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-[560px]">
            <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#8b8176] md:text-[12px]">
              Catálogo
            </p>

            <h2 className="mt-2 text-[36px] font-medium leading-[1.03] tracking-[-0.02em] text-[#2b554e] md:text-[44px]">
              Encontre sua
              <span className="block font-serif font-normal italic">
                joia.
              </span>
            </h2>

            <div className="mt-4 h-px w-14 bg-[#b08d57]" />

            <p className="mt-4 text-[15px] leading-7 text-[#6f655b] md:text-[17px]">
              Explore por categoria e descubra a peça que combina com o seu momento.
            </p>

            {err && (
              <div className="mt-3 text-sm text-red-600">
                Erro ao carregar categorias: {err}
              </div>
            )}
          </div>

          <Link
            to="/joias"
            className="group hidden items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b554e] transition hover:text-[#b08d57] md:inline-flex"
          >
            Ver todo o catálogo
            <span className="h-px w-10 bg-[#b08d57] transition-all duration-300 group-hover:w-14" />
          </Link>
        </div>

        {/* CARROSSEL */}
        <div className="relative mt-7 md:mt-9">
          {canLeft && (
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              aria-label="Voltar categorias"
              className="absolute -left-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#173a35]/10 bg-[#FCFAF6]/92 text-[#173a35] shadow-sm backdrop-blur-md transition hover:bg-white lg:flex"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          )}

          {canRight && (
            <button
              type="button"
              onClick={() => scrollByCards("right")}
              aria-label="Avançar categorias"
              className="absolute -right-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#173a35]/10 bg-[#FCFAF6]/92 text-[#173a35] shadow-sm backdrop-blur-md transition hover:bg-white lg:flex"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
            </button>
          )}

          <div
            ref={scrollerRef}
            className="
              grid grid-flow-col
              auto-cols-[72vw]
              gap-4 overflow-x-auto
              scroll-smooth pb-3
              snap-x snap-mandatory
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden

              sm:auto-cols-[44vw]
              md:auto-cols-[30vw] md:gap-6
              lg:auto-cols-[260px]
              xl:auto-cols-[280px]
            "
          >
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="snap-start animate-pulse"
                >
                  <div className="aspect-[3/4] bg-[#eee7dc]" />
                  <div className="mt-3 h-4 w-1/2 bg-[#eee7dc]" />
                  <div className="mt-2 h-3 w-1/3 bg-[#eee7dc]" />
                </div>
              ))}

            {!loading &&
              cats.map((c) => {
                const img = publicUrl(CATEGORY_BUCKET, c.cover_image_path);

                return (
                  <Link
                    key={c.id}
                    to={`/joias/categoria/${c.slug}`}
                    className="group snap-start"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#f3efe8]">
                      {img ? (
                        <img
                          src={img}
                          alt={c.name}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#eee7dc]" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-70" />

                      <span className="absolute bottom-4 left-4 text-[12px] font-medium uppercase tracking-[0.18em] text-white/90">
                        Explorar
                      </span>
                    </div>

                    <div className="pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-[16px] font-medium leading-tight text-[#2b554e] md:text-[17px]">
                          {c.name}
                        </h3>

                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[#2b554e]/45 transition-transform duration-300 group-hover:translate-x-1"
                          strokeWidth={1.5}
                        />
                      </div>

                      <p className="mt-1 text-[12px] text-[#6f655b] md:text-[13px]">
                        Ver peças
                      </p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        <div className="mt-5 md:hidden">
          <Link
            to="/joias"
            className="group inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b554e]"
          >
            Ver todo o catálogo
            <span className="h-px w-9 bg-[#b08d57]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
import React, { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Category = {
  title: string;
  slug: string;
  image: string;
  filters?: Record<string, string>;
};

function toQuery(filters?: Record<string, string>) {
  if (!filters) return "";
  const qs = new URLSearchParams(filters);
  const str = qs.toString();
  return str ? `?${str}` : "";
}

const FALLBACK = "/cats/fallback.jpg";

export default function CategoriesStrip() {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo<Category[]>(
    () => [
      { title: "Anéis", slug: "aneis", image: "/cats/Aneis.jpg" },
      { title: "Brincos", slug: "brincos", image: "/cats/Brincos.jpg" },
      { title: "Colares", slug: "colares", image: "/cats/Colares.jpg" },
      { title: "Pulseiras", slug: "pulseiras", image: "/cats/Pulseiras.jpg" },
      { title: "Pingentes", slug: "pingentes", image: "/cats/Pingentes.jpg" },
      { title: "Relicários", slug: "relicarios", image: "/cats/Relicarios.jpg" },
      {
        title: "Lançamentos",
        slug: "lancamentos",
        image: "/cats/Lancamentos.jpg",
        filters: { tag: "lancamento" },
      },
    ],
    []
  );

  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const onClick = (c: Category) => {
    navigate(`/joias/${c.slug}${toQuery(c.filters)}`);
  };

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.75) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="bg-[#FCFAF6] mt-10 md:mt-14">
      <div className="container mx-auto px-4 md:px-6">
        {/* topo */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e]">
            Encontre sua <span className="text-[#b08d57]">JOIA</span>
          </h2>
          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mt-4 mb-4 rounded-full" />
          <p className="text-[#2b554e]/80 text-base md:text-lg">
            Joias para seu dia a dia — leve, elegante e atemporal.
          </p>
        </div>

        {/* carrossel com setas flutuantes */}
        <div className="relative">
          {/* seta esquerda (desktop) */}
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Voltar"
            className={[
              "hidden md:flex items-center justify-center",
              "absolute left-0 top-1/2 -translate-y-1/2 z-10",
              "h-12 w-12 rounded-full bg-white border border-black/10 shadow-sm",
              "text-[#2b554e] hover:bg-black/5 transition",
              // distância da borda
              "ml-2",
            ].join(" ")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* seta direita (desktop) */}
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Avançar"
            className={[
              "hidden md:flex items-center justify-center",
              "absolute right-0 top-1/2 -translate-y-1/2 z-10",
              "h-12 w-12 rounded-full bg-white border border-black/10 shadow-sm",
              "text-[#2b554e] hover:bg-black/5 transition",
              "mr-2",
            ].join(" ")}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* trilho (padding lateral = distancia entre card e setas) */}
          <div
            ref={trackRef}
            className={[
              "px-16 md:px-20", // << AQUI aumenta o espaço entre cards e botões
              "flex gap-6 overflow-x-auto pb-2",
              "snap-x snap-mandatory",
              "scroll-smooth",
              "[scrollbar-width:none] [-ms-overflow-style:none]",
              "[&::-webkit-scrollbar]:hidden",
            ].join(" ")}
          >
            {categories.map((c) => {
              const src = broken[c.slug] ? FALLBACK : c.image;

              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => onClick(c)}
                  className="snap-start shrink-0 text-left group"
                >
                  <div className="w-[240px] sm:w-[260px] md:w-[280px]">
                    <div className="relative overflow-hidden rounded-3xl bg-white border border-black/5 shadow-sm">
                      <img
                        src={src}
                        alt={c.title}
                        className="h-[260px] md:h-[300px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={() =>
                          setBroken((prev) => ({ ...prev, [c.slug]: true }))
                        }
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </div>

                    <div className="pt-4 text-lg text-black">{c.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";

type Peca = {
  id: string;
  slug: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagem: string;
  tag?: string;
};

const VIEW = "v_catalog_products_with_filters";
const BUCKET = "product-images";
const SEO_TAG = "lancamento";

function imgUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function pickBadge(tagSlugs?: string[] | null) {
  const t = tagSlugs ?? [];
  if (t.includes("novo")) return "Novo";
  if (t.includes("destaque")) return "Destaque";
  if (t.includes("mais-vendido")) return "Mais vendido";
  return "Lançamento";
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

type CardProps = {
  peca: Peca;
  compact?: boolean;
  onClick: () => void;
  onAdd: (e: React.MouseEvent) => void;
  onDetails: (e: React.MouseEvent) => void;
};

function Card({ peca, compact = false, onClick, onAdd, onDetails }: CardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white/90 rounded-[28px] shadow-md overflow-hidden border border-[#2b554e]/10 cursor-pointer"
    >
      <div className="relative">
        <div className="aspect-[4/5] overflow-hidden bg-black/5">
          {peca.imagem ? (
            <img
              src={peca.imagem}
              alt={peca.nome}
              className="block w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>

        {peca.tag && (
          <span className="absolute top-3 left-3 text-xs font-semibold bg-[#2b554e] text-[#F8F3EA] px-3 py-1 rounded-full">
            {peca.tag}
          </span>
        )}
      </div>

      {!compact && (
        <div className="p-2 md:p-5">
          <h3 className="text-[17px] md:text-lg font-semibold text-[#2b554e] leading-tight line-clamp-2">
            {peca.nome}
          </h3>

          {peca.descricao && (
            <p className="text-[14px] md:text-sm text-[#2b554e]/70 mt-1 line-clamp-2">
              {peca.descricao}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-2 md:gap-3">
            <div className="text-sm font-semibold text-[#b08d57]">
              {formatBRL(peca.preco)}
            </div>

            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1 rounded-xl bg-[#2b554e] text-[#FCFAF6] px-2.5 md:px-4 py-2 text-xs md:text-sm font-semibold hover:opacity-95 transition"            >
              <ShoppingBag className="h-4 w-4" />
              Adicionar
            </button>
          </div>

          <button
            type="button"
            onClick={onDetails}
            className="mt-3 w-full rounded-2xl border border-[#2b554e]/20 px-4 py-2.5 text-sm font-semibold text-[#2b554e] hover:border-[#b08d57]/40 hover:text-[#b08d57] transition-colors"
          >
            Ver detalhes
          </button>
        </div>
      )}
    </div>
  );
}

export default function SemijoiasCarousel() {
  const navigate = useNavigate();
  const { add } = useCart();

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const total = pecas.length;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from(VIEW)
        .select(
          "id,slug,name,min_price_cents,image_path,image_alt,created_at,status,seo_description,search_tags,tag_slugs"
        )
        .eq("status", "active")
        .contains("search_tags", [SEO_TAG])
        .order("created_at", { ascending: false })
        .limit(30);

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
        descricao: p.seo_description ?? undefined,
        preco: Number((p.min_price_cents ?? 0) / 100),
        imagem: imgUrl(p.image_path),
        tag: pickBadge(p.tag_slugs),
      }));

      setPecas(mapped);
      setActiveIndex(0);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (paused || isMobile || total === 0) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => wrapIndex(prev + 1, total));
    }, 6500);

    return () => clearInterval(timer);
  }, [paused, isMobile, total]);

  const prev = () => {
    if (!total) return;
    setActiveIndex((prev) => wrapIndex(prev - 1, total));
  };

  const next = () => {
    if (!total) return;
    setActiveIndex((prev) => wrapIndex(prev + 1, total));
  };

  const active = useMemo(() => pecas[activeIndex], [pecas, activeIndex]);
  const left = useMemo(() => pecas[wrapIndex(activeIndex - 1, total)], [pecas, activeIndex, total]);
  const right = useMemo(() => pecas[wrapIndex(activeIndex + 1, total)], [pecas, activeIndex, total]);

  const addToCart = (e: React.MouseEvent, peca: Peca) => {
    e.stopPropagation();
    add({
      id: peca.id,
      name: peca.nome,
      price: peca.preco,
      image: peca.imagem,
      variant: peca.tag ?? "Semijoia",
      qty: 1,
    });
  };

  return (
    <section id="semijoias"  className="pt-6 pb-8 md:pt-14 md:pb-16 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-8 lg:px-10">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-[30px] leading-tight md:text-4xl font-semibold text-[#2b554e]">
            Coleção <span className="text-[#b08d57]">NOUVEAU</span>
          </h2>

          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mt-4 mb-4 rounded-full" />

          <p className="text-[#2b554e]/80 text-[15px] leading-relaxed md:text-lg max-w-[320px] md:max-w-none mx-auto">
            Peças com banho premium e acabamento impecável.
          </p>

          {err && <p className="mt-3 text-sm text-red-600">Erro: {err}</p>}
        </div>

        <div
          className="relative max-w-6xl mx-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {loading && (
            <div className="flex items-center justify-start md:justify-center gap-3 md:gap-6 overflow-x-auto pb-2 px-4 md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[74vw] max-w-[260px] md:w-[320px] shrink-0 rounded-[28px] border border-[#2b554e]/10 bg-white/80 overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/5] bg-black/5" />
                  <div className="p-4 md:p-5">
                    <div className="h-4 bg-black/5 rounded w-3/4" />
                    <div className="h-4 bg-black/5 rounded w-1/2 mt-3" />
                    <div className="h-10 bg-black/5 rounded-xl mt-5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && total === 0 && (
            <div className="text-center text-sm text-black/60 py-10">
              Nenhum item com tag SEO “{SEO_TAG}”.
            </div>
          )}

          {!loading && total > 0 && (
            <>
              {/* MOBILE */}
              <div className="md:hidden flex items-center gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {pecas.map((peca, index) => (
                  <motion.div
                    key={`${peca.id}-${index}-mobile`}
                    className="w-[62vw] max-w-[220px] snap-center shrink-0"
                    initial={false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card
                      peca={peca}
                      onClick={() => navigate(`/produto/${peca.slug}?from=semijoias`)}
                      onAdd={(e) => addToCart(e, peca)}
                      onDetails={(e) => {
                        e.stopPropagation();
                        navigate(`/produto/${peca.slug}`);
                      }}
                    />
                  </motion.div>
                ))}
              </div>

              {/* DESKTOP */}
              <div className="hidden md:grid grid-cols-[280px_380px_280px] justify-center items-center gap-4 lg:gap-6 min-h-[560px]">                <motion.div
                key={`left-${left?.id}-${activeIndex}`}
                initial={{ opacity: 0, x: -30, scale: 0.92 }}
                animate={{ opacity: 0.68, x: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="justify-self-end w-[260px] lg:w-[280px]"              >
                {left && (
                  <Card
                    peca={left}
                    compact
                    onClick={prev}
                    onAdd={(e) => e.stopPropagation()}
                    onDetails={(e) => e.stopPropagation()}
                  />
                )}
              </motion.div>

                <motion.div
                  key={`center-${active?.id}-${activeIndex}`}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="w-[320px] lg:w-[380px] mx-auto"
                >
                  {active && (
                    <Card
                      peca={active}
                      onClick={() => navigate(`/produto/${active.slug}?from=semijoias`)}
                      onAdd={(e) => addToCart(e, active)}
                      onDetails={(e) => {
                        e.stopPropagation();
                        navigate(`/produto/${active.slug}`);
                      }}
                    />
                  )}
                </motion.div>

                <motion.div
                  key={`right-${right?.id}-${activeIndex}`}
                  initial={{ opacity: 0, x: 30, scale: 0.92 }}
                  animate={{ opacity: 0.68, x: 0, scale: 0.9 }}
                  transition={{ duration: 0.35 }}
                  className="justify-self-start w-[260px] lg:w-[280px]"
                >
                  {right && (
                    <Card
                      peca={right}
                      compact
                      onClick={next}
                      onAdd={(e) => e.stopPropagation()}
                      onDetails={(e) => e.stopPropagation()}
                    />
                  )}
                </motion.div>
              </div>

              <button
                type="button"
                onClick={prev}
                aria-label="Anterior"
                className="hidden md:flex absolute left-0 top-[42%] -translate-y-1/2 bg-white/90 border border-[#2b554e]/15 rounded-full shadow-sm w-11 h-11 items-center justify-center text-[#2b554e] hover:text-[#b08d57] hover:border-[#b08d57]/40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={next}
                aria-label="Próximo"
                className="hidden md:flex absolute right-0 top-[42%] -translate-y-1/2 bg-white/90 border border-[#2b554e]/15 rounded-full shadow-sm w-11 h-11 items-center justify-center text-[#2b554e] hover:text-[#b08d57] hover:border-[#b08d57]/40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="flex justify-center mt-7 gap-2">
                {pecas.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Ir para item ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all ${i === activeIndex
                      ? "w-8 bg-[#b08d57]"
                      : "w-2.5 bg-[#2b554e]/20 hover:bg-[#2b554e]/35"
                      }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
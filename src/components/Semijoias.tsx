import React, { useEffect, useState } from "react";
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

const SemijoiasCarousel: React.FC = () => {
  const navigate = useNavigate();
  const { add } = useCart();

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const total = pecas.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
        .contains("search_tags", ["lancamento"])
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
    if (paused || total === 0 || isMobile) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 7800);

    return () => clearInterval(timer);
  }, [paused, total, isMobile]);

  const next = () => total > 0 && setActiveIndex((prev) => (prev + 1) % total);
  const prev = () => total > 0 && setActiveIndex((prev) => (prev - 1 + total) % total);

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const onAddToCart = (e: React.MouseEvent, peca: Peca) => {
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
    <section id="semijoias" className="py-14 md:py-16 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-10 lg:px-12">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-[30px] leading-tight md:text-4xl font-semibold text-[#2b554e]">
            Coleção <span className="text-[#b08d57]">NOUVEAU</span>
          </h2>

          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mt-4 mb-4 rounded-full" />

          <p className="text-[#2b554e]/80 text-[15px] leading-relaxed md:text-lg max-w-[320px] md:max-w-none mx-auto">
            Peças com banho premium — brilho marcante, acabamento impecável.
          </p>

          {err && <p className="mt-3 text-sm text-red-600">Erro: {err}</p>}
        </div>

        <div
          className="relative max-w-6xl mx-auto overflow-hidden md:overflow-visible"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {loading && (
            <div className="flex items-center justify-start md:justify-center gap-3 md:gap-6 overflow-x-auto pb-2 px-4 md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[78vw] max-w-[280px] md:w-60 lg:w-72 shrink-0 rounded-[28px] border border-[#2b554e]/10 bg-white/80 overflow-hidden animate-pulse"
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
              <div className="flex items-center justify-start md:justify-center gap-3 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none pb-2 px-4 md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {pecas.map((peca, index) => {
                  const offset = (index - activeIndex + total) % total;

                  let scale = isMobile ? 1 : 0.72;
                  let opacity = isMobile ? 1 : 0.25;
                  let zIndex = 10;
                  let translateY = isMobile ? 0 : 18;

                  if (offset === 0) {
                    scale = 1;
                    opacity = 1;
                    zIndex = 30;
                    translateY = 0;
                  } else if (!isMobile && (offset === 1 || offset === total - 1)) {
                    scale = 0.88;
                    opacity = 0.75;
                    zIndex = 20;
                    translateY = 8;
                  }

                  const handleCardClick = () => {
                    if (!isMobile && offset !== 0) {
                      setActiveIndex(index);
                      return;
                    }
                    navigate(`/produto/${peca.slug}?from=semijoias`);
                  };

                  return (
                    <motion.div
                      key={`${peca.id}-${index}`}
                      className="w-[78vw] max-w-[280px] md:w-60 lg:w-72 cursor-pointer select-none snap-center shrink-0"
                      onClick={handleCardClick}
                      initial={false}
                      animate={{ scale, opacity, y: translateY }}
                      transition={{ duration: 0.75, ease: "easeInOut" }}
                      style={{ zIndex }}
                    >
                      <div className="bg-white/90 rounded-[28px] shadow-md overflow-hidden border border-[#2b554e]/10">
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

                        {(offset === 0 || isMobile) && (
                          <div className="p-4 md:p-5">
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
                                onClick={(e) => onAddToCart(e, peca)}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#2b554e] text-[#FCFAF6] px-3 md:px-4 py-2 text-sm font-semibold hover:opacity-95 transition"
                                aria-label="Adicionar à sacola"
                              >
                                <ShoppingBag className="h-4 w-4" />
                                Adicionar
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/produto/${peca.slug}`);
                              }}
                              className="mt-3 w-full rounded-2xl border border-[#2b554e]/20 px-4 py-2.5 text-sm font-semibold text-[#2b554e] hover:border-[#b08d57]/40 hover:text-[#b08d57] transition-colors"
                            >
                              Ver detalhes
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={prev}
                aria-label="Anterior"
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 bg-white/90 border border-[#2b554e]/15 rounded-full shadow-sm w-11 h-11 items-center justify-center text-[#2b554e] hover:text-[#b08d57] hover:border-[#b08d57]/40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={next}
                aria-label="Próximo"
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 bg-white/90 border border-[#2b554e]/15 rounded-full shadow-sm w-11 h-11 items-center justify-center text-[#2b554e] hover:text-[#b08d57] hover:border-[#b08d57]/40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="flex justify-center mt-7 gap-2">
                {pecas.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Ir para item ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      i === activeIndex
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
};

export default SemijoiasCarousel;
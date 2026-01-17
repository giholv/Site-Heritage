// src/components/PratasCarousel.tsx (ou onde você usa)
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

type Peca = {
  slug: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagem: string;
  tag?: string;
};

const PratasCarousel: React.FC = () => {
  const navigate = useNavigate();
  const { add } = useCart();

  const pecas: Peca[] = useMemo(
    () => [
      {
        slug: "brinco-prata-925",
        nome: "Brinco Prata 925",
        descricao: "Prata 925 • brilho delicado",
        preco: 79.9,
        imagem: "/prata1.png",
        tag: "925",
      },
      {
        slug: "colar-prata-925",
        nome: "Colar Prata 925",
        descricao: "Minimalista • perfeito pro dia a dia",
        preco: 139.9,
        imagem: "/prata2.png",
      },
      {
        slug: "anel-prata-925",
        nome: "Anel Prata 925",
        descricao: "Ajustável • acabamento polido",
        preco: 89.9,
        imagem: "/prata3.png",
        tag: "Destaque",
      },
      {
        slug: "pulseira-prata-925",
        nome: "Pulseira Prata 925",
        descricao: "Clássica • combina com tudo",
        preco: 99.9,
        imagem: "/prata4.png",
      },
    ],
    []
  );

  const total = pecas.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || total === 0) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 7800);
    return () => clearInterval(timer);
  }, [paused, total]);

  const next = () => setActiveIndex((prev) => (prev + 1) % total);
  const prev = () => setActiveIndex((prev) => (prev - 1 + total) % total);

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const onAddToCart = (e: React.MouseEvent, peca: Peca) => {
    e.stopPropagation();

    add({
      id: peca.slug,
      name: peca.nome,
      price: peca.preco,
      image: peca.imagem,
      variant: peca.tag ?? "Prata 925",
      qty: 1,
    });
  };

  return (
    <section id="pratas" className="py-16 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e]">
            Linha <span className="text-[#b08d57]">PRATA</span>
          </h2>
          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mt-4 mb-4 rounded-full" />
          <p className="text-[#2b554e]/80 text-base md:text-lg">
            Pratas para o dia a dia — leve, elegante e atemporal.
          </p>
        </div>

        <div
          className="relative max-w-6xl mx-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex items-center justify-center gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none pb-2">
            {pecas.map((peca, index) => {
              const offset = (index - activeIndex + total) % total;

              let scale = 0.72;
              let opacity = 0.25;
              let zIndex = 10;
              let translateY = 18;

              if (offset === 0) {
                scale = 1;
                opacity = 1;
                zIndex = 30;
                translateY = 0;
              } else if (offset === 1 || offset === total - 1) {
                scale = 0.88;
                opacity = 0.75;
                zIndex = 20;
                translateY = 8;
              }

              const handleCardClick = () => {
                // mesmo comportamento do lançamento:
                // se não for o ativo, só traz pro centro
                if (offset !== 0) {
                  setActiveIndex(index);
                  return;
                }
                // se for o ativo, abre a página do produto
               navigate(`/produto/${peca.slug}?from=pratas`);
              };

              return (
                <motion.div
                  key={`${peca.slug}-${index}`}
                  className="w-56 md:w-60 lg:w-72 cursor-pointer select-none snap-center"
                  onClick={handleCardClick}
                  initial={false}
                  animate={{ scale, opacity, y: translateY }}
                  transition={{ duration: 0.75, ease: "easeInOut" }}
                  style={{ zIndex }}
                >
                  <div className="bg-white/90 rounded-3xl shadow-md overflow-hidden border border-[#2b554e]/10">
                    <div className="relative">
                      <div className="aspect-[4/5] overflow-hidden">
                        <img
                          src={peca.imagem}
                          alt={peca.nome}
                          className="block w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {peca.tag && (
                        <span className="absolute top-3 left-3 text-xs font-semibold bg-[#2b554e] text-[#F8F3EA] px-3 py-1 rounded-full">
                          {peca.tag}
                        </span>
                      )}
                    </div>

                    {offset === 0 && (
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-[#2b554e]">
                          {peca.nome}
                        </h3>

                        {peca.descricao && (
                          <p className="text-sm text-[#2b554e]/70 mt-1">
                            {peca.descricao}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[#b08d57]">
                            {formatBRL(peca.preco)}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => onAddToCart(e, peca)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#2b554e] text-[#FCFAF6] px-4 py-2 text-sm font-semibold hover:opacity-95 transition"
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
                          className="mt-3 w-full rounded-md border border-[#2b554e]/20 px-4 py-2 text-sm font-semibold text-[#2b554e] hover:border-[#b08d57]/40 hover:text-[#b08d57] transition-colors"
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
        </div>
      </div>
    </section>
  );
};

export default PratasCarousel;

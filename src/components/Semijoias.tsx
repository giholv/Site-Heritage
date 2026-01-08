import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

type Peca = {
  nome: string;
  descricao?: string;
  preco?: string;
  imagem: string;
  tag?: string;
};

const SemijoiasCarousel: React.FC = () => {
  const pecas: Peca[] = useMemo(
    () => [
      { nome: "Colar Dourado", descricao: "Banho de ouro • brilho elegante", preco: "R$ 149,90", imagem: "/semi1.jpg", tag: "Novo" },
      { nome: "Brinco Gota", descricao: "Leve • perfeito pro dia a dia", preco: "R$ 79,90", imagem: "/semi2.jpg" },
      { nome: "Anel Ajustável", descricao: "Acabamento premium • confortável", preco: "R$ 89,90", imagem: "/semi3.jpg", tag: "Destaque" },
      { nome: "Pulseira Delicada", descricao: "Minimalista • combina com tudo", preco: "R$ 99,90", imagem: "/semi4.jpg" },
    ],
    []
  );

  const total = pecas.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 7800);
    return () => clearInterval(timer);
  }, [paused, total]);

  const next = () => setActiveIndex((prev) => (prev + 1) % total);
  const prev = () => setActiveIndex((prev) => (prev - 1 + total) % total);

  const onAddToCart = (peca: Peca) => {
    console.log("Adicionar no carrinho:", peca);
  };

  return (
    <section id="semijoias" className="py-16 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e]">
            Linha <span className="text-[#b08d57]">SEMIJOIAS</span>
          </h2>
          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mt-4 mb-4 rounded-full" />
          <p className="text-[#2b554e]/80 text-base md:text-lg">
            Peças com banho premium — brilho marcante, acabamento impecável.
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

              return (
                <motion.div
                  key={`${peca.nome}-${index}`}
                  className="w-56 md:w-60 lg:w-72 cursor-pointer select-none snap-center"
                  onClick={() => setActiveIndex(index)}
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
                          {peca.preco && (
                            <div className="text-sm font-semibold text-[#b08d57]">
                              {peca.preco}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(peca);
                            }}
                            className="ml-auto inline-flex items-center gap-2 rounded-md bg-[#2b554e] text-[#FCFAF6] px-4 py-2 text-sm font-semibold hover:bg-[#23463f] transition-colors"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            Adicionar
                          </button>
                        </div>
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

export default SemijoiasCarousel;

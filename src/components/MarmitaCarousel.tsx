// src/components/MarmitaCarousel.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const marmitas = [
  {
    nome: "Marmita Proteica",
    descricao: "Frango grelhado, arroz integral e legumes.",
    calorias: "450 kcal",
    imagem: "/marmita1.png",
  },
  {
    nome: "Marmita Low Carb",
    descricao: "Carne magra, mix de folhas e legumes assados.",
    calorias: "380 kcal",
    imagem: "/marmita2.png",
  },
  {
    nome: "Marmita Veggie",
    descricao: "Grão-de-bico, quinoa, abóbora e brócolis.",
    calorias: "420 kcal",
    imagem: "/marmita3.png",
  },
  {
    nome: "Marmita Energia",
    descricao: "Patinho grelhado, purê de batata doce e/ou arroz e feijão e salada.",
    calorias: "500 kcal",
    imagem: "/marmita4.png",
  },
];

const MarmitaCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = marmitas.length;

  // gira automaticamente
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 3000);
    return () => clearInterval(timer);
  }, [total]);

  const next = () => setActiveIndex((prev) => (prev + 1) % total);
  const prev = () => setActiveIndex((prev) => (prev - 1 + total) % total);

  return (
    <section id="marmita-carousel" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            Nossas Marmitas
          </h2>
          <div className="h-1 w-20 bg-accent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">
            As refeições da Unifit entram no seu ciclo diário sem esforço: escolha a que combina com você.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* “Círculo” de marmitas */}
          <div className="flex items-center justify-center gap-4 md:gap-6">
            {marmitas.map((marmita, index) => {
              // distância “circular” entre o item e o ativo
              let offset = (index - activeIndex + total) % total;

              let scale = 0.6;
              let opacity = 0.25;
              let zIndex = 10;
              let translateY = 20;

              if (offset === 0) {
                // em destaque
                scale = 1;
                opacity = 1;
                zIndex = 30;
                translateY = 0;
              } else if (offset === 1 || offset === total - 1) {
                // vizinhos menores
                scale = 0.8;
                opacity = 0.7;
                zIndex = 20;
                translateY = 10;
              }

              return (
                <motion.div
                  key={index}
                  className="w-32 md:w-44 lg:w-52 cursor-pointer"
                  onClick={() => setActiveIndex(index)}
                  initial={false}
                  animate={{
                    scale,
                    opacity,
                    y: translateY,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  style={{ zIndex }}
                >
                  <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={marmita.imagem}
                        alt={marmita.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {offset === 0 && (
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {marmita.nome}
                        </h3>
                        <p className="text-sm text-gray-500 mb-1">
                          {marmita.descricao}
                        </p>
                        <span className="text-xs font-medium text-accent">
                          {marmita.calorias}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Botões de navegação */}
          <button
            onClick={prev}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 bg-white rounded-full shadow-md w-10 h-10 items-center justify-center text-gray-700 hover:bg-gray-50"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 bg-white rounded-full shadow-md w-10 h-10 items-center justify-center text-gray-700 hover:bg-gray-50"
          >
            ›
          </button>
        </div>

        {/* “bolinhas” de indicação */}
        <div className="flex justify-center mt-6 gap-2">
          {marmitas.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === activeIndex
                  ? "bg-accent w-6"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MarmitaCarousel;

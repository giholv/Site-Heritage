import React from "react";
import { Sparkles, Gem, ShieldCheck, HeartHandshake } from "lucide-react";

type Item = {
  Icon: React.ElementType;
  title: string;
  desc: string;
};

export default function About() {
  const items: Item[] = [
    {
      Icon: Sparkles,
      title: "Design para usar de verdade",
      desc: "Peças versáteis para o dia a dia, mas com presença para momentos especiais.",
    },
    {
      Icon: Gem,
      title: "Acabamento premium",
      desc: "Brilho bonito, detalhes bem resolvidos e cuidado visível em cada peça.",
    },
    {
      Icon: ShieldCheck,
      title: "Qualidade sem surpresas",
      desc: "Mais transparência nos materiais, padrão consistente e escolha consciente.",
    },
    {
      Icon: HeartHandshake,
      title: "Atendimento que resolve",
      desc: "Suporte próximo, resposta rápida e troca simples quando precisar.",
    },
  ];

  return (
    <section id="about" className="pt-8 pb-16 md:pt-16 md:pb-24 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          {/* TEXTO */}
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-[#b08d57]/30 bg-[#b08d57]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#b08d57]">
              Essência da marca
            </span>

            <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight text-[#2b554e] leading-[1.1]">
              Semijoias para acompanhar
              <span className="block text-[#b08d57]">quem você está se tornando</span>
            </h2>

            <div className="h-[2px] w-24 bg-[#b08d57] mt-5 mb-7 rounded-full" />

            <div className="space-y-5 text-base md:text-lg text-[#2b554e]/80 leading-relaxed">
              <p>
                A Caléa nasce da ideia de que joias acompanham fases. Mudam com você,
                refletem seu momento e adicionam presença sem exagero.
              </p>

              <p>
                Criamos semijoias com design atemporal, acabamento cuidadoso e uma estética
                delicada, pensadas para funcionar tanto no dia a dia quanto em ocasiões especiais.
              </p>

              <p>
                Mais do que acessórios, buscamos entregar uma experiência bonita, simples e
                segura — da escolha da peça ao unboxing.
              </p>
            </div>
          </div>

          {/* CARDS */}
          <div className="relative">
            <div className="absolute -top-4 -left-4 hidden lg:block h-20 w-20 rounded-full bg-[#b08d57]/10 blur-2xl" />
            <div className="absolute -bottom-6 -right-6 hidden lg:block h-24 w-24 rounded-full bg-[#2b554e]/8 blur-2xl" />

            {/* FOTO DA MARCA */}
            <div className="relative overflow-hidden rounded-[28px] shadow-[0_10px_30px_rgba(43,85,78,0.08)]">
              <img
                src="/about-calea.jpg"
                alt="Semijoias Caléa"
                className="w-full h-[420px] md:h-[480px] object-cover"
              />

              {/* overlay leve */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />

              {/* texto opcional em cima */}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-sm uppercase tracking-wider opacity-90">
                  Essência Caléa
                </p>

                <p className="text-lg md:text-xl font-semibold leading-snug mt-1">
                  Peças pensadas para acompanhar o seu estilo em todos os momentos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
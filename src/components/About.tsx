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
      desc: "Versátil no dia a dia e elegante no especial.",
    },
    {
      Icon: Gem,
      title: "Acabamento premium",
      desc: "Detalhes bem feitos e brilho bonito.",
    },
    {
      Icon: ShieldCheck,
      title: "Qualidade sem surpresas",
      desc: "Transparência nos materiais e padrão consistente.",
    },
    {
      Icon: HeartHandshake,
      title: "Atendimento que resolve",
      desc: "Suporte rápido e troca simples quando precisar.",
    },
  ];

  return (
    <section id="about" className="py-20 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* TEXTO */}
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e]">
              Sobre nós
            </h2>
            <div className="h-[2px] w-24 bg-[#b08d57] mt-3 mb-6 rounded-full" />

            <p className="text-base md:text-lg text-[#2b554e]/80 mb-5 leading-relaxed">
              A Caléa nasce da ideia de que joias acompanham fases. Mudam com você,
              refletem quem você é hoje e quem está se tornando.
            </p>

            <p className="text-base md:text-lg text-[#2b554e]/80 mb-5 leading-relaxed">
              Criamos semijoias com design atemporal e acabamento cuidadoso tanto para brilhar no dia a dia quanto para arrasar em momentos especiais.
            </p>

            <p className="text-base md:text-lg text-[#2b554e]/80 leading-relaxed">
              Mais do que acessórios, entregamos uma experiência simples e segura do clique ao unboxing.
            </p>
          </div>

          {/* LISTA CLEAN */}
          <div className="rounded-2xl border border-[#2b554e]/10 bg-white/70 p-6">
            <div className="space-y-5">
              {items.map(({ Icon, title, desc }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2b554e]/8">
                    <Icon className="h-5 w-5 text-[#2b554e]" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm md:text-base font-semibold text-[#2b554e] leading-tight">
                      {title}
                    </p>
                    <p className="text-sm text-[#2b554e]/70 mt-1 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

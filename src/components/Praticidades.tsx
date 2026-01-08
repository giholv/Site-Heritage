import React from "react";
import { Smartphone, Truck, ShieldCheck, RefreshCcw } from "lucide-react";

const Praticidades: React.FC = () => {
  const items = [
    {
      icon: <Smartphone className="h-9 w-9 text-[#2b554e]" />,
      title: "Compra rápida",
      description:
        "Escolha a peça, finalize em poucos toques e pronto. Sem burocracia, sem enrolação.",
    },
    {
      icon: <Truck className="h-9 w-9 text-[#2b554e]" />,
      title: "Envio ágil",
      description:
        "Postagem rápida e rastreio para você acompanhar cada etapa até chegar.",
    },
    {
      icon: <ShieldCheck className="h-9 w-9 text-[#2b554e]" />,
      title: "Garantia de qualidade",
      description:
        "Acabamento bem feito, banho premium e cuidado em cada detalhe.",
    },
    {
      icon: <RefreshCcw className="h-9 w-9 text-[#2b554e]" />,
      title: "Troca fácil",
      description:
        "Não era o que imaginou? Você troca de forma simples, sem dor de cabeça.",
    },
  ];

  return (
    <section id="praticidades" className="py-16 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e] mb-3">
            Sem complicar. <span className="text-[#b08d57]">Só brilhar.</span>
          </h2>

          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mb-4 rounded-full" />

          <p className="text-base md:text-lg text-[#2b554e]/75">
            Uma experiência simples do começo ao fim — do clique ao brilho.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white/85 rounded-2xl border border-[#2b554e]/10 shadow-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="rounded-2xl bg-[#2b554e]/10 w-14 h-14 flex items-center justify-center mb-4">
                {item.icon}
              </div>

              <h3 className="text-lg font-semibold text-[#2b554e] mb-2">
                {item.title}
              </h3>

              <p className="text-sm text-[#2b554e]/70 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Praticidades;

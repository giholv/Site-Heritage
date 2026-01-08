import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type FAQItem = {
  q: string;
  a: string;
};

const FAQ: React.FC = () => {
  const faqs: FAQItem[] = useMemo(
    () => [
      {
        q: "Qual a diferença entre semijoia e bijuteria?",
        a: "Semijoias têm base metálica com banho (ex: ouro) e acabamento superior. Em geral duram mais e têm melhor resistência do que bijuterias comuns, desde que bem cuidadas.",
      },
      {
        q: "O que significa Prata 925?",
        a: "Prata 925 é composta por 92,5% de prata pura + 7,5% de liga metálica para dar resistência. É o padrão mais usado em joias de prata.",
      },
      {
        q: "Prata 925 escurece?",
        a: "Sim, é normal. A prata pode oxidar com o tempo ao contato com ar, suor, perfumes e produtos químicos. A limpeza correta devolve o brilho.",
      },
      {
        q: "Como cuidar das semijoias com banho de ouro?",
        a: "Evite água, perfume, creme e produtos de limpeza. Retire antes do banho, mar/piscina e academia. Guarde separadas, em saquinho ou caixinha, longe de umidade.",
      },
      {
        q: "Posso molhar as peças?",
        a: "Prata 925 até pode ter contato ocasional com água, mas o ideal é evitar químicos (cloro, sabonete, mar). Para semijoias com banho, evite molhar para preservar o banho.",
      },
      {
        q: "As peças dão alergia?",
        a: "Depende da sensibilidade de cada pessoa. Se você tem alergia a metais (ex: níquel), priorize peças com especificação do banho e evite contato prolongado com suor/umidade. Se quiser, pergunte qual material e banho de cada peça.",
      },
      {
        q: "Como limpar prata 925 em casa?",
        a: "Use flanela macia própria para prata. Se precisar, água morna + sabão neutro, enxágue e seque muito bem. Evite produtos abrasivos.",
      },
      {
        q: "Como funciona troca e devolução?",
        a: "Você pode solicitar troca/devolução dentro do prazo legal (compras online) e seguindo as condições: peça sem uso, com embalagem e em perfeito estado. Para iniciar, chame no nosso atendimento.",
      },
    ],
    []
  );

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e] mb-3">
            FAQ <span className="text-[#b08d57]">rápido</span>
          </h2>
          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mb-4 rounded-full" />
          <p className="text-[#2b554e]/75 text-base md:text-lg">
            Banho, Prata 925, cuidados e trocas — sem mistério.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((item, idx) => {
            const open = openIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white/85 border border-[#2b554e]/10 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[#2b554e] font-semibold">
                    {item.q}
                  </span>

                  <ChevronDown
                    className={`h-5 w-5 text-[#2b554e] transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {open && (
                  <div className="px-5 pb-5">
                    <p className="text-sm md:text-base text-[#2b554e]/75 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-md bg-[#2b554e] text-[#FCFAF6] px-6 py-3 text-sm font-semibold hover:bg-[#23463f] transition-colors"
          >
            Ainda tem dúvida? Fala com a gente
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;

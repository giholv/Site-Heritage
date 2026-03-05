import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type FAQAnswer = string | string[];

type FAQItem = {
  q: string;
  a: FAQAnswer;
  img?: { src: string; alt?: string };
};

const FAQ: React.FC = () => {
  const faqs: FAQItem[] = useMemo(
    () => [
      {
        q: "Qual a diferença entre semijoia e bijuteria?",
        a: "Nossas semijoias são feitas com base metálica e recebem banho espesso de metais nobres, como ouro ou prata, além de um acabamento com verniz para maior durabilidade. Duram mais, têm melhor resistência e qualidade quando bem cuidadas. Bijuterias não passam por esse processo e, por isso, têm menor durabilidade.",
        img: { src: "/semijoia-vs-bijuteria.svg", alt: "Semijoia e bijuteria" },
      },
      {
        q: "Porque as peças em prata escurecem?",
        a: "A prata sofre oxidação, uma reação química natural ao entrar em contato com o ar, suor, perfumes e outros produtos químicos. Esse processo escurece a peça, mas não é defeito. Com a limpeza correta da sua peça, o brilho original é recuperado.",
      },
      {
        q: "Como cuidar das minhas semijoias ?",
        a: [
          "Armazene as peças separadamente, nos saquinhos que enviamos com cada peça.",
          "Mantenha longe de exposição constante à água e ao vapor.",
          "Coloque as peças apenas após a completa absorção e secagem de perfumes, cremes e cosméticos.",
          "Não utilize produtos químicos/abrasivos na limpeza.",
          "Para limpar, use água e sabão neutro; enxágue e seque totalmente com secador (ar frio).",
          "É recomendado que retire as peças para dormir, pois o atrtito pode danificar ou entortar partes delicadas.",
          "Retire as suas peças antes de praticar exercícios físicos.",
        ],
      },
      {
        q: "As peças podem me dar alergia?",
        a: "Nossas peças são free níquel e hipoalergênicas, desenvolvidas para oferecer mais conforto, segurança e a melhor experiência no uso diário.",
      },

      {
        q: "Como funciona troca e devolução?",
        a: "Você pode solicitar troca/devolução dentro do prazo legal (compras online) e seguindo as condições: peça sem uso, com embalagem e em perfeito estado. Para iniciar, entre em contato conosco.",
      },
    ],
    []
  );

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const Answer = ({ a }: { a: FAQAnswer }) => {
    if (Array.isArray(a)) {
      return (
        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-[#2b554e]/75 leading-relaxed">
          {a.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      );
    }

    return (
      <p className="text-sm md:text-base text-[#2b554e]/75 leading-relaxed">
        {a}
      </p>
    );
  };

  return (
    <section id="faq" className="py-20 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e] mb-3">
            FAQ <span className="text-[#b08d57]">rápido</span>
          </h2>
          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mb-4 rounded-full" />
          <p className="text-[#2b554e]/75 text-base md:text-lg">
            Banho, cuidados e trocas
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
                  <span className="text-[#2b554e] font-semibold">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-[#2b554e] transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {open && (
                  <div className="px-5 pb-5">
                    {item.img?.src && (
                      <div className="mb-4 overflow-hidden rounded-xl border border-[#2b554e]/10">
                        <img
                          src={item.img.src}
                          alt={item.img.alt ?? item.q}
                          className="w-full h-[180px] md:h-[220px] object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <Answer a={item.a} />
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
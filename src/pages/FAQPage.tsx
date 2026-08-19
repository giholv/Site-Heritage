import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

type FAQAnswer = string | string[];

type FAQItem = {
  q: string;
  a: FAQAnswer;
  img?: { src: string; alt?: string };
  highlight?: string;
};

export default function FAQPage() {
  const faqs: FAQItem[] = useMemo(
    () => [
      {
        q: "Qual a diferença entre semijoia e bijuteria?",
        a: [
          "Semijoias recebem banho espesso de metais nobres, como ouro ou prata.",
          "Também contam com acabamento em verniz para maior proteção e durabilidade.",
          "Têm mais resistência, brilho e qualidade quando bem cuidadas.",
          "Bijuterias não passam por esse mesmo processo e tendem a ter menor durabilidade.",
        ],
        img: {
          src: "/semijoia-vs-bijuteria.svg",
          alt: "Semijoia e bijuteria",
        },
        highlight:
          "Nossas semijoias unem acabamento refinado e maior durabilidade para o uso diário.",
      },
      {
        q: "Por que as peças em prata escurecem?",
        a: "A prata sofre oxidação, uma reação química natural ao entrar em contato com o ar, suor, perfumes e outros produtos químicos. Esse processo escurece a peça, mas não é defeito. Com a limpeza correta, o brilho original pode ser recuperado.",
      },
      {
        q: "Como cuidar das minhas semijoias?",
        a: [
          "Armazene as peças separadamente, nos saquinhos que enviamos com cada peça.",
          "Mantenha longe de exposição constante à água e ao vapor.",
          "Coloque as peças apenas após a completa absorção e secagem de perfumes, cremes e cosméticos.",
          "Não utilize produtos químicos ou abrasivos na limpeza.",
          "Para limpar, use água e sabão neutro; enxágue e seque totalmente.",
          "Retire as peças para dormir, pois o atrito pode danificar ou entortar partes delicadas.",
          "Retire as peças antes de praticar exercícios físicos.",
        ],
      },
      {
        q: "As peças podem me dar alergia?",
        a: "Nossas peças são free níquel e hipoalergênicas, desenvolvidas para oferecer mais conforto e uma melhor experiência no uso diário.",
      },
      {
        q: "Como funciona troca e devolução?",
        a: "Você pode solicitar troca ou devolução dentro do prazo legal para compras online, desde que a peça esteja sem uso, com embalagem e em perfeito estado. Para iniciar, entre em contato conosco.",
      },
    ],
    []
  );

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const Answer = ({ a }: { a: FAQAnswer }) => {
    if (Array.isArray(a)) {
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#2b554e]/75 md:text-base">
          {a.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      );
    }

    return (
      <p className="text-sm leading-relaxed text-[#2b554e]/75 md:text-base">
        {a}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-[#FCFAF6]">
      <Header />

      <main className="pt-[110px] md:pt-[140px]">
        {/* QUEM SOMOS */}
        <section
          id="quem-somos"
          className="scroll-mt-[120px] border-b border-[#2b554e]/10 py-14 md:py-20"
        >
          <div className="mx-auto grid w-full max-w-[1380px] gap-10 px-4 sm:px-6 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
                Caléa Blanc
              </p>

              <h1 className="mt-4 font-serif text-[40px] font-normal leading-[0.98] tracking-[-0.04em] text-[#2b554e] sm:text-[48px] md:text-[58px]">
                Você não muda.
                <span className="block italic text-[#8a7660]">
                  Você realça.
                </span>
              </h1>

              <p className="mt-6 max-w-[560px] text-sm leading-7 text-[#6f6558] md:text-base">
                A Caléa nasceu para acompanhar diferentes versões de uma mesma mulher.
                Acreditamos em peças que valorizam o que já existe, sem excessos e sem
                transformar quem você é.
              </p>

              <p className="mt-4 max-w-[560px] text-sm leading-7 text-[#6f6558] md:text-base">
                Nossa curadoria reúne semijoias pensadas para fazer parte da vida real:
                nos detalhes, nas escolhas e nos momentos que merecem ser lembrados.
              </p>
            </div>

            <div className="relative overflow-hidden bg-[#eee8df]">
              <img
                src="/about-calea.jpg"
                alt="Universo Caléa Blanc"
                className="aspect-[4/3] h-full w-full object-cover md:aspect-[16/10]"
              />

              <div className="absolute bottom-5 left-5 bg-[#FCFAF6]/90 px-4 py-3 backdrop-blur-sm">
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#b08d57]">
                  The Caléa Effect
                </p>

                <p className="mt-1 font-serif text-[20px] text-[#2b554e]">
                  Presença nos detalhes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="perguntas"
          className="scroll-mt-[120px] py-14 md:py-20"
        >
          <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 md:px-8">
            <div className="mb-10 border-b border-[#2b554e]/10 pb-7">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
                Atendimento
              </p>

              <h2 className="mt-3 font-serif text-[34px] font-normal tracking-[-0.03em] text-[#2b554e] md:text-[46px]">
                Perguntas frequentes
              </h2>

              <p className="mt-3 text-sm text-[#6f6558] md:text-base">
                Banho, cuidados, materiais, trocas e tudo o que você precisa saber.
              </p>
            </div>

            <div className="divide-y divide-[#2b554e]/10 border-y border-[#2b554e]/10">
              {faqs.map((item, idx) => {
                const open = openIndex === idx;

                return (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenIndex(open ? null : idx)
                      }
                      className="flex w-full items-center justify-between gap-4 py-6 text-left"
                      aria-expanded={open}
                    >
                      <span className="font-serif text-[20px] text-[#2b554e] md:text-[23px]">
                        {item.q}
                      </span>

                      <ChevronDown
                        className={[
                          "h-5 w-5 shrink-0 text-[#2b554e] transition-transform duration-300",
                          open ? "rotate-180" : "",
                        ].join(" ")}
                      />
                    </button>

                    <div
                      className={[
                        "grid transition-all duration-300",
                        open
                          ? "grid-rows-[1fr] pb-6"
                          : "grid-rows-[0fr]",
                      ].join(" ")}
                    >
                      <div className="overflow-hidden">
                        {item.img?.src && (
                          <div className="mb-5 bg-[#f4efe3]">
                            <div className="flex h-[220px] items-center justify-center md:h-[280px]">
                              <img
                                src={item.img.src}
                                alt={item.img.alt || item.q}
                                className="max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        )}

                        <Answer a={item.a} />

                        {item.highlight && (
                          <div className="mt-5 border-l-2 border-[#b08d57] pl-4 text-sm leading-6 text-[#2b554e]/80">
                            {item.highlight}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10">
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#2b554e] px-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#214b44]"
              >
                Ainda tem dúvida? Fala com a gente
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
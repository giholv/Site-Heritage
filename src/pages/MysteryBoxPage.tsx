import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const plans = [
  {
    slug: "mensal",
    name: "Plano Mensal",
    subtitle: "Sem fidelidade",
    price: "219,90",
    featured: false,
  },
  {
    slug: "anual",
    name: "Plano Anual",
    subtitle: "Cobrança anual parcelada",
    oldPrice: "219,90",
    price: "169,90",
    featured: true,
  },
  {
    slug: "semestral",
    name: "Plano Semestral",
    subtitle: "Cobrança semestral parcelada",
    oldPrice: "219,90",
    price: "185,90",
    featured: false,
  },
];

const steps = [
  {
    number: "01",
    title: "Escolha seu plano",
    text: "Escolha a assinatura que mais combina com o seu momento.",
  },
  {
    number: "02",
    title: "Conte sobre você",
    text: "Responda o Seu Match Caléa para entendermos seu estilo.",
  },
  {
    number: "03",
    title: "Receba sua curadoria",
    text: "Selecionamos joias pensando nas suas preferências.",
  },
  {
    number: "04",
    title: "Abra a surpresa",
    text: "Sua Box Misteriosa chega com uma seleção feita especialmente para você.",
  },
];

export default function MysteryBoxPage() {
  const navigate = useNavigate();

  function choosePlan(slug: string) {
    navigate(`/box-misteriosa?plano=${slug}#match`);
  }

  return (
    <div className="min-h-screen bg-[#FCFAF6]">
      <Header />

      <main className="pt-[90px] md:pt-[105px]">
        {/* HERO */}
        <section className="overflow-hidden bg-[#ede5dc]">
          <div className="mx-auto grid min-h-[650px] max-w-[1540px] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex items-center px-5 py-14 sm:px-6 md:px-10 lg:px-14 xl:px-16">
              <div className="max-w-[620px]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#b08d57]">
                  Box Misteriosa Caléa
                </p>

                <h1 className="mt-5 font-serif text-[50px] leading-[0.92] tracking-[-0.045em] text-[#2b554e] sm:text-[60px] md:text-[72px]">
                  Você escolhe
                  <span className="block italic text-[#8a7660]">
                    o plano.
                  </span>
                  Nós escolhemos
                  <span className="block italic text-[#8a7660]">
                    a surpresa.
                  </span>
                </h1>

                <p className="mt-7 max-w-[520px] text-sm leading-7 text-[#665e55] md:text-base">
                  Uma assinatura de semijoias com curadoria personalizada,
                  criada a partir do seu estilo e das suas preferências.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("planos")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                  className="mt-8 rounded-full bg-[#2b554e] px-7 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white"
                >
                  Conhecer os planos
                </button>
              </div>
            </div>

            <div className="relative min-h-[460px] bg-[#d8d0c7] lg:min-h-[650px]">
              <img
                src="/box-calea.jpg"
                alt="Box Misteriosa Caléa"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute bottom-6 left-6 bg-[#FCFAF6]/90 px-5 py-4 backdrop-blur-md">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
                  Curadoria personalizada
                </p>

                <p className="mt-1 font-serif text-[22px] text-[#2b554e]">
                  O mistério faz parte.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VALOR PERCEBIDO */}
        <section className="bg-[#2b554e] py-8 text-center text-white">
          <div className="mx-auto max-w-[900px] px-5">
            <p className="font-serif text-[25px] md:text-[32px]">
              Receba mais de
              <span className="mx-2 italic text-[#d2b078]">
                R$ 400 em semijoias
              </span>
              em cada edição.
            </p>

            <p className="mt-2 text-xs text-white/55">
              Seleções exclusivas com valor especial para assinantes.
            </p>
          </div>
        </section>

        {/* PERFIS */}
        <section className="bg-[#FCFAF6] py-16 md:py-24">
          <div className="mx-auto max-w-[1380px] px-5 sm:px-6 md:px-8 lg:px-10">
            <div className="text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
                Sua experiência
              </p>

              <h2 className="mt-3 font-serif text-[38px] tracking-[-0.03em] text-[#2b554e] md:text-[52px]">
                Qual combina mais
                <span className="ml-2 italic text-[#8a7660]">
                  com você?
                </span>
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <article className="group">
                <div className="aspect-[16/9] overflow-hidden bg-[#eee8df]">
                  <img
                    src="/box-delicada.jpg"
                    alt="Curadoria delicada Caléa"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  />
                </div>

                <h3 className="mt-5 font-serif text-[30px] text-[#2b554e]">
                  Delicada
                </h3>

                <p className="mt-2 max-w-[580px] text-sm leading-6 text-[#6f6558]">
                  Para quem prefere peças leves, sofisticadas e fáceis
                  de combinar no dia a dia.
                </p>
              </article>

              <article className="group">
                <div className="aspect-[16/9] overflow-hidden bg-[#eee8df]">
                  <img
                    src="/box-marcante.jpg"
                    alt="Curadoria marcante Caléa"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  />
                </div>

                <h3 className="mt-5 font-serif text-[30px] text-[#2b554e]">
                  Marcante
                </h3>

                <p className="mt-2 max-w-[580px] text-sm leading-6 text-[#6f6558]">
                  Para quem gosta de peças com mais presença,
                  personalidade e impacto.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section
          id="planos"
          className="scroll-mt-[120px] bg-[#1f302d] py-16 text-white md:py-24"
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-6 md:px-8">
            <div className="text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#d2b078]">
                Escolha o seu plano
              </p>

              <h2 className="mt-3 font-serif text-[38px] md:text-[52px]">
                Uma box.
                <span className="ml-2 italic text-[#d2b078]">
                  Seu ritmo.
                </span>
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.slug}
                  className={[
                    "relative flex min-h-[380px] flex-col border p-7",
                    plan.featured
                      ? "border-[#d2b078] bg-[#2b554e]"
                      : "border-white/20 bg-white/[0.02]",
                  ].join(" ")}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#d2b078] px-4 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#173a35]">
                      Mais escolhido
                    </span>
                  )}

                  <p className="font-serif text-[28px]">
                    {plan.name}
                  </p>

                  <p className="mt-2 text-xs text-white/55">
                    {plan.subtitle}
                  </p>

                  <div className="mt-auto pt-10">
                    {plan.oldPrice && (
                      <p className="text-xs text-white/45 line-through">
                        De R$ {plan.oldPrice}
                      </p>
                    )}

                    <div className="mt-2 flex items-end gap-1">
                      <span className="mb-1 text-xs">
                        R$
                      </span>

                      <span className="font-serif text-[46px] leading-none">
                        {plan.price}
                      </span>

                      <span className="mb-1 text-xs">
                        /mês
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => choosePlan(plan.slug)}
                      className={[
                        "mt-7 w-full rounded-full px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.15em]",
                        plan.featured
                          ? "bg-[#FCFAF6] text-[#2b554e]"
                          : "bg-[#2b554e] text-white",
                      ].join(" ")}
                    >
                      Assinar agora →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="bg-[#f3eee7] py-16 md:py-24">
          <div className="mx-auto max-w-[1380px] px-5 sm:px-6 md:px-8 lg:px-10">
            <div className="text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
                Simples assim
              </p>

              <h2 className="mt-3 font-serif text-[38px] text-[#2b554e] md:text-[52px]">
                Como funciona
              </h2>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.number}>
                  <div className="aspect-[4/5] overflow-hidden bg-[#e7dfd6]">
                    <div className="flex h-full items-center justify-center font-serif text-[72px] italic text-[#2b554e]/15">
                      {step.number}
                    </div>
                  </div>

                  <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
                    {step.number}
                  </p>

                  <h3 className="mt-2 font-serif text-[25px] text-[#2b554e]">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#6f6558]">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MATCH */}
        <section
          id="match"
          className="scroll-mt-[120px] bg-[#FCFAF6] py-16 md:py-24"
        >
          <div className="mx-auto grid max-w-[1300px] gap-10 px-5 sm:px-6 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
                Seu Match Caléa
              </p>

              <h2 className="mt-4 font-serif text-[42px] leading-[1] tracking-[-0.035em] text-[#2b554e] md:text-[58px]">
                Quanto mais conhecemos você,
                <span className="ml-2 italic text-[#8a7660]">
                  melhor fica a surpresa.
                </span>
              </h2>

              <p className="mt-6 max-w-[540px] text-sm leading-7 text-[#6f6558]">
                Conte quais peças você usa, acabamentos que prefere
                e estilos que combinam mais com você.
              </p>

              <button
                type="button"
                className="mt-8 rounded-full bg-[#2b554e] px-7 py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-white"
              >
                Fazer meu Match Caléa
              </button>
            </div>

            <div className="relative min-h-[470px] overflow-hidden bg-[#eee8df]">
              <img
                src="/box-match.jpg"
                alt="Seu Match Caléa"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* BENEFÍCIOS */}
        <section className="border-y border-[#2b554e]/10 bg-[#FCFAF6] py-12">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-5 text-center sm:grid-cols-2 md:grid-cols-4">
            <div>
              <p className="font-serif text-[23px] text-[#2b554e]">
                Curadoria
              </p>
              <p className="mt-1 text-xs text-[#6f6558]">
                baseada no seu estilo
              </p>
            </div>

            <div>
              <p className="font-serif text-[23px] text-[#2b554e]">
                Exclusividade
              </p>
              <p className="mt-1 text-xs text-[#6f6558]">
                seleções especiais
              </p>
            </div>

            <div>
              <p className="font-serif text-[23px] text-[#2b554e]">
                Valor especial
              </p>
              <p className="mt-1 text-xs text-[#6f6558]">
                benefício para assinantes
              </p>
            </div>

            <div>
              <p className="font-serif text-[23px] text-[#2b554e]">
                Surpresa
              </p>
              <p className="mt-1 text-xs text-[#6f6558]">
                uma nova experiência
              </p>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="bg-[#2b554e] py-20 text-center text-white md:py-28">
          <div className="mx-auto max-w-[850px] px-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d2b078]">
              Box Misteriosa Caléa
            </p>

            <h2 className="mt-4 font-serif text-[42px] leading-[1] md:text-[58px]">
              Você não escolhe a joia.
              <span className="ml-2 italic text-[#d2b078]">
                Você escolhe ser surpreendida.
              </span>
            </h2>

            <button
              type="button"
              onClick={() =>
                document.getElementById("planos")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              className="mt-9 rounded-full bg-[#FCFAF6] px-8 py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#2b554e]"
            >
              Quero minha Box
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type StyleSlug =
  | "sofisticado"
  | "delicado"
  | "elegante"
  | "romantico"
  | "statement"
  | "classico"
  | "maximalista"
  | "luxo"
  | "casual"
  | "minimalista"
  | "moderno";

type ScoreMap = Partial<Record<StyleSlug, number>>;

type Option = {
  label: string;
  description?: string;
  scores: ScoreMap;
};

type Question = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  options: Option[];
};

type Product = {
  id: string;
  slug?: string | null;
  name?: string | null;

  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  search_tags?: string[] | null;

  material_base?: string | null;
  main_plating?: string | null;

  piece_type?: string | null;
  piece_type_slug?: string | null;

  category?: string | null;
  category_slug?: string | null;

  style_slugs?: string[] | null;
  occasion_slugs?: string[] | null;

  image_url?: string | null;
  price?: number | null;
  regular_price?: number | null;
  sale_active?: boolean | null;

  match_percentage?: number;
  match_reason?: string;
};



const PRODUCTS_VIEW = "v_calea_match_products";
const CALEA_LOGO_SRC = "/logo_fundo_escuro_mobile.png";

const QUESTIONS: Question[] = [
  {
    id: "impact",
    eyebrow: "01 · Presença",
    title: "Quando você coloca uma joia, o que quer sentir?",
    subtitle:
      "Não pense demais. Escolha a resposta que mais parece com você.",
    options: [
      {
        label: "Que ela complete o look sem roubar a cena.",
        description: "Leve, delicada e fácil de repetir.",
        scores: {
          minimalista: 4,
          delicado: 4,
          classico: 2,
        },
      },
      {
        label: "Que ela dê aquele toque que muda tudo.",
        description: "Um detalhe atual, refinado e com personalidade.",
        scores: {
          moderno: 4,
          elegante: 3,
          sofisticado: 3,
          statement: 1,
        },
      },
      {
        label: "Que ela seja o centro do look.",
        description: "Presença, impacto e uma peça que fala por si.",
        scores: {
          statement: 5,
          maximalista: 4,
          luxo: 2,
        },
      },
    ],
  },
  {
    id: "routine",
    eyebrow: "02 · Rotina",
    title: "Como as joias entram no seu dia a dia?",
    subtitle:
      "Seu jeito de usar diz tanto quanto o estilo da peça.",
    options: [
      {
        label: "Uso quase todos os dias.",
        description: "Quero peças que funcionem sem precisar pensar muito.",
        scores: {
          casual: 4,
          minimalista: 3,
          delicado: 2,
        },
      },
      {
        label: "Gosto de uma composição mais arrumada.",
        description: "Prefiro um visual alinhado, elegante e atemporal.",
        scores: {
          elegante: 4,
          classico: 3,
          sofisticado: 2,
        },
      },
      {
        label: "Depende do look. Gosto de experimentar.",
        description: "Mudo as combinações e gosto de peças diferentes.",
        scores: {
          moderno: 4,
          statement: 3,
          maximalista: 2,
        },
      },
    ],
  },
  {
    id: "shape",
    eyebrow: "03 · Seu olhar",
    title: "Qual tipo de peça faz você parar para olhar?",
    subtitle:
      "Pense naquela joia que você percebe antes mesmo de ver o preço.",
    options: [
      {
        label: "Linhas finas e formas leves.",
        description: "Discreta, delicada e com acabamento sutil.",
        scores: {
          delicado: 5,
          minimalista: 4,
          romantico: 2,
        },
      },
      {
        label: "Design limpo, atual e diferente.",
        description: "Contemporânea, elegante e fora do óbvio.",
        scores: {
          moderno: 5,
          sofisticado: 3,
          elegante: 2,
        },
      },
      {
        label: "Volume, textura e presença.",
        description: "Uma peça que muda a composição inteira.",
        scores: {
          statement: 5,
          maximalista: 5,
          luxo: 2,
        },
      },
    ],
  },
  {
    id: "look",
    eyebrow: "04 · Seu look",
    title: "Seu armário costuma conversar com qual estética?",
    subtitle:
      "Não precisa ser uma regra. Escolha o que mais aparece nas suas combinações.",
    options: [
      {
        label: "Jeans, camisa, camiseta e peças fáceis.",
        description: "Visual descomplicado com detalhes bem escolhidos.",
        scores: {
          casual: 5,
          minimalista: 2,
          moderno: 1,
        },
      },
      {
        label: "Alfaiataria, neutros e clássicos.",
        description: "Linhas limpas, elegância e peças que duram no tempo.",
        scores: {
          classico: 5,
          elegante: 4,
          sofisticado: 2,
        },
      },
      {
        label: "Fashion, marcante e cheio de personalidade.",
        description: "Gosto de tendência, contraste e um pouco de impacto.",
        scores: {
          moderno: 4,
          statement: 4,
          maximalista: 3,
        },
      },
    ],
  },
  {
    id: "essence",
    eyebrow: "05 · Essência",
    title: "Qual frase parece mais com você?",
    subtitle:
      "Última pergunta. Aqui a gente fecha a leitura do seu estilo.",
    options: [
      {
        label: "Menos, mas muito bem escolhido.",
        description: "Prefiro qualidade visual a excesso de informação.",
        scores: {
          minimalista: 5,
          classico: 3,
          delicado: 2,
        },
      },
      {
        label: "Clássica, mas nunca óbvia.",
        description: "Gosto do atemporal com algum detalhe inesperado.",
        scores: {
          classico: 4,
          moderno: 4,
          elegante: 3,
        },
      },
      {
        label: "Se é para usar, é para aparecer.",
        description: "A joia também faz parte da mensagem do look.",
        scores: {
          maximalista: 5,
          statement: 5,
          luxo: 2,
        },
      },
    ],
  },
];

const OCCASIONS = [
  {
    slug: "dia-a-dia",
    label: "Dia a dia",
    description: "Leve, versátil e fácil de usar sempre.",
  },
  {
    slug: "trabalho",
    label: "Trabalho",
    description: "Elegância com praticidade para a rotina.",
  },
  {
    slug: "encontro",
    label: "Encontro",
    description: "Um detalhe especial sem parecer exagerado.",
  },
  {
    slug: "jantar",
    label: "Jantar",
    description: "Mais presença, com equilíbrio e sofisticação.",
  },
  {
    slug: "noite",
    label: "Noite",
    description: "Brilho e presença para produções noturnas.",
  },
  {
    slug: "evento",
    label: "Evento",
    description: "Uma composição mais refinada e especial.",
  },
  {
    slug: "festa",
    label: "Festa",
    description: "Quando o acessório também faz parte do look.",
  },
  {
    slug: "casamento",
    label: "Casamento",
    description: "Elegante, marcante e apropriado para a ocasião.",
  },
  {
    slug: "formatura",
    label: "Formatura",
    description: "Uma produção que merece um brilho à altura.",
  },
  {
    slug: "presente",
    label: "Presente",
    description: "Uma escolha especial para alguém importante.",
  },
];

const PROFILE_RULES = [
  {
    needs: ["classico", "moderno"],
    title: "Clássica Atual",
    text: "Você gosta de peças que atravessam tendências, mas sempre com um detalhe que tira o look do óbvio.",
  },
  {
    needs: ["minimalista", "delicado"],
    title: "Minimalista Delicada",
    text: "Seu estilo está nos pequenos detalhes: leve, feminino e fácil de repetir todos os dias.",
  },
  {
    needs: ["elegante", "sofisticado"],
    title: "Elegante Natural",
    text: "Você prefere peças refinadas, mas sem excesso. O efeito aparece na composição, não no exagero.",
  },
  {
    needs: ["statement", "maximalista"],
    title: "Marcante por Natureza",
    text: "Você não usa acessórios só para completar o look. Eles fazem parte da mensagem.",
  },
  {
    needs: ["casual", "minimalista"],
    title: "Casual Refinada",
    text: "Seu estilo funciona na vida real: peças fáceis, bonitas e com personalidade na medida certa.",
  },
  {
    needs: ["romantico", "delicado"],
    title: "Romântica Contemporânea",
    text: "Você gosta de delicadeza, mas com leitura atual. Feminina sem cair no óbvio.",
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function prettySlug(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function getPublicImageUrl(path?: string | null) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return data.publicUrl;
}


function canonicalPieceType(product: Product) {
  const raw = normalize(
    product.piece_type_slug ??
    product.piece_type ??
    product.category_slug ??
    product.category ??
    "",
  );

  if (["brinco", "brincos"].includes(raw)) return "brinco";
  if (["colar", "colares"].includes(raw)) return "colar";
  if (["anel", "aneis"].includes(raw)) return "anel";
  if (["pulseira", "pulseiras"].includes(raw)) return "pulseira";

  return raw;
}

function diversifyByPieceType(
  items: Array<{
    product: Product;
    totalScore: number;
  }>,
  limit = 8,
) {
  const requiredTypes = ["colar", "brinco", "anel", "pulseira"];

  const selected: typeof items = [];
  const usedIds = new Set<string>();

  // Primeiro garante o melhor item disponível de cada tipo.
  for (const type of requiredTypes) {
    const bestMatch = items.find(
      (item) =>
        canonicalPieceType(item.product) === type &&
        !usedIds.has(item.product.id),
    );

    if (bestMatch) {
      selected.push(bestMatch);
      usedIds.add(bestMatch.product.id);
    }
  }

  // Depois completa com os maiores scores gerais.
  for (const item of items) {
    if (selected.length >= limit) break;

    if (!usedIds.has(item.product.id)) {
      selected.push(item);
      usedIds.add(item.product.id);
    }
  }

  return selected.slice(0, limit);
}

export default function StyleQuiz() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [choosingOccasion, setChoosingOccasion] = useState(false);

  const quizScrollRef = useRef<HTMLElement>(null);

  function scrollQuizToTop() {
    requestAnimationFrame(() => {
      quizScrollRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  const scores = useMemo(() => {
    const total: Record<string, number> = {};

    Object.entries(answers).forEach(([questionIndex, optionIndex]) => {
      const question = QUESTIONS[Number(questionIndex)];
      const option = question?.options[optionIndex];

      if (!option) return;

      Object.entries(option.scores).forEach(([slug, score]) => {
        total[slug] = (total[slug] ?? 0) + (score ?? 0);
      });
    });

    return total;
  }, [answers]);

  const rankedStyles = useMemo(
    () =>
      Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([slug, score]) => ({ slug, score })),
    [scores],
  );

  const topStyles = rankedStyles.slice(0, 4);

  const profile = useMemo(() => {
    const top = new Set(rankedStyles.slice(0, 6).map((item) => item.slug));

    const matched = PROFILE_RULES.find((rule) =>
      rule.needs.every((slug) => top.has(slug)),
    );

    if (matched) return matched;

    const first = rankedStyles[0]?.slug;

    const fallback: Record<string, { title: string; text: string }> = {
      minimalista: {
        title: "Essencial Chic",
        text: "Você prefere peças leves, fáceis de combinar e que funcionam sem precisar pensar muito.",
      },
      moderno: {
        title: "Moderna por Instinto",
        text: "Você se conecta com design atual, linhas diferentes e detalhes que deixam o look mais interessante.",
      },
      classico: {
        title: "Clássica com Personalidade",
        text: "Você gosta do que permanece bonito por muito tempo, mas sem abrir mão de identidade.",
      },
      statement: {
        title: "Presença Máxima",
        text: "Para você, joia não é coadjuvante. É parte central da composição.",
      },
      casual: {
        title: "Casual Refinada",
        text: "Você prefere peças que entram na rotina com facilidade e elevam até o look mais simples.",
      },
    };

    return (
      fallback[first] ?? {
        title: "Seu Jeito Caléa",
        text: "Seu estilo mistura referências e muda com o momento. A melhor peça é aquela que faz sentido para você agora.",
      }
    );
  }, [rankedStyles]);

  const selectedOccasionLabel = useMemo(() => {
    return (
      OCCASIONS.find((occasion) => occasion.slug === selectedOccasion)?.label ??
      null
    );
  }, [selectedOccasion]);

  async function generateMatchReasons(
    matchedProducts: Product[],
    occasion: string,
  ) {
    if (matchedProducts.length === 0) return matchedProducts;

    setLoadingReasons(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "calea-match-ai",
        {
          body: {
            profile: profile.title,
            styles: rankedStyles.slice(0, 3).map((style) => style.slug),
            occasion,
            products: matchedProducts.slice(0, 8).map((product) => ({
              id: product.id,
              name: product.name,
              description:
                product.description ??
                product.seo_description ??
                "",
              style_slugs: product.style_slugs ?? [],
              occasion_slugs: product.occasion_slugs ?? [],
              piece_type: product.piece_type,
              category: product.category,
            })),
          },
        },
      );

      if (error) {
        console.error("Erro ao gerar justificativas:", error);

        return matchedProducts;
      }

      console.log("CALEA AI RESPONSE:", data);

      const matches = Array.isArray(data?.matches)
        ? data.matches
        : [];

      console.log("CALEA AI MATCHES:", matches);

      const reasonMap = new Map<string, string>();

      matches.forEach((item: { id?: string; reason?: string }) => {
        if (item.id && item.reason) {
          reasonMap.set(String(item.id), item.reason);
        }
      });

      const productsWithReasons = matchedProducts.map((product) => ({
        ...product,
        match_reason: reasonMap.get(String(product.id)) ?? "",
      }));

      console.log("PRODUTOS COM JUSTIFICATIVA:", productsWithReasons);

      return productsWithReasons;
    } catch (error) {
      console.error("Erro inesperado na Caléa AI:", error);
      return matchedProducts;
    } finally {
      setLoadingReasons(false);
    }
  }

  async function loadRecommendations(occasion: string) {
    setLoadingProducts(true);

    try {
      const { data, error } = await supabase
        .from(PRODUCTS_VIEW)
        .select("*")
        .limit(200);

      if (error) throw error;

      const wantedStyles = rankedStyles.slice(0, 6);

      const scoredProducts = ((data ?? []) as Product[])
        .map((product) => {
          const productStyles = (product.style_slugs ?? []).map(normalize);
          const productOccasions = (product.occasion_slugs ?? []).map(normalize);

          let styleScore = 0;

          wantedStyles.forEach((style, index) => {
            if (productStyles.includes(normalize(style.slug))) {
              const positionWeight = Math.max(1, 6 - index);
              styleScore += style.score * positionWeight;
            }
          });

          const occasionScore = productOccasions.includes(normalize(occasion))
            ? 40
            : 0;

          return {
            product,
            totalScore: styleScore + occasionScore,
          };
        })
        .sort((a, b) => b.totalScore - a.totalScore);

      // Mantém apenas produtos que tenham algum match de estilo ou ocasião.
      const eligibleProducts = scoredProducts.filter(
        (item) => item.totalScore > 0,
      );

      // Garante diversidade: tenta trazer ao menos um colar, brinco,
      // anel e pulseira, e completa o restante pelos maiores scores.
      const diversifiedProducts = diversifyByPieceType(
        eligibleProducts,
        8,
      );

      const maxScore = diversifiedProducts[0]?.totalScore ?? 1;

      const matchedProducts = diversifiedProducts.map((item) => ({
        ...item.product,
        match_percentage: Math.min(
          99,
          Math.max(
            60,
            Math.round((item.totalScore / maxScore) * 99),
          ),
        ),
      }));

      setProducts(matchedProducts);
      setLoadingProducts(false);

      const withReasons = await generateMatchReasons(
        matchedProducts,
        occasion,
      );

      setProducts(withReasons);
    } catch (error) {
      console.error("Erro ao buscar recomendações do quiz:", error);
      setProducts([]);
      setLoadingProducts(false);
    }
  }

  function choose(optionIndex: number) {
    setAnswers((current) => ({
      ...current,
      [step]: optionIndex,
    }));
  }

  function next() {
    if (answers[step] === undefined) return;

    if (step === QUESTIONS.length - 1) {
      setChoosingOccasion(true);
      scrollQuizToTop();
      return;
    }

    setStep((value) => value + 1);
    scrollQuizToTop();
  }

  async function chooseOccasion(occasion: string) {
    setSelectedOccasion(occasion);
    setChoosingOccasion(false);
    setFinished(true);
    await loadRecommendations(occasion);
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setProducts([]);
    setFinished(false);
    setSelectedOccasion(null);
    setChoosingOccasion(false);
    setLoadingProducts(false);
    setLoadingReasons(false);
  }

  const selected = answers[step];


  return (
    <>
      <section
        id="style-quiz"
        className="relative overflow-hidden scroll-mt-[125px]  bg-[#173a35] py-16 text-[#FCFAF6] md:py-20 lg:py-24"
      >
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-white/5" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full border border-[#d9bd8c]/10" />

        <div className="mx-auto grid max-w-[1560px] grid-cols-1 gap-12 px-5 md:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:px-10">
          <div>
            <div className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#d2aa6d]" strokeWidth={1.5} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#d2aa6d]">
                Seu Match Caléa
              </p>
            </div>

            <h2 className="mt-5 max-w-[760px] font-serif text-[44px] font-normal leading-[0.95] tracking-[-0.04em] md:text-[60px] lg:text-[72px]">
              Qual é o seu jeito
              <span className="block italic text-[#d9bd8c]">
                de usar joias?
              </span>
            </h2>
          </div>

          <div className="max-w-[520px] lg:justify-self-end">
            <p className="text-[15px] leading-7 text-white/68 md:text-[16px]">
              Cinco respostas. Um perfil. E uma seleção de peças reais da Caléa
              feita a partir do seu estilo e do momento que você quer viver.
            </p>

            <button
              type="button"
              onClick={() => {
                restart();
                setOpen(true);
              }}
              className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#FCFAF6] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#173a35] transition duration-300 hover:-translate-y-0.5 hover:bg-[#efe7dc]"
            >
              Descobrir meu estilo
              <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
            </button>

            <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-white/35">
              leva menos de 1 minuto
            </p>
          </div>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-[100] bg-[#F8F5EF]">
          <div className="flex h-full flex-col">
            <header className="flex min-h-[82px] items-center justify-between border-b border-[#173a35]/8 bg-[#F8F5EF]/95 px-5 backdrop-blur md:px-8 lg:px-12">
              <div className="flex min-w-0 items-center gap-4">
                <img
                  src={CALEA_LOGO_SRC}
                  alt="Caléa"
                  className="h-8 w-auto object-contain md:h-9"
                />

                {!finished && !choosingOccasion && (
                  <>
                    <span className="rounded-full border border-[#173a35]/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#173a35]/45">
                      {step + 1} de {QUESTIONS.length}
                    </span>

                    <div className="hidden items-center gap-2 md:flex">
                      {QUESTIONS.map((question, index) => (
                        <div
                          key={question.id}
                          className={[
                            "h-[3px] rounded-full transition-all duration-500",
                            index === step
                              ? "w-14 bg-[#b08d57]"
                              : index < step
                                ? "w-8 bg-[#173a35]"
                                : "w-8 bg-[#173a35]/10",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  </>
                )}

                {choosingOccasion && (
                  <span className="rounded-full border border-[#173a35]/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#173a35]/45">
                    Seu momento
                  </span>
                )}

                {finished && (
                  <span className="rounded-full border border-[#b08d57]/25 bg-[#b08d57]/8 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#8f7249]">
                    Seu resultado
                  </span>
                )}
              </div>

              <button
                type="button"
                aria-label="Fechar quiz"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#173a35]/10 text-[#173a35] transition hover:bg-[#173a35] hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </header>

            {!finished && !choosingOccasion ? (
              <main
                ref={quizScrollRef}
                className="flex flex-1 overflow-y-auto bg-[#F8F5EF]">
                <div className="mx-auto flex min-h-full w-full max-w-[1680px] flex-col px-5 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10">
                  <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 xl:gap-20">
                    <section className="flex flex-col py-2 lg:min-h-[650px] lg:justify-between lg:py-8">
                      <div className="max-w-[720px]">
                        <div className="inline-flex items-center gap-2 text-[#b08d57]">
                          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                            {QUESTIONS[step].eyebrow}
                          </p>
                        </div>

                        <h3 className="mt-6 max-w-[700px] font-serif text-[52px] font-normal leading-[0.94] tracking-[-0.045em] text-[#173a35] md:text-[68px] lg:text-[76px] xl:text-[88px]">
                          {QUESTIONS[step].title}
                        </h3>

                        <p className="mt-7 max-w-[560px] text-[15px] leading-7 text-[#173a35]/52 md:text-[16px] md:leading-8">
                          {QUESTIONS[step].subtitle}
                        </p>
                      </div>

                      <div className="mt-12 hidden max-w-[620px] lg:block">
                        <div className="flex items-center gap-4">
                          <div className="h-px flex-1 bg-[#173a35]/12" />
                          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#173a35]/35">
                            responda pelo seu instinto
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="flex flex-col justify-center">
                      <div className="grid gap-4 md:gap-5">
                        {QUESTIONS[step].options.map((option, optionIndex) => {
                          const active = selected === optionIndex;
                          const optionNumber = String(optionIndex + 1).padStart(2, "0");

                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => choose(optionIndex)}
                              className={[
                                "group relative min-h-[148px] overflow-hidden rounded-[28px] border px-6 py-6 text-left transition-all duration-300 md:min-h-[164px] md:px-8 md:py-7",
                                active
                                  ? "border-[#173a35] bg-[#173a35] text-white shadow-[0_22px_50px_rgba(23,58,53,0.18)]"
                                  : "border-[#173a35]/10 bg-white text-[#173a35] shadow-[0_10px_30px_rgba(23,58,53,0.04)] hover:-translate-y-1 hover:border-[#b08d57]/45 hover:shadow-[0_18px_42px_rgba(23,58,53,0.09)]",
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "absolute inset-y-0 left-0 w-[5px] transition-all duration-300",
                                  active ? "bg-[#d9bd8c]" : "bg-transparent group-hover:bg-[#b08d57]/45",
                                ].join(" ")}
                              />

                              <div className="flex h-full items-center gap-5 md:gap-6">
                                <div
                                  className={[
                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tracking-[0.14em] transition-all duration-300 md:h-14 md:w-14",
                                    active
                                      ? "border-[#d9bd8c] bg-[#d9bd8c] text-[#173a35]"
                                      : "border-[#173a35]/12 bg-[#F8F5EF] text-[#173a35]/42 group-hover:border-[#b08d57]/45 group-hover:text-[#8f7249]",
                                  ].join(" ")}
                                >
                                  {active ? (
                                    <Check className="h-5 w-5" strokeWidth={2} />
                                  ) : (
                                    optionNumber
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-[18px] font-medium leading-7 md:text-[21px] md:leading-8">
                                    {option.label}
                                  </p>

                                  {option.description && (
                                    <p
                                      className={[
                                        "mt-2 max-w-[660px] text-[13px] leading-6 md:text-[14px]",
                                        active ? "text-white/60" : "text-[#173a35]/46",
                                      ].join(" ")}
                                    >
                                      {option.description}
                                    </p>
                                  )}
                                </div>

                                <ArrowRight
                                  className={[
                                    "h-5 w-5 shrink-0 transition-all duration-300",
                                    active
                                      ? "translate-x-0 text-[#d9bd8c]"
                                      : "-translate-x-1 text-[#173a35]/20 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                                  ].join(" ")}
                                  strokeWidth={1.5}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>

                  <div className="mt-7 flex items-center justify-between border-t border-[#173a35]/10 pt-6 md:mt-9 md:pt-7">
                    <button
                      type="button"
                      onClick={() => {
                        setStep((value) => Math.max(0, value - 1));
                        scrollQuizToTop();
                      }}
                      disabled={step === 0}
                      className="inline-flex items-center gap-2 rounded-full px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#173a35]/55 transition hover:text-[#173a35] disabled:cursor-not-allowed disabled:opacity-20"
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
                      Voltar
                    </button>

                    <button
                      type="button"
                      onClick={next}
                      disabled={selected === undefined}
                      className="inline-flex min-w-[178px] items-center justify-center gap-3 rounded-full bg-[#173a35] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(23,58,53,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#214b44] disabled:cursor-not-allowed disabled:opacity-25 disabled:shadow-none"
                    >
                      {step === QUESTIONS.length - 1
                        ? "Seu momento"
                        : "Continuar"}
                      <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
                    </button>
                  </div>
                </div>
              </main>
            ) : choosingOccasion ? (
              <>
                <div className="h-[3px] bg-[#173a35]/6">
                  <div className="h-full w-full bg-[#b08d57]" />
                </div>

                <main className="flex flex-1 overflow-y-auto">
                  <div className="mx-auto w-full max-w-[1180px] px-5 py-10 md:px-8 md:py-14 lg:py-16">
                    <div className="mx-auto max-w-[760px] text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#b08d57]/10 text-[#b08d57]">
                        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                      </div>

                      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
                        Último detalhe
                      </p>

                      <h3 className="mt-3 font-serif text-[38px] font-normal leading-[1] tracking-[-0.035em] text-[#173a35] md:text-[52px]">
                        E hoje, qual é o seu
                        <span className="block italic text-[#8f7249]">
                          momento?
                        </span>
                      </h3>

                      <p className="mx-auto mt-5 max-w-[580px] text-[13px] leading-6 text-[#173a35]/55 md:text-[14px]">
                        Seu estilo já está definido. Agora a Caléa cruza esse perfil
                        com a ocasião para deixar a seleção mais precisa.
                      </p>
                    </div>

                    <div className="mx-auto mt-10 grid max-w-[980px] gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {OCCASIONS.map((occasion) => (
                        <button
                          key={occasion.slug}
                          type="button"
                          onClick={() => void chooseOccasion(occasion.slug)}
                          className="group min-h-[145px] rounded-[22px] border border-[#173a35]/10 bg-white/75 p-5 text-left text-[#173a35] transition duration-300 hover:-translate-y-1 hover:border-[#173a35] hover:bg-[#173a35] hover:text-white"
                        >
                          <div className="flex h-full flex-col justify-between">
                            <p className="font-serif text-[21px] leading-none">
                              {occasion.label}
                            </p>

                            <div className="mt-6">
                              <p className="text-[11px] leading-5 opacity-55">
                                {occasion.description}
                              </p>

                              <ArrowRight
                                className="mt-4 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                                strokeWidth={1.5}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </main>

                <footer className="flex min-h-[78px] items-center border-t border-[#173a35]/8 px-5 md:px-8 lg:px-12">
                  <button
                    type="button"
                    onClick={() => setChoosingOccasion(false)}
                    className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#173a35]/65"
                  >
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
                    Voltar
                  </button>
                </footer>
              </>
            ) : (
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 md:px-8 md:pt-12">
                  <div className="grid grid-cols-1 gap-10 border-b border-[#173a35]/10 pb-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
                    <div>
                      <div className="flex items-center gap-2 text-[#b08d57]">
                        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                          Seu estilo Caléa
                        </p>
                      </div>

                      <h3 className="mt-5 font-serif text-[48px] font-normal leading-[0.94] tracking-[-0.04em] text-[#173a35] md:text-[68px]">
                        {profile.title}
                      </h3>

                      <p className="mt-6 max-w-[650px] text-[15px] leading-7 text-[#173a35]/65 md:text-[16px] md:leading-8">
                        {profile.text}
                      </p>

                      <div className="mt-7 flex flex-wrap gap-2">
                        {topStyles.slice(0, 3).map((style) => (
                          <span
                            key={style.slug}
                            className="rounded-full border border-[#173a35]/10 bg-white/65 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#173a35]"
                          >
                            {prettySlug(style.slug)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="lg:justify-self-end">
                      <div className="rounded-[26px] border border-[#b08d57]/18 bg-[#b08d57]/7 px-6 py-5 md:min-w-[310px]">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8f7249]">
                          Seu momento
                        </p>

                        <p className="mt-2 font-serif text-[29px] text-[#173a35]">
                          {selectedOccasionLabel ?? "Seu momento"}
                        </p>

                        <p className="mt-2 text-[11px] leading-5 text-[#173a35]/50">
                          Usado junto com seu perfil para refinar os produtos recomendados.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12">
                    <div className="flex items-end justify-between gap-5">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b08d57]">
                          Seu Match
                        </p>
                        <h4 className="mt-2 font-serif text-[31px] text-[#173a35] md:text-[38px]">
                          Escolhidas para você
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={restart}
                        className="hidden items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#173a35]/55 md:inline-flex"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" strokeWidth={1.6} />
                        Refazer
                      </button>
                    </div>

                    {loadingReasons && !loadingProducts && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#173a35]/5 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#173a35]/55">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
                        Caléa AI está refinando seus matches
                      </div>
                    )}

                    {loadingProducts ? (
                      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index}>
                            <div className="aspect-[3/4] animate-pulse rounded-[18px] bg-[#173a35]/[0.06]" />
                            <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[#173a35]/[0.06]" />
                            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-[#173a35]/[0.06]" />
                          </div>
                        ))}
                      </div>
                    ) : products.length > 0 ? (
                      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
                        {products.map((product) => {
                          const name = product.name ?? "Peça Caléa";
                          const image = getPublicImageUrl(product.image_url);
                          const price = product.price;
                          const regularPrice = product.regular_price;

                          return (
                            <a
                              key={product.id}
                              href={product.slug ? `/produto/${product.slug}` : "#"}
                              className="group"
                            >
                              <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-[#eee9e1]">
                                {typeof product.match_percentage === "number" && (
                                  <div className="absolute left-3 top-3 z-10 rounded-full bg-[#FCFAF6]/95 px-3 py-2 text-[8px] font-bold uppercase tracking-[0.14em] text-[#173a35] shadow-sm backdrop-blur">
                                    {product.match_percentage}% match
                                  </div>
                                )}

                                {image ? (
                                  <img
                                    src={image}
                                    alt={name}
                                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.16em] text-[#173a35]/30">
                                    Caléa
                                  </div>
                                )}

                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                              </div>

                              <p className="mt-3 text-[14px] font-medium text-[#173a35] md:text-[15px]">
                                {name}
                              </p>

                              {typeof price === "number" && (
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <p className="text-[13px] font-medium text-[#173a35]">
                                    {money(price)}
                                  </p>

                                  {product.sale_active &&
                                    typeof regularPrice === "number" &&
                                    regularPrice > price && (
                                      <p className="text-[11px] text-[#173a35]/35 line-through">
                                        {money(regularPrice)}
                                      </p>
                                    )}
                                </div>
                              )}

                              {product.match_reason ? (
                                <div className="mt-3 border-l border-[#b08d57]/45 pl-3">
                                  <p className="text-[11px] leading-5 text-[#173a35]/55">
                                    {product.match_reason}
                                  </p>
                                </div>
                              ) : loadingReasons ? (
                                <div className="mt-3 h-10 animate-pulse rounded-xl bg-[#173a35]/[0.045]" />
                              ) : null}
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-8 rounded-[24px] border border-[#173a35]/10 bg-white/60 px-6 py-8">
                        <p className="font-serif text-[22px] text-[#173a35]">
                          Seu perfil está pronto.
                        </p>

                        <p className="mt-2 max-w-[620px] text-[13px] leading-6 text-[#173a35]/60">
                          Ainda não encontramos peças compatíveis na view{" "}
                          <strong>{PRODUCTS_VIEW}</strong>. Confira se os produtos
                          ativos possuem estilos e ocasiões vinculados.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={restart}
                      className="mt-10 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#173a35]/60 md:hidden"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" strokeWidth={1.6} />
                      Refazer quiz
                    </button>
                  </div>
                </div>
              </main>
            )}
          </div>
        </div>
      )}
    </>
  );
}
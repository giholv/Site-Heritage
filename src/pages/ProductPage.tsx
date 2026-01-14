import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { products } from "../data/Products"; // ajuste se seu arquivo for ../data/products

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-[#2b554e]/15 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-xs tracking-[0.18em] uppercase font-semibold text-[#2b554e]">
          {title}
        </span>
        <span className="text-2xl leading-none text-[#2b554e]">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && <div className="mt-3 text-sm text-[#2b554e]/75">{children}</div>}
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams();

  const product = useMemo(() => products.find((p) => p.slug === slug), [slug]);

  const imagens = useMemo(() => {
    if (!product) return [];
    return product.imagens?.length ? product.imagens : [product.imagem];
  }, [product]);

  const [mainImg, setMainImg] = useState(imagens[0] ?? "");
  const [qty, setQty] = useState(1);

  const [cep, setCep] = useState("");
  const [freteResult, setFreteResult] = useState<null | {
    servico: string;
    prazo: string;
    valor: string;
  }>(null);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.nome} - Caléa`;
    setMainImg(product.imagens?.[0] ?? product.imagem);
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FCFAF6]">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-10 text-[#2b554e]">
          Produto não encontrado.
        </div>
        <Footer />
      </div>
    );
  }

  const handleFrete = () => {
    const cepLimpo = onlyDigits(cep);
    if (cepLimpo.length !== 8) {
      setFreteResult(null);
      alert("CEP inválido. Digite 8 números.");
      return;
    }

    // MOCK (troca por API real depois)
    setFreteResult({
      servico: "PAC",
      prazo: "4-8 dias úteis",
      valor: "R$ 19,90",
    });
  };

  return (
    <div className="min-h-screen bg-[#FCFAF6]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-[140px] pb-10">
        {/* topo / voltar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/#lancamentos"
            className="text-sm text-[#2b554e]/70 hover:text-[#2b554e] underline underline-offset-4"
          >
            Voltar
          </Link>

          <div className="hidden md:flex text-xs text-[#2b554e]/55 gap-2">
            <Link to="/" className="hover:text-[#2b554e]">
              Início
            </Link>
            <span>/</span>
            <a href="/#lancamentos" className="hover:text-[#2b554e]">
              Lançamentos
            </a>
            <span>/</span>
            <span className="text-[#2b554e]/80">{product.nome}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* ESQUERDA - Galeria */}
          <div>
            <div className="bg-white/90 rounded-3xl shadow-md overflow-hidden border border-[#2b554e]/10">
              <div className="relative">
                {product.tag && (
                  <span className="absolute top-4 left-4 text-xs font-semibold bg-[#2b554e] text-[#F8F3EA] px-3 py-1 rounded-full">
                    {product.tag}
                  </span>
                )}

                <div className="w-full h-[560px] bg-white overflow-hidden">
                  <img
                    src={mainImg}
                    alt={product.nome}
                    className="w-full h-full object-cover"
                  />
                </div>

              </div>
            </div>

            {/* miniaturas */}
            <div className="mt-4 flex gap-3 flex-wrap">
              {imagens.map((img) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setMainImg(img)}
                  className={`h-20 w-20 rounded-2xl overflow-hidden border shadow-sm bg-white ${mainImg === img
                    ? "border-[#b08d57]"
                    : "border-[#2b554e]/10"
                    }`}
                  aria-label="Trocar imagem"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* DIREITA - Compra (no estilo ) */}
          <div className="lg:sticky lg:top-28 h-fit">
            <div className="bg-white/90 rounded-3xl shadow-md border border-[#2b554e]/10 p-6">
              <h1 className="text-2xl md:text-3xl font-semibold text-[#2b554e]">
                {product.nome}
              </h1>

              {product.descricao && (
                <p className="mt-2 text-sm text-[#2b554e]/70">{product.descricao}</p>
              )}

              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="text-2xl font-semibold text-[#b08d57]">
                  {formatBRL(product.preco)}
                </div>
                <div className="text-xs text-[#2b554e]/60">
                  10x sem juros
                </div>
              </div>

              {/* quantidade + botão */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center border border-[#2b554e]/15 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    className="w-11 h-11 text-lg text-[#2b554e] hover:bg-[#2b554e]/5"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <div className="w-14 h-11 flex items-center justify-center text-sm font-semibold text-[#2b554e]">
                    {qty}
                  </div>
                  <button
                    type="button"
                    className="w-11 h-11 text-lg text-[#2b554e] hover:bg-[#2b554e]/5"
                    onClick={() => setQty((q) => q + 1)}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className="flex-1 h-11 rounded-2xl bg-[#2b554e] text-[#FCFAF6] text-sm font-semibold hover:bg-[#23463f] transition-colors"
                  onClick={() => {
                    console.log("Adicionar ao carrinho:", product.slug, "qty:", qty);
                    alert(`Adicionado: ${product.nome} (x${qty})`);
                  }}
                >
                  Adicionar ao carrinho
                </button>
              </div>

              {/* frete */}
              <div className="mt-8">
                <div className="text-xs tracking-[0.18em] uppercase font-semibold text-[#2b554e]">
                  Frete e prazo de entrega
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="Digite o CEP"
                    className="flex-1 border border-[#2b554e]/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#b08d57] bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleFrete}
                    className="px-6 rounded-2xl bg-[#b08d57] text-white text-sm font-semibold hover:opacity-95"
                  >
                    OK
                  </button>
                </div>

                {freteResult && (
                  <div className="mt-4 p-4 rounded-2xl border border-[#2b554e]/10 bg-[#FCFAF6] text-sm">
                    <div className="font-semibold text-[#2b554e]">
                      {freteResult.servico}
                    </div>
                    <div className="text-[#2b554e]/70">
                      Prazo: {freteResult.prazo}
                    </div>
                    <div className="text-[#2b554e]/70">
                      Valor: {freteResult.valor}
                    </div>
                  </div>
                )}
              </div>

              {/* sanfona */}
              <div className="mt-8">
                <Accordion title="Descrição do produto" defaultOpen>
                  <p>{product.descriptionFull ?? "Sem descrição detalhada ainda."}</p>
                </Accordion>

                <Accordion title="Composição">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Banho premium</li>
                    <li>Acabamento espelhado</li>
                    <li>Embalagem presenteável</li>
                  </ul>
                </Accordion>

                <Accordion title="Cuidados">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Evite água, perfume e produtos químicos</li>
                    <li>Guarde em local seco, de preferência no saquinho/caixinha</li>
                    <li>Limpe com flanela macia</li>
                  </ul>
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

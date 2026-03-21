import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  Gem,
  RefreshCcw,
} from "lucide-react";

type Variant = {
  id: string;
  label: string;
};

export type ProductImage = {
  id: string;
  src: string;
  alt: string;
};

type ProductHeroProps = {
  name: string;
  description: string;
  price: number;
  installmentText?: string;
  variants?: Variant[];
  selectedVariant?: string;
  onSelectVariant: (variantId: string) => void;
  quantity: number;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  images?: ProductImage[];
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  onCalculateShipping: () => void;
  shippingText?: string;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
      <rect width="100%" height="100%" fill="#f3efe8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="32" fill="#7c8884">
        Imagem indisponível
      </text>
    </svg>
  `);

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ProductHero({
  name,
  description,
  price,
  installmentText = "10x sem juros",
  variants = [],
  selectedVariant = "",
  onSelectVariant,
  quantity,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onAddToCart,
  onBuyNow,
  images = [],
  postalCode,
  onPostalCodeChange,
  onCalculateShipping,
  shippingText,
}: ProductHeroProps) {
  const [activeImage, setActiveImage] = useState(0);

  const safeImages = Array.isArray(images) ? images : [];

  const displayImages: ProductImage[] =
    safeImages.length > 0
      ? safeImages
      : [
          {
            id: "fallback",
            src: FALLBACK_IMAGE,
            alt: name || "Produto",
          },
        ];

  useEffect(() => {
    setActiveImage(0);
  }, [displayImages[0]?.id]);

  useEffect(() => {
    if (activeImage > displayImages.length - 1) {
      setActiveImage(0);
    }
  }, [activeImage, displayImages.length]);

  const currentImage = useMemo(() => {
    return displayImages[activeImage] ?? displayImages[0];
  }, [displayImages, activeImage]);

  const prevImage = () => {
    if (displayImages.length <= 1) return;
    setActiveImage((prev) =>
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
  };

  const nextImage = () => {
    if (displayImages.length <= 1) return;
    setActiveImage((prev) =>
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <section className="w-full bg-[#f8f6f2] py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="rounded-[28px] border border-[#e6e0d6] bg-white p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="relative overflow-hidden rounded-[22px] bg-[#f3efe8]">
              <img
                src={currentImage.src}
                alt={currentImage.alt || name}
                className="h-[420px] w-full object-cover md:h-[620px]"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              {displayImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2b554e] shadow-md transition hover:scale-105"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2b554e] shadow-md transition hover:scale-105"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            {displayImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {displayImages.map((image, index) => {
                  const active = index === activeImage;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`shrink-0 overflow-hidden rounded-2xl border transition ${
                        active
                          ? "border-[#2b554e] ring-2 ring-[#2b554e]/15"
                          : "border-[#ddd6ca] hover:border-[#b08d57]"
                      }`}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-24 w-24 object-cover md:h-28 md:w-28"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[#e6e0d6] bg-white p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-[#b08d57]">
                  Caléa Blanc
                </p>

                <h1 className="text-3xl font-semibold tracking-tight text-[#23473f] md:text-5xl">
                  {name}
                </h1>
              </div>

              <div className="max-w-xl space-y-3 text-[15px] leading-7 text-[#4c5d59] md:text-base">
                <p>{description || ""}</p>
              </div>

              <div className="border-t border-b border-[#eee7dc] py-5">
                <div className="text-4xl font-semibold tracking-tight text-[#b08d57] md:text-5xl">
                  {formatBRL(price)}
                </div>
                <p className="mt-2 text-sm text-[#6e7a76]">{installmentText}</p>
              </div>

              {variants.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#7c8884]">
                    Versão
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {variants.map((variant) => {
                      const active = selectedVariant === variant.id;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => onSelectVariant(variant.id)}
                          className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                            active
                              ? "bg-[#2b554e] text-white shadow-[0_8px_18px_rgba(43,85,78,0.22)]"
                              : "border border-[#d8d0c4] bg-white text-[#2b554e] hover:border-[#2b554e]"
                          }`}
                        >
                          {variant.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
                <div className="flex h-14 items-center justify-between rounded-full border border-[#d9d1c6] bg-[#faf8f4] px-4">
                  <button
                    type="button"
                    onClick={onDecreaseQuantity}
                    className="text-xl text-[#2b554e] transition hover:opacity-70"
                    aria-label="Diminuir quantidade"
                  >
                    -
                  </button>

                  <span className="text-base font-medium text-[#23473f]">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={onIncreaseQuantity}
                    className="text-xl text-[#2b554e] transition hover:opacity-70"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onAddToCart}
                  className="h-14 rounded-full bg-[#2b554e] px-6 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Adicionar à sacola
                </button>
              </div>

              <button
                type="button"
                onClick={onBuyNow}
                className="h-14 w-full rounded-full border border-[#2b554e] bg-white px-6 text-sm font-semibold text-[#2b554e] transition hover:bg-[#f4f8f7]"
              >
                Comprar agora
              </button>

              <div className="grid grid-cols-1 gap-3 rounded-[24px] bg-[#f8f6f2] p-4 md:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <ShieldCheck className="mt-0.5 text-[#2b554e]" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-[#23473f]">
                      1 ano de garantia
                    </p>
                    <p className="mt-1 text-sm text-[#697671]">
                      Cobertura sobre o banho após a compra.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <Gem className="mt-0.5 text-[#2b554e]" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-[#23473f]">
                      Banho premium + verniz
                    </p>
                    <p className="mt-1 text-sm text-[#697671]">
                      Mais brilho, acabamento e durabilidade.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <Truck className="mt-0.5 text-[#2b554e]" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-[#23473f]">
                      Envio rápido
                    </p>
                    <p className="mt-1 text-sm text-[#697671]">
                      Prazo calculado conforme seu CEP.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <RefreshCcw className="mt-0.5 text-[#2b554e]" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-[#23473f]">
                      Troca fácil
                    </p>
                    <p className="mt-1 text-sm text-[#697671]">
                      Atendimento simples e rápido no pós-venda.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e6e0d6] bg-[#fcfbf8] p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-[#7c8884]">
                  Calcule frete e prazo
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px]">
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => onPostalCodeChange(e.target.value)}
                    placeholder="Digite seu CEP"
                    className="h-14 rounded-2xl border border-[#d9d1c6] bg-white px-4 text-sm text-[#23473f] outline-none transition placeholder:text-[#9aa39f] focus:border-[#2b554e]"
                  />

                  <button
                    type="button"
                    onClick={onCalculateShipping}
                    className="h-14 rounded-2xl bg-[#b08d57] px-5 text-sm font-semibold text-white transition hover:brightness-105"
                  >
                    Calcular
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4">
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 text-[#2b554e]" size={18} />
                    <div>
                      <p className="text-sm font-semibold text-[#23473f]">
                        Entrega e prazo
                      </p>
                      <p className="mt-1 text-sm text-[#697671]">
                        {shippingText ||
                          "Digite seu CEP para consultar o prazo de entrega."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] bg-[#f8f6f2] p-5">
                <p className="text-sm font-semibold text-[#23473f]">
                  Destaques da peça
                </p>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5e6c68]">
                  <li>• Design orgânico com estética elegante e contemporânea</li>
                  <li>• Inspiração nas formas fluidas da Art Nouveau</li>
                  <li>• Leve, versátil e fácil de combinar</li>
                  <li>• Ideal para elevar produções minimalistas ou sofisticadas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  Gem,
  RefreshCcw,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
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

type ShippingOption = {
  id: string;
  name: string;
  price: number;
  deadline: string;
  original_price?: number;
  posting_type?: string;
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
  availableQty?: number;
  images?: ProductImage[];
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  onCalculateShipping: () => void;
  shippingLoading?: boolean;
  shippingError?: string;
  shippingOptions?: ShippingOption[];
  selectedShippingId?: string;
  onSelectShipping?: (shippingId: string) => void;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
      <rect width="100%" height="100%" fill="#f3efe8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="32" fill="#7c8884">
        Foto em breve
      </text>
    </svg>
  `);

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export default function ProductHero({
  name,
  description,
  price,
  installmentText = "em até 3x sem juros",
  variants = [],
  selectedVariant = "",
  onSelectVariant,
  quantity,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onAddToCart,
  onBuyNow,
  availableQty = 0,
  images = [],
  postalCode,
  onPostalCodeChange,
  onCalculateShipping,
  shippingLoading = false,
  shippingError = "",
  shippingOptions = [],
  selectedShippingId: _selectedShippingId = "",
  onSelectShipping: _onSelectShipping,
}: ProductHeroProps) {
  const [activeImage, setActiveImage] = useState(0);

  const hasStockLoaded = availableQty !== undefined && availableQty !== null;

  const isAvailable =
    hasStockLoaded && Number(availableQty) > 0;

  const displayImages: ProductImage[] =
    Array.isArray(images) && images.length > 0
      ? images
      : [{ id: "fallback", src: FALLBACK_IMAGE, alt: name || "Produto" }];

  useEffect(() => {
    setActiveImage(0);
  }, [displayImages[0]?.id]);

  const currentImage = useMemo(() => {
    return displayImages[activeImage] ?? displayImages[0];
  }, [displayImages, activeImage]);

  function prevImage() {
    if (displayImages.length <= 1) return;
    setActiveImage((prev) =>
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
  }

  function nextImage() {
    if (displayImages.length <= 1) return;
    setActiveImage((prev) =>
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
  }

  return (
    <>
      <section className="w-full bg-[#fcfaf6] pb-28 lg:pb-12">
        <div className="mx-auto max-w-7xl px-0 lg:px-8">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <div className="self-start lg:sticky lg:top-[155px]">
              <div className="bg-[#f5f0e8] lg:rounded-[28px] lg:border lg:border-[#e7ded2] lg:bg-white lg:p-4 lg:shadow-[0_18px_50px_rgba(43,85,78,0.07)]">
                <div className="relative overflow-hidden bg-[#f3efe8] lg:rounded-[28px]">
                  {hasStockLoaded && !isAvailable && (
                    <div className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7b746b] shadow-sm">
                      Esgotado
                    </div>
                  )}

                  <img
                    src={currentImage.src}
                    alt={currentImage.alt || name}
                    className="h-[58vh] w-full object-cover sm:h-[62vh] md:aspect-[4/5] md:h-auto" onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />

                  {displayImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2b554e] shadow-md backdrop-blur"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <button
                        type="button"
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2b554e] shadow-md backdrop-blur"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 hidden grid-cols-2 gap-3 lg:grid">
                <BenefitCard icon={<ShieldCheck size={18} />} title="1 ano de garantia" text="Cobertura sobre o banho." />
                <BenefitCard icon={<Gem size={18} />} title="Banho premium" text="Acabamento com verniz." />
                <BenefitCard icon={<Truck size={18} />} title="Envio rápido" text="Prazo conforme seu CEP." />
                <BenefitCard icon={<RefreshCcw size={18} />} title="Troca fácil" text="Atendimento simples." />
              </div>
            </div>

            <div className="px-4 pt-5 lg:px-0 lg:pt-0">
              <div className="rounded-none bg-[#fcfaf6] lg:rounded-[34px] lg:border lg:border-[#e7ded2] lg:bg-white lg:p-8 lg:shadow-[0_18px_50px_rgba(43,85,78,0.06)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#b08d57]">
                  Caléa Blanc
                </p>

                <h1 className="mt-3 text-[34px] font-light leading-[1.03] tracking-[-0.045em] text-[#2b554e] md:text-[46px] lg:text-[52px]">
                  {name}
                </h1>

                <div className="mt-5 border-b border-[#ece3d8] pb-6">
                  <span className="text-[38px] font-semibold tracking-[-0.045em] text-[#2b554e] md:text-[48px]">
                    {formatBRL(price)}
                  </span>
                  <p className="mt-1 text-sm text-[#7b746b]">
                    {installmentText}
                  </p>
                </div>

                {variants.length > 0 && (
                  <div className="mt-7">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#81786e]">
                      Versão
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3">
                      {variants.map((variant) => {
                        const active = selectedVariant === variant.id;

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => onSelectVariant(variant.id)}
                            className={[
                              "min-h-[46px] rounded-full border px-5 text-sm font-medium transition",
                              active
                                ? "border-[#2b554e] bg-[#2b554e] text-white"
                                : "border-[#d9d1c7] bg-white text-[#2b554e]",
                            ].join(" ")}
                          >
                            {variant.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-[#81786e]">
                    Quantidade
                  </p>

                  <div className="flex h-[56px] w-[150px] items-center justify-between rounded-full border border-[#ddd5ca] bg-white px-5">
                    <button type="button" onClick={onDecreaseQuantity} className="text-[#2b554e]">
                      <Minus size={16} />
                    </button>

                    <span className="text-base font-semibold text-[#23473f]">
                      {quantity}
                    </span>

                    <button type="button" onClick={onIncreaseQuantity} className="text-[#2b554e]">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 hidden lg:block">
                  {isAvailable ? (
                    <div className="grid gap-3 lg:grid-cols-[1fr_0.85fr]">
                      <button
                        type="button"
                        onClick={onAddToCart}
                        className="h-[58px] rounded-full bg-[#2b554e] px-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_14px_35px_rgba(43,85,78,0.22)]"
                      >
                        Adicionar ao carrinho
                      </button>

                      <button
                        type="button"
                        onClick={onBuyNow}
                        className="h-[58px] rounded-full border border-[#2b554e] bg-white px-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#2b554e]"
                      >
                        Comprar agora
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-[#e6ddd1] bg-white p-5 shadow-[0_10px_30px_rgba(43,85,78,0.06)]">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ddd5ca] bg-[#fcfaf6] text-[#2b554e]">
                          <ShoppingBag size={20} />
                        </div>

                        <div>
                          <p className="text-base font-semibold text-[#2b554e]">
                            Produto indisponível
                          </p>

                          <p className="mt-1 text-sm leading-6 text-[#6f6a63]">
                            Este produto está sem estoque no momento.
                          </p>

                          <p className="text-sm leading-6 text-[#6f6a63]">
                            Cadastre-se para ser avisado quando voltar.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-5 h-[52px] w-full rounded-full border border-[#2b554e] bg-white text-sm font-semibold uppercase tracking-[0.12em] text-[#2b554e]"
                      >
                        Avise quando chegar
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8 grid grid-cols-1 gap-2 lg:hidden">
                  <MobileBenefit icon={<ShieldCheck size={17} />} text="1 ano de garantia sobre o banho" />
                  <MobileBenefit icon={<Gem size={17} />} text="Banho premium com acabamento em verniz" />
                  <MobileBenefit icon={<Truck size={17} />} text="Envio rápido com cálculo por CEP" />
                  <MobileBenefit icon={<RefreshCcw size={17} />} text="Troca fácil e atendimento humanizado" />
                </div>

                {description && (
                  <div className="mt-9 border-t border-[#ece3d8] pt-7">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#81786e]">
                      Sobre a peça
                    </p>

                    <p className="mt-4 text-[15px] leading-8 text-[#5f5b57]">
                      {description}
                    </p>
                  </div>
                )}

                <div className="mt-9 rounded-[26px] border border-[#e7ded3] bg-[#fffdf9] p-5 lg:p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#b08d57]" />
                    <p className="text-base font-semibold text-[#2b554e]">
                      Calcular entrega
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]">
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => onPostalCodeChange(e.target.value)}
                      placeholder="Digite seu CEP"
                      className="h-[52px] rounded-full border border-[#d9d1c6] bg-white px-5 text-sm text-[#23473f] outline-none"
                    />

                    <button
                      type="button"
                      onClick={onCalculateShipping}
                      disabled={shippingLoading}
                      className="h-[52px] rounded-full bg-[#2b554e] px-5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {shippingLoading ? "Calculando..." : "Calcular"}
                    </button>
                  </div>

                  {shippingError && (
                    <p className="mt-4 text-sm text-red-600">{shippingError}</p>
                  )}

                  {!shippingLoading && !shippingError && shippingOptions.length === 0 && (
                    <p className="mt-4 text-sm leading-6 text-[#697671]">
                      Informe seu CEP para consultar prazo e valor do frete.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e8dfd3] bg-[#fcfaf6]/92 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 shadow-[0_-10px_30px_rgba(43,85,78,0.08)] backdrop-blur-xl lg:hidden">        <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#81786e]">
            Total
          </p>
          <p className="text-lg font-semibold text-[#2b554e]">
            {formatBRL(price)}
          </p>
        </div>

        <div className="flex h-10 items-center rounded-full border border-[#ddd5ca] bg-white px-2">
          <button type="button" onClick={onDecreaseQuantity} className="flex h-8 w-8 items-center justify-center text-[#2b554e]">
            <Minus size={15} />
          </button>

          <span className="w-7 text-center text-sm font-semibold text-[#2b554e]">
            {quantity}
          </span>

          <button type="button" onClick={onIncreaseQuantity} className="flex h-8 w-8 items-center justify-center text-[#2b554e]">
            <Plus size={15} />
          </button>
        </div>
      </div>

        <button
          type="button"
          onClick={isAvailable ? onAddToCart : undefined}
          disabled={!hasStockLoaded || !isAvailable}
          className={[
            "h-[56px] w-full rounded-full text-sm font-semibold uppercase tracking-[0.12em]",
            isAvailable
              ? "bg-[#2b554e] text-white shadow-[0_12px_28px_rgba(43,85,78,0.22)]"
              : "border border-[#2b554e] bg-white text-[#2b554e]",
          ].join(" ")}
        >
          {!hasStockLoaded
            ? "Carregando..."
            : isAvailable
              ? "Adicionar ao carrinho"
              : "Avise quando chegar"}
        </button>
      </div>
    </>
  );
}

function BenefitCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#ebe4d8] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[#2b554e]">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-[#23473f]">{title}</p>
          <p className="mt-1 text-sm text-[#697671]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MobileBenefit({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ebe4d8] bg-white px-4 py-3">
      <div className="text-[#2b554e]">{icon}</div>
      <p className="text-sm text-[#52615d]">{text}</p>
    </div>
  );
}
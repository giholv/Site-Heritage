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
  availableQty?: number;
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
  carrier?: string;
  carrier_code?: string;
  delivery_time?: number;
  allow_buy_label?: boolean;
  raw?: any;
};

type ProductHeroProps = {
  name: string;
  description: string;
  price: number;
  oldPrice?: number | null;
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
  isAvailable: boolean;
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

function normalizeQty(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export default function ProductHero({
  name,
  description,
  price,
  oldPrice = null,
  installmentText,
  variants = [],
  selectedVariant = "",
  onSelectVariant,
  quantity,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onAddToCart,
  onBuyNow,
  availableQty = 0,
  isAvailable,
  images = [],
  postalCode,
  onPostalCodeChange,
  onCalculateShipping,
  shippingLoading = false,
  shippingError = "",
  shippingOptions = [],
  selectedShippingId = "",
  onSelectShipping,
}: ProductHeroProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [showAddedMessage, setShowAddedMessage] = useState(false);

  const hasDiscount = Boolean(oldPrice && oldPrice > price);
  const safeAvailableQty = normalizeQty(availableQty);

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
    setActiveImage((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  }

  function nextImage() {
    if (displayImages.length <= 1) return;
    setActiveImage((prev) =>
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
  }

  function handleAddToCartClick() {
    if (!isAvailable || showAddedMessage) return;

    onAddToCart();
    setShowAddedMessage(true);
  }

  useEffect(() => {
    if (!showAddedMessage) return;

    const timer = window.setTimeout(() => {
      setShowAddedMessage(false);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [showAddedMessage]);

  return (
    <>
      <section className="w-full bg-[#FCFAF6] pb-28 lg:pb-16">
        <div className="mx-auto max-w-[1500px] px-0 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 xl:gap-10">

            {/* GALERIA */}
            <div className="self-start lg:sticky lg:top-[128px]">
              <div className="relative bg-[#f3efe8]">
                {!isAvailable && (
                  <div className="absolute left-4 top-4 z-20 bg-[#FCFAF6]/95 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6e665d] backdrop-blur">
                    Esgotado
                  </div>
                )}

                <img
                  src={currentImage.src}
                  alt={currentImage.alt || name}
                  className="block h-[58vh] w-full object-cover sm:h-[64vh] md:h-auto md:aspect-[4/5]"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />

                {displayImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      aria-label="Imagem anterior"
                      className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-[#FCFAF6]/88 text-[#173a35] shadow-sm backdrop-blur-md transition hover:bg-white md:left-5"
                    >
                      <ChevronLeft size={18} strokeWidth={1.5} />
                    </button>

                    <button
                      type="button"
                      onClick={nextImage}
                      aria-label="Próxima imagem"
                      className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-[#FCFAF6]/88 text-[#173a35] shadow-sm backdrop-blur-md transition hover:bg-white md:right-5"
                    >
                      <ChevronRight size={18} strokeWidth={1.5} />
                    </button>

                    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 md:hidden">
                      {displayImages.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          aria-label={`Ver imagem ${index + 1}`}
                          onClick={() => setActiveImage(index)}
                          className={[
                            "h-1.5 rounded-full transition-all",
                            index === activeImage
                              ? "w-7 bg-white"
                              : "w-1.5 bg-white/55",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* MINIATURAS DESKTOP */}
              {displayImages.length > 1 && (
                <div className="mt-3 hidden gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex">
                  {displayImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      aria-label={`Ver imagem ${index + 1}`}
                      className={[
                        "relative h-[92px] w-[74px] shrink-0 overflow-hidden border transition",
                        index === activeImage
                          ? "border-[#2b554e]"
                          : "border-transparent opacity-70 hover:opacity-100",
                      ].join(" ")}
                    >
                      <img
                        src={image.src}
                        alt={image.alt || name}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* INFORMAÇÕES */}
            <div className="px-5 pt-7 md:px-0 lg:pt-1">
              <div className="mx-auto max-w-[590px] lg:mx-0">
                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#b08d57] md:text-[12px]">
                  Caléa Blanc
                </p>

                <h1 className="mt-3 font-serif text-[40px] font-normal leading-[0.98] tracking-[-0.025em] text-[#2b554e] md:text-[50px] lg:text-[56px]">
                  {name}
                </h1>

                {/* PREÇO */}
                <div className="mt-6 border-b border-[#2b554e]/12 pb-6">
                  {hasDiscount && (
                    <p className="mb-1 text-[13px] text-[#938a80] line-through">
                      {formatBRL(oldPrice || 0)}
                    </p>
                  )}

                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-[28px] font-medium tracking-[-0.03em] text-[#173a35] md:text-[34px]">
                      {formatBRL(price)}
                    </span>

                    {hasDiscount && oldPrice ? (
                      <span className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#b08d57]">
                        {Math.round(((oldPrice - price) / oldPrice) * 100)}% off
                      </span>
                    ) : null}
                  </div>

                  {installmentText ? (
                    <p className="mt-2 text-[14px] text-[#716a62]">
                      {installmentText}
                    </p>
                  ) : (
                    <p className="mt-2 text-[14px] text-[#716a62]">
                      ou em até 6x sem juros
                    </p>
                  )}

                  {isAvailable && safeAvailableQty > 0 && safeAvailableQty <= 2 && (
                    <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#9b7048]">
                      Últimas {safeAvailableQty} unidades
                    </p>
                  )}
                </div>

                {/* VARIAÇÕES */}
                {variants.length > 0 && (
                  <div className="mt-7">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#6f675e]">
                        Escolha a versão
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {variants.map((variant) => {
                        const active = selectedVariant === variant.id;
                        const variantAvailable =
                          normalizeQty(variant.availableQty) > 0;

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => onSelectVariant(variant.id)}
                            className={[
                              "min-h-[44px] border px-5 text-[14px] transition",
                              active
                                ? "border-[#2b554e] bg-[#2b554e] text-white"
                                : "border-[#d8d0c5] bg-transparent text-[#2b554e] hover:border-[#2b554e]",
                              !variantAvailable
                                ? "cursor-not-allowed opacity-40"
                                : "",
                            ].join(" ")}
                          >
                            {variant.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* QUANTIDADE */}
                {isAvailable && (
                  <div className="mt-7 flex items-end justify-between gap-5 border-b border-[#2b554e]/12 pb-7">
                    <div>
                      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#6f675e]">
                        Quantidade
                      </p>

                      <div className="flex h-[44px] w-[126px] items-center justify-between border border-[#d8d0c5] bg-white">
                        <button
                          type="button"
                          onClick={onDecreaseQuantity}
                          aria-label="Diminuir quantidade"
                          className="flex h-full w-10 items-center justify-center text-[#2b554e] transition hover:bg-[#f7f3ec]"
                        >
                          <Minus size={15} />
                        </button>

                        <span className="text-sm font-medium text-[#23473f]">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={onIncreaseQuantity}
                          disabled={quantity >= safeAvailableQty}
                          aria-label="Aumentar quantidade"
                          className="flex h-full w-10 items-center justify-center text-[#2b554e] transition hover:bg-[#f7f3ec] disabled:opacity-30"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>

                    {safeAvailableQty > 2 && (
                      <p className="pb-3 text-[12px] text-[#81786e]">
                        Em estoque
                      </p>
                    )}
                  </div>
                )}

                {/* CTA DESKTOP */}
                <div className="mt-7 hidden lg:block">
                  {isAvailable ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_0.82fr]">
                        <button
                          type="button"
                          onClick={handleAddToCartClick}
                          disabled={showAddedMessage}
                          className="h-[56px] bg-[#2b554e] px-6 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#173a35] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {showAddedMessage
                            ? "Adicionado"
                            : "Adicionar ao carrinho"}
                        </button>

                        <button
                          type="button"
                          onClick={onBuyNow}
                          className="h-[56px] border border-[#2b554e] bg-transparent px-6 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#2b554e] transition hover:bg-[#2b554e] hover:text-white"
                        >
                          Comprar agora
                        </button>
                      </div>

                      {showAddedMessage && (
                        <p className="mt-3 text-[12px] font-medium text-[#2b554e]">
                          ✓ Item adicionado ao carrinho.
                        </p>
                      )}
                    </>
                  ) : (
                    <UnavailableBox />
                  )}
                </div>

                {/* BENEFÍCIOS */}
                <div className="mt-8 grid grid-cols-2 border-y border-[#2b554e]/12 lg:grid-cols-4">
                  <BenefitLine
                    icon={<ShieldCheck size={17} strokeWidth={1.5} />}
                    title="1 ano"
                    text="de garantia"
                  />
                  <BenefitLine
                    icon={<Gem size={17} strokeWidth={1.5} />}
                    title="Banho"
                    text="premium"
                  />
                  <BenefitLine
                    icon={<Truck size={17} strokeWidth={1.5} />}
                    title="Envio"
                    text="para todo Brasil"
                  />
                  <BenefitLine
                    icon={<RefreshCcw size={17} strokeWidth={1.5} />}
                    title="Troca"
                    text="facilitada"
                  />
                </div>

                {/* SOBRE */}
                {description && (
                  <div className="mt-9">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8b8176]">
                      Sobre a peça
                    </p>

                    <p className="mt-4 max-w-[540px] text-[15px] leading-7 text-[#5f5b57] md:text-[16px] md:leading-8">
                      {description}
                    </p>
                  </div>
                )}

                {/* FRETE */}
                <div className="mt-9 border-t border-[#2b554e]/12 pt-7">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="h-4 w-4 text-[#b08d57]"
                      strokeWidth={1.5}
                    />
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2b554e]">
                      Calcular entrega
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => onPostalCodeChange(e.target.value)}
                      placeholder="Digite seu CEP"
                      className="h-[50px] border border-[#d9d1c6] bg-white px-4 text-sm text-[#23473f] outline-none transition placeholder:text-[#9a9187] focus:border-[#2b554e]"
                    />

                    <button
                      type="button"
                      onClick={onCalculateShipping}
                      disabled={shippingLoading}
                      className="h-[50px] bg-[#2b554e] px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#173a35] disabled:opacity-60"
                    >
                      {shippingLoading ? "Calculando" : "Calcular"}
                    </button>
                  </div>

                  {shippingError && (
                    <p className="mt-3 text-sm text-red-600">
                      {shippingError}
                    </p>
                  )}

                  {!shippingLoading &&
                    !shippingError &&
                    shippingOptions.length === 0 && (
                      <p className="mt-3 text-[13px] leading-5 text-[#81786e]">
                        Informe seu CEP para consultar prazo e valor do frete.
                      </p>
                    )}

                  {shippingOptions.length > 0 && (
                    <div className="mt-4 divide-y divide-[#2b554e]/10 border-y border-[#2b554e]/10">
                      {shippingOptions.map((option) => {
                        const active =
                          selectedShippingId === String(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              onSelectShipping?.(String(option.id))
                            }
                            className={[
                              "w-full px-1 py-4 text-left transition",
                              active
                                ? "bg-[#f7f3ec]"
                                : "hover:bg-[#faf7f1]",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-[13px] font-medium text-[#2b554e]">
                                  {option.name}
                                </p>

                                <p className="mt-1 text-[11px] text-[#81786e]">
                                  {option.carrier
                                    ? `${option.carrier} • `
                                    : ""}
                                  {option.deadline || "Prazo indisponível"}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-[13px] font-semibold text-[#2b554e]">
                                  {formatBRL(option.price)}
                                </p>

                                {option.original_price &&
                                Number(option.original_price) -
                                  Number(option.price) >
                                  0.01 ? (
                                  <p className="mt-0.5 text-[10px] text-[#9a9187] line-through">
                                    {formatBRL(option.original_price)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FIXO MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e7ded3] bg-[#FCFAF6]/96 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 shadow-[0_-10px_30px_rgba(43,85,78,0.06)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              {hasDiscount && (
                <p className="text-[10px] text-[#9a9187] line-through">
                  {formatBRL(oldPrice || 0)}
                </p>
              )}
              <p className="text-[18px] font-semibold tracking-[-0.02em] text-[#2b554e]">
                {formatBRL(price)}
              </p>
            </div>

            {isAvailable && (
              <div className="flex h-9 items-center border border-[#ddd5ca] bg-white">
                <button
                  type="button"
                  onClick={onDecreaseQuantity}
                  className="flex h-9 w-9 items-center justify-center text-[#2b554e]"
                >
                  <Minus size={14} />
                </button>

                <span className="w-7 text-center text-sm font-medium text-[#2b554e]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={onIncreaseQuantity}
                  disabled={quantity >= safeAvailableQty}
                  className="flex h-9 w-9 items-center justify-center text-[#2b554e] disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {showAddedMessage && (
            <p className="mb-2 text-center text-[11px] font-medium text-[#2b554e]">
              ✓ Item adicionado ao carrinho.
            </p>
          )}

          <button
            type="button"
            onClick={isAvailable ? handleAddToCartClick : undefined}
            disabled={!isAvailable || showAddedMessage}
            className={[
              "h-[48px] w-full text-[12px] font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-70",
              isAvailable
                ? "bg-[#2b554e] text-white"
                : "border border-[#2b554e] bg-transparent text-[#2b554e]",
            ].join(" ")}
          >
            {!isAvailable
              ? "Avise quando chegar"
              : showAddedMessage
                ? "Adicionado"
                : "Adicionar ao carrinho"}
          </button>
        </div>
      </div>
    </>
  );
}

function UnavailableBox() {
  return (
    <div className="border-y border-[#2b554e]/12 py-5">
      <div className="flex items-start gap-3">
        <ShoppingBag
          size={19}
          strokeWidth={1.5}
          className="mt-0.5 text-[#2b554e]"
        />

        <div>
          <p className="text-sm font-medium text-[#2b554e]">
            Produto indisponível
          </p>

          <p className="mt-1 text-[13px] leading-6 text-[#6f6a63]">
            Esta peça está sem estoque no momento. Cadastre-se para saber
            quando ela voltar.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 inline-flex border-b border-[#b08d57] pb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2b554e]"
      >
        Avise quando chegar
      </button>
    </div>
  );
}

function BenefitLine({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-[86px] items-center gap-2.5 border-[#2b554e]/10 px-3 py-4 even:border-l lg:border-l lg:first:border-l-0">
      <div className="shrink-0 text-[#b08d57]">{icon}</div>

      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#2b554e]">
          {title}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-[#81786e]">
          {text}
        </p>
      </div>
    </div>
  );
}
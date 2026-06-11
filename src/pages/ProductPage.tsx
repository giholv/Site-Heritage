import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { supabase } from "../lib/supabase";
import ProductHero, { ProductImage } from "../components/ProductHero";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";

const SKU_IMAGES_BUCKET = "product-images";

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
      <rect width="100%" height="100%" fill="#f3efe8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="32" fill="#7c8884">
        Aguarde...
      </text>
    </svg>
  `);

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active";
};

type SkuRow = {
  id: string;
  product_id: string;
  variant_name: string;
  title: string | null;
  price_cents: number;
  active: boolean;
  created_at?: string;
  available_qty: number;
};

type SkuImageRow = {
  id: string;
  sku_id: string;
  path: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type ShippingOption = {
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

function resolveImageUrl(path: string, width = 1400) {
  if (!path) return FALLBACK_IMAGE;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanedPath = path.replace(/^\/+/, "");

  const { data } = supabase.storage
    .from(SKU_IMAGES_BUCKET)
    .getPublicUrl(cleanedPath, {
      transform: {
        width,
        quality: 90,
        resize: "contain",
      },
    });

  return data.publicUrl || FALLBACK_IMAGE;
}

function onlyDigits(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2").replace(/(-\d{3}).+?$/, "$1");
}

function normalizeQty(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export default function ProductPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { add } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [images, setImages] = useState<ProductImage[]>([]);

  const [quantity, setQuantity] = useState(1);
  const [postalCode, setPostalCode] = useState("");

  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);

  const selectedSku = useMemo(() => {
    return skus.find((sku) => sku.id === selectedSkuId) ?? skus[0] ?? null;
  }, [skus, selectedSkuId]);

  const selectedAvailableQty = normalizeQty(selectedSku?.available_qty);

  const variants = useMemo(() => {
    return skus.map((sku, index) => ({
      id: sku.id,
      label: sku.title?.trim() || sku.variant_name?.trim() || `Variação ${index + 1}`,
      availableQty: normalizeQty(sku.available_qty),
    }));
  }, [skus]);

  const price = selectedSku ? selectedSku.price_cents / 100 : 0;

  const isAvailable = Boolean(
    product?.status === "active" &&
    selectedSku?.active &&
    selectedAvailableQty > 0
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!slug) {
        setError("Slug do produto não informado.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setProduct(null);
      setSkus([]);
      setSelectedSkuId("");
      setImages([]);

      try {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, name, slug, description, status")
          .eq("slug", slug)
          .single();

        if (productError) throw productError;
        if (!productData) throw new Error("Produto não encontrado.");

        const { data: skuData, error: skuError } = await supabase
          .from("skus")
          .select("id, product_id, variant_name, title, price_cents, active, created_at")
          .eq("product_id", productData.id)
          .eq("active", true)
          .order("created_at", { ascending: true });

        if (skuError) throw skuError;

        const baseSkus = (skuData ?? []) as Omit<SkuRow, "available_qty">[];
        const skuIds = baseSkus.map((sku) => sku.id);

        let availabilityMap = new Map<string, number>();

        if (skuIds.length > 0) {
          const { data: availabilityData, error: availabilityError } = await supabase
            .from("sku_availability")
            .select("sku_id, available_qty")
            .in("sku_id", skuIds);

          if (availabilityError) throw availabilityError;

          availabilityMap = new Map(
            (availabilityData ?? []).map((item: any) => [
              String(item.sku_id),
              normalizeQty(item.available_qty),
            ])
          );
        }

        const safeSkus: SkuRow[] = baseSkus.map((sku) => ({
          ...sku,
          available_qty: availabilityMap.get(sku.id) ?? 0,
        }));

        const firstAvailableSku = safeSkus.find(
          (sku) => sku.active && normalizeQty(sku.available_qty) > 0
        );

        const firstSku = firstAvailableSku ?? safeSkus[0] ?? null;

        if (cancelled) return;

        setProduct(productData as ProductRow);
        setSkus(safeSkus);
        setSelectedSkuId(firstSku?.id ?? "");

        console.table(
          safeSkus.map((sku) => ({
            sku_id: sku.id,
            title: sku.title,
            variant_name: sku.variant_name,
            active: sku.active,
            available_qty: sku.available_qty,
          }))
        );
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Erro ao carregar produto.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadSkuImages() {
      if (!selectedSkuId || !product) {
        setImages([]);
        return;
      }

      const { data, error } = await supabase
        .from("sku_images")
        .select("id, sku_id, path, alt, sort_order, is_primary")
        .eq("sku_id", selectedSkuId)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Erro ao buscar imagens:", error);
        if (!cancelled) setImages([]);
        return;
      }

      const normalizedImages: ProductImage[] = ((data ?? []) as SkuImageRow[])
        .map((img, index) => ({
          id: String(img.id ?? `img-${index}`),
          src: resolveImageUrl(String(img.path ?? ""), 1400),
          alt: String(img.alt ?? product.name ?? "Produto"),
        }))
        .filter((img) => img.src);

      if (cancelled) return;

      setImages(
        normalizedImages.length > 0
          ? normalizedImages
          : [{ id: "fallback", src: FALLBACK_IMAGE, alt: product.name || "Produto" }]
      );
    }

    loadSkuImages();

    return () => {
      cancelled = true;
    };
  }, [selectedSkuId, product]);

  useEffect(() => {
    setQuantity(1);
    setShippingError("");
    setShippingOptions([]);
    setSelectedShippingId("");
  }, [selectedSkuId]);

  useEffect(() => {
    if (selectedAvailableQty > 0 && quantity > selectedAvailableQty) {
      setQuantity(selectedAvailableQty);
    }
  }, [selectedAvailableQty, quantity]);

  useEffect(() => {
    setShippingError("");
    setShippingOptions([]);
    setSelectedShippingId("");
  }, [postalCode, quantity]);

  function addCurrentItemToCart() {
    if (!product || !selectedSku || !isAvailable) return false;

    const safeQty = Math.min(quantity, selectedAvailableQty);
    if (safeQty <= 0) return false;

    add({
      id: selectedSku.id,
      sku_id: selectedSku.id,
      name: product.name,
      price,
      image: images[0]?.src || FALLBACK_IMAGE,
      variant: selectedSku.title?.trim() || selectedSku.variant_name?.trim() || "Variação",
      qty: safeQty,
      available: true,
      available_qty: selectedAvailableQty,
    } as any);

    return true;
  }

  function handleAddToCart() {
    addCurrentItemToCart();
  }

  function handleBuyNow() {
    const added = addCurrentItemToCart();
    if (added) navigate("/checkout");
  }

  async function handleCalculateShipping() {
    const cleanCep = onlyDigits(postalCode);

    if (cleanCep.length !== 8) {
      setShippingError("CEP inválido. Digite os 8 números.");
      setShippingOptions([]);
      setSelectedShippingId("");
      return;
    }

    if (!selectedSku) {
      setShippingError("Selecione uma variação do produto.");
      setShippingOptions([]);
      setSelectedShippingId("");
      return;
    }

    if (!isAvailable) {
      setShippingError("Produto indisponível para compra.");
      setShippingOptions([]);
      setSelectedShippingId("");
      return;
    }

    setShippingLoading(true);
    setShippingError("");
    setShippingOptions([]);
    setSelectedShippingId("");

    try {
      const payload = {
        to_postcode: cleanCep,
        insurance_value: Number((price * quantity).toFixed(2)),
        weight: Number(Math.max(0.03, 0.03 * quantity).toFixed(2)),
       
      };
      console.log("Calculando frete:", payload);

      const res = await fetch("/.netlify/functions/shipping-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Resposta inválida da função de frete.");
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
          data?.details?.error ||
          data?.message ||
          `Falha ao calcular frete (${res.status})`
        );
      }

      const opts: ShippingOption[] = Array.isArray(data?.options)
        ? data.options
        : [];

      if (!opts.length) {
        setShippingError("Nenhuma opção de frete encontrada para esse CEP.");
        return;
      }

      setShippingOptions(opts);
      setSelectedShippingId(String(opts[0].id));
    } catch (e: any) {
      console.error("Erro ao calcular frete:", e);
      setShippingError(e?.message || "Erro ao calcular frete.");
    } finally {
      setShippingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfaf6]">
        <Header />
        <main className="mx-auto max-w-7xl px-5 pt-[104px] md:pt-[160px]">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-[4/5] animate-pulse rounded-[32px] bg-[#eee7dc]" />
            <div className="space-y-5">
              <div className="h-5 w-32 animate-pulse rounded-full bg-[#eee7dc]" />
              <div className="h-14 w-4/5 animate-pulse rounded-2xl bg-[#eee7dc]" />
              <div className="h-12 w-52 animate-pulse rounded-2xl bg-[#eee7dc]" />
              <div className="h-14 w-full animate-pulse rounded-full bg-[#eee7dc]" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#fcfaf6]">
        <Header />
        <main className="mx-auto max-w-3xl px-5 pt-[104px] text-center md:pt-[150px]">
          <p className="text-sm uppercase tracking-[0.24em] text-[#b08d57]">Produto</p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2b554e]">
            {error || "Produto não encontrado."}
          </h1>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-6 rounded-full bg-[#2b554e] px-7 py-3 text-sm font-semibold text-white"
          >
            Voltar para a loja
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcfaf6]">
      <Header />

      <main className="pt-[90px] pb-[118px] md:pt-[240px] md:pb-0">
        <section className="mx-auto w-full max-w-[1440px] px-0 pb-8 md:px-6 md:pb-16 lg:px-8">
          <div className="mb-4 hidden items-center gap-2 px-1 text-[12px] text-[#8b8175] md:flex">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 transition hover:text-[#2b554e]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
            <span>/</span>
            <span className="truncate text-[#2b554e]">{product.name}</span>
          </div>

          <ProductHero
            name={product.name}
            description={product.description || ""}
            price={price}
            variants={variants}
            selectedVariant={selectedSku?.id ?? ""}
            onSelectVariant={setSelectedSkuId}
            quantity={quantity}
            onDecreaseQuantity={() => setQuantity((prev) => Math.max(1, prev - 1))}
            onIncreaseQuantity={() =>
              setQuantity((prev) => {
                if (selectedAvailableQty <= 0) return 1;
                return Math.min(selectedAvailableQty, prev + 1);
              })
            }
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            availableQty={selectedAvailableQty}
            isAvailable={isAvailable}
            images={images}
            postalCode={postalCode}
            onPostalCodeChange={(value) => setPostalCode(formatCep(value))}
            onCalculateShipping={handleCalculateShipping}
            shippingLoading={shippingLoading}
            shippingError={shippingError}
            shippingOptions={shippingOptions}
            selectedShippingId={selectedShippingId}
            onSelectShipping={setSelectedShippingId}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

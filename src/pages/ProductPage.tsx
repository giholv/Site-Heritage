import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
        Imagem indisponível
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
};

function resolveImageUrl(path: string) {
  if (!path) return FALLBACK_IMAGE;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanedPath = path.replace(/^\/+/, "");

  const { data } = supabase.storage
    .from(SKU_IMAGES_BUCKET)
    .getPublicUrl(cleanedPath);

  return data.publicUrl || FALLBACK_IMAGE;
}

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  return digits
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3}).+?$/, "$1");
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

  const selectedSku = useMemo(() => {
    return skus.find((sku) => sku.id === selectedSkuId) ?? skus[0] ?? null;
  }, [skus, selectedSkuId]);

  const selectedShipping = useMemo(() => {
    return shippingOptions.find((op) => op.id === selectedShippingId) ?? null;
  }, [shippingOptions, selectedShippingId]);

  const variants = useMemo(() => {
    return skus.map((sku, index) => ({
      id: sku.id,
      label:
        sku.title?.trim() ||
        sku.variant_name?.trim() ||
        `Variação ${index + 1}`,
    }));
  }, [skus]);

  const price = selectedSku ? selectedSku.price_cents / 100 : 0;

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

        if (cancelled) return;
        setProduct(productData as ProductRow);

        const { data: skuData, error: skuError } = await supabase
          .from("skus")
          .select("id, product_id, variant_name, title, price_cents, active")
          .eq("product_id", productData.id)
          .eq("active", true)
          .order("created_at", { ascending: true });

        if (skuError) throw skuError;

        const safeSkus = (skuData ?? []) as SkuRow[];

        if (cancelled) return;
        setSkus(safeSkus);
        setSelectedSkuId(safeSkus[0]?.id ?? "");
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Erro ao carregar produto.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
          src: resolveImageUrl(String(img.path ?? "")),
          alt: String(img.alt ?? product.name ?? "Produto"),
        }))
        .filter((img) => img.src);

      if (cancelled) return;

      setImages(
        normalizedImages.length > 0
          ? normalizedImages
          : [
            {
              id: "fallback",
              src: FALLBACK_IMAGE,
              alt: product.name || "Produto",
            },
          ]
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
    setShippingError("");
    setShippingOptions([]);
    setSelectedShippingId("");
  }, [postalCode, quantity]);

  function addCurrentItemToCart() {
    if (!product || !selectedSku) return;

    add({
      id: selectedSku.id,
      name: product.name,
      price: selectedSku.price_cents / 100,
      image: images[0]?.src || FALLBACK_IMAGE,
      variant:
        selectedSku.title?.trim() ||
        selectedSku.variant_name?.trim() ||
        "Variação",
      qty: quantity,
    });
  }

  function handleAddToCart() {
    addCurrentItemToCart();
  }

  function handleBuyNow() {
    addCurrentItemToCart();
    navigate("/checkout");
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

    setShippingLoading(true);
    setShippingError("");
    setShippingOptions([]);
    setSelectedShippingId("");

    try {
      const totalWeight = Math.max(0.03, 0.03 * quantity);

      const payload = {
        to_postcode: cleanCep,
        insurance_value: 0,
        weight: Number(totalWeight.toFixed(2)),
        services: "1,2,17,3",
      };

      const res = await fetch("/.netlify/functions/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.details?.error ||
          `Falha ao calcular frete (${res.status})`;

        throw new Error(msg);
      }

      const opts: ShippingOption[] = Array.isArray(data?.options)
        ? data.options
        : [];

      setShippingOptions(opts);

      if (!opts.length) {
        setShippingError("Nenhuma opção de frete encontrada para esse CEP.");
        return;
      }

      setSelectedShippingId(opts[0].id);
    } catch (e: any) {
      setShippingError(e?.message ?? "Erro ao calcular frete.");
    } finally {
      setShippingLoading(false);
    }
  }

  if (loading) {
    return <div className="px-4 py-10">Carregando...</div>;
  }

  if (error) {
    return <div className="px-4 py-10">{error}</div>;
  }

  if (!product) {
    return <div className="px-4 py-10">Produto não encontrado.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f3ee]">
      <div className="mb-6">
        <Header />
      </div>

      <main className="pt-[160px] md:pt-[180px]">
        <section
          className="mx-auto max-w-7xl px-4 pb-8 md:px-6 lg:px-8"
          style={{ marginTop: "20px" }}
        >
          <ProductHero
            name={product.name}
            description={product.description || ""}
            price={price}
            installmentText=""
            variants={variants}
            selectedVariant={selectedSku?.id ?? ""}
            onSelectVariant={setSelectedSkuId}
            quantity={quantity}
            onDecreaseQuantity={() =>
              setQuantity((prev) => Math.max(1, prev - 1))
            }
            onIncreaseQuantity={() =>
              setQuantity((prev) => Math.min(99, prev + 1))
            }
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            images={images ?? []}
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
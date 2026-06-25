import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ProductTab from "./tabs/ProductTab";
import SkusTab from "./tabs/SkusTab";
import PhotosTab from "./tabs/SkuImagesDnd";
import StockTab from "./tabs/StockTab";
import SeoTab from "./tabs/SeoTab";

type ProductStatus = "draft" | "active";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  search_tags?: string[] | null;
  supplier_id?: string | null;
  supplier_origin_code?: string | null;
};

type Sku = {
  id: string;
  sku_code: string;
  variant_name: string;
  price_cents: number;
  compare_at_price_cents?: number | null;
  sale_price_cents?: number | null;
  sale_active?: boolean;
  active: boolean;
  barcode?: string | null;
  supplier_sku_code?: string | null;
};

const STEPS = [
  { key: "produto", label: "Informações do produto" },
  { key: "skus", label: "Variações (SKUs)" },
  { key: "fotos", label: "Fotos" },
  { key: "estoque", label: "Estoque" },
  { key: "seo", label: "SEO" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const STEP_KEYS = new Set<StepKey>(STEPS.map((s) => s.key));

function isStepKey(value: string | null): value is StepKey {
  return !!value && STEP_KEYS.has(value as StepKey);
}

function formatBRLFromCents(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value || 0) / 100);
}

export default function AdminProductEdit() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStep = searchParams.get("step");
  const step: StepKey = isStepKey(rawStep) ? rawStep : "produto";

  const [product, setProduct] = useState<Product | null>(null);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const selectedSku = useMemo(
    () => skus.find((sku) => sku.id === selectedSkuId) ?? null,
    [skus, selectedSkuId]
  );

  const hasSku = skus.length > 0;
  const stepNeedsSku = step === "fotos" || step === "estoque";

  const goStep = useCallback(
    (nextStep: StepKey) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("step", nextStep);
        return next;
      });
    },
    [setSearchParams]
  );

  const loadAll = useCallback(async () => {
    if (!productId) {
      setErr("Produto inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const [productRes, skusRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle(),
        supabase
          .from("skus")
          .select(
            "id, sku_code, variant_name, price_cents, compare_at_price_cents, sale_price_cents, sale_active, active, barcode, supplier_sku_code"
          )
          .eq("product_id", productId)
          .order("created_at", { ascending: true }),
      ]);

      if (productRes.error) {
        throw new Error(productRes.error.message);
      }

      if (skusRes.error) {
        throw new Error(skusRes.error.message);
      }

      const nextProduct = (productRes.data as Product | null) ?? null;
      const nextSkus = (skusRes.data as Sku[] | null) ?? [];

      setProduct(nextProduct);
      setSkus(nextSkus);

      setSelectedSkuId((current) => {
        if (!nextSkus.length) return "";
        if (current && nextSkus.some((sku) => sku.id === current)) return current;
        return nextSkus[0].id;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar produto.";
      setErr(message);
      setProduct(null);
      setSkus([]);
      setSelectedSkuId("");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!isStepKey(rawStep)) {
      goStep("produto");
    }
  }, [rawStep, goStep]);

  useEffect(() => {
    if (stepNeedsSku && !selectedSkuId) {
      goStep("skus");
    }
  }, [stepNeedsSku, selectedSkuId, goStep]);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (err) {
    return <div className="p-6 text-red-700">Erro: {err}</div>;
  }

  if (!product) {
    return <div className="p-6">Produto não encontrado.</div>;
  }

  return (
    <div className="flex gap-6">
      <aside className="w-80 shrink-0">
        <button
          onClick={() => navigate("/admin/produtos")}
          className="text-sm text-gray-600 underline hover:text-gray-900"
        >
          ← Voltar para produtos
        </button>

        <div className="mt-4 rounded-2xl border bg-white p-5">
          <div className="text-xs text-gray-500">Produto</div>
          <div className="text-lg font-semibold text-gray-900">{product.name}</div>
          <div className="mt-1 text-sm text-gray-600">Status: {product.status}</div>

          <div className="mt-4 space-y-1">
            {STEPS.map((item) => {
              const disabled =
                (item.key === "fotos" || item.key === "estoque") && !hasSku;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => !disabled && goStep(item.key)}
                  disabled={disabled}
                  className={[
                    "w-full rounded-xl px-3 py-2 text-left text-sm transition",
                    step === item.key
                      ? "bg-[#2b554e] text-white"
                      : "text-gray-800 hover:bg-gray-100",
                    disabled ? "cursor-not-allowed opacity-50 hover:bg-transparent" : "",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="mb-1 text-xs text-gray-500">SKU selecionado</div>

            <select
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              disabled={!hasSku}
            >
              {!hasSku ? (
                <option value="">Crie um SKU primeiro</option>
              ) : (
                skus.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.variant_name} • {sku.sku_code}
                  </option>
                ))
              )}
            </select>

            {selectedSku && (
              <div className="mt-2 text-xs text-gray-600">
                {selectedSku.sale_active && selectedSku.sale_price_cents ? (
                  <>
                    Preço:{" "}
                    <span className="line-through text-gray-400">
                      {formatBRLFromCents(
                        selectedSku.compare_at_price_cents || selectedSku.price_cents
                      )}
                    </span>{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatBRLFromCents(selectedSku.sale_price_cents)}
                    </span>
                  </>
                ) : (
                  <>Preço: {formatBRLFromCents(selectedSku.price_cents)}</>
                )}{" "}
                • Ativo: {selectedSku.active ? "sim" : "não"}
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex-1">
        {step === "produto" && (
          <ProductTab product={product} onSaved={loadAll} />
        )}

        {step === "skus" && (
          <SkusTab
            productId={product.id}
            productName={product.name}
            selectedSkuId={selectedSkuId || null}
            onSelectSku={(id) => setSelectedSkuId(id)}
            onSaved={loadAll}
          />
        )}

        {step === "fotos" && selectedSkuId && (
          <PhotosTab skuId={selectedSkuId} />
        )}

        {step === "estoque" && selectedSkuId && (
          <StockTab skuId={selectedSkuId} />
        )}

        {step === "seo" && (
          <SeoTab product={product} onSaved={loadAll} />
        )}
      </section>
    </div>
  );
}
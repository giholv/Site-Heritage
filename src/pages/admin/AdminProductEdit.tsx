import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ProductTab from "./tabs/ProductTab";
import SkusTab from "./tabs/SkusTab";
import PhotosTab from "./tabs/PhotosTab";
import StockTab from "./tabs/StockTab";
import SeoTab from "./tabs/SeoTab";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active";
  // SEO (se você criou as colunas)
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  search_tags?: string[] | null;
  // fornecedor (se você criou)
  supplier_id?: string | null;
  supplier_origin_code?: string | null;
};

type Sku = {
  id: string;
  sku_code: string;
  variant_name: string;
  price_cents: number;
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

export default function AdminProductEdit() {
  const nav = useNavigate();
  const { productId } = useParams();
  const [sp, setSp] = useSearchParams();

  const step = (sp.get("step") as StepKey) || "produto";

  const [product, setProduct] = useState<Product | null>(null);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const selectedSku = useMemo(
    () => skus.find((s) => s.id === selectedSkuId) || null,
    [skus, selectedSkuId]
  );

  function goStep(k: StepKey) {
    setSp((prev) => {
      prev.set("step", k);
      return prev;
    });
  }

  async function loadAll() {
    if (!productId) return;
    setLoading(true);
    setErr(null);

    const { data: p, error: pErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (pErr) {
      setErr(pErr.message);
      setLoading(false);
      return;
    }

    const { data: s, error: sErr } = await supabase
      .from("skus")
      .select("id,sku_code,variant_name,price_cents,active,barcode,supplier_sku_code")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (sErr) {
      setErr(sErr.message);
      setLoading(false);
      return;
    }

    setProduct(p as Product);
    setSkus((s ?? []) as Sku[]);

    // define SKU selecionado
    const firstSkuId = (s ?? [])[0]?.id;
    setSelectedSkuId((prev) => prev || firstSkuId || "");

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Se entrar em Fotos/Estoque sem SKU, força ir pra SKUs
  useEffect(() => {
    if ((step === "fotos" || step === "estoque") && !selectedSkuId) {
      goStep("skus");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedSkuId]);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (err) return <div className="p-6 text-red-700">Erro: {err}</div>;
  if (!product) return <div className="p-6">Produto não encontrado.</div>;

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-80 shrink-0">
        <button
          onClick={() => nav("/admin/produtos")}
          className="text-sm underline text-gray-600 hover:text-gray-900"
        >
          ← Voltar para produtos
        </button>

        <div className="mt-4 rounded-2xl border bg-white p-5">
          <div className="text-xs text-gray-500">Produto</div>
          <div className="text-lg font-semibold text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-600 mt-1">Status: {product.status}</div>

          <div className="mt-4 space-y-1">
            {STEPS.map((s) => (
              <button
                key={s.key}
                onClick={() => goStep(s.key)}
                className={[
                  "w-full text-left rounded-xl px-3 py-2 text-sm",
                  step === s.key
                    ? "bg-[#2b554e] text-white"
                    : "hover:bg-gray-100 text-gray-800",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Seletor de SKU (relevante pra Fotos/Estoque) */}
          <div className="mt-6">
            <div className="text-xs text-gray-500 mb-1">SKU selecionado</div>
            <select
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              disabled={skus.length === 0}
            >
              {skus.length === 0 ? (
                <option value="">Crie um SKU primeiro</option>
              ) : (
                skus.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.variant_name} • {s.sku_code}
                  </option>
                ))
              )}
            </select>

            {selectedSku && (
              <div className="mt-2 text-xs text-gray-600">
                Preço: R$ {(selectedSku.price_cents / 100).toFixed(2)} • Ativo:{" "}
                {selectedSku.active ? "sim" : "não"}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
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

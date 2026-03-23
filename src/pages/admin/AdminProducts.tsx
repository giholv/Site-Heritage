import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

type ProductStatus = "draft" | "active";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  created_at: string;
  image_url: string | null;
};

type ProductDb = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  created_at: string;
};

type SkuDb = {
  id: string;
  product_id: string;
};

type SkuImageDb = {
  sku_id: string;
  path: string | null;
  alt: string | null;
  sort_order: number | null;
  is_primary: boolean;
};

const STORAGE_BUCKET = "product-images";

function getPublicImageUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function statusLabel(status: ProductStatus) {
  return status === "active" ? "Ativo" : "Rascunho";
}

function statusClass(status: ProductStatus) {
  return status === "active"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
}

export default function AdminProducts() {
  const nav = useNavigate();

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const hasItems = useMemo(() => items.length > 0, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id,name,slug,status,created_at")
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      const products = (productsData ?? []) as ProductDb[];

      if (!products.length) {
        setItems([]);
        return;
      }

      const productIds = products.map((p) => p.id);

      const { data: skusData, error: skusError } = await supabase
        .from("skus")
        .select("id,product_id")
        .in("product_id", productIds);

      if (skusError) throw skusError;

      const skus = (skusData ?? []) as SkuDb[];
      const skuIds = skus.map((s) => s.id);

      const skuToProduct = new Map<string, string>();
      for (const sku of skus) {
        skuToProduct.set(sku.id, sku.product_id);
      }

      let images: SkuImageDb[] = [];

      if (skuIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from("sku_images")
          .select("sku_id,path,alt,sort_order,is_primary")
          .in("sku_id", skuIds)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true });

        if (imagesError) throw imagesError;

        images = (imagesData ?? []) as SkuImageDb[];
      }

      const firstImageByProduct = new Map<string, string | null>();

      for (const img of images) {
        const productId = skuToProduct.get(img.sku_id);
        if (!productId) continue;
        if (firstImageByProduct.has(productId)) continue;

        firstImageByProduct.set(productId, getPublicImageUrl(img.path));
      }

      const merged: Product[] = products.map((p) => ({
        ...p,
        image_url: firstImageByProduct.get(p.id) ?? null,
      }));

      setItems(merged);
    } catch (error: any) {
      console.error(error);
      setErr(error?.message || "Erro ao carregar produtos.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(product: Product) {
    const nextStatus: ProductStatus =
      product.status === "active" ? "draft" : "active";

    const ok = window.confirm(
      nextStatus === "draft"
        ? `Desativar o produto "${product.name}"?`
        : `Reativar o produto "${product.name}"?`
    );

    if (!ok) return;

    setActingId(product.id);
    setErr(null);

    try {
      const { error } = await supabase
        .from("products")
        .update({ status: nextStatus })
        .eq("id", product.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, status: nextStatus } : item
        )
      );
    } catch (error: any) {
      console.error(error);
      setErr(error?.message || "Não foi possível atualizar o status.");
    } finally {
      setActingId(null);
    }
  }

  async function deleteProduct(product: Product) {
    const ok = window.confirm(
      `Excluir o produto "${product.name}"?\n\nEssa ação não pode ser desfeita.`
    );

    if (!ok) return;

    setActingId(product.id);
    setErr(null);

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== product.id));
    } catch (error: any) {
      console.error(error);

      if (error?.code === "23503") {
        setErr(
          "Esse produto possui vínculos com SKUs, fotos ou estoque. Exclua os registros relacionados antes de apagar o produto."
        );
      } else {
        setErr(error?.message || "Não foi possível excluir o produto.");
      }
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produtos</h1>

        <button
          onClick={() => nav("/admin/produtos/novo")}
          className="rounded-xl bg-[#2b554e] px-4 py-2 text-white hover:opacity-95"
        >
          Novo produto
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="grid grid-cols-12 gap-3 border-b px-4 py-3 text-sm text-gray-500">
          <div className="col-span-2">Foto</div>
          <div className="col-span-4">Nome</div>
          <div className="col-span-3">Slug</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-600">Carregando...</div>
        ) : !hasItems ? (
          <div className="p-6 text-sm text-gray-600">
            Nenhum produto cadastrado.
          </div>
        ) : (
          items.map((p) => {
            const busy = actingId === p.id;

            return (
              <div
                key={p.id}
                className="grid grid-cols-12 gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div className="col-span-2">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border bg-gray-50">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
                        Sem foto
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-4 flex items-center font-medium text-gray-900">
                  {p.name}
                </div>

                <div className="col-span-3 flex items-center text-gray-600">
                  {p.slug}
                </div>

                <div className="col-span-1 flex items-center">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                      p.status
                    )}`}
                  >
                    {statusLabel(p.status)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => nav(`/admin/produtos/${p.id}`)}
                    className="text-sm underline text-[#2b554e]"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => toggleStatus(p)}
                    disabled={busy}
                    className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy
                      ? "..."
                      : p.status === "active"
                      ? "Desativar"
                      : "Reativar"}
                  </button>

                  <button
                    onClick={() => deleteProduct(p)}
                    disabled={busy}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={load}
        className="mt-4 text-sm text-gray-600 underline hover:text-gray-800"
      >
        Recarregar
      </button>
    </div>
  );
}
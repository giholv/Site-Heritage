import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

type ProductStatus = "draft" | "active";
type StatusFilter = "all" | "active" | "draft";

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
const PAGE_SIZE = 50;

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

function formatDateBR(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminProducts() {
  const nav = useNavigate();

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const hasItems = useMemo(() => items.length > 0, [items]);

  const stats = useMemo(() => {
    return {
      total: totalCount,
      active: items.filter((item) => item.status === "active").length,
      draft: items.filter((item) => item.status === "draft").length,
      withoutPhoto: items.filter((item) => !item.image_url).length,
    };
  }, [items, totalCount]);

  const filteredItems = items;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const term = search.trim();
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("products")
        .select("id,name,slug,status,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (term) {
        query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
      }

      const { data: productsData, error: productsError, count } = await query;

      if (productsError) throw productsError;

      const products = (productsData ?? []) as ProductDb[];
      setTotalCount(count ?? 0);

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
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 400);

    return () => window.clearTimeout(timer);
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
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
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
      setTotalCount((prev) => Math.max(0, prev - 1));
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

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPage(0);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <section className="rounded-[26px] border border-[#e9e2d6] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b08d57]">
              Catálogo
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#2b554e] sm:text-3xl">
              Produtos
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Gerencie produtos, status, fotos principais e acesso rápido aos SKUs.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={load}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-4 text-sm font-semibold text-[#2b554e] hover:bg-[#fcfaf6]"
            >
              Recarregar
            </button>

            <button
              type="button"
              onClick={() => nav("/admin/produtos/novo")}
              className="h-11 rounded-2xl bg-[#2b554e] px-4 text-sm font-semibold text-white hover:opacity-95"
            >
              Novo produto
            </button>
          </div>
        </div>
      </section>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#e9e2d6] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Total
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2b554e]">
            {stats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e9e2d6] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Ativos nesta página
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {stats.active}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e9e2d6] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Rascunhos nesta página
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">
            {stats.draft}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e9e2d6] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Sem foto nesta página
          </p>
          <p className="mt-2 text-2xl font-semibold text-rose-700">
            {stats.withoutPhoto}
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e9e2d6] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por nome ou slug..."
            className="h-11 w-full rounded-2xl border border-[#e9e2d6] bg-[#fcfaf6] px-4 text-sm text-gray-800 outline-none transition focus:border-[#2b554e] focus:ring-2 focus:ring-[#2b554e]/10 lg:max-w-md"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_auto]">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(0);
              }}
              className="h-11 w-full rounded-2xl border border-[#e9e2d6] bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-[#2b554e] focus:ring-2 focus:ring-[#2b554e]/10"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="draft">Rascunhos</option>
            </select>

            {search || statusFilter !== "all" ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-2xl border border-[#e9e2d6] px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-sm text-zinc-500">
          Exibindo <strong className="text-[#2b554e]">{items.length}</strong> de{" "}
          <strong className="text-[#2b554e]">{totalCount}</strong> produtos
        </p>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-[#e9e2d6] bg-white p-6 text-sm text-gray-600 shadow-sm">
          Carregando produtos...
        </div>
      ) : !hasItems ? (
        <div className="rounded-2xl border border-[#e9e2d6] bg-white p-6 text-sm text-gray-600 shadow-sm">
          Nenhum produto cadastrado.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-[#e9e2d6] bg-white p-6 text-sm text-gray-600 shadow-sm">
          Nenhum produto encontrado com os filtros aplicados.
        </div>
      ) : (
        <>
          <section className="md:hidden">
            <div className="space-y-3">
              {filteredItems.map((p) => {
                const busy = actingId === p.id;

                return (
                  <article
                    key={p.id}
                    className="rounded-[24px] border border-[#e9e2d6] bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#e9e2d6] bg-[#fcfaf6]">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-gray-400">
                            Sem foto
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="min-w-0 truncate text-base font-semibold text-[#2b554e]">
                            {p.name}
                          </h2>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(
                              p.status
                            )}`}
                          >
                            {statusLabel(p.status)}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          /{p.slug}
                        </p>

                        <p className="mt-2 text-xs text-zinc-400">
                          Criado em {formatDateBR(p.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => nav(`/admin/produtos/${p.id}`)}
                        className="h-10 rounded-xl bg-[#2b554e] px-3 text-sm font-semibold text-white"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStatus(p)}
                        disabled={busy}
                        className="h-10 rounded-xl border border-[#e9e2d6] px-3 text-sm font-semibold text-[#2b554e] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy
                          ? "..."
                          : p.status === "active"
                            ? "Desativar"
                            : "Reativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteProduct(p)}
                        disabled={busy}
                        className="col-span-2 h-10 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="hidden overflow-hidden rounded-2xl border border-[#e9e2d6] bg-white shadow-sm md:block">
            <div className="grid grid-cols-12 gap-3 border-b border-[#e9e2d6] bg-[#fcfaf6] px-4 py-3 text-sm text-gray-500">
              <div className="col-span-2">Foto</div>
              <div className="col-span-4">Nome</div>
              <div className="col-span-3">Slug</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>

            {filteredItems.map((p) => {
              const busy = actingId === p.id;

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-3 border-b border-[#f1ece4] px-4 py-3 last:border-b-0"
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

                  <div className="col-span-4 flex min-w-0 items-center font-medium text-gray-900">
                    <span className="truncate">{p.name}</span>
                  </div>

                  <div className="col-span-3 flex min-w-0 items-center text-gray-600">
                    <span className="truncate">{p.slug}</span>
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
                      type="button"
                      onClick={() => nav(`/admin/produtos/${p.id}`)}
                      className="text-sm font-semibold text-[#2b554e] underline"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
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
                      type="button"
                      onClick={() => deleteProduct(p)}
                      disabled={busy}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-[#e9e2d6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Página{" "}
              <strong className="text-[#2b554e]">{page + 1}</strong> de{" "}
              <strong className="text-[#2b554e]">{totalPages}</strong>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0 || loading}
                className="h-10 rounded-xl border border-[#e9e2d6] px-4 text-sm font-semibold text-[#2b554e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={(page + 1) * PAGE_SIZE >= totalCount || loading}
                className="h-10 rounded-xl bg-[#2b554e] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima página
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

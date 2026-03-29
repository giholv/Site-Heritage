import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCcw, Package, Boxes } from "lucide-react";
import { supabase } from "../../lib/supabase";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};

type SkuRow = {
  id: string;
  product_id: string;
  price_cents: number;
  active: boolean;
};

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  skus_count: number;
  active_skus_count: number;
  min_price_cents: number | null;
  max_price_cents: number | null;
};

function moneyBRL(value: number | null) {
  if (value == null) return "-";
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-800">{value}</div>
          {subtitle ? <div className="mt-2 text-sm font-medium text-emerald-600">{subtitle}</div> : null}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const [
        { data: productsData, error: productsError },
        { data: skusData, error: skusError },
      ] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, slug, status, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("skus")
          .select("id, product_id, price_cents, active"),
      ]);

      if (productsError) throw productsError;
      if (skusError) throw skusError;

      const skuStats = new Map<
        string,
        {
          skus_count: number;
          active_skus_count: number;
          min_price_cents: number | null;
          max_price_cents: number | null;
        }
      >();

      (skusData as SkuRow[]).forEach((sku) => {
        const current = skuStats.get(sku.product_id) ?? {
          skus_count: 0,
          active_skus_count: 0,
          min_price_cents: null,
          max_price_cents: null,
        };

        current.skus_count += 1;
        if (sku.active) current.active_skus_count += 1;

        if (current.min_price_cents == null || sku.price_cents < current.min_price_cents) {
          current.min_price_cents = sku.price_cents;
        }

        if (current.max_price_cents == null || sku.price_cents > current.max_price_cents) {
          current.max_price_cents = sku.price_cents;
        }

        skuStats.set(sku.product_id, current);
      });

      const normalized: ProductListItem[] = (productsData as ProductRow[]).map((product) => {
        const stats = skuStats.get(product.id);

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
          created_at: product.created_at,
          skus_count: stats?.skus_count ?? 0,
          active_skus_count: stats?.active_skus_count ?? 0,
          min_price_cents: stats?.min_price_cents ?? null,
          max_price_cents: stats?.max_price_cents ?? null,
        };
      });

      setProducts(normalized);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [products, query, statusFilter]);

  const activeCount = products.filter((p) => p.status === "active").length;
  const totalSkus = products.reduce((acc, p) => acc + p.skus_count, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-800">Produtos</h1>
              <p className="mt-1 text-sm text-slate-500">Catálogo e SKUs</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-slate-400 shadow-sm">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-64 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Buscar nome ou slug..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border bg-white px-4 text-sm text-slate-700 shadow-sm outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="draft">Rascunho</option>
              </select>

              <button
                onClick={loadProducts}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <RefreshCcw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-slate-500">Carregando produtos...</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard title="Produtos" value={products.length} subtitle="Total cadastrado" icon={<Package size={20} />} />
              <MetricCard title="Ativos" value={activeCount} subtitle="Disponíveis no catálogo" icon={<Package size={20} />} />
              <MetricCard title="SKUs" value={totalSkus} subtitle="Variações cadastradas" icon={<Boxes size={20} />} />
            </div>

            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-xl font-semibold text-slate-800">Lista de produtos</h2>
                <p className="mt-1 text-sm text-slate-500">{filteredProducts.length} produto(s)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="px-5 py-4 font-medium">Produto</th>
                      <th className="px-5 py-4 font-medium">Slug</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium">Cadastro</th>
                      <th className="px-5 py-4 font-medium">SKUs</th>
                      <th className="px-5 py-4 font-medium">SKUs ativos</th>
                      <th className="px-5 py-4 font-medium">Preço mín.</th>
                      <th className="px-5 py-4 font-medium">Preço máx.</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b last:border-b-0">
                        <td className="px-5 py-4 font-medium text-slate-800">{product.name}</td>
                        <td className="px-5 py-4 text-slate-600">{product.slug}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(product.status)}`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDateBR(product.created_at)}</td>
                        <td className="px-5 py-4 text-slate-700">{product.skus_count}</td>
                        <td className="px-5 py-4 text-slate-700">{product.active_skus_count}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{moneyBRL(product.min_price_cents)}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{moneyBRL(product.max_price_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredProducts.length === 0 && (
                  <div className="px-5 py-6 text-sm text-slate-500">Nenhum produto encontrado.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
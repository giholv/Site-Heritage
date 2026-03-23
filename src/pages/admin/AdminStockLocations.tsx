import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type SummaryRow = {
  location_id: string;
  location_code: string;
  location_name: string;
  sku_count: number;
  on_hand_total: number;
  reserved_total: number;
  available_total: number;
};

type StockRow = {
  location_id: string;
  location_code: string;
  location_name: string;
  sku_id: string;
  sku_code: string | null;
  sku_label: string | null;
  barcode: string | null;
  sku_active: boolean | null;
  price_cents: number | null;
  ring_size: number | null;
  plating_type: string | null;
  plating_millesimal: number | null;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_status: string | null;
  on_hand_qty: number;
  reserved_qty: number;
  available_qty: number;
  image_path: string | null;
  image_alt: string | null;
};

type SearchScope = "selected" | "all";

const STORAGE_BUCKET = "product-images";

function getPublicImageUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function formatBRL(cents: number | null) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-[#2b554e]"
      : tone === "warning"
      ? "text-amber-700"
      : "text-gray-900";

  return (
    <div className="rounded-2xl border bg-[#fcfaf6] px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function ScopeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-[#2b554e] text-white"
          : "border text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AdminStockLocations() {
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("selected");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const [summaryRes, rowsRes] = await Promise.all([
        supabase
          .from("v_stock_location_summary")
          .select("*")
          .order("location_name", { ascending: true }),

        supabase
          .from("v_stock_by_location")
          .select("*")
          .order("location_name", { ascending: true })
          .order("product_name", { ascending: true })
          .order("sku_code", { ascending: true }),
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (rowsRes.error) throw rowsRes.error;

      const summaryData = (summaryRes.data ?? []) as SummaryRow[];
      const rowsData = (rowsRes.data ?? []) as StockRow[];

      setSummary(summaryData);
      setRows(rowsData);
      setSelectedLocationId((prev) => prev || summaryData[0]?.location_id || "");
    } catch (error: any) {
      console.error(error);
      setErr(error?.message || "Erro ao carregar estoque.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSummary = useMemo(
    () => summary.find((item) => item.location_id === selectedLocationId) || null,
    [summary, selectedLocationId]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (searchScope === "selected" && selectedLocationId && row.location_id !== selectedLocationId) {
        return false;
      }

      if (!q) {
        return true;
      }

      return [
        row.product_name,
        row.product_slug,
        row.sku_code,
        row.sku_label,
        row.barcode,
        row.plating_type,
        row.location_code,
        row.location_name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, selectedLocationId, search, searchScope]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Estoque por estante</h1>
          <p className="text-sm text-gray-500">
            Visualização online do que existe em cada local.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="rounded-xl border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Recarregar
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border bg-white p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-900">Estantes</div>
            <div className="text-xs text-gray-500">
              Selecione um local para ver os itens
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="rounded-2xl border px-4 py-3 text-sm text-gray-500">
                Carregando...
              </div>
            ) : summary.length === 0 ? (
              <div className="rounded-2xl border px-4 py-3 text-sm text-gray-500">
                Nenhum local encontrado.
              </div>
            ) : (
              summary.map((item) => {
                const active = selectedLocationId === item.location_id;

                return (
                  <button
                    key={item.location_id}
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(item.location_id);
                      if (searchScope === "all" && !search.trim()) {
                        setSearchScope("selected");
                      }
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[#2b554e] bg-[#f6faf9] ring-2 ring-[#2b554e]/10"
                        : "bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          {item.location_code}
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {item.location_name}
                        </div>
                      </div>

                      {active && (
                        <span className="rounded-full bg-[#2b554e] px-2.5 py-1 text-[11px] font-medium text-white">
                          Ativa
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                        <div className="text-gray-500">Físico</div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {item.on_hand_total}
                        </div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                        <div className="text-gray-500">Reserva</div>
                        <div className="mt-1 font-semibold text-amber-700">
                          {item.reserved_total}
                        </div>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
                        <div className="text-gray-500">Livre</div>
                        <div className="mt-1 font-semibold text-[#2b554e]">
                          {item.available_total}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-3xl border bg-white p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Estante selecionada
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  {selectedSummary?.location_name || "Selecione uma estante"}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Código: {selectedSummary?.location_code || "-"}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[560px]">
                <StatCard label="SKUs" value={selectedSummary?.sku_count || 0} />
                <StatCard label="Físico" value={selectedSummary?.on_hand_total || 0} />
                <StatCard
                  label="Reservado"
                  value={selectedSummary?.reserved_total || 0}
                  tone="warning"
                />
                <StatCard
                  label="Disponível"
                  value={selectedSummary?.available_total || 0}
                  tone="success"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <ScopeButton
                active={searchScope === "selected"}
                onClick={() => setSearchScope("selected")}
              >
                Nesta estante
              </ScopeButton>

              <ScopeButton
                active={searchScope === "all"}
                onClick={() => setSearchScope("all")}
              >
                Todos os estoques
              </ScopeButton>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                searchScope === "selected"
                  ? "Buscar nesta estante por produto, SKU, código de barras..."
                  : "Buscar em todos os estoques por produto, SKU, código de barras..."
              }
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
            />
          </div>

          <div className="rounded-3xl border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">
                {searchScope === "selected" ? "Itens da estante" : "Resultados em todos os estoques"}
              </div>
              <div className="text-sm text-gray-500">
                {filteredRows.length} item(ns)
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1100px]">
                <div className="grid grid-cols-12 gap-3 border-b bg-[#fcfaf6] px-4 py-3 text-sm text-gray-500">
                  <div className="col-span-2">Foto</div>
                  <div className="col-span-3">Produto / SKU</div>
                  <div className="col-span-2">Banho</div>
                  <div className="col-span-1">Preço</div>
                  <div className="col-span-1">Físico</div>
                  <div className="col-span-1">Reservado</div>
                  <div className="col-span-1">Disponível</div>
                  <div className="col-span-1">Local</div>
                </div>

                {loading ? (
                  <div className="p-6 text-sm text-gray-600">Carregando...</div>
                ) : filteredRows.length === 0 ? (
                  <div className="p-6 text-sm text-gray-600">
                    Nenhum item encontrado.
                  </div>
                ) : (
                  filteredRows.map((row) => {
                    const imageUrl = getPublicImageUrl(row.image_path);

                    return (
                      <div
                        key={`${row.location_id}-${row.sku_id}`}
                        className="grid grid-cols-12 gap-3 border-b px-4 py-4 last:border-b-0"
                      >
                        <div className="col-span-2">
                          <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-gray-50">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={row.image_alt || row.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
                                Sem foto
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-span-3">
                          <div className="text-[18px] font-semibold text-gray-900">
                            {row.product_name}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {row.sku_label || row.sku_code || "SKU"}
                          </div>
                          <div className="mt-1 text-sm text-gray-400">
                            {row.sku_code || row.barcode || "-"}
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center text-sm text-gray-700">
                          {[
                            row.plating_type,
                            row.plating_millesimal ? `${row.plating_millesimal}` : null,
                            row.ring_size ? `Tam ${row.ring_size}` : null,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "-"}
                        </div>

                        <div className="col-span-1 flex items-center text-sm text-gray-700">
                          {formatBRL(row.price_cents)}
                        </div>

                        <div className="col-span-1 flex items-center text-lg font-semibold text-gray-900">
                          {row.on_hand_qty}
                        </div>

                        <div className="col-span-1 flex items-center text-lg font-semibold text-amber-700">
                          {row.reserved_qty}
                        </div>

                        <div className="col-span-1 flex items-center text-lg font-semibold text-[#2b554e]">
                          {row.available_qty}
                        </div>

                        <div className="col-span-1 flex items-center text-sm text-gray-500">
                          {row.location_code}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Bell,
  Boxes,
  DollarSign,
  Gauge,
  Package,
  Percent,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type PieceTypeRef = {
  name: string | null;
  slug: string | null;
};

type ProductRef = {
  id: string;
  name: string | null;
  piece_type_id: string | null;
  piece_type?: PieceTypeRef | null;
};

type SkuRow = {
  id: string;
  sku_code: string | null;
  title: string | null;
  variant_name: string | null;
  active: boolean;
  price_cents: number | null;
  cost_cents: number | null;
  cost_gross_cents: number | null;
  cost_plating_cents: number | null;
  target_margin_pct: number | null;
  product_id: string;
  product?: ProductRef | null;
};

type StockMovement = {
  sku_id: string;
  type: "in" | "out" | "adjust" | "reserve" | "unreserve";
  quantity: number;
};

type SkuAnalysis = {
  sku_id: string;
  sku_code: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  piece_type: string;
  active: boolean;
  stock_qty: number;
  price_cents: number;
  cost_cents: number;
  gross_cost_cents: number;
  plating_cost_cents: number;
  profit_cents: number;
  margin_percent: number;
  markup_percent: number;
  target_margin_pct: number;
  missing_cost: boolean;
  status: "ok" | "inactive" | "no_price" | "missing_cost" | "negative_margin" | "low_margin" | "below_target";
};

type GroupAnalysis = {
  key: string;
  name: string;
  sku_count: number;
  active_sku_count: number;
  price_cents: number;
  cost_cents: number;
  profit_cents: number;
  margin_percent: number;
  markup_percent: number;
  avg_margin_percent: number;
  avg_markup_percent: number;
  missing_cost_count: number;
  low_margin_count: number;
  below_target_count: number;
  negative_margin_count: number;
};

type CatalogMetrics = {
  totalSkus: number;
  activeSkus: number;
  inactiveSkus: number;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
  markupPercent: number;
  avgMarginPercent: number;
  avgMarkupPercent: number;
  missingCostSkus: number;
  noPriceSkus: number;
  lowMarginSkus: number;
  belowTargetSkus: number;
  negativeMarginSkus: number;
  criticalStockSkus: number;
};

type SortKey = "margin" | "markup" | "profit" | "price" | "cost" | "name" | "stock";

type StatusFilter = "all" | SkuAnalysis["status"];

function moneyBRL(value: number) {
  return (Number(value || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,00%";
  return `${Number(value || 0).toFixed(2).replace(".", ",")}%`;
}

function shortId(id: string) {
  return id?.slice(0, 8) || "-";
}

function calcMargin(price: number, cost: number) {
  if (!price || price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

function calcMarkup(price: number, cost: number) {
  if (!cost || cost <= 0) return 0;
  return ((price - cost) / cost) * 100;
}

function getSkuCost(sku: Pick<SkuRow, "cost_cents" | "cost_gross_cents" | "cost_plating_cents">) {
  if (sku.cost_cents !== null && sku.cost_cents !== undefined) {
    return Number(sku.cost_cents || 0);
  }

  return Number(sku.cost_gross_cents || 0) + Number(sku.cost_plating_cents || 0);
}

function hasMissingCost(sku: Pick<SkuRow, "cost_cents" | "cost_gross_cents" | "cost_plating_cents">) {
  return sku.cost_cents === null && sku.cost_gross_cents === null && sku.cost_plating_cents === null;
}

function getPieceTypeLabel(product?: ProductRef | null) {
  return product?.piece_type?.name || "Sem tipo cadastrado";
}

function applyMovement(current: number, type: StockMovement["type"], quantity: number) {
  switch (type) {
    case "in":
    case "adjust":
    case "unreserve":
      return current + quantity;
    case "out":
    case "reserve":
      return current - quantity;
    default:
      return current;
  }
}

function getSkuStatus({ active, price_cents, missing_cost, margin_percent, target_margin_pct }: SkuAnalysis) {
  if (!active) return "inactive";
  if (!price_cents || price_cents <= 0) return "no_price";
  if (missing_cost) return "missing_cost";
  if (margin_percent < 0) return "negative_margin";
  if (target_margin_pct > 0 && margin_percent < target_margin_pct) return "below_target";
  if (margin_percent < 40) return "low_margin";
  return "ok";
}

function statusMeta(status: SkuAnalysis["status"]) {
  const map = {
    ok: { label: "OK", className: "bg-emerald-100 text-emerald-700" },
    inactive: { label: "Inativo", className: "bg-slate-100 text-slate-600" },
    no_price: { label: "Sem preço", className: "bg-orange-100 text-orange-700" },
    missing_cost: { label: "Sem custo", className: "bg-rose-100 text-rose-700" },
    negative_margin: { label: "Margem negativa", className: "bg-red-100 text-red-700" },
    low_margin: { label: "Margem baixa", className: "bg-amber-100 text-amber-700" },
    below_target: { label: "Abaixo da meta", className: "bg-violet-100 text-violet-700" },
  } satisfies Record<SkuAnalysis["status"], { label: string; className: string }>;

  return map[status];
}

function marginBadgeClass(value: number) {
  if (value < 0) return "bg-red-100 text-red-700";
  if (value < 40) return "bg-amber-100 text-amber-700";
  if (value < 55) return "bg-sky-100 text-sky-700";
  return "bg-emerald-100 text-emerald-700";
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: "default" | "good" | "warn" | "danger";
  onClick?: () => void;
}) {
  const toneMap = {
    default: "bg-[#eef5f2] text-[#2b554e]",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={`rounded-[26px] border border-[#e9e2d6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle ? <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">{subtitle}</p> : null}
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneMap[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  actionLabel,
  actionPath,
  children,
}: {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  actionPath?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[#e9e2d6] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#eee5d8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b08d57]">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-bold text-[#2b554e]">{title}</h2>
        </div>

        {actionPath ? (
          <Link to={actionPath} className="rounded-2xl border border-[#e9e2d6] px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-[#FCFAF6]">
            {actionLabel || "Ver todos"}
          </Link>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function HorizontalBarList({
  data,
  valueFormatter,
  emptyText,
}: {
  data: { label: string; value: number; detail?: string }[];
  valueFormatter: (value: number) => string;
  emptyText: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  if (!data.length) return <div className="text-sm text-slate-500">{emptyText}</div>;

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-slate-700">{item.label}</span>
            <span className="shrink-0 font-bold text-slate-900">{valueFormatter(item.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#2b554e]" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} />
          </div>
          {item.detail ? <p className="mt-1 text-xs font-medium text-slate-400">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}

function buildGroupRows(rows: SkuAnalysis[], groupBy: "product" | "piece_type") {
  const map = new Map<string, GroupAnalysis & { marginSum: number; markupSum: number; avgBase: number }>();

  rows.forEach((item) => {
    const key = groupBy === "product" ? item.product_id : item.piece_type;
    const name = groupBy === "product" ? item.product_name : item.piece_type;
    const current =
      map.get(key) ||
      ({
        key,
        name,
        sku_count: 0,
        active_sku_count: 0,
        price_cents: 0,
        cost_cents: 0,
        profit_cents: 0,
        margin_percent: 0,
        markup_percent: 0,
        avg_margin_percent: 0,
        avg_markup_percent: 0,
        missing_cost_count: 0,
        low_margin_count: 0,
        below_target_count: 0,
        negative_margin_count: 0,
        marginSum: 0,
        markupSum: 0,
        avgBase: 0,
      } satisfies GroupAnalysis & { marginSum: number; markupSum: number; avgBase: number });

    current.sku_count += 1;
    current.active_sku_count += item.active ? 1 : 0;
    current.price_cents += item.active ? item.price_cents : 0;
    current.cost_cents += item.active ? item.cost_cents : 0;
    current.profit_cents = current.price_cents - current.cost_cents;
    current.margin_percent = calcMargin(current.price_cents, current.cost_cents);
    current.markup_percent = calcMarkup(current.price_cents, current.cost_cents);
    current.missing_cost_count += item.active && item.missing_cost ? 1 : 0;
    current.low_margin_count += item.active && item.status === "low_margin" ? 1 : 0;
    current.below_target_count += item.active && item.status === "below_target" ? 1 : 0;
    current.negative_margin_count += item.active && item.status === "negative_margin" ? 1 : 0;

    if (item.active && !item.missing_cost && item.price_cents > 0 && item.cost_cents > 0) {
      current.marginSum += item.margin_percent;
      current.markupSum += item.markup_percent;
      current.avgBase += 1;
    }

    map.set(key, current);
  });

  return Array.from(map.values())
    .map(({ marginSum, markupSum, avgBase, ...item }) => ({
      ...item,
      avg_margin_percent: avgBase > 0 ? marginSum / avgBase : 0,
      avg_markup_percent: avgBase > 0 ? markupSum / avgBase : 0,
    }))
    .sort((a, b) => a.margin_percent - b.margin_percent);
}

export default function AdminEstatisticas() {
  const navigate = useNavigate();

  const [skuRows, setSkuRows] = useState<SkuAnalysis[]>([]);
  const [typeRows, setTypeRows] = useState<GroupAnalysis[]>([]);
  const [productRows, setProductRows] = useState<GroupAnalysis[]>([]);
  const [metrics, setMetrics] = useState<CatalogMetrics>({
    totalSkus: 0,
    activeSkus: 0,
    inactiveSkus: 0,
    totalPrice: 0,
    totalCost: 0,
    totalProfit: 0,
    marginPercent: 0,
    markupPercent: 0,
    avgMarginPercent: 0,
    avgMarkupPercent: 0,
    missingCostSkus: 0,
    noPriceSkus: 0,
    lowMarginSkus: 0,
    belowTargetSkus: 0,
    negativeMarginSkus: 0,
    criticalStockSkus: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pieceTypeFilter, setPieceTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [showCriticalStock, setShowCriticalStock] = useState(false);
  const [criticalStockSortDirection, setCriticalStockSortDirection] = useState<"asc" | "desc">("asc");
  const [sortKey, setSortKey] = useState<SortKey>("margin");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadCatalogAnalytics();
  }, []);

  async function loadCatalogAnalytics() {
    try {
      setLoading(true);
      setError("");

      const [skusResult, stockResult] = await Promise.all([
        supabase
          .from("skus")
          .select(
            "id, sku_code, title, variant_name, active, price_cents, cost_cents, cost_gross_cents, cost_plating_cents, target_margin_pct, product_id, product:products(id, name, piece_type_id, piece_type:piece_types(name, slug))"
          )
          .order("created_at", { ascending: false }),

        supabase.from("stock_movements").select("sku_id, type, quantity"),
      ]);

      if (skusResult.error) throw skusResult.error;
      if (stockResult.error) throw stockResult.error;

      const stockBySku = new Map<string, number>();

      ((stockResult.data ?? []) as StockMovement[]).forEach((movement) => {
        if (!movement.sku_id) return;
        const current = stockBySku.get(movement.sku_id) ?? 0;
        const quantity = Number(movement.quantity || 0);
        stockBySku.set(movement.sku_id, applyMovement(current, movement.type, quantity));
      });

      const rows = ((skusResult.data ?? []) as any[]).map((sku) => {
        const typedSku = sku as SkuRow;
        const product = typedSku.product as ProductRef | null;
        const price = Number(typedSku.price_cents || 0);
        const cost = getSkuCost(typedSku);
        const profit = price - cost;
        const margin = calcMargin(price, cost);
        const markup = calcMarkup(price, cost);
        const missingCost = hasMissingCost(typedSku);
        const grossCost = Number(typedSku.cost_gross_cents || 0);
        const platingCost = Number(typedSku.cost_plating_cents || 0);
        const stockQty = stockBySku.get(typedSku.id) ?? 0;

        const base = {
          sku_id: typedSku.id,
          sku_code: typedSku.sku_code || shortId(typedSku.id),
          product_id: typedSku.product_id,
          product_name: product?.name || "Produto sem nome",
          variant_name: typedSku.title || typedSku.variant_name || "Padrão",
          piece_type: getPieceTypeLabel(product),
          active: Boolean(typedSku.active),
          stock_qty: stockQty,
          price_cents: price,
          cost_cents: cost,
          gross_cost_cents: grossCost,
          plating_cost_cents: platingCost,
          profit_cents: profit,
          margin_percent: margin,
          markup_percent: markup,
          target_margin_pct: Number(typedSku.target_margin_pct || 0),
          missing_cost: missingCost,
          status: "ok" as SkuAnalysis["status"],
        } satisfies SkuAnalysis;

        return { ...base, status: getSkuStatus(base) } satisfies SkuAnalysis;
      });

      const activeRows = rows.filter((item) => item.active);
      const validAverageRows = activeRows.filter((item) => !item.missing_cost && item.price_cents > 0 && item.cost_cents > 0);
      const totalPrice = activeRows.reduce((acc, item) => acc + item.price_cents, 0);
      const totalCost = activeRows.reduce((acc, item) => acc + item.cost_cents, 0);
      const totalProfit = totalPrice - totalCost;

      setSkuRows(rows.sort((a, b) => a.margin_percent - b.margin_percent));
      setTypeRows(buildGroupRows(rows, "piece_type"));
      setProductRows(buildGroupRows(rows, "product"));
      setMetrics({
        totalSkus: rows.length,
        activeSkus: activeRows.length,
        inactiveSkus: rows.length - activeRows.length,
        totalPrice,
        totalCost,
        totalProfit,
        marginPercent: calcMargin(totalPrice, totalCost),
        markupPercent: calcMarkup(totalPrice, totalCost),
        avgMarginPercent: validAverageRows.length ? validAverageRows.reduce((acc, item) => acc + item.margin_percent, 0) / validAverageRows.length : 0,
        avgMarkupPercent: validAverageRows.length ? validAverageRows.reduce((acc, item) => acc + item.markup_percent, 0) / validAverageRows.length : 0,
        missingCostSkus: activeRows.filter((item) => item.missing_cost).length,
        noPriceSkus: activeRows.filter((item) => item.status === "no_price").length,
        lowMarginSkus: activeRows.filter((item) => item.status === "low_margin").length,
        belowTargetSkus: activeRows.filter((item) => item.status === "below_target").length,
        negativeMarginSkus: activeRows.filter((item) => item.status === "negative_margin").length,
        criticalStockSkus: activeRows.filter((item) => item.stock_qty <= 1).length,
      });
    } catch (err: any) {
      console.error("Erro ao carregar análise de catálogo:", err);
      setError(err?.message || "Erro ao carregar análise de catálogo");
    } finally {
      setLoading(false);
    }
  }

  const pieceTypeOptions = useMemo(() => {
    return Array.from(new Set(skuRows.map((item) => item.piece_type))).sort((a, b) => a.localeCompare(b));
  }, [skuRows]);

  const filteredSkuRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = skuRows.filter((item) => {
      const matchesSearch =
        !term ||
        item.sku_code.toLowerCase().includes(term) ||
        item.product_name.toLowerCase().includes(term) ||
        item.variant_name.toLowerCase().includes(term) ||
        item.piece_type.toLowerCase().includes(term);

      const matchesType = pieceTypeFilter === "all" || item.piece_type === pieceTypeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesActive = showInactive || item.active;

      return matchesSearch && matchesType && matchesStatus && matchesActive;
    });

    const direction = sortDirection === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
      if (sortKey === "name") return a.product_name.localeCompare(b.product_name) * direction;
      if (sortKey === "markup") return (a.markup_percent - b.markup_percent) * direction;
      if (sortKey === "profit") return (a.profit_cents - b.profit_cents) * direction;
      if (sortKey === "price") return (a.price_cents - b.price_cents) * direction;
      if (sortKey === "cost") return (a.cost_cents - b.cost_cents) * direction;
      if (sortKey === "stock") return (a.stock_qty - b.stock_qty) * direction;
      return (a.margin_percent - b.margin_percent) * direction;
    });
  }, [pieceTypeFilter, search, showInactive, skuRows, sortDirection, sortKey, statusFilter]);

  const criticalStockRows = useMemo(() => {
    const direction = criticalStockSortDirection === "asc" ? 1 : -1;

    return skuRows
      .filter((item) => item.active && item.stock_qty <= 1)
      .sort(
        (a, b) =>
          (a.stock_qty - b.stock_qty) * direction ||
          a.product_name.localeCompare(b.product_name)
      );
  }, [criticalStockSortDirection, skuRows]);

  const filteredProductRows = useMemo(() => {
    const activeProductRows = productRows.filter((item) => skuRows.some((sku) => sku.product_id === item.key && (showInactive || sku.active)));
    return activeProductRows.sort((a, b) => a.margin_percent - b.margin_percent);
  }, [productRows, showInactive, skuRows]);

  const topTypesByProfit = useMemo(() => {
    return [...typeRows].sort((a, b) => b.profit_cents - a.profit_cents).slice(0, 8).map((item) => ({
      label: item.name,
      value: Math.max(item.profit_cents, 0),
      detail: `${item.active_sku_count} SKUs • margem ${formatPercent(item.margin_percent)} • markup ${formatPercent(item.markup_percent)}`,
    }));
  }, [typeRows]);

  const alertCount = metrics.missingCostSkus + metrics.noPriceSkus + metrics.lowMarginSkus + metrics.belowTargetSkus + metrics.negativeMarginSkus;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-[#e9e2d6] bg-gradient-to-br from-[#173d37] via-[#2b554e] to-[#4d786f] p-6 text-white shadow-[0_24px_70px_rgba(43,85,78,0.22)]">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-[#b08d57]/20" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#e7c992]">Analytics de Precificação</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Margem & Markup de Todos os SKUs</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Esta tela não usa produtos vendidos. A análise considera todos os SKUs cadastrados, com o preço atual e o custo atual do cadastro.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 text-white/75 backdrop-blur">
              <Search size={18} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 bg-transparent text-sm outline-none placeholder:text-white/60" placeholder="Buscar SKU, produto ou tipo" />
            </div>

            <button onClick={loadCatalogAnalytics} className="flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white/90 backdrop-blur hover:bg-white/15">
              Atualizar
            </button>

            <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/80 backdrop-blur">
              <Bell size={18} />
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-[#e9e2d6] bg-white p-6 text-zinc-500 shadow-sm">Carregando análise de todos os SKUs...</div>
      ) : error ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">{error}</div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Margem Geral" value={formatPercent(metrics.marginPercent)} subtitle="Lucro total / preço atual total dos SKUs ativos" icon={<Percent size={20} />} tone={metrics.marginPercent >= 40 ? "good" : "warn"} />
            <MetricCard title="Markup Geral" value={formatPercent(metrics.markupPercent)} subtitle="Lucro total / custo atual total dos SKUs ativos" icon={<Gauge size={20} />} tone={metrics.markupPercent >= 100 ? "good" : "warn"} />
            <MetricCard title="Preço Total Catálogo" value={moneyBRL(metrics.totalPrice)} subtitle={`${metrics.activeSkus} SKUs ativos de ${metrics.totalSkus} cadastrados`} icon={<DollarSign size={20} />} />
            <MetricCard title="Custo Total Catálogo" value={moneyBRL(metrics.totalCost)} subtitle="Base: cost_cents ou bruto + banho" icon={<TrendingDown size={20} />} tone="warn" />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Lucro Potencial" value={moneyBRL(metrics.totalProfit)} subtitle="Preço atual menos custo atual dos SKUs ativos" icon={<TrendingUp size={20} />} tone={metrics.totalProfit >= 0 ? "good" : "danger"} />
            <MetricCard title="Alertas" value={alertCount} subtitle="Sem preço, sem custo, margem baixa ou abaixo da meta" icon={<AlertTriangle size={20} />} tone={alertCount > 0 ? "danger" : "good"} />
            <MetricCard title="Sem Custo" value={metrics.missingCostSkus} subtitle="SKUs ativos sem custo cadastrado" icon={<Package size={20} />} tone={metrics.missingCostSkus > 0 ? "danger" : "good"} />
            <MetricCard
              title="Estoque Crítico"
              value={metrics.criticalStockSkus}
              subtitle="Clique para ver SKUs ativos com saldo 0 ou 1"
              icon={<Boxes size={20} />}
              tone={metrics.criticalStockSkus > 0 ? "danger" : "good"}
              onClick={() => setShowCriticalStock((current) => !current)}
            />
          </section>

          {showCriticalStock ? (
            <SectionCard title="Lista de Estoque Crítico" eyebrow="SKUs ativos com saldo 0 ou 1">
              <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">
                  {criticalStockRows.length} SKU{criticalStockRows.length === 1 ? "" : "s"} precisam de atenção imediata.
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCriticalStockSortDirection((current) =>
                        current === "asc" ? "desc" : "asc"
                      )
                    }
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    {criticalStockSortDirection === "asc"
                      ? "Ordenar: maior estoque primeiro"
                      : "Ordenar: menor estoque primeiro"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCriticalStock(false)}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    Ver menos
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 pr-4 font-semibold">SKU</th>
                      <th className="pb-3 pr-4 font-semibold">Produto</th>
                      <th className="pb-3 pr-4 font-semibold">Tipo</th>
                      <th className="pb-3 pr-4 font-semibold">Estoque</th>
                      <th className="pb-3 pr-4 font-semibold">Preço</th>
                      <th className="pb-3 pr-4 font-semibold">Custo</th>
                      <th className="pb-3 pr-4 font-semibold">Margem</th>
                      <th className="pb-3 pr-0 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalStockRows.map((item) => {
                      const meta = statusMeta(item.status);
                      return (
                        <tr key={item.sku_id} className="border-b last:border-b-0 hover:bg-slate-50" onClick={() => navigate("/admin/produtos")}>
                          <td className="py-4 pr-4 font-bold text-slate-800">{item.sku_code}</td>
                          <td className="py-4 pr-4">
                            <div className="font-semibold text-slate-800">{item.product_name}</div>
                            <div className="text-xs text-slate-400">{item.variant_name}</div>
                          </td>
                          <td className="py-4 pr-4 text-slate-600">{item.piece_type}</td>
                          <td className={`py-4 pr-4 text-lg font-black ${item.stock_qty <= 0 ? "text-red-700" : "text-rose-700"}`}>{item.stock_qty}</td>
                          <td className="py-4 pr-4 font-semibold text-slate-700">{moneyBRL(item.price_cents)}</td>
                          <td className="py-4 pr-4 text-slate-700">{moneyBRL(item.cost_cents)}</td>
                          <td className="py-4 pr-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.missing_cost ? "bg-rose-100 text-rose-700" : marginBadgeClass(item.margin_percent)}`}>
                              {item.missing_cost ? "Sem custo" : formatPercent(item.margin_percent)}
                            </span>
                          </td>
                          <td className="py-4 pr-0"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {criticalStockRows.length === 0 ? (
                  <div className="py-4 text-sm text-slate-500">Nenhum SKU ativo com estoque crítico.</div>
                ) : null}
              </div>

              {criticalStockRows.length > 0 ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCriticalStock(false)}
                    className="rounded-xl border border-[#e9e2d6] bg-white px-4 py-2 text-sm font-bold text-[#2b554e] hover:bg-[#FCFAF6]"
                  >
                    Ver menos
                  </button>
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard title="Margem & Markup por Tipo de Peça" eyebrow="todos os SKUs do catálogo" actionPath="/admin/produtos" actionLabel="Ver produtos">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 pr-4 font-semibold">Tipo</th>
                      <th className="pb-3 pr-4 font-semibold">SKUs ativos</th>
                      <th className="pb-3 pr-4 font-semibold">Preço total</th>
                      <th className="pb-3 pr-4 font-semibold">Custo total</th>
                      <th className="pb-3 pr-4 font-semibold">Lucro</th>
                      <th className="pb-3 pr-4 font-semibold">Margem geral</th>
                      <th className="pb-3 pr-4 font-semibold">Markup geral</th>
                      <th className="pb-3 pr-0 font-semibold">Alertas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeRows.map((item) => {
                      const alerts = item.missing_cost_count + item.low_margin_count + item.below_target_count + item.negative_margin_count;
                      return (
                        <tr key={item.key} className="border-b last:border-b-0 hover:bg-slate-50">
                          <td className="py-4 pr-4 font-bold text-slate-800">{item.name}</td>
                          <td className="py-4 pr-4 text-slate-600">{item.active_sku_count}</td>
                          <td className="py-4 pr-4 text-slate-700">{moneyBRL(item.price_cents)}</td>
                          <td className="py-4 pr-4 text-slate-700">{moneyBRL(item.cost_cents)}</td>
                          <td className={`py-4 pr-4 font-bold ${item.profit_cents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{moneyBRL(item.profit_cents)}</td>
                          <td className="py-4 pr-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${marginBadgeClass(item.margin_percent)}`}>{formatPercent(item.margin_percent)}</span></td>
                          <td className="py-4 pr-4 font-bold text-slate-800">{formatPercent(item.markup_percent)}</td>
                          <td className="py-4 pr-0"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${alerts > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{alerts}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Ranking por Lucro Potencial" eyebrow="por tipo de peça">
              <HorizontalBarList data={topTypesByProfit} valueFormatter={(value) => moneyBRL(value)} emptyText="Sem dados para exibir." />
            </SectionCard>
          </section>

          <SectionCard title="Margem & Markup por Produto" eyebrow="todos os produtos do cadastro" actionPath="/admin/produtos" actionLabel="Editar produtos">
            <div className="max-h-[520px] overflow-auto pr-1">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 pr-4 font-semibold">Produto</th>
                    <th className="pb-3 pr-4 font-semibold">SKUs ativos</th>
                    <th className="pb-3 pr-4 font-semibold">Preço total</th>
                    <th className="pb-3 pr-4 font-semibold">Custo total</th>
                    <th className="pb-3 pr-4 font-semibold">Lucro</th>
                    <th className="pb-3 pr-4 font-semibold">Margem</th>
                    <th className="pb-3 pr-4 font-semibold">Markup</th>
                    <th className="pb-3 pr-0 font-semibold">Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProductRows.map((item) => {
                    const alerts = item.missing_cost_count + item.low_margin_count + item.below_target_count + item.negative_margin_count;
                    return (
                      <tr key={item.key} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="py-4 pr-4 font-bold text-slate-800">{item.name}</td>
                        <td className="py-4 pr-4 text-slate-600">{item.active_sku_count}</td>
                        <td className="py-4 pr-4 text-slate-700">{moneyBRL(item.price_cents)}</td>
                        <td className="py-4 pr-4 text-slate-700">{moneyBRL(item.cost_cents)}</td>
                        <td className={`py-4 pr-4 font-bold ${item.profit_cents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{moneyBRL(item.profit_cents)}</td>
                        <td className="py-4 pr-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${marginBadgeClass(item.margin_percent)}`}>{formatPercent(item.margin_percent)}</span></td>
                        <td className="py-4 pr-4 font-bold text-slate-800">{formatPercent(item.markup_percent)}</td>
                        <td className="py-4 pr-0"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${alerts > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{alerts}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredProductRows.length === 0 ? <div className="py-4 text-sm text-slate-500">Nenhum produto encontrado.</div> : null}
            </div>
          </SectionCard>

          <SectionCard title="Margem & Markup por SKU" eyebrow="todos os SKUs do cadastro" actionPath="/admin/produtos" actionLabel="Editar SKUs">
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.7fr]">
              <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-3 text-zinc-500">
                <Search size={17} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" placeholder="Buscar SKU, produto, variação ou tipo" />
              </div>

              <select value={pieceTypeFilter} onChange={(e) => setPieceTypeFilter(e.target.value)} className="h-11 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-3 text-sm font-semibold text-zinc-600 outline-none">
                <option value="all">Todos os tipos</option>
                {pieceTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="h-11 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-3 text-sm font-semibold text-zinc-600 outline-none">
                <option value="all">Todos os status</option>
                <option value="ok">OK</option>
                <option value="no_price">Sem preço</option>
                <option value="missing_cost">Sem custo</option>
                <option value="negative_margin">Margem negativa</option>
                <option value="low_margin">Margem baixa</option>
                <option value="below_target">Abaixo da meta</option>
                <option value="inactive">Inativo</option>
              </select>

              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="h-11 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-3 text-sm font-semibold text-zinc-600 outline-none">
                <option value="margin">Ordenar por margem</option>
                <option value="markup">Ordenar por markup</option>
                <option value="profit">Ordenar por lucro</option>
                <option value="price">Ordenar por preço</option>
                <option value="cost">Ordenar por custo</option>
                <option value="stock">Ordenar por estoque</option>
                <option value="name">Ordenar por produto</option>
              </select>

              <button onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm font-bold text-zinc-600 hover:bg-[#FCFAF6]">
                <ArrowUpDown size={16} /> {sortDirection === "asc" ? "Crescente" : "Decrescente"}
              </button>
            </div>

            <label className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Mostrar SKUs inativos
            </label>

            <div className="max-h-[680px] overflow-auto pr-1">
              <table className="w-full min-w-[1280px] text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 pr-4 font-semibold">SKU</th>
                    <th className="pb-3 pr-4 font-semibold">Produto</th>
                    <th className="pb-3 pr-4 font-semibold">Tipo</th>
                    <th className="pb-3 pr-4 font-semibold">Estoque</th>
                    <th className="pb-3 pr-4 font-semibold">Preço atual</th>
                    <th className="pb-3 pr-4 font-semibold">Custo total</th>
                    <th className="pb-3 pr-4 font-semibold">Custo bruto</th>
                    <th className="pb-3 pr-4 font-semibold">Custo banho</th>
                    <th className="pb-3 pr-4 font-semibold">Lucro unit.</th>
                    <th className="pb-3 pr-4 font-semibold">Margem</th>
                    <th className="pb-3 pr-4 font-semibold">Markup</th>
                    <th className="pb-3 pr-4 font-semibold">Meta margem</th>
                    <th className="pb-3 pr-0 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSkuRows.map((item) => {
                    const meta = statusMeta(item.status);
                    return (
                      <tr key={item.sku_id} className="border-b last:border-b-0 hover:bg-slate-50" onClick={() => navigate("/admin/produtos")}>
                        <td className="py-4 pr-4 font-bold text-slate-800">{item.sku_code}</td>
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-slate-800">{item.product_name}</div>
                          <div className="text-xs text-slate-400">{item.variant_name}</div>
                        </td>
                        <td className="py-4 pr-4 text-slate-600">{item.piece_type}</td>
                        <td className={`py-4 pr-4 font-bold ${item.stock_qty <= 1 ? "text-rose-700" : item.stock_qty === 2 ? "text-amber-700" : "text-slate-700"}`}>{item.stock_qty}</td>
                        <td className="py-4 pr-4 font-semibold text-slate-700">{moneyBRL(item.price_cents)}</td>
                        <td className="py-4 pr-4 text-slate-700">{moneyBRL(item.cost_cents)}</td>
                        <td className="py-4 pr-4 text-slate-500">{moneyBRL(item.gross_cost_cents)}</td>
                        <td className="py-4 pr-4 text-slate-500">{moneyBRL(item.plating_cost_cents)}</td>
                        <td className={`py-4 pr-4 font-bold ${item.profit_cents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{moneyBRL(item.profit_cents)}</td>
                        <td className="py-4 pr-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.missing_cost ? "bg-rose-100 text-rose-700" : marginBadgeClass(item.margin_percent)}`}>{item.missing_cost ? "Sem custo" : formatPercent(item.margin_percent)}</span></td>
                        <td className="py-4 pr-4 font-bold text-slate-800">{item.missing_cost ? "-" : formatPercent(item.markup_percent)}</td>
                        <td className="py-4 pr-4 text-slate-600">{item.target_margin_pct > 0 ? formatPercent(item.target_margin_pct) : "-"}</td>
                        <td className="py-4 pr-0"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredSkuRows.length === 0 ? <div className="py-4 text-sm text-slate-500">Nenhum SKU encontrado com esses filtros.</div> : null}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart3,
  Package,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Metrics = {
  salesTotal: number;
  orders: number;
  newCustomers: number;
  criticalStock: number;
};

type ProfitMetrics = {
  productRevenue: number;
  cmv: number;
  grossProfit: number;
  marginPercent: number;
  markupPercent: number;
  missingCostItems: number;
  lowMarginItems: number;
};

type RecentOrderRow = {
  id: string;
  customer_id: string | null;
  external_customer_name: string | null;
  created_at: string;
  total_cents: number | null;
  status: string | null;
};

type RecentOrder = {
  id: string;
  customer_name: string;
  created_at: string;
  total_cents: number;
  status: string;
};

type RecentCustomer = {
  id: string;
  name: string;
  email: string | null;
};

type WeeklyPoint = {
  label: string;
  total: number;
};

type BestSeller = {
  name: string;
  qty: number;
};

type ProfitProduct = {
  product_id: string;
  name: string;
  qty: number;
  revenue_cents: number;
  cost_cents: number;
  profit_cents: number;
  margin_percent: number;
  missing_cost: boolean;
};

type StockMovement = {
  sku_id: string;
  type: "in" | "out" | "adjust" | "reserve" | "unreserve";
  quantity: number;
};

type ProfitSkuRow = {
  id: string;
  product_id: string;
  cost_cents: number | null;
  cost_gross_cents: number | null;
  cost_plating_cents: number | null;
};

type ProductRow = {
  id: string;
  name: string;
};

type OrderItemProfitRow = {
  order_id: string;
  sku_id: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number | null;
};

type PaidOrderRow = {
  id: string;
  total_cents: number | null;
  discount_cents: number | null;
  created_at: string;
  status: string | null;
};

function moneyBRL(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")}%`;
}

function formatDateBR(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function shortOrderId(id: string) {
  return `#${id.slice(0, 6)}`;
}

function initials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function statusMeta(status: string) {
  const s = (status || "").toLowerCase();

  if (s === "paid") return { label: "Pago", className: "bg-emerald-100 text-emerald-700" };
  if (s === "pending_payment" || s === "pending") return { label: "Pendente", className: "bg-amber-100 text-amber-700" };
  if (s === "canceled" || s === "cancelled") return { label: "Cancelado", className: "bg-rose-100 text-rose-700" };
  if (s === "processing") return { label: "Processando", className: "bg-sky-100 text-sky-700" };
  if (s === "shipped") return { label: "Enviado", className: "bg-violet-100 text-violet-700" };
  if (s === "delivered") return { label: "Entregue", className: "bg-emerald-100 text-emerald-700" };
  if (s === "refunded") return { label: "Reembolsado", className: "bg-slate-100 text-slate-700" };
  if (s === "draft") return { label: "Rascunho", className: "bg-gray-100 text-gray-700" };

  return { label: status || "-", className: "bg-gray-100 text-gray-700" };
}

function applyMovement(
  current: number,
  type: StockMovement["type"],
  quantity: number
) {
  switch (type) {
    case "in":
      return current + quantity;
    case "out":
      return current - quantity;
    case "adjust":
      return current + quantity;
    case "reserve":
      return current - quantity;
    case "unreserve":
      return current + quantity;
    default:
      return current;
  }
}

function getSkuCost(sku?: ProfitSkuRow | null) {
  if (!sku) return 0;

  if (sku.cost_cents !== null && sku.cost_cents !== undefined) {
    return Number(sku.cost_cents || 0);
  }

  return Number(sku.cost_gross_cents || 0) + Number(sku.cost_plating_cents || 0);
}

function hasMissingCost(sku?: ProfitSkuRow | null) {
  if (!sku) return true;

  return (
    sku.cost_cents === null &&
    sku.cost_gross_cents === null &&
    sku.cost_plating_cents === null
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  to,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  to?: string;
}) {
  const content = (
    <div className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-800">
            {value}
          </div>

          {subtitle ? (
            <div className="mt-2 text-sm font-medium text-emerald-600">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (!to) return content;

  return <Link to={to}>{content}</Link>;
}

function FinanceCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const toneMap = {
    default: "bg-[#FCFAF6] text-[#2b554e]",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-800">
            {value}
          </div>

          {subtitle ? (
            <div className="mt-2 text-sm font-medium text-zinc-500">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${toneMap[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  actionLabel = "Ver todos",
  actionPath,
  children,
}: {
  title: string;
  actionLabel?: string;
  actionPath?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>

        {actionPath ? (
          <Link
            to={actionPath}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function MiniLineChart({ data }: { data: WeeklyPoint[] }) {
  const width = 320;
  const height = 150;
  const padding = 18;

  const maxValue = Math.max(...data.map((d) => d.total), 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((item, index) => {
    const x = padding + (index * innerWidth) / Math.max(data.length - 1, 1);
    const y = padding + innerHeight - (item.total / maxValue) * innerHeight;
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${path} L ${points[points.length - 1]?.x ?? padding} ${height - padding
    } L ${points[0]?.x ?? padding} ${height - padding} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
        <path d={areaPath} fill="rgba(16,185,129,0.10)" />
        <path
          d={path}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#10b981" />
        ))}
      </svg>

      <div className="mt-2 grid grid-cols-7 text-center text-xs text-slate-500">
        {data.map((item) => (
          <div key={item.label}>{item.label}</div>
        ))}
      </div>
    </div>
  );
}

export default function AdminEstatisticas() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<Metrics>({
    salesTotal: 0,
    orders: 0,
    newCustomers: 0,
    criticalStock: 0,
  });

  const [profitMetrics, setProfitMetrics] = useState<ProfitMetrics>({
    productRevenue: 0,
    cmv: 0,
    grossProfit: 0,
    marginPercent: 0,
    markupPercent: 0,
    missingCostItems: 0,
    lowMarginItems: 0,
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [weeklySales, setWeeklySales] = useState<WeeklyPoint[]>([
    { label: "Seg", total: 0 },
    { label: "Ter", total: 0 },
    { label: "Qua", total: 0 },
    { label: "Qui", total: 0 },
    { label: "Sex", total: 0 },
    { label: "Sáb", total: 0 },
    { label: "Dom", total: 0 },
  ]);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [profitProducts, setProfitProducts] = useState<ProfitProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadDashboard();
  }, [startDate, endDate]);

  function getPeriodLabel() {
    if (startDate && endDate) {
      return `${new Date(startDate + "T00:00:00").toLocaleDateString(
        "pt-BR"
      )} até ${new Date(endDate + "T00:00:00").toLocaleDateString("pt-BR")}`;
    }

    if (startDate) {
      return `A partir de ${new Date(startDate + "T00:00:00").toLocaleDateString(
        "pt-BR"
      )}`;
    }

    if (endDate) {
      return `Até ${new Date(endDate + "T00:00:00").toLocaleDateString(
        "pt-BR"
      )}`;
    }

    return "Total geral";
  }

  function applyOrdersDateFilter(query: any) {
    let filteredQuery = query;

    if (startDate) {
      filteredQuery = filteredQuery.gte(
        "created_at",
        new Date(startDate + "T00:00:00").toISOString()
      );
    }

    if (endDate) {
      filteredQuery = filteredQuery.lte(
        "created_at",
        new Date(endDate + "T23:59:59").toISOString()
      );
    }

    return filteredQuery;
  }

  function clearDateFilter() {
    setStartDate("");
    setEndDate("");
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const today = new Date();

      const last30Days = new Date();
      last30Days.setDate(today.getDate() - 30);
      const start30 = last30Days.toISOString();

      const [
        ordersResult,
        customersResult,
        paidOrdersResult,
        recentOrdersResult,
        recentCustomersResult,
        stockMovementsResult,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),

        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .gte("created_at", start30),

        applyOrdersDateFilter(
          supabase
            .from("orders")
            .select("id, total_cents, discount_cents, created_at, status")
            .eq("status", "paid")
        ),

        supabase
          .from("orders")
          .select(
            "id, customer_id, external_customer_name, created_at, total_cents, discount_cents, status"
          )
          .order("created_at", { ascending: false })
          .limit(5),

        supabase
          .from("customers")
          .select("id, full_name, email")
          .order("created_at", { ascending: false })
          .limit(3),

        supabase.from("stock_movements").select("sku_id, type, quantity"),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (customersResult.error) throw customersResult.error;
      if (paidOrdersResult.error) throw paidOrdersResult.error;
      if (recentOrdersResult.error) throw recentOrdersResult.error;
      if (recentCustomersResult.error) throw recentCustomersResult.error;
      if (stockMovementsResult.error) throw stockMovementsResult.error;

      const paidOrders = (paidOrdersResult.data ?? []) as PaidOrderRow[];

    
      const salesTotal = paidOrders.reduce(
        (acc: number, item: PaidOrderRow) => acc + (item.total_cents ?? 0),
        0
      );

      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

      const weekMap: Record<string, number> = {
        Seg: 0,
        Ter: 0,
        Qua: 0,
        Qui: 0,
        Sex: 0,
        Sáb: 0,
        Dom: 0,
      };

      paidOrders.forEach((order: PaidOrderRow) => {
        const date = new Date(order.created_at);
        const label = days[date.getDay()];
        weekMap[label] += order.total_cents ?? 0;
      });

      setWeeklySales([
        { label: "Seg", total: weekMap.Seg },
        { label: "Ter", total: weekMap.Ter },
        { label: "Qua", total: weekMap.Qua },
        { label: "Qui", total: weekMap.Qui },
        { label: "Sex", total: weekMap.Sex },
        { label: "Sáb", total: weekMap.Sáb },
        { label: "Dom", total: weekMap.Dom },
      ]);

      const recentOrdersData =
        recentOrdersResult.data as RecentOrderRow[] | null;

      const customerIds = Array.from(
        new Set(
          (recentOrdersData ?? [])
            .map((item) => item.customer_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let customerNameMap = new Map<string, string>();

      if (customerIds.length > 0) {
        const { data: orderCustomersData, error: orderCustomersError } =
          await supabase
            .from("customers")
            .select("id, full_name, email")
            .in("id", customerIds);

        if (orderCustomersError) throw orderCustomersError;

        customerNameMap = new Map(
          (orderCustomersData ?? []).map((c) => [
            c.id,
            c.full_name || c.email || "Cliente",
          ])
        );
      }

      setRecentOrders(
        (recentOrdersData ?? []).map((item) => ({
          id: item.id,
          customer_name:
            item.external_customer_name ||
            (item.customer_id ? customerNameMap.get(item.customer_id) : null) ||
            "Cliente",
          created_at: item.created_at,
          total_cents: item.total_cents ?? 0,
          status: item.status ?? "",
        }))
      );

      setRecentCustomers(
        (recentCustomersResult.data ?? []).map((item) => ({
          id: item.id,
          name: item.full_name || item.email || "Sem nome",
          email: item.email ?? null,
        }))
      );

      const stockBySku = new Map<string, number>();

      (
        stockMovementsResult.data as StockMovement[] | null | undefined
      )?.forEach((movement) => {
        if (!movement.sku_id) return;

        const current = stockBySku.get(movement.sku_id) ?? 0;
        const quantity = Number(movement.quantity ?? 0);

        stockBySku.set(
          movement.sku_id,
          applyMovement(current, movement.type, quantity)
        );
      });

      const criticalStock = Array.from(stockBySku.values()).filter(
        (qty) => qty <= 2
      ).length;

      setMetrics({
        salesTotal,
        orders: ordersResult.count ?? 0,
        newCustomers: customersResult.count ?? 0,
        criticalStock,
      });

      await loadProfitAnalytics(paidOrders);
      await loadBestSellers(paidOrders);
    } catch (err: any) {
      console.error("Erro ao carregar estatísticas:", err);
      setError(err?.message || "Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  }

  async function loadBestSellers(paidOrders: PaidOrderRow[]) {
    if (paidOrders.length === 0) {
      setBestSellers([]);
      return;
    }

    const paidOrderIds = paidOrders.map((order) => order.id);

    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select("sku_id, quantity")
      .in("order_id", paidOrderIds)
      .not("sku_id", "is", null);

    if (orderItemsError) throw orderItemsError;

    const qtyBySku = new Map<string, number>();

    (orderItemsData ?? []).forEach((item) => {
      if (!item.sku_id) return;

      qtyBySku.set(
        item.sku_id,
        (qtyBySku.get(item.sku_id) ?? 0) + (item.quantity ?? 0)
      );
    });

    const skuIds = Array.from(qtyBySku.keys());

    if (skuIds.length === 0) {
      setBestSellers([]);
      return;
    }

    const { data: skusData, error: skusError } = await supabase
      .from("skus")
      .select("id, product_id")
      .in("id", skuIds);

    if (skusError) throw skusError;

    const skuRows = skusData ?? [];

    const productIds = Array.from(
      new Set(skuRows.map((sku) => sku.product_id).filter(Boolean))
    );

    if (productIds.length === 0) {
      setBestSellers([]);
      return;
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    if (productsError) throw productsError;

    const productNameMap = new Map(
      ((productsData ?? []) as ProductRow[]).map((product) => [
        product.id,
        product.name,
      ])
    );

    const skuToProduct = new Map(
      skuRows.map((sku) => [sku.id, sku.product_id])
    );

    const qtyByProduct = new Map<string, number>();

    qtyBySku.forEach((qty, skuId) => {
      const productId = skuToProduct.get(skuId);
      if (!productId) return;

      const productName = productNameMap.get(productId) ?? "Produto";
      qtyByProduct.set(productName, (qtyByProduct.get(productName) ?? 0) + qty);
    });

    const topProducts = Array.from(qtyByProduct.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    setBestSellers(topProducts);
  }

  async function loadProfitAnalytics(paidOrders: PaidOrderRow[]) {
    if (paidOrders.length === 0) {
      setProfitMetrics({
        productRevenue: 0,
        cmv: 0,
        grossProfit: 0,
        marginPercent: 0,
        markupPercent: 0,
        missingCostItems: 0,
        lowMarginItems: 0,
      });

      setProfitProducts([]);
      return;
    }

    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select("order_id, sku_id, quantity, unit_price_cents, line_total_cents")
      .in("order_id", paidOrders.map((o) => o.id))
      .not("sku_id", "is", null);

    if (orderItemsError) throw orderItemsError;

    const items = (orderItemsData ?? []) as OrderItemProfitRow[];

    const skuIds = Array.from(
      new Set(items.map((item) => item.sku_id).filter((id): id is string => !!id))
    );

    if (skuIds.length === 0) {
      setProfitMetrics({
        productRevenue: 0,
        cmv: 0,
        grossProfit: 0,
        marginPercent: 0,
        markupPercent: 0,
        missingCostItems: 0,
        lowMarginItems: 0,
      });

      setProfitProducts([]);
      return;
    }

    const { data: skusData, error: skusError } = await supabase
      .from("skus")
      .select("id, product_id, cost_cents, cost_gross_cents, cost_plating_cents")
      .in("id", skuIds);

    if (skusError) throw skusError;

    const skuRows = (skusData ?? []) as ProfitSkuRow[];

    const productIds = Array.from(
      new Set(skuRows.map((sku) => sku.product_id).filter(Boolean))
    );

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    if (productsError) throw productsError;

    const productRows = (productsData ?? []) as ProductRow[];

    const skuMap = new Map(skuRows.map((sku) => [sku.id, sku]));
    const productNameMap = new Map(
      productRows.map((product) => [product.id, product.name])
    );

    let productRevenue = 0;
    let cmv = 0;
    let missingCostItems = 0;
    let lowMarginItems = 0;

    const productMap = new Map<string, ProfitProduct>();

    const discountByOrder = new Map<string, number>(
      paidOrders.map((order) => [order.id, Number(order.discount_cents || 0)])
    );

    const rawRevenueByOrder = new Map<string, number>();

    items.forEach((item) => {
      const quantity = Number(item.quantity || 0);

      const rawRevenue =
        Number(item.line_total_cents || 0) > 0
          ? Number(item.line_total_cents)
          : Number(item.unit_price_cents || 0) * quantity;

      rawRevenueByOrder.set(
        item.order_id,
        (rawRevenueByOrder.get(item.order_id) ?? 0) + rawRevenue
      );
    });

    items.forEach((item) => {
      if (!item.sku_id) return;

      const sku = skuMap.get(item.sku_id);
      const unitCost = getSkuCost(sku);

      const quantity = Number(item.quantity || 0);

      const rawItemRevenue =
        Number(item.line_total_cents || 0) > 0
          ? Number(item.line_total_cents)
          : Number(item.unit_price_cents || 0) * quantity;

      const orderRawRevenue = rawRevenueByOrder.get(item.order_id) ?? 0;
      const orderDiscount = discountByOrder.get(item.order_id) ?? 0;

      const itemDiscount =
        orderRawRevenue > 0
          ? Math.round((rawItemRevenue / orderRawRevenue) * orderDiscount)
          : 0;

      const itemRevenue = Math.max(0, rawItemRevenue - itemDiscount);

      const itemCost = unitCost * quantity;
      const itemProfit = itemRevenue - itemCost;
      const itemMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;
      const missingCost = hasMissingCost(sku);
      productRevenue += itemRevenue;
      cmv += itemCost;

      if (missingCost) missingCostItems += 1;
      if (!missingCost && itemMargin < 40) lowMarginItems += 1;

      const productId = sku?.product_id || "sem-produto";
      const productName = productNameMap.get(productId) || "Produto";

      const current =
        productMap.get(productId) ||
        ({
          product_id: productId,
          name: productName,
          qty: 0,
          revenue_cents: 0,
          cost_cents: 0,
          profit_cents: 0,
          margin_percent: 0,
          missing_cost: false,
        } satisfies ProfitProduct);

      current.qty += item.quantity;
      current.revenue_cents += itemRevenue;
      current.cost_cents += itemCost;
      current.profit_cents = current.revenue_cents - current.cost_cents;
      current.margin_percent =
        current.revenue_cents > 0
          ? (current.profit_cents / current.revenue_cents) * 100
          : 0;
      current.missing_cost = current.missing_cost || missingCost;

      productMap.set(productId, current);
    });

    const grossProfit = productRevenue - cmv;
    const marginPercent =
      productRevenue > 0 ? (grossProfit / productRevenue) * 100 : 0;
    const markupPercent = cmv > 0 ? (grossProfit / cmv) * 100 : 0;

    setProfitMetrics({
      productRevenue,
      cmv,
      grossProfit,
      marginPercent,
      markupPercent,
      missingCostItems,
      lowMarginItems,
    });

    setProfitProducts(
      Array.from(productMap.values()).sort(
        (a, b) => b.profit_cents - a.profit_cents
      )
    );
  }

  const weeklyTotal = useMemo(() => {
    return weeklySales.reduce((acc, item) => acc + item.total, 0);
  }, [weeklySales]);

  const topProfitProducts = useMemo(() => {
    return profitProducts.slice(0, 5);
  }, [profitProducts]);

  const lowMarginProducts = useMemo(() => {
    return profitProducts
      .filter((item) => item.missing_cost || item.margin_percent < 40)
      .sort((a, b) => a.margin_percent - b.margin_percent)
      .slice(0, 5);
  }, [profitProducts]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#b08d57]">Indicadores</p>

        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#2b554e]">
              Estatísticas
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Acompanhe vendas, clientes, estoque, lucro bruto e rentabilidade.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-3 text-zinc-400">
              <Search size={18} />
              <input
                className="w-56 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                placeholder="Buscar no painel"
              />
            </div>

            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e9e2d6] bg-[#FCFAF6] text-zinc-500">
              <Bell size={18} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Data inicial
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 text-sm font-medium text-zinc-600 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Data final
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 text-sm font-medium text-zinc-600 outline-none"
              />
            </div>

            <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 text-sm font-medium text-zinc-600">
              <CalendarDays size={16} />
              {getPeriodLabel()}
            </div>

            {startDate || endDate ? (
              <button
                type="button"
                onClick={clearDateFilter}
                className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Limpar filtro
              </button>
            ) : null}
          </div>

          <button
            onClick={() => navigate("/admin/vendas")}
            className="h-11 rounded-2xl bg-[#2b554e] px-4 text-sm font-semibold text-white hover:bg-[#244841]"
          >
            Ver vendas
          </button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-6 text-zinc-500 shadow-sm">
          Carregando estatísticas...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
          {error}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Vendas"
              value={moneyBRL(metrics.salesTotal)}
              subtitle={getPeriodLabel()}
              icon={<DollarSign size={20} />}
              iconBg="#54b27a"
              to="/admin/vendas"
            />

            <MetricCard
              title="Pedidos"
              value={metrics.orders}
              subtitle="Total cadastrado"
              icon={<ShoppingBag size={20} />}
              iconBg="#5c82db"
              to="/admin/vendas"
            />

            <MetricCard
              title="Clientes"
              value={metrics.newCustomers}
              subtitle="Novos em 30 dias"
              icon={<Users size={20} />}
              iconBg="#e19a55"
              to="/admin/clientes"
            />

            <MetricCard
              title="Estoque Crítico"
              value={`${metrics.criticalStock} SKUs`}
              subtitle="Saldo menor ou igual a 2"
              icon={<AlertTriangle size={20} />}
              iconBg="#dc6a5a"
              to="/admin/estoques"
            />
          </section>

          <section className="rounded-3xl border border-[#e9e2d6] bg-[#FCFAF6] p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-[#b08d57]">
                  Analytics Financeiro
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-[#2b554e]">
                  Lucro & Rentabilidade
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Indicadores calculados com pedidos pagos: {getPeriodLabel()}.
                </p>
              </div>

              <button
                onClick={() => navigate("/admin/produtos")}
                className="rounded-2xl border border-[#e9e2d6] bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Ajustar custos dos produtos
              </button>
            </div>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FinanceCard
                title="Receita de Produtos"
                value={moneyBRL(profitMetrics.productRevenue)}
                subtitle="Venda dos itens, sem considerar frete"
                icon={<Package size={20} />}
                tone="default"
              />

              <FinanceCard
                title="CMV"
                value={moneyBRL(profitMetrics.cmv)}
                subtitle="Custo das mercadorias vendidas"
                icon={<TrendingDown size={20} />}
                tone="warn"
              />

              <FinanceCard
                title="Lucro Bruto"
                value={moneyBRL(profitMetrics.grossProfit)}
                subtitle="Receita dos produtos menos CMV"
                icon={<TrendingUp size={20} />}
                tone={profitMetrics.grossProfit >= 0 ? "good" : "danger"}
              />

              <FinanceCard
                title="Margem Bruta"
                value={formatPercent(profitMetrics.marginPercent)}
                subtitle="Lucro sobre preço de venda"
                icon={<Percent size={20} />}
                tone={profitMetrics.marginPercent >= 40 ? "good" : "warn"}
              />
            </section>

            <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <FinanceCard
                title="Markup"
                value={formatPercent(profitMetrics.markupPercent)}
                subtitle="Lucro sobre custo"
                icon={<BarChart3 size={20} />}
                tone="default"
              />

              <FinanceCard
                title="Sem Custo"
                value={profitMetrics.missingCostItems}
                subtitle="Itens vendidos sem custo cadastrado"
                icon={<AlertTriangle size={20} />}
                tone={profitMetrics.missingCostItems > 0 ? "danger" : "good"}
              />

              <FinanceCard
                title="Margem Baixa"
                value={profitMetrics.lowMarginItems}
                subtitle="Itens vendidos com margem menor que 40%"
                icon={<AlertTriangle size={20} />}
                tone={profitMetrics.lowMarginItems > 0 ? "warn" : "good"}
              />
            </section>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_0.95fr]">
            <SectionCard title="Pedidos Recentes" actionPath="/admin/vendas">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 pr-4 font-medium">Pedido</th>
                      <th className="pb-3 pr-4 font-medium">Cliente</th>
                      <th className="pb-3 pr-4 font-medium">Data</th>
                      <th className="pb-3 pr-4 font-medium">Total</th>
                      <th className="pb-3 pr-0 font-medium">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map((order) => {
                      const meta = statusMeta(order.status);

                      return (
                        <tr
                          key={order.id}
                          className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50"
                          onClick={() => navigate("/admin/vendas")}
                        >
                          <td className="py-4 pr-4 font-semibold text-slate-700">
                            {shortOrderId(order.id)}
                          </td>

                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                                {initials(order.customer_name)}
                              </div>

                              <span className="font-medium text-slate-700">
                                {order.customer_name}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 pr-4 text-slate-600">
                            {formatDateBR(order.created_at)}
                          </td>

                          <td className="py-4 pr-4 font-medium text-slate-700">
                            {moneyBRL(order.total_cents)}
                          </td>

                          <td className="py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {recentOrders.length === 0 ? (
                  <div className="py-4 text-sm text-slate-500">
                    Nenhum pedido encontrado.
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <div className="grid gap-6">
              <SectionCard title="Vendas por Dia da Semana" actionPath="/admin/vendas">
                <div className="mb-3 flex items-start justify-between">
                  <div className="text-4xl font-semibold text-slate-800">
                    {moneyBRL(weeklyTotal)}
                  </div>
                </div>

                <MiniLineChart data={weeklySales} />
              </SectionCard>

              <SectionCard title="Mais Vendidos" actionPath="/admin/produtos">
                <div className="space-y-4">
                  {bestSellers.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition hover:bg-slate-50"
                      onClick={() => navigate("/admin/produtos")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-lg">
                          ✨
                        </div>

                        <div>
                          <div className="font-semibold text-slate-700">
                            {item.name}
                          </div>

                          <div className="text-sm font-medium text-emerald-600">
                            {item.qty} vendas
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">top</div>
                    </div>
                  ))}

                  {bestSellers.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Sem dados de venda.
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_0.95fr]">
            <SectionCard title="Rentabilidade por Produto" actionPath="/admin/produtos">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 pr-4 font-medium">Produto</th>
                      <th className="pb-3 pr-4 font-medium">Qtd</th>
                      <th className="pb-3 pr-4 font-medium">Receita</th>
                      <th className="pb-3 pr-4 font-medium">CMV</th>
                      <th className="pb-3 pr-4 font-medium">Lucro</th>
                      <th className="pb-3 pr-0 font-medium">Margem</th>
                    </tr>
                  </thead>

                  <tbody>
                    {profitProducts.map((item) => (
                      <tr
                        key={item.product_id}
                        className="border-b last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="py-4 pr-4 font-semibold text-slate-700">
                          {item.name}
                        </td>

                        <td className="py-4 pr-4 text-slate-600">
                          {item.qty}
                        </td>

                        <td className="py-4 pr-4 text-slate-700">
                          {moneyBRL(item.revenue_cents)}
                        </td>

                        <td className="py-4 pr-4 text-slate-700">
                          {moneyBRL(item.cost_cents)}
                        </td>

                        <td
                          className={`py-4 pr-4 font-semibold ${item.profit_cents >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                            }`}
                        >
                          {moneyBRL(item.profit_cents)}
                        </td>

                        <td className="py-4 pr-0">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.missing_cost
                              ? "bg-rose-100 text-rose-700"
                              : item.margin_percent < 40
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                              }`}
                          >
                            {item.missing_cost
                              ? "Sem custo"
                              : formatPercent(item.margin_percent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {profitProducts.length === 0 ? (
                  <div className="py-4 text-sm text-slate-500">
                    Sem dados de lucro para o período.
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <div className="grid gap-6">
              <SectionCard title="Top Lucro" actionPath="/admin/produtos">
                <div className="space-y-3">
                  {topProfitProducts.map((item, idx) => (
                    <div
                      key={item.product_id}
                      className="rounded-xl border bg-[#FCFAF6] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-700">
                            {idx + 1}. {item.name}
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            {item.qty} unidades vendidas
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-emerald-700">
                          {moneyBRL(item.profit_cents)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {topProfitProducts.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Sem dados de lucro.
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard title="Alertas de Margem" actionPath="/admin/produtos">
                <div className="space-y-3">
                  {lowMarginProducts.map((item) => (
                    <div
                      key={item.product_id}
                      className="rounded-xl border border-amber-100 bg-amber-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-700">
                            {item.name}
                          </div>

                          <div className="mt-1 text-sm text-zinc-600">
                            {item.missing_cost
                              ? "Produto vendido sem custo cadastrado"
                              : `Margem: ${formatPercent(item.margin_percent)}`}
                          </div>
                        </div>

                        <AlertTriangle
                          size={18}
                          className={
                            item.missing_cost
                              ? "text-rose-600"
                              : "text-amber-600"
                          }
                        />
                      </div>
                    </div>
                  ))}

                  {lowMarginProducts.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Nenhum alerta encontrado.
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_0.95fr]">
            <SectionCard title="Clientes Recentes" actionPath="/admin/clientes">
              <div className="space-y-3">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border p-4 transition hover:bg-slate-50"
                    onClick={() => navigate("/admin/clientes")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                        {initials(customer.name)}
                      </div>

                      <div>
                        <div className="font-semibold text-slate-700">
                          {customer.name}
                        </div>

                        <div className="text-sm text-slate-500">
                          {customer.email || "Sem e-mail"}
                        </div>
                      </div>
                    </div>

                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  </div>
                ))}

                {recentCustomers.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    Nenhum cliente encontrado.
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <div />
          </section>
        </>
      )}
    </div>
  );
}
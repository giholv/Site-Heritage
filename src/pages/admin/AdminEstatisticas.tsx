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
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Metrics = {
  salesTotal: number;
  orders: number;
  newCustomers: number;
  criticalStock: number;
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

type StockMovement = {
  sku_id: string;
  type: "in" | "out" | "adjust" | "reserve" | "unreserve";
  quantity: number;
};

type SkuRow = {
  id: string;
  product_id: string;
};

type ProductRow = {
  id: string;
  name: string;
};

function moneyBRL(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

  if (s === "paid") {
    return { label: "Pago", className: "bg-emerald-100 text-emerald-700" };
  }

  if (s === "pending_payment" || s === "pending") {
    return { label: "Pendente", className: "bg-amber-100 text-amber-700" };
  }

  if (s === "canceled" || s === "cancelled") {
    return { label: "Cancelado", className: "bg-rose-100 text-rose-700" };
  }

  if (s === "processing") {
    return { label: "Processando", className: "bg-sky-100 text-sky-700" };
  }

  if (s === "shipped") {
    return { label: "Enviado", className: "bg-violet-100 text-violet-700" };
  }

  if (s === "delivered") {
    return { label: "Entregue", className: "bg-emerald-100 text-emerald-700" };
  }

  if (s === "refunded") {
    return { label: "Reembolsado", className: "bg-slate-100 text-slate-700" };
  }

  if (s === "draft") {
    return { label: "Rascunho", className: "bg-gray-100 text-gray-700" };
  }

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

  const areaPath = `${path} L ${points[points.length - 1]?.x ?? padding} ${
    height - padding
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const today = new Date();

      const last7Days = new Date();
      last7Days.setDate(today.getDate() - 6);

      const last30Days = new Date();
      last30Days.setDate(today.getDate() - 30);

      const start7 = last7Days.toISOString();
      const start30 = last30Days.toISOString();

      const [
        ordersResult,
        customersResult,
        paidOrdersResult,
        recentOrdersResult,
        recentCustomersResult,
        stockMovementsResult,
        orderItemsResult,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),

        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .gte("created_at", start30),

        supabase
          .from("orders")
          .select("id, total_cents, created_at, status")
          .eq("status", "paid")
          .gte("created_at", start7),

        supabase
          .from("orders")
          .select(
            "id, customer_id, external_customer_name, created_at, total_cents, status"
          )
          .order("created_at", { ascending: false })
          .limit(5),

        supabase
          .from("customers")
          .select("id, full_name, email")
          .order("created_at", { ascending: false })
          .limit(3),

        supabase
          .from("stock_movements")
          .select("sku_id, type, quantity"),

        supabase
          .from("order_items")
          .select("sku_id, quantity")
          .not("sku_id", "is", null),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (customersResult.error) throw customersResult.error;
      if (paidOrdersResult.error) throw paidOrdersResult.error;
      if (recentOrdersResult.error) throw recentOrdersResult.error;
      if (recentCustomersResult.error) throw recentCustomersResult.error;
      if (stockMovementsResult.error) throw stockMovementsResult.error;
      if (orderItemsResult.error) throw orderItemsResult.error;

      const salesTotal =
        paidOrdersResult.data?.reduce(
          (acc, item) => acc + (item.total_cents ?? 0),
          0
        ) ?? 0;

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

      (paidOrdersResult.data ?? []).forEach((order) => {
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

      const qtyBySku = new Map<string, number>();

      (orderItemsResult.data ?? []).forEach((item) => {
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

      const skuRows = (skusData ?? []) as SkuRow[];

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

      const productRows = (productsData ?? []) as ProductRow[];

      const skuToProduct = new Map(
        skuRows.map((sku) => [sku.id, sku.product_id])
      );

      const productNameMap = new Map(
        productRows.map((product) => [product.id, product.name])
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
    } catch (err: any) {
      console.error("Erro ao carregar estatísticas:", err);
      setError(err?.message || "Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  }

  const weeklyTotal = useMemo(() => {
    return weeklySales.reduce((acc, item) => acc + item.total, 0);
  }, [weeklySales]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#b08d57]">
          Indicadores
        </p>

        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#2b554e]">
              Estatísticas
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Acompanhe vendas, clientes, estoque e produtos mais vendidos.
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 text-sm font-medium text-zinc-600">
            <CalendarDays size={16} />
            Últimos 7 dias
          </button>

          <button
            onClick={() => navigate("/admin/vendas")}
            className="rounded-2xl bg-[#2b554e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244841]"
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
              subtitle="Últimos 7 dias"
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
              <SectionCard title="Vendas da Semana" actionPath="/admin/vendas">
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
import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCcw, Users, UserPlus, ShoppingBag } from "lucide-react";
import { supabase } from "../../lib/supabase";

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  document: string | null;
  created_at: string;
};

type OrderRow = {
  customer_id: string | null;
  total_cents: number;
  status: string;
  created_at: string;
};

type CustomerListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
  created_at: string;
  orders_count: number;
  total_spent_cents: number;
  last_order_at: string | null;
};

type Metrics = {
  totalCustomers: number;
  newCustomers30d: number;
  customersWithOrders: number;
  totalPaidRevenueCents: number;
};

function moneyBRL(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
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

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [metrics, setMetrics] = useState<Metrics>({
    totalCustomers: 0,
    newCustomers30d: 0,
    customersWithOrders: 0,
    totalPaidRevenueCents: 0,
  });

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const today = new Date();
      const last30Days = new Date();
      last30Days.setDate(today.getDate() - 30);
      const start30 = last30Days.toISOString();

      const [
        { data: customersData, error: customersError, count: totalCustomersCount },
        { data: ordersData, error: ordersError },
        { count: newCustomersCount, error: newCustomersError },
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, email, phone, document, created_at", { count: "exact" })
          .order("created_at", { ascending: false }),

        supabase
          .from("orders")
          .select("customer_id, total_cents, status, created_at")
          .not("customer_id", "is", null),

        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .gte("created_at", start30),
      ]);

      if (customersError) throw customersError;
      if (ordersError) throw ordersError;
      if (newCustomersError) throw newCustomersError;

      const ordersByCustomer = new Map<
        string,
        { orders_count: number; total_spent_cents: number; last_order_at: string | null }
      >();

      (ordersData as OrderRow[]).forEach((order) => {
        if (!order.customer_id) return;

        const current = ordersByCustomer.get(order.customer_id) ?? {
          orders_count: 0,
          total_spent_cents: 0,
          last_order_at: null,
        };

        current.orders_count += 1;

        if (["paid", "processing", "shipped", "delivered"].includes(order.status)) {
          current.total_spent_cents += order.total_cents ?? 0;
        }

        if (!current.last_order_at || new Date(order.created_at) > new Date(current.last_order_at)) {
          current.last_order_at = order.created_at;
        }

        ordersByCustomer.set(order.customer_id, current);
      });

      const normalized: CustomerListItem[] = (customersData as CustomerRow[]).map((customer) => {
        const stats = ordersByCustomer.get(customer.id);

        return {
          id: customer.id,
          name: customer.full_name || customer.email || "Sem nome",
          email: customer.email,
          phone: customer.phone,
          document: customer.document,
          created_at: customer.created_at,
          orders_count: stats?.orders_count ?? 0,
          total_spent_cents: stats?.total_spent_cents ?? 0,
          last_order_at: stats?.last_order_at ?? null,
        };
      });

      setCustomers(normalized);

      setMetrics({
        totalCustomers: totalCustomersCount ?? normalized.length,
        newCustomers30d: newCustomersCount ?? 0,
        customersWithOrders: normalized.filter((c) => c.orders_count > 0).length,
        totalPaidRevenueCents: normalized.reduce((acc, c) => acc + c.total_spent_cents, 0),
      });
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone ?? "", customer.document ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customers, query]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-800">Clientes</h1>
              <p className="mt-1 text-sm text-slate-500">Gestão da base de clientes</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-slate-400 shadow-sm">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-64 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Buscar nome, e-mail, telefone..."
                />
              </div>

              <button
                onClick={loadCustomers}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <RefreshCcw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-slate-500">Carregando clientes...</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Total de clientes" value={metrics.totalCustomers} subtitle="Base cadastrada" icon={<Users size={20} />} />
              <MetricCard title="Clientes novos" value={metrics.newCustomers30d} subtitle="Últimos 30 dias" icon={<UserPlus size={20} />} />
              <MetricCard title="Clientes com pedidos" value={metrics.customersWithOrders} subtitle="Já compraram" icon={<ShoppingBag size={20} />} />
              <MetricCard title="Receita da base" value={moneyBRL(metrics.totalPaidRevenueCents)} subtitle="Pedidos pagos/processando" icon={<Users size={20} />} />
            </div>

            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-xl font-semibold text-slate-800">Lista de clientes</h2>
                <p className="mt-1 text-sm text-slate-500">{filteredCustomers.length} cliente(s)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="px-5 py-4 font-medium">Cliente</th>
                      <th className="px-5 py-4 font-medium">Contato</th>
                      <th className="px-5 py-4 font-medium">Documento</th>
                      <th className="px-5 py-4 font-medium">Cadastro</th>
                      <th className="px-5 py-4 font-medium">Pedidos</th>
                      <th className="px-5 py-4 font-medium">Total gasto</th>
                      <th className="px-5 py-4 font-medium">Último pedido</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b last:border-b-0">
                        <td className="px-5 py-4 font-medium text-slate-800">{customer.name}</td>
                        <td className="px-5 py-4 text-slate-600">
                          <div>{customer.email}</div>
                          <div>{customer.phone || "-"}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{customer.document || "-"}</td>
                        <td className="px-5 py-4 text-slate-600">{formatDateBR(customer.created_at)}</td>
                        <td className="px-5 py-4 text-slate-700">{customer.orders_count}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">{moneyBRL(customer.total_spent_cents)}</td>
                        <td className="px-5 py-4 text-slate-600">{formatDateBR(customer.last_order_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredCustomers.length === 0 && (
                  <div className="px-5 py-6 text-sm text-slate-500">Nenhum cliente encontrado.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
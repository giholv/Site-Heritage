import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCcw, ShoppingBag } from "lucide-react";
import { supabase } from "../../lib/supabase";

type OrderRow = {
  id: string;
  customer_id: string | null;
  external_customer_name: string | null;
  status: string;
  total_cents: number;
  created_at: string;
  sales_channel: string | null;
  payment_method: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string;
};

type OrderItem = {
  id: string;
  customer_name: string;
  status: string;
  total_cents: number;
  created_at: string;
  sales_channel: string | null;
  payment_method: string | null;
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

function statusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending_payment") return "Pendente";
  if (s === "paid") return "Pago";
  if (s === "processing") return "Processando";
  if (s === "shipped") return "Enviado";
  if (s === "delivered") return "Entregue";
  if (s === "canceled") return "Cancelado";
  if (s === "refunded") return "Reembolsado";
  return status || "-";
}

function statusClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "delivered") return "bg-emerald-100 text-emerald-700";
  if (s === "pending_payment") return "bg-amber-100 text-amber-700";
  if (s === "processing" || s === "shipped") return "bg-sky-100 text-sky-700";
  if (s === "canceled" || s === "refunded") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, customer_id, external_customer_name, status, total_cents, created_at, sales_channel, payment_method")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const customerIds = Array.from(
        new Set((ordersData ?? []).map((o) => o.customer_id).filter(Boolean))
      ) as string[];

      let customerMap = new Map<string, string>();

      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("id, full_name, email")
          .in("id", customerIds);

        if (customersError) throw customersError;

        customerMap = new Map(
          (customersData as CustomerRow[]).map((c) => [
            c.id,
            c.full_name || c.email || "Cliente",
          ])
        );
      }

      const normalized: OrderItem[] = (ordersData as OrderRow[]).map((order) => ({
        id: order.id,
        customer_name:
          order.external_customer_name ||
          (order.customer_id ? customerMap.get(order.customer_id) : null) ||
          "Cliente",
        status: order.status,
        total_cents: order.total_cents ?? 0,
        created_at: order.created_at,
        sales_channel: order.sales_channel,
        payment_method: order.payment_method,
      }));

      setOrders(normalized);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.customer_name.toLowerCase().includes(q) ||
        (order.sales_channel || "").toLowerCase().includes(q) ||
        (order.payment_method || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-800">
                Pedidos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Gestão de pedidos da loja
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-slate-400 shadow-sm">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-64 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Buscar pedido, cliente, canal..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border bg-white px-4 text-sm text-slate-700 shadow-sm outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="pending_payment">Pendente</option>
                <option value="paid">Pago</option>
                <option value="processing">Processando</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregue</option>
                <option value="canceled">Cancelado</option>
                <option value="refunded">Reembolsado</option>
              </select>

              <button
                onClick={loadOrders}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <RefreshCcw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-slate-500">
            Carregando pedidos...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {error}
          </div>
        ) : (
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Lista de pedidos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredOrders.length} pedido(s)
                </p>
              </div>

              <div className="flex items-center gap-2 text-slate-500">
                <ShoppingBag size={18} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">Pedido</th>
                    <th className="px-5 py-4 font-medium">Cliente</th>
                    <th className="px-5 py-4 font-medium">Data</th>
                    <th className="px-5 py-4 font-medium">Canal</th>
                    <th className="px-5 py-4 font-medium">Pagamento</th>
                    <th className="px-5 py-4 font-medium">Total</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <td className="px-5 py-4 font-medium text-slate-700">
                        #{order.id.slice(0, 6)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{order.customer_name}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDateBR(order.created_at)}</td>
                      <td className="px-5 py-4 text-slate-600">{order.sales_channel || "-"}</td>
                      <td className="px-5 py-4 text-slate-600">{order.payment_method || "-"}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {moneyBRL(order.total_cents)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="px-5 py-6 text-sm text-slate-500">
                  Nenhum pedido encontrado.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
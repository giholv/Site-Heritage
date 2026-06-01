import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  ShoppingBag,
  Truck,
  ShoppingCart,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type SalesSection = "orders" | "abandoned" | "labels";

type OrderRow = {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  external_customer_name: string | null;
  status: string;
  payment_status: string | null;
  total_cents: number;
  created_at: string;
  origin: string | null;
  sales_channel: string | null;
  payment_method: string | null;
  shipping_label_generated: boolean | null;
  tracking_code: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string;
};

type OrderItem = {
  id: string;
  order_number: string | null;
  customer_name: string;
  status: string;
  payment_status: string | null;
  total_cents: number;
  created_at: string;
  origin: string | null;
  sales_channel: string | null;
  payment_method: string | null;
  shipping_label_generated: boolean;
  tracking_code: string | null;
};

const salesNavigation: {
  id: SalesSection;
  label: string;
  icon: React.ElementType;
  title: string;
  description: string;
}[] = [
    {
      id: "orders",
      label: "Pedidos",
      icon: ShoppingBag,
      title: "Pedidos",
      description: "Pedidos pagos e vendas em andamento.",
    },
    {
      id: "abandoned",
      label: "Carrinhos abandonados",
      icon: ShoppingCart,
      title: "Carrinhos abandonados",
      description: "Clientes que iniciaram a compra e não finalizaram o pagamento.",
    },
    {
      id: "labels",
      label: "Etiquetas de frete",
      icon: Truck,
      title: "Etiquetas de frete",
      description: "Pedidos pagos aguardando geração de etiqueta ou envio.",
    },
  ];

function moneyBRL(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusLabel(status: string, paymentStatus?: string | null) {
  const s = (status || "").toLowerCase();
  const p = (paymentStatus || "").toLowerCase();

  if (p === "paid" || s === "paid") return "Pago";
  if (s === "processing") return "Processando";
  if (s === "shipped") return "Enviado";
  if (s === "delivered") return "Entregue";
  if (s === "pending_payment") return "Pendente";
  if (s === "abandoned") return "Abandonado";
  if (p === "failed") return "Falhou";
  if (p === "expired") return "Expirado";
  if (s === "canceled") return "Cancelado";
  if (s === "refunded") return "Reembolsado";

  return status || "-";
}

function statusClass(status: string, paymentStatus?: string | null) {
  const s = (status || "").toLowerCase();
  const p = (paymentStatus || "").toLowerCase();

  if (p === "paid" || s === "paid" || s === "delivered") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (s === "processing" || s === "shipped") {
    return "bg-sky-100 text-sky-700";
  }

  if (s === "pending_payment" || p === "pending" || p === "pending_payment") {
    return "bg-amber-100 text-amber-700";
  }

  if (
    s === "abandoned" ||
    s === "canceled" ||
    s === "refunded" ||
    p === "failed" ||
    p === "expired"
  ) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function paymentLabel(paymentMethod?: string | null) {
  const method = (paymentMethod || "").toLowerCase();

  if (!method) return "-";
  if (method === "pix") return "Pix";
  if (method === "credit_card") return "Cartão";
  if (method === "boleto") return "Boleto";

  return paymentMethod || "-";
}

function channelLabel(channel?: string | null) {
  if (!channel) return "-";

  const value = channel.toLowerCase();

  if (value === "site") return "Site";
  if (value === "whatsapp") return "WhatsApp";
  if (value === "admin") return "Admin";

  return channel;
}

function isPaidOrder(order: OrderItem) {
  const s = (order.status || "").toLowerCase();
  const p = (order.payment_status || "").toLowerCase();

  return (
    p === "paid" ||
    s === "paid" ||
    s === "processing" ||
    s === "shipped" ||
    s === "delivered"
  );
}

function isAbandonedCart(order: OrderItem) {
  const s = (order.status || "").toLowerCase();
  const p = (order.payment_status || "").toLowerCase();

  // Se está pago, nunca pode aparecer como abandonado
  if (p === "paid" || s === "paid") {
    return false;
  }

  return (
    s === "abandoned" ||
    s === "pending_payment" ||
    p === "pending" ||
    p === "pending_payment" ||
    p === "failed" ||
    p === "expired"
  );
}

function isShippingLabelOrder(order: OrderItem) {
  const s = (order.status || "").toLowerCase();
  const p = (order.payment_status || "").toLowerCase();
  const channel = (order.origin || "").toLowerCase();

  // Venda externa já é entregue por padrão, então não entra em etiquetas
  if (channel === "external") {
    return false;
  }

  return (
    (p === "paid" || s === "paid" || s === "processing") &&
    s !== "shipped" &&
    s !== "delivered" &&
    s !== "canceled" &&
    s !== "refunded"
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeSection, setActiveSection] = useState<SalesSection>("orders");
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
        .select(
          "id, order_number, customer_id, external_customer_name, status, payment_status, total_cents, created_at, origin, sales_channel, payment_method, shipping_label_generated, tracking_code"
        )

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
          (customersData as CustomerRow[]).map((customer) => [
            customer.id,
            customer.full_name || customer.email || "Cliente",
          ])
        );
      }

      const normalized: OrderItem[] = (ordersData as OrderRow[]).map(
        (order) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name:
            order.external_customer_name ||
            (order.customer_id ? customerMap.get(order.customer_id) : null) ||
            "Cliente",
          status: order.status,
          payment_status: order.payment_status,
          total_cents: order.total_cents ?? 0,
          created_at: order.created_at,
          origin: order.origin,
          sales_channel: order.sales_channel,
          payment_method: order.payment_method,
          shipping_label_generated: Boolean(order.shipping_label_generated),
          tracking_code: order.tracking_code,
        })
      );

      setOrders(normalized);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar vendas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateShippingInfo(
    orderId: string,
    payload: {
      shipping_label_generated?: boolean;
      tracking_code?: string | null;
    }
  ) {
    try {
      setError("");

      const { error: updateError } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", orderId);

      if (updateError) throw updateError;

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
              ...order,
              ...payload,
              tracking_code:
                payload.tracking_code !== undefined
                  ? payload.tracking_code
                  : order.tracking_code,
              shipping_label_generated:
                payload.shipping_label_generated !== undefined
                  ? payload.shipping_label_generated
                  : order.shipping_label_generated,
            }
            : order
        )
      );
    } catch (err: any) {
      setError(err?.message || "Erro ao atualizar informações da etiqueta.");
    }
  }

  const counters = useMemo(() => {
    return {
      orders: orders.filter(isPaidOrder).length,
      abandoned: orders.filter(isAbandonedCart).length,
      labels: orders.filter(isShippingLabelOrder).length,
    };
  }, [orders]);

  const sectionOrders = useMemo(() => {
    if (activeSection === "orders") return orders.filter(isPaidOrder);
    if (activeSection === "abandoned") return orders.filter(isAbandonedCart);
    if (activeSection === "labels") return orders.filter(isShippingLabelOrder);

    return orders;
  }, [orders, activeSection]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return sectionOrders.filter((order) => {
      const matchesQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        (order.order_number || "").toLowerCase().includes(q) ||
        order.customer_name.toLowerCase().includes(q) ||
        (order.sales_channel || "").toLowerCase().includes(q) ||
        (order.payment_method || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter ||
        order.payment_status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [sectionOrders, query, statusFilter]);

  const activeData = salesNavigation.find((item) => item.id === activeSection);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-5 md:px-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Vendas
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-800 md:text-3xl">
                {activeData?.title}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {activeData?.description}
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-[#f1f3f2] p-1">
                {salesNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.id);
                        setStatusFilter("all");
                        setQuery("");
                      }}
                      className={[
                        "flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition",
                        isActive
                          ? "bg-white font-semibold text-[#1f3f3a] shadow-sm"
                          : "font-medium text-slate-500 hover:bg-white/70 hover:text-slate-800",
                      ].join(" ")}
                    >
                      <Icon size={17} strokeWidth={1.8} />

                      <span>{item.label}</span>

                      <span
                        className={[
                          "ml-1 rounded-full px-2 py-0.5 text-xs",
                          isActive
                            ? "bg-slate-100 text-slate-600"
                            : "bg-white/70 text-slate-400",
                        ].join(" ")}
                      >
                        {counters[item.id]}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm">
                  <Search size={18} />

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:w-72"
                    placeholder="Buscar pedido, cliente, canal..."
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none"
                >
                  <option value="all">Todos os status</option>
                  <option value="pending_payment">Pendente</option>
                  <option value="paid">Pago</option>
                  <option value="processing">Processando</option>
                  <option value="shipped">Enviado</option>
                  <option value="delivered">Entregue</option>
                  <option value="canceled">Cancelado</option>
                  <option value="refunded">Reembolsado</option>
                  <option value="abandoned">Abandonado</option>
                  <option value="failed">Falhou</option>
                  <option value="expired">Expirado</option>
                </select>

                <button
                  type="button"
                  onClick={loadOrders}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <RefreshCcw size={16} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Carregando vendas...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Lista de {activeData?.label.toLowerCase()}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredOrders.length} registro(s)
                </p>
              </div>

              <ShoppingBag size={18} className="text-slate-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">Pedido</th>
                    <th className="px-5 py-4 font-medium">Cliente</th>
                    <th className="px-5 py-4 font-medium">Data</th>
                    <th className="px-5 py-4 font-medium">Canal</th>
                    <th className="px-5 py-4 font-medium">Pagamento</th>
                    <th className="px-5 py-4 font-medium">Total</th>
                    <th className="px-5 py-4 font-medium">Status</th>

                    {activeSection === "labels" && (
                      <>
                        <th className="px-5 py-4 font-medium">Etiqueta</th>
                        <th className="px-5 py-4 font-medium">Rastreio</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                        {order.order_number
                          ? order.order_number
                          : `#${order.id.slice(0, 6)}`}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {order.customer_name}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDateBR(order.created_at)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {channelLabel(order.sales_channel)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {paymentLabel(order.payment_method)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                        {moneyBRL(order.total_cents)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            order.status,
                            order.payment_status
                          )}`}
                        >
                          {statusLabel(order.status, order.payment_status)}
                        </span>
                      </td>
                      {activeSection === "labels" && (
                        <>
                          <td className="px-5 py-4">
                            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                              <input
                                type="checkbox"
                                checked={order.shipping_label_generated}
                                onChange={(e) =>
                                  updateShippingInfo(order.id, {
                                    shipping_label_generated: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#2b554e] focus:ring-[#2b554e]"
                              />
                              Gerada
                            </label>
                          </td>

                          <td className="px-5 py-4">
                            <input
                              value={order.tracking_code || ""}
                              onChange={(e) =>
                                setOrders((current) =>
                                  current.map((item) =>
                                    item.id === order.id
                                      ? { ...item, tracking_code: e.target.value }
                                      : item
                                  )
                                )
                              }
                              onBlur={(e) =>
                                updateShippingInfo(order.id, {
                                  tracking_code: e.target.value.trim() || null,
                                })
                              }
                              placeholder="Código de rastreio"
                              className="h-10 w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2b554e]"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="px-5 py-8 text-sm text-slate-500">
                  Nenhum registro encontrado nesta subnavegação.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
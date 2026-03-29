import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search, X, Package, Truck, CheckCircle2, CreditCard, Wrench, Ban } from "lucide-react";
import { supabase } from "../../lib/supabase";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  order_status: string;
  payment_status: string;
  service_order_status: string;
  fulfillment_status: string;
  shipping_status: string;
  payment_method: string | null;
  total_cents: number | null;
  origin: string | null;
  sales_channel: string | null;
  seller_name: string | null;
  external_customer_name: string | null;
  external_customer_phone: string | null;
  tracking_code: string | null;
  carrier: string | null;
  customer_id: string | null;
  customer_name: string | null;
};

type KanbanColumnKey =
  | "pending_payment"
  | "paid"
  | "picking"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#FCFAF6",
  line: "#e9e2d6",
  soft: "#f6f3ee",
};

const COLUMNS: { key: KanbanColumnKey; title: string }[] = [
  { key: "pending_payment", title: "Pagamento pendente" },
  { key: "paid", title: "Pago" },
  { key: "picking", title: "Separando" },
  { key: "packed", title: "Embalado" },
  { key: "shipped", title: "Enviado" },
  { key: "delivered", title: "Entregue" },
  { key: "cancelled", title: "Cancelado" },
];

function moneyBRL(v?: number | null) {
  return ((v ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function resolveKanbanColumn(order: OrderRow): KanbanColumnKey {
  if (order.order_status === "cancelled") return "cancelled";
  if (order.payment_status === "cancelled") return "cancelled";
  if (order.fulfillment_status === "cancelled") return "cancelled";

  if (order.fulfillment_status === "delivered") return "delivered";
  if (order.fulfillment_status === "shipped") return "shipped";
  if (order.fulfillment_status === "packed" || order.fulfillment_status === "ready_to_ship") return "packed";
  if (order.fulfillment_status === "picking") return "picking";

  if (order.order_status === "pending_payment" || order.payment_status === "pending" || order.payment_status === "authorized") {
    return "pending_payment";
  }

  return "paid";
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "yellow" | "red" | "blue";
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: "#f4f4f5",
      color: "#3f3f46",
    },
    green: {
      background: "#ecfdf3",
      color: "#027a48",
    },
    yellow: {
      background: "#fffaeb",
      color: "#b54708",
    },
    red: {
      background: "#fef3f2",
      color: "#b42318",
    },
    blue: {
      background: "#eff8ff",
      color: "#175cd3",
    },
  };

  return (
    <span
      style={{
        ...styles[tone],
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function statusTone(value?: string | null): "default" | "green" | "yellow" | "red" | "blue" {
  switch (value) {
    case "paid":
    case "done":
    case "delivered":
      return "green";
    case "pending":
    case "authorized":
    case "picking":
    case "packed":
    case "ready_to_ship":
    case "in_progress":
    case "awaiting_post":
    case "in_transit":
      return "yellow";
    case "cancelled":
    case "failed":
    case "chargeback":
    case "returned":
    case "lost":
    case "refunded":
      return "red";
    case "shipped":
    case "posted":
      return "blue";
    default:
      return "default";
  }
}

function ColumnHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        background: CALEA.bg,
        paddingBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <strong style={{ fontSize: 14, color: CALEA.primary }}>{title}</strong>
        <span
          style={{
            minWidth: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: "#fff",
            border: `1px solid ${CALEA.line}`,
            fontSize: 12,
            fontWeight: 700,
            color: "#3f3f46",
          }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onOpen,
}: {
  order: OrderRow;
  onOpen: (order: OrderRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      style={{
        width: "100%",
        textAlign: "left",
        background: "#fff",
        border: `1px solid ${CALEA.line}`,
        borderRadius: 18,
        padding: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong style={{ fontSize: 14, color: "#18181b" }}>
          #{shortId(order.id)}
        </strong>
        <span style={{ fontSize: 11, color: "#71717a" }}>
          {new Date(order.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <div style={{ marginTop: 8, fontWeight: 600, color: "#27272a" }}>
        {order.customer_name || "Cliente sem nome"}
      </div>

      <div style={{ marginTop: 6, fontSize: 14, color: "#3f3f46" }}>
        {moneyBRL(order.total_cents)}
      </div>

      <div style={{ marginTop: 4, fontSize: 12, color: "#71717a" }}>
        {order.payment_method || "Sem pagamento"} {order.sales_channel ? `• ${order.sales_channel}` : ""}
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Badge tone={statusTone(order.payment_status)}>Pagto: {order.payment_status}</Badge>
        <Badge tone={statusTone(order.service_order_status)}>O.S.: {order.service_order_status}</Badge>
        <Badge tone={statusTone(order.fulfillment_status)}>Pacote: {order.fulfillment_status}</Badge>
      </div>
    </button>
  );
}

function ActionButton({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 14,
        border: `1px solid ${CALEA.line}`,
        background: disabled ? "#f4f4f5" : "#fff",
        color: disabled ? "#a1a1aa" : "#18181b",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export default function AdminOrdersKanban() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("v_admin_orders_kanban")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as OrderRow[]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((o) => {
      const haystack = [
        o.id,
        o.customer_name,
        o.external_customer_name,
        o.external_customer_phone,
        o.payment_method,
        o.sales_channel,
        o.seller_name,
        o.tracking_code,
        o.carrier,
        o.order_status,
        o.payment_status,
        o.service_order_status,
        o.fulfillment_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [orders, search]);

  const grouped = useMemo(() => {
    const base: Record<KanbanColumnKey, OrderRow[]> = {
      pending_payment: [],
      paid: [],
      picking: [],
      packed: [],
      shipped: [],
      delivered: [],
      cancelled: [],
    };

    for (const order of filteredOrders) {
      const key = resolveKanbanColumn(order);
      base[key].push(order);
    }

    return base;
  }, [filteredOrders]);

  async function patchOrder(orderId: string, patch: Partial<OrderRow>) {
    try {
      setSaving(true);
      setErrorMsg(null);

      const { error } = await supabase
        .from("orders")
        .update(patch)
        .eq("id", orderId);

      if (error) throw error;

      await loadOrders();

      const refreshed = orders.find((o) => o.id === orderId) || null;
      if (refreshed) setSelected(refreshed);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Erro ao atualizar pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshSelected(orderId: string) {
    const { data, error } = await supabase
      .from("v_admin_orders_kanban")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!error && data) {
      setSelected(data as OrderRow);
      setOrders((prev) => prev.map((item) => (item.id === orderId ? (data as OrderRow) : item)));
    }
  }

  async function handleSetPaymentPaid() {
    if (!selected) return;
    await patchOrder(selected.id, { payment_status: "paid" });
    await refreshSelected(selected.id);
  }

  async function handleStartService() {
    if (!selected) return;
    await patchOrder(selected.id, { service_order_status: "in_progress" });
    await refreshSelected(selected.id);
  }

  async function handleFinishService() {
    if (!selected) return;
    await patchOrder(selected.id, { service_order_status: "done" });
    await refreshSelected(selected.id);
  }

  async function handleSetPicking() {
    if (!selected) return;
    await patchOrder(selected.id, { fulfillment_status: "picking" });
    await refreshSelected(selected.id);
  }

  async function handleSetPacked() {
    if (!selected) return;
    await patchOrder(selected.id, { fulfillment_status: "packed" });
    await refreshSelected(selected.id);
  }

  async function handleSetShipped() {
    if (!selected) return;
    await patchOrder(selected.id, {
      fulfillment_status: "shipped",
      shipping_status: "posted",
    });
    await refreshSelected(selected.id);
  }

  async function handleSetDelivered() {
    if (!selected) return;
    await patchOrder(selected.id, {
      fulfillment_status: "delivered",
      shipping_status: "delivered",
    });
    await refreshSelected(selected.id);
  }

  async function handleCancelOrder() {
    if (!selected) return;
    await patchOrder(selected.id, {
      payment_status: selected.payment_status === "paid" ? selected.payment_status : "cancelled",
      service_order_status:
        selected.service_order_status === "not_required" ? "not_required" : "cancelled",
      fulfillment_status: "cancelled",
      order_status: "cancelled",
    });
    await refreshSelected(selected.id);
  }

  const drawerOpen = !!selected;

  return (
    <div
      style={{
        minHeight: "100%",
        background: CALEA.bg,
        padding: 20,
      }}
    >
      <div
        style={{
          marginBottom: 18,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: CALEA.primary }}>Pedidos</h1>
          <p style={{ margin: "6px 0 0", color: "#71717a" }}>
            Operação por status em quadro kanban.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              minWidth: 280,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff",
              border: `1px solid ${CALEA.line}`,
              borderRadius: 14,
              padding: "0 12px",
            }}
          >
            <Search size={16} color="#71717a" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, id, status, rastreio..."
              style={{
                width: "100%",
                height: 42,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="button"
            onClick={loadOrders}
            style={{
              height: 42,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 14,
              border: `1px solid ${CALEA.line}`,
              background: "#fff",
              padding: "0 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div
          style={{
            marginBottom: 16,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 14,
            padding: 12,
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${CALEA.line}`,
            borderRadius: 18,
            padding: 20,
            color: "#71717a",
          }}
        >
          Carregando pedidos...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(260px, 1fr))",
            gap: 14,
            alignItems: "start",
            overflowX: "auto",
            paddingBottom: 10,
          }}
        >
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              style={{
                minWidth: 260,
                background: CALEA.soft,
                border: `1px solid ${CALEA.line}`,
                borderRadius: 20,
                padding: 12,
                maxHeight: "calc(100vh - 180px)",
                overflowY: "auto",
              }}
            >
              <ColumnHeader title={column.title} count={grouped[column.key].length} />

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {grouped[column.key].length === 0 ? (
                  <div
                    style={{
                      borderRadius: 14,
                      border: `1px dashed ${CALEA.line}`,
                      padding: 14,
                      color: "#71717a",
                      fontSize: 13,
                      background: "#fff",
                    }}
                  >
                    Sem pedidos nesta coluna.
                  </div>
                ) : (
                  grouped[column.key].map((order) => (
                    <OrderCard key={order.id} order={order} onOpen={setSelected} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {drawerOpen && selected ? (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.25)",
              zIndex: 40,
            }}
          />

          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 430,
              maxWidth: "100%",
              height: "100vh",
              background: "#fff",
              zIndex: 50,
              boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 20,
                borderBottom: `1px solid ${CALEA.line}`,
                display: "flex",
                alignItems: "start",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#71717a" }}>Pedido</div>
                <h2 style={{ margin: "4px 0 0", fontSize: 22, color: CALEA.primary }}>
                  #{shortId(selected.id)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <X />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              <div
                style={{
                  border: `1px solid ${CALEA.line}`,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Resumo</div>

                <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                  <div><strong>Cliente:</strong> {selected.customer_name || "-"}</div>
                  <div><strong>Valor:</strong> {moneyBRL(selected.total_cents)}</div>
                  <div><strong>Pagamento:</strong> {selected.payment_method || "-"}</div>
                  <div><strong>Canal:</strong> {selected.sales_channel || selected.origin || "-"}</div>
                  <div><strong>Vendedor:</strong> {selected.seller_name || "-"}</div>
                  <div><strong>Rastreio:</strong> {selected.tracking_code || "-"}</div>
                  <div><strong>Transportadora:</strong> {selected.carrier || "-"}</div>
                  <div><strong>Criado em:</strong> {formatDate(selected.created_at)}</div>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Badge tone={statusTone(selected.order_status)}>Pedido: {selected.order_status}</Badge>
                  <Badge tone={statusTone(selected.payment_status)}>Pagto: {selected.payment_status}</Badge>
                  <Badge tone={statusTone(selected.service_order_status)}>O.S.: {selected.service_order_status}</Badge>
                  <Badge tone={statusTone(selected.fulfillment_status)}>Pacote: {selected.fulfillment_status}</Badge>
                  <Badge tone={statusTone(selected.shipping_status)}>Envio: {selected.shipping_status}</Badge>
                </div>
              </div>

              <div
                style={{
                  border: `1px solid ${CALEA.line}`,
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Ações</div>

                <div style={{ display: "grid", gap: 10 }}>
                  <ActionButton
                    icon={<CreditCard size={16} />}
                    onClick={handleSetPaymentPaid}
                    disabled={saving || selected.payment_status === "paid"}
                  >
                    Marcar pagamento como pago
                  </ActionButton>

                  <ActionButton
                    icon={<Wrench size={16} />}
                    onClick={handleStartService}
                    disabled={saving || selected.service_order_status === "in_progress"}
                  >
                    Iniciar ordem de serviço
                  </ActionButton>

                  <ActionButton
                    icon={<CheckCircle2 size={16} />}
                    onClick={handleFinishService}
                    disabled={saving || selected.service_order_status === "done"}
                  >
                    Concluir ordem de serviço
                  </ActionButton>

                  <ActionButton
                    icon={<Package size={16} />}
                    onClick={handleSetPicking}
                    disabled={saving || selected.fulfillment_status === "picking"}
                  >
                    Marcar como separando
                  </ActionButton>

                  <ActionButton
                    icon={<Package size={16} />}
                    onClick={handleSetPacked}
                    disabled={saving || selected.fulfillment_status === "packed"}
                  >
                    Marcar como embalado
                  </ActionButton>

                  <ActionButton
                    icon={<Truck size={16} />}
                    onClick={handleSetShipped}
                    disabled={saving || selected.fulfillment_status === "shipped"}
                  >
                    Marcar como enviado
                  </ActionButton>

                  <ActionButton
                    icon={<CheckCircle2 size={16} />}
                    onClick={handleSetDelivered}
                    disabled={saving || selected.fulfillment_status === "delivered"}
                  >
                    Marcar como entregue
                  </ActionButton>

                  <ActionButton
                    icon={<Ban size={16} />}
                    onClick={handleCancelOrder}
                    disabled={saving || selected.order_status === "cancelled"}
                  >
                    Cancelar pedido
                  </ActionButton>
                </div>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Search,
  X,
  Package,
  Truck,
  CheckCircle2,
  CreditCard,
  Wrench,
  Ban,
  MapPin,
  ShoppingBag,
  ReceiptText,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type OrderItemRow = {
  id: string;
  sku_id: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;

  product_name: string;
  sku_code: string;
  variant_name: string;

  stock_location_code: string | null;
  stock_location_name: string | null;
  stock_movement_type: string | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;

  status?: string | null;
  order_status: string | null;
  payment_status: string | null;
  service_order_status: string | null;
  fulfillment_status: string | null;
  shipping_status: string | null;

  payment_method: string | null;

  subtotal_cents?: number | null;
  shipping_cents?: number | null;
  discount_cents?: number | null;
  gift_wrap_cents?: number | null;
  total_cents: number | null;
  coupon_code?: string | null;

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

function moneyBRL(value?: number | null) {
  return ((value ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function shortId(id: string) {
  return String(id || "").slice(0, 8).toUpperCase();
}

function normalizeOrderStatus(value?: string | null) {
  if (!value || value === "draft") return "pending_payment";
  if (value === "canceled") return "cancelled";
  return value;
}

function resolveKanbanColumn(order: OrderRow): KanbanColumnKey {
  const orderStatus = normalizeOrderStatus(order.order_status || order.status);
  const paymentStatus = order.payment_status;
  const fulfillmentStatus = order.fulfillment_status;

  if (
    orderStatus === "cancelled" ||
    paymentStatus === "cancelled" ||
    fulfillmentStatus === "cancelled"
  ) {
    return "cancelled";
  }

  if (fulfillmentStatus === "delivered") return "delivered";
  if (fulfillmentStatus === "shipped") return "shipped";

  if (
    fulfillmentStatus === "packed" ||
    fulfillmentStatus === "ready_to_ship"
  ) {
    return "packed";
  }

  if (fulfillmentStatus === "picking") return "picking";

  if (
    orderStatus === "pending_payment" ||
    paymentStatus === "pending" ||
    paymentStatus === "authorized"
  ) {
    return "pending_payment";
  }

  return "paid";
}

function statusTone(
  value?: string | null
): "default" | "green" | "yellow" | "red" | "blue" {
  switch (value) {
    case "paid":
    case "done":
    case "delivered":
      return "green";

    case "pending":
    case "pending_payment":
    case "authorized":
    case "picking":
    case "packed":
    case "ready_to_ship":
    case "in_progress":
    case "awaiting_post":
    case "in_transit":
    case "not_required":
    case "not_shipped":
      return "yellow";

    case "cancelled":
    case "canceled":
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

function DrawerCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${CALEA.line}`,
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        background: "#fff",
        boxShadow: "0 8px 24px rgba(43,85,78,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 800,
          marginBottom: 14,
          fontSize: 16,
          color: CALEA.primary,
        }}
      >
        {icon}
        {title}
      </div>

      {children}
    </div>
  );
}

function ValueRow({
  label,
  value,
  strong,
  green,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  green?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 14,
      }}
    >
      <span style={{ color: strong ? CALEA.primary : "#71717a" }}>
        {label}
      </span>

      <strong
        style={{
          color: green ? "#027a48" : strong ? CALEA.primary : "#18181b",
          fontSize: strong ? 17 : 14,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#71717a" }}>{label}</span>
      <strong style={{ color: "#18181b", textAlign: "right" }}>
        {value || "-"}
      </strong>
    </div>
  );
}

function ColumnHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        background: CALEA.soft,
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
        borderRadius: 20,
        padding: 16,
        boxShadow: "0 8px 22px rgba(43,85,78,0.06)",
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

      <div style={{ marginTop: 8, fontWeight: 700, color: "#27272a" }}>
        {order.customer_name || order.external_customer_name || "Cliente sem nome"}
      </div>

      <div style={{ marginTop: 6, fontSize: 15, color: CALEA.primary, fontWeight: 700 }}>
        {moneyBRL(order.total_cents)}
      </div>

      <div style={{ marginTop: 4, fontSize: 12, color: "#71717a" }}>
        {order.payment_method || "Sem pagamento"}{" "}
        {order.sales_channel ? `• ${order.sales_channel}` : ""}
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Badge tone={statusTone(order.payment_status)}>
          Pagto: {order.payment_status || "-"}
        </Badge>

        <Badge tone={statusTone(order.service_order_status)}>
          O.S.: {order.service_order_status || "-"}
        </Badge>

        <Badge tone={statusTone(order.fulfillment_status)}>
          Pacote: {order.fulfillment_status || "-"}
        </Badge>
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
        padding: "13px 15px",
        borderRadius: 18,
        border: `1px solid ${CALEA.line}`,
        background: disabled ? "#f4f4f5" : "#fff",
        color: disabled ? "#a1a1aa" : "#18181b",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
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
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [selectedItems, setSelectedItems] = useState<OrderItemRow[]>([]);
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

    return orders.filter((order) => {
      const haystack = [
        order.id,
        order.customer_name,
        order.external_customer_name,
        order.external_customer_phone,
        order.payment_method,
        order.sales_channel,
        order.seller_name,
        order.tracking_code,
        order.carrier,
        order.order_status,
        order.payment_status,
        order.service_order_status,
        order.fulfillment_status,
        order.shipping_status,
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

  async function openOrder(order: OrderRow) {
    setSelected(order);
    setSelectedItems([]);
    setLoadingItems(true);
    setErrorMsg(null);

    try {
      const { data: orderDetails, error: orderDetailsError } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          order_status,
          payment_status,
          service_order_status,
          fulfillment_status,
          shipping_status,
          payment_method,
          subtotal_cents,
          shipping_cents,
          discount_cents,
          gift_wrap_cents,
          total_cents,
          coupon_code,
          tracking_code,
          carrier,
          updated_at
        `
        )
        .eq("id", order.id)
        .maybeSingle();

      if (orderDetailsError) throw orderDetailsError;

      const mergedOrder = {
        ...order,
        ...(orderDetails || {}),
      } as OrderRow;

      setSelected(mergedOrder);

      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select(
          `
          id,
          sku_id,
          quantity,
          unit_price_cents,
          line_total_cents
        `
        )
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      const rawItems = orderItems || [];

      const skuIds = Array.from(
        new Set(rawItems.map((item: any) => item.sku_id).filter(Boolean))
      ) as string[];

      let skuMap = new Map<string, any>();
      let productMap = new Map<string, any>();
      let movementMap = new Map<string, any>();

      if (skuIds.length) {
        const { data: skusData, error: skusError } = await supabase
          .from("skus")
          .select("id, product_id, sku_code, variant_name, title")
          .in("id", skuIds);

        if (skusError) throw skusError;

        skuMap = new Map((skusData || []).map((sku: any) => [sku.id, sku]));

        const productIds = Array.from(
          new Set(
            (skusData || [])
              .map((sku: any) => sku.product_id)
              .filter(Boolean)
          )
        ) as string[];

        if (productIds.length) {
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);

          if (productsError) throw productsError;

          productMap = new Map(
            (productsData || []).map((product: any) => [product.id, product])
          );
        }

        const { data: movementsData, error: movementsError } = await supabase
          .from("stock_movements")
          .select(
            `
            sku_id,
            location_id,
            type,
            quantity,
            created_at,
            stock_locations (
              id,
              code,
              name
            )
          `
          )
          .eq("order_id", order.id)
          .in("sku_id", skuIds)
          .order("created_at", { ascending: false });

        if (movementsError) throw movementsError;

        for (const movement of movementsData || []) {
          if (!movement.sku_id) continue;

          if (!movementMap.has(movement.sku_id)) {
            movementMap.set(movement.sku_id, movement);
          }
        }
      }

      const enrichedItems: OrderItemRow[] = rawItems.map((item: any) => {
        const sku = item.sku_id ? skuMap.get(item.sku_id) : null;
        const product = sku?.product_id ? productMap.get(sku.product_id) : null;
        const movement = item.sku_id ? movementMap.get(item.sku_id) : null;

        const location = Array.isArray(movement?.stock_locations)
          ? movement?.stock_locations?.[0]
          : movement?.stock_locations;

        return {
          id: item.id,
          sku_id: item.sku_id,
          quantity: Number(item.quantity || 0),
          unit_price_cents: Number(item.unit_price_cents || 0),
          line_total_cents: Number(item.line_total_cents || 0),

          product_name:
            product?.name || sku?.title || sku?.variant_name || "Produto sem nome",

          sku_code: sku?.sku_code || "-",
          variant_name: sku?.variant_name || sku?.title || "-",

          stock_location_code: location?.code || null,
          stock_location_name: location?.name || null,
          stock_movement_type: movement?.type || null,
        };
      });

      setSelectedItems(enrichedItems);

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                ...(orderDetails || {}),
              }
            : item
        )
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Erro ao carregar detalhes do pedido.");
    } finally {
      setLoadingItems(false);
    }
  }

  async function refreshSelected(orderId: string) {
    const { data, error } = await supabase
      .from("v_admin_orders_kanban")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (!error && data) {
      await openOrder(data as OrderRow);
    }
  }

  async function patchOrder(orderId: string, patch: Record<string, any>) {
    try {
      setSaving(true);
      setErrorMsg(null);

      const { error } = await supabase
        .from("orders")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      await loadOrders();
      await refreshSelected(orderId);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Erro ao atualizar pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPaymentPaid() {
    if (!selected) return;

    await patchOrder(selected.id, {
      status: "paid",
      order_status: "paid",
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    });
  }

  async function handleStartService() {
    if (!selected) return;

    await patchOrder(selected.id, {
      service_order_status: "in_progress",
      service_started_at: new Date().toISOString(),
    });
  }

  async function handleFinishService() {
    if (!selected) return;

    await patchOrder(selected.id, {
      service_order_status: "done",
      service_finished_at: new Date().toISOString(),
    });
  }

  async function handleSetPicking() {
    if (!selected) return;

    await patchOrder(selected.id, {
      fulfillment_status: "picking",
      picked_at: new Date().toISOString(),
    });
  }

  async function handleSetPacked() {
    if (!selected) return;

    await patchOrder(selected.id, {
      fulfillment_status: "packed",
      packed_at: new Date().toISOString(),
    });
  }

  async function handleSetShipped() {
    if (!selected) return;

    await patchOrder(selected.id, {
      fulfillment_status: "shipped",
      shipping_status: "posted",
      shipped_at: new Date().toISOString(),
    });
  }

  async function handleSetDelivered() {
    if (!selected) return;

    await patchOrder(selected.id, {
      fulfillment_status: "delivered",
      shipping_status: "delivered",
      delivered_at: new Date().toISOString(),
    });
  }

  async function handleCancelOrder() {
    if (!selected) return;

    await patchOrder(selected.id, {
      status: "canceled",
      order_status: "cancelled",
      payment_status:
        selected.payment_status === "paid" ? selected.payment_status : "cancelled",
      service_order_status:
        selected.service_order_status === "not_required"
          ? "not_required"
          : "cancelled",
      fulfillment_status: "cancelled",
      shipping_status:
        selected.shipping_status === "delivered"
          ? selected.shipping_status
          : "not_shipped",
      canceled_at: new Date().toISOString(),
      cancelled_at: new Date().toISOString(),
      canceled_reason: "Cancelado manualmente pelo admin",
    });
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
          <h1 style={{ margin: 0, fontSize: 28, color: CALEA.primary }}>
            Pedidos
          </h1>

          <p style={{ margin: "6px 0 0", color: "#71717a" }}>
            Operação por status em quadro kanban.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              minWidth: 300,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff",
              border: `1px solid ${CALEA.line}`,
              borderRadius: 18,
              padding: "0 14px",
              boxShadow: "0 8px 24px rgba(43,85,78,0.05)",
            }}
          >
            <Search size={16} color="#71717a" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, id, status, rastreio..."
              style={{
                width: "100%",
                height: 44,
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
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 18,
              border: `1px solid ${CALEA.line}`,
              background: "#fff",
              padding: "0 16px",
              cursor: "pointer",
              fontWeight: 700,
              color: CALEA.primary,
            }}
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: 16,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 16,
            padding: 12,
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${CALEA.line}`,
            borderRadius: 20,
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
            gridTemplateColumns: "repeat(7, minmax(280px, 1fr))",
            gap: 16,
            alignItems: "start",
            overflowX: "auto",
            paddingBottom: 10,
          }}
        >
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              style={{
                minWidth: 280,
                background: CALEA.soft,
                border: `1px solid ${CALEA.line}`,
                borderRadius: 24,
                padding: 14,
                maxHeight: "calc(100vh - 180px)",
                overflowY: "auto",
              }}
            >
              <ColumnHeader
                title={column.title}
                count={grouped[column.key].length}
              />

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {grouped[column.key].length === 0 ? (
                  <div
                    style={{
                      borderRadius: 18,
                      border: `1px dashed ${CALEA.line}`,
                      padding: 16,
                      color: "#71717a",
                      fontSize: 13,
                      background: "#fff",
                    }}
                  >
                    Sem pedidos nesta coluna.
                  </div>
                ) : (
                  grouped[column.key].map((order) => (
                    <OrderCard key={order.id} order={order} onOpen={openOrder} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {drawerOpen && selected && (
        <>
          <div
            onClick={() => {
              setSelected(null);
              setSelectedItems([]);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.28)",
              zIndex: 40,
            }}
          />

          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 520,
              maxWidth: "100%",
              height: "100vh",
              background: CALEA.bg,
              zIndex: 50,
              boxShadow: "-8px 0 30px rgba(0,0,0,0.16)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 22,
                borderBottom: `1px solid ${CALEA.line}`,
                background: "#fff",
                display: "flex",
                alignItems: "start",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#71717a" }}>Pedido</div>

                <h2
                  style={{
                    margin: "4px 0 0",
                    fontSize: 24,
                    color: CALEA.primary,
                    letterSpacing: 1,
                  }}
                >
                  #{shortId(selected.id)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setSelectedItems([]);
                }}
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
              <DrawerCard title="Resumo" icon={<ReceiptText size={18} />}>
                <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                  <InfoLine
                    label="Cliente"
                    value={selected.customer_name || selected.external_customer_name}
                  />
                  <InfoLine label="Valor" value={moneyBRL(selected.total_cents)} />
                  <InfoLine label="Pagamento" value={selected.payment_method} />
                  <InfoLine
                    label="Canal"
                    value={selected.sales_channel || selected.origin}
                  />
                  <InfoLine label="Vendedor" value={selected.seller_name} />
                  <InfoLine label="Rastreio" value={selected.tracking_code} />
                  <InfoLine label="Transportadora" value={selected.carrier} />
                  <InfoLine label="Criado em" value={formatDate(selected.created_at)} />
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <Badge tone={statusTone(selected.order_status)}>
                    Pedido: {selected.order_status || "-"}
                  </Badge>

                  <Badge tone={statusTone(selected.payment_status)}>
                    Pagto: {selected.payment_status || "-"}
                  </Badge>

                  <Badge tone={statusTone(selected.service_order_status)}>
                    O.S.: {selected.service_order_status || "-"}
                  </Badge>

                  <Badge tone={statusTone(selected.fulfillment_status)}>
                    Pacote: {selected.fulfillment_status || "-"}
                  </Badge>

                  <Badge tone={statusTone(selected.shipping_status)}>
                    Envio: {selected.shipping_status || "-"}
                  </Badge>
                </div>
              </DrawerCard>

              <DrawerCard title="Itens do pedido" icon={<ShoppingBag size={18} />}>
                {loadingItems ? (
                  <div
                    style={{
                      borderRadius: 18,
                      background: "#fff",
                      padding: 16,
                      color: "#71717a",
                      fontSize: 13,
                    }}
                  >
                    Carregando itens do pedido...
                  </div>
                ) : selectedItems.length ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: `1px solid ${CALEA.line}`,
                          borderRadius: 22,
                          background: CALEA.bg,
                          padding: 15,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                color: CALEA.primary,
                                fontSize: 15,
                              }}
                            >
                              {item.product_name}
                            </div>

                            <div style={{ marginTop: 5, fontSize: 12, color: "#71717a" }}>
                              SKU: {item.sku_code}
                            </div>

                            <div style={{ fontSize: 12, color: "#71717a" }}>
                              Variação: {item.variant_name}
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontWeight: 800,
                                color: CALEA.primary,
                                fontSize: 15,
                              }}
                            >
                              {moneyBRL(item.line_total_cents)}
                            </div>

                            <div style={{ fontSize: 12, color: "#71717a" }}>
                              Qtd: {item.quantity}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              background: "#fff",
                              borderRadius: 16,
                              padding: "9px 10px",
                            }}
                          >
                            <div style={{ fontSize: 11, color: "#71717a" }}>Qtd</div>
                            <div style={{ fontWeight: 800 }}>{item.quantity}</div>
                          </div>

                          <div
                            style={{
                              background: "#fff",
                              borderRadius: 16,
                              padding: "9px 10px",
                            }}
                          >
                            <div style={{ fontSize: 11, color: "#71717a" }}>
                              Unitário
                            </div>
                            <div style={{ fontWeight: 800 }}>
                              {moneyBRL(item.unit_price_cents)}
                            </div>
                          </div>

                          <div
                            style={{
                              background: "#fff",
                              borderRadius: 16,
                              padding: "9px 10px",
                            }}
                          >
                            <div style={{ fontSize: 11, color: "#71717a" }}>Total</div>
                            <div style={{ fontWeight: 800 }}>
                              {moneyBRL(item.line_total_cents)}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            borderTop: `1px solid ${CALEA.line}`,
                            paddingTop: 11,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <MapPin size={16} color={CALEA.primary} />

                            <div>
                              <div style={{ fontSize: 11, color: "#71717a" }}>
                                Local no estoque
                              </div>

                              <div
                                style={{
                                  marginTop: 2,
                                  fontWeight: 800,
                                  color: item.stock_location_code
                                    ? CALEA.primary
                                    : "#a1a1aa",
                                }}
                              >
                                {item.stock_location_code
                                  ? `${item.stock_location_code}${
                                      item.stock_location_name
                                        ? ` - ${item.stock_location_name}`
                                        : ""
                                    }`
                                  : "Não informado"}
                              </div>
                            </div>
                          </div>

                          {item.stock_movement_type && (
                            <Badge tone="blue">Mov.: {item.stock_movement_type}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 18,
                      background: "#fff",
                      padding: 16,
                      color: "#71717a",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    Nenhum item foi encontrado em <strong>order_items</strong> para
                    este pedido.
                  </div>
                )}
              </DrawerCard>

              <DrawerCard title="Valores do pedido" icon={<ReceiptText size={18} />}>
                <div style={{ display: "grid", gap: 10 }}>
                  <ValueRow label="Subtotal" value={moneyBRL(selected.subtotal_cents)} />

                  {!!selected.discount_cents && (
                    <ValueRow
                      label={`Desconto${
                        selected.coupon_code ? ` (${selected.coupon_code})` : ""
                      }`}
                      value={`- ${moneyBRL(selected.discount_cents)}`}
                      green
                    />
                  )}

                  <ValueRow label="Frete" value={moneyBRL(selected.shipping_cents)} />

                  {!!selected.gift_wrap_cents && (
                    <ValueRow
                      label="Presente"
                      value={moneyBRL(selected.gift_wrap_cents)}
                    />
                  )}

                  <div
                    style={{
                      height: 1,
                      background: CALEA.line,
                      margin: "6px 0",
                    }}
                  />

                  <ValueRow label="Total" value={moneyBRL(selected.total_cents)} strong />
                </div>
              </DrawerCard>

              <DrawerCard title="Ações">
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
              </DrawerCard>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
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
import { useLocation, useNavigate } from "react-router-dom";
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
  order_number: string | null;
  created_at: string;
  updated_at: string;
  delivered_at?: string | null;

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
  | "paid"
  | "picking"
  | "packed"
  | "shipped"
  | "delivered";

type OperationalFilter =
  | "all"
  | "attention"
  | "late"
  | "no_tracking"
  | "external"
  | "today";

const CALEA = {
  primary: "#2b554e",
  primaryDark: "#1f3f3a",
  accent: "#b08d57",
  bg: "#FCFAF6",
  line: "#e9e2d6",
  soft: "#f6f3ee",
  card: "#ffffff",
  muted: "#71717a",
  text: "#18181b",
  shadow: "0 18px 45px rgba(43,85,78,0.08)",
};

const COLUMNS: { key: KanbanColumnKey; title: string }[] = [
  { key: "paid", title: "Pago" },
  { key: "picking", title: "Separando" },
  { key: "packed", title: "Embalado" },
  { key: "shipped", title: "Enviado" },
  { key: "delivered", title: "Entregue" },
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

function displayOrderNumber(order: OrderRow) {
  return order.order_number || `PED-${shortId(order.id)}`;
}

function isWithinLastDays(value?: string | null, days = 7) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const limit = new Date();
  limit.setDate(limit.getDate() - days);

  return date >= limit;
}

function normalizeOrderStatus(value?: string | null) {
  if (!value || value === "draft") return "pending_payment";
  if (value === "canceled") return "cancelled";
  return value;
}

function resolveKanbanColumn(order: OrderRow): KanbanColumnKey | null {
  const orderStatus = normalizeOrderStatus(order.order_status || order.status);
  const paymentStatus = order.payment_status;
  const fulfillmentStatus = order.fulfillment_status;

  // Cancelados não aparecem no Kanban
  if (
    orderStatus === "cancelled" ||
    orderStatus === "canceled" ||
    paymentStatus === "cancelled" ||
    paymentStatus === "canceled" ||
    fulfillmentStatus === "cancelled" ||
    fulfillmentStatus === "canceled"
  ) {
    return null;
  }

  // Pendentes de pagamento também não aparecem
  if (
    orderStatus === "pending_payment" ||
    paymentStatus === "pending" ||
    paymentStatus === "authorized" ||
    paymentStatus === "failed" ||
    paymentStatus === "expired"
  ) {
    return null;
  }

  // Entregues aparecem só dos últimos 7 dias
  if (fulfillmentStatus === "delivered") {
    const deliveredDate = order.delivered_at || order.updated_at;

    if (!isWithinLastDays(deliveredDate, 7)) {
      return null;
    }

    return "delivered";
  }

  if (fulfillmentStatus === "shipped") return "shipped";

  if (
    fulfillmentStatus === "packed" ||
    fulfillmentStatus === "ready_to_ship"
  ) {
    return "packed";
  }

  if (fulfillmentStatus === "picking") return "picking";

  return "paid";
}


function daysSince(value?: string | null) {
  if (!value) return 0;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function isToday(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function orderAgeLabel(order: OrderRow) {
  const days = daysSince(order.created_at);

  if (days <= 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function isLateOrder(order: OrderRow) {
  const column = resolveKanbanColumn(order);

  if (!column || column === "shipped" || column === "delivered") return false;

  return daysSince(order.created_at) >= 2;
}

function needsTracking(order: OrderRow) {
  const column = resolveKanbanColumn(order);

  return column === "packed" && !order.tracking_code;
}

function needsAttention(order: OrderRow) {
  return isLateOrder(order) || needsTracking(order);
}

function nextActionLabel(order: OrderRow) {
  const column = resolveKanbanColumn(order);

  if (needsTracking(order)) return "Informar rastreio";
  if (column === "paid") return "Separar pedido";
  if (column === "picking") return "Embalar pedido";
  if (column === "packed") return "Marcar como enviado";
  if (column === "shipped") return "Acompanhar entrega";
  if (column === "delivered") return "Finalizado";

  return "Revisar pedido";
}

function priorityScore(order: OrderRow) {
  let score = 0;

  if (needsAttention(order)) score += 100;
  if (needsTracking(order)) score += 60;
  if (isLateOrder(order)) score += 40;

  score += Math.min(daysSince(order.created_at), 10);

  return score;
}

function compareOrdersByPriority(a: OrderRow, b: OrderRow) {
  const priorityDiff = priorityScore(b) - priorityScore(a);
  if (priorityDiff !== 0) return priorityDiff;

  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function filterOperationalOrder(order: OrderRow, filter: OperationalFilter) {
  if (filter === "all") return true;
  if (filter === "attention") return needsAttention(order);
  if (filter === "late") return isLateOrder(order);
  if (filter === "no_tracking") return needsTracking(order);
  if (filter === "external") return (order.origin || "").toLowerCase() === "external";
  if (filter === "today") return isToday(order.created_at);

  return true;
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
        zIndex: 2,
        background: "linear-gradient(180deg, #f6f3ee 80%, rgba(246,243,238,0))",
        paddingBottom: 12,
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: CALEA.primary,
              boxShadow: "0 0 0 4px rgba(43,85,78,0.08)",
            }}
          />

          <strong
            style={{
              fontSize: 14,
              color: CALEA.primary,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </strong>
        </div>

        <span
          style={{
            minWidth: 30,
            height: 30,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: "#fff",
            border: `1px solid ${CALEA.line}`,
            fontSize: 12,
            fontWeight: 800,
            color: CALEA.primary,
            boxShadow: "0 6px 16px rgba(43,85,78,0.06)",
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
  const customerName =
    order.customer_name || order.external_customer_name || "Cliente sem nome";
  const late = isLateOrder(order);
  const withoutTracking = needsTracking(order);
  const attention = needsAttention(order);
  const nextAction = nextActionLabel(order);

  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      style={{
        width: "100%",
        textAlign: "left",
        background: attention ? "#fffaf5" : "#fff",
        border: `1px solid ${attention ? "rgba(176,141,87,0.45)" : CALEA.line}`,
        borderRadius: 22,
        padding: 16,
        boxShadow: "0 10px 28px rgba(43,85,78,0.07)",
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 18px 38px rgba(43,85,78,0.12)";
        e.currentTarget.style.border = `1px solid rgba(43,85,78,0.25)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(43,85,78,0.07)";
        e.currentTarget.style.border = `1px solid ${CALEA.line}`;
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong
          style={{
            fontSize: 13,
            color: CALEA.primary,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {displayOrderNumber(order)}
        </strong>

        <span
          style={{
            fontSize: 11,
            color: "#8a8f98",
            whiteSpace: "nowrap",
          }}
        >
          {new Date(order.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          fontWeight: 800,
          color: CALEA.text,
          fontSize: 15,
          lineHeight: 1.35,
          minHeight: 40,
        }}
      >
        {customerName}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 17,
          color: CALEA.primary,
          fontWeight: 900,
          letterSpacing: "-0.02em",
        }}
      >
        {moneyBRL(order.total_cents)}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Badge tone={attention ? "yellow" : "default"}>
          {nextAction}
        </Badge>

        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: late ? "#b42318" : CALEA.muted,
          }}
        >
          {orderAgeLabel(order)} no fluxo
        </span>
      </div>

      {(late || withoutTracking) && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {late && <Badge tone="red">Parado há 2+ dias</Badge>}
          {withoutTracking && <Badge tone="red">Sem rastreio</Badge>}
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: CALEA.muted,
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span>{order.payment_method || "Sem pagamento"}</span>

        {order.sales_channel ? (
          <>
            <span style={{ color: "#d4c8b8" }}>•</span>
            <span>{order.sales_channel}</span>
          </>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
        }}
      >
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

const summaryCardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${CALEA.line}`,
  borderRadius: 22,
  padding: "16px 18px",
  boxShadow: "0 12px 30px rgba(43,85,78,0.06)",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: CALEA.muted,
  fontWeight: 700,
  marginBottom: 7,
};

const summaryValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: 22,
  color: CALEA.primary,
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

export default function AdminOrdersKanban() {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [selectedItems, setSelectedItems] = useState<OrderItemRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileColumn, setMobileColumn] = useState<KanbanColumnKey>("paid");
  const [operationalFilter, setOperationalFilter] =
    useState<OperationalFilter>("all");

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get("order_id");

    if (!orderId || !orders.length) return;
    if (selected?.id === orderId) return;

    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    const column = resolveKanbanColumn(order);
    if (column) {
      setMobileColumn(column);
    }

    openOrder(order, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, orders]);

  function openInSales(orderId: string) {
    navigate(`/admin/vendas?order_id=${orderId}&section=all`);
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const haystack = [
        order.id,
        order.order_number,
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

      const matchesSearch = !q || haystack.includes(q);
      const matchesOperationalFilter = filterOperationalOrder(order, operationalFilter);

      return matchesSearch && matchesOperationalFilter;
    });
  }, [orders, search, operationalFilter]);

  const grouped = useMemo(() => {
    const base: Record<KanbanColumnKey, OrderRow[]> = {
      paid: [],
      picking: [],
      packed: [],
      shipped: [],
      delivered: [],
    };

    for (const order of filteredOrders) {
      const key = resolveKanbanColumn(order);

      if (!key) continue;

      base[key].push(order);
    }

    Object.keys(base).forEach((key) => {
      base[key as KanbanColumnKey].sort(compareOrdersByPriority);
    });

    return base;
  }, [filteredOrders]);

  const summary = useMemo(() => {
    const totalVisible = Object.values(grouped).reduce(
      (sum, list) => sum + list.length,
      0
    );

    const totalValue = Object.values(grouped)
      .flat()
      .reduce((sum, order) => sum + Number(order.total_cents || 0), 0);

    const visibleOrders = Object.values(grouped).flat();
    const attention = visibleOrders.filter(needsAttention).length;
    const late = visibleOrders.filter(isLateOrder).length;
    const noTracking = visibleOrders.filter(needsTracking).length;

    return {
      totalVisible,
      totalValue,
      paid: grouped.paid.length,
      delivered: grouped.delivered.length,
      attention,
      late,
      noTracking,
    };
  }, [grouped]);

  const visibleColumns = useMemo(() => {
    if (!isMobile) return COLUMNS;

    return COLUMNS.filter((column) => column.key === mobileColumn);
  }, [isMobile, mobileColumn]);

  async function openOrder(order: OrderRow, updateUrl = true) {
    if (updateUrl) {
      navigate(`/admin/kanban?order_id=${order.id}`, { replace: true });
    }

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
          order_number,
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
      setTrackingCodeInput(mergedOrder.tracking_code || "");
      setCarrierInput(mergedOrder.carrier || "");

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
      await openOrder(data as OrderRow, false);
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

  async function sendOrderStatusEmail(orderId: string, status: string) {
    const { error } = await supabase.functions.invoke("send-order-status-email", {
      body: {
        order_id: orderId,
        status,
      },
    });

    if (error) {
      console.error("Erro ao enviar e-mail de status:", error);
    }
  }

  async function updateFulfillmentStatus(
    orderId: string,
    newStatus: "picking" | "packed" | "shipped" | "delivered" | "cancelled",
    extra?: {
      trackingCode?: string | null;
      carrier?: string | null;
      notes?: string | null;
    }
  ) {
    try {
      setSaving(true);
      setErrorMsg(null);

      const { data, error } = await supabase.rpc(
        "admin_update_order_fulfillment_status",
        {
          p_order_id: orderId,
          p_new_status: newStatus,
          p_tracking_code: extra?.trackingCode || null,
          p_carrier: extra?.carrier || null,
          p_notes: extra?.notes || "Status atualizado pelo Kanban",
        }
      );

      if (error) throw error;

      if (data?.changed) {
        await sendOrderStatusEmail(orderId, newStatus);
      }

      await loadOrders();
      await refreshSelected(orderId);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Erro ao atualizar status do pedido.");
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

    await updateFulfillmentStatus(selected.id, "picking", {
      notes: "Pedido marcado como separando pelo admin",
    });
  }

  async function handleSetPacked() {
    if (!selected) return;

    await updateFulfillmentStatus(selected.id, "packed", {
      notes: "Pedido marcado como embalado pelo admin",
    });
  }

  async function handleSetShipped() {
    if (!selected) return;

    const trackingCode = trackingCodeInput.trim();
    const carrier = carrierInput.trim();

    if (!trackingCode) {
      setErrorMsg("Informe o código de rastreio antes de marcar como enviado.");
      return;
    }

    if (!carrier) {
      setErrorMsg("Informe a transportadora antes de marcar como enviado.");
      return;
    }

    await updateFulfillmentStatus(selected.id, "shipped", {
      trackingCode,
      carrier,
      notes: "Pedido marcado como enviado pelo admin",
    });
  }

  async function handleSetDelivered() {
    if (!selected) return;

    await updateFulfillmentStatus(selected.id, "delivered", {
      notes: "Pedido marcado como entregue pelo admin",
    });
  }

  async function handleCancelOrder() {
    if (!selected) return;

    const confirmCancel = window.confirm(
      "Tem certeza que deseja cancelar este pedido?"
    );

    if (!confirmCancel) return;

    await updateFulfillmentStatus(selected.id, "cancelled", {
      notes: "Pedido cancelado manualmente pelo admin",
    });

    await patchOrder(selected.id, {
      status: "canceled",
      order_status: "cancelled",
      payment_status:
        selected.payment_status === "paid" ? selected.payment_status : "cancelled",
      service_order_status:
        selected.service_order_status === "not_required"
          ? "not_required"
          : "cancelled",
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
  
  function closeDrawer() {
  setSelected(null);
  setSelectedItems([]);
  setTrackingCodeInput("");
  setCarrierInput("");
}

  const operationalFilters: { key: OperationalFilter; label: string; count?: number }[] = [
    { key: "all", label: "Todos", count: summary.totalVisible },
    { key: "attention", label: "Atenção", count: summary.attention },
    { key: "late", label: "Parados", count: summary.late },
    { key: "no_tracking", label: "Sem rastreio", count: summary.noTracking },
    { key: "external", label: "Externas" },
    { key: "today", label: "Hoje" },
  ];

  return (
    <div
      style={{
        minHeight: "100%",
        background:
          "radial-gradient(circle at top left, rgba(176,141,87,0.10), transparent 32%), #FCFAF6",
        padding: isMobile ? 12 : 24,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          marginBottom: 22,
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 999,
              background: "rgba(43,85,78,0.08)",
              color: CALEA.primary,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Kanban de pedidos
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? 26 : 34,
              lineHeight: 1.1,
              color: CALEA.primary,
              letterSpacing: "-0.04em",
            }}
          >
            Pedidos
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: CALEA.muted,
              fontSize: 15,
            }}
          >
            Acompanhe a operação por etapa.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: isMobile ? "100%" : 340,
              maxWidth: "100%",
              height: 48,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff",
              border: `1px solid ${CALEA.line}`,
              borderRadius: 999,
              padding: "0 16px",
              boxShadow: "0 12px 30px rgba(43,85,78,0.06)",
            }}
          >
            <Search size={17} color="#8a8f98" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, pedido, rastreio..."
              style={{
                width: "100%",
                height: 44,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: CALEA.text,
              }}
            />
          </div>

          <button
            type="button"
            onClick={loadOrders}
            style={{
              height: 48,
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              borderRadius: 999,
              border: `1px solid ${CALEA.line}`,
              background: "#fff",
              padding: "0 18px",
              cursor: "pointer",
              fontWeight: 800,
              color: CALEA.primary,
              boxShadow: "0 12px 30px rgba(43,85,78,0.06)",
            }}
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <div
        style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: isMobile ? undefined : "repeat(6, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: 20,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
        }}
      >
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Pedidos visíveis</span>
          <strong style={summaryValueStyle}>{summary.totalVisible}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Total no Kanban</span>
          <strong style={summaryValueStyle}>{moneyBRL(summary.totalValue)}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Pagos</span>
          <strong style={summaryValueStyle}>{summary.paid}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Entregues 7 dias</span>
          <strong style={summaryValueStyle}>{summary.delivered}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Precisam atenção</span>
          <strong style={{ ...summaryValueStyle, color: summary.attention ? "#b54708" : CALEA.primary }}>
            {summary.attention}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Sem rastreio</span>
          <strong style={{ ...summaryValueStyle, color: summary.noTracking ? "#b42318" : CALEA.primary }}>
            {summary.noTracking}
          </strong>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          marginBottom: 14,
          paddingBottom: 4,
        }}
      >
        {operationalFilters.map((item) => {
          const active = operationalFilter === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setOperationalFilter(item.key)}
              style={{
                flex: "0 0 auto",
                height: 40,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                border: `1px solid ${active ? CALEA.accent : CALEA.line}`,
                background: active ? "#fff7e8" : "#fff",
                color: active ? CALEA.primary : "#52525b",
                padding: "0 13px",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: active
                  ? "0 10px 22px rgba(176,141,87,0.16)"
                  : "0 8px 18px rgba(43,85,78,0.05)",
              }}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  style={{
                    minWidth: 23,
                    height: 23,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    background: active ? "#fff" : CALEA.soft,
                    fontSize: 12,
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isMobile ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            marginBottom: 14,
            paddingBottom: 4,
          }}
        >
          {COLUMNS.map((column) => {
            const active = mobileColumn === column.key;

            return (
              <button
                key={column.key}
                type="button"
                onClick={() => setMobileColumn(column.key)}
                style={{
                  flex: "0 0 auto",
                  height: 42,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  border: `1px solid ${active ? CALEA.primary : CALEA.line}`,
                  background: active ? CALEA.primary : "#fff",
                  color: active ? "#fff" : CALEA.primary,
                  padding: "0 14px",
                  fontWeight: 800,
                  fontSize: 13,
                  boxShadow: active
                    ? "0 12px 24px rgba(43,85,78,0.18)"
                    : "0 8px 18px rgba(43,85,78,0.06)",
                  cursor: "pointer",
                }}
              >
                <span>{column.title}</span>
                <span
                  style={{
                    minWidth: 24,
                    height: 24,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    background: active ? "rgba(255,255,255,0.18)" : CALEA.soft,
                    fontSize: 12,
                  }}
                >
                  {grouped[column.key].length}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

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
            padding: 16,
            color: "#71717a",
          }}
        >
          Carregando pedidos...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(240px, 1fr))",
            width: "100%",
            gap: isMobile ? 12 : 16,
            alignItems: "start",
            overflowX: isMobile ? "hidden" : "auto",
            paddingBottom: 10,
          }}
        >
          {visibleColumns.map((column) => (
            <div
              key={column.key}
              style={{
                minWidth: isMobile ? 0 : 220,
                background: CALEA.soft,
                border: `1px solid ${CALEA.line}`,
                borderRadius: 28,
                padding: 14,
                maxHeight: isMobile ? "none" : "calc(100vh - 180px)",
                overflowY: isMobile ? "visible" : "auto",
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
                      padding: 12,
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
            onClick={closeDrawer}
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
              left: isMobile ? 0 : "auto",
              width: isMobile ? "100vw" : 520,
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
                padding: isMobile ? 16 : 22,
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
                  {displayOrderNumber(selected)}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <X />
              </button>
            </div>

            <div style={{ padding: isMobile ? 12 : 20, overflowY: "auto", flex: 1 }}>
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

              <DrawerCard title="Próxima ação sugerida" icon={<Package size={18} />}>
                <div style={{ display: "grid", gap: 10 }}>
                  <ValueRow label="Ação" value={nextActionLabel(selected)} strong />
                  <ValueRow label="Tempo no fluxo" value={orderAgeLabel(selected)} />

                  {isLateOrder(selected) && (
                    <div
                      style={{
                        border: "1px solid #fed7aa",
                        background: "#fff7ed",
                        color: "#9a3412",
                        borderRadius: 16,
                        padding: 12,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Pedido parado há 2 dias ou mais. Priorize a próxima etapa.
                    </div>
                  )}

                  {needsTracking(selected) && (
                    <div
                      style={{
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#991b1b",
                        borderRadius: 16,
                        padding: 12,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Pedido embalado sem rastreio. Informe o código antes de marcar como enviado.
                    </div>
                  )}
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
                            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
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
                                  ? `${item.stock_location_code}${item.stock_location_name
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
                      label={`Desconto${selected.coupon_code ? ` (${selected.coupon_code})` : ""
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

              <DrawerCard title="Dados de envio" icon={<Truck size={18} />}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 800,
                        color: CALEA.primary,
                        marginBottom: 6,
                      }}
                    >
                      Código de rastreio
                    </label>

                    <input
                      value={trackingCodeInput}
                      onChange={(e) => setTrackingCodeInput(e.target.value)}
                      placeholder="Ex: BR123456789BR"
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 14,
                        border: `1px solid ${CALEA.line}`,
                        padding: "0 12px",
                        outline: "none",
                        fontSize: 14,
                        background: "#fff",
                        color: CALEA.text,
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 800,
                        color: CALEA.primary,
                        marginBottom: 6,
                      }}
                    >
                      Transportadora
                    </label>

                    <input
                      value={carrierInput}
                      onChange={(e) => setCarrierInput(e.target.value)}
                      placeholder="Ex: Correios, Jadlog, Melhor Envio"
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 14,
                        border: `1px solid ${CALEA.line}`,
                        padding: "0 12px",
                        outline: "none",
                        fontSize: 14,
                        background: "#fff",
                        color: CALEA.text,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!selected) return;

                      await patchOrder(selected.id, {
                        tracking_code: trackingCodeInput.trim() || null,
                        carrier: carrierInput.trim() || null,
                      });
                    }}
                    disabled={saving}
                    style={{
                      height: 44,
                      borderRadius: 999,
                      border: `1px solid ${CALEA.primary}`,
                      background: "#fff",
                      color: CALEA.primary,
                      fontWeight: 800,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    Salvar dados de envio
                  </button>
                </div>
              </DrawerCard>

              <DrawerCard title="Ações">
                <div style={{ display: "grid", gap: 10 }}>
                  <ActionButton
                    icon={<ShoppingBag size={16} />}
                    onClick={() => openInSales(selected.id)}
                    disabled={saving}
                  >
                    Abrir na aba Vendas
                  </ActionButton>

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
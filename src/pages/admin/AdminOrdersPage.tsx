import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Eye,
  Mail,
  PackageCheck,
  RefreshCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type SalesSection = "all" | "paid" | "pending" | "abandoned" | "labels";

type OrderRow = {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  external_customer_name: string | null;
  external_customer_email: string | null;
  external_customer_phone: string | null;
  status: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  shipping_status: string | null;
  subtotal_cents: number | null;
  shipping_cents: number | null;
  discount_cents: number | null;
  gift_wrap_cents: number | null;
  total_cents: number | null;
  created_at: string;
  paid_at: string | null;
  origin: string | null;
  sales_channel: string | null;
  seller_name: string | null;
  payment_method: string | null;
  shipping_label_generated: boolean | null;
  shipping_label_url: string | null;
  shipping_error: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  carrier: string | null;
  shipping_service_description: string | null;
  notes: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type OrderItem = {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  shipping_status: string;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  gift_wrap_cents: number;
  total_cents: number;
  created_at: string;
  paid_at: string | null;
  origin: string | null;
  sales_channel: string | null;
  seller_name: string | null;
  payment_method: string | null;
  shipping_label_generated: boolean;
  shipping_label_url: string | null;
  shipping_error: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  carrier: string | null;
  shipping_service_description: string | null;
  notes: string | null;
};

type DetailItem = {
  id: string;
  sku_code: string;
  product_name: string;
  variant_name: string;
  piece_type: string;
  quantity: number;
  line_total_cents: number;
  unit_cost_cents: number;
  total_cost_cents: number;
  profit_cents: number;
  margin_percent: number;
  markup_percent: number;
};

type SortKey = "created_at" | "total_cents" | "order_number" | "customer_name";
type SortDirection = "asc" | "desc";

const salesNavigation: {
  id: SalesSection;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}[] = [
  { id: "all", label: "Todas", shortLabel: "Todas", icon: ShoppingBag },
  { id: "paid", label: "Pagas", shortLabel: "Pagas", icon: ShoppingBag },
  {
    id: "pending",
    label: "Pendentes",
    shortLabel: "Pend.",
    icon: AlertTriangle,
  },
  {
    id: "abandoned",
    label: "Carrinhos",
    shortLabel: "Carrinhos",
    icon: ShoppingCart,
  },
  { id: "labels", label: "Etiquetas", shortLabel: "Etiquetas", icon: Truck },
];

const paymentStatusOptions = [
  { value: "all", label: "Todos pagamentos" },
  { value: "pending", label: "Pendente" },
  { value: "authorized", label: "Autorizado" },
  { value: "paid", label: "Pago" },
  { value: "failed", label: "Falhou" },
  { value: "refunded", label: "Reembolsado" },
  { value: "chargeback", label: "Chargeback" },
  { value: "cancelled", label: "Cancelado" },
];

const orderStatusOptions = [
  { value: "all", label: "Todos pedidos" },
  { value: "draft", label: "Rascunho" },
  { value: "pending_payment", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "processing", label: "Processando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "canceled", label: "Cancelado" },
  { value: "refunded", label: "Reembolsado" },
];

const shippingStatusOptions = [
  { value: "all", label: "Todos envios" },
  { value: "not_shipped", label: "Não enviado" },
  { value: "awaiting_post", label: "Aguardando postagem" },
  { value: "posted", label: "Postado" },
  { value: "in_transit", label: "Em trânsito" },
  { value: "delivered", label: "Entregue" },
  { value: "returned", label: "Devolvido" },
  { value: "lost", label: "Extraviado" },
];

const originOptions = [
  { value: "all", label: "Todas origens" },
  { value: "site", label: "Site" },
  { value: "external", label: "Venda externa" },
];

function moneyBRL(value: number | null | undefined) {
  return (Number(value || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value: string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatPercent(value: number) {
  return `${Number(value || 0)
    .toFixed(2)
    .replace(".", ",")}%`;
}

function normalizeText(value?: string | null) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getOrderDisplay(order: OrderItem) {
  return order.order_number || `#${order.id.slice(0, 8)}`;
}

function statusLabel(status?: string | null) {
  const value = normalizeText(status);

  const map: Record<string, string> = {
    draft: "Rascunho",
    pending: "Pendente",
    pending_payment: "Pendente",
    authorized: "Autorizado",
    paid: "Pago",
    processing: "Processando",
    shipped: "Enviado",
    delivered: "Entregue",
    canceled: "Cancelado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
    chargeback: "Chargeback",
    failed: "Falhou",
    not_shipped: "Não enviado",
    awaiting_post: "Aguardando postagem",
    posted: "Postado",
    in_transit: "Em trânsito",
    returned: "Devolvido",
    lost: "Extraviado",
  };

  return map[value] || status || "-";
}

function statusClass(status?: string | null) {
  const value = normalizeText(status);

  if (["paid", "delivered", "posted", "in_transit"].includes(value)) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    [
      "pending",
      "pending_payment",
      "authorized",
      "awaiting_post",
      "not_shipped",
    ].includes(value)
  ) {
    return "bg-amber-100 text-amber-700";
  }

  if (
    [
      "failed",
      "canceled",
      "cancelled",
      "refunded",
      "chargeback",
      "returned",
      "lost",
    ].includes(value)
  ) {
    return "bg-rose-100 text-rose-700";
  }

  if (["processing", "shipped"].includes(value)) {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-slate-100 text-slate-600";
}

function paymentLabel(paymentMethod?: string | null) {
  const value = normalizeText(paymentMethod);

  if (!value) return "-";
  if (value === "pix") return "Pix";
  if (value === "credit_card") return "Cartão";
  if (value === "boleto") return "Boleto";
  if (value === "debit_card") return "Débito";

  return paymentMethod || "-";
}

function originLabel(origin?: string | null) {
  const value = normalizeText(origin);

  if (value === "site") return "Site";
  if (value === "external") return "Externa";

  return origin || "-";
}

function isPaidOrder(order: OrderItem) {
  const s = normalizeText(order.status);
  const p = normalizeText(order.payment_status);

  return (
    ["paid", "processing", "shipped", "delivered"].includes(s) || p === "paid"
  );
}

function isPendingOrder(order: OrderItem) {
  const s = normalizeText(order.status);
  const p = normalizeText(order.payment_status);

  if (isPaidOrder(order)) return false;

  return (
    ["draft", "pending", "pending_payment", "authorized"].includes(s) ||
    ["pending", "authorized"].includes(p)
  );
}

function isAbandonedCart(order: OrderItem) {
  const s = normalizeText(order.status);
  const p = normalizeText(order.payment_status);

  if (isPaidOrder(order)) return false;

  return (
    ["draft", "pending", "pending_payment"].includes(s) ||
    ["pending", "failed", "cancelled"].includes(p)
  );
}

function isShippingLabelOrder(order: OrderItem) {
  if (normalizeText(order.origin) === "external") return false;

  const s = normalizeText(order.status);
  const p = normalizeText(order.payment_status);

  return (
    (p === "paid" || s === "paid" || s === "processing") &&
    !["shipped", "delivered", "canceled", "refunded"].includes(s)
  );
}

function getSkuCost(sku: any) {
  if (!sku) return 0;

  if (sku.cost_cents !== null && sku.cost_cents !== undefined) {
    return Number(sku.cost_cents || 0);
  }

  return (
    Number(sku.cost_gross_cents || 0) + Number(sku.cost_plating_cents || 0)
  );
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    ),
  ].join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Badge({ value }: { value?: string | null }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(value)}`}
    >
      {statusLabel(value)}
    </span>
  );
}

function CompactKpi({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-[#e9e2d6] bg-white p-3 shadow-sm md:min-w-0 md:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 md:text-xs">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-[#10233f] md:text-2xl">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeSection, setActiveSection] = useState<SalesSection>("all");

  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [shippingFilter, setShippingFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generatingLabelId, setGeneratingLabelId] = useState<string | null>(
    null,
  );
  const [sendingTrackingEmailId, setSendingTrackingEmailId] = useState<
    string | null
  >(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      let queryBuilder = supabase
        .from("orders")
        .select(
          [
            "id",
            "order_number",
            "customer_id",
            "external_customer_name",
            "external_customer_email",
            "external_customer_phone",
            "status",
            "payment_status",
            "fulfillment_status",
            "shipping_status",
            "subtotal_cents",
            "shipping_cents",
            "discount_cents",
            "gift_wrap_cents",
            "total_cents",
            "created_at",
            "paid_at",
            "origin",
            "sales_channel",
            "seller_name",
            "payment_method",
            "shipping_label_generated",
            "shipping_label_url",
            "shipping_error",
            "tracking_code",
            "tracking_url",
            "carrier",
            "shipping_service_description",
            "notes",
          ].join(", "),
        )
        .order("created_at", { ascending: false });

      if (startDate) {
        queryBuilder = queryBuilder.gte(
          "created_at",
          new Date(`${startDate}T00:00:00`).toISOString(),
        );
      }

      if (endDate) {
        queryBuilder = queryBuilder.lte(
          "created_at",
          new Date(`${endDate}T23:59:59`).toISOString(),
        );
      }

      const { data: ordersData, error: ordersError } = await queryBuilder;
      if (ordersError) throw ordersError;

      const customerIds = Array.from(
        new Set(
          (ordersData || []).map((o: any) => o.customer_id).filter(Boolean),
        ),
      ) as string[];

      let customerMap = new Map<
        string,
        { name: string; email: string | null; phone: string | null }
      >();

      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("id, full_name, email, phone")
          .in("id", customerIds);

        if (customersError) throw customersError;

        customerMap = new Map(
          ((customersData || []) as CustomerRow[]).map((customer) => [
            customer.id,
            {
              name: customer.full_name || customer.email || "Cliente",
              email: customer.email || null,
              phone: customer.phone || null,
            },
          ]),
        );
      }

      const normalized = ((ordersData || []) as unknown as OrderRow[]).map(
        (order) => {
          const customerInfo = order.customer_id
            ? customerMap.get(order.customer_id)
            : null;

          return {
            id: order.id,
            order_number: order.order_number,
            customer_id: order.customer_id,
            customer_name:
              order.external_customer_name ||
              customerInfo?.name ||
              order.external_customer_email ||
              "Cliente",
            customer_email:
              order.external_customer_email || customerInfo?.email || null,
            customer_phone:
              order.external_customer_phone || customerInfo?.phone || null,
            status: order.status || "",
            payment_status: order.payment_status || "",
            fulfillment_status: order.fulfillment_status || "",
            shipping_status: order.shipping_status || "",
            subtotal_cents: Number(order.subtotal_cents || 0),
            shipping_cents: Number(order.shipping_cents || 0),
            discount_cents: Number(order.discount_cents || 0),
            gift_wrap_cents: Number(order.gift_wrap_cents || 0),
            total_cents: Number(order.total_cents || 0),
            created_at: order.created_at,
            paid_at: order.paid_at,
            origin: order.origin,
            sales_channel: order.sales_channel,
            seller_name: order.seller_name,
            payment_method: order.payment_method,
            shipping_label_generated: Boolean(order.shipping_label_generated),
            shipping_label_url: order.shipping_label_url,
            shipping_error: order.shipping_error,
            tracking_code: order.tracking_code,
            tracking_url: order.tracking_url,
            carrier: order.carrier,
            shipping_service_description: order.shipping_service_description,
            notes: order.notes,
          } satisfies OrderItem;
        },
      );

      setOrders(normalized);
    } catch (err: any) {
      console.error("Erro ao carregar vendas:", err);
      setError(err?.message || "Erro ao carregar vendas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get("order_id");
    const section = params.get("section") as SalesSection | null;

    if (section && salesNavigation.some((item) => item.id === section)) {
      setActiveSection(section);
    }

    if (!orderId || !orders.length) return;
    if (selectedOrder?.id === orderId) return;

    const order = orders.find((item) => item.id === orderId);
    if (order) {
      loadOrderDetail(order);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, orders]);

  function openInKanban(orderId: string) {
    navigate(`/admin/kanban?order_id=${orderId}`);
  }

  async function loadOrderDetail(order: OrderItem) {
    try {
      setSelectedOrder(order);
      setLoadingDetail(true);
      setDetailItems([]);

      const { data, error: itemsError } = await supabase
        .from("order_items")
        .select(
          `
          id,
          sku_id,
          quantity,
          unit_price_cents,
          line_total_cents,
          skus (
            id,
            sku_code,
            variant_name,
            cost_cents,
            cost_gross_cents,
            cost_plating_cents,
            products (
              id,
              name,
              piece_type:piece_types (name)
            )
          )
        `,
        )
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      const normalized = ((data || []) as any[]).map((item) => {
        const sku = item.skus;
        const product = sku?.products;
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price_cents || 0);
        const lineTotal =
          Number(item.line_total_cents || 0) > 0
            ? Number(item.line_total_cents || 0)
            : unitPrice * quantity;
        const unitCost = getSkuCost(sku);
        const totalCost = unitCost * quantity;
        const profit = lineTotal - totalCost;

        return {
          id: item.id,
          sku_code: sku?.sku_code || "-",
          product_name: product?.name || "Produto",
          variant_name: sku?.variant_name || "-",
          piece_type: product?.piece_type?.name || "Sem tipo",
          quantity,
          line_total_cents: lineTotal,
          unit_cost_cents: unitCost,
          total_cost_cents: totalCost,
          profit_cents: profit,
          margin_percent: lineTotal > 0 ? (profit / lineTotal) * 100 : 0,
          markup_percent: totalCost > 0 ? (profit / totalCost) * 100 : 0,
        } satisfies DetailItem;
      });

      setDetailItems(normalized);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar detalhes do pedido.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function updateOrderField(orderId: string, payload: Partial<OrderRow>) {
    try {
      setError("");
      setSavingStatusId(orderId);

      const { error: updateError } = await supabase
        .from("orders")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) throw updateError;

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, ...(payload as any) } : order,
        ),
      );

      setSelectedOrder((current) =>
        current?.id === orderId ? { ...current, ...(payload as any) } : current,
      );
    } catch (err: any) {
      setError(err?.message || "Erro ao atualizar pedido.");
    } finally {
      setSavingStatusId(null);
    }
  }

  async function generateShippingLabel(orderId: string) {
    try {
      setError("");
      setGeneratingLabelId(orderId);

      const res = await fetch("/.netlify/functions/generate-shipping-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || "Resposta inválida da função de etiqueta." };
      }

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            data?.details?.message ||
            data?.details?.error ||
            `Erro ao gerar etiqueta Frenet (${res.status})`,
        );
      }

      await loadOrders();

      if (data?.label_url) window.open(data.label_url, "_blank");
      alert("Etiqueta gerada com sucesso.");
    } catch (err: any) {
      setError(err?.message || "Erro ao gerar etiqueta Frenet.");
      alert(err?.message || "Erro ao gerar etiqueta Frenet.");
    } finally {
      setGeneratingLabelId(null);
    }
  }

  async function sendTrackingEmail(order: OrderItem) {
    try {
      setError("");

      if (!order.customer_email)
        throw new Error("Cliente sem e-mail cadastrado.");
      if (!order.tracking_code)
        throw new Error("Pedido sem código de rastreio.");

      setSendingTrackingEmailId(order.id);

      const { data, error: invokeError } = await supabase.functions.invoke(
        "send-tracking-email",
        {
          body: {
            to: order.customer_email,
            customer_name: order.customer_name,
            order_number: getOrderDisplay(order),
            tracking_code: order.tracking_code,
            tracking_url: order.tracking_url,
          },
        },
      );

      if (invokeError) throw invokeError;
      if (!data?.ok)
        throw new Error(data?.error || "Erro ao enviar e-mail de rastreio.");

      alert("E-mail de rastreio enviado com sucesso.");
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar e-mail de rastreio.");
      alert(err?.message || "Erro ao enviar e-mail de rastreio.");
    } finally {
      setSendingTrackingEmailId(null);
    }
  }

  function resetFilters() {
    setQuery("");
    setPaymentFilter("all");
    setOrderStatusFilter("all");
    setShippingFilter("all");
    setOriginFilter("all");
    setLabelFilter("all");
    setTrackingFilter("all");
    setStartDate("");
    setEndDate("");
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "created_at" ? "desc" : "asc");
  }

  const counters = useMemo(
    () => ({
      all: orders.length,
      paid: orders.filter(isPaidOrder).length,
      pending: orders.filter(isPendingOrder).length,
      abandoned: orders.filter(isAbandonedCart).length,
      labels: orders.filter(isShippingLabelOrder).length,
    }),
    [orders],
  );

  const cards = useMemo(() => {
    const paidOrders = orders.filter(isPaidOrder);
    const pendingOrders = orders.filter(isPendingOrder);
    const awaitingShipment = orders.filter(isShippingLabelOrder);
    const receivedCents = paidOrders.reduce(
      (sum, order) => sum + order.total_cents,
      0,
    );
    const openCents = pendingOrders.reduce(
      (sum, order) => sum + order.total_cents,
      0,
    );

    return {
      paidCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      receivedCents,
      openCents,
      averageTicketCents:
        paidOrders.length > 0
          ? Math.round(receivedCents / paidOrders.length)
          : 0,
      awaitingShipment: awaitingShipment.length,
    };
  }, [orders]);

  const sectionOrders = useMemo(() => {
    if (activeSection === "paid") return orders.filter(isPaidOrder);
    if (activeSection === "pending") return orders.filter(isPendingOrder);
    if (activeSection === "abandoned") return orders.filter(isAbandonedCart);
    if (activeSection === "labels") return orders.filter(isShippingLabelOrder);
    return orders;
  }, [orders, activeSection]);

  const filteredOrders = useMemo(() => {
    const q = normalizeText(query);

    const rows = sectionOrders.filter((order) => {
      const matchesQuery =
        !q ||
        normalizeText(order.id).includes(q) ||
        normalizeText(order.order_number).includes(q) ||
        normalizeText(order.customer_name).includes(q) ||
        normalizeText(order.customer_email).includes(q) ||
        normalizeText(order.customer_phone).includes(q) ||
        normalizeText(order.tracking_code).includes(q);

      const matchesPayment =
        paymentFilter === "all" || order.payment_status === paymentFilter;
      const matchesOrderStatus =
        orderStatusFilter === "all" || order.status === orderStatusFilter;
      const matchesShipping =
        shippingFilter === "all" || order.shipping_status === shippingFilter;
      const matchesOrigin =
        originFilter === "all" || order.origin === originFilter;
      const matchesLabel =
        labelFilter === "all" ||
        (labelFilter === "generated" &&
          (order.shipping_label_generated ||
            Boolean(order.shipping_label_url))) ||
        (labelFilter === "missing" &&
          !order.shipping_label_generated &&
          !order.shipping_label_url);
      const matchesTracking =
        trackingFilter === "all" ||
        (trackingFilter === "with" && Boolean(order.tracking_code)) ||
        (trackingFilter === "without" && !order.tracking_code);

      return (
        matchesQuery &&
        matchesPayment &&
        matchesOrderStatus &&
        matchesShipping &&
        matchesOrigin &&
        matchesLabel &&
        matchesTracking
      );
    });

    const direction = sortDirection === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      if (sortKey === "total_cents")
        return (a.total_cents - b.total_cents) * direction;
      if (sortKey === "created_at")
        return (
          (new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()) *
          direction
        );
      return (
        normalizeText(String(a[sortKey] || "")).localeCompare(
          normalizeText(String(b[sortKey] || "")),
        ) * direction
      );
    });
  }, [
    sectionOrders,
    query,
    paymentFilter,
    orderStatusFilter,
    shippingFilter,
    originFilter,
    labelFilter,
    trackingFilter,
    sortKey,
    sortDirection,
  ]);

  const detailTotals = useMemo(() => {
    const revenue = detailItems.reduce(
      (sum, item) => sum + item.line_total_cents,
      0,
    );
    const cost = detailItems.reduce(
      (sum, item) => sum + item.total_cost_cents,
      0,
    );
    const profit = revenue - cost;

    return {
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      markup: cost > 0 ? (profit / cost) * 100 : 0,
    };
  }, [detailItems]);

  function exportCurrentView() {
    const rows = filteredOrders.map((order) => ({
      pedido: getOrderDisplay(order),
      data: formatDateBR(order.created_at),
      cliente: order.customer_name,
      email: order.customer_email,
      telefone: order.customer_phone,
      origem: originLabel(order.origin),
      pagamento: paymentLabel(order.payment_method),
      status_pagamento: statusLabel(order.payment_status),
      status_pedido: statusLabel(order.status),
      status_envio: statusLabel(order.shipping_status),
      subtotal: moneyBRL(order.subtotal_cents),
      frete: moneyBRL(order.shipping_cents),
      desconto: moneyBRL(order.discount_cents),
      total: moneyBRL(order.total_cents),
      rastreio: order.tracking_code,
      etiqueta: order.shipping_label_url ? "Gerada" : "Sem etiqueta",
    }));

    downloadCsv("controle-vendas-calea.csv", rows);
  }

  return (
    <div className="w-full min-w-0 bg-[#fcfaf6] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-[1500px] space-y-4 md:space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-[#e9e2d6] bg-white p-4 shadow-[0_18px_50px_rgba(43,85,78,0.08)] md:rounded-[34px] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#b08d57] md:text-xs">
                Operação comercial
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-[#2b554e] md:text-3xl">
                Controle de Vendas
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 md:text-sm">
                Pedidos, pagamentos, etiquetas e rastreio em uma visão mais
                limpa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
              <button
                type="button"
                onClick={exportCurrentView}
                disabled={filteredOrders.length === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-xs font-bold text-[#2b554e] shadow-sm hover:bg-[#fcfaf6] disabled:opacity-40 md:h-11 md:px-4 md:text-sm"
              >
                <Download size={15} />
                Exportar
              </button>

              <button
                type="button"
                onClick={loadOrders}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#2b554e] px-3 text-xs font-bold text-white shadow-sm hover:bg-[#244841] md:h-11 md:px-4 md:text-sm"
              >
                <RefreshCcw size={15} />
                Atualizar
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl bg-[#f1f3f2] p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {salesNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={[
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition md:gap-2 md:px-4 md:py-2.5 md:text-sm",
                    isActive
                      ? "bg-white font-black text-[#1f3f3a] shadow-sm"
                      : "font-bold text-slate-500",
                  ].join(" ")}
                >
                  <Icon size={15} />
                  <span className="md:hidden">{item.shortLabel}</span>
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="rounded-full bg-[#eef5f2] px-1.5 py-0.5 text-[10px] text-[#2b554e] md:px-2 md:text-xs">
                    {counters[item.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="-mx-3 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3 md:contents">
            <CompactKpi
              label="Pagas"
              value={cards.paidCount}
              subtitle={moneyBRL(cards.receivedCents)}
            />
            <CompactKpi
              label="Em aberto"
              value={cards.pendingCount}
              subtitle={moneyBRL(cards.openCents)}
            />
            <CompactKpi
              label="Ticket médio"
              value={moneyBRL(cards.averageTicketCents)}
              subtitle="Pedidos pagos"
            />
            <CompactKpi
              label="Aguardando envio"
              value={cards.awaitingShipment}
              subtitle="Separação/envio"
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e9e2d6] bg-white p-3 shadow-[0_14px_36px_rgba(43,85,78,0.06)] md:p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#e9e2d6] bg-[#fcfaf6] px-3 text-slate-400">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="Buscar pedido, cliente ou rastreio"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm font-bold text-[#2b554e] md:px-4"
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Filtros</span>
              <ChevronDown
                size={16}
                className={filtersOpen ? "rotate-180 transition" : "transition"}
              />
            </button>
          </div>

          <div
            className={
              filtersOpen
                ? "mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6"
                : "hidden md:mt-3 md:grid md:gap-3 md:grid-cols-3 xl:grid-cols-6"
            }
          >
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            >
              {paymentStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            >
              {orderStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={shippingFilter}
              onChange={(e) => setShippingFilter(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            >
              {shippingStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            >
              {originOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            >
              <option value="all">Todas etiquetas</option>
              <option value="generated">Com etiqueta</option>
              <option value="missing">Sem etiqueta</option>
            </select>
            <select
              value={trackingFilter}
              onChange={(e) => setTrackingFilter(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            >
              <option value="all">Todos rastreios</option>
              <option value="with">Com rastreio</option>
              <option value="without">Sem rastreio</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={loadOrders}
              className="h-11 rounded-2xl bg-[#2b554e] px-4 text-sm font-bold text-white"
            >
              Aplicar datas
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-4 text-sm font-bold text-slate-600"
            >
              Limpar
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[#e9e2d6] bg-white p-6 text-slate-500 shadow-sm">
            Carregando vendas...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {error}
          </div>
        ) : (
          <section className="overflow-hidden rounded-[30px] border border-[#e9e2d6] bg-white shadow-[0_18px_50px_rgba(43,85,78,0.08)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e9e2d6] p-4 md:px-5">
              <div>
                <h2 className="text-base font-black text-[#2b554e] md:text-lg">
                  Vendas
                </h2>
                <p className="text-xs text-slate-500 md:text-sm">
                  {filteredOrders.length} registro(s)
                </p>
              </div>
              <select
                value={`${sortKey}:${sortDirection}`}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split(":") as [
                    SortKey,
                    SortDirection,
                  ];
                  setSortKey(key);
                  setSortDirection(direction);
                }}
                className="h-10 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-xs font-bold text-slate-600 md:hidden"
              >
                <option value="created_at:desc">Mais recentes</option>
                <option value="created_at:asc">Mais antigas</option>
                <option value="total_cents:desc">Maior valor</option>
                <option value="total_cents:asc">Menor valor</option>
              </select>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl border border-[#e9e2d6] bg-white p-4 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => loadOrderDetail(order)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black text-[#2b554e]">
                          {getOrderDisplay(order)}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                          {formatDateBR(order.created_at)} •{" "}
                          {originLabel(order.origin)}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-black text-[#10233f]">
                        {moneyBRL(order.total_cents)}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl bg-[#fcfaf6] p-3">
                      <p className="truncate text-sm font-black text-slate-800">
                        {order.customer_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {order.customer_email ||
                          order.customer_phone ||
                          "Sem contato"}
                      </p>
                    </div>
                  </button>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge value={order.payment_status} />
                    <Badge value={order.shipping_status} />
                    {order.shipping_label_url ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        Etiqueta gerada
                      </span>
                    ) : null}
                    {order.tracking_code ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                        Rastreio
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => loadOrderDetail(order)}
                      className="h-10 rounded-2xl border border-[#e9e2d6] text-xs font-black text-[#2b554e]"
                    >
                      Detalhes
                    </button>
                    <button
                      type="button"
                      onClick={() => openInKanban(order.id)}
                      className="h-10 rounded-2xl border border-[#e9e2d6] text-xs font-black text-[#2b554e]"
                    >
                      Kanban
                    </button>
                    {isShippingLabelOrder(order) &&
                    !order.shipping_label_url ? (
                      <button
                        type="button"
                        onClick={() => generateShippingLabel(order.id)}
                        disabled={generatingLabelId === order.id}
                        className="h-10 rounded-2xl bg-[#2b554e] text-xs font-black text-white disabled:opacity-50"
                      >
                        {generatingLabelId === order.id
                          ? "Gerando"
                          : "Etiqueta"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => sendTrackingEmail(order)}
                        disabled={
                          !order.tracking_code ||
                          !order.customer_email ||
                          sendingTrackingEmailId === order.id
                        }
                        className="h-10 rounded-2xl border border-[#2b554e] text-xs font-black text-[#2b554e] disabled:opacity-40"
                      >
                        E-mail
                      </button>
                    )}
                  </div>
                </article>
              ))}

              {filteredOrders.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">
                  Nenhuma venda encontrada.
                </div>
              ) : null}
            </div>

            <div className="hidden p-4 lg:block">
              <div className="grid grid-cols-[1.25fr_0.8fr_0.9fr_0.85fr_1.2fr] gap-3 rounded-2xl bg-[#fcfaf6] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                <button
                  type="button"
                  onClick={() => handleSort("order_number")}
                  className="text-left"
                >
                  Pedido / Cliente
                </button>
                <button
                  type="button"
                  onClick={() => handleSort("created_at")}
                  className="text-left"
                >
                  Data / Origem
                </button>
                <div>Status</div>
                <button
                  type="button"
                  onClick={() => handleSort("total_cents")}
                  className="text-left"
                >
                  Valor
                </button>
                <div className="text-right">Ações</div>
              </div>

              <div className="mt-3 space-y-3">
                {filteredOrders.map((order) => {
                  const hasLabel = Boolean(
                    order.shipping_label_url || order.shipping_label_generated,
                  );
                  const needsLabel =
                    isShippingLabelOrder(order) && !order.shipping_label_url;

                  return (
                    <article
                      key={order.id}
                      className="grid grid-cols-[1.25fr_0.8fr_0.9fr_0.85fr_1.2fr] items-center gap-3 rounded-3xl border border-[#e9e2d6] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(43,85,78,0.05)] transition hover:-translate-y-0.5 hover:border-[#d9cdbb] hover:shadow-[0_18px_42px_rgba(43,85,78,0.10)]"
                    >
                      <button
                        type="button"
                        onClick={() => loadOrderDetail(order)}
                        className="min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#2b554e]">
                            {getOrderDisplay(order)}
                          </span>
                          {order.tracking_code ? (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
                              Rastreado
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm font-bold text-slate-800">
                          {order.customer_name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {order.customer_email ||
                            order.customer_phone ||
                            "Sem contato"}
                        </p>
                      </button>

                      <div className="text-sm text-slate-600">
                        <p className="font-bold text-slate-700">
                          {formatDateBR(order.created_at)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {originLabel(order.origin)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-xs font-bold text-slate-400">
                            Pag.
                          </span>
                          <Badge value={order.payment_status} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-xs font-bold text-slate-400">
                            Envio
                          </span>
                          <Badge value={order.shipping_status} />
                        </div>
                      </div>

                      <div>
                        <p className="text-lg font-black text-[#10233f]">
                          {moneyBRL(order.total_cents)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {paymentLabel(order.payment_method)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex w-full justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => loadOrderDetail(order)}
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#e9e2d6] bg-white px-3 text-xs font-black text-[#2b554e] hover:bg-[#fcfaf6]"
                          >
                            <Eye size={14} /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => openInKanban(order.id)}
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#e9e2d6] bg-white px-3 text-xs font-black text-[#2b554e] hover:bg-[#fcfaf6]"
                          >
                            <Truck size={14} /> Kanban
                          </button>
                          {needsLabel ? (
                            <button
                              type="button"
                              onClick={() => generateShippingLabel(order.id)}
                              disabled={generatingLabelId === order.id}
                              className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#2b554e] px-3 text-xs font-black text-white hover:bg-[#244841] disabled:opacity-50"
                            >
                              <PackageCheck size={14} />{" "}
                              {generatingLabelId === order.id
                                ? "Gerando"
                                : "Etiqueta"}
                            </button>
                          ) : null}
                        </div>

                        <div className="flex w-full items-center justify-end gap-2">
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-black",
                              hasLabel
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            {hasLabel ? "Etiqueta ok" : "Sem etiqueta"}
                          </span>
                          <input
                            value={order.tracking_code || ""}
                            onChange={(e) =>
                              setOrders((current) =>
                                current.map((item) =>
                                  item.id === order.id
                                    ? { ...item, tracking_code: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              updateOrderField(order.id, {
                                tracking_code: e.target.value.trim() || null,
                              })
                            }
                            placeholder="Rastreio"
                            className="h-9 w-36 rounded-xl border border-[#e9e2d6] bg-[#fcfaf6] px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#2b554e]"
                          />
                          <button
                            type="button"
                            onClick={() => sendTrackingEmail(order)}
                            disabled={
                              !order.tracking_code ||
                              !order.customer_email ||
                              sendingTrackingEmailId === order.id
                            }
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#2b554e] bg-white px-3 text-xs font-black text-[#2b554e] hover:bg-[#eef5f2] disabled:opacity-40"
                          >
                            <Mail size={14} /> E-mail
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {filteredOrders.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#e9e2d6] bg-[#fcfaf6] p-8 text-center text-sm text-slate-500">
                    Nenhuma venda encontrada com os filtros atuais.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {selectedOrder ? (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 lg:items-stretch lg:justify-end">
            <button
              type="button"
              aria-label="Fechar detalhes"
              className="absolute inset-0"
              onClick={() => setSelectedOrder(null)}
            />

            <aside className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl lg:h-full lg:max-h-none lg:max-w-xl lg:rounded-none">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e9e2d6] bg-white p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b08d57]">
                    Detalhe do pedido
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#2b554e]">
                    {getOrderDisplay(selectedOrder)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => openInKanban(selectedOrder.id)}
                    className="mt-2 rounded-2xl border border-[#e9e2d6] px-3 py-2 text-xs font-black text-[#2b554e]"
                  >
                    Abrir no Kanban
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e9e2d6]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <section className="rounded-3xl bg-[#fcfaf6] p-4">
                  <p className="text-sm font-black text-slate-800">
                    {selectedOrder.customer_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedOrder.customer_email || "Sem e-mail"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedOrder.customer_phone || "Sem telefone"}
                  </p>
                </section>

                <section className="grid grid-cols-2 gap-3">
                  <CompactKpi
                    label="Total"
                    value={moneyBRL(selectedOrder.total_cents)}
                  />
                  <CompactKpi
                    label="Frete"
                    value={moneyBRL(selectedOrder.shipping_cents)}
                  />
                  <CompactKpi
                    label="Desconto"
                    value={moneyBRL(selectedOrder.discount_cents)}
                  />
                  <CompactKpi
                    label="Pagamento"
                    value={paymentLabel(selectedOrder.payment_method)}
                  />
                </section>

                <section className="rounded-3xl border border-[#e9e2d6] p-4">
                  <h4 className="text-sm font-black text-[#2b554e]">Status</h4>
                  <div className="mt-3 grid gap-3">
                    <select
                      value={selectedOrder.payment_status}
                      onChange={(e) =>
                        updateOrderField(selectedOrder.id, {
                          payment_status: e.target.value,
                        })
                      }
                      disabled={savingStatusId === selectedOrder.id}
                      className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm"
                    >
                      {paymentStatusOptions
                        .filter((o) => o.value !== "all")
                        .map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                    </select>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) =>
                        updateOrderField(selectedOrder.id, {
                          status: e.target.value,
                        })
                      }
                      disabled={savingStatusId === selectedOrder.id}
                      className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm"
                    >
                      {orderStatusOptions
                        .filter((o) => o.value !== "all")
                        .map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                    </select>
                    <select
                      value={selectedOrder.shipping_status}
                      onChange={(e) =>
                        updateOrderField(selectedOrder.id, {
                          shipping_status: e.target.value,
                        })
                      }
                      disabled={savingStatusId === selectedOrder.id}
                      className="h-11 rounded-2xl border border-[#e9e2d6] bg-white px-3 text-sm"
                    >
                      {shippingStatusOptions
                        .filter((o) => o.value !== "all")
                        .map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </section>

                <section className="rounded-3xl border border-[#e9e2d6] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-black text-[#2b554e]">Itens</h4>
                    {loadingDetail ? (
                      <span className="text-xs text-slate-400">
                        Carregando...
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-3">
                    {detailItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-[#fcfaf6] p-3"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.sku_code} • {item.variant_name}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-black text-slate-900">
                            {moneyBRL(item.line_total_cents)}
                          </p>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <span>
                            Qtd: <b>{item.quantity}</b>
                          </span>
                          <span>
                            Margem: <b>{formatPercent(item.margin_percent)}</b>
                          </span>
                          <span>
                            Markup: <b>{formatPercent(item.markup_percent)}</b>
                          </span>
                        </div>
                      </div>
                    ))}

                    {!loadingDetail && detailItems.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhum item encontrado.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#eef5f2] p-3 text-sm">
                    <div className="flex justify-between">
                      <span>Receita</span>
                      <b>{moneyBRL(detailTotals.revenue)}</b>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span>CMV</span>
                      <b>{moneyBRL(detailTotals.cost)}</b>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span>Lucro</span>
                      <b>{moneyBRL(detailTotals.profit)}</b>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span>Margem / Markup</span>
                      <b>
                        {formatPercent(detailTotals.margin)} /{" "}
                        {formatPercent(detailTotals.markup)}
                      </b>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

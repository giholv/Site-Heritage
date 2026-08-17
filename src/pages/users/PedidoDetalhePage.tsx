import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Headphones,
  Loader2,
  MapPin,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabase";

type Order = {
  id: string;
  customer_id: string | null;
  order_number: string | null;
  created_at: string;

  status: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  shipping_status: string | null;

  tracking_code: string | null;
  tracking_url: string | null;
  carrier: string | null;

  shipped_at: string | null;
  delivered_at: string | null;

  shipping_delivery_time: number | null;
  shipping_service_code: string | null;
  shipping_service_description: string | null;

  subtotal_cents: number | null;
  shipping_cents: number | null;
  discount_cents: number | null;
  total_cents: number | null;

  payment_method: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  sku_id: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number | null;

  skus:
    | {
        id: string;
        variant_name: string | null;
        title: string | null;
        plating_type: string | null;

        products:
          | {
              id: string;
              name: string;
              slug: string;
            }
          | null;

        sku_images:
          | {
              id: string;
              path: string;
              alt: string | null;
              is_primary: boolean;
              sort_order: number;
            }[]
          | null;
      }
    | null;
};

type TrackingEvent = {
  id: string;
  order_id: string | null;
  tracking_code: string | null;
  status: string | null;
  description: string | null;
  event_date: string | null;
};

type Customer = {
  id: string;
  user_id: string | null;
  email: string | null;
};

type JourneyStep = {
  label: string;
  description: string;
};

export default function PedidoDetalhePage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadOrder() {
      if (!orderId) {
        setError("Pedido inválido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        let customer: Customer | null = null;

        const { data: byUser, error: byUserError } = await supabase
          .from("customers")
          .select("id, user_id, email")
          .eq("user_id", user.id)
          .maybeSingle();

        if (byUserError) throw byUserError;

        customer = byUser as Customer | null;

        if (!customer && user.email) {
          const { data: byEmail, error: byEmailError } = await supabase
            .from("customers")
            .select("id, user_id, email")
            .ilike("email", user.email.trim().toLowerCase())
            .maybeSingle();

          if (byEmailError) throw byEmailError;

          customer = byEmail as Customer | null;
        }

        if (!customer?.id) {
          if (mounted) {
            setError("Não encontramos sua conta de cliente.");
            setOrder(null);
            setItems([]);
            setTrackingEvents([]);
          }

          return;
        }

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            id,
            customer_id,
            order_number,
            created_at,

            status,
            payment_status,
            fulfillment_status,
            shipping_status,

            tracking_code,
            tracking_url,
            carrier,

            shipped_at,
            delivered_at,

            shipping_delivery_time,
            shipping_service_code,
            shipping_service_description,

            subtotal_cents,
            shipping_cents,
            discount_cents,
            total_cents,
            payment_method
          `)
          .eq("id", orderId)
          .eq("customer_id", customer.id)
          .maybeSingle();

        if (orderError) throw orderError;

        if (!orderData) {
          if (mounted) {
            setError("Pedido não encontrado.");
            setOrder(null);
            setItems([]);
            setTrackingEvents([]);
          }

          return;
        }

        const [
          { data: itemsData, error: itemsError },
          { data: trackingData, error: trackingError },
        ] = await Promise.all([
          supabase
            .from("order_items")
            .select(`
              id,
              order_id,
              sku_id,
              unit_price_cents,
              quantity,
              line_total_cents,

              skus:sku_id (
                id,
                variant_name,
                title,
                plating_type,

                products:product_id (
                  id,
                  name,
                  slug
                ),

                sku_images (
                  id,
                  path,
                  alt,
                  is_primary,
                  sort_order
                )
              )
            `)
            .eq("order_id", orderId),

          supabase
            .from("tracking_events")
            .select(`
              id,
              order_id,
              tracking_code,
              status,
              description,
              event_date
            `)
            .eq("order_id", orderId)
            .order("event_date", { ascending: false }),
        ]);

        if (itemsError) throw itemsError;

        if (trackingError) {
          console.error(
            "Erro ao carregar rastreamento:",
            trackingError
          );
        }

        if (!mounted) return;

        setOrder(orderData as Order);
        setItems((itemsData || []) as unknown as OrderItem[]);
        setTrackingEvents(
          (trackingData || []) as TrackingEvent[]
        );
      } catch (err: any) {
        console.error("Erro ao carregar pedido:", err);

        if (mounted) {
          setError(
            err?.message ||
              "Não foi possível carregar os detalhes do pedido."
          );

          setOrder(null);
          setItems([]);
          setTrackingEvents([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      mounted = false;
    };
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen bg-[#FCFAF6]">
      <Header />

      <main className="mx-auto w-full max-w-[1420px] px-4 pb-24 pt-[118px] sm:px-6 md:px-8 md:pt-[150px] lg:px-10">
        <button
          type="button"
          onClick={() => navigate("/minha-conta")}
          className="mb-8 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b554e]/55 transition hover:text-[#2b554e]"
        >
          <ArrowLeft size={15} strokeWidth={1.7} />
          Meus pedidos
        </button>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            message={error}
            onBack={() => navigate("/minha-conta")}
          />
        ) : order ? (
          <OrderExperience
            order={order}
            items={items}
            events={trackingEvents}
            navigate={navigate}
          />
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

function OrderExperience({
  order,
  items,
  events,
  navigate,
}: {
  order: Order;
  items: OrderItem[];
  events: TrackingEvent[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const latestEvent = events[0];

  const stage = getJourneyStage(order);

  const headline = getDeliveryHeadline(order);

  const description = getDeliveryDescription(order);

  return (
    <>
      {/* HERO DO PEDIDO */}
      <section className="border-b border-[#2b554e]/10 pb-10 md:pb-14">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[780px]">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
                {order.order_number ||
                  `Pedido #${order.id
                    .slice(0, 8)
                    .toUpperCase()}`}
              </p>

              <OrderStatusBadge order={order} />
            </div>

            <h1 className="mt-5 font-serif text-[40px] font-normal leading-[0.96] tracking-[-0.035em] text-[#2b554e] sm:text-[50px] md:text-[60px] lg:text-[68px]">
              {headline}
            </h1>

            <p className="mt-5 max-w-[650px] text-[14px] leading-7 text-[#6f6558] sm:text-[15px] md:text-[16px]">
              {description}
            </p>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[12px] text-[#6f6558] sm:text-[13px]">
              <span>
                Pedido realizado em{" "}
                <strong className="font-medium text-[#2b554e]">
                  {formatDateLong(order.created_at)}
                </strong>
              </span>

              {order.shipping_delivery_time ? (
                <span>
                  Prazo contratado{" "}
                  <strong className="font-medium text-[#2b554e]">
                    {order.shipping_delivery_time} dias úteis
                  </strong>
                </span>
              ) : null}
            </div>

            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#2b554e] px-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#214b44]"
              >
                Acompanhar entrega
                <ExternalLink size={14} strokeWidth={1.7} />
              </a>
            )}
          </div>

          {latestEvent && (
            <div className="max-w-[430px] border-l border-[#b08d57]/35 pl-5 lg:mb-1 lg:pl-7">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#b08d57]">
                Última atualização
              </p>

              <p className="mt-2 text-[14px] font-medium leading-6 text-[#2b554e]">
                {latestEvent.description ||
                  translateTrackingStatus(latestEvent.status)}
              </p>

              {latestEvent.event_date && (
                <p className="mt-2 text-[11px] text-[#6f6558]">
                  {formatDateTime(latestEvent.event_date)}
                </p>
              )}
            </div>
          )}
        </div>

        <JourneyTimeline stage={stage} />
      </section>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-16">
        <div className="min-w-0">
          {/* ATUALIZAÇÕES */}
          <TrackingHistory
            events={events}
            shippingStatus={order.shipping_status}
          />

          {/* PRODUTOS */}
          <section className="mt-14 md:mt-16">
            <div className="flex items-end justify-between gap-5 border-b border-[#2b554e]/10 pb-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
                  Seu pedido
                </p>

                <h2 className="mt-2 font-serif text-[30px] font-normal text-[#2b554e] md:text-[38px]">
                  O que está chegando
                </h2>
              </div>

              <p className="text-xs text-[#6f6558]">
                {items.length}{" "}
                {items.length === 1 ? "item" : "itens"}
              </p>
            </div>

            <div className="divide-y divide-[#2b554e]/10">
              {items.map((item) => {
                const image = getItemImage(item);
                const name = getItemName(item);
                const variant = getItemVariant(item);
                const slug = item.skus?.products?.slug;

                const total =
                  item.line_total_cents ??
                  item.unit_price_cents * item.quantity;

                return (
                  <article
                    key={item.id}
                    className="grid grid-cols-[82px_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6 md:py-8"
                  >
                    <button
                      type="button"
                      disabled={!slug}
                      onClick={() =>
                        slug && navigate(`/produto/${slug}`)
                      }
                      className="aspect-[3/4] w-full overflow-hidden bg-[#f2eee7] disabled:cursor-default"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={name}
                          className="h-full w-full object-cover transition duration-500 hover:scale-[1.025]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#b08d57]">
                          <Package size={22} strokeWidth={1.5} />
                        </div>
                      )}
                    </button>

                    <div className="flex min-w-0 flex-col justify-between py-1">
                      <div>
                        <button
                          type="button"
                          disabled={!slug}
                          onClick={() =>
                            slug &&
                            navigate(`/produto/${slug}`)
                          }
                          className="text-left font-serif text-[20px] leading-tight text-[#2b554e] transition hover:text-[#b08d57] disabled:cursor-default sm:text-[24px]"
                        >
                          {name}
                        </button>

                        <p className="mt-2 text-xs leading-5 text-[#6f6558] sm:text-sm">
                          {variant || "Peça Caléa"}
                        </p>

                        <p className="mt-1 text-xs text-[#6f6558]">
                          Quantidade {item.quantity}
                        </p>
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-4">
                        <p className="text-sm font-medium text-[#2b554e]">
                          {formatBRL(total)}
                        </p>

                        {slug && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/produto/${slug}`)
                            }
                            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b08d57] transition hover:text-[#2b554e]"
                          >
                            Ver peça
                            <ChevronRight
                              size={13}
                              strokeWidth={1.6}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* COLUNA LATERAL */}
        <aside className="lg:sticky lg:top-[130px] lg:h-fit">
          <OrderSummary order={order} />

          <DeliveryDetails order={order} />

          <SupportBlock />
        </aside>
      </div>
    </>
  );
}

function JourneyTimeline({
  stage,
}: {
  stage: number;
}) {
  const steps: JourneyStep[] = [
    {
      label: "Confirmado",
      description: "Pagamento aprovado",
    },
    {
      label: "Preparando",
      description: "Separando suas peças",
    },
    {
      label: "A caminho",
      description: "Pedido em transporte",
    },
    {
      label: "Entregue",
      description: "Entrega concluída",
    },
  ];

  return (
    <>
      {/* MOBILE */}
      <div className="mt-10 space-y-0 md:hidden">
        {steps.map((step, index) => {
          const done = index < stage;
          const current = index === stage;

          return (
            <div key={step.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <TimelineDot
                  done={done}
                  current={current}
                  index={index}
                />

                {index < steps.length - 1 && (
                  <div
                    className={[
                      "h-11 w-px",
                      index < stage
                        ? "bg-[#2b554e]"
                        : "bg-[#d9d2c7]",
                    ].join(" ")}
                  />
                )}
              </div>

              <div className="pb-5 pt-1">
                <p
                  className={[
                    "text-sm font-medium",
                    done || current
                      ? "text-[#2b554e]"
                      : "text-[#9b948a]",
                  ].join(" ")}
                >
                  {step.label}
                </p>

                <p className="mt-1 text-[11px] text-[#6f6558]">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP */}
      <div className="mt-12 hidden md:grid md:grid-cols-4">
        {steps.map((step, index) => {
          const done = index < stage;
          const current = index === stage;

          return (
            <div
              key={step.label}
              className="relative text-center"
            >
              {index < steps.length - 1 && (
                <div
                  className={[
                    "absolute left-1/2 right-[-50%] top-4 h-px",
                    index < stage
                      ? "bg-[#2b554e]"
                      : "bg-[#d9d2c7]",
                  ].join(" ")}
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <TimelineDot
                  done={done}
                  current={current}
                  index={index}
                />

                <p
                  className={[
                    "mt-3 text-xs font-medium",
                    done || current
                      ? "text-[#2b554e]"
                      : "text-[#9b948a]",
                  ].join(" ")}
                >
                  {step.label}
                </p>

                <p className="mt-1 text-[10px] text-[#6f6558]">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TimelineDot({
  done,
  current,
  index,
}: {
  done: boolean;
  current: boolean;
  index: number;
}) {
  return (
    <div
      className={[
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px]",
        done
          ? "border-[#2b554e] bg-[#2b554e] text-white"
          : current
            ? "border-[#b08d57] bg-[#FCFAF6] text-[#b08d57] ring-4 ring-[#b08d57]/10"
            : "border-[#d9d2c7] bg-[#FCFAF6] text-[#9b948a]",
      ].join(" ")}
    >
      {done ? (
        <Check size={14} strokeWidth={2} />
      ) : current ? (
        <span className="h-2 w-2 rounded-full bg-[#b08d57]" />
      ) : (
        index + 1
      )}
    </div>
  );
}

function TrackingHistory({
  events,
  shippingStatus,
}: {
  events: TrackingEvent[];
  shippingStatus: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleEvents = expanded
    ? events
    : events.slice(0, 3);

  return (
    <section>
      <div className="border-b border-[#2b554e]/10 pb-5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
          Rastreamento
        </p>

        <h2 className="mt-2 font-serif text-[30px] font-normal text-[#2b554e] md:text-[38px]">
          Últimas atualizações
        </h2>
      </div>

      {events.length > 0 ? (
        <div className="mt-2">
          {visibleEvents.map((event, index) => (
            <div
              key={event.id}
              className="grid grid-cols-[22px_minmax(0,1fr)] gap-4 border-b border-[#2b554e]/8 py-5 last:border-b-0"
            >
              <div className="flex flex-col items-center">
                <span
                  className={[
                    "mt-1.5 h-2.5 w-2.5 rounded-full",
                    index === 0
                      ? "bg-[#b08d57]"
                      : "bg-[#2b554e]/30",
                  ].join(" ")}
                />

                {index < visibleEvents.length - 1 && (
                  <span className="mt-2 h-full w-px bg-[#2b554e]/10" />
                )}
              </div>

              <div>
                <p className="text-sm font-medium leading-6 text-[#2b554e]">
                  {event.description ||
                    translateTrackingStatus(event.status)}
                </p>

                {event.event_date && (
                  <p className="mt-1 text-[11px] text-[#6f6558]">
                    {formatDateTime(event.event_date)}
                  </p>
                )}
              </div>
            </div>
          ))}

          {events.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b554e]"
            >
              {expanded
                ? "Ocultar histórico"
                : "Ver histórico completo"}

              <ChevronDown
                size={14}
                className={
                  expanded
                    ? "rotate-180 transition"
                    : "transition"
                }
              />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 border-l border-[#b08d57]/35 pl-5">
          <p className="text-sm font-medium text-[#2b554e]">
            {getNoTrackingMessage(shippingStatus)}
          </p>

          <p className="mt-2 max-w-[580px] text-xs leading-5 text-[#6f6558]">
            As movimentações da transportadora aparecerão aqui
            automaticamente assim que estiverem disponíveis.
          </p>
        </div>
      )}
    </section>
  );
}

function OrderSummary({
  order,
}: {
  order: Order;
}) {
  return (
    <section className="border-t border-[#2b554e]/10 py-7 lg:border-t-0 lg:pt-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
        Resumo
      </p>

      <h2 className="mt-2 font-serif text-[27px] text-[#2b554e]">
        Seu pedido
      </h2>

      <div className="mt-6 space-y-3 text-sm">
        <SummaryLine
          label="Subtotal"
          value={formatBRL(order.subtotal_cents)}
        />

        <SummaryLine
          label="Frete"
          value={formatBRL(order.shipping_cents)}
        />

        {Number(order.discount_cents || 0) > 0 && (
          <SummaryLine
            label="Desconto"
            value={`- ${formatBRL(
              order.discount_cents
            )}`}
            accent
          />
        )}
      </div>

      <div className="my-5 h-px bg-[#2b554e]/10" />

      <div className="flex items-end justify-between gap-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f6558]">
          Total
        </span>

        <span className="font-serif text-[29px] leading-none text-[#2b554e]">
          {formatBRL(order.total_cents)}
        </span>
      </div>

      <p className="mt-5 text-xs text-[#6f6558]">
        {translatePaymentMethod(order.payment_method)} ·{" "}
        {translatePaymentStatus(order.payment_status)}
      </p>
    </section>
  );
}

function DeliveryDetails({
  order,
}: {
  order: Order;
}) {
  const [copied, setCopied] = useState(false);

  async function copyTracking() {
    if (!order.tracking_code) return;

    await navigator.clipboard.writeText(
      order.tracking_code
    );

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  const hasDeliveryInfo =
    order.carrier ||
    order.tracking_code ||
    order.shipping_service_description ||
    order.shipped_at;

  if (!hasDeliveryInfo) return null;

  return (
    <section className="mt-7 border-t border-[#2b554e]/10 pt-7">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
        Entrega
      </p>

      <div className="mt-5 space-y-5">
        {order.carrier && (
          <DeliveryRow
            icon={<Truck size={16} />}
            label="Transportadora"
            value={order.carrier}
          />
        )}

        {order.shipping_service_description && (
          <DeliveryRow
            icon={<Package size={16} />}
            label="Serviço"
            value={order.shipping_service_description}
          />
        )}

        {order.shipped_at && (
          <DeliveryRow
            icon={<Clock3 size={16} />}
            label="Enviado em"
            value={formatDateLong(order.shipped_at)}
          />
        )}

        {order.tracking_code && (
          <div>
            <DeliveryRow
              icon={<MapPin size={16} />}
              label="Código de rastreio"
              value={order.tracking_code}
            />

            <button
              type="button"
              onClick={copyTracking}
              className="mt-3 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b08d57]"
            >
              {copied ? (
                <>
                  <Check size={13} />
                  Copiado
                </>
              ) : (
                <>
                  <Copy size={13} />
                  Copiar código
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function DeliveryRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-[#b08d57]">
        {icon}
      </div>

      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6f6558]">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-[#2b554e]">
          {value}
        </p>
      </div>
    </div>
  );
}

function SupportBlock() {
  return (
    <section className="mt-7 border-t border-[#2b554e]/10 pt-7">
      <div className="flex items-start gap-3">
        <Headphones
          size={18}
          className="mt-0.5 shrink-0 text-[#b08d57]"
        />

        <div>
          <p className="font-serif text-[19px] text-[#2b554e]">
            Precisa de ajuda?
          </p>

          <p className="mt-2 text-xs leading-5 text-[#6f6558]">
            Fale com a Caléa sobre seu pedido.
          </p>

          <a
            href="https://wa.me/5511997946257"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#2b554e]"
          >
            Falar com a Caléa
            <ChevronRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}

function OrderStatusBadge({
  order,
}: {
  order: Order;
}) {
  const shipping = String(
    order.shipping_status || ""
  ).toLowerCase();

  if (
    shipping === "lost" ||
    shipping === "returned"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8e5e5] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9c5555]">
        <XCircle size={12} />
        Ocorrência
      </span>
    );
  }

  if (
    shipping === "delivered" ||
    order.status === "delivered"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ed] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2b554e]">
        <CheckCircle size={12} />
        Entregue
      </span>
    );
  }

  if (
    ["posted", "in_transit"].includes(shipping) ||
    order.status === "shipped"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ed] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2b554e]">
        <Truck size={12} />
        Em trânsito
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7efe3] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8f7249]">
      <Clock3 size={12} />
      {translateOrderStatus(order.status)}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center border-y border-[#2b554e]/10">
      <div className="flex items-center gap-3 text-[#2b554e]">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm">
          Carregando seu pedido...
        </span>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="border-y border-[#2b554e]/10 py-16 text-center">
      <XCircle
        size={28}
        className="mx-auto text-[#9c5555]"
      />

      <h2 className="mt-5 font-serif text-[30px] text-[#2b554e]">
        Não conseguimos abrir este pedido
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6f6558]">
        {message}
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#2b554e] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
      >
        <ArrowLeft size={14} />
        Voltar aos pedidos
      </button>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-5">
      <span className="text-[#6f6558]">
        {label}
      </span>

      <span
        className={
          accent
            ? "font-medium text-[#b08d57]"
            : "font-medium text-[#2b554e]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function getJourneyStage(order: Order) {
  const payment = String(
    order.payment_status || ""
  ).toLowerCase();

  const fulfillment = String(
    order.fulfillment_status || ""
  ).toLowerCase();

  const shipping = String(
    order.shipping_status || ""
  ).toLowerCase();

  if (
    shipping === "delivered" ||
    order.status === "delivered"
  ) {
    return 3;
  }

  if (
    ["posted", "in_transit"].includes(shipping) ||
    order.status === "shipped"
  ) {
    return 2;
  }

  if (
    [
      "picking",
      "packed",
      "ready_to_ship",
    ].includes(fulfillment) ||
    shipping === "awaiting_post" ||
    order.status === "processing"
  ) {
    return 1;
  }

  if (
    ["paid", "authorized"].includes(payment) ||
    order.status === "paid"
  ) {
    return 0;
  }

  return 0;
}

function getDeliveryHeadline(order: Order) {
  const shipping = String(
    order.shipping_status || ""
  ).toLowerCase();

  if (
    shipping === "delivered" ||
    order.status === "delivered"
  ) {
    return "Sua Caléa chegou.";
  }

  if (shipping === "in_transit") {
    return "Sua Caléa está a caminho.";
  }

  if (shipping === "posted") {
    return "Seu pedido já está com a transportadora.";
  }

  if (shipping === "awaiting_post") {
    return "Tudo pronto para o envio.";
  }

  if (
    shipping === "lost" ||
    shipping === "returned"
  ) {
    return "Vamos cuidar desta entrega.";
  }

  if (
    order.fulfillment_status === "picking" ||
    order.fulfillment_status === "packed" ||
    order.status === "processing"
  ) {
    return "Estamos preparando suas peças.";
  }

  if (
    order.payment_status === "paid" ||
    order.status === "paid"
  ) {
    return "Pedido confirmado.";
  }

  return "Recebemos seu pedido.";
}

function getDeliveryDescription(order: Order) {
  const shipping = String(
    order.shipping_status || ""
  ).toLowerCase();

  if (
    shipping === "delivered" ||
    order.status === "delivered"
  ) {
    return order.delivered_at
      ? `Entrega concluída em ${formatDateLong(
          order.delivered_at
        )}.`
      : "A entrega foi concluída.";
  }

  if (shipping === "in_transit") {
    return "Seu pedido está em trânsito. Acompanhe abaixo as atualizações mais recentes da transportadora.";
  }

  if (shipping === "posted") {
    return "Seu pedido foi postado e já começou o caminho até você.";
  }

  if (shipping === "awaiting_post") {
    return "As peças já estão preparadas e aguardando coleta ou postagem.";
  }

  if (
    shipping === "lost" ||
    shipping === "returned"
  ) {
    return "O rastreamento registrou uma ocorrência. Entre em contato com a Caléa para acompanharmos isso com você.";
  }

  if (
    order.fulfillment_status === "picking" ||
    order.fulfillment_status === "packed" ||
    order.status === "processing"
  ) {
    return "Suas peças estão sendo separadas e preparadas para seguir viagem.";
  }

  return "Pagamento aprovado. Agora começamos a preparar suas peças.";
}

function getNoTrackingMessage(
  shippingStatus?: string | null
) {
  const status = String(
    shippingStatus || ""
  ).toLowerCase();

  if (status === "awaiting_post") {
    return "Seu pedido está pronto para postagem.";
  }

  if (status === "posted") {
    return "Seu pedido já foi postado.";
  }

  if (status === "in_transit") {
    return "Seu pedido está em trânsito.";
  }

  if (status === "delivered") {
    return "Seu pedido foi entregue.";
  }

  return "O rastreamento ainda não começou.";
}

function translateTrackingStatus(
  status?: string | null
) {
  const map: Record<string, string> = {
    awaiting_post: "Aguardando postagem",
    posted: "Pedido postado",
    in_transit: "Pedido em trânsito",
    delivered: "Pedido entregue",
    returned: "Pedido retornando ao remetente",
    lost: "Ocorrência no transporte",
  };

  return (
    map[String(status || "").toLowerCase()] ||
    status ||
    "Atualização de rastreamento"
  );
}

function translateOrderStatus(
  status?: string | null
) {
  const map: Record<string, string> = {
    draft: "Aberto",
    pending_payment: "Aguardando pagamento",
    paid: "Confirmado",
    processing: "Em preparação",
    shipped: "Enviado",
    delivered: "Entregue",
    canceled: "Cancelado",
    refunded: "Reembolsado",
  };

  return (
    map[String(status || "").toLowerCase()] ||
    status ||
    "—"
  );
}

function translatePaymentStatus(
  status?: string | null
) {
  const map: Record<string, string> = {
    pending: "Aguardando pagamento",
    authorized: "Pagamento autorizado",
    paid: "Pagamento aprovado",
    failed: "Pagamento recusado",
    refunded: "Pagamento reembolsado",
    chargeback: "Pagamento contestado",
    cancelled: "Pagamento cancelado",
  };

  return (
    map[String(status || "").toLowerCase()] ||
    status ||
    "—"
  );
}

function translatePaymentMethod(
  method?: string | null
) {
  const map: Record<string, string> = {
    pix: "Pix",
    boleto: "Boleto",
    card: "Cartão",
    credit_card: "Cartão de crédito",
    debit_card: "Cartão de débito",
  };

  return (
    map[String(method || "").toLowerCase()] ||
    method ||
    "Pagamento"
  );
}

function getItemName(item: OrderItem) {
  return (
    item.skus?.products?.name ||
    item.skus?.title ||
    "Produto Caléa"
  );
}

function getItemVariant(item: OrderItem) {
  return (
    item.skus?.variant_name ||
    item.skus?.plating_type ||
    ""
  );
}

function getItemImage(item: OrderItem) {
  const images = item.skus?.sku_images || [];

  const primary =
    images.find((image) => image.is_primary) ||
    [...images].sort(
      (a, b) =>
        Number(a.sort_order ?? 0) -
        Number(b.sort_order ?? 0)
    )[0];

  if (!primary?.path) return "";

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(primary.path);

  return data.publicUrl;
}

function formatBRL(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value ?? 0) / 100);
}

function formatDateLong(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
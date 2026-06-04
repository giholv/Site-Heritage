import { useEffect, useState } from "react";
import { ArrowLeft, Package, CreditCard, Truck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabase";

const CALEA = {
  bg: "#FCFAF6",
  line: "#e9e2d6",
  primary: "#2b554e",
  accent: "#b08d57",
  textSoft: "#6f6558",
};

export default function PedidoDetalhePage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;

      try {
        setLoading(true);
        setError(null);

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            created_at,
            status,
            payment_status,
            subtotal_cents,
            shipping_cents,
            discount_cents,
            total_cents,
            payment_method
          `)
          .eq("id", orderId)
          .single();

        if (orderError) throw orderError;

        const { data: itemsData, error: itemsError } = await supabase
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
          .eq("order_id", orderId);

        if (itemsError) throw itemsError;

        setOrder(orderData);
        setItems(itemsData || []);
      } catch (err: any) {
        console.error("Erro ao carregar pedido:", err);
        setError("Não foi possível carregar os detalhes do pedido.");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  return (
    <div className="min-h-screen" style={{ background: CALEA.bg }}>
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-[130px] md:pt-[220px]">
        <button
          type="button"
          onClick={() => navigate("/minha-conta")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#2b554e]"
        >
          <ArrowLeft size={16} />
          Voltar para minha conta
        </button>

        {loading ? (
          <div className="rounded-[28px] border bg-white p-8 text-[#2b554e]">
            Carregando pedido...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border bg-white p-8 text-red-600">
            {error}
          </div>
        ) : !order ? (
          <div className="rounded-[28px] border bg-white p-8 text-[#2b554e]">
            Pedido não encontrado.
          </div>
        ) : (
          <section className="rounded-[28px] border bg-white p-5 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#b08d57]">
                  Detalhes do pedido
                </p>

                <h1 className="mt-2 text-[30px] font-normal text-[#2b554e] md:text-[42px]">
                  {order.order_number || `Pedido #${order.id.slice(0, 8).toUpperCase()}`}
                </h1>

                <p className="mt-2 text-sm text-[#6f6558]">
                  Realizado em {formatDate(order.created_at)}
                </p>
              </div>

              <div className="rounded-full bg-[#e7f1ed] px-4 py-2 text-sm font-medium text-[#2b554e]">
                {translateOrderStatus(order.status)}
              </div>
            </div>

            <div className="grid gap-4 border-b py-6 md:grid-cols-3">
              <InfoBox
                icon={<CreditCard size={18} />}
                label="Pagamento"
                value={translatePaymentMethod(order.payment_method)}
              />

              <InfoBox
                icon={<Truck size={18} />}
                label="Frete"
                value={formatBRL(order.shipping_cents)}
              />

              <InfoBox
                icon={<Package size={18} />}
                label="Total"
                value={formatBRL(order.total_cents)}
              />
            </div>

            <div className="py-6">
              <h2 className="text-xl font-medium text-[#2b554e]">
                Produtos
              </h2>

              <div className="mt-4 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-[20px] border bg-[#FCFAF6] p-4"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-[16px] bg-white text-[#b08d57]">
                      <Package size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#2b554e]">
                        {item.skus?.products?.name || item.skus?.title || "Produto"}
                      </p>

                      <p className="mt-1 text-sm text-[#6f6558]">
                        {item.skus?.variant_name || item.skus?.plating_type || ""}
                        {item.skus?.variant_name || item.skus?.plating_type ? " • " : ""}
                        Qtd. {item.quantity}
                      </p>
                    </div>

                    <p className="text-sm font-medium text-[#2b554e]">
                      {formatBRL(item.line_total_cents ?? item.unit_price_cents * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-3 text-sm">
                <SummaryLine label="Subtotal" value={formatBRL(order.subtotal_cents)} />
                <SummaryLine label="Frete" value={formatBRL(order.shipping_cents)} />
                <SummaryLine label="Desconto" value={`- ${formatBRL(order.discount_cents)}`} />
                <SummaryLine label="Total" value={formatBRL(order.total_cents)} strong />
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function InfoBox({ icon, label, value }: any) {
  return (
    <div className="rounded-[20px] border border-[#e9e2d6] bg-[#FCFAF6] p-4">
      <div className="flex items-center gap-2 text-[#b08d57]">
        {icon}
        <span className="text-xs uppercase tracking-[0.14em]">{label}</span>
      </div>

      <p className="mt-2 font-medium text-[#2b554e]">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, strong }: any) {
  return (
    <div className="flex justify-between gap-4">
      <span className={strong ? "font-semibold text-[#2b554e]" : "text-[#6f6558]"}>
        {label}
      </span>

      <span className={strong ? "font-semibold text-[#2b554e]" : "text-[#2b554e]"}>
        {value}
      </span>
    </div>
  );
}

function formatBRL(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value ?? 0) / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function translateOrderStatus(status?: string | null) {
  const map: Record<string, string> = {
    draft: "Aberto",
    pending_payment: "Aguardando pagamento",
    processing: "Em separação",
    shipped: "Enviado",
    paid: "Pago",
    delivered: "Entregue",
    canceled: "Cancelado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };

  return map[(status || "").toLowerCase()] || status || "—";
}

function translatePaymentMethod(method?: string | null) {
  const map: Record<string, string> = {
    pix: "Pix",
    boleto: "Boleto",
    card: "Cartão",
    credit_card: "Cartão",
    debit_card: "Débito",
  };

  return map[(method || "").toLowerCase()] || method || "Pagamento";
}
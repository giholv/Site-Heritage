import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type SkuOption = {
  id: string;
  sku_code: string;
  variant_name: string | null;
  product_name: string;
  price_cents: number;
};

type ItemForm = {
  sku_id: string;
  qty: number;
  unit_price_cents: number;
};

const EXTERNAL_CUSTOMER_ID = "eb7f3257-8420-440d-8636-882135c0c918";

function moneyToCents(value: string) {
  const clean = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(clean || 0);
  return Math.round(n * 100);
}

function centsToBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function AdminExternalSalesPage() {
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [items, setItems] = useState<ItemForm[]>([
    { sku_id: "", qty: 1, unit_price_cents: 0 },
  ]);

  const [form, setForm] = useState({
    sales_channel: "whatsapp",
    status: "paid",
    payment_method: "pix",
    seller_name: "",
    external_customer_name: "",
    external_customer_phone: "",
    external_customer_email: "",
    external_customer_document: "",
    discount_brl: "0,00",
    shipping_brl: "0,00",
    notes: "",
  });

  useEffect(() => {
    loadSkus();
  }, []);

  async function loadSkus() {
    const { data, error } = await supabase
      .from("skus")
      .select(`
        id,
        sku_code,
        variant_name,
        price_cents,
        products!inner(name)
      `)
      .eq("active", true)
      .order("sku_code");

    if (error) {
      console.error(error);
      return;
    }

    const parsed: SkuOption[] = (data || []).map((row: any) => ({
      id: row.id,
      sku_code: row.sku_code,
      variant_name: row.variant_name,
      product_name: row.products?.name ?? "Produto",
      price_cents: row.price_cents ?? 0,
    }));

    setSkus(parsed);
  }

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { sku_id: "", qty: 1, unit_price_cents: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotalCents = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty * item.unit_price_cents, 0);
  }, [items]);

  const discountCents = useMemo(() => moneyToCents(form.discount_brl), [form.discount_brl]);
  const shippingCents = useMemo(() => moneyToCents(form.shipping_brl), [form.shipping_brl]);

  const totalCents = useMemo(() => {
    return Math.max(0, subtotalCents - discountCents + shippingCents);
  }, [subtotalCents, discountCents, shippingCents]);

  async function handleSave() {
    try {
      setLoading(true);

      const validItems = items.filter((i) => i.sku_id && i.qty > 0);

      if (!form.external_customer_name.trim()) {
        throw new Error("Informe o nome do cliente.");
      }

      if (!validItems.length) {
        throw new Error("Adicione ao menos 1 item.");
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;

      const orderPayload = {
        customer_id: EXTERNAL_CUSTOMER_ID,
        origin: "external",
        sales_channel: form.sales_channel,
        status: form.status,
        seller_name: form.seller_name || null,
        external_customer_name: form.external_customer_name,
        external_customer_phone: form.external_customer_phone || null,
        external_customer_email: form.external_customer_email || null,
        external_customer_document: form.external_customer_document || null,
        notes: form.notes || null,
        subtotal_cents: subtotalCents,
        discount_cents: discountCents,
        shipping_cents: shippingCents,
        total_cents: totalCents,
        payment_method: form.payment_method,
        created_by: userId,
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();

      if (orderError) throw orderError;

      const orderItemsPayload = validItems.map((item) => ({
        order_id: order.id,
        sku_id: item.sku_id,
        quantity: item.qty,
        unit_price_cents: item.unit_price_cents,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      alert("Venda externa criada com sucesso.");

      setForm({
        sales_channel: "whatsapp",
        status: "paid",
        payment_method: "pix",
        seller_name: "",
        external_customer_name: "",
        external_customer_phone: "",
        external_customer_email: "",
        external_customer_document: "",
        discount_brl: "0,00",
        shipping_brl: "0,00",
        notes: "",
      });

      setItems([{ sku_id: "", qty: 1, unit_price_cents: 0 }]);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar venda externa.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 bg-[#FCFAF6] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#2b554e]">Vendas externas</h1>
          <p className="text-sm text-neutral-600">
            Cadastre pedidos feitos fora do site.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Canal</label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.sales_channel}
                  onChange={(e) => setForm({ ...form, sales_channel: e.target.value })}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="store">Loja</option>
                  <option value="phone">Telefone</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Status</label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Rascunho</option>
                  <option value="pending_payment">Pendente pagamento</option>
                  <option value="paid">Pago</option>
                  <option value="processing">Em processamento</option>
                  <option value="shipped">Enviado</option>
                  <option value="delivered">Entregue</option>
                  <option value="canceled">Cancelado</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Forma de pagamento</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Vendedor</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.seller_name}
                  onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Nome do cliente</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.external_customer_name}
                  onChange={(e) =>
                    setForm({ ...form, external_customer_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Telefone</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.external_customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, external_customer_phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">E-mail</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.external_customer_email}
                  onChange={(e) =>
                    setForm({ ...form, external_customer_email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Documento</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.external_customer_document}
                  onChange={(e) =>
                    setForm({ ...form, external_customer_document: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="border-t pt-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Itens</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  Adicionar item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid md:grid-cols-12 gap-3">
                    <div className="md:col-span-6">
                      <select
                        className="w-full rounded-xl border px-3 py-2"
                        value={item.sku_id}
                        onChange={(e) => {
                          const skuId = e.target.value;
                          const sku = skus.find((s) => s.id === skuId);

                          updateItem(index, {
                            sku_id: skuId,
                            unit_price_cents: sku?.price_cents ?? 0,
                          });
                        }}
                      >
                        <option value="">Selecione um SKU</option>
                        {skus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            {sku.sku_code} - {sku.product_name}
                            {sku.variant_name ? ` - ${sku.variant_name}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-xl border px-3 py-2"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(index, { qty: Number(e.target.value) || 1 })
                        }
                      />
                    </div>

                    <div className="md:col-span-3">
                      <input
                        className="w-full rounded-xl border px-3 py-2"
                        value={(item.unit_price_cents / 100).toFixed(2).replace(".", ",")}
                        onChange={(e) =>
                          updateItem(index, {
                            unit_price_cents: moneyToCents(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full rounded-xl border px-3 py-2"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-5">
              <h2 className="font-medium mb-3">Observações</h2>
              <textarea
                className="w-full rounded-xl border px-3 py-2 min-h-[100px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 h-fit">
            <h2 className="font-medium">Resumo</h2>

            <div>
              <label className="block text-sm mb-1">Desconto</label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.discount_brl}
                onChange={(e) => setForm({ ...form, discount_brl: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Frete</label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.shipping_brl}
                onChange={(e) => setForm({ ...form, shipping_brl: e.target.value })}
              />
            </div>

            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{centsToBRL(subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto</span>
                <span>- {centsToBRL(discountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>{centsToBRL(shippingCents)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-3">
                <span>Total</span>
                <span>{centsToBRL(totalCents)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full rounded-xl bg-[#2b554e] text-white px-4 py-3 font-medium disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar venda"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
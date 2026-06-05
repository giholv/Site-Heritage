import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type DiscountType = "percent" | "fixed" | "free_shipping";

type MarketingPartner = {
  id: string;
  name: string;
  type: string;
  active: boolean;
};

type Coupon = {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  discount_type: DiscountType;
  percent: number | null;
  amount_cents: number | null;
  max_discount_cents: number | null;
  starts_at: string | null;
  ends_at: string | null;
  min_subtotal_cents: number;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  first_purchase_only: boolean;
  stackable: boolean;
  active: boolean;
  created_at: string;

  partner_id: string | null;
  campaign_name: string | null;
  source_channel: string | null;
  internal_notes: string | null;
  free_shipping: boolean;

  marketing_partners?: {
    name: string;
    type: string;
  } | null;
};

type CouponForm = {
  code: string;
  name: string;
  description: string;
  discount_type: DiscountType;
  percent: string;
  amount_reais: string;
  max_discount_reais: string;
  min_subtotal_reais: string;
  max_uses: string;
  max_uses_per_customer: string;
  starts_at: string;
  ends_at: string;
  first_purchase_only: boolean;
  stackable: boolean;
  active: boolean;


  partner_id: string;
  campaign_name: string;
  source_channel: string;
  internal_notes: string;
  free_shipping: boolean;
};

const EMPTY_FORM: CouponForm = {
  code: "",
  name: "",
  description: "",
  discount_type: "percent",
  percent: "",
  amount_reais: "",
  max_discount_reais: "",
  min_subtotal_reais: "",
  max_uses: "",
  max_uses_per_customer: "",
  starts_at: "",
  ends_at: "",
  first_purchase_only: false,
  stackable: false,
  active: true,

  partner_id: "",
  campaign_name: "",
  source_channel: "",
  internal_notes: "",
  free_shipping: false,
};

function moneyBRLFromCents(cents: number | null | undefined) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function reaisToCents(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(normalized || 0);

  if (Number.isNaN(number)) return 0;

  return Math.round(number * 100);
}

function centsToReaisInput(cents: number | null | undefined) {
  if (!cents) return "";
  return String((cents / 100).toFixed(2)).replace(".", ",");
}

function dateTimeToInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function inputToIso(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatDate(value: string | null) {
  if (!value) return "Sem validade";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function discountLabel(coupon: Coupon) {
  let label = "";

  if (coupon.discount_type === "percent") {
    label = `${coupon.percent || 0}%`;
  }

  if (coupon.discount_type === "fixed") {
    label = moneyBRLFromCents(coupon.amount_cents);
  }

  if (coupon.free_shipping) {
    label = label ? `${label} + Frete grátis` : "Frete grátis";
  }

  return label || "-";
}

function statusLabel(coupon: Coupon) {
  if (!coupon.active) return "Inativo";

  if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
    return "Agendado";
  }

  if (coupon.ends_at && new Date(coupon.ends_at) < new Date()) {
    return "Expirado";
  }

  return "Ativo";
}

function statusClass(coupon: Coupon) {
  const status = statusLabel(coupon);

  if (status === "Ativo") return "bg-emerald-100 text-emerald-700";
  if (status === "Agendado") return "bg-sky-100 text-sky-700";
  if (status === "Expirado") return "bg-amber-100 text-amber-700";

  return "bg-zinc-100 text-zinc-600";
}

function channelLabel(channel: string | null) {
  const map: Record<string, string> = {
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    site: "Site",
    evento: "Evento",
    influencer: "Influencer",
    trafego_pago: "Tráfego pago",
    indicacao: "Indicação",
    outro: "Outro",
  };

  if (!channel) return "";
  return map[channel] || channel;
}

export default function AdminCupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [partners, setPartners] = useState<MarketingPartner[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return coupons;

    return coupons.filter((coupon) => {
      return (
        coupon.code.toLowerCase().includes(term) ||
        (coupon.name || "").toLowerCase().includes(term) ||
        (coupon.description || "").toLowerCase().includes(term) ||
        (coupon.campaign_name || "").toLowerCase().includes(term) ||
        (coupon.marketing_partners?.name || "").toLowerCase().includes(term)
      );
    });
  }, [coupons, search]);

  async function loadPartners() {
    const { data, error } = await supabase
      .from("marketing_partners")
      .select("id, name, type, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar parcerias:", error);
      setPartners([]);
      return;
    }

    setPartners((data || []) as MarketingPartner[]);
  }

  async function loadCoupons() {
    setLoading(true);

    const { data, error } = await supabase
      .from("coupons")
      .select(
        `
        id,
        code,
        name,
        description,
        discount_type,
        percent,
        amount_cents,
        max_discount_cents,
        starts_at,
        ends_at,
        min_subtotal_cents,
        max_uses,
        max_uses_per_customer,
        first_purchase_only,
        stackable,
        active,
        created_at,
        partner_id,
        campaign_name,
        source_channel,
        internal_notes,
        discount_type,
        free_shipping,
        percent,
        marketing_partners (
          name,
          type
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar cupons:", error);
      alert("Erro ao carregar cupons.");
      setCoupons([]);
    } else {
      const normalizedCoupons: Coupon[] = (data || []).map((item: any) => ({
        ...item,
        marketing_partners: Array.isArray(item.marketing_partners)
          ? item.marketing_partners[0] || null
          : item.marketing_partners || null,
      }));

      setCoupons(normalizedCoupons);
    }

    setLoading(false);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function openCreateForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(coupon: Coupon) {
    setEditingId(coupon.id);
    setShowForm(true);

    setForm({
      code: coupon.code || "",
      name: coupon.name || "",
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      percent: coupon.percent ? String(coupon.percent).replace(".", ",") : "",
      amount_reais: centsToReaisInput(coupon.amount_cents),
      max_discount_reais: centsToReaisInput(coupon.max_discount_cents),
      min_subtotal_reais: centsToReaisInput(coupon.min_subtotal_cents),
      max_uses: coupon.max_uses ? String(coupon.max_uses) : "",
      max_uses_per_customer: coupon.max_uses_per_customer
        ? String(coupon.max_uses_per_customer)
        : "",
      starts_at: dateTimeToInput(coupon.starts_at),
      ends_at: dateTimeToInput(coupon.ends_at),
      first_purchase_only: coupon.first_purchase_only,
      stackable: coupon.stackable,
      active: coupon.active,

      partner_id: coupon.partner_id || "",
      campaign_name: coupon.campaign_name || "",
      source_channel: coupon.source_channel || "",
      internal_notes: coupon.internal_notes || "",
      free_shipping: coupon.free_shipping,
    });
  }

  async function toggleActive(coupon: Coupon) {
    const nextActive = !coupon.active;

    setCoupons((current) =>
      current.map((item) =>
        item.id === coupon.id ? { ...item, active: nextActive } : item
      )
    );

    const { error } = await supabase
      .from("coupons")
      .update({
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coupon.id);

    if (error) {
      console.error("Erro ao atualizar cupom:", error);
      alert("Erro ao atualizar status do cupom.");

      setCoupons((current) =>
        current.map((item) =>
          item.id === coupon.id ? { ...item, active: coupon.active } : item
        )
      );
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const code = form.code.trim().toUpperCase();

    if (!code) {
      alert("Informe o código do cupom.");
      return;
    }

    if (!/^[A-Z0-9][A-Z0-9_-]{2,30}$/.test(code)) {
      alert("Código inválido. Use letras, números, _ ou -, com 3 a 31 caracteres.");
      return;
    }

    if (!form.ends_at) {
      alert("Informe a data final de validade do cupom.");
      return;
    }

    if (form.starts_at && new Date(form.starts_at) >= new Date(form.ends_at)) {
      alert("A data de início precisa ser menor que a data final.");
      return;
    }

    if (new Date(form.ends_at) <= new Date()) {
      alert("A data final precisa ser maior que a data e hora atual.");
      return;
    }

    if (form.discount_type === "percent") {
      const percent = Number(form.percent.replace(",", "."));

      if (!percent || percent <= 0 || percent > 100) {
        alert("Informe um percentual entre 1 e 100.");
        return;
      }
    }

    if (form.discount_type === "fixed") {
      const amount = reaisToCents(form.amount_reais);

      if (!amount || amount <= 0) {
        alert("Informe o valor do desconto em reais.");
        return;
      }
    }

    const payload = {
      code,
      name: form.name.trim() || null,
      description: form.description.trim() || null,

      discount_type: form.discount_type,
      percent:
        form.discount_type === "percent"
          ? Number(form.percent.replace(",", "."))
          : null,
      amount_cents:
        form.discount_type === "fixed" ? reaisToCents(form.amount_reais) : null,
      max_discount_cents:
        form.discount_type === "percent" && form.max_discount_reais.trim()
          ? reaisToCents(form.max_discount_reais)
          : null,

      starts_at: inputToIso(form.starts_at),
      ends_at: inputToIso(form.ends_at),

      min_subtotal_cents: reaisToCents(form.min_subtotal_reais),
      max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
      max_uses_per_customer: form.max_uses_per_customer.trim()
        ? Number(form.max_uses_per_customer)
        : null,

      first_purchase_only: form.first_purchase_only,
      stackable: form.stackable,
      active: form.active,

      partner_id: form.partner_id || null,
      campaign_name: form.campaign_name.trim() || null,
      source_channel: form.source_channel || null,
      internal_notes: form.internal_notes.trim() || null,
      free_shipping: form.free_shipping,

      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("coupons")
        .update(payload)
        .eq("id", editingId);

      setSaving(false);

      if (error) {
        console.error("Erro ao editar cupom:", error);
        alert(error.message || "Erro ao editar cupom.");
        return;
      }
    } else {
      const { error } = await supabase.from("coupons").insert(payload);

      setSaving(false);

      if (error) {
        console.error("Erro ao criar cupom:", error);
        alert(error.message || "Erro ao criar cupom.");
        return;
      }
    }

    resetForm();
    loadCoupons();
  }

  useEffect(() => {
    loadCoupons();
    loadPartners();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#b08d57]">
              Marketing e descontos
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-[#2b554e]">
              Cupons
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Crie cupons com prazo, campanha e vínculo com parcerias.
            </p>
          </div>

          <button
            onClick={openCreateForm}
            className="rounded-2xl bg-[#2b554e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244841]"
          >
            Novo cupom
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por código, nome, campanha ou parceria"
          className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
        />
      </section>

      {showForm ? (
        <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#2b554e]">
                {editingId ? "Editar cupom" : "Novo cupom"}
              </h2>

              <p className="text-sm text-zinc-500">
                Defina o desconto, prazo e vínculo com parceria/campanha.
              </p>
            </div>

            <button
              onClick={resetForm}
              className="rounded-2xl border border-[#e9e2d6] px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-[#f6f3ee]"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Código do cupom *
              </span>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="MARIA10"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm uppercase outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Nome interno
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Cupom Maria Influencer"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700">
                Descrição
              </span>
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Cupom criado para campanha com parceira"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Tipo de desconto *
              </span>
              <select
                value={form.discount_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discount_type: event.target.value as DiscountType,
                  }))
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
              <label className="flex items-center gap-3 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4">
                <input
                  type="checkbox"
                  checked={form.free_shipping}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      free_shipping: event.target.checked,
                    }))
                  }
                />

                <span className="text-sm text-zinc-700">
                  Aplicar frete grátis
                </span>
              </label>
            </label>

            {form.discount_type === "percent" ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-zinc-700">
                  Percentual *
                </span>
                <input
                  value={form.percent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      percent: event.target.value,
                    }))
                  }
                  placeholder="10"
                  className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                />
              </label>
            ) : null}

            {form.discount_type === "fixed" ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-zinc-700">
                  Valor do desconto *
                </span>
                <input
                  value={form.amount_reais}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount_reais: event.target.value,
                    }))
                  }
                  placeholder="25,00"
                  className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                />
              </label>
            ) : null}

            {form.discount_type === "percent" ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-zinc-700">
                  Desconto máximo
                </span>
                <input
                  value={form.max_discount_reais}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_discount_reais: event.target.value,
                    }))
                  }
                  placeholder="50,00"
                  className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                />
              </label>
            ) : null}

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Pedido mínimo
              </span>
              <input
                value={form.min_subtotal_reais}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    min_subtotal_reais: event.target.value,
                  }))
                }
                placeholder="150,00"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Limite total de usos
              </span>
              <input
                value={form.max_uses}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    max_uses: event.target.value,
                  }))
                }
                placeholder="100"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Limite por cliente
              </span>
              <input
                value={form.max_uses_per_customer}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    max_uses_per_customer: event.target.value,
                  }))
                }
                placeholder="1"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Parceria vinculada
              </span>

              <select
                value={form.partner_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    partner_id: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              >
                <option value="">Sem parceria</option>

                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Nome da campanha
              </span>

              <input
                value={form.campaign_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    campaign_name: event.target.value,
                  }))
                }
                placeholder="Dia das Mães 2026"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Canal de origem
              </span>

              <select
                value={form.source_channel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    source_channel: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              >
                <option value="">Não informado</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="site">Site</option>
                <option value="evento">Evento</option>
                <option value="influencer">Influencer</option>
                <option value="trafego_pago">Tráfego pago</option>
                <option value="indicacao">Indicação</option>
                <option value="outro">Outro</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Início da validade
              </span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    starts_at: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Fim da validade *
              </span>
              <input
                type="datetime-local"
                value={form.ends_at}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ends_at: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700">
                Observações internas da campanha
              </span>

              <textarea
                value={form.internal_notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    internal_notes: event.target.value,
                  }))
                }
                placeholder="Ex: parceria com comissão, envio de peças, ação com influencer..."
                className="min-h-24 w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4">
                <input
                  type="checkbox"
                  checked={form.first_purchase_only}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      first_purchase_only: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-zinc-700">
                  Apenas primeira compra
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4">
                <input
                  type="checkbox"
                  checked={form.stackable}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stackable: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-zinc-700">Acumulável</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-zinc-700">Cupom ativo</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-[#e9e2d6] px-5 py-3 text-sm font-semibold text-zinc-600 hover:bg-[#f6f3ee]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#2b554e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244841] disabled:opacity-60"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Criar cupom"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-[#e9e2d6] bg-white shadow-sm">
        <div className="border-b border-[#e9e2d6] px-5 py-4">
          <h2 className="text-xl font-semibold text-[#2b554e]">
            Cupons cadastrados
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-zinc-500">Carregando cupons...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">
            Nenhum cupom encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-[#f6f3ee] text-left text-[#2b554e]">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Parceria/Campanha</th>
                  <th className="px-4 py-3">Desconto</th>
                  <th className="px-4 py-3">Pedido mínimo</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="border-t border-[#e9e2d6]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-zinc-900">
                        {coupon.code}
                      </div>

                      <div className="text-xs text-zinc-500">
                        {coupon.name || coupon.description || "Sem nome"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      <div className="font-medium">
                        {coupon.marketing_partners?.name || "Sem parceria"}
                      </div>

                      <div className="text-xs text-zinc-500">
                        {coupon.campaign_name ||
                          channelLabel(coupon.source_channel) ||
                          "-"}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium text-zinc-700">
                      {discountLabel(coupon)}
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {moneyBRLFromCents(coupon.min_subtotal_cents)}
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {coupon.max_uses ? `Até ${coupon.max_uses}` : "Ilimitado"}
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {formatDate(coupon.ends_at)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                          coupon
                        )}`}
                      >
                        {statusLabel(coupon)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditForm(coupon)}
                          className="rounded-xl border border-[#e9e2d6] px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-[#f6f3ee]"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => toggleActive(coupon)}
                          className="rounded-xl border border-[#e9e2d6] px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-[#f6f3ee]"
                        >
                          {coupon.active ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
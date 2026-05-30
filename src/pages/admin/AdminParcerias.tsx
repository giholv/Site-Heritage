import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type PartnerType = "partner" | "influencer" | "affiliate" | "campaign" | "other";
type CommissionType = "percent" | "fixed" | "none";

type MarketingPartner = {
  id: string;
  name: string;
  type: PartnerType;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  commission_type: CommissionType;
  commission_percent: number | null;
  commission_cents: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

type PartnerStats = {
  partner_id: string;
  partner_name: string;
  partner_type: PartnerType;
  instagram: string | null;
  active: boolean;
  commission_type: CommissionType;
  commission_percent: number | null;
  commission_cents: number | null;
  total_orders: number;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  revenue_cents: number;
  average_ticket_cents: number;
  commission_due_cents: number;
};

type PartnerForm = {
  name: string;
  type: PartnerType;
  contact_name: string;
  email: string;
  phone: string;
  instagram: string;
  commission_type: CommissionType;
  commission_percent: string;
  commission_reais: string;
  active: boolean;
  notes: string;
};

const EMPTY_FORM: PartnerForm = {
  name: "",
  type: "partner",
  contact_name: "",
  email: "",
  phone: "",
  instagram: "",
  commission_type: "none",
  commission_percent: "",
  commission_reais: "",
  active: true,
  notes: "",
};

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

function centsToReais(cents: number | null | undefined) {
  if (!cents) return "";
  return String((cents / 100).toFixed(2)).replace(".", ",");
}

function moneyBRL(cents: number | null | undefined) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function typeLabel(type: PartnerType) {
  const map: Record<PartnerType, string> = {
    partner: "Parceria",
    influencer: "Influencer",
    affiliate: "Afiliado",
    campaign: "Campanha",
    other: "Outro",
  };

  return map[type] || type;
}

function commissionLabel(partner: MarketingPartner) {
  if (partner.commission_type === "percent") {
    return `${partner.commission_percent || 0}%`;
  }

  if (partner.commission_type === "fixed") {
    return moneyBRL(partner.commission_cents);
  }

  return "Sem comissão";
}

export default function AdminParcerias() {
  const [partners, setPartners] = useState<MarketingPartner[]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);

  const filteredPartners = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return partners;

    return partners.filter((partner) => {
      return (
        partner.name.toLowerCase().includes(term) ||
        (partner.instagram || "").toLowerCase().includes(term) ||
        (partner.email || "").toLowerCase().includes(term) ||
        (partner.contact_name || "").toLowerCase().includes(term)
      );
    });
  }, [partners, search]);

  const statsSummary = useMemo(() => {
    const activePartners = partners.filter((partner) => partner.active).length;

    const totalOrders = partnerStats.reduce(
      (sum, item) => sum + Number(item.total_orders || 0),
      0
    );

    const totalRevenue = partnerStats.reduce(
      (sum, item) => sum + Number(item.revenue_cents || 0),
      0
    );

    const totalDiscount = partnerStats.reduce(
      (sum, item) => sum + Number(item.discount_cents || 0),
      0
    );

    const totalCommission = partnerStats.reduce(
      (sum, item) => sum + Number(item.commission_due_cents || 0),
      0
    );

    const averageTicket =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      activePartners,
      totalOrders,
      totalRevenue,
      totalDiscount,
      totalCommission,
      averageTicket,
    };
  }, [partners, partnerStats]);

  const topPartners = useMemo(() => {
    return [...partnerStats]
      .sort((a, b) => Number(b.revenue_cents || 0) - Number(a.revenue_cents || 0))
      .slice(0, 5);
  }, [partnerStats]);

  const noSalePartners = useMemo(() => {
    return partnerStats.filter((item) => Number(item.total_orders || 0) === 0);
  }, [partnerStats]);

  async function loadPartners() {
    setLoading(true);

    const { data, error } = await supabase
      .from("marketing_partners")
      .select(
        `
        id,
        name,
        type,
        contact_name,
        email,
        phone,
        instagram,
        commission_type,
        commission_percent,
        commission_cents,
        active,
        notes,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar parcerias:", error);
      alert("Erro ao carregar parcerias.");
      setPartners([]);
    } else {
      setPartners((data || []) as MarketingPartner[]);
    }

    setLoading(false);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function loadPartnerStats() {
    const { data, error } = await supabase
      .from("v_marketing_partner_stats")
      .select("*")
      .order("revenue_cents", { ascending: false });

    if (error) {
      console.error("Erro ao carregar stats de parcerias:", error);
      setPartnerStats([]);
      return;
    }

    setPartnerStats((data || []) as PartnerStats[]);
  }

  function openEditForm(partner: MarketingPartner) {
    setEditingId(partner.id);
    setShowForm(true);

    setForm({
      name: partner.name || "",
      type: partner.type || "partner",
      contact_name: partner.contact_name || "",
      email: partner.email || "",
      phone: partner.phone || "",
      instagram: partner.instagram || "",
      commission_type: partner.commission_type || "none",
      commission_percent: partner.commission_percent
        ? String(partner.commission_percent).replace(".", ",")
        : "",
      commission_reais: centsToReais(partner.commission_cents),
      active: partner.active,
      notes: partner.notes || "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function toggleActive(partner: MarketingPartner) {
    const nextActive = !partner.active;

    setPartners((current) =>
      current.map((item) =>
        item.id === partner.id ? { ...item, active: nextActive } : item
      )
    );

    const { error } = await supabase
      .from("marketing_partners")
      .update({
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partner.id);

    if (error) {
      console.error("Erro ao atualizar parceria:", error);
      alert("Erro ao atualizar parceria.");

      loadPartnerStats();

      setPartners((current) =>
        current.map((item) =>
          item.id === partner.id ? { ...item, active: partner.active } : item
        )
      );
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Informe o nome da parceria.");
      return;
    }

    if (form.commission_type === "percent") {
      const percent = Number(form.commission_percent.replace(",", "."));

      if (Number.isNaN(percent) || percent < 0) {
        alert("Informe um percentual de comissão válido.");
        return;
      }
    }

    if (form.commission_type === "fixed") {
      const cents = reaisToCents(form.commission_reais);

      if (cents <= 0) {
        alert("Informe um valor fixo de comissão válido.");
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      instagram: form.instagram.trim() || null,
      commission_type: form.commission_type,
      commission_percent:
        form.commission_type === "percent"
          ? Number(form.commission_percent.replace(",", "."))
          : null,
      commission_cents:
        form.commission_type === "fixed"
          ? reaisToCents(form.commission_reais)
          : null,
      active: form.active,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("marketing_partners")
        .update(payload)
        .eq("id", editingId);

      setSaving(false);

      if (error) {
        console.error("Erro ao editar parceria:", error);
        alert(error.message || "Erro ao editar parceria.");
        return;
      }
    } else {
      const { error } = await supabase.from("marketing_partners").insert(payload);

      setSaving(false);

      if (error) {
        console.error("Erro ao criar parceria:", error);
        alert(error.message || "Erro ao criar parceria.");
        return;
      }
    }

    resetForm();
    loadPartners();
    loadPartnerStats();
  }

  useEffect(() => {
    loadPartners();
    loadPartnerStats();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#b08d57]">
              Marketing e relacionamento
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-[#2b554e]">
              Parcerias
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Cadastre influencers, afiliados, campanhas e parceiros para vincular aos cupons.
            </p>
          </div>

          <button
            onClick={openCreateForm}
            className="rounded-2xl bg-[#2b554e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244841]"
          >
            Nova parceria
          </button>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Parcerias ativas</p>
          <p className="mt-2 text-3xl font-semibold text-[#2b554e]">
            {statsSummary.activePartners}
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Pedidos gerados</p>
          <p className="mt-2 text-3xl font-semibold text-[#2b554e]">
            {statsSummary.totalOrders}
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Faturamento</p>
          <p className="mt-2 text-3xl font-semibold text-[#2b554e]">
            {moneyBRL(statsSummary.totalRevenue)}
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Descontos usados</p>
          <p className="mt-2 text-3xl font-semibold text-[#2b554e]">
            {moneyBRL(statsSummary.totalDiscount)}
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Comissão a pagar</p>
          <p className="mt-2 text-3xl font-semibold text-[#2b554e]">
            {moneyBRL(statsSummary.totalCommission)}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, Instagram, contato ou e-mail"
          className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
        />
      </section>

      {showForm ? (
        <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#2b554e]">
                {editingId ? "Editar parceria" : "Nova parceria"}
              </h2>

              <p className="text-sm text-zinc-500">
                Preencha os dados da parceria.
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
                Nome da parceria *
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Maria Influencer"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Tipo
              </span>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as PartnerType,
                  }))
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              >
                <option value="partner">Parceria</option>
                <option value="influencer">Influencer</option>
                <option value="affiliate">Afiliado</option>
                <option value="campaign">Campanha</option>
                <option value="other">Outro</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Nome do contato
              </span>
              <input
                value={form.contact_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contact_name: event.target.value,
                  }))
                }
                placeholder="Maria Silva"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Instagram
              </span>
              <input
                value={form.instagram}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    instagram: event.target.value,
                  }))
                }
                placeholder="@mariasilva"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                E-mail
              </span>
              <input
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="contato@email.com"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Telefone / WhatsApp
              </span>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="(11) 99999-9999"
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Tipo de comissão
              </span>
              <select
                value={form.commission_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    commission_type: event.target.value as CommissionType,
                  }))
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              >
                <option value="none">Sem comissão</option>
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </label>

            {form.commission_type === "percent" ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-zinc-700">
                  Comissão %
                </span>
                <input
                  value={form.commission_percent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      commission_percent: event.target.value,
                    }))
                  }
                  placeholder="10"
                  className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                />
              </label>
            ) : null}

            {form.commission_type === "fixed" ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-zinc-700">
                  Comissão fixa
                </span>
                <input
                  value={form.commission_reais}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      commission_reais: event.target.value,
                    }))
                  }
                  placeholder="25,00"
                  className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                />
              </label>
            ) : null}

            <label className="flex items-center gap-3 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4 md:col-span-2">
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
              <span className="text-sm text-zinc-700">Parceria ativa</span>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700">
                Observações internas
              </span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Ex: comissão combinada, envio de peças, condições da ação..."
                className="min-h-24 w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
              />
            </label>

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
                    : "Criar parceria"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-[#e9e2d6] bg-white shadow-sm">
          <div className="border-b border-[#e9e2d6] px-5 py-4">
            <h2 className="text-xl font-semibold text-[#2b554e]">
              Ranking de parcerias
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Ordenado por faturamento gerado.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#f6f3ee] text-left text-[#2b554e]">
                <tr>
                  <th className="px-4 py-3">Parceria</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3">Faturamento</th>
                  <th className="px-4 py-3">Ticket médio</th>
                  <th className="px-4 py-3">Comissão</th>
                </tr>
              </thead>

              <tbody>
                {topPartners.map((item) => (
                  <tr key={item.partner_id} className="border-t border-[#e9e2d6]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-zinc-900">
                        {item.partner_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {item.instagram || "Sem Instagram"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {item.total_orders}
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#2b554e]">
                      {moneyBRL(item.revenue_cents)}
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {moneyBRL(item.average_ticket_cents)}
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {moneyBRL(item.commission_due_cents)}
                    </td>
                  </tr>
                ))}

                {topPartners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-sm text-zinc-500">
                      Nenhuma venda vinculada a parceria ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#2b554e]">
            Parcerias sem venda
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Parceiros cadastrados sem pedido vinculado.
          </p>

          <div className="mt-4 space-y-3">
            {noSalePartners.slice(0, 8).map((item) => (
              <div
                key={item.partner_id}
                className="rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4"
              >
                <div className="font-semibold text-zinc-800">
                  {item.partner_name}
                </div>

                <div className="mt-1 text-xs text-zinc-500">
                  {item.instagram || "Sem Instagram"}
                </div>
              </div>
            ))}

            {noSalePartners.length === 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                Todas as parcerias possuem venda vinculada.
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-[#e9e2d6] bg-white shadow-sm">
        <div className="border-b border-[#e9e2d6] px-5 py-4">
          <h2 className="text-xl font-semibold text-[#2b554e]">
            Parcerias cadastradas
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-zinc-500">
            Carregando parcerias...
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">
            Nenhuma parceria encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#f6f3ee] text-left text-[#2b554e]">
                <tr>
                  <th className="px-4 py-3">Parceria</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Comissão</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="border-t border-[#e9e2d6]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-zinc-900">
                        {partner.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {partner.instagram || "Sem Instagram"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {typeLabel(partner.type)}
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      <div>{partner.contact_name || "-"}</div>
                      <div className="text-xs text-zinc-500">
                        {partner.email || partner.phone || ""}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-zinc-700">
                      {commissionLabel(partner)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          partner.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600",
                        ].join(" ")}
                      >
                        {partner.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditForm(partner)}
                          className="rounded-xl border border-[#e9e2d6] px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-[#f6f3ee]"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => toggleActive(partner)}
                          className="rounded-xl border border-[#e9e2d6] px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-[#f6f3ee]"
                        >
                          {partner.active ? "Desativar" : "Ativar"}
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
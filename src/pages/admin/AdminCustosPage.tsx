import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type CostExpense = {
  id: string;
  title: string;
  description: string | null;
  expense_date: string;
  amount_cents: number;
  allocation_method: "per_sku" | "per_piece" | "manual";
  status: "open" | "allocated" | "cancelled";
  created_at: string;
};

type PricingSetting = {
  id: string;
  name: string;
  active: boolean;
  marketplace_fee_pct: number;
  markup_pct: number;
  packaging_cost_cents: number;
  price_round_step_cents: number;
};

type PricingRow = {
  sku_id: string;
  cost_gross_cents: number;
  current_price_cents: number;
};

function formatBRL(cents: number | null | undefined) {
  const value = Number(cents || 0) / 100;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseBRLToCents(value: string) {
  const clean = value
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const number = Number(clean || 0);
  return Math.round(number * 100);
}

function formatDateBR(date: string) {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function AdminCustosPage() {
  const [expenses, setExpenses] = useState<CostExpense[]>([]);
  const [settings, setSettings] = useState<PricingSetting | null>(null);

  const [totalInvestedCents, setTotalInvestedCents] = useState(0);
  const [totalToSellCents, setTotalToSellCents] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const totalExpensesCents = useMemo(() => {
    return expenses.reduce(
      (sum, item) => sum + Number(item.amount_cents || 0),
      0
    );
  }, [expenses]);

  async function loadData() {
    setLoadingPage(true);

    const [settingsResponse, expensesResponse, pricingResponse] =
      await Promise.all([
        supabase
          .from("pricing_settings")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("cost_expenses")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("v_sku_pricing")
          .select("sku_id,cost_gross_cents,current_price_cents"),
      ]);

    if (settingsResponse.error) {
      console.log("Erro settings:", settingsResponse.error.message);
    } else {
      setSettings(settingsResponse.data);
    }

    if (expensesResponse.error) {
      console.log("Erro expenses:", expensesResponse.error.message);
    } else {
      setExpenses((expensesResponse.data || []) as CostExpense[]);
    }

    if (pricingResponse.error) {
      console.log("Erro pricing:", pricingResponse.error.message);
    } else {
      const rows = (pricingResponse.data || []) as PricingRow[];

      const invested = rows.reduce(
        (sum, item) => sum + Number(item.cost_gross_cents || 0),
        0
      );

      const toSell = rows.reduce(
        (sum, item) => sum + Number(item.current_price_cents || 0),
        0
      );

      setTotalInvestedCents(invested);
      setTotalToSellCents(toSell);
    }

    setLoadingPage(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateExpense() {
    const amountCents = parseBRLToCents(amount);

    if (!title.trim()) {
      alert("Informe o nome do gasto.");
      return;
    }

    if (amountCents <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    setLoading(true);

    try {
      const { data: expense, error: insertError } = await supabase
        .from("cost_expenses")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          expense_date: expenseDate,
          amount_cents: amountCents,
          allocation_method: "per_piece",
          status: "open",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      const { error: rpcError } = await supabase.rpc(
        "allocate_cost_expense_per_piece",
        {
          p_expense_id: expense.id,
        }
      );

      if (rpcError) throw rpcError;

      setTitle("");
      setDescription("");
      setAmount("");
      setExpenseDate(new Date().toISOString().slice(0, 10));

      await loadData();

      alert("Gasto cadastrado e rateado com sucesso.");
    } catch (error: any) {
      alert(error?.message || "Erro ao cadastrar gasto.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReallocateExpense(expenseId: string) {
    const confirmReallocate = window.confirm(
      "Deseja recalcular o rateio desse gasto?"
    );

    if (!confirmReallocate) return;

    setLoading(true);

    try {
      const { error: openError } = await supabase
        .from("cost_expenses")
        .update({
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", expenseId);

      if (openError) throw openError;

      const { error: rpcError } = await supabase.rpc(
        "allocate_cost_expense_per_piece",
        {
          p_expense_id: expenseId,
        }
      );

      if (rpcError) throw rpcError;

      await loadData();

      alert("Rateio recalculado com sucesso.");
    } catch (error: any) {
      alert(error?.message || "Erro ao recalcular rateio.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelExpense(expenseId: string) {
    const confirmCancel = window.confirm("Deseja cancelar esse gasto?");

    if (!confirmCancel) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("cost_expenses")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", expenseId);

      if (error) throw error;

      await loadData();
    } catch (error: any) {
      alert(error?.message || "Erro ao cancelar gasto.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingPage) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-neutral-500">Carregando custos...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[#2b554e]">
          Controle de Custos
        </h1>

        <p className="text-sm text-neutral-600">
          Cadastre gastos extras e o sistema adiciona automaticamente no custo
          final das peças.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Taxa marketplace
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2b554e]">
            {settings?.marketplace_fee_pct || 0}%
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Markup padrão
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2b554e]">
            {settings?.markup_pct || 0}%
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Embalagem
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2b554e]">
            {formatBRL(settings?.packaging_cost_cents)}
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Gastos cadastrados
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2b554e]">
            {formatBRL(totalExpensesCents)}
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Total investido
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2b554e]">
            {formatBRL(totalInvestedCents)}
          </p>
        </div>

        <div className="rounded-3xl border border-[#e9e2d6] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Total a vender
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2b554e]">
            {formatBRL(totalToSellCents)}
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-[#2b554e]">
          Adicionar novo gasto
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nome do gasto
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Frete do fornecedor"
              className="w-full rounded-xl border border-[#e9e2d6] px-4 py-3 text-sm outline-none focus:border-[#b08d57]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Valor
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 1.459,26"
              className="w-full rounded-xl border border-[#e9e2d6] px-4 py-3 text-sm outline-none focus:border-[#b08d57]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Data do gasto
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-xl border border-[#e9e2d6] px-4 py-3 text-sm outline-none focus:border-[#b08d57]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Tipo de rateio
            </label>
            <input
              value="Automático por SKU"
              disabled
              className="w-full rounded-xl border border-[#e9e2d6] bg-neutral-100 px-4 py-3 text-sm text-neutral-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Observação
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Valor migrado da planilha antiga de precificação"
              className="min-h-[100px] w-full rounded-xl border border-[#e9e2d6] px-4 py-3 text-sm outline-none focus:border-[#b08d57]"
            />
          </div>
        </div>

        <button
          onClick={handleCreateExpense}
          disabled={loading}
          className="mt-5 rounded-full bg-[#2b554e] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar e ratear automaticamente"}
        </button>
      </div>

      <div className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#2b554e]">
            Gastos cadastrados
          </h2>

          <button
            onClick={loadData}
            className="rounded-full border border-[#e9e2d6] px-4 py-2 text-sm font-medium text-[#2b554e] hover:bg-[#fcfaf6]"
          >
            Atualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e9e2d6] text-left text-neutral-500">
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Gasto</th>
                <th className="py-3 pr-4">Valor</th>
                <th className="py-3 pr-4">Rateio</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-[#f1ece4] text-neutral-700"
                >
                  <td className="py-4 pr-4">
                    {formatDateBR(expense.expense_date)}
                  </td>

                  <td className="py-4 pr-4">
                    <div className="font-medium text-[#2b554e]">
                      {expense.title}
                    </div>

                    {expense.description && (
                      <div className="mt-1 text-xs text-neutral-500">
                        {expense.description}
                      </div>
                    )}
                  </td>

                  <td className="py-4 pr-4 font-medium">
                    {formatBRL(expense.amount_cents)}
                  </td>

                  <td className="py-4 pr-4">Por SKU</td>

                  <td className="py-4 pr-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        expense.status === "allocated"
                          ? "bg-[#eef5f2] text-[#2b554e]"
                          : expense.status === "open"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {expense.status === "allocated"
                        ? "Rateado"
                        : expense.status === "open"
                          ? "Aberto"
                          : "Cancelado"}
                    </span>
                  </td>

                  <td className="py-4 pr-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleReallocateExpense(expense.id)}
                        disabled={loading || expense.status === "cancelled"}
                        className="rounded-full border border-[#e9e2d6] px-3 py-2 text-xs font-medium text-[#2b554e] hover:bg-[#fcfaf6] disabled:opacity-40"
                      >
                        Recalcular
                      </button>

                      <button
                        onClick={() => handleCancelExpense(expense.id)}
                        disabled={loading || expense.status === "cancelled"}
                        className="rounded-full border border-red-100 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    Nenhum gasto cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type StockRow = {
  sku_id: string;
  available: number;
};

type Movement = {
  id: string;
  movement_type: "entrada" | "saida" | "ajuste" | "venda";
  quantity: number;
  reference: string | null;
  created_at: string;
  plating_batch_id: string | null;
};

type Batch = {
  id: string;
  galvanica_name: string;
  lote: string;
  lote_date: string; // ISO date
  bath_type: string | null;
  millesimal: number | null;
};

export default function StockTab({ skuId }: { skuId: string }) {
  const [stock, setStock] = useState<StockRow | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [type, setType] = useState<Movement["movement_type"]>("entrada");
  const [qty, setQty] = useState("1");
  const [reference, setReference] = useState("");
  const [batchId, setBatchId] = useState<string>("");

  const batchOptions = useMemo(() => {
    return batches.map((b) => {
      const label = [
        b.galvanica_name,
        `Lote ${b.lote}`,
        new Date(b.lote_date).toLocaleDateString("pt-BR"),
        b.bath_type ? b.bath_type : null,
        b.millesimal ? `${b.millesimal}` : null,
      ]
        .filter(Boolean)
        .join(" • ");
      return { value: b.id, label };
    });
  }, [batches]);

  async function loadAll() {
    setLoading(true);
    setErr(null);

    // saldo atual
    const { data: s, error: e1 } = await supabase
      .from("current_stock")
      .select("sku_id,available")
      .eq("sku_id", skuId)
      .maybeSingle();

    if (e1) {
      setErr(e1.message);
      setLoading(false);
      return;
    }

    // histórico (últimos 50)
    const { data: h, error: e2 } = await supabase
      .from("inventory_movements")
      .select("id,movement_type,quantity,reference,created_at,plating_batch_id")
      .eq("sku_id", skuId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (e2) {
      setErr(e2.message);
      setLoading(false);
      return;
    }

    // lotes (para vincular entradas/ajustes)
    const { data: b, error: e3 } = await supabase
      .from("plating_batches")
      .select("id,galvanica_name,lote,lote_date,bath_type,millesimal")
      .order("lote_date", { ascending: false })
      .limit(200);

    if (e3) {
      setErr(e3.message);
      setLoading(false);
      return;
    }

    setStock((s as any) ?? { sku_id: skuId, available: 0 });
    setHistory((h as any) ?? []);
    setBatches((b as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuId]);

  async function addMovement() {
    setErr(null);

    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Quantidade inválida.");
      return;
    }

    // regra simples: saída não pode estourar o saldo
    const current = stock?.available ?? 0;
    if ((type === "saida" || type === "venda") && n > current) {
      setErr(`Saída maior que o disponível (atual: ${current}).`);
      return;
    }

    const payload: any = {
      sku_id: skuId,
      movement_type: type,
      quantity: Math.floor(n),
      reference: reference.trim() ? reference.trim() : null,
      plating_batch_id: batchId ? batchId : null,
    };

    const { error } = await supabase.from("inventory_movements").insert(payload);
    if (error) {
      setErr(error.message);
      return;
    }

    // limpa form e recarrega
    setQty("1");
    setReference("");
    setBatchId("");
    await loadAll();
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="rounded-2xl border bg-white p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Estoque</h2>
        <div className="text-sm text-gray-600 mt-1">
          Saldo calculado por movimentações (auditável).
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-gray-600">Disponível</div>
          <div className="mt-1 w-full rounded-xl border px-4 py-3 bg-gray-50">
            {stock?.available ?? 0}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Reservado</div>
          <div className="mt-1 w-full rounded-xl border px-4 py-3 bg-gray-50">
            0
          </div>
          <div className="text-xs text-gray-500 mt-1">
            (Você pode plugar isso depois com carrinho/pedidos)
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Total</div>
          <div className="mt-1 w-full rounded-xl border px-4 py-3 bg-gray-50">
            {(stock?.available ?? 0) + 0}
          </div>
        </div>
      </div>

      {/* Nova movimentação */}
      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-3">Lançar movimentação</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-sm text-gray-600">Tipo</div>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-3"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="ajuste">Ajuste</option>
              <option value="venda">Venda</option>
            </select>
          </div>

          <div>
            <div className="text-sm text-gray-600">Quantidade</div>
            <input
              className="mt-1 w-full rounded-xl border px-4 py-3"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-gray-600">
              Lote / Galvânica (opcional)
            </div>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-3"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              <option value="">—</option>
              {batchOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <div className="text-sm text-gray-600">Referência (opcional)</div>
            <input
              className="mt-1 w-full rounded-xl border px-4 py-3"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder='Ex: "Entrada banho", "Ajuste inventário", "Pedido #123"'
            />
          </div>
        </div>

        <button
          onClick={addMovement}
          className="mt-4 rounded-xl bg-[#2b554e] text-white px-4 py-3"
        >
          Registrar movimentação
        </button>
      </div>

      {/* Histórico */}
      <div>
        <div className="font-semibold mb-3">Histórico</div>
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-right px-4 py-3">Qtd</th>
                <th className="text-left px-4 py-3">Referência</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={4}>
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                history.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-3">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{m.movement_type}</td>
                    <td className="px-4 py-3 text-right">{m.quantity}</td>
                    <td className="px-4 py-3">{m.reference ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

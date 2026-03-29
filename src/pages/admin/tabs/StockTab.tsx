import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type LocationRow = {
  id: string;
  code: string;
  name: string | null;
  active: boolean;
};

type MovementRow = {
  id: string;
  sku_id: string;
  location_id: string;
  type: string;
  quantity: number;
  reason: string | null;
  note: string | null;
  created_at: string;
  order_id: string | null;
};

type CurrentStockRow = {
  sku_id: string;
  location_id: string;
  location_code: string;
  total_qty: number;
  reserved_qty: number;
  available_qty: number;
};

const MOV_TYPES: Array<{ value: string; label: string }> = [
  { value: "in", label: "Entrada" },
  { value: "out", label: "Saída" },
  { value: "adjust", label: "Ajuste (+/-)" },
  { value: "reserve", label: "Reserva" },
  { value: "unreserve", label: "Libera reserva" },
];

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value ?? 0}</div>
    </div>
  );
}


function computeFromMovements(rows: Array<Pick<MovementRow, "type" | "quantity">>) {
  let total = 0; // físico
  let reserved = 0;

  for (const r of rows) {
    const q = Number(r.quantity) || 0;
    const t = (r.type || "").toLowerCase();

    if (t === "in" || t === "entrada") total += q;
    else if (t === "out" || t === "saida") total -= q;
    else if (t === "adjust" || t === "ajuste") total += q;
    else if (t === "reserve" || t === "reserva") reserved += q;
    else if (t === "unreserve" || t === "release" || t === "libera_reserva") reserved -= q;;
  }

  const available = total - reserved;
  return { total, reserved, available };
}

export default function StockTab({ skuId }: { skuId: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationId, setLocationId] = useState<string>("");

  const [stock, setStock] = useState<{ total: number; reserved: number; available: number }>({
    total: 0,
    reserved: 0,
    available: 0,
  });

  const [movements, setMovements] = useState<MovementRow[]>([]);

  // form
  const [type, setType] = useState("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  // criar localização (opcional)
  const [newLocCode, setNewLocCode] = useState("");
  const [newLocName, setNewLocName] = useState("");

  const locationOptions = useMemo(
    () => locations.filter((l) => l.active !== false).sort((a, b) => a.code.localeCompare(b.code)),
    [locations]
  );

  async function loadLocations() {
    const { data, error } = await supabase
      .from("stock_locations")
      .select("id,code,name,active")
      .eq("active", true)
      .order("code", { ascending: true });

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as LocationRow[];
    setLocations(rows);

    // escolhe MAIN se existir, senão primeira
    if (!locationId) {
      const main = rows.find((r) => r.code === "MAIN");
      setLocationId(main?.id || rows[0]?.id || "");
    }
  }

  async function loadMovements(locId: string) {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("id,sku_id,location_id,type,quantity,reason,note,created_at,order_id")
      .eq("sku_id", skuId)
      .eq("location_id", locId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    setMovements((data ?? []) as MovementRow[]);
    return (data ?? []) as MovementRow[];
  }

  async function loadStock(locId: string, movementRows?: MovementRow[]) {
  const { data, error } = await supabase
    .from("current_stock")
    .select("sku_id,location_id,location_code,total_qty,reserved_qty,available_qty")
    .eq("sku_id", skuId)
    .eq("location_id", locId)
    .maybeSingle();

  // erro real
  if (error) {
    const msg = (error as any)?.message || "";

    // view não existe / cache
    if (msg.includes("schema cache") || msg.includes("Could not find the table")) {
      const rows = movementRows ?? (await loadMovements(locId));
      const s = computeFromMovements(rows);
      setStock({ total: s.total, reserved: s.reserved, available: s.available });
      return;
    }

    throw new Error(msg || "Erro ao carregar saldo.");
  }

  // view voltou vazia => saldo zero (ou calcula pelas movimentações)
  if (!data) {
    const rows = movementRows ?? [];
    const s = computeFromMovements(rows);
    setStock({ total: s.total, reserved: s.reserved, available: s.available });
    return;
  }

  const r = data as CurrentStockRow;
  setStock({
    total: r.total_qty ?? 0,
    reserved: r.reserved_qty ?? 0,
    available: r.available_qty ?? 0,
  });
}

async function refresh() {
  if (!skuId || !locationId) return;

  setErr(null);
  setOk(null);
  setLoading(true);
  try {
    const rows = await loadMovements(locationId); // pega rows direto (não depende do setState)
    await loadStock(locationId, rows);
  } catch (e: any) {
    setErr(e?.message || "Erro no estoque.");
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    setErr(null);
    setOk(null);
    setLocations([]);
    setLocationId("");
    setMovements([]);
    setStock({ total: 0, reserved: 0, available: 0 });

    (async () => {
      try {
        await loadLocations();
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar localizações.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuId]);

  useEffect(() => {
    if (!locationId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  async function createLocation() {
  setErr(null);
  setOk(null);

  const code = newLocCode.trim().toUpperCase();
  const name = newLocName.trim() || null;
  if (!code) return;

  // 1) tenta achar
  const { data: existing, error: selErr } = await supabase
    .from("stock_locations")
    .select("id, code, name")
    .eq("code", code)
    .maybeSingle();

  if (selErr) return setErr(selErr.message);

  if (existing) {
    setLocationId(existing.id);

    // opcional: só tenta update se você tiver policy de UPDATE
    if (name && !existing.name) {
      const { error: upErr } = await supabase
        .from("stock_locations")
        .update({ name })
        .eq("id", existing.id);

      if (upErr) return setErr(upErr.message);
    }

    setOk("Localização já existia. Selecionada.");
    return;
  }

  // 2) não existe -> cria
  const { data: created, error: insErr } = await supabase
    .from("stock_locations")
    .insert({ code, name })
    .select("id")
    .single();

  if (insErr) return setErr(insErr.message);

  setLocationId(created.id);
  setNewLocCode("");
  setNewLocName("");
  setOk("Localização criada.");
  await loadLocations();
}

async function createMovement() {
  setErr(null);
  setOk(null);

  if (!locationId) return setErr("Selecione a localização.");

  const q = Number(quantity);
  if (!Number.isFinite(q) || q === 0) return setErr("Quantidade inválida.");

  // IMPORTANTE: ver item (3) abaixo sobre negativo
  if (q < 0) return setErr("Hoje seu banco não aceita negativo. Use tipo 'out' ou ajuste o CHECK.");

  const { error } = await supabase.from("stock_movements").insert({
    sku_id: skuId,
    location_id: locationId,
    type,
    quantity: q,
    reason: reason.trim() || null,
    note: note.trim() || null,
    order_id: null,
  });

  if (error) return setErr(error.message);

  setOk("Movimentação registrada.");
  setReason("");
  setNote("");
  setQuantity("1");
  await refresh();
}

  return (
    <div className="space-y-5">
      {err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-emerald-900/15 bg-emerald-900/5 px-4 py-3 text-sm text-emerald-900">
          {ok}
        </div>
      ) : null}

      {/* Localização */}
      <div className="rounded-3xl border bg-white p-5 overflow-visible">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Localização</div>
            <div className="text-xs text-gray-500 mt-1">Ex: A1, A2, B7…</div>
          </div>
          <div className="text-xs text-gray-500">{loading ? "Carregando…" : null}</div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 min-w-0">
            <label className="text-sm font-medium text-gray-900">Selecionar</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
            >
              {locationOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}{l.name ? ` — ${l.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 min-w-0">
            <label className="text-sm font-medium text-gray-900">Criar nova (opcional)</label>

            <div className="mt-1 flex flex-wrap items-center gap-2 min-w-0">
              <input
                className="w-32 shrink-0 rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
                placeholder="A1"
                value={newLocCode}
                onChange={(e) => setNewLocCode(e.target.value)}
              />
              <input
                className="flex-1 min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
                placeholder="Nome (opcional)"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
              />
              <button
                type="button"
                onClick={createLocation}
                className="shrink-0 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: "#2b554e" }}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardStat label="Disponível" value={stock.available} />
        <CardStat label="Reservado" value={stock.reserved} />
        <CardStat label="Total" value={stock.total} />
      </div>

      {/* Lançar movimentação */}
      <div className="rounded-3xl border bg-white p-5">
        <div className="text-sm font-semibold text-gray-900">Lançar movimentação</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="text-sm font-medium text-gray-900">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
            >
              {MOV_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-medium text-gray-900">Quantidade</label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
              inputMode="numeric"
              placeholder={type === "adjust" ? "Pode ser -5, 10…" : "Ex: 1"}
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-medium text-gray-900">Referência (opcional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
              placeholder='Ex: "Entrada banho", "Ajuste inventário"'
            />
          </div>

          <div className="md:col-span-12">
            <label className="text-sm font-medium text-gray-900">Observação (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
              placeholder="Detalhes…"
            />
          </div>

          <div className="md:col-span-12 flex justify-end">
            <button
              type="button"
              onClick={createMovement}
              disabled={loading}
              className={cx(
                "rounded-2xl px-5 py-3 text-sm font-medium text-white",
                loading && "opacity-60 cursor-not-allowed"
              )}
              style={{ backgroundColor: "#2b554e" }}
            >
              Registrar movimentação
            </button>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-3xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Histórico (local selecionado)</div>
          <div className="text-xs text-gray-500">{movements.length} item(ns)</div>
        </div>

        {movements.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">Nenhuma movimentação ainda.</div>
        ) : (
          <div className="divide-y">
            {movements.map((m) => (
              <div key={m.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {m.type} • {m.quantity}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {m.reason || "—"} {m.note ? `• ${m.note}` : ""}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  }
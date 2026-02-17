import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

export type SkuRow = {
  id: string;
  product_id: string;
  sku_code: string;
  variant_name: string;
  price_cents: number;
  active: boolean;
  barcode: string | null;
  created_at?: string;
};

function skuBaseFromProductName(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 24);

  return `CAL-${base || "PROD"}`;
}

function formatBRL(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function toCents(input: string) {
  const v = Number(String(input).replace(".", "").replace(",", "."));
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100);
}

export default function SkusTab({
  productId,
  productName,
  selectedSkuId,
  onSelectSku,
}: {
  productId: string;
  productName: string; // pra gerar SKU automático
  selectedSkuId: string | null;
  onSelectSku: (id: string) => void;
}) {
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form de criação
  const [variantName, setVariantName] = useState("");
  const [price, setPrice] = useState("0,00");
  const [barcode, setBarcode] = useState("");
  const [active, setActive] = useState(true);

  const skuBase = useMemo(() => skuBaseFromProductName(productName), [productName]);

  async function loadSkus() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("skus")
      .select("id,product_id,sku_code,variant_name,price_cents,active,barcode,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) setErr(error.message);
    setSkus((data ?? []) as SkuRow[]);
    setLoading(false);

    // seleciona o primeiro se nada selecionado
    if (!selectedSkuId && (data ?? []).length > 0) onSelectSku((data ?? [])[0].id);
  }

  useEffect(() => {
    loadSkus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function nextSkuCode() {
    // busca todos do padrão CAL-BASE-XX
    const { data, error } = await supabase
      .from("skus")
      .select("sku_code")
      .eq("product_id", productId);

    if (error) throw new Error(error.message);

    const used = new Set((data ?? []).map((x: any) => String(x.sku_code || "")));

    // tenta 01..99
    for (let n = 1; n <= 99; n++) {
      const cand = `${skuBase}-${String(n).padStart(2, "0")}`;
      if (!used.has(cand)) return cand;
    }
    // fallback
    return `${skuBase}-${Date.now().toString().slice(-6)}`;
  }

  async function createSku() {
    setErr(null);
    if (!variantName.trim()) {
      setErr("Informe o nome da variação (ex: Ouro 18k).");
      return;
    }

    setSaving(true);
    try {
      const sku_code = await nextSkuCode();

      const { data, error } = await supabase
        .from("skus")
        .insert({
          product_id: productId,
          sku_code,
          variant_name: variantName.trim(),
          price_cents: toCents(price),
          active,
          barcode: barcode.trim() || null,
        })
        .select("id")
        .single();

      if (error || !data) throw new Error(error?.message || "Erro ao criar SKU.");

      // (Opcional) cria inventory default se você já tiver tabela inventory:
      // await supabase.from("inventory").insert({ sku_id: data.id, available: 0, reserved: 0 });

      setVariantName("");
      setPrice("0,00");
      setBarcode("");
      setActive(true);

      await loadSkus();
      onSelectSku(data.id);
    } catch (e: any) {
      setErr(e?.message || "Erro inesperado ao criar SKU.");
    } finally {
      setSaving(false);
    }
  }

  async function updateSku(id: string, patch: Partial<SkuRow>) {
    setErr(null);
    const { error } = await supabase.from("skus").update(patch).eq("id", id);
    if (error) setErr(error.message);
    else loadSkus();
  }

  async function removeSku(id: string) {
    if (!confirm("Excluir este SKU?")) return;
    setErr(null);

    const { error } = await supabase.from("skus").delete().eq("id", id);
    if (error) setErr(error.message);
    else {
      // se deletou o selecionado, limpa seleção
      if (selectedSkuId === id) onSelectSku("");
      loadSkus();
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Variações (SKUs)</h2>
        <div className="text-xs text-gray-500">Base SKU: {skuBase}-XX</div>
      </div>

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Criar SKU */}
      <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="text-sm text-gray-700">Variação *</label>
            <input
              className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
              placeholder="Ex: Ouro 18k"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-sm text-gray-700">Preço (R$)</label>
            <input
              className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-sm text-gray-700">Código de barras (opcional)</label>
            <input
              className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="EAN/GTIN"
            />
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Ativo
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={createSku}
          disabled={saving}
          className="mt-4 rounded-xl bg-[#2b554e] text-white px-4 py-3 disabled:opacity-50"
        >
          {saving ? "Adicionando..." : "Adicionar variação"}
        </button>
      </div>

      {/* Lista */}
      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-600">Carregando SKUs...</div>
        ) : skus.length === 0 ? (
          <div className="text-sm text-gray-600">Nenhuma variação criada ainda.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-gray-500 border-b bg-gray-50">
              <div className="col-span-4">Variação</div>
              <div className="col-span-3">SKU</div>
              <div className="col-span-2">Preço</div>
              <div className="col-span-2">Ativo</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>

            {skus.map((s) => {
              const selected = selectedSkuId === s.id;
              return (
                <div
                  key={s.id}
                  className={[
                    "grid grid-cols-12 gap-2 px-4 py-3 border-b items-center",
                    selected ? "bg-[#2b554e]/5" : "bg-white",
                  ].join(" ")}
                >
                  {/* Variação editável */}
                  <div className="col-span-4">
                    <input
                      className="w-full rounded-lg border px-2 py-2 text-sm"
                      value={s.variant_name}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSkus((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, variant_name: next } : x))
                        );
                      }}
                      onBlur={(e) => updateSku(s.id, { variant_name: e.target.value.trim() })}
                    />
                  </div>

                  {/* SKU (somente leitura) */}
                  <div className="col-span-3 text-sm text-gray-800">
                    {s.sku_code}
                    {s.barcode ? <div className="text-xs text-gray-500">EAN: {s.barcode}</div> : null}
                  </div>

                  {/* Preço editável */}
                  <div className="col-span-2">
                    <input
                      className="w-full rounded-lg border px-2 py-2 text-sm"
                      value={formatBRL(s.price_cents)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setSkus((prev) =>
                          prev.map((x) =>
                            x.id === s.id ? { ...x, price_cents: toCents(raw) } : x
                          )
                        );
                      }}
                      onBlur={(e) => updateSku(s.id, { price_cents: toCents(e.target.value) })}
                      inputMode="decimal"
                    />
                  </div>

                  {/* Ativo toggle */}
                  <div className="col-span-2">
                    <button
                      type="button"
                      className="text-sm underline"
                      onClick={() => updateSku(s.id, { active: !s.active })}
                    >
                      {s.active ? "Sim" : "Não"}
                    </button>
                  </div>

                  {/* Ações */}
                  <div className="col-span-1 flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-sm underline text-[#2b554e]"
                      onClick={() => onSelectSku(s.id)}
                      title="Selecionar SKU"
                    >
                      Selecionar
                    </button>
                    <button
                      type="button"
                      className="text-sm underline text-red-700"
                      onClick={() => removeSku(s.id)}
                      title="Excluir SKU"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

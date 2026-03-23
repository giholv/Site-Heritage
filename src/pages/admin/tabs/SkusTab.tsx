import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

const T = {
  PRODUCTS: "products",
  CATEGORY_TREE: "category_tree",
  SKUS: "skus",
  STONES: "stones",
  STONE_COLORS: "stone_colors",
};

type Props = {
  productId: string;
  productName: string;
  selectedSkuId: string | null;
  onSelectSku: (id: string) => void;
  onSaved?: () => void;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  position?: number | null;
};

type ProductMeta = {
  supplier_id?: string | null;
  plating_supplier_id?: string | null;
  primary_category_id?: string | null;
};

type SkuDbRow = {
  id: string;
  product_id: string;
  sku_code?: string | null;
  barcode?: string | null;
  price_cents?: number | null;
  plating_type?: string | null;
  plating_millesimal?: number | null;
  ring_size?: number | null;
  supplier_id?: string | null;
  plating_supplier_id?: string | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  title?: string | null;
  name?: string | null;
  label?: string | null;
  variant_name?: string | null;
  stone_id?: string | null;
  stone_color_id?: string | null;
  cost_cents?: number | null;
  target_margin_pct?: number | null;
  price_round_step_cents?: number | null;
  [k: string]: any;
};

type SearchOption = {
  id: string;
  name: string;
  search?: string;
};

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function formatBRL(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizePriceToCents(v: string) {
  const cleaned = (v || "").replace(/[^\d.,]/g, "").replace(",", ".");
  if (!cleaned.trim()) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

async function ensureAuthenticatedSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Erro de autenticação: ${error.message}`);
  }

  if (!data.session) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }

  return data.session;
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900">
        {label} {required ? <span className="text-emerald-700">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-900",
        "placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30",
        props.className
      )}
    />
  );
}

function GhostButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-2xl border px-5 py-3 text-sm font-medium text-gray-800 bg-white transition",
        "hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-2xl bg-[#2b554e] px-5 py-3 text-sm font-medium text-white shadow-sm transition",
        "hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "draft" | "active" | "warn" | "ok";
  children: React.ReactNode;
}) {
  const styles =
    tone === "active"
      ? "bg-emerald-900 text-white"
      : tone === "ok"
      ? "bg-emerald-900/10 text-emerald-900 border border-emerald-900/20"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
      : "bg-gray-100 text-gray-700 border border-gray-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function SearchSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  hint,
  allowClear,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: SearchOption[];
  hint?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.id === value) || null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as any)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => ((o.search || o.name).toLowerCase().includes(qq)));
  }, [q, options]);

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900">{label}</label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cx(
            "w-full rounded-2xl border bg-white px-4 py-3 text-left text-sm",
            "focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className={cx("truncate", !selected && "text-gray-400")}>
              {selected ? selected.name : placeholder || "Selecionar…"}
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              {allowClear && selected ? <span className="text-xs">limpar</span> : null}
              <span>▾</span>
            </div>
          </div>
        </button>

        {allowClear && selected ? (
          <button
            type="button"
            className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            title="Limpar"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
              setQ("");
            }}
          >
            ✕
          </button>
        ) : null}

        {open && (
          <div className="absolute z-50 mt-2 w-full rounded-3xl border bg-white shadow-lg overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full rounded-2xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
              />
            </div>

            <div className="max-h-72 overflow-auto">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Nada encontrado.</div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cx(
                      "w-full text-left px-4 py-3 text-sm hover:bg-gray-50",
                      o.id === value && "bg-emerald-900/5"
                    )}
                  >
                    {o.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function SkuEditor({
  isRing,
  titleField,
  initial,
  onCancel,
  onSave,
  saving,
  canActivate,
  stoneOptions,
  stoneColorOptions,
}: {
  isRing: boolean;
  titleField: "title" | "name" | "label" | "variant_name";
  initial?: Partial<SkuDbRow> | null;
  onCancel: () => void;
  onSave: (payload: Partial<SkuDbRow>) => void;
  saving: boolean;
  canActivate: boolean;
  stoneOptions: SearchOption[];
  stoneColorOptions: SearchOption[];
}) {
  const [title, setTitle] = useState((initial as any)?.[titleField] ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [platingType, setPlatingType] = useState(initial?.plating_type ?? "");
  const [millesimal, setMillesimal] = useState(
    initial?.plating_millesimal ? String(initial?.plating_millesimal) : ""
  );
  const [ringSize, setRingSize] = useState(
    initial?.ring_size ? String(initial?.ring_size) : ""
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? false);
  const [err, setErr] = useState<string | null>(null);

  const [stoneId, setStoneId] = useState((initial as any)?.stone_id ?? "");
  const [stoneColorId, setStoneColorId] = useState((initial as any)?.stone_color_id ?? "");
  const [cost, setCost] = useState(
    initial?.cost_cents ? String((initial.cost_cents ?? 0) / 100) : ""
  );
  const [marginPct, setMarginPct] = useState(
    String((initial as any)?.target_margin_pct ?? "0")
  );
  const [roundStep, setRoundStep] = useState(
    String((initial as any)?.price_round_step_cents ?? "100")
  );

  const canSave = useMemo(() => {
    const cc = normalizePriceToCents(cost);
    if (cc === null || cc <= 0) return false;
    if (!platingType.trim()) return false;
    if (!millesimal.trim() || !Number.isFinite(Number(millesimal))) return false;
    if (isRing && (!ringSize.trim() || !Number.isFinite(Number(ringSize)))) return false;
    if (!Number.isFinite(Number(marginPct))) return false;
    if (!Number.isFinite(Number(roundStep)) || Number(roundStep) <= 0) return false;
    return true;
  }, [cost, platingType, millesimal, ringSize, isRing, marginPct, roundStep]);

  return (
    <div className="rounded-3xl border bg-gray-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {(initial as any)?.id ? "Editar SKU" : "Novo SKU"}
          </div>
        </div>

        <div className="flex gap-2">
          <GhostButton disabled={saving} onClick={onCancel}>
            Cancelar
          </GhostButton>

          <PrimaryButton
            disabled={saving || !canSave}
            onClick={() => {
              setErr(null);

              const cost_cents = normalizePriceToCents(cost);
              if (cost_cents === null) return setErr("Custo inválido.");

              const target_margin_pct = Number(marginPct);
              if (!Number.isFinite(target_margin_pct)) return setErr("Margem inválida.");

              const price_round_step_cents = Number(roundStep);
              if (!Number.isFinite(price_round_step_cents) || price_round_step_cents <= 0) {
                return setErr("Arredondamento inválido.");
              }

              if (!platingType.trim()) return setErr("Informe o tipo de banho.");

              const pm = Number(millesimal);
              if (!Number.isFinite(pm) || pm <= 0) return setErr("Milésimo inválido.");

              const rs = ringSize.trim() ? Number(ringSize) : null;
              if (isRing && (!rs || !Number.isFinite(rs))) {
                return setErr("Tamanho do anel inválido.");
              }

              const finalActive = active && canActivate;
              const finalStoneId = stoneId || null;
              const finalStoneColorId = finalStoneId ? stoneColorId || null : null;

              onSave({
                [titleField]: title.trim() || null,
                barcode: barcode.trim() || null,
                plating_type: platingType.trim(),
                plating_millesimal: pm,
                ring_size: isRing ? (rs ?? null) : null,
                active: finalActive,
                stone_id: finalStoneId,
                stone_color_id: finalStoneColorId,
                cost_cents,
                target_margin_pct,
                price_round_step_cents,
              });
            }}
          >
            {saving ? "Salvando…" : "Salvar SKU"}
          </PrimaryButton>
        </div>
      </div>

      {!canActivate ? (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          Para ativar o SKU, defina <b>Fornecedor (Bruto)</b> e <b>Galvânica</b> no produto.
        </div>
      ) : null}

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <Field label="Nome da variação" hint="Ex: Ouro 10 • Tam 16">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Opcional"
            />
          </Field>
        </div>

        <div className="md:col-span-3">
          <Field label="Código interno SKU" hint="Gerado automaticamente">
            <TextInput
              value={initial?.sku_code || "Será gerado ao salvar"}
              disabled
              className="bg-gray-50"
            />
          </Field>
        </div>

        <div className="md:col-span-3">
          <Field label="Código de barras">
            <TextInput
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Ex: 789..."
            />
          </Field>
        </div>

        <div className="md:col-span-4">
          <Field label="Tipo de banho" required>
            <TextInput
              value={platingType}
              onChange={(e) => setPlatingType(e.target.value)}
              placeholder="Ex: ouro, ródio, prata"
            />
          </Field>
        </div>

        <div className="md:col-span-4">
          <Field label="Milésimo" required>
            <TextInput
              value={millesimal}
              onChange={(e) => setMillesimal(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Ex: 10"
            />
          </Field>
        </div>

        <div className="md:col-span-4">
          <Field label="Custo" required hint="Base para cálculo automático">
            <TextInput
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
        </div>

        <div className="md:col-span-4">
          <SearchSelect
            label="Pedra"
            value={stoneId}
            onChange={(v) => {
              setStoneId(v);
              if (!v) setStoneColorId("");
            }}
            placeholder="Selecionar…"
            options={stoneOptions}
            allowClear
          />
        </div>

        <div className="md:col-span-4">
          <SearchSelect
            label="Cor da pedra"
            value={stoneColorId}
            onChange={(v) => setStoneColorId(v)}
            placeholder="Selecionar…"
            options={stoneColorOptions}
            allowClear
          />
        </div>

        <div className="md:col-span-4">
          <Field label="Margem (%)" required>
            <TextInput
              value={marginPct}
              onChange={(e) => setMarginPct(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="Ex: 55"
            />
          </Field>
        </div>

        <div className="md:col-span-4">
          <Field label="Arredondar (centavos)" required hint="100=R$1, 500=R$5">
            <TextInput
              value={roundStep}
              onChange={(e) => setRoundStep(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="100"
            />
          </Field>
        </div>

        <div className="md:col-span-4">
          <Field label="Preço (calculado)">
            <TextInput
              value={initial?.price_cents ? formatBRL(initial.price_cents) : "Salve para calcular"}
              disabled
              className="bg-gray-50"
            />
          </Field>
        </div>

        {(() => {
          const pc = initial?.price_cents ?? null;
          const cc = normalizePriceToCents(cost);

          if (!pc || !cc) return null;

          const markup = (pc - cc) / cc;
          const margin = (pc - cc) / pc;

          return (
            <div className="md:col-span-4">
              <Field label="Margem / Markup" hint="Com base no preço calculado">
                <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800">
                  Margem: <b>{(margin * 100).toFixed(1)}%</b> • Markup:{" "}
                  <b>{(markup * 100).toFixed(1)}%</b>
                </div>
              </Field>
            </div>
          );
        })()}

        {isRing ? (
          <div className="md:col-span-4">
            <Field label="Tamanho do anel" required>
              <TextInput
                value={ringSize}
                onChange={(e) => setRingSize(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="Ex: 16"
              />
            </Field>
          </div>
        ) : null}

        <div className="md:col-span-4">
          <Field label="Ativo" hint={!canActivate ? "Vai salvar como inativo." : undefined}>
            <select
              value={active ? "1" : "0"}
              onChange={(e) => setActive(e.target.value === "1")}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
            >
              <option value="1">Sim</option>
              <option value="0">Não</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

export default function SkusTab({
  productId,
  productName,
  selectedSkuId,
  onSelectSku,
  onSaved,
}: Props) {
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [stones, setStones] = useState<TagRow[]>([]);
  const [stoneColors, setStoneColors] = useState<TagRow[]>([]);
  const [productMeta, setProductMeta] = useState<ProductMeta | null>(null);
  const [isRing, setIsRing] = useState(false);

  const [list, setList] = useState<SkuDbRow[]>([]);
  const [editing, setEditing] = useState<SkuDbRow | null>(null);
  const [creating, setCreating] = useState(false);

  const [titleField, setTitleField] = useState<"title" | "name" | "label" | "variant_name">(
    "title"
  );

  const canActivate = !!productMeta?.supplier_id && !!productMeta?.plating_supplier_id;

  const stoneOptions = useMemo(
    () =>
      stones
        .filter((s) => s.active !== false)
        .map((s) => ({ id: s.id, name: s.name, search: s.name })),
    [stones]
  );

  const stoneColorOptions = useMemo(
    () =>
      stoneColors
        .filter((s) => s.active !== false)
        .map((s) => ({ id: s.id, name: s.name, search: s.name })),
    [stoneColors]
  );

  function skuDisplayTitle(s: SkuDbRow) {
    const v = (s as any)[titleField] as string | null | undefined;
    return v?.trim() || s.sku_code?.trim() || s.barcode?.trim() || "SKU";
  }

  const loadContext = useCallback(async () => {
    setLoadingContext(true);
    setErr(null);

    try {
      await ensureAuthenticatedSession();

      const [productRes, stoneRes, stoneColorRes] = await Promise.all([
        supabase
          .from(T.PRODUCTS)
          .select("supplier_id, plating_supplier_id, primary_category_id")
          .eq("id", productId)
          .maybeSingle(),

        supabase
          .from(T.STONES)
          .select("id,name,slug,active,position")
          .eq("active", true)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from(T.STONE_COLORS)
          .select("id,name,slug,active,position")
          .eq("active", true)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (productRes.error) throw new Error(productRes.error.message);
      if (stoneRes.error) throw new Error(stoneRes.error.message);
      if (stoneColorRes.error) throw new Error(stoneColorRes.error.message);

      const meta = (productRes.data ?? null) as ProductMeta | null;
      setProductMeta(meta);
      setStones((stoneRes.data ?? []) as TagRow[]);
      setStoneColors((stoneColorRes.data ?? []) as TagRow[]);

      if (meta?.primary_category_id) {
        const { data: cat, error: catErr } = await supabase
          .from(T.CATEGORY_TREE)
          .select("slug")
          .eq("id", meta.primary_category_id)
          .maybeSingle();

        if (catErr) throw new Error(catErr.message);

        const slug = String((cat as any)?.slug || "").toLowerCase();
        setIsRing(slug.includes("anel") || slug.includes("aneis"));
      } else {
        setIsRing(false);
      }
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar contexto do SKU.");
    } finally {
      setLoadingContext(false);
    }
  }, [productId]);

  async function tryLoadWith(field: typeof titleField) {
    const select = [
      "id",
      "product_id",
      field,
      "sku_code",
      "barcode",
      "price_cents",
      "cost_cents",
      "target_margin_pct",
      "price_round_step_cents",
      "plating_type",
      "plating_millesimal",
      "ring_size",
      "stone_id",
      "stone_color_id",
      "supplier_id",
      "plating_supplier_id",
      "active",
      "created_at",
      "updated_at",
    ].join(",");

    const { data, error } = await supabase
      .from(T.SKUS)
      .select(select)
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) return { ok: false as const, error };
    return { ok: true as const, data: (data ?? []) as SkuDbRow[] };
  }

  const loadList = useCallback(
    async (preferredId?: string | null) => {
      setLoadingList(true);
      setErr(null);

      try {
        await ensureAuthenticatedSession();

        const candidates: Array<typeof titleField> = ["title", "name", "label", "variant_name"];

        let loaded: SkuDbRow[] | null = null;
        let used: typeof titleField = "title";
        let lastMsg: string | null = null;

        for (const f of candidates) {
          const r = await tryLoadWith(f);

          if (r.ok) {
            loaded = r.data;
            used = f;
            break;
          }

          lastMsg = (r.error as any)?.message || null;

          const msg = (r.error as any)?.message || "";
          const isMissingColumn =
            msg.includes("does not exist") || msg.includes("column") || msg.includes("coluna");

          if (!isMissingColumn) break;
        }

        if (!loaded) {
          throw new Error(lastMsg || "Erro ao carregar SKUs.");
        }

        setTitleField(used);
        setList(loaded);

        const current = preferredId ?? selectedSkuId ?? "";
        const exists = current && loaded.some((s) => s.id === current);

        if (exists) {
          onSelectSku(current);
        } else if (loaded[0]) {
          onSelectSku(loaded[0].id);
        } else {
          onSelectSku("");
        }
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar SKUs.");
      } finally {
        setLoadingList(false);
      }
    },
    [onSelectSku, productId, selectedSkuId]
  );

  useEffect(() => {
    loadContext();
    loadList(selectedSkuId);
  }, [loadContext, loadList, selectedSkuId]);

  async function upsertSku(payload: Partial<SkuDbRow>) {
    setErr(null);
    setSaving(true);

    try {
      await ensureAuthenticatedSession();

      const skuPayload: any = {
        ...payload,
        supplier_id: productMeta?.supplier_id || null,
        plating_supplier_id: productMeta?.plating_supplier_id || null,
      };

      if (skuPayload.active && !canActivate) {
        skuPayload.active = false;
      }

      const retSelect = [
        "id",
        "product_id",
        titleField,
        "sku_code",
        "barcode",
        "price_cents",
        "cost_cents",
        "target_margin_pct",
        "price_round_step_cents",
        "plating_type",
        "plating_millesimal",
        "ring_size",
        "stone_id",
        "stone_color_id",
        "supplier_id",
        "plating_supplier_id",
        "active",
        "created_at",
        "updated_at",
      ].join(",");

      let savedId = "";

      if (editing?.id) {
        const { data, error } = await supabase
          .from(T.SKUS)
          .update({ ...skuPayload, updated_at: new Date().toISOString() })
          .eq("id", editing.id)
          .select(retSelect)
          .single();

        if (error) throw new Error(error.message);

        savedId = (data as SkuDbRow).id;
      } else {
        const { data, error } = await supabase
          .from(T.SKUS)
          .insert({ product_id: productId, ...skuPayload })
          .select(retSelect)
          .single();

        if (error) throw new Error(error.message);

        savedId = (data as SkuDbRow).id;
      }

      setCreating(false);
      setEditing(null);
      await loadList(savedId);
      onSaved?.();
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar SKU.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSku(id: string) {
    const ok = window.confirm("Excluir este SKU? Fotos e estoque vinculados podem impedir a exclusão.");
    if (!ok) return;

    setErr(null);
    setSaving(true);

    try {
      await ensureAuthenticatedSession();

      const { error } = await supabase.from(T.SKUS).delete().eq("id", id);
      if (error) throw new Error(error.message);

      const nextList = list.filter((s) => s.id !== id);
      const nextSelectedId =
        selectedSkuId === id ? nextList[0]?.id || "" : selectedSkuId || "";

      setCreating(false);
      setEditing(null);
      await loadList(nextSelectedId);
      onSaved?.();
    } catch (e: any) {
      setErr(e?.message || "Erro ao excluir SKU.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSkuLabel = useMemo(() => {
    const selected = list.find((s) => s.id === (selectedSkuId || ""));
    return selected ? skuDisplayTitle(selected) : null;
  }, [list, selectedSkuId, titleField]);

  return (
    <div className="space-y-5">
      {err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {!canActivate ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          Para criar SKU <b>ativo</b>, defina no produto: <b>Fornecedor (Bruto)</b> e <b>Galvânica</b>.
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {loadingContext
            ? "Carregando regras do produto..."
            : isRing
            ? "Produto detectado como anel → tamanho do anel será exigido."
            : `Produto: ${productName}${selectedSkuLabel ? ` • SKU selecionado: ${selectedSkuLabel}` : ""}`}
        </div>

        <GhostButton
          disabled={saving || loadingContext}
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
        >
          + Novo SKU
        </GhostButton>
      </div>

      {(creating || editing) && !loadingContext ? (
        <SkuEditor
          isRing={isRing}
          titleField={titleField}
          initial={editing}
          saving={saving}
          canActivate={canActivate}
          stoneOptions={stoneOptions}
          stoneColorOptions={stoneColorOptions}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(payload) => upsertSku(payload)}
        />
      ) : null}

      <div className="rounded-3xl border overflow-hidden bg-white">
        <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Lista de SKUs</div>
          {loadingList ? (
            <div className="text-xs text-gray-500">Carregando…</div>
          ) : (
            <div className="text-xs text-gray-500">{list.length} item(ns)</div>
          )}
        </div>

        {loadingList ? (
          <div className="p-5 text-sm text-gray-600">Carregando...</div>
        ) : list.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">Nenhum SKU cadastrado.</div>
        ) : (
          <div className="divide-y">
            {list.map((s) => {
              const stoneName = s.stone_id
                ? stoneOptions.find((o) => o.id === s.stone_id)?.name ?? "Pedra"
                : null;

              const stoneColorName = s.stone_color_id
                ? stoneColorOptions.find((o) => o.id === s.stone_color_id)?.name ?? "Cor"
                : null;

              const isSel = s.id === (selectedSkuId || "");

              const label = [
                s.plating_type ? `${s.plating_type}` : null,
                s.plating_millesimal ? `${s.plating_millesimal}` : null,
                isRing ? (s.ring_size ? `Tam ${s.ring_size}` : "Tam -") : null,
                stoneName ? (stoneColorName ? `${stoneName} • ${stoneColorName}` : stoneName) : null,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <div
                  key={s.id}
                  className={cx(
                    "p-4 flex items-center justify-between gap-3",
                    isSel ? "bg-emerald-900/5" : "bg-white"
                  )}
                >
                  <button
                    type="button"
                    className="text-left min-w-0 flex-1"
                    onClick={() => onSelectSku(s.id)}
                    title="Selecionar SKU"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {skuDisplayTitle(s)}
                      </div>

                      {s.active === false ? <Badge tone="warn">Inativo</Badge> : <Badge tone="ok">Ativo</Badge>}
                      {isSel ? <Badge tone="active">Selecionado</Badge> : null}
                    </div>

                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {label || "Sem banho/milésimo"} <span className="text-gray-300">•</span>{" "}
                      <span className="font-mono">{s.sku_code || s.barcode || s.id}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-[#2b554e]">
                      {formatBRL(s.price_cents ?? 0)}
                    </div>

                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => {
                        setEditing(s);
                        setCreating(false);
                      }}
                      disabled={saving}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                      onClick={() => removeSku(s.id)}
                      disabled={saving}
                    >
                      Excluir
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
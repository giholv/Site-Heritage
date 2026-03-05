import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import StockTab from "./tabs/StockTab";
import SkuImagesDnd from "./tabs/SkuImagesDnd";


const T = {
  PRODUCTS: "products",
  CATEGORY_TREE: "category_tree",
  COLLECTIONS: "collections",
  STYLES: "styles",
  SUPPLIERS: "suppliers",
  PRODUCT_COLLECTIONS: "product_collections",
  PRODUCT_STYLES: "product_styles",
  SKUS: "skus",
  STONES: "stones",
  STONE_COLORS: "stone_colors",
};

type SectionKey = "info" | "variacoes" | "fotos" | "estoque" | "seo";
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "info", label: "Produto" },
  { key: "variacoes", label: "SKUs" },
  { key: "fotos", label: "Fotos" },
  { key: "estoque", label: "Estoque" },
  { key: "seo", label: "SEO" },
];

type CategoryTreeRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  position: number;
  active: boolean;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  position?: number | null;
};

type SupplierRow = {
  id: string;
  name: string;
  corporate_name: string | null;
  cnpj: string | null;
  active: boolean | null;
};

type ProductStatus = "draft" | "active";

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
  created_at?: string;
  updated_at?: string;


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

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function slugify(v: string) {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCsvList(v: string) {
  const arr = (v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length ? arr : [];
}

function cleanCNPJ(v: string) {
  return (v || "").replace(/\D/g, "").slice(0, 14);
}

function formatCNPJ(v: string | null) {
  const n = cleanCNPJ(v || "");
  if (n.length !== 14) return v || "";
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

function formatBRL(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function ensureUniqueSlug(base: string, currentId?: string | null) {
  const clean = slugify(base);
  if (!clean) return "produto";

  const { data: existing0, error: e0 } = await supabase
    .from(T.PRODUCTS)
    .select("id")
    .eq("slug", clean)
    .maybeSingle();

  if (e0) throw new Error(e0.message);
  if (!existing0) return clean;
  if (currentId && (existing0 as any).id === currentId) return clean;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${clean}-${i}`;
    const { data, error } = await supabase
      .from(T.PRODUCTS)
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return candidate;
    if (currentId && (data as any).id === currentId) return candidate;
  }

  return `${clean}-${Date.now()}`;
}

/** =========================
 *  UI
 *  ========================= */

const CALEA = { primary: "#2b554e" };

function Field({
  label,
  hint,
  required,
  children,
  right,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-900">
          {label} {required ? <span className="text-emerald-700">*</span> : null}
        </label>
        {right ?? null}
      </div>
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

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
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

function SoftCard({
  id,
  title,
  subtitle,
  children,
  right,
}: {
  id: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-3xl border bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
          </div>
          {right ?? null}
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
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
        "rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-sm transition",
        "disabled:opacity-50 disabled:cursor-not-allowed hover:shadow"
      )}
      style={{ backgroundColor: CALEA.primary }}
    >
      {children}
    </button>
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

function PillButton({
  active,
  onClick,
  left,
  children,
  right,
}: {
  active?: boolean;
  onClick?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-2xl px-3 py-2.5 text-sm transition flex items-center justify-between gap-2",
        active ? "bg-emerald-900 text-white shadow-sm" : "text-gray-700 hover:bg-gray-50"
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        {left ?? null}
        <span className="truncate">{children}</span>
      </span>
      {right ?? null}
    </button>
  );
}

/**
 * SearchSelect (single select) – sem libs
 */
function SearchSelect({
  label,
  required,
  value,
  onChange,
  placeholder,
  options,
  hint,
  allowClear,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: Array<{ id: string; name: string; search?: string }>;
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
      <label className="text-sm font-medium text-gray-900">
        {label} {required ? <span className="text-emerald-700">*</span> : null}
      </label>

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

/**
 * ChipMultiSelect – Coleções / Estilos (id[])
 */
function ChipMultiSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: Array<{ id: string; name: string; search?: string }>;
}) {
  const [q, setQ] = useState("");
  const selectedSet = useMemo(() => new Set(value), [value]);

  const selected = useMemo(() => options.filter((o) => selectedSet.has(o.id)), [options, selectedSet]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = qq ? options.filter((o) => ((o.search || o.name).toLowerCase().includes(qq))) : options;

    return [...base].sort((a, b) => {
      const as = selectedSet.has(a.id) ? 0 : 1;
      const bs = selectedSet.has(b.id) ? 0 : 1;
      return as - bs || a.name.localeCompare(b.name);
    });
  }, [q, options, selectedSet]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {selected.length ? <span className="text-xs text-gray-500">{selected.length}</span> : null}
      </div>

      {selected.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(value.filter((id) => id !== s.id))}
              className="group inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
              title="Remover"
            >
              <span className="truncate max-w-[220px]">{s.name}</span>
              <span className="text-gray-400 group-hover:text-gray-700">✕</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Nenhuma seleção.</div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar e selecionar…"
        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
      />

      <div className="rounded-3xl border bg-white overflow-hidden">
        <div className="max-h-56 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Nada encontrado.</div>
          ) : (
            filtered.map((o) => {
              const isOn = selectedSet.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    if (isOn) onChange(value.filter((id) => id !== o.id));
                    else onChange([...value, o.id]);
                  }}
                  className={cx(
                    "w-full flex items-center justify-between gap-3 px-4 py-3 text-sm",
                    "hover:bg-gray-50",
                    isOn && "bg-emerald-900/5"
                  )}
                >
                  <span className="truncate">{o.name}</span>

                  <span
                    className={cx(
                      "shrink-0 inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium border",
                      isOn
                        ? "border-emerald-900/20 bg-emerald-900 text-white"
                        : "border-gray-200 text-gray-600 bg-white"
                    )}
                  >
                    {isOn ? "Selecionado" : "Adicionar"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCardPreview({
  name,
  slug,
  priceCents,
  primaryImageUrl,
  platingLabel,
  isRing,
  ringSize,
}: {
  name: string;
  slug: string;
  priceCents: number;
  primaryImageUrl?: string | null;
  platingLabel?: string | null;
  isRing?: boolean;
  ringSize?: number | null;
}) {
  return (
    <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
      <div className="aspect-[4/5] bg-gray-100 relative">
        {primaryImageUrl ? (
          <img src={primaryImageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
            Sem foto (SKU selecionado)
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold text-gray-800 border">
            Prévia
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="text-sm font-semibold text-gray-900 line-clamp-2">
          {name?.trim() ? name : "Nome do produto"}
        </div>

        <div className="mt-1 text-xs text-gray-500 font-mono">/produto/{slug || "..."}</div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: CALEA.primary }}>
            {formatBRL(priceCents)}
          </div>
          <div className="text-xs text-gray-500">
            {platingLabel?.trim() ? platingLabel : "banho do SKU não informado"}
          </div>
        </div>

        {isRing ? (
          <div className="mt-2 text-xs text-gray-500">
            Tamanho do anel: <span className="font-semibold text-gray-700">{ringSize ?? "-"}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TopBar({
  title,
  subtitle,
  dirty,
  saving,
  status,
  canPublish,
  onSave,
  onPublish,
  onClose,
}: {
  title: string;
  subtitle?: string;
  dirty: boolean;
  saving: boolean;
  status: ProductStatus;
  canPublish: boolean;
  onSave: () => void;
  onPublish: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">{title}</h1>
            <Badge tone={status === "active" ? "active" : "draft"}>{status === "active" ? "Ativo" : "Rascunho"}</Badge>
            {dirty ? <Badge tone="warn">Alterações não salvas</Badge> : <Badge tone="ok">Salvo</Badge>}
          </div>
          {subtitle ? <div className="text-sm text-gray-500 mt-1 truncate">{subtitle}</div> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GhostButton disabled={saving} onClick={onSave}>
            {saving ? "Salvando…" : "Salvar"}
          </GhostButton>
          <PrimaryButton disabled={saving || !canPublish} onClick={onPublish}>
            {saving ? "Salvando…" : "Publicar"}
          </PrimaryButton>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border bg-white px-3 py-2 text-gray-600 hover:bg-gray-50"
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/** =========================
 *  SKU Editor + Manager
 *  ========================= */

function normalizePriceToCents(v: string) {
  const cleaned = (v || "").replace(/[^\d.,]/g, "").replace(",", ".");
  if (!cleaned.trim()) return null; // <- ESSA LINHA resolve
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null; // custo/preço não pode ser 0
  return Math.round(n * 100);
}

function SkuEditor({
  isRing,
  initial,
  onCancel,
  onSave,
  saving,
  canActivate,
  stoneOptions,
  stoneColorOptions,
}: {
  isRing: boolean;
  initial?: Partial<SkuDbRow> | null;
  onCancel: () => void;
  onSave: (payload: Partial<SkuDbRow>) => void;
  saving: boolean;
  canActivate: boolean;
  stoneOptions: Array<{ id: string; name: string; search?: string }>;
  stoneColorOptions: Array<{ id: string; name: string; search?: string }>;
}) {
  const [title, setTitle] = useState((initial as any)?.title ?? (initial as any)?.name ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [platingType, setPlatingType] = useState(initial?.plating_type ?? "");
  const [millesimal, setMillesimal] = useState(initial?.plating_millesimal ? String(initial?.plating_millesimal) : "");
  const [ringSize, setRingSize] = useState(initial?.ring_size ? String(initial?.ring_size) : "");
  const [active, setActive] = useState<boolean>(initial?.active ?? false); // default false (evita CHECK)
  const [err, setErr] = useState<string | null>(null);
  const [stoneId, setStoneId] = useState((initial as any)?.stone_id ?? "");
  const [stoneColorId, setStoneColorId] = useState((initial as any)?.stone_color_id ?? "");
  const [cost, setCost] = useState(initial?.cost_cents ? String((initial.cost_cents ?? 0) / 100) : "");
  const [marginPct, setMarginPct] = useState(String((initial as any)?.target_margin_pct ?? "0"));
  const [roundStep, setRoundStep] = useState(String((initial as any)?.price_round_step_cents ?? "100"));

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
          <div className="text-sm font-semibold text-gray-900">{(initial as any)?.id ? "Editar SKU" : "Novo SKU"}</div>
          <div className="text-xs text-gray-500">
          </div>
        </div>
        <div className="md:col-span-4">
          <SearchSelect
            label="Pedra"
            value={stoneId}
            onChange={(v) => {
              setStoneId(v);
              if (!v) setStoneColorId(""); // limpou pedra => limpa cor
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
        <div className="flex gap-2">
          <GhostButton disabled={saving} onClick={onCancel}>
            Cancelar
          </GhostButton>
          <PrimaryButton
            disabled={saving || !canSave}

            onClick={() => {
              setErr(null);

              // CUSTO obrigatório
              const cost_cents = normalizePriceToCents(cost);
              if (cost_cents === null) return setErr("Custo inválido.");

              // margem e arredondamento
              const target_margin_pct = Number(marginPct);
              if (!Number.isFinite(target_margin_pct)) return setErr("Margem inválida.");

              const price_round_step_cents = Number(roundStep);
              if (!Number.isFinite(price_round_step_cents) || price_round_step_cents <= 0) return setErr("Arredondamento inválido.");

              if (!platingType.trim()) return setErr("Informe o tipo de banho.");
              const pm = Number(millesimal);
              if (!Number.isFinite(pm) || pm <= 0) return setErr("Milésimo inválido.");

              const rs = ringSize.trim() ? Number(ringSize) : null;
              if (isRing && (!rs || !Number.isFinite(rs))) return setErr("Tamanho do anel inválido.");

              const finalActive = active && canActivate;

              const finalStoneId = stoneId ? stoneId : null;
              const finalStoneColorId = finalStoneId ? (stoneColorId ? stoneColorId : null) : null;

              onSave({
                title: title.trim() || null,
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
          Para ativar o SKU, selecione **Fornecedor (Bruto)** e **Fornecedor (Galvânica)** no Produto.
        </div>
      ) : null}

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5">
          <Field label="Nome da variação" hint="Ex: Ouro 10 • Tam 16">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opcional" />
          </Field>
        </div>
        <div className="md:col-span-3">
          <Field label="Código interno SKU" hint="Gerado automaticamente">
            <TextInput value={initial?.sku_code || "Será gerado ao salvar"} disabled className="bg-gray-50" />
          </Field>
        </div>
        <div className="md:col-span-4">
          <Field label="Código de barras">
            <TextInput value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Ex: 789..." />
          </Field>
        </div>

        <div className="md:col-span-4">
          <Field label="Tipo de banho" required>
            <TextInput value={platingType} onChange={(e) => setPlatingType(e.target.value)} placeholder="Ex: ouro, ródio, prata" />
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
            <TextInput value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </Field>
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
          <Field label="Preço (calculado)">
            <TextInput
              value={initial?.price_cents ? formatBRL(initial.price_cents) : "Salve para calcular"}
              disabled
              className="bg-gray-50"
            />
          </Field>
        </div>
        {(() => {
          const pc = initial?.price_cents ?? null;      // preço do banco
          const cc = normalizePriceToCents(cost);      // custo digitado

          if (!pc || !cc) return null;

          const markup = (pc - cc) / cc;
          const margin = (pc - cc) / pc;

          return (
            <div className="md:col-span-4">
              <Field label="Margem / Markup" hint="Com base no preço calculado">
                <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-gray-800">
                  Margem: <b>{(margin * 100).toFixed(1)}%</b> • Markup: <b>{(markup * 100).toFixed(1)}%</b>
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
          <Field label="Ativo" hint={!canActivate ? "Vai salvar como inativo (regra do banco)." : undefined}>
            <select
              value={active ? "1" : "0"}
              onChange={(e) => setActive(e.target.value === "1")}
              className="w-full -mb-2 rounded-2xl border bg-white px-4 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
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

function SkusManager({
  productId,
  isRing,
  supplierId,
  platingSupplierId,
  selectedSkuId,
  onSelectSku,
  onSelectedSkuMeta,
  stoneOptions,
  stoneColorOptions,
}: {
  productId: string;
  isRing: boolean;
  supplierId: string;
  platingSupplierId: string;
  selectedSkuId: string | null;
  onSelectSku: (id: string | null) => void;
  onSelectedSkuMeta: (meta: { priceCents: number; platingLabel: string | null; ringSize: number | null }) => void;
  stoneOptions: Array<{ id: string; name: string; search?: string }>;
  stoneColorOptions: Array<{ id: string; name: string; search?: string }>;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [list, setList] = useState<SkuDbRow[]>([]);
  const [editing, setEditing] = useState<SkuDbRow | null>(null);
  const [creating, setCreating] = useState(false);

  const [titleField, setTitleField] = useState<"title" | "name" | "label" | "variant_name">("title");

  const canActivate = !!supplierId && !!platingSupplierId;

  function skuDisplayTitle(s: SkuDbRow) {
    const v = (s as any)[titleField] as string | null | undefined;
    return v?.trim() || s.sku_code?.trim() || s.barcode?.trim() || "SKU";
  }

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
  async function load() {
    setErr(null);
    setLoading(true);

    try {
      // tenta achar um campo de título que exista sem você mexer no banco
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

        // se falhou por outro motivo, não fica tentando
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
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar SKUs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const selectedSku = useMemo(() => list.find((s) => s.id === selectedSkuId) || null, [list, selectedSkuId]);

  useEffect(() => {
    if (!selectedSku) {
      onSelectedSkuMeta({ priceCents: 0, platingLabel: null, ringSize: null });
      return;
    }
    const platingLabel = selectedSku.plating_type
      ? `${selectedSku.plating_type}${selectedSku.plating_millesimal ? ` ${selectedSku.plating_millesimal}` : ""}`
      : null;

    onSelectedSkuMeta({
      priceCents: selectedSku.price_cents ?? 0,
      platingLabel,
      ringSize: selectedSku.ring_size ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkuId, list]);

  async function upsertSku(payload: Partial<SkuDbRow>) {
    setErr(null);
    setSaving(true);

    try {
      const skuPayload: any = {
        ...payload,
        supplier_id: supplierId || null,
        plating_supplier_id: platingSupplierId || null,
      };

      if (skuPayload.active && !canActivate) skuPayload.active = false;

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

      let saved: SkuDbRow;

      if (editing?.id) {
        const { data, error } = await supabase
          .from(T.SKUS)
          .update({ ...skuPayload, updated_at: new Date().toISOString() })
          .eq("id", editing.id)
          .select(retSelect)
          .single();

        if (error) throw new Error(error.message);
        saved = data as SkuDbRow;

        setList((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
        setEditing(saved); // opcional (mantém editor com preço atualizado)
      } else {
        const { data, error } = await supabase
          .from(T.SKUS)
          .insert({ product_id: productId, ...skuPayload })
          .select(retSelect)
          .single();

        if (error) throw new Error(error.message);
        saved = data as SkuDbRow;

        setList((prev) => [...prev, saved].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")));
      }

      setCreating(false);
      // se quiser fechar editor após salvar:
      // setEditing(null);
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar SKU.");
    } finally {
      setSaving(false);
    }
  }
  async function removeSku(id: string) {
    const ok = window.confirm("Excluir este SKU? (Fotos/estoque vinculados podem quebrar)");
    if (!ok) return;

    setErr(null);
    setSaving(true);
    try {
      const { error } = await supabase.from(T.SKUS).delete().eq("id", id);
      if (error) throw new Error(error.message);

      if (selectedSkuId === id) onSelectSku(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erro ao excluir SKU.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : null}

      {!canActivate ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          Para criar SKU **ativo**, defina no Produto: <b>Fornecedor (Bruto)</b> e <b>Fornecedor (Galvânica)</b>.
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {isRing ? "Produto detectado como anel → tamanho do anel será exigido no SKU." : " "}

        </div>

        <GhostButton
          disabled={saving}
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
        >
          + Novo SKU
        </GhostButton>
      </div>

      {(creating || editing) ? (
        <SkuEditor
          isRing={isRing}
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

      <div className="rounded-3xl border overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Lista de SKUs</div>
          {loading ? <div className="text-xs text-gray-500">Carregando…</div> : <div className="text-xs text-gray-500">{list.length} item(ns)</div>}
        </div>

        {list.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">Nenhum SKU cadastrado.</div>
        ) : (
          <div className="divide-y">
            {list.map((s) => {

              const stoneName = s.stone_id ? (stoneOptions.find(o => o.id === s.stone_id)?.name ?? "Pedra") : null;
              const stoneColorName = s.stone_color_id ? (stoneColorOptions.find(o => o.id === s.stone_color_id)?.name ?? "Cor") : null;


              const isSel = s.id === selectedSkuId;

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
                      {s.active === false ? (
                        <Badge tone="warn">Inativo</Badge>
                      ) : (
                        <Badge tone="ok">Ativo</Badge>
                      )}
                      {isSel ? <Badge tone="active">Selecionado</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {label || "Sem banho/milésimo"} <span className="text-gray-300">•</span>{" "}
                      <span className="font-mono">{s.sku_code || s.barcode || s.id}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold" style={{ color: CALEA.primary }}>
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

/** =========================
 *  Main Component
 *  ========================= */

export default function AdminProductCreateUX() {
  const nav = useNavigate();

  const [active, setActive] = useState<SectionKey>("info");
  const ids = useMemo(() => SECTIONS.map((s) => s.key), []);

  const [productId, setProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [selectedSkuPrimaryImageUrl, setSelectedSkuPrimaryImageUrl] = useState<string | null>(null);
  const [selectedSkuPriceCents, setSelectedSkuPriceCents] = useState<number>(0);
  const [selectedSkuPlatingLabel, setSelectedSkuPlatingLabel] = useState<string | null>(null);
  const [selectedSkuRingSize, setSelectedSkuRingSize] = useState<number | null>(null);

  // product fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [primaryCategoryId, setPrimaryCategoryId] = useState("");

  const [materialBase, setMaterialBase] = useState("");
  const [importantNotes, setImportantNotes] = useState("");

  // fornecedores
  const [supplierId, setSupplierId] = useState(""); // bruto (products.supplier_id)
  const [platingSupplierId, setPlatingSupplierId] = useState(""); // galvânica (products.plating_supplier_id)

  // novos campos do produto
  const [supplierOrderNumber, setSupplierOrderNumber] = useState("");
  const [supplierOriginCode, setSupplierOriginCode] = useState("");
  const [galvanicPlatingCode, setGalvanicPlatingCode] = useState("");

  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [styleIds, setStyleIds] = useState<string[]>([]);

  // combos
  const [categoryTree, setCategoryTree] = useState<CategoryTreeRow[]>([]);
  const [collections, setCollections] = useState<TagRow[]>([]);
  const [styles, setStyles] = useState<TagRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [stones, setStones] = useState<TagRow[]>([]);
  const [stoneColors, setStoneColors] = useState<TagRow[]>([]);

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [searchTags, setSearchTags] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function markDirty() {
    setDirty(true);
    if (okMsg) setOkMsg(null);
  }

  // reset primary image when sku changes
  useEffect(() => {
    setSelectedSkuPrimaryImageUrl(null);
  }, [selectedSkuId]);

  // slug auto (só se slug vazio)
  useEffect(() => {
    if (!name.trim()) return;
    if (slug.trim()) return;
    setSlug(slugify(name));
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  // scroll spy
  useEffect(() => {
    const handler = () => {
      const offsets = ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: Number.POSITIVE_INFINITY };
        return { id, top: el.getBoundingClientRect().top };
      });

      const candidate = offsets
        .filter((o) => o.top <= 140)
        .sort((a, b) => b.top - a.top)[0];

      if (candidate?.id) setActive(candidate.id as SectionKey);
    };

    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [ids]);

  // warn on close tab if dirty
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  // load combos
  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        const [ctRes, colRes, stRes, supRes, stoneRes, stoneColorRes] = await Promise.all([
          supabase
            .from(T.CATEGORY_TREE)
            .select("id,name,slug,parent_id,position,active")
            .eq("active", true)
            .order("position", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from(T.COLLECTIONS)
            .select("id,name,slug,active,position")
            .eq("active", true)
            .order("position", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from(T.STYLES)
            .select("id,name,slug,active,position")
            .eq("active", true)
            .order("position", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from(T.SUPPLIERS)
            .select("id,name,corporate_name,cnpj,active")
            .order("name", { ascending: true }),

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

        if (ctRes.error) throw new Error(ctRes.error.message);
        if (colRes.error) throw new Error(colRes.error.message);
        if (stRes.error) throw new Error(stRes.error.message);
        if (supRes.error) throw new Error(supRes.error.message);
        if (stoneRes.error) throw new Error(stoneRes.error.message);
        if (stoneColorRes.error) throw new Error(stoneColorRes.error.message);

        setCategoryTree((ctRes.data ?? []) as CategoryTreeRow[]);
        setCollections((colRes.data ?? []) as TagRow[]);
        setStyles((stRes.data ?? []) as TagRow[]);
        setSuppliers((supRes.data ?? []) as SupplierRow[]);
        setStones((stoneRes.data ?? []) as TagRow[]);
        setStoneColors((stoneColorRes.data ?? []) as TagRow[]);
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar dados.");
      }
    })();
  }, []);

  // category dropdown flatten: “Pai / Filho”
  const categoryDropdown = useMemo(() => {
    const roots = categoryTree.filter((c) => !c.parent_id);
    const childrenByParent = new Map<string, CategoryTreeRow[]>();

    for (const c of categoryTree) {
      if (!c.parent_id) continue;
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    }

    for (const [k, arr] of childrenByParent) {
      arr.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
      childrenByParent.set(k, arr);
    }

    const flat: Array<{ id: string; name: string; search: string }> = [];
    for (const r of roots) {
      flat.push({ id: r.id, name: r.name, search: r.name });
      const children = childrenByParent.get(r.id) ?? [];
      for (const ch of children) {
        flat.push({
          id: ch.id,
          name: `${r.name} / ${ch.name}`,
          search: `${r.name} ${ch.name}`,
        });
      }
    }
    return { flat };
  }, [categoryTree]);

  const supplierOptions = useMemo(() => {
    return suppliers
      .filter((s) => s.active !== false)
      .map((s) => {
        const label = s.name || s.corporate_name || "Fornecedor";
        const cnpj = s.cnpj ? formatCNPJ(s.cnpj) : "";
        return { id: s.id, name: cnpj ? `${label} — ${cnpj}` : label, search: `${label} ${cnpj}`.trim() };
      });
  }, [suppliers]);

  const collectionOptions = useMemo(
    () => collections.filter((c) => c.active !== false).map((c) => ({ id: c.id, name: c.name, search: c.name })),
    [collections]
  );

  const styleOptions = useMemo(
    () => styles.filter((s) => s.active !== false).map((s) => ({ id: s.id, name: s.name, search: s.name })),
    [styles]
  );

  const stoneOptions = useMemo(
    () => stones.filter((s) => s.active !== false).map((s) => ({ id: s.id, name: s.name, search: s.name })),
    [stones]
  );

  const stoneColorOptions = useMemo(
    () => stoneColors.filter((c) => c.active !== false).map((c) => ({ id: c.id, name: c.name, search: c.name })),
    [stoneColors]
  );

  const selectedCategory = useMemo(
    () => categoryTree.find((c) => c.id === primaryCategoryId) || null,
    [categoryTree, primaryCategoryId]
  );

  // heurística simples: slug contém "anel" ou "aneis"
  const isRing = useMemo(() => {
    const sl = (selectedCategory?.slug || "").toLowerCase();
    return sl.includes("anel") || sl.includes("aneis");
  }, [selectedCategory?.slug]);

  async function syncProductLinks(pid: string) {
    // collections
    {
      const { error: delErr } = await supabase.from(T.PRODUCT_COLLECTIONS).delete().eq("product_id", pid);
      if (delErr) throw new Error(delErr.message);

      if (collectionIds.length) {
        const rows = collectionIds.map((collection_id) => ({ product_id: pid, collection_id }));
        const { error } = await supabase.from(T.PRODUCT_COLLECTIONS).insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    // styles
    {
      const { error: delErr } = await supabase.from(T.PRODUCT_STYLES).delete().eq("product_id", pid);
      if (delErr) throw new Error(delErr.message);

      if (styleIds.length) {
        const rows = styleIds.map((style_id) => ({ product_id: pid, style_id }));
        const { error } = await supabase.from(T.PRODUCT_STYLES).insert(rows);
        if (error) throw new Error(error.message);
      }
    }
  }

  function validateBasics() {
    if (!name.trim()) return { ok: false as const, msg: "Informe o nome do produto.", section: "info" as SectionKey };
    if (!primaryCategoryId) return { ok: false as const, msg: "Selecione a categoria.", section: "info" as SectionKey };
    return { ok: true as const };
  }

  async function saveProduct(nextStatus?: ProductStatus) {
    setErr(null);
    setOkMsg(null);

    const v = validateBasics();
    if (!v.ok) {
      setErr(v.msg);
      scrollToId(v.section);
      return null;
    }

    setSaving(true);
    try {
      const cleanName = name.trim();
      const finalSlug = slug.trim()
        ? await ensureUniqueSlug(slug.trim(), productId)
        : await ensureUniqueSlug(cleanName, productId);

      const payload: any = {
        name: cleanName,
        slug: finalSlug,
        description: description.trim() || null,
        status: nextStatus ?? status,
        primary_category_id: primaryCategoryId || null,

        material_base: materialBase.trim() || null,
        important_notes: importantNotes.trim() || null,

        supplier_id: supplierId || null, // bruto
        plating_supplier_id: platingSupplierId || null, // galvânica

        supplier_order_number: supplierOrderNumber.trim() || null,
        supplier_origin_code: supplierOriginCode.trim() || null,
        galvanic_plating_code: galvanicPlatingCode.trim() || null,

        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        seo_keywords: parseCsvList(seoKeywords),
        search_tags: parseCsvList(searchTags),
      };

      if (!productId) {
        const { data, error } = await supabase.from(T.PRODUCTS).insert(payload).select("id,slug,status").single();
        if (error) throw new Error(error.message);

        await syncProductLinks((data as any).id);

        setProductId((data as any).id);
        setSlug((data as any).slug);
        setStatus((data as any).status as ProductStatus);
        setSelectedSkuId(null);

        setDirty(false);
        setOkMsg("Produto salvo.");
        return (data as any).id as string;
      } else {
        const { error } = await supabase
          .from(T.PRODUCTS)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", productId);

        if (error) throw new Error(error.message);

        await syncProductLinks(productId);

        setSlug(finalSlug);
        setStatus((nextStatus ?? status) as ProductStatus);
        setDirty(false);
        setOkMsg("Produto salvo.");
        return productId;
      }
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar produto.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  const sectionState = useMemo(() => {
    const infoOk = !!name.trim() && !!primaryCategoryId;
    const seoOk = !!seoTitle.trim() || !!seoDescription.trim() || !!seoKeywords.trim() || !!searchTags.trim();
    const skuOk = !!productId;

    return {
      info: infoOk ? "ok" : "warn",
      variacoes: skuOk ? "ok" : "warn",
      fotos: productId && selectedSkuId ? "ok" : "warn",
      estoque: productId && selectedSkuId ? "ok" : "warn",
      seo: seoOk ? "ok" : "warn",
    } as Record<SectionKey, "ok" | "warn">;
  }, [name, primaryCategoryId, seoTitle, seoDescription, seoKeywords, searchTags, productId, selectedSkuId]);

  const canPublish = useMemo(() => {
    if (!name.trim()) return false;
    if (!primaryCategoryId) return false;
    if (!productId) return false;
    return true;
  }, [name, primaryCategoryId, productId]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <TopBar
        title={name?.trim() ? name : "Novo produto"}
        subtitle={productId ? `ID: ${productId} • /produto/${slug || ""}` : "Salve para gerar ID e liberar SKUs"}
        dirty={dirty}
        saving={saving}
        status={status}
        canPublish={canPublish}
        onSave={() => saveProduct()}
        onPublish={async () => {
          const id = await saveProduct("active");
          if (id) setStatus("active");
        }}
        onClose={() => {
          if (dirty) {
            const ok = window.confirm("Você tem alterações não salvas. Sair mesmo assim?");
            if (!ok) return;
          }
          nav("/admin/produtos");
        }}
      />

      <div className="px-6 pt-6">
        {err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : null}
        {okMsg ? (
          <div className="mt-3 rounded-2xl border border-emerald-900/15 bg-emerald-900/5 px-4 py-3 text-sm text-emerald-900">
            {okMsg}
          </div>
        ) : null}
      </div>

      <div className="px-6 pb-28 mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main */}
        <div className="space-y-6">
          {/* INFO */}
          <SoftCard id="info" title="Produto" subtitle="Nome, categoria, fornecedores e dados do lote.">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-8">
                <Field label="Nome" required>
                  <TextInput
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      markDirty();
                      if (!slug.trim()) setSlug(slugify(e.target.value));
                    }}
                    placeholder="Ex: Anel Lumi"
                  />
                </Field>
              </div>

              <div className="md:col-span-4">
                <Field
                  label="Slug / URL"
                  right={
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:text-gray-800"
                      onClick={() => {
                        setSlug(slugify(name));
                        markDirty();
                      }}
                      title="Regerar baseado no nome"
                    >
                      regerar
                    </button>
                  }
                >
                  <TextInput
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      markDirty();
                    }}
                    placeholder="gerado automaticamente"
                    className="font-mono"
                  />
                </Field>
              </div>

              <div className="md:col-span-4">
                <Field label="Status">
                  <div className="w-full rounded-2xl border bg-white p-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStatus("draft");
                        markDirty();
                      }}
                      className={cx(
                        "flex-1 h-10 rounded-2xl text-sm font-medium whitespace-nowrap transition",
                        status === "draft"
                          ? "bg-emerald-900 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      Rascunho
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStatus("active");
                        markDirty();
                      }}
                      className={cx(
                        "flex-1 h-10 rounded-2xl text-sm font-medium whitespace-nowrap transition",
                        status === "active"
                          ? "bg-emerald-900 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      Ativo
                    </button>
                  </div>
                </Field>
              </div>

              <div className="md:col-span-4">
                <SearchSelect
                  label="Categoria"
                  required
                  value={primaryCategoryId}
                  onChange={(v) => {
                    setPrimaryCategoryId(v);
                    markDirty();
                  }}
                  placeholder="Selecione…"
                  options={categoryDropdown.flat}
                  allowClear
                  hint={selectedCategory ? `Slug: ${selectedCategory.slug}${isRing ? " • (Anel)" : ""}` : undefined}
                />
              </div>

              <div className="md:col-span-4">
                <SearchSelect
                  label="Fornecedor (Bruto)"
                  value={supplierId}
                  onChange={(v) => {
                    setSupplierId(v);
                    markDirty();
                  }}
                  placeholder="Selecionar…"
                  options={supplierOptions}
                  allowClear
                />
              </div>

              <div className="md:col-span-4">
                <SearchSelect
                  label="Galvânica"
                  value={platingSupplierId}
                  onChange={(v) => {
                    setPlatingSupplierId(v);
                    markDirty();
                  }}
                  placeholder="Selecionar…"
                  options={supplierOptions}
                  allowClear
                />
              </div>

              <div className="md:col-span-12">
                <div className="rounded-3xl border bg-gray-50 p-5">
                  <div className="text-sm font-semibold text-gray-900">Pedido / Origem / Galvânica</div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <Field label="Nº pedido Bruto">
                        <TextInput
                          value={supplierOrderNumber}
                          onChange={(e) => {
                            setSupplierOrderNumber(e.target.value);
                            markDirty();
                          }}
                          placeholder="Ex: PED-12345"
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-4">
                      <Field label="Código do fornecedor">
                        <TextInput
                          value={supplierOriginCode}
                          onChange={(e) => {
                            setSupplierOriginCode(e.target.value);
                            markDirty();
                          }}
                          placeholder="Ex: REF-ABC-999"
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-4">
                      <Field label="Lote banho">
                        <TextInput
                          value={galvanicPlatingCode}
                          onChange={(e) => {
                            setGalvanicPlatingCode(e.target.value);
                            markDirty();
                          }}
                          placeholder="Ex: GALV-OURO-10"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-12">
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

                  {/* esquerda */}
                  <div className="space-y-5 min-w-0">
                    <Field label="Material base">
                      <TextInput
                        value={materialBase}
                        onChange={(e) => {
                          setMaterialBase(e.target.value);
                          markDirty();
                        }}
                        placeholder="Ex: latão"
                      />
                    </Field>

                    <ChipMultiSelect
                      label="Estilo / Ocasião"
                      value={styleIds}
                      onChange={(v) => {
                        setStyleIds(v);
                        markDirty();
                      }}
                      options={styleOptions}
                    />
                  </div>

                  {/* direita */}
                  <div className="space-y-5 min-w-0">
                    <ChipMultiSelect
                      label="Coleções"
                      value={collectionIds}
                      onChange={(v) => {
                        setCollectionIds(v);
                        markDirty();
                      }}
                      options={collectionOptions}
                    />
                  </div>
                </div>
              </div>

              {/* descrição embaixo, largura total */}
              <div className="md:col-span-12">
                <Field label="Descrição (texto de venda)">
                  <TextArea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                    rows={5}
                    placeholder="Texto de venda…"
                  />
                </Field>
              </div>

              <div className="md:col-span-12 flex items-center justify-between gap-3 pt-2">
                <div className="text-xs text-gray-500">
                  {productId ? (
                    <>
                      Produto: <span className="font-mono">{productId}</span>
                    </>
                  ) : (
                    <>Salve para liberar SKUs, fotos e estoque.</>
                  )}
                </div>

                <div className="flex gap-2">
                  <GhostButton disabled={saving} onClick={() => saveProduct()}>
                    Salvar
                  </GhostButton>
                  <PrimaryButton
                    disabled={saving}
                    onClick={async () => {
                      const id = await saveProduct();
                      if (id) scrollToId("variacoes");
                    }}
                  >
                    Salvar e ir p/ SKUs
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </SoftCard>

          {/* SKUS */}
          <SoftCard
            id="variacoes"
            title="SKUs"
            right={productId ? <Badge tone="ok">Produto salvo</Badge> : <Badge tone="warn">Salve para liberar</Badge>}
          >
            {!productId ? (
              <div className="text-sm text-gray-700">Salve o produto para liberar o cadastro de SKUs.</div>
            ) : (
              <SkusManager
                productId={productId}
                isRing={isRing}
                supplierId={supplierId}
                platingSupplierId={platingSupplierId}
                selectedSkuId={selectedSkuId}
                onSelectSku={(id) => setSelectedSkuId(id)}
                onSelectedSkuMeta={(meta) => {
                  setSelectedSkuPriceCents(meta.priceCents);
                  setSelectedSkuPlatingLabel(meta.platingLabel);
                  setSelectedSkuRingSize(meta.ringSize);
                }}
                stoneOptions={stoneOptions}
                stoneColorOptions={stoneColorOptions}

              />
            )}
          </SoftCard>

          {/* FOTOS */}
          <SoftCard id="fotos" title="Fotos" subtitle="Upload por SKU.">
            {!productId ? (
              <div className="text-sm text-gray-700">Salve o produto para liberar as fotos.</div>
            ) : !selectedSkuId ? (
              <div className="text-sm text-gray-700">Selecione um SKU em “SKUs” para anexar fotos.</div>
            ) : (
              <SkuImagesDnd skuId={selectedSkuId} bucket="product-images" onPrimaryUrlChange={(url) => setSelectedSkuPrimaryImageUrl(url)} />
            )}
          </SoftCard>

          {/* ESTOQUE */}
          <SoftCard id="estoque" title="Estoque" subtitle="Movimentações por SKU.">
            {!productId ? (
              <div className="text-sm text-gray-700">Salve o produto para liberar o estoque.</div>
            ) : !selectedSkuId ? (
              <div className="text-sm text-gray-700">Selecione um SKU em “SKUs” para gerenciar estoque.</div>
            ) : (
              <StockTab skuId={selectedSkuId} />
            )}
          </SoftCard>

          {/* SEO */}
          <SoftCard id="seo" title="SEO" subtitle="Título, descrição e tags internas.">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <Field label="Título SEO">
                  <TextInput
                    value={seoTitle}
                    onChange={(e) => {
                      setSeoTitle(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
              </div>

              <div className="md:col-span-6">
                <Field label="Palavras-chave SEO (vírgula)">
                  <TextInput
                    value={seoKeywords}
                    onChange={(e) => {
                      setSeoKeywords(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
              </div>

              <div className="md:col-span-12">
                <Field label="Descrição SEO">
                  <TextArea
                    value={seoDescription}
                    onChange={(e) => {
                      setSeoDescription(e.target.value);
                      markDirty();
                    }}
                    rows={3}
                  />
                </Field>
              </div>

              <div className="md:col-span-12">
                <Field label="Tags internas (vírgula)">
                  <TextInput
                    value={searchTags}
                    onChange={(e) => {
                      setSearchTags(e.target.value);
                      markDirty();
                    }}
                  />
                </Field>
              </div>

              <div className="md:col-span-12 flex justify-end gap-2">
                <GhostButton disabled={saving} onClick={() => saveProduct()}>
                  {saving ? "Salvando…" : "Salvar SEO"}
                </GhostButton>
              </div>
            </div>
          </SoftCard>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border bg-white shadow-sm p-3">
            <div className="px-2 py-2 flex items-center justify-between">
              <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Seções</div>
              <div className="text-xs text-gray-500">{productId ? "Editando" : "Novo"}</div>
            </div>

            <div className="space-y-1">
              {SECTIONS.map((s) => (
                <PillButton
                  key={s.key}
                  active={active === s.key}
                  onClick={() => scrollToId(s.key)}
                  left={
                    <span
                      className={cx(
                        "inline-flex h-2.5 w-2.5 rounded-full",
                        sectionState[s.key] === "ok" ? "bg-emerald-900" : "bg-amber-500"
                      )}
                    />
                  }
                  right={<span className="text-xs opacity-80">{sectionState[s.key] === "ok" ? "ok" : "pend"}</span>}
                >
                  {s.label}
                </PillButton>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t px-2 space-y-2">
              <div className="text-xs text-gray-500">
                {productId ? (
                  <>
                    ID: <span className="font-mono">{productId}</span>
                  </>
                ) : (
                  <>Salve para gerar o ID.</>
                )}
              </div>

              <div className="rounded-3xl border bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Prévia</div>
                <ProductCardPreview
                  name={name}
                  slug={slug}
                  priceCents={selectedSkuPriceCents}
                  primaryImageUrl={selectedSkuPrimaryImageUrl}
                  platingLabel={selectedSkuPlatingLabel}
                  isRing={isRing}
                  ringSize={selectedSkuRingSize}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur">
        <div className="px-6 py-3 flex items-center justify-between gap-3">
          <button
            className="rounded-2xl border bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
            type="button"
            onClick={() => {
              if (dirty) {
                const ok = window.confirm("Você tem alterações não salvas. Sair mesmo assim?");
                if (!ok) return;
              }
              nav("/admin/produtos");
            }}
          >
            Cancelar
          </button>

          <div className="flex gap-2">
            <GhostButton disabled={saving} onClick={() => saveProduct()}>
              {saving ? "Salvando…" : "Salvar"}
            </GhostButton>
            <PrimaryButton
              disabled={saving}
              onClick={async () => {
                const id = await saveProduct();
                if (id) scrollToId("variacoes");
              }}
            >
              {saving ? "Salvando…" : productId ? "Salvar e ir p/ SKUs" : "Salvar e liberar SKUs"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
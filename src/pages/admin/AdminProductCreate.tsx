import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import SkusTab from "./tabs/SkusTab";
import StockTab from "./tabs/StockTab";
import SkuImagesDnd from "./tabs/SkuImagesDnd";

type SectionKey =
  | "info"
  | "variacoes"
  | "fotos"
  | "estoque"
  | "pesos"
  | "fiscal"
  | "seo";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "info", label: "Informações" },
  { key: "variacoes", label: "Variações" },
  { key: "fotos", label: "Fotos" },
  { key: "estoque", label: "Estoque" },
  { key: "pesos", label: "Pesos" },
  { key: "fiscal", label: "Fiscal" },
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
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(
    8,
    12
  )}-${n.slice(12)}`;
}

async function ensureUniqueSlug(base: string, currentId?: string | null) {
  const clean = slugify(base);
  if (!clean) return "produto";

  const { data: existing0, error: e0 } = await supabase
    .from("products")
    .select("id")
    .eq("slug", clean)
    .maybeSingle();

  if (e0) throw new Error(e0.message);
  if (!existing0) return clean;
  if (currentId && existing0.id === currentId) return clean;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${clean}-${i}`;
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return candidate;
    if (currentId && data.id === currentId) return candidate;
  }

  return `${clean}-${Date.now()}`;
}

/** =========================
 *  UI helpers (Caléa style)
 *  ========================= */

const CALEA = {
  primary: "#2b554e",
};

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
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
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-900">
          {label} {required ? <span className="text-emerald-700">*</span> : null}
        </label>
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
        "w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900",
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
        "w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900",
        "placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30",
        props.className
      )}
    />
  );
}

function DividerLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-gray-200" />
      <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {text}
      </div>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-2xl px-3 py-2.5 text-sm transition",
        active
          ? "bg-emerald-900 text-white shadow-sm"
          : "text-gray-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

/**
 * SearchSelect (single select) – para Categoria e Fornecedor
 * - Sem libs
 * - Popover com busca
 */
function SearchSelect({
  label,
  required,
  value,
  onChange,
  placeholder,
  options,
  renderOption,
  hint,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: Array<{ id: string; name: string; search?: string }>;
  renderOption?: (o: { id: string; name: string; search?: string }) => React.ReactNode;
  hint?: string;
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
    return options.filter((o) => {
      const hay = (o.search || o.name).toLowerCase();
      return hay.includes(qq);
    });
  }, [q, options]);

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900">
        {label} {required ? <span className="text-emerald-700">*</span> : null}
      </label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "w-full rounded-xl border bg-white px-4 py-3 text-left text-sm",
          "focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className={cx("truncate", !selected && "text-gray-400")}>
            {selected ? (renderOption ? renderOption(selected) : selected.name) : (placeholder || "Selecionar…")}
          </div>
          <div className="text-gray-400">▾</div>
        </div>
      </button>

      {open && (
        <div className="relative">
          <div className="absolute z-50 mt-2 w-full rounded-2xl border bg-white shadow-lg overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
                autoFocus
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
                    {renderOption ? renderOption(o) : o.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

/**
 * ChipMultiSelect – Coleções / Estilo
 * - Busca + chips + lista clicável
 */
function ChipMultiSelect({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: Array<{ id: string; name: string; search?: string }>;
  hint?: string;
}) {
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selected = useMemo(
    () => options.filter((o) => selectedSet.has(o.id)),
    [options, selectedSet]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = qq
      ? options.filter((o) =>
        ((o.search || o.name).toLowerCase().includes(qq))
      )
      : options;

    // joga selecionados pra cima
    return [...base].sort((a, b) => {
      const as = selectedSet.has(a.id) ? 0 : 1;
      const bs = selectedSet.has(b.id) ? 0 : 1;
      return as - bs || a.name.localeCompare(b.name);
    });
  }, [q, options, selectedSet]);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900">{label}</label>

      {/* chips */}
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

      {/* busca */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar e selecionar…"
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
      />

      {/* lista */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="max-h-48 overflow-auto">
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
                    "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50",
                    isOn && "bg-emerald-900/5"
                  )}
                >
                  <span className="truncate">{o.name}</span>
                  <span
                    className={cx(
                      "text-xs rounded-full px-2 py-1 border",
                      isOn
                        ? "border-emerald-900/20 bg-emerald-900 text-white"
                        : "border-gray-200 text-gray-500"
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

      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function SoftCard({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-3xl border bg-white shadow-sm">
      <div className="px-6 py-5 border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
          </div>
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
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:shadow",
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
        "hover:bg-gray-50",
        "disabled:opacity-50 disabled:cursor-not-allowed"
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
  tone: "draft" | "active";
  children: React.ReactNode;
}) {
  const styles =
    tone === "active"
      ? "bg-emerald-900 text-white"
      : "bg-gray-100 text-gray-700 border border-gray-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

function formatBRL(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProductCardPreview({
  name,
  slug,
  priceCents,
  primaryImageUrl,
  collectionsLabel,
  styleLabel,
  plating,
}: {
  name: string;
  slug: string;
  priceCents: number;
  primaryImageUrl?: string | null;
  collectionsLabel?: string;
  styleLabel?: string;
  plating?: string;
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

        <div className="mt-1 text-xs text-gray-500 font-mono">
          /produto/{slug || "..."}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: "#2b554e" }}>
            {formatBRL(priceCents)}
          </div>
          {plating?.trim() ? (
            <div className="text-xs text-gray-500">{plating}</div>
          ) : (
            <div className="text-xs text-gray-400">banho não informado</div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {collectionsLabel ? (
            <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700">
              {collectionsLabel}
            </span>
          ) : null}
          {styleLabel ? (
            <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700">
              {styleLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProductHeader({
  name,
  slug,
  status,
  onClose,
  onSave,
  onSaveGoSkus,
  saving,
  productId,
  preview,
}: {
  name: string;
  slug: string;
  status: "draft" | "active";
  onClose: () => void;
  onSave: () => void;
  onSaveGoSkus: () => void;
  saving: boolean;
  productId: string | null;
  preview?: React.ReactNode;
}) {
  const url = `/produto/${slug || ""}`;

  return (
    <div className="px-6 pt-6">
      <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 truncate">
                  {name?.trim() ? name : "Novo produto"}
                </h1>
                <Badge tone={status}>{status === "active" ? "Ativo" : "Rascunho"}</Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600">
                <span className="font-mono text-gray-700">{url}</span>
                <span className="text-gray-300">•</span>
                {productId ? (
                  <span className="text-xs text-gray-500">
                    ID: <span className="font-mono">{productId}</span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Salve para gerar o ID</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-2xl border bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>

              <button
                type="button"
                onClick={onSaveGoSkus}
                disabled={saving}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "#2b554e" }}
              >
                {saving ? "Salvando…" : productId ? "Salvar e ir p/ SKUs" : "Salvar e liberar SKUs"}
              </button>

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

        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
            <div className="text-sm text-gray-600">
              Dica: mantenha <b>Rascunho</b> até ter variações + fotos + estoque.
            </div>
            <div className="justify-self-end w-full lg:w-[360px]">
              {preview ?? null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** =========================
 *  Component
 *  ========================= */

export default function AdminProductCreate() {
  const nav = useNavigate();

  const [active, setActive] = useState<SectionKey>("info");
  const ids = useMemo(() => SECTIONS.map((s) => s.key), []);

  const [productId, setProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);

  // products
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [primaryCategoryId, setPrimaryCategoryId] = useState("");

  const [materialBase, setMaterialBase] = useState("");
  const [mainPlating, setMainPlating] = useState("");
  const [importantNotes, setImportantNotes] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [supplierOriginCode, setSupplierOriginCode] = useState("");

  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [styleIds, setStyleIds] = useState<string[]>([]);

  // combos
  const [categoryTree, setCategoryTree] = useState<CategoryTreeRow[]>([]);
  const [collections, setCollections] = useState<TagRow[]>([]);
  const [styles, setStyles] = useState<TagRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [searchTags, setSearchTags] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [selectedSkuPrimaryImageUrl, setSelectedSkuPrimaryImageUrl] = useState<string | null>(null);


  useEffect(() => {
    setSelectedSkuPrimaryImageUrl(null);
  }, [selectedSkuId]);


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

  // dropdown map
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

    // flatten para SearchSelect: “Pai / Filho”
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

    return { roots, childrenByParent, flat };
  }, [categoryTree]);

  // slug auto
  useEffect(() => {
    if (!name.trim()) return;
    if (slug.trim()) return;
    setSlug(slugify(name));
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  // load combos
  useEffect(() => {
    (async () => {
      setErr(null);


      const [ctRes, colRes, stRes, supRes] = await Promise.all([
        supabase
          .from("category_tree")
          .select("id,name,slug,parent_id,position,active")
          .eq("active", true)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("collections")
          .select("id,name,slug,active,position")
          .eq("active", true)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("styles")
          .select("id,name,slug,active,position")
          .eq("active", true)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("suppliers")
          .select("id,name,corporate_name,cnpj,active")
          .order("name", { ascending: true }),
      ]);

      if (ctRes.error) setErr(ctRes.error.message);
      else setCategoryTree((ctRes.data ?? []) as CategoryTreeRow[]);

      if (colRes.error) setErr(colRes.error.message);
      else setCollections((colRes.data ?? []) as TagRow[]);

      if (stRes.error) setErr(stRes.error.message);
      else setStyles((stRes.data ?? []) as TagRow[]);

      if (supRes.error) setErr(supRes.error.message);
      else setSuppliers((supRes.data ?? []) as SupplierRow[])

    })();
  }, []);

  async function syncProductLinks(pid: string) {
    // collections
    {
      const { error: delErr } = await supabase
        .from("product_collections")
        .delete()
        .eq("product_id", pid);
      if (delErr) throw new Error(delErr.message);

      if (collectionIds.length) {
        const rows = collectionIds.map((collection_id) => ({
          product_id: pid,
          collection_id,
        }));
        const { error } = await supabase.from("product_collections").insert(rows);
        if (error) throw new Error(error.message);
      }
    }

    // styles
    {
      const { error: delErr } = await supabase
        .from("product_styles")
        .delete()
        .eq("product_id", pid);
      if (delErr) throw new Error(delErr.message);

      if (styleIds.length) {
        const rows = styleIds.map((style_id) => ({
          product_id: pid,
          style_id,
        }));
        const { error } = await supabase.from("product_styles").insert(rows);
        if (error) throw new Error(error.message);
      }
    }
  }

  async function saveProduct({ goToSkus }: { goToSkus?: boolean } = {}) {
    setErr(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErr("Informe o nome do produto.");
      scrollToId("info");
      return null;
    }
    if (!primaryCategoryId) {
      setErr("Selecione a categoria.");
      scrollToId("info");
      return null;
    }

    setSaving(true);
    try {
      const finalSlug = slug.trim()
        ? await ensureUniqueSlug(slug.trim(), productId)
        : await ensureUniqueSlug(cleanName, productId);

      const payload: any = {
        name: cleanName,
        slug: finalSlug,
        description: description.trim() || null,
        status,
        primary_category_id: primaryCategoryId || null,
        material_base: materialBase.trim() || null,
        main_plating: mainPlating.trim() || null,
        important_notes: importantNotes.trim() || null,
        supplier_id: supplierId || null,
        supplier_origin_code: supplierOriginCode.trim() || null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        seo_keywords: parseCsvList(seoKeywords),
        search_tags: parseCsvList(searchTags),
      };

      if (!productId) {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id,slug")
          .single();

        if (error) throw new Error(error.message);

        await syncProductLinks(data.id);

        setProductId(data.id);
        setSlug(data.slug);
        setSelectedSkuId(null);

        if (goToSkus) scrollToId("variacoes");
        return data.id as string;
      } else {
        const { error } = await supabase
          .from("products")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", productId);

        if (error) throw new Error(error.message);

        await syncProductLinks(productId);

        if (goToSkus) scrollToId("variacoes");
        return productId;
      }
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar produto.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setProductId(null);
    setSelectedSkuId(null);

    setName("");
    setSlug("");
    setDescription("");
    setStatus("draft");
    setPrimaryCategoryId("");

    setMaterialBase("");
    setMainPlating("");
    setImportantNotes("");

    setSupplierId("");
    setSupplierOriginCode("");

    setCollectionIds([]);
    setStyleIds([]);

    setSeoTitle("");
    setSeoDescription("");
    setSeoKeywords("");
    setSearchTags("");

    scrollToId("info");
  }

  const supplierOptions = useMemo(() => {
    return suppliers
      .filter((s) => s.active !== false)
      .map((s) => {
        const label = s.name || s.corporate_name || "Fornecedor";
        const cnpj = s.cnpj ? formatCNPJ(s.cnpj) : "";
        return {
          id: s.id,
          name: cnpj ? `${label} — ${cnpj}` : label,
          search: `${label} ${cnpj}`.trim(),
        };
      });
  }, [suppliers]);

  const collectionOptions = useMemo(
    () =>
      collections
        .filter((c) => c.active !== false)
        .map((c) => ({ id: c.id, name: c.name, search: c.name })),
    [collections]
  );

  const styleOptions = useMemo(
    () =>
      styles
        .filter((s) => s.active !== false)
        .map((s) => ({ id: s.id, name: s.name, search: s.name })),
    [styles]
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <ProductHeader
        name={name}
        slug={slug}
        status={status}
        saving={saving}
        productId={productId}
        onClose={() => nav("/admin/produtos")}
        onSave={() => saveProduct()}
        onSaveGoSkus={() => saveProduct({ goToSkus: true })}
        preview={
          <ProductCardPreview
            name={name}
            slug={slug}
            priceCents={0} // depois puxa do SKU
            primaryImageUrl={selectedSkuPrimaryImageUrl}
            plating={mainPlating}
          />
        }
      />

      {/* Error */}
      {err && (
        <div className="px-6 mt-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 pb-28 mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main */}
        <div className="space-y-6">
          {/* INFO */}
          <SoftCard
            id="info"
            title="Informações do produto"
            subtitle="Nome, categoria, curadoria e posicionamento."
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7">
                <Field label="Nome" required hint="Ex: Brinco Aurora, Anel Lumi…">
                  <TextInput
                    value={name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setName(v);
                      if (!slug.trim()) setSlug(slugify(v));
                    }}
                    placeholder="Digite o nome do produto"
                  />
                </Field>
              </div>

              <div className="md:col-span-5">
                <Field label="Slug / URL">
                  <TextInput
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="gerado automaticamente"
                    className="font-mono"
                  />
                </Field>
              </div>

              <div className="md:col-span-4">
                <Field label="Status" hint="Deixe em rascunho até ter SKUs + fotos + estoque.">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProductStatus)}
                    className="w-full rounded-xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800/30"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="active">Ativo</option>
                  </select>
                </Field>
              </div>

              <div className="md:col-span-4">
                <SearchSelect
                  label="Categoria"
                  required
                  value={primaryCategoryId}
                  onChange={setPrimaryCategoryId}
                  placeholder="Selecione a categoria…"
                  options={categoryDropdown.flat}
                />
              </div>

              <div className="md:col-span-4">
                <SearchSelect
                  label="Fornecedor"
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Selecionar fornecedor…"
                  options={supplierOptions}
                  hint="Fornecedor do Bruto."
                />
              </div>

              <div className="md:col-span-12">
                <DividerLabel text="Curadoria" />
              </div>

              <div className="md:col-span-6">
                <Field label="Material base">
                  <TextInput
                    value={materialBase}
                    onChange={(e) => setMaterialBase(e.target.value)}
                    placeholder="Ex: metal, latão, prata…"
                  />
                </Field>
              </div>

              <div className="md:col-span-6">
                <Field label="Banho principal">
                  <TextInput
                    value={mainPlating}
                    onChange={(e) => setMainPlating(e.target.value)}
                    placeholder="Ex: ouro / ródio / prata"
                  />
                </Field>
              </div>

              <div className="md:col-span-6">
                <ChipMultiSelect
                  label="Coleções"
                  value={collectionIds}
                  onChange={setCollectionIds}
                  options={collectionOptions}
                  hint="Clique para adicionar/remover."
                />
              </div>

              <div className="md:col-span-6">
                <ChipMultiSelect
                  label="Estilo / Ocasião"
                  value={styleIds}
                  onChange={setStyleIds}
                  options={styleOptions}
                  hint="Clique para adicionar/remover"
                />
              </div>

              <div className="md:col-span-12">
                <DividerLabel text="Conteúdo" />
              </div>

              <div className="md:col-span-12">
                <Field label="Descrição (texto de venda)">
                  <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="Descreva a peça com foco em qualidade, acabamento e intenção."
                  />
                </Field>
              </div>

              <div className="md:col-span-12">
                <Field label="Código de origem do fornecedor">
                  <TextInput
                    value={supplierOriginCode}
                    onChange={(e) => setSupplierOriginCode(e.target.value)}
                    placeholder="Código do produto na base do fornecedor"
                  />
                </Field>
              </div>

              <div className="md:col-span-12 flex items-center justify-between gap-3 pt-2">
                <div className="text-xs text-gray-500">
                  {productId ? (
                    <>
                      Produto criado: <span className="font-mono">{productId}</span>
                    </>
                  ) : (
                    <>Salve para liberar variações (SKUs), fotos e estoque.</>
                  )}
                </div>

                <div className="flex gap-2">
                  <GhostButton disabled={saving} onClick={() => saveProduct()}>
                    Salvar
                  </GhostButton>
                  <PrimaryButton disabled={saving} onClick={() => saveProduct({ goToSkus: true })}>
                    {saving ? "Salvando…" : productId ? "Salvar e ir p/ SKUs" : "Salvar e liberar SKUs"}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </SoftCard>

          {/* VARIAÇÕES */}
          <SoftCard
            id="variacoes"
            title="Variações (SKUs)"
            subtitle="Tamanhos, banho, preço, código de barras e variação."
          >
            {!productId ? (
              <div className="text-sm text-gray-700">
                Salve o produto primeiro para liberar o cadastro de SKUs.
              </div>
            ) : (
              <SkusTab
                productId={productId}
                productName={name}
                selectedSkuId={selectedSkuId}
                onSelectSku={(id: any) => setSelectedSkuId(id ?? null)}
              />
            )}
          </SoftCard>

          {/* FOTOS */}
          <SoftCard id="fotos" title="Fotos" subtitle="Upload por SKU (fase 2).">
            {!productId ? (
              <div className="text-sm text-gray-700">Salve o produto para liberar as fotos.</div>
            ) : !selectedSkuId ? (
              <div className="text-sm text-gray-700">
                Selecione um SKU em “Variações” para anexar fotos por variação.
              </div>
            ) : (
              <SkuImagesDnd
                skuId={selectedSkuId}
                bucket="product-images"
                onPrimaryUrlChange={(url) => setSelectedSkuPrimaryImageUrl(url)}
              />
            )}
          </SoftCard>

          {/* ESTOQUE */}
          <SoftCard
            id="estoque"
            title="Estoque"
            subtitle="Movimentações auditáveis: entrada, saída, ajuste, reserva."
          >
            {!productId ? (
              <div className="text-sm text-gray-700">
                Salve o produto primeiro para liberar o estoque.
              </div>
            ) : !selectedSkuId ? (
              <div className="text-sm text-gray-700">
                Selecione um SKU em “Variações” para gerenciar o estoque.
              </div>
            ) : (
              <StockTab skuId={selectedSkuId} />
            )}
          </SoftCard>

          {/* PESOS */}
          <SoftCard id="pesos" title="Pesos e dimensões" subtitle="Opcional. Ajuda no frete.">
            <div className="text-sm text-gray-600">(Opcional)</div>
          </SoftCard>

          {/* FISCAL */}
          <SoftCard id="fiscal" title="Dados fiscais" subtitle="Opcional. NCM, origem, etc.">
            <div className="text-sm text-gray-600">(Opcional)</div>
          </SoftCard>

          {/* SEO */}
          <SoftCard id="seo" title="E-commerce (SEO)" subtitle="Título, descrição e tags internas.">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <Field label="Título SEO">
                  <TextInput value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-6">
                <Field label="Palavras-chave SEO (vírgula)" hint="Ex: brinco, ouro 18k, presente…">
                  <TextInput value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-12">
                <Field label="Descrição SEO">
                  <TextArea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>

              <div className="md:col-span-12">
                <Field label="Tags internas de busca (vírgula)" hint="Ex: presente, noiva, minimalista">
                  <TextInput value={searchTags} onChange={(e) => setSearchTags(e.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-12 flex justify-end">
                <PrimaryButton disabled={saving} onClick={() => saveProduct()}>
                  {saving ? "Salvando…" : "Salvar SEO"}
                </PrimaryButton>
              </div>
            </div>
          </SoftCard>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-3xl border bg-white shadow-sm p-3">
            <div className="px-2 py-2">
              <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Seções
              </div>
            </div>

            <div className="space-y-1">
              {SECTIONS.map((s) => (
                <PillButton key={s.key} active={active === s.key} onClick={() => scrollToId(s.key)}>
                  {s.label}
                </PillButton>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t px-2">
              <div className="text-xs text-gray-500">
                {productId ? (
                  <>
                    ID: <span className="font-mono">{productId}</span>
                  </>
                ) : (
                  <>Salve para gerar o ID.</>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur">
        <div className="px-6 py-3 flex items-center justify-between">
          <button
            className="rounded-2xl border bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
            type="button"
            onClick={() => nav("/admin/produtos")}
          >
            Cancelar
          </button>

          <div className="flex gap-2">
            <GhostButton
              disabled={saving}
              onClick={async () => {
                const id = await saveProduct();
                if (!id) return;
                resetForm();
              }}
            >
              Salvar e criar outro
            </GhostButton>

            <PrimaryButton
              disabled={saving}
              onClick={async () => {
                const id = await saveProduct({ goToSkus: true });
                if (!id) return;
              }}
            >
              {saving ? "Salvando…" : productId ? "Salvar" : "Salvar e liberar SKUs"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );

}
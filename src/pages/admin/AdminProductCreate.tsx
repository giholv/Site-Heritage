import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import SkusTab from "./tabs/SkusTab";
import StockTab from "./tabs/StockTab";

type SectionKey =
  | "info"
  | "variacoes"
  | "fotos"
  | "estoque"
  | "pesos"
  | "fiscal"
  | "seo";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "info", label: "Informações do produto" },
  { key: "variacoes", label: "Variações" },
  { key: "fotos", label: "Fotos" },
  { key: "estoque", label: "Estoque" },
  { key: "pesos", label: "Pesos e dimensões" },
  { key: "fiscal", label: "Dados fiscais" },
  { key: "seo", label: "E-commerce (SEO)" },
];

type CategoryRow = {
  id: string;
  name: string;
  type: "tipo_peca" | "colecao" | "estilo";
  parent_id: string | null;
};

type SupplierRow = {
  id: string;
  name: string; // campo antigo
  trade_name: string | null;
  corporate_name: string | null;
  cnpj: string | null; // 14 dígitos
  active: boolean | null;
};

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

async function ensureUniqueSlug(base: string) {
  const clean = slugify(base);
  if (!clean) return "produto";

  const { data: existing0, error: e0 } = await supabase
    .from("products")
    .select("id")
    .eq("slug", clean)
    .maybeSingle();

  if (!e0 && !existing0) return clean;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${clean}-${i}`;
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }

  return `${clean}-${Date.now()}`;
}

function CardSection({
  id,
  title,
  children,
  defaultOpen = true,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="rounded-2xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4"
      >
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className="text-gray-500">{open ? "▾" : "▸"}</span>
      </button>

      {open && <div className="px-6 pb-6">{children}</div>}
    </section>
  );
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

export default function AdminProductCreate() {
  const nav = useNavigate();

  // sidebar ativo por scroll
  const [active, setActive] = useState<SectionKey>("info");
  const ids = useMemo(() => SECTIONS.map((s) => s.key), []);

  // produto draft
  const [productId, setProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // SKU selecionado
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);

  // fields: products
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");

  // categoria/coleção: vamos guardar UM id (por enquanto)
  const [categoryId, setCategoryId] = useState<string>("");

  const [materialBase, setMaterialBase] = useState("");
  const [mainPlating, setMainPlating] = useState("");
  const [importantNotes, setImportantNotes] = useState("");

  const [supplierId, setSupplierId] = useState<string>(""); // ✅ corrigido
  const [supplierOriginCode, setSupplierOriginCode] = useState("");

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [searchTags, setSearchTags] = useState("");

  // combos
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

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

  // load combos
  useEffect(() => {
    (async () => {
      // categories (com subcategorias)
      const { data: c, error: cErr } = await supabase
        .from("categories")
        .select("id,name,type,parent_id")
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (!cErr) setCategories((c ?? []) as CategoryRow[]);

      // suppliers com CNPJ etc
      const { data: s, error: sErr } = await supabase
        .from("suppliers")
        .select("id,name,trade_name,corporate_name,cnpj,active")
        .order("name", { ascending: true });

      if (!sErr) setSuppliers((s ?? []) as SupplierRow[]);
    })();
  }, []);

  // monta tree p/ dropdown
  const categoryDropdown = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));

    const tipoPais = categories
      .filter((c) => c.type === "tipo_peca" && !c.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        ...p,
        children: categories
          .filter((c) => c.type === "tipo_peca" && c.parent_id === p.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));

    const colecoes = categories
      .filter((c) => c.type === "colecao" && !c.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const estilos = categories
      .filter((c) => c.type === "estilo" && !c.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name));

    // caso você tenha filhos em colecao/estilo também:
    const childrenOf = (parentId: string, type: CategoryRow["type"]) =>
      categories
        .filter((c) => c.type === type && c.parent_id === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

    return { tipoPais, colecoes, estilos, childrenOf, byId };
  }, [categories]);

  // slug auto quando digita nome (se slug vazio)
  useEffect(() => {
    if (!name.trim()) return;
    if (slug.trim()) return;
    setSlug(slugify(name));
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProduct({ goToSkus }: { goToSkus?: boolean } = {}) {
    setErr(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErr("Informe o nome do produto.");
      scrollToId("info");
      return null;
    }

    setSaving(true);
    try {
      const finalSlug = slug.trim()
        ? await ensureUniqueSlug(slug.trim())
        : await ensureUniqueSlug(cleanName);

      const payload: any = {
        name: cleanName,
        slug: finalSlug,
        description: description.trim() || null,
        status,
        category_id: categoryId || null, // se você migrar pra product_categories depois, eu ajusto
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
    setCategoryId("");
    setMaterialBase("");
    setMainPlating("");
    setImportantNotes("");
    setSupplierId("");
    setSupplierOriginCode("");
    setSeoTitle("");
    setSeoDescription("");
    setSeoKeywords("");
    setSearchTags("");
    scrollToId("info");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* topo */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Novo produto</h1>
          <button
            className="text-gray-500 hover:text-gray-800"
            type="button"
            onClick={() => nav("/admin/produtos")}
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {err && (
        <div className="px-6 mt-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        </div>
      )}

      <div className="px-6 pb-24 mt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* coluna principal */}
        <div className="space-y-6">
          {/* INFO */}
          <CardSection id="info" title="Informações do produto" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="text-sm text-gray-700">Nome *</label>
                <input
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setName(v);
                    if (!slug.trim()) setSlug(slugify(v));
                  }}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                />
              </div>

              <div className="md:col-span-6">
                <label className="text-sm text-gray-700">Slug / URL</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white font-mono"
                  placeholder="gerado automaticamente"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Vai virar: <span className="font-mono">/produto/{slug || "..."}</span>
                </p>
              </div>

              <div className="md:col-span-4">
                <label className="text-sm text-gray-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                >
                  <option value="draft">Rascunho</option>
                  <option value="active">Ativo</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Dica: deixe em rascunho até criar SKUs + fotos + estoque.
                </p>
              </div>

              <div className="md:col-span-4">
                <label className="text-sm text-gray-700">Categoria / Coleção</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                >
                  <option value="">—</option>

                  <optgroup label="Tipo de peça">
                    {categoryDropdown.tipoPais.map((p) => (
                      <React.Fragment key={p.id}>
                        <option value={p.id}>{p.name}</option>
                        {p.children.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {"\u00A0\u00A0\u00A0"}• {ch.name}
                          </option>
                        ))}
                      </React.Fragment>
                    ))}
                  </optgroup>

                  <optgroup label="Coleções">
                    {categoryDropdown.colecoes.map((c) => (
                      <React.Fragment key={c.id}>
                        <option value={c.id}>{c.name}</option>
                        {categoryDropdown.childrenOf(c.id, "colecao").map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {"\u00A0\u00A0\u00A0"}• {ch.name}
                          </option>
                        ))}
                      </React.Fragment>
                    ))}
                  </optgroup>

                  <optgroup label="Estilo / Ocasião">
                    {categoryDropdown.estilos.map((c) => (
                      <React.Fragment key={c.id}>
                        <option value={c.id}>{c.name}</option>
                        {categoryDropdown.childrenOf(c.id, "estilo").map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {"\u00A0\u00A0\u00A0"}• {ch.name}
                          </option>
                        ))}
                      </React.Fragment>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="text-sm text-gray-700">Fornecedor (produto)</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                >
                  <option value="">—</option>
                  {suppliers
                    .filter((s) => s.active !== false)
                    .map((s) => {
                      const label = s.trade_name || s.name || s.corporate_name || "Fornecedor";
                      const cnpj = s.cnpj ? ` — ${formatCNPJ(s.cnpj)}` : "";
                      return (
                        <option key={s.id} value={s.id}>
                          {label}
                          {cnpj}
                        </option>
                      );
                    })}
                </select>

                <p className="mt-1 text-xs text-gray-500">
                  OBS: fornecedor por SKU também existe; aqui é “padrão do produto”.
                </p>
              </div>

              <div className="md:col-span-6">
                <label className="text-sm text-gray-700">Material base</label>
                <input
                  value={materialBase}
                  onChange={(e) => setMaterialBase(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  placeholder="ex: metal, aço, prata..."
                />
              </div>

              <div className="md:col-span-6">
                <label className="text-sm text-gray-700">Banho principal</label>
                <input
                  value={mainPlating}
                  onChange={(e) => setMainPlating(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  placeholder="ex: ouro 18k / ródio / prata 925"
                />
              </div>

              <div className="md:col-span-12">
                <label className="text-sm text-gray-700">Descrição (texto de venda)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  rows={5}
                />
              </div>

              <div className="md:col-span-12">
                <label className="text-sm text-gray-700">Observações importantes</label>
                <textarea
                  value={importantNotes}
                  onChange={(e) => setImportantNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  rows={3}
                  placeholder="hipoalergênico, garantia, cuidados..."
                />
              </div>

              <div className="md:col-span-12">
                <label className="text-sm text-gray-700">
                  Código de origem do fornecedor (produto)
                </label>
                <input
                  value={supplierOriginCode}
                  onChange={(e) => setSupplierOriginCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  placeholder="código do produto no fornecedor (se existir)"
                />
              </div>

              <div className="md:col-span-12">
                <div className="text-xs text-gray-500">
                  {productId ? (
                    <>
                      Produto criado: <span className="font-mono">{productId}</span>
                    </>
                  ) : (
                    <>Salve o produto para liberar Variações (SKUs), Fotos e Estoque.</>
                  )}
                </div>
              </div>

              <div className="md:col-span-12 flex gap-2">
                <button
                  type="button"
                  onClick={() => saveProduct({ goToSkus: true })}
                  disabled={saving}
                  className="rounded-xl bg-[#2b554e] text-white px-4 py-3 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : productId ? "Salvar" : "Salvar e liberar SKUs"}
                </button>

                <button
                  type="button"
                  onClick={() => saveProduct()}
                  disabled={saving}
                  className="rounded-xl border px-4 py-3 text-sm disabled:opacity-50"
                >
                  Salvar sem navegar
                </button>
              </div>
            </div>
          </CardSection>

          {/* VARIAÇÕES */}
          <CardSection id="variacoes" title="Variações (SKUs)" defaultOpen={false}>
            {!productId ? (
              <div className="text-sm text-gray-700">
                Salve o produto primeiro para liberar o cadastro de SKUs.
              </div>
            ) : (
              <SkusTab
                productId={productId}
                productName={name}
                selectedSkuId={selectedSkuId}
                onSelectSku={setSelectedSkuId as any}
              />
            )}
          </CardSection>

          {/* FOTOS */}
          <CardSection id="fotos" title="Fotos" defaultOpen={false}>
            {!productId ? (
              <div className="text-sm text-gray-700">Salve o produto para liberar as fotos.</div>
            ) : !selectedSkuId ? (
              <div className="text-sm text-gray-700">
                Selecione um SKU na aba “Variações” para anexar fotos por variação.
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                (Fase 2) Upload por SKU: <span className="font-mono">{selectedSkuId}</span>
              </div>
            )}
          </CardSection>

          {/* ESTOQUE */}
          <CardSection id="estoque" title="Estoque" defaultOpen={false}>
            <div className="text-sm text-gray-600 mb-4">
              Estoque auditável por movimentações (entrada/saída/ajuste), com vínculo opcional ao
              lote/galvânica.
            </div>

            {!productId ? (
              <div className="text-sm text-gray-700">
                Salve o produto primeiro para liberar o estoque.
              </div>
            ) : !selectedSkuId ? (
              <div className="text-sm text-gray-700">
                Selecione um SKU na aba “Variações” para gerenciar o estoque.
              </div>
            ) : (
              <StockTab skuId={selectedSkuId} />
            )}
          </CardSection>

          {/* PESOS */}
          <CardSection id="pesos" title="Pesos e dimensões" defaultOpen={false}>
            <div className="text-sm text-gray-600">(Opcional)</div>
          </CardSection>

          {/* FISCAL */}
          <CardSection id="fiscal" title="Dados fiscais" defaultOpen={false}>
            <div className="text-sm text-gray-600">(Opcional)</div>
          </CardSection>

          {/* SEO */}
          <CardSection id="seo" title="E-commerce (SEO)" defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="text-sm text-gray-700">Título SEO</label>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                />
              </div>
              <div className="md:col-span-6">
                <label className="text-sm text-gray-700">Palavras-chave SEO (vírgula)</label>
                <input
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  placeholder="ex: brinco, ouro 18k, presente..."
                />
              </div>
              <div className="md:col-span-12">
                <label className="text-sm text-gray-700">Descrição SEO</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  rows={3}
                />
              </div>
              <div className="md:col-span-12">
                <label className="text-sm text-gray-700">Tags internas de busca (vírgula)</label>
                <input
                  value={searchTags}
                  onChange={(e) => setSearchTags(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-3 bg-white"
                  placeholder="ex: presente, noiva, minimalista"
                />
              </div>
              <div className="md:col-span-12">
                <button
                  type="button"
                  onClick={() => saveProduct()}
                  className="rounded-xl bg-[#2b554e] text-white px-4 py-3 text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar SEO"}
                </button>
              </div>
            </div>
          </CardSection>
        </div>

        {/* menu lateral */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl border bg-white p-3">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => scrollToId(s.key)}
                className={[
                  "w-full text-left rounded-xl px-3 py-3 text-sm",
                  active === s.key
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100 text-gray-800",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="px-6 py-3 flex items-center justify-between">
          <button
            className="rounded-xl border px-4 py-2 text-sm"
            type="button"
            onClick={() => nav("/admin/produtos")}
          >
            Cancelar
          </button>

          <div className="flex gap-2">
            <button
              className="rounded-xl border px-4 py-2 text-sm"
              type="button"
              onClick={async () => {
                const id = await saveProduct();
                if (!id) return;
                resetForm();
              }}
              disabled={saving}
            >
              Salvar e criar outro
            </button>

            <button
              className="rounded-xl bg-[#2b554e] text-white px-4 py-2 text-sm disabled:opacity-50"
              type="button"
              onClick={async () => {
                const id = await saveProduct({ goToSkus: true });
                if (!id) return;
              }}
              disabled={saving}
            >
              {saving ? "Salvando..." : productId ? "Salvar" : "Salvar e liberar SKUs"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

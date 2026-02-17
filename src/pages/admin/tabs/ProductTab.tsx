import { useState } from "react";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active";
  supplier_origin_code?: string | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export default function ProductTab({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [description, setDescription] = useState(product.description ?? "");
  const [status, setStatus] = useState<"draft" | "active">(product.status);
  const [supplierOriginCode, setSupplierOriginCode] = useState(product.supplier_origin_code ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setLoading(true);

    const { error } = await supabase.from("products").update({
      name,
      slug: slug?.trim() ? slug : slugify(name),
      description,
      status,
      supplier_origin_code: supplierOriginCode || null,
    }).eq("id", product.id);

    if (error) setErr(error.message);
    setLoading(false);
    if (!error) onSaved();
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Informações do produto</h2>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Nome</label>
          <input className="mt-1 w-full rounded-xl border px-4 py-3"
            value={name} onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }} />
        </div>

        <div>
          <label className="text-sm">Slug/URL</label>
          <input className="mt-1 w-full rounded-xl border px-4 py-3"
            value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Status</label>
          <select className="mt-1 w-full rounded-xl border px-4 py-3"
            value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Código origem do fornecedor</label>
          <input className="mt-1 w-full rounded-xl border px-4 py-3"
            value={supplierOriginCode} onChange={(e) => setSupplierOriginCode(e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm">Descrição</label>
        <textarea className="mt-1 w-full rounded-xl border px-4 py-3" rows={6}
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="mt-6">
        <button
          onClick={save}
          disabled={loading}
          className="rounded-xl bg-[#2b554e] text-white px-4 py-3 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

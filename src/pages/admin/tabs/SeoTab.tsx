import { useState } from "react";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  search_tags?: string[] | null;
};

function parseList(v: string) {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function SeoTab({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: () => void;
}) {
  const [seoTitle, setSeoTitle] = useState(product.seo_title ?? "");
  const [seoDesc, setSeoDesc] = useState(product.seo_description ?? "");
  const [keywords, setKeywords] = useState((product.seo_keywords ?? []).join(", "));
  const [tags, setTags] = useState((product.search_tags ?? []).join(", "));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setLoading(true);

    const { error } = await supabase.from("products").update({
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
      seo_keywords: parseList(keywords),
      search_tags: parseList(tags),
    }).eq("id", product.id);

    if (error) setErr(error.message);
    setLoading(false);
    if (!error) onSaved();
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">SEO e Busca</h2>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-sm">Título SEO</label>
          <input
            className="mt-1 w-full rounded-xl border px-4 py-3"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Descrição SEO</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-4 py-3"
            rows={4}
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Palavras-chave SEO (separe por vírgula)</label>
          <input
            className="mt-1 w-full rounded-xl border px-4 py-3"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Tags internas de busca (separe por vírgula)</label>
          <input
            className="mt-1 w-full rounded-xl border px-4 py-3"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={loading}
        className="mt-6 rounded-xl bg-[#2b554e] text-white px-4 py-3 disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar SEO"}
      </button>
    </div>
  );
}

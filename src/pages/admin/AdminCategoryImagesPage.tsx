import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  position: number;
};

const BUCKET = "product-images";

function publicUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function safeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

export default function AdminCategoryImagesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [rows]
  );

  const load = async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("category_tree")
      .select("id,name,slug,cover_image_path,position")
      .eq("active", true)
      .is("parent_id", null)
      .order("position", { ascending: true });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as CategoryRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadForCategory = async (cat: CategoryRow, file: File) => {
    setBusyId(cat.id);
    setErr(null);

    try {
      // validações básicas
      if (!file.type.startsWith("image/")) throw new Error("Arquivo precisa ser uma imagem.");
      if (file.size > 6 * 1024 * 1024) throw new Error("Imagem muito grande (máx 6MB).");

      const ext = file.name.split(".").pop() || "jpg";
      const filename = safeFileName(file.name);
      const path = `categories/${cat.slug}/${Date.now()}-${filename}.${ext}`.replace(/\.\w+(\.\w+)$/, ".$1"); // evita .jpg.jpg

      // upload
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

      if (up.error) throw up.error;

      // salva caminho no banco
      const { error: ue } = await supabase
        .from("category_tree")
        .update({ cover_image_path: path })
        .eq("id", cat.id);

      if (ue) throw ue;

      // atualiza UI
      setRows((prev) =>
        prev.map((r) => (r.id === cat.id ? { ...r, cover_image_path: path } : r))
      );
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao enviar imagem.");
    } finally {
      setBusyId(null);
    }
  };

  const removeImage = async (cat: CategoryRow) => {
    setBusyId(cat.id);
    setErr(null);

    try {
      const { error } = await supabase
        .from("category_tree")
        .update({ cover_image_path: null })
        .eq("id", cat.id);

      if (error) throw error;

      setRows((prev) =>
        prev.map((r) => (r.id === cat.id ? { ...r, cover_image_path: null } : r))
      );
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao remover imagem.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#2b554e]">Imagens do Catálogo</h1>
          <p className="text-sm text-black/60">
            Troque as imagens das categorias (cards/“Encontre sua joia”).
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="h-10 px-4 rounded-xl border border-black/10 bg-white text-sm"
        >
          Recarregar
        </button>
      </div>

      {err && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/10 bg-white/70 p-4 animate-pulse">
              <div className="h-40 bg-black/5 rounded-xl" />
              <div className="mt-4 h-4 bg-black/5 rounded w-2/3" />
              <div className="mt-3 h-10 bg-black/5 rounded-xl" />
            </div>
          ))}

        {!loading &&
          sorted.map((cat) => {
            const img = publicUrl(cat.cover_image_path);

            return (
              <div key={cat.id} className="rounded-2xl border border-black/10 bg-white overflow-hidden">
                <div className="h-40 bg-black/5">
                  {img ? (
                    <img src={img} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-black/40">
                      Sem imagem
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="font-semibold text-[#2b554e]">{cat.name}</div>
                  <div className="text-xs text-black/50 mt-1">slug: {cat.slug}</div>

                  <div className="mt-4 flex items-center gap-3">
                    <label className="h-10 px-4 rounded-xl bg-[#2b554e] text-white text-sm font-semibold inline-flex items-center justify-center cursor-pointer">
                      {busyId === cat.id ? "Enviando..." : "Enviar imagem"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busyId === cat.id}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (!f) return;
                          uploadForCategory(cat, f);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeImage(cat)}
                      disabled={busyId === cat.id}
                      className="h-10 px-4 rounded-xl border border-black/10 bg-white text-sm"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-black/45">
                    Dica: use imagem 1200×900 (4:3) ou maior.
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  position: number;
};

type HeroFileRow = {
  name: string;
  path: string;
  publicUrl: string;
};

const CAT_BUCKET = "product-images";
const HERO_BUCKET = "product-images";
const HERO_FOLDER = "banners";

function publicUrl(bucket: string, path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function safeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function buildUploadPath(prefix: string, file: File) {
  const cleaned = safeFileName(file.name);
  const fallbackExt = (file.type.split("/")[1] || "jpg").toLowerCase();
  const ext = (cleaned.split(".").pop() || fallbackExt).toLowerCase();
  const base = cleaned.replace(new RegExp(`\\.${ext}$`, "i"), "") || "imagem";
  return `${prefix}/${Date.now()}-${base}.${ext}`;
}

export default function AdminCategoryImagesPage() {
  // =========================
  // HERO (STORAGE ONLY)
  // =========================
  const [heroRows, setHeroRows] = useState<HeroFileRow[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroErr, setHeroErr] = useState<string | null>(null);
  const [heroFiles, setHeroFiles] = useState<File[]>([]);

  const loadHero = async () => {
    setHeroLoading(true);
    setHeroErr(null);

    const { data, error } = await supabase.storage
      .from(HERO_BUCKET)
      .list(HERO_FOLDER, {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      setHeroErr(error.message);
      setHeroRows([]);
      setHeroLoading(false);
      return;
    }

    const rows =
      (data ?? [])
        .filter((f) => !!f.name && !f.name.endsWith("/"))
        .filter((f) => /\.(png|jpg|jpeg|webp|avif)$/i.test(f.name))
        .map((f) => {
          const path = `${HERO_FOLDER}/${f.name}`;
          return {
            name: f.name,
            path,
            publicUrl: publicUrl(HERO_BUCKET, path)!,
          };
        }) || [];

    setHeroRows(rows);
    setHeroLoading(false);
  };

  const uploadHero = async () => {
    if (!heroFiles.length) return;

    setHeroBusy(true);
    setHeroErr(null);

    try {
      for (const file of heroFiles) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`O arquivo ${file.name} não é uma imagem.`);
        }

        if (file.size > 8 * 1024 * 1024) {
          throw new Error(`A imagem ${file.name} é muito grande (máx 8MB).`);
        }

        const path = buildUploadPath(HERO_FOLDER, file);

        const { error } = await supabase.storage.from(HERO_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

        if (error) throw error;
      }

      setHeroFiles([]);
      await loadHero();
    } catch (e: any) {
      setHeroErr(e?.message ?? "Erro ao enviar banner.");
    } finally {
      setHeroBusy(false);
    }
  };

  const removeHero = async (row: HeroFileRow) => {
    if (!confirm("Apagar esse banner?")) return;

    setHeroBusy(true);
    setHeroErr(null);

    try {
      const { error } = await supabase.storage.from(HERO_BUCKET).remove([row.path]);
      if (error) throw error;
      await loadHero();
    } catch (e: any) {
      setHeroErr(e?.message ?? "Erro ao apagar banner.");
    } finally {
      setHeroBusy(false);
    }
  };

  // =========================
  // CATEGORY IMAGES
  // =========================
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
    loadHero();
    load();
  }, []);

  const uploadForCategory = async (cat: CategoryRow, file: File) => {
    setBusyId(cat.id);
    setErr(null);

    try {
      if (!file.type.startsWith("image/")) throw new Error("Arquivo precisa ser uma imagem.");
      if (file.size > 12 * 1024 * 1024) throw new Error("Imagem muito grande (máx 12MB).");

      const path = `categories/${cat.slug}/${buildUploadPath("", file).replace(/^\//, "")}`;

      const up = await supabase.storage.from(CAT_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

      if (up.error) throw up.error;

      const { error: ue } = await supabase
        .from("category_tree")
        .update({ cover_image_path: path })
        .eq("id", cat.id);

      if (ue) throw ue;

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
    <div className="p-6 space-y-10">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#2b554e]">Banners do Hero</h1>
            <p className="text-sm text-black/60">Gerencie as imagens do topo da home.</p>
          </div>

          <button
            type="button"
            onClick={loadHero}
            className="h-10 px-4 rounded-xl border border-black/10 bg-white text-sm"
          >
            Recarregar
          </button>
        </div>

        {heroErr && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {heroErr}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="w-full rounded-xl border px-3 py-2"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setHeroFiles(Array.from(e.target.files ?? []))}
            />
          </div>

          <button
            type="button"
            onClick={uploadHero}
            disabled={!heroFiles.length || heroBusy}
            className="mt-3 h-10 px-4 rounded-xl bg-[#2b554e] text-white text-sm font-semibold disabled:opacity-50"
          >
            {heroBusy ? "Enviando..." : `Adicionar ${heroFiles.length || ""} banner${heroFiles.length > 1 ? "s" : ""}`}
          </button>

          <div className="mt-2 text-xs text-black/45">
            Dica: use imagem 1600×900 ou maior.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {heroLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-white/70 p-4 animate-pulse">
                <div className="h-40 bg-black/5 rounded-xl" />
                <div className="mt-4 h-4 bg-black/5 rounded w-2/3" />
              </div>
            ))}

          {!heroLoading &&
            heroRows.map((r) => (
              <div key={r.path} className="rounded-2xl border border-black/10 bg-white overflow-hidden">
                <div className="h-40 bg-black/5">
                  <img src={r.publicUrl} alt={r.name} className="w-full h-full object-cover" />
                </div>

                <div className="p-4 space-y-3">
                  <div className="text-sm font-medium text-[#2b554e] truncate">{r.name}</div>

                  <button
                    type="button"
                    onClick={() => removeHero(r)}
                    disabled={heroBusy}
                    className="h-9 px-3 rounded-xl border border-black/10 bg-white text-sm text-red-600"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#2b554e]">Imagens do Catálogo</h2>
            <p className="text-sm text-black/60">
              Troque as imagens das categorias.
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
              const img = publicUrl(CAT_BUCKET, cat.cover_image_path);

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
    </div>
  );
}
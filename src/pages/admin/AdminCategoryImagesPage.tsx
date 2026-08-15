import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  position: number;
};

type HeroBannerRow = {
  id: string;
  image_path: string;
  mobile_image_path: string | null;
  alt: string;
  position: number;
  active: boolean;
};


const CAT_BUCKET = "product-images";
const HERO_BUCKET = "product-images";
const HERO_DESKTOP_FOLDER = "banners/desktop";
const HERO_MOBILE_FOLDER = "banners/mobile";

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
  // HERO DESKTOP + MOBILE
  // =========================
  const [heroRows, setHeroRows] = useState<HeroBannerRow[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroErr, setHeroErr] = useState<string | null>(null);
  const [heroDesktopFile, setHeroDesktopFile] = useState<File | null>(null);
  const [heroMobileFile, setHeroMobileFile] = useState<File | null>(null);
  const [heroAlt, setHeroAlt] = useState("");

  const loadHero = async () => {
    setHeroLoading(true);
    setHeroErr(null);

    const { data, error } = await supabase
      .from("hero_banners")
      .select("id,image_path,mobile_image_path,alt,position,active")
      .order("position", { ascending: true });

    if (error) {
      setHeroErr(error.message);
      setHeroRows([]);
      setHeroLoading(false);
      return;
    }

    setHeroRows((data ?? []) as HeroBannerRow[]);
    setHeroLoading(false);
  };

  const uploadHero = async () => {
    if (!heroDesktopFile || !heroMobileFile) {
      setHeroErr("Selecione uma imagem desktop e uma imagem mobile.");
      return;
    }

    setHeroBusy(true);
    setHeroErr(null);

    let desktopPath: string | null = null;
    let mobilePath: string | null = null;

    try {
      for (const file of [heroDesktopFile, heroMobileFile]) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`O arquivo ${file.name} não é uma imagem.`);
        }

        if (file.size > 8 * 1024 * 1024) {
          throw new Error(`A imagem ${file.name} é muito grande (máx 8MB).`);
        }
      }

      desktopPath = buildUploadPath(HERO_DESKTOP_FOLDER, heroDesktopFile);
      mobilePath = buildUploadPath(HERO_MOBILE_FOLDER, heroMobileFile);

      const desktopUpload = await supabase.storage
        .from(HERO_BUCKET)
        .upload(desktopPath, heroDesktopFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: heroDesktopFile.type,
        });

      if (desktopUpload.error) throw desktopUpload.error;

      const mobileUpload = await supabase.storage
        .from(HERO_BUCKET)
        .upload(mobilePath, heroMobileFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: heroMobileFile.type,
        });

      if (mobileUpload.error) throw mobileUpload.error;

      const nextPosition =
        heroRows.length > 0
          ? Math.max(...heroRows.map((row) => row.position ?? 0)) + 1
          : 1;

      const { error: insertError } = await supabase
        .from("hero_banners")
        .insert({
          image_path: desktopPath,
          mobile_image_path: mobilePath,
          alt: heroAlt.trim() || "Banner Caléa Blanc",
          position: nextPosition,
          active: true,
        });

      if (insertError) throw insertError;

      setHeroDesktopFile(null);
      setHeroMobileFile(null);
      setHeroAlt("");

      await loadHero();
    } catch (e: any) {
      const cleanup = [desktopPath, mobilePath].filter(Boolean) as string[];
      if (cleanup.length) {
        await supabase.storage.from(HERO_BUCKET).remove(cleanup);
      }

      setHeroErr(e?.message ?? "Erro ao enviar banner.");
    } finally {
      setHeroBusy(false);
    }
  };

  const toggleHeroActive = async (row: HeroBannerRow) => {
    setHeroBusy(true);
    setHeroErr(null);

    try {
      const { error } = await supabase
        .from("hero_banners")
        .update({ active: !row.active })
        .eq("id", row.id);

      if (error) throw error;

      setHeroRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, active: !item.active } : item,
        ),
      );
    } catch (e: any) {
      setHeroErr(e?.message ?? "Erro ao alterar banner.");
    } finally {
      setHeroBusy(false);
    }
  };

  const removeHero = async (row: HeroBannerRow) => {
    if (!confirm("Apagar esse banner desktop e mobile?")) return;

    setHeroBusy(true);
    setHeroErr(null);

    try {
      const paths = [row.image_path, row.mobile_image_path].filter(
        (path): path is string =>
          Boolean(path) && !/^https?:\/\//i.test(path as string),
      );

      if (paths.length) {
        const { error: storageError } = await supabase.storage
          .from(HERO_BUCKET)
          .remove(paths);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from("hero_banners")
        .delete()
        .eq("id", row.id);

      if (dbError) throw dbError;

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
            <h1 className="text-2xl font-semibold text-[#2b554e]">
              Banners do Hero
            </h1>
            <p className="text-sm text-black/60">
              Cadastre desktop e mobile juntos para cada banner.
            </p>
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

        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="mb-2">
                <div className="text-sm font-semibold text-[#2b554e]">
                  Desktop
                </div>
                <div className="text-xs text-black/45">
                  Ideal: 1600 × 900 px
                </div>
              </div>

              <input
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(e) =>
                  setHeroDesktopFile(e.target.files?.[0] ?? null)
                }
              />
            </label>

            <label className="block">
              <div className="mb-2">
                <div className="text-sm font-semibold text-[#2b554e]">
                  Mobile
                </div>
                <div className="text-xs text-black/45">
                  Ideal: 1080 × 1350 px
                </div>
              </div>

              <input
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(e) =>
                  setHeroMobileFile(e.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-semibold text-[#2b554e]">
              Texto alternativo
            </label>

            <input
              type="text"
              value={heroAlt}
              onChange={(e) => setHeroAlt(e.target.value)}
              placeholder="Ex.: Campanha Caléa"
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={uploadHero}
            disabled={!heroDesktopFile || !heroMobileFile || heroBusy}
            className="mt-5 h-11 rounded-xl bg-[#2b554e] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {heroBusy ? "Enviando..." : "Adicionar banner"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          {heroLoading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-black/10 bg-white/70 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-[1.6fr_.8fr]">
                  <div className="h-48 rounded-xl bg-black/5" />
                  <div className="h-48 rounded-xl bg-black/5" />
                </div>
              </div>
            ))}

          {!heroLoading &&
            heroRows.map((row) => {
              const desktopUrl = publicUrl(HERO_BUCKET, row.image_path);
              const mobileUrl = publicUrl(
                HERO_BUCKET,
                row.mobile_image_path ?? row.image_path,
              );

              return (
                <div
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                >
                  <div className="grid gap-px bg-black/10 sm:grid-cols-[1.6fr_.8fr]">
                    <div className="bg-black/5">
                      {desktopUrl && (
                        <img
                          src={desktopUrl}
                          alt={row.alt}
                          className="h-48 w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="bg-black/5">
                      {mobileUrl && (
                        <img
                          src={mobileUrl}
                          alt={`${row.alt} mobile`}
                          className="h-48 w-full object-cover"
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[#2b554e]">
                          {row.alt || "Banner Caléa"}
                        </div>
                        <div className="mt-1 text-xs text-black/45">
                          posição {row.position}
                        </div>
                      </div>

                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                          row.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-black/5 text-black/45",
                        ].join(" ")}
                      >
                        {row.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHeroActive(row)}
                        disabled={heroBusy}
                        className="h-9 rounded-xl border border-black/10 bg-white px-3 text-sm"
                      >
                        {row.active ? "Desativar" : "Ativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeHero(row)}
                        disabled={heroBusy}
                        className="h-9 rounded-xl border border-red-100 bg-red-50 px-3 text-sm text-red-600"
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type SkuImageRow = {
  id: string;
  sku_id: string;
  path: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
};

export default function SkuImagesDnd({
  skuId,
  bucket = "product-images",
  onPrimaryUrlChange,
}: {
  skuId: string;
  bucket?: string;
  onPrimaryUrlChange?: (url: string | null) => void;
}) {
  const [images, setImages] = useState<SkuImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function normalizePath(bucketName: string, p: string) {
    if (!p) return "";

    // URL completa pública do supabase -> extrai só o path dentro do bucket
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const i = p.indexOf(marker);
    if (i >= 0) return p.slice(i + marker.length);

    // veio com "bucket/..." -> remove prefixo
    const prefix = `${bucketName}/`;
    if (p.startsWith(prefix)) return p.slice(prefix.length);

    // caminho local/windows -> inválido para storage
    if (p.includes(":\\") || p.includes(":/")) return "";

    // já é path ok
    return p;
  }

  function logCtx(label: string, extra?: any) {
    // log curto e útil
    // eslint-disable-next-line no-console
    console.log(`[SkuImagesDnd] ${label}`, {
      skuId,
      bucket,
      ...extra,
    });
  }

  const urls = useMemo(() => {
    return images.map((img) => {
      const clean = normalizePath(bucket, img.path);
      if (!clean) {
        logCtx("URL_SKIP_INVALID_PATH", { id: img.id, rawPath: img.path });
        return { id: img.id, url: "" };
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(clean);
      if (!data?.publicUrl) {
        logCtx("URL_NO_PUBLICURL", { id: img.id, cleanPath: clean, rawPath: img.path });
      }
      return { id: img.id, url: data.publicUrl || "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, bucket, skuId]);

  async function load() {
    setErr(null);
    setLoading(true);
    logCtx("LOAD_START");

    try {
      const { data, error } = await supabase
        .from("sku_images")
        .select("id,sku_id,path,alt,sort_order,is_primary")
        .eq("sku_id", skuId)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });

      if (error) {
        logCtx("LOAD_ERROR", { error });
        throw new Error(error.message);
      }

      const rows = (data ?? []) as SkuImageRow[];
      setImages(rows);

      logCtx("LOAD_OK", {
        count: rows.length,
        paths: rows.map((r) => r.path),
      });

      const primary = rows.find((x) => x.is_primary) ?? rows[0];
      if (primary && onPrimaryUrlChange) {
        const clean = normalizePath(bucket, primary.path);
        if (!clean) {
          logCtx("PRIMARY_INVALID_PATH", { id: primary.id, rawPath: primary.path });
          onPrimaryUrlChange(null);
        } else {
          const { data: u } = supabase.storage.from(bucket).getPublicUrl(clean);
          logCtx("PRIMARY_URL", { id: primary.id, cleanPath: clean, url: u.publicUrl });
          onPrimaryUrlChange(u.publicUrl || null);
        }
      } else if (onPrimaryUrlChange) {
        onPrimaryUrlChange(null);
      }
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar imagens.");
    } finally {
      setLoading(false);
      logCtx("LOAD_END");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuId]);

  async function uploadFiles(files: FileList | File[]) {
    setErr(null);
    const arr = Array.from(files);
    if (!arr.length) return;

    setLoading(true);
    logCtx("UPLOAD_START", { files: arr.map((f) => ({ name: f.name, size: f.size, type: f.type })) });

    try {
      const nextSort = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;

      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
        const path = `skus/${skuId}/${safeName}`;

        logCtx("UPLOAD_FILE", { i, path, fileName: file.name });

        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: true, // evita 409 em repetição/retentativa
        });

        if (upErr) {
          logCtx("UPLOAD_STORAGE_ERROR", { path, upErr });
          throw new Error(upErr.message);
        }

        const insertRow = {
          sku_id: skuId,
          path, // salva SEMPRE só o path limpo
          alt: null,
          sort_order: nextSort + i,
          is_primary: images.length === 0 && i === 0,
        };

        const { error: insErr } = await supabase.from("sku_images").insert(insertRow);

        if (insErr) {
          logCtx("UPLOAD_DB_ERROR", { insertRow, insErr });
          throw new Error(insErr.message);
        }

        logCtx("UPLOAD_OK", { path });
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || "Erro ao enviar imagens.");
    } finally {
      setLoading(false);
      logCtx("UPLOAD_END");
    }
  }

  async function setPrimary(imageId: string) {
    setErr(null);
    setLoading(true);
    logCtx("PRIMARY_SET_START", { imageId });

    try {
      const { error: u0 } = await supabase.from("sku_images").update({ is_primary: false }).eq("sku_id", skuId);
      if (u0) {
        logCtx("PRIMARY_CLEAR_ERROR", { u0 });
        throw new Error(u0.message);
      }

      const { error: u1 } = await supabase.from("sku_images").update({ is_primary: true }).eq("id", imageId);
      if (u1) {
        logCtx("PRIMARY_SET_ERROR", { u1 });
        throw new Error(u1.message);
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || "Erro ao definir capa.");
    } finally {
      setLoading(false);
      logCtx("PRIMARY_SET_END");
    }
  }

  async function removeImage(img: SkuImageRow) {
    setErr(null);
    setLoading(true);
    logCtx("REMOVE_START", { id: img.id, rawPath: img.path });

    try {
      const clean = normalizePath(bucket, img.path);

      const { error: delDb } = await supabase.from("sku_images").delete().eq("id", img.id);
      if (delDb) {
        logCtx("REMOVE_DB_ERROR", { delDb });
        throw new Error(delDb.message);
      }

      if (clean) {
        const { error: delStorage } = await supabase.storage.from(bucket).remove([clean]);
        if (delStorage) {
          logCtx("REMOVE_STORAGE_ERROR", { clean, delStorage });
          throw new Error(delStorage.message);
        }
      } else {
        logCtx("REMOVE_STORAGE_SKIP_INVALID_PATH", { rawPath: img.path });
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || "Erro ao remover imagem.");
    } finally {
      setLoading(false);
      logCtx("REMOVE_END");
    }
  }

  async function persistOrder(next: SkuImageRow[]) {
    logCtx("ORDER_PERSIST_START", { order: next.map((x) => ({ id: x.id, sort_order: x.sort_order })) });

    const updates = next.map((img, idx) => ({ id: img.id, sort_order: idx }));
    const { error } = await supabase.from("sku_images").upsert(updates, { onConflict: "id" });

    if (error) {
      logCtx("ORDER_PERSIST_ERROR", { error });
      throw new Error(error.message);
    }

    logCtx("ORDER_PERSIST_OK");
  }

  function move(fromId: string, toId: string) {
    if (fromId === toId) return;

    const fromIdx = images.findIndex((i) => i.id === fromId);
    const toIdx = images.findIndex((i) => i.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;

    const next = [...images];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);

    const normalized = next.map((img, idx) => ({ ...img, sort_order: idx }));
    setImages(normalized);

    persistOrder(normalized).catch((e) => setErr(e?.message || "Erro ao reordenar."));
  }

  function onDropZone(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files?.length) uploadFiles(files);
  }

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div onDragOver={(e) => e.preventDefault()} onDrop={onDropZone} className="rounded-3xl border bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Fotos do SKU</div>
            <div className="text-xs text-gray-500 mt-1">
              Arraste e solte aqui, ou selecione arquivos. Reordene arrastando os cards.
            </div>
          </div>

          <label
            className="rounded-2xl px-4 py-2 text-sm font-medium text-white cursor-pointer"
            style={{ backgroundColor: "#2b554e" }}
          >
            {loading ? "Enviando…" : "Adicionar"}
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
                e.currentTarget.value = "";
              }}
              disabled={loading}
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.length === 0 ? (
            <div className="col-span-full rounded-2xl border bg-white p-6 text-center text-sm text-gray-500">
              Nenhuma imagem ainda.
            </div>
          ) : (
            images.map((img) => {
              const u = urls.find((x) => x.id === img.id)?.url || "";
              return (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragId(img.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId) move(dragId, img.id);
                    setDragId(null);
                  }}
                  className={`rounded-2xl border bg-white overflow-hidden shadow-sm ${
                    img.is_primary ? "ring-2 ring-emerald-900/20" : ""
                  }`}
                >
                  <div className="aspect-square bg-gray-100">
                    {u ? <img src={u} alt={img.alt || ""} className="h-full w-full object-cover" /> : null}
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">{img.is_primary ? "Capa" : `#${img.sort_order + 1}`}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="text-xs text-gray-500 hover:text-gray-900"
                      >
                        Remover
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrimary(img.id)}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border ${
                        img.is_primary
                          ? "bg-emerald-900 text-white border-emerald-900"
                          : "bg-white text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      {img.is_primary ? "Capa" : "Definir capa"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {images.length > 1 ? (
          <div className="mt-3 text-xs text-gray-500">Dica: arraste um card e solte em cima de outro para reordenar.</div>
        ) : null}
      </div>
    </div>
  );
}

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

  const urls = useMemo(() => {
    return images.map((img) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(img.path);
      return { id: img.id, url: data.publicUrl };
    });
  }, [images, bucket]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sku_images")
        .select("id,sku_id,path,alt,sort_order,is_primary")
        .eq("sku_id", skuId)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });

      if (error) throw new Error(error.message);
      setImages((data ?? []) as SkuImageRow[]);

      const primary = (data ?? []).find((x) => x.is_primary) ?? (data ?? [])[0];
      if (primary && onPrimaryUrlChange) {
        const { data: u } = supabase.storage.from(bucket).getPublicUrl(primary.path);
        onPrimaryUrlChange(u.publicUrl);
      } else if (onPrimaryUrlChange) {
        onPrimaryUrlChange(null);
      }
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar imagens.");
    } finally {
      setLoading(false);
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
    try {
      const nextSort = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;

      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
        const path = `skus/${skuId}/${safeName}`;

        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);

        const { error: insErr } = await supabase.from("sku_images").insert({
          sku_id: skuId,
          path,
          alt: null,
          sort_order: nextSort + i,
          is_primary: images.length === 0 && i === 0,
        });
        if (insErr) throw new Error(insErr.message);
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || "Erro ao enviar imagens.");
    } finally {
      setLoading(false);
    }
  }

  async function setPrimary(imageId: string) {
    setErr(null);
    setLoading(true);
    try {
      const { error: u0 } = await supabase
        .from("sku_images")
        .update({ is_primary: false })
        .eq("sku_id", skuId);
      if (u0) throw new Error(u0.message);

      const { error: u1 } = await supabase
        .from("sku_images")
        .update({ is_primary: true })
        .eq("id", imageId);
      if (u1) throw new Error(u1.message);

      await load();
    } catch (e: any) {
      setErr(e?.message || "Erro ao definir capa.");
    } finally {
      setLoading(false);
    }
  }

  async function removeImage(img: SkuImageRow) {
    setErr(null);
    setLoading(true);
    try {
      const { error: delDb } = await supabase.from("sku_images").delete().eq("id", img.id);
      if (delDb) throw new Error(delDb.message);

      const { error: delStorage } = await supabase.storage.from(bucket).remove([img.path]);
      if (delStorage) throw new Error(delStorage.message);

      await load();
    } catch (e: any) {
      setErr(e?.message || "Erro ao remover imagem.");
    } finally {
      setLoading(false);
    }
  }

  async function persistOrder(next: SkuImageRow[]) {
    const updates = next.map((img, idx) => ({ id: img.id, sort_order: idx }));
    const { error } = await supabase.from("sku_images").upsert(updates, { onConflict: "id" });
    if (error) throw new Error(error.message);
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
                      <span className="text-xs text-gray-500">
                        {img.is_primary ? "Capa" : `#${img.sort_order + 1}`}
                      </span>
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
          <div className="mt-3 text-xs text-gray-500">
            Dica: arraste um card e solte em cima de outro para reordenar.
          </div>
        ) : null}
      </div>
    </div>
  );
}

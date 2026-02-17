import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ImageRow = {
  id: string;
  path: string;
  is_primary: boolean;
  sort_order: number;
  alt: string | null;
};

export default function PhotosTab({ skuId }: { skuId: string }) {
  const [images, setImages] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("sku_images")
      .select("id,path,is_primary,sort_order,alt")
      .eq("sku_id", skuId)
      .order("sort_order", { ascending: true });

    if (error) setErr(error.message);
    setImages((data ?? []) as ImageRow[]);
  }

  useEffect(() => {
    setErr(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setErr(null);
    setUploading(true);

    // pega sort inicial
    const baseOrder = images.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${Date.now()}-${file.name}`;
      const path = `${skuId}/${fileName}`;

      const up = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (up.error) {
        setErr(up.error.message);
        continue;
      }

      await supabase.from("sku_images").insert({
        sku_id: skuId,
        path,
        sort_order: baseOrder + i,
        is_primary: baseOrder + i === 0 && images.length === 0, // primeira vira principal se não existe
      });
    }

    await load();
    setUploading(false);

    // reset input
    e.target.value = "";
  }

  async function setPrimary(imageId: string) {
    await supabase.from("sku_images").update({ is_primary: false }).eq("sku_id", skuId);
    await supabase.from("sku_images").update({ is_primary: true }).eq("id", imageId);
    load();
  }

  async function removeImage(row: ImageRow) {
    if (!confirm("Excluir imagem?")) return;

    await supabase.storage.from("product-images").remove([row.path]);
    await supabase.from("sku_images").delete().eq("id", row.id);

    load();
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Fotos (por SKU)</h2>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <input type="file" multiple onChange={onUpload} />

      {uploading && <div className="mt-2 text-sm text-gray-600">Enviando...</div>}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img) => {
          const url = supabase.storage.from("product-images").getPublicUrl(img.path).data.publicUrl;

          return (
            <div key={img.id} className="border rounded-xl overflow-hidden">
              <img src={url} className="w-full h-32 object-cover" />
              <div className="p-3 flex items-center justify-between text-xs">
                <button className="underline" onClick={() => setPrimary(img.id)}>
                  {img.is_primary ? "Principal" : "Definir principal"}
                </button>
                <button className="underline text-red-700" onClick={() => removeImage(img)}>
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {images.length === 0 && <div className="mt-4 text-sm text-gray-600">Nenhuma foto ainda.</div>}
    </div>
  );
}

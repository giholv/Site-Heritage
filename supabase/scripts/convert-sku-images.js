import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "product-images";

function removeExt(path) {
  return path.replace(/\.(jpg|jpeg|png|webp)$/i, "");
}

async function downloadFile(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path);

  if (error) throw new Error(`Erro ao baixar ${path}: ${error.message}`);

  return Buffer.from(await data.arrayBuffer());
}

async function uploadFile(path, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) throw new Error(`Erro ao subir ${path}: ${error.message}`);
}

async function convertOne(img) {
  const originalPath = img.path;
  const basePath = removeExt(originalPath);

  const thumbPath = `${basePath}-thumb.webp`;
  const mediumPath = `${basePath}-medium.webp`;
  const fullPath = `${basePath}-full.webp`;

  console.log("Convertendo:", originalPath);

  const original = await downloadFile(originalPath);

  const thumb = await sharp(original)
    .rotate()
    .resize({ width: 300, withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();

  const medium = await sharp(original)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  const full = await sharp(original)
    .rotate()
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  await uploadFile(thumbPath, thumb);
  await uploadFile(mediumPath, medium);
  await uploadFile(fullPath, full);

  const { error } = await supabase
    .from("sku_images")
    .update({
      thumb_path: thumbPath,
      medium_path: mediumPath,
      full_path: fullPath,
    })
    .eq("id", img.id);

  if (error) throw new Error(`Erro ao atualizar banco: ${error.message}`);

  console.log("OK:", originalPath);
}

async function main() {
  const { data, error } = await supabase
    .from("sku_images")
    .select("id, path, thumb_path, medium_path, full_path")
    .not("path", "is", null)
    .is("medium_path", null)


  if (error) throw new Error(error.message);

  console.log("Imagens encontradas:", data.length);

  for (const img of data) {
    try {
      await convertOne(img);
    } catch (err) {
      console.error("Falhou:", img.path, err.message);
    }
  }

  console.log("Finalizado.");
}

main();
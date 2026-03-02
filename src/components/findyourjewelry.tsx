import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase"; // ajuste o caminho

type Category = {
  id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  position: number;
};

const CATEGORY_BUCKET = "category-images"; // TROQUE se usar outro bucket (ou o mesmo do produto)

function publicUrl(bucket: string, path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export default function EncontreSuaJoia() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("category_tree")
        .select("id,name,slug,cover_image_path,position,parent_id,active")
        .eq("active", true)
        .is("parent_id", null) // <<< SÓ CATEGORIA PAI
        .order("position", { ascending: true });

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setCats([]);
      } else {
        setCats((data ?? []) as Category[]);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="categorias" className="bg-[#FCFAF6] py-14">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.18em] text-black/45 uppercase">Catálogo</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold text-[#2b554e]">
              Encontre sua joia
            </h2>
            <div className="mt-3 h-[2px] w-20 bg-[#b08d57] rounded-full" />
            <p className="mt-3 text-sm text-black/55">
              Selecione uma categoria para ver todas as peças.
            </p>

            {err && <div className="mt-3 text-sm text-red-600">Erro: {err}</div>}
          </div>

          <Link
            to="/joias"
            className="hidden md:inline-flex h-11 px-5 rounded-2xl bg-white/80 border border-black/10 text-sm font-semibold text-[#2b554e] hover:shadow-sm transition"
          >
            Ver tudo
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-5">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="rounded-3xl overflow-hidden border border-black/10 bg-white/80 animate-pulse"
              >
                <div className="aspect-[4/3] bg-black/5" />
                <div className="p-4">
                  <div className="h-4 bg-black/5 rounded w-2/3" />
                </div>
              </div>
            ))}

          {!loading &&
            cats.map((c) => {
              const img = publicUrl(CATEGORY_BUCKET, c.cover_image_path);
              return (
                <Link
                  key={c.id}
                  to={`/joias/categoria/${c.slug}`}
                  className="group rounded-3xl overflow-hidden border border-black/10 bg-white/80 shadow-sm hover:shadow-md transition"
                >
                  <div className="aspect-[4/3] bg-black/5">
                    {img ? (
                      <img
                        src={img}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                        loading="lazy"
                      />
                    ) : null}
                  </div>

                  <div className="p-4">
                    <div className="font-semibold text-[#2b554e]">{c.name}</div>
                    <div className="mt-1 text-xs text-black/50">Ver peças</div>
                  </div>
                </Link>
              );
            })}
        </div>

        <div className="mt-8 md:hidden">
          <Link
            to="/joias"
            className="inline-flex w-full h-11 items-center justify-center rounded-2xl bg-[#2b554e] text-white text-sm font-semibold"
          >
            Ver todo o catálogo
          </Link>
        </div>
      </div>
    </section>
  );
}
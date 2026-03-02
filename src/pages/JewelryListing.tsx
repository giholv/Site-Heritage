import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { X, SlidersHorizontal, ChevronDown, ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabase"; // ajuste

type Option = { label: string; value: string };

const FILTERS = {
  material: [
    { label: "Prata", value: "prata" },
    { label: "Banho Ouro", value: "banho-ouro" },
  ] as Option[],
  pedra: [
    { label: "Zircônia", value: "zirconia" },
    { label: "Pérola", value: "perola" },
    { label: "Cristal", value: "cristal" },
  ] as Option[],
  cor: [
    { label: "Dourado", value: "dourado" },
    { label: "Prata", value: "prata" },
  ] as Option[],
};

const SORTS: Option[] = [
  { label: "Relevância", value: "relevance" },
  { label: "Menor preço", value: "price_asc" },
  { label: "Maior preço", value: "price_desc" },
  { label: "Novidades", value: "new" },
];

type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  min_price_cents: number | null;
  image_path: string | null;
  image_alt: string | null;
  created_at: string;
  status: string;
  tag_slugs: string[] | null;
  collection_slugs: string[] | null;

  // >>> precisa existir na view
  primary_category_id: string | null;
};

const STORAGE_BUCKET = "product-images"; // TROQUE pro seu bucket real

function titleize(s?: string) {
  if (!s) return "";
  return s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function getMulti(sp: URLSearchParams, key: string) {
  return sp.getAll(key);
}
function setMulti(sp: URLSearchParams, key: string, values: string[]) {
  sp.delete(key);
  values.forEach((v) => sp.append(key, v));
}
function parsePrice(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function moneyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function centsToBRL(cents?: number | null) {
  return moneyBRL(((cents ?? 0) / 100) || 0);
}
function brlToCents(v: number) {
  return Math.max(0, Math.round(v * 100));
}
function imgUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
function pickBadge(tagSlugs?: string[] | null) {
  const t = tagSlugs ?? [];
  if (t.includes("novo")) return "Novo";
  if (t.includes("destaque")) return "Destaque";
  if (t.includes("mais-vendido")) return "Mais vendido";
  return undefined;
}

export default function JewelryListing() {
  console.log("JEWELRY LISTING RENDER", window.location.pathname);

  const { categorySlug, collectionSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedMaterial = useMemo(() => getMulti(searchParams, "material"), [searchParams]);
  const selectedPedra = useMemo(() => getMulti(searchParams, "pedra"), [searchParams]);
  const selectedCor = useMemo(() => getMulti(searchParams, "cor"), [searchParams]);

  const minPrice = useMemo(() => parsePrice(searchParams.get("min"), 0), [searchParams]);
  const maxPrice = useMemo(() => parsePrice(searchParams.get("max"), 9999), [searchParams]);
  const sort = useMemo(() => searchParams.get("sort") ?? "relevance", [searchParams]);

  const pageTitle = useMemo(() => {
    if (categorySlug) return titleize(categorySlug);
    if (collectionSlug) return titleize(collectionSlug);
    return "Catálogo";
  }, [categorySlug, collectionSlug]);

  const [categoryIds, setCategoryIds] = useState<string[] | null>(null); // null = carregando; [] = não achou
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!categorySlug) {
        setCategoryIds(null);
        return;
      }

      // 1) pai
      const { data: parent, error: pe } = await supabase
        .from("category_tree")
        .select("id")
        .eq("slug", categorySlug)
        .eq("active", true)
        .maybeSingle();

      if (!alive) return;

      if (pe || !parent) {
        console.error("Categoria pai não encontrada:", pe?.message);
        setCategoryIds([]);
        return;
      }

      // 2) filhos
      const { data: children, error: ce } = await supabase
        .from("category_tree")
        .select("id")
        .eq("active", true)
        .eq("parent_id", parent.id);

      if (!alive) return;

      if (ce) {
        console.error("Erro filhos:", ce.message);
        setCategoryIds([parent.id]);
        return;
      }

      setCategoryIds([parent.id, ...(children ?? []).map((c: any) => c.id)]);
    })();

    return () => {
      alive = false;
    };
  }, [categorySlug]);

  const appliedChips = useMemo(() => {
    const chips: { key: string; label: string; value: string; raw?: string }[] = [];

    selectedMaterial.forEach((v) => {
      const opt = FILTERS.material.find((o) => o.value === v);
      chips.push({ key: "material", label: "Material", value: opt?.label ?? v, raw: v });
    });
    selectedPedra.forEach((v) => {
      const opt = FILTERS.pedra.find((o) => o.value === v);
      chips.push({ key: "pedra", label: "Pedra", value: opt?.label ?? v, raw: v });
    });
    selectedCor.forEach((v) => {
      const opt = FILTERS.cor.find((o) => o.value === v);
      chips.push({ key: "cor", label: "Cor", value: opt?.label ?? v, raw: v });
    });

    if (searchParams.get("min") || searchParams.get("max")) {
      chips.push({
        key: "preco",
        label: "Preço",
        value: `${moneyBRL(minPrice)} – ${moneyBRL(maxPrice)}`,
      });
    }

    return chips;
  }, [searchParams, selectedMaterial, selectedPedra, selectedCor, minPrice, maxPrice]);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const spKey = searchParams.toString();

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      // se estiver numa rota de categoria, espera resolver pai+filhos
      if (categorySlug && categoryIds === null) {
        // ainda carregando ids
        return;
      }

      if (categorySlug && categoryIds && categoryIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      let q = supabase
        .from("v_catalog_products")
        .select(
          "id,slug,name,min_price_cents,image_path,image_alt,created_at,status,tag_slugs,collection_slugs,primary_category_id"
        )
        .eq("status", "active");

      // categoria pai -> filtra por pai+filhos
      if (categorySlug && categoryIds && categoryIds.length > 0) {
        q = q.in("primary_category_id", categoryIds);
      }

      // coleção
      if (collectionSlug) q = q.contains("collection_slugs", [collectionSlug]);

      // preço
      q = q.gte("min_price_cents", brlToCents(minPrice)).lte("min_price_cents", brlToCents(maxPrice));

      // filtros por tags
      if (selectedMaterial.length) q = q.overlaps("tag_slugs", selectedMaterial);
      if (selectedPedra.length) q = q.overlaps("tag_slugs", selectedPedra);
      if (selectedCor.length) q = q.overlaps("tag_slugs", selectedCor);

      // sort
      if (sort === "price_asc") q = q.order("min_price_cents", { ascending: true, nullsFirst: false });
      else if (sort === "price_desc") q = q.order("min_price_cents", { ascending: false, nullsFirst: false });
      else q = q.order("created_at", { ascending: false });

      const { data, error } = await q;

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setProducts([]);
      } else {
        setProducts((data ?? []) as CatalogProduct[]);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [
    categorySlug,
    collectionSlug,
    categoryIds,
    spKey,
    minPrice,
    maxPrice,
    sort,
    selectedMaterial,
    selectedPedra,
    selectedCor,
  ]);

  const total = products.length;

  const toggleMulti = (key: "material" | "pedra" | "cor", value: string) => {
    const sp = new URLSearchParams(searchParams);
    const current = sp.getAll(key);
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    setMulti(sp, key, next);
    setSearchParams(sp, { replace: true });
  };

  const setPrice = (nextMin: number, nextMax: number) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("min", String(nextMin));
    sp.set("max", String(nextMax));
    setSearchParams(sp, { replace: true });
  };

  const clearAll = () => {
    const sp = new URLSearchParams(searchParams);
    ["material", "pedra", "cor", "min", "max", "sort"].forEach((k) => sp.delete(k));
    setSearchParams(sp, { replace: true });
  };

  const removeChip = (chip: { key: string; value: string; label: string; raw?: string }) => {
    const sp = new URLSearchParams(searchParams);

    if (chip.key === "preco") {
      sp.delete("min");
      sp.delete("max");
    } else {
      const all = sp.getAll(chip.key);
      const next = all.filter((v) => v !== (chip.raw ?? chip.value));
      setMulti(sp, chip.key as any, next);
    }

    setSearchParams(sp, { replace: true });
  };

  const FiltersPanel = ({ compact }: { compact?: boolean }) => (
    <div className={compact ? "" : "sticky top-[160px]"}>
      <div className="bg-white/80 backdrop-blur border border-black/10 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-[#2b554e] tracking-wide">FILTROS</div>
          <button type="button" onClick={clearAll} className="text-xs text-black/50 hover:text-black">
            Limpar
          </button>
        </div>

        <div className="border-t border-black/10 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-black">Preço</div>
            <span className="text-xs text-black/50">
              {moneyBRL(minPrice)} – {moneyBRL(maxPrice)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-black/50">Mín</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setPrice(Number(e.target.value || 0), maxPrice)}
                className="mt-1 w-full h-11 rounded-2xl border border-black/10 px-3 text-sm bg-[#FCFAF6]"
              />
            </div>
            <div>
              <label className="text-xs text-black/50">Máx</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setPrice(minPrice, Number(e.target.value || 9999))}
                className="mt-1 w-full h-11 rounded-2xl border border-black/10 px-3 text-sm bg-[#FCFAF6]"
              />
            </div>
          </div>
        </div>

        {(
          [
            ["Material", "material", FILTERS.material, selectedMaterial] as const,
            ["Pedra", "pedra", FILTERS.pedra, selectedPedra] as const,
            ["Cor", "cor", FILTERS.cor, selectedCor] as const,
          ] as const
        ).map(([title, key, opts, selected]) => (
          <div key={key} className="border-t border-black/10 pt-4 mt-4">
            <div className="text-sm font-medium text-black mb-3">{title}</div>
            <div className="space-y-2">
              {opts.map((o) => (
                <label key={o.value} className="flex items-center justify-between gap-3 text-sm cursor-pointer">
                  <span className="text-black/80">{o.label}</span>
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={() => toggleMulti(key as any, o.value)}
                    className="h-4 w-4 accent-[#2b554e]"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        {compact && (
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="mt-6 w-full h-11 rounded-2xl bg-[#2b554e] text-white text-sm font-semibold"
          >
            Aplicar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-[#FCFAF6] pt-[140px] md:pt-[180px]">
      <div className="container mx-auto px-4 md:px-6 pb-16">
        {/* topo */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.18em] text-black/45 uppercase">Joias • {pageTitle}</div>
            <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-[#2b554e]">{pageTitle}</h1>
            <div className="mt-3 h-[2px] w-20 bg-[#b08d57] rounded-full" />
            <div className="mt-3 text-sm text-black/55">
              {loading ? "Carregando..." : `${total} peças selecionadas`}
            </div>
            {err && <div className="mt-3 text-sm text-red-600">Erro: {err}</div>}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-black/50">Ordenar:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => {
                  const sp = new URLSearchParams(searchParams);
                  sp.set("sort", e.target.value);
                  setSearchParams(sp, { replace: true });
                }}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 pr-10 text-sm"
              >
                {SORTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* chips */}
        {appliedChips.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {appliedChips.map((c, i) => (
              <button
                key={`${c.key}-${i}`}
                type="button"
                onClick={() => removeChip(c)}
                className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-black/10 px-4 py-2 text-sm hover:bg-black/5"
              >
                <span className="text-black/55">{c.label}:</span>
                <span className="font-medium text-[#2b554e]">{c.value}</span>
                <X className="h-4 w-4 text-black/35" />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="ml-1 text-sm text-[#b08d57] hover:underline">
              Limpar tudo
            </button>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div className="hidden md:block">
            <FiltersPanel />
          </div>

          <div>
            <div className="md:hidden flex items-center justify-between gap-3 mb-5">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="h-11 px-4 rounded-2xl bg-white/80 backdrop-blur border border-black/10 text-sm inline-flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </button>

              <div className="relative flex-1">
                <select
                  value={sort}
                  onChange={(e) => {
                    const sp = new URLSearchParams(searchParams);
                    sp.set("sort", e.target.value);
                    setSearchParams(sp, { replace: true });
                  }}
                  className="w-full h-11 rounded-2xl border border-black/10 bg-white/80 backdrop-blur px-4 pr-10 text-sm"
                >
                  {SORTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={`sk-${i}`} className="rounded-3xl bg-white/80 border border-black/10 overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-[4/5] bg-black/5" />
                    <div className="p-4">
                      <div className="h-4 bg-black/5 rounded w-3/4" />
                      <div className="h-4 bg-black/5 rounded w-1/2 mt-3" />
                      <div className="h-10 bg-black/5 rounded-2xl mt-5" />
                    </div>
                  </div>
                ))}

              {!loading &&
                products.map((p) => {
                  const img = imgUrl(p.image_path);
                  const badge = pickBadge(p.tag_slugs);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/produto/${p.slug}`)}
                      className="text-left group rounded-3xl bg-white/80 backdrop-blur border border-black/10 overflow-hidden shadow-sm hover:shadow-md transition"
                    >
                      <div className="relative">
                        <div className="aspect-[4/5] bg-gradient-to-b from-black/5 to-black/0">
                          {img ? (
                            <img src={img} alt={p.image_alt ?? p.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : null}
                        </div>

                        {badge && (
                          <span className="absolute top-3 left-3 text-xs font-semibold bg-[#2b554e] text-[#F8F3EA] px-3 py-1 rounded-full">
                            {badge}
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="text-sm font-semibold text-[#2b554e] line-clamp-1">{p.name}</div>
                        <div className="mt-1 text-sm font-semibold text-[#b08d57]">{centsToBRL(p.min_price_cents)}</div>

                        <div className="mt-4 flex gap-2">
                          <span className="flex-1 h-10 inline-flex items-center justify-center rounded-2xl bg-[#2b554e] text-white text-sm font-semibold">
                            <ShoppingBag className="h-4 w-4 mr-2" />
                            Adicionar
                          </span>
                          <span className="h-10 px-4 inline-flex items-center justify-center rounded-2xl border border-[#2b554e]/15 text-[#2b554e] text-sm font-semibold">
                            Ver
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

              {!loading && !err && products.length === 0 && (
                <div className="col-span-2 md:col-span-3 lg:col-span-4 rounded-3xl bg-white/80 border border-black/10 p-8 text-center text-black/60">
                  Nenhum produto encontrado.
                </div>
              )}
            </div>
          </div>
        </div>

        {mobileFiltersOpen && (
          <div className="md:hidden fixed inset-0 z-[60]">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="absolute inset-0 bg-black/30"
              aria-label="Fechar filtros"
            />
            <div className="absolute right-0 top-0 h-full w-[92%] max-w-[420px] bg-[#FCFAF6] p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-semibold text-[#2b554e]">Filtros</div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white border border-black/10"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <FiltersPanel compact />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
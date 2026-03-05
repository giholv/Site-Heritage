import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import Header from "../components/Header";
import { supabase } from "../lib/supabase";

type Option = { label: string; value: string };

type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  min_price_cents: number | null;
  image_path: string | null;
  image_alt: string | null;
  created_at: string;
  status: string;
  collection_slugs: string[] | null;
  primary_category_id: string | null;

  material_slugs: string[] | null;
  stone_slugs: string[] | null;
  color_slugs: string[] | null;
  tag_slugs: string[] | null;
};

const CALEA = { primary: "#2b554e", accent: "#b08d57", bg: "#FCFAF6" };
const VIEW_NAME = "v_catalog_products_with_filters";
const STORAGE_BUCKET = "product-images";

const SORTS: Option[] = [
  { label: "Relevância", value: "relevance" },
  { label: "Menor preço", value: "price_asc" },
  { label: "Maior preço", value: "price_desc" },
  { label: "Novidades", value: "new" },
];

function titleizeSlug(slug?: string) {
  if (!slug) return "";
  const map: Record<string, string> = {
    zirconia: "Zircônia",
    perola: "Pérola",
    cristal: "Cristal",
    ouro: "Ouro",
    prata: "Prata",
    dourado: "Dourado",
    prateado: "Prateado",
    rosado: "Rosado",
    transparente: "Transparente",
  };
  if (map[slug]) return map[slug];
  return slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
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
function parseNum(v: string | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function getMulti(sp: URLSearchParams, key: string) {
  return sp.getAll(key);
}
function setMulti(sp: URLSearchParams, key: string, values: string[]) {
  sp.delete(key);
  values.forEach((v) => sp.append(key, v));
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
  const { categorySlug, collectionSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const selectedMaterial = useMemo(() => getMulti(searchParams, "material"), [searchParams]);
  const selectedPedra = useMemo(() => getMulti(searchParams, "pedra"), [searchParams]);
  const selectedCor = useMemo(() => getMulti(searchParams, "cor"), [searchParams]);

  const sort = useMemo(() => searchParams.get("sort") ?? "relevance", [searchParams]);
  const qText = useMemo(() => (searchParams.get("q") ?? "").trim(), [searchParams]);

  const minFromUrl = useMemo(() => parseNum(searchParams.get("min")), [searchParams]);
  const maxFromUrl = useMemo(() => parseNum(searchParams.get("max")), [searchParams]);
  const userSetPrice = useMemo(
    () => searchParams.get("min") !== null || searchParams.get("max") !== null,
    [searchParams]
  );

  const pageTitle = useMemo(() => {
    if (categorySlug) return titleizeSlug(categorySlug);
    if (collectionSlug) return titleizeSlug(collectionSlug);
    return "Catálogo";
  }, [categorySlug, collectionSlug]);

  // Mobile filters drawer
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Resolve categoria pai + filhos
  const [categoryIds, setCategoryIds] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!categorySlug) {
        setCategoryIds(null);
        return;
      }

      const { data: parent, error: pe } = await supabase
        .from("category_tree")
        .select("id")
        .eq("slug", categorySlug)
        .eq("active", true)
        .maybeSingle();

      if (!alive) return;

      if (pe || !parent) {
        setCategoryIds([]);
        return;
      }

      const parentId = (parent as any).id;

      const { data: children, error: ce } = await supabase
        .from("category_tree")
        .select("id")
        .eq("active", true)
        .eq("parent_id", parentId);

      if (!alive) return;

      if (ce) {
        setCategoryIds([parentId]);
        return;
      }

      setCategoryIds([parentId, ...(children ?? []).map((c: any) => c.id)]);
    })();

    return () => {
      alive = false;
    };
  }, [categorySlug]);

  // hero image (categoria: cover_image_path; fallback: 1º produto)
  const [heroImage, setHeroImage] = useState<string | null>(null);

  // options + bounds
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);
  const [materialOptions, setMaterialOptions] = useState<Option[]>([]);
  const [stoneOptions, setStoneOptions] = useState<Option[]>([]);
  const [colorOptions, setColorOptions] = useState<Option[]>([]);

  useEffect(() => {
    let alive = true;

    const baseQuery = () => {
      let q = supabase
        .from(VIEW_NAME)
        .select("min_price_cents,material_slugs,stone_slugs,color_slugs,primary_category_id,collection_slugs")
        .eq("status", "active");

      if (categorySlug && categoryIds && categoryIds.length > 0) q = q.in("primary_category_id", categoryIds);
      if (collectionSlug) q = q.contains("collection_slugs", [collectionSlug]);

      return q;
    };

    (async () => {
      if (categorySlug && categoryIds === null) return;

      if (categorySlug && categoryIds && categoryIds.length === 0) {
        setPriceBounds({ min: 0, max: 0 });
        setMaterialOptions([]);
        setStoneOptions([]);
        setColorOptions([]);
        return;
      }

      const [minRes, maxRes] = await Promise.all([
        baseQuery().order("min_price_cents", { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
        baseQuery().order("min_price_cents", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      ]);

      if (!alive) return;

      const minC = ((minRes.data as any)?.min_price_cents ?? 0) as number;
      const maxC = ((maxRes.data as any)?.min_price_cents ?? 0) as number;

      const bMin = Math.max(0, minC / 100);
      const bMax = Math.max(bMin, maxC / 100);
      setPriceBounds({ min: bMin, max: bMax });

      const { data: rows, error } = await baseQuery().limit(800);
      if (!alive) return;

      if (error) {
        setMaterialOptions([]);
        setStoneOptions([]);
        setColorOptions([]);
        return;
      }

      const mats = new Set<string>();
      const stones = new Set<string>();
      const colors = new Set<string>();

      (rows ?? []).forEach((r: any) => {
        (r.material_slugs ?? []).forEach((m: string) => mats.add(m));
        (r.stone_slugs ?? []).forEach((s: string) => stones.add(s));
        (r.color_slugs ?? []).forEach((c: string) => colors.add(c));
      });

      const matsArr = Array.from(mats);
      const stonesArr = Array.from(stones).sort();
      const colorsArr = Array.from(colors).sort();

      setMaterialOptions([
        ...(matsArr.includes("ouro") ? [{ label: "Ouro", value: "ouro" }] : []),
        ...(matsArr.includes("prata") ? [{ label: "Prata", value: "prata" }] : []),
      ]);
      setStoneOptions(stonesArr.map((v) => ({ value: v, label: titleizeSlug(v) })));
      setColorOptions(colorsArr.map((v) => ({ value: v, label: titleizeSlug(v) })));
    })();

    return () => {
      alive = false;
    };
  }, [categorySlug, collectionSlug, categoryIds]);

  const effMin = useMemo(() => {
    if (minFromUrl !== null) return Math.max(0, minFromUrl);
    return priceBounds?.min ?? 0;
  }, [minFromUrl, priceBounds]);

  const effMax = useMemo(() => {
    if (maxFromUrl !== null) return Math.max(0, maxFromUrl);
    return priceBounds?.max ?? 0;
  }, [maxFromUrl, priceBounds]);

  // products
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const filtersKey = searchParams.toString();

  useEffect(() => {
    let alive = true;

    (async () => {
      // aguarda categoria resolver
      if (categorySlug && categoryIds === null) {
        setLoading(true);
        return;
      }
      // sem categoria válida
      if (categorySlug && categoryIds && categoryIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      // aguarda bounds
      if (!priceBounds && !userSetPrice) {
        setLoading(true);
        return;
      }

      setLoading(true);
      setErr(null);

      let q = supabase
        .from(VIEW_NAME)
        .select(
          "id,slug,name,min_price_cents,image_path,image_alt,created_at,status,collection_slugs,primary_category_id,material_slugs,stone_slugs,color_slugs,tag_slugs"
        )
        .eq("status", "active");

      if (categorySlug && categoryIds && categoryIds.length > 0) q = q.in("primary_category_id", categoryIds);
      if (collectionSlug) q = q.contains("collection_slugs", [collectionSlug]);
      if (qText) q = q.ilike("name", `%${qText}%`);

      const min = userSetPrice ? effMin : (priceBounds?.min ?? 0);
      const max = userSetPrice ? effMax : (priceBounds?.max ?? 0);
      q = q.gte("min_price_cents", brlToCents(min)).lte("min_price_cents", brlToCents(max));

      if (selectedMaterial.length) q = q.overlaps("material_slugs", selectedMaterial);
      if (selectedPedra.length) q = q.overlaps("stone_slugs", selectedPedra);
      if (selectedCor.length) q = q.overlaps("color_slugs", selectedCor);

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
    priceBounds,
    userSetPrice,
    effMin,
    effMax,
    selectedMaterial,
    selectedPedra,
    selectedCor,
    sort,
    qText,
    filtersKey,
  ]);

  // hero image
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!categorySlug) {
        const fallback = imgUrl(products?.[0]?.image_path) ?? null;
        if (alive) setHeroImage(fallback);
        return;
      }

      const { data, error } = await supabase
        .from("category_tree")
        .select("cover_image_path")
        .eq("slug", categorySlug)
        .maybeSingle();

      if (!alive) return;

      const cover = (data as any)?.cover_image_path ? imgUrl((data as any).cover_image_path) : null;
      const fallback = imgUrl(products?.[0]?.image_path) ?? null;

      if (error) setHeroImage(fallback);
      else setHeroImage(cover || fallback);
    })();

    return () => {
      alive = false;
    };
  }, [categorySlug, products]);

  // URL helpers
  const setQueryParam = (v: string) => {
    const sp = new URLSearchParams(searchParams);
    const clean = v.trim();
    if (!clean) sp.delete("q");
    else sp.set("q", clean);
    setSearchParams(sp, { replace: true });
  };

  const toggleMulti = (key: "material" | "pedra" | "cor", value: string) => {
    const sp = new URLSearchParams(searchParams);
    const cur = sp.getAll(key);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    setMulti(sp, key, next);
    setSearchParams(sp, { replace: true });
  };

  const setPriceParams = (nextMin: number, nextMax: number) => {
    const sp = new URLSearchParams(searchParams);

    const bMin = priceBounds?.min ?? 0;
    const bMax = priceBounds?.max ?? 0;

    let min = Math.max(0, Number(nextMin) || 0);
    let max = Math.max(0, Number(nextMax) || 0);
    if (max < min) max = min;

    const isDefault = Math.abs(min - bMin) < 0.0001 && Math.abs(max - bMax) < 0.0001;

    if (isDefault) {
      sp.delete("min");
      sp.delete("max");
    } else {
      sp.set("min", String(min));
      sp.set("max", String(max));
    }

    setSearchParams(sp, { replace: true });
  };

  const clearAll = () => {
    const sp = new URLSearchParams(searchParams);
    ["material", "pedra", "cor", "min", "max", "sort", "q"].forEach((k) => sp.delete(k));
    setSearchParams(sp, { replace: true });
  };

  const appliedChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string; raw?: string }> = [];

    const findLabel = (opts: Option[], v: string) => opts.find((o) => o.value === v)?.label ?? titleizeSlug(v);

    selectedMaterial.forEach((v) => chips.push({ key: "material", label: "Material", value: findLabel(materialOptions, v), raw: v }));
    selectedPedra.forEach((v) => chips.push({ key: "pedra", label: "Pedra", value: findLabel(stoneOptions, v), raw: v }));
    selectedCor.forEach((v) => chips.push({ key: "cor", label: "Cor", value: findLabel(colorOptions, v), raw: v }));

    if (qText) chips.push({ key: "q", label: "Busca", value: qText });
    if (userSetPrice) chips.push({ key: "preco", label: "Preço", value: `${moneyBRL(effMin)} – ${moneyBRL(effMax)}` });

    return chips;
  }, [
    selectedMaterial,
    selectedPedra,
    selectedCor,
    materialOptions,
    stoneOptions,
    colorOptions,
    qText,
    userSetPrice,
    effMin,
    effMax,
  ]);

  const removeChip = (chip: { key: string; value: string; label: string; raw?: string }) => {
    const sp = new URLSearchParams(searchParams);

    if (chip.key === "preco") {
      sp.delete("min");
      sp.delete("max");
    } else if (chip.key === "q") {
      sp.delete("q");
    } else {
      const all = sp.getAll(chip.key);
      const next = all.filter((v) => v !== (chip.raw ?? chip.value));
      setMulti(sp, chip.key as any, next);
    }

    setSearchParams(sp, { replace: true });
  };

  const total = products.length;

  const FiltersPanel = ({ compact }: { compact?: boolean }) => (
    <div className={compact ? "" : "sticky top-[176px]"}>
      <div className="rounded-[28px] border border-black/10 bg-white/70 backdrop-blur shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold tracking-[0.18em] text-black/45 uppercase">Filtros</div>
          <button type="button" onClick={clearAll} className="text-xs text-black/40 hover:text-black">
            Limpar
          </button>
        </div>

        {/* Preço */}
        <div className="mt-4 pt-4 border-t border-black/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-black">Preço</div>
            <div className="text-xs text-black/45">
              {moneyBRL(effMin)} – {moneyBRL(effMax)}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-black/45">Mín</label>
              <input
                type="number"
                value={effMin}
                min={0}
                onChange={(e) => setPriceParams(Number(e.target.value || 0), effMax)}
                className="mt-1 w-full h-11 rounded-2xl border border-black/10 px-3 text-sm bg-[#FCFAF6] focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div>
              <label className="text-xs text-black/45">Máx</label>
              <input
                type="number"
                value={effMax}
                min={0}
                onChange={(e) => setPriceParams(effMin, Number(e.target.value || 0))}
                className="mt-1 w-full h-11 rounded-2xl border border-black/10 px-3 text-sm bg-[#FCFAF6] focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>
        </div>

        {(
          [
            ["Material", "material", materialOptions, selectedMaterial] as const,
            ["Pedra", "pedra", stoneOptions, selectedPedra] as const,
            ["Cor", "cor", colorOptions, selectedCor] as const,
          ] as const
        ).map(([title, key, opts, selected]) => (
          <div key={key} className="mt-4 pt-4 border-t border-black/10">
            <div className="text-sm font-semibold text-black mb-3">{title}</div>

            {opts.length === 0 ? (
              <div className="text-sm text-black/45">Sem opções.</div>
            ) : (
              <div className="space-y-2">
                {opts.map((o) => (
                  <label key={o.value} className="flex items-center justify-between gap-3 text-sm cursor-pointer">
                    <span className="text-black/75">{o.label}</span>
                    <input
                      type="checkbox"
                      checked={selected.includes(o.value)}
                      onChange={() => toggleMulti(key as any, o.value)}
                      className="h-4 w-4"
                      style={{ accentColor: CALEA.primary } as any}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {compact && (
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="mt-6 w-full h-11 rounded-2xl text-white text-sm font-semibold"
            style={{ backgroundColor: CALEA.primary }}
          >
            Aplicar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: CALEA.bg }}>
      <Header searchValue={qText} onSearchChange={setQueryParam} onSearchSubmit={setQueryParam} />

      {/* spacer pq Header é fixed */}
      <div className="h-[160px]" />

      {/* HERO */}
      <section className="container mx-auto px-4 md:px-6 pt-6">
        <div className="rounded-[32px] overflow-hidden border border-black/10 bg-white/60 shadow-sm">
          <div className="relative h-[220px] md:h-[340px]">
            {heroImage ? (
              <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-black/5 animate-pulse" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="text-xs tracking-[0.18em] text-white/80 uppercase">Joias • {pageTitle}</div>
              <h1 className="mt-2 text-3xl md:text-5xl font-semibold text-white">{pageTitle}</h1>
              <div className="mt-3 h-[2px] w-20 rounded-full" style={{ backgroundColor: CALEA.accent }} />
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="container mx-auto px-4 md:px-6 mt-8 pb-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-black/55">
              {loading ? "Carregando..." : `${total} peça(s)`}
              {err ? <span className="ml-2 text-red-600">Erro: {err}</span> : null}
            </div>

            {appliedChips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {appliedChips.map((c, i) => (
                  <button
                    key={`${c.key}-${i}`}
                    type="button"
                    onClick={() => removeChip(c)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-black/10 px-4 py-2 text-sm hover:bg-black/5 transition"
                  >
                    <span className="text-black/55">{c.label}:</span>
                    <span className="font-medium" style={{ color: CALEA.primary }}>
                      {c.value}
                    </span>
                    <X className="h-4 w-4 text-black/35" />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="ml-1 text-sm hover:underline" style={{ color: CALEA.accent }}>
                  Limpar tudo
                </button>
              </div>
            )}
          </div>

          {/* sort + filtros mobile */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden h-11 px-4 rounded-2xl border border-black/10 bg-white inline-flex items-center gap-2 text-sm"
            >
              <SlidersHorizontal className="h-4 w-4 text-black/60" />
              Filtros
            </button>

            <span className="text-sm text-black/50 hidden md:inline">Ordenar:</span>

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

        <div className="mt-8 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8">
          <div className="hidden md:block">
            <FiltersPanel />
          </div>

          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={`sk-${i}`} className="rounded-[28px] bg-white/70 border border-black/10 overflow-hidden shadow-sm animate-pulse">
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
                      className="text-left group rounded-[28px] bg-white/70 backdrop-blur border border-black/10 overflow-hidden shadow-sm hover:shadow-md transition"
                    >
                      <div className="relative">
                        <div className="aspect-[4/5] bg-gradient-to-b from-black/5 to-black/0">
                          {img ? (
                            <img
                              src={img}
                              alt={p.image_alt ?? p.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>

                        {badge && (
                          <span
                            className="absolute top-3 left-3 text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ backgroundColor: CALEA.primary, color: "#F8F3EA" }}
                          >
                            {badge}
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="text-sm font-semibold line-clamp-1" style={{ color: CALEA.primary }}>
                          {p.name}
                        </div>
                        <div className="mt-1 text-sm font-semibold" style={{ color: CALEA.accent }}>
                          {centsToBRL(p.min_price_cents)}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <span
                            className="flex-1 h-10 inline-flex items-center justify-center rounded-2xl text-white text-sm font-semibold"
                            style={{ backgroundColor: CALEA.primary }}
                          >
                            Comprar
                          </span>
                          <span
                            className="h-10 px-4 inline-flex items-center justify-center rounded-2xl border text-sm font-semibold"
                            style={{ borderColor: `${CALEA.primary}22`, color: CALEA.primary }}
                          >
                            Ver
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

              {!loading && !err && products.length === 0 && (
                <div className="col-span-2 md:col-span-3 xl:col-span-4 rounded-[28px] bg-white/70 border border-black/10 p-10 text-center text-black/60">
                  Nenhum produto encontrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/30"
            aria-label="Fechar filtros"
          />
          <div
            className="absolute right-0 top-0 h-full w-[92%] max-w-[420px] p-4 overflow-y-auto"
            style={{ backgroundColor: CALEA.bg }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-semibold" style={{ color: CALEA.primary }}>
                Filtros
              </div>
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
  );
}
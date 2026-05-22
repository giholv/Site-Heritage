import { useEffect, useMemo, useState } from "react";
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
  available_qty: number | string | null;
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

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path.replace(/^\/+/, ""));
  return data.publicUrl;
}

function pickBadge(tagSlugs?: string[] | null) {
  const t = tagSlugs ?? [];
  if (t.includes("novo")) return "Novo";
  if (t.includes("destaque")) return "Destaque";
  if (t.includes("mais-vendido")) return "Mais vendido";
  return undefined;
}

function normalizeAvailableQty(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

async function getRealStockByProduct(productIds: string[]) {
  const cleanIds = Array.from(new Set(productIds.filter(Boolean)));

  if (cleanIds.length === 0) return new Map<string, number>();

  const { data: skuRows, error: skuError } = await supabase
    .from("skus")
    .select("id, product_id")
    .in("product_id", cleanIds)
    .eq("active", true);

  if (skuError || !skuRows?.length) {
    return new Map<string, number>();
  }

  const skuIds = skuRows.map((sku: any) => sku.id).filter(Boolean);

  if (skuIds.length === 0) return new Map<string, number>();

  const { data: availabilityRows, error: availabilityError } = await supabase
    .from("sku_availability")
    .select("sku_id, available_qty")
    .in("sku_id", skuIds);

  if (availabilityError) {
    return new Map<string, number>();
  }

  const skuToProduct = new Map<string, string>();

  skuRows.forEach((sku: any) => {
    skuToProduct.set(String(sku.id), String(sku.product_id));
  });

  const stockByProduct = new Map<string, number>();

  availabilityRows?.forEach((row: any) => {
    const productId = skuToProduct.get(String(row.sku_id));
    if (!productId) return;

    const qty = normalizeAvailableQty(row.available_qty);
    stockByProduct.set(productId, (stockByProduct.get(productId) ?? 0) + qty);
  });

  return stockByProduct;
}

export default function JewelryListing() {
  const { categorySlug, collectionSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[] | null>(null);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);
  const [materialOptions, setMaterialOptions] = useState<Option[]>([]);
  const [stoneOptions, setStoneOptions] = useState<Option[]>([]);
  const [colorOptions, setColorOptions] = useState<Option[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const filtersKey = searchParams.toString();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [categorySlug, collectionSlug, filtersKey]);

  useEffect(() => {
    let alive = true;

    async function loadCategoryIds() {
      if (!categorySlug) {
        setCategoryIds(null);
        return;
      }

      const { data: parent, error } = await supabase
        .from("category_tree")
        .select("id")
        .eq("slug", categorySlug)
        .eq("active", true)
        .maybeSingle();

      if (!alive) return;

      if (error || !parent) {
        setCategoryIds([]);
        return;
      }

      const parentId = (parent as any).id;

      const { data: children } = await supabase
        .from("category_tree")
        .select("id")
        .eq("active", true)
        .eq("parent_id", parentId);

      if (!alive) return;
      setCategoryIds([parentId, ...(children ?? []).map((c: any) => c.id)]);
    }

    loadCategoryIds();

    return () => {
      alive = false;
    };
  }, [categorySlug]);

  useEffect(() => {
    let alive = true;

    function baseQuery() {
      let q = supabase
        .from(VIEW_NAME)
        .select("min_price_cents,material_slugs,stone_slugs,color_slugs,primary_category_id,collection_slugs,available_qty")
        .eq("status", "active");

      if (categorySlug && categoryIds && categoryIds.length > 0) q = q.in("primary_category_id", categoryIds);
      if (collectionSlug) q = q.contains("collection_slugs", [collectionSlug]);

      return q;
    }

    async function loadFilters() {
      if (categorySlug && categoryIds === null) return;

      if (categorySlug && categoryIds && categoryIds.length === 0) {
        setPriceBounds({ min: 0, max: 0 });
        setMaterialOptions([]);
        setStoneOptions([]);
        setColorOptions([]);
        return;
      }

      const [minRes, maxRes, rowsRes] = await Promise.all([
        baseQuery().order("min_price_cents", { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
        baseQuery().order("min_price_cents", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
        baseQuery().limit(1000),
      ]);

      if (!alive) return;

      const minC = Number((minRes.data as any)?.min_price_cents ?? 0);
      const maxC = Number((maxRes.data as any)?.min_price_cents ?? 0);

      setPriceBounds({ min: Math.max(0, minC / 100), max: Math.max(0, maxC / 100) });

      if (rowsRes.error) {
        setMaterialOptions([]);
        setStoneOptions([]);
        setColorOptions([]);
        return;
      }

      const mats = new Set<string>();
      const stones = new Set<string>();
      const colors = new Set<string>();

      (rowsRes.data ?? []).forEach((r: any) => {
        (r.material_slugs ?? []).forEach((m: string) => mats.add(m));
        (r.stone_slugs ?? []).forEach((s: string) => stones.add(s));
        (r.color_slugs ?? []).forEach((c: string) => colors.add(c));
      });

      const matsArr = Array.from(mats).sort();
      setMaterialOptions(matsArr.map((v) => ({ value: v, label: titleizeSlug(v) })));
      setStoneOptions(Array.from(stones).sort().map((v) => ({ value: v, label: titleizeSlug(v) })));
      setColorOptions(Array.from(colors).sort().map((v) => ({ value: v, label: titleizeSlug(v) })));
    }

    loadFilters();

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

  useEffect(() => {
    let alive = true;

    async function loadProducts() {
      if (categorySlug && categoryIds === null) {
        setLoading(true);
        return;
      }

      if (categorySlug && categoryIds && categoryIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      if (!priceBounds && !userSetPrice) {
        setLoading(true);
        return;
      }

      setLoading(true);
      setErr(null);

      let q = supabase
        .from(VIEW_NAME)
        .select(
          "id,slug,name,min_price_cents,image_path,image_alt,created_at,status,collection_slugs,primary_category_id,material_slugs,stone_slugs,color_slugs,tag_slugs,available_qty"
        )
        .eq("status", "active");

      if (categorySlug && categoryIds && categoryIds.length > 0) q = q.in("primary_category_id", categoryIds);
      if (collectionSlug) q = q.contains("collection_slugs", [collectionSlug]);
      if (qText) q = q.ilike("name", `%${qText}%`);

      const min = userSetPrice ? effMin : priceBounds?.min ?? 0;
      const max = userSetPrice ? effMax : priceBounds?.max ?? 0;

      q = q.gte("min_price_cents", brlToCents(min)).lte("min_price_cents", brlToCents(max));

      if (selectedMaterial.length) q = q.overlaps("material_slugs", selectedMaterial);
      if (selectedPedra.length) q = q.overlaps("stone_slugs", selectedPedra);
      if (selectedCor.length) q = q.overlaps("color_slugs", selectedCor);

      if (sort === "price_asc") {
        q = q.order("min_price_cents", { ascending: true, nullsFirst: false });
      } else if (sort === "price_desc") {
        q = q.order("min_price_cents", { ascending: false, nullsFirst: false });
      } else {
        q = q.order("available_qty", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data, error } = await q;
      if (!alive) return;

      console.table(
        (data ?? []).map((p: any) => ({
          name: p.name,
          slug: p.slug,
          available_qty: p.available_qty,
          tipo: typeof p.available_qty,
        }))
      );

      if (error) {
        setErr(error.message);
        setProducts([]);
      } else {
        const rows = (data ?? []) as CatalogProduct[];
        const stockByProduct = await getRealStockByProduct(rows.map((item) => item.id));

        if (!alive) return;

        const normalizedRows = rows.map((item) => {
          const qtyFromView = normalizeAvailableQty(item.available_qty);
          const qtyFromRealStock = stockByProduct.get(item.id);

          return {
            ...item,
            available_qty:
              typeof qtyFromRealStock === "number"
                ? qtyFromRealStock
                : qtyFromView,
          };
        });

        setProducts(normalizedRows);
      }

      setLoading(false);
    }

    loadProducts();

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

  useEffect(() => {
    let alive = true;

    async function loadHeroImage() {
      if (!categorySlug) {
        if (alive) setHeroImage(imgUrl(products?.[0]?.image_path) ?? null);
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
      setHeroImage(error ? fallback : cover || fallback);
    }

    loadHeroImage();

    return () => {
      alive = false;
    };
  }, [categorySlug, products]);

  function setQueryParam(v: string) {
    const sp = new URLSearchParams(searchParams);
    const clean = v.trim();
    if (!clean) sp.delete("q");
    else sp.set("q", clean);
    setSearchParams(sp, { replace: true });
  }

  function toggleMulti(key: "material" | "pedra" | "cor", value: string) {
    const sp = new URLSearchParams(searchParams);
    const cur = sp.getAll(key);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    setMulti(sp, key, next);
    setSearchParams(sp, { replace: true });
  }

  function setSort(value: string) {
    const sp = new URLSearchParams(searchParams);
    if (!value || value === "relevance") sp.delete("sort");
    else sp.set("sort", value);
    setSearchParams(sp, { replace: true });
  }

  function setPriceParams(nextMin: number, nextMax: number) {
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
  }

  function clearAll() {
    const sp = new URLSearchParams(searchParams);
    ["material", "pedra", "cor", "min", "max", "sort", "q"].forEach((k) => sp.delete(k));
    setSearchParams(sp, { replace: true });
  }

  const appliedChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string; raw?: string }> = [];
    const findLabel = (opts: Option[], v: string) => opts.find((o) => o.value === v)?.label ?? titleizeSlug(v);

    selectedMaterial.forEach((v) => chips.push({ key: "material", label: "Material", value: findLabel(materialOptions, v), raw: v }));
    selectedPedra.forEach((v) => chips.push({ key: "pedra", label: "Pedra", value: findLabel(stoneOptions, v), raw: v }));
    selectedCor.forEach((v) => chips.push({ key: "cor", label: "Cor", value: findLabel(colorOptions, v), raw: v }));
    if (qText) chips.push({ key: "q", label: "Busca", value: qText });
    if (userSetPrice) chips.push({ key: "preco", label: "Preço", value: `${moneyBRL(effMin)} – ${moneyBRL(effMax)}` });
    return chips;
  }, [selectedMaterial, selectedPedra, selectedCor, materialOptions, stoneOptions, colorOptions, qText, userSetPrice, effMin, effMax]);

  function removeChip(chip: { key: string; value: string; label: string; raw?: string }) {
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
  }

  const total = products.length;

  const FiltersPanel = ({ compact }: { compact?: boolean }) => (
    <div className={compact ? "" : "sticky top-[176px]"}>
      <div className="rounded-[28px] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Filtros</div>
          <button type="button" onClick={clearAll} className="text-xs text-black/40 hover:text-black">Limpar</button>
        </div>

        <div className="mt-4 border-t border-black/10 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-black">Preço</div>
            <div className="text-xs text-black/45">{moneyBRL(effMin)} – {moneyBRL(effMax)}</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-black/45">Mín</label>
              <input
                type="number"
                value={effMin}
                min={0}
                onChange={(e) => setPriceParams(Number(e.target.value || 0), effMax)}
                className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-[#FCFAF6] px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label className="text-xs text-black/45">Máx</label>
              <input
                type="number"
                value={effMax}
                min={0}
                onChange={(e) => setPriceParams(effMin, Number(e.target.value || 0))}
                className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-[#FCFAF6] px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>
        </div>

        {([
          ["Material", "material", materialOptions, selectedMaterial] as const,
          ["Pedra", "pedra", stoneOptions, selectedPedra] as const,
          ["Cor", "cor", colorOptions, selectedCor] as const,
        ] as const).map(([title, key, opts, selected]) => (
          <div key={key} className="mt-4 border-t border-black/10 pt-4">
            <div className="mb-3 text-sm font-semibold text-black">{title}</div>

            {opts.length === 0 ? (
              <div className="text-sm text-black/45">Sem opções.</div>
            ) : (
              <div className="space-y-2">
                {opts.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                    <span className="text-black/75">{o.label}</span>
                    <input
                      type="checkbox"
                      checked={selected.includes(o.value)}
                      onChange={() => toggleMulti(key as any, o.value)}
                      className="h-4 w-4"
                      style={{ accentColor: CALEA.primary }}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {compact && (
          <button type="button" onClick={() => setMobileFiltersOpen(false)} className="mt-6 h-11 w-full rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: CALEA.primary }}>
            Aplicar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: CALEA.bg }}>
      <Header searchValue={qText} onSearchChange={setQueryParam} onSearchSubmit={setQueryParam} />

      <main className="pt-[160px] md:pt-[210px]">
        <section className="container mx-auto px-4 pt-4 md:px-6">
          <div className="overflow-hidden rounded-[32px] border border-black/10 bg-white/60 shadow-sm">
            <div className="relative h-[220px] md:h-[340px]">
              {heroImage ? <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 animate-pulse bg-black/5" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <div className="text-xs uppercase tracking-[0.18em] text-white/80">Joias • {pageTitle}</div>
                <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">{pageTitle}</h1>
                <div className="mt-3 h-[2px] w-20 rounded-full" style={{ backgroundColor: CALEA.accent }} />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto mt-8 px-4 pb-16 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm backdrop-blur transition hover:bg-black/5"
                    >
                      <span className="text-black/55">{c.label}:</span>
                      <span className="font-medium" style={{ color: CALEA.primary }}>{c.value}</span>
                      <X className="h-4 w-4 text-black/35" />
                    </button>
                  ))}

                  <button type="button" onClick={clearAll} className="ml-1 text-sm hover:underline" style={{ color: CALEA.accent }}>
                    Limpar tudo
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm md:hidden">
                <SlidersHorizontal className="h-4 w-4 text-black/60" />
                Filtros
              </button>

              <span className="hidden text-sm text-black/50 md:inline">Ordenar</span>

              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-11 appearance-none rounded-2xl border border-black/10 bg-white px-4 pr-10 text-sm outline-none"
                >
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/45" />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[290px_1fr]">
            <aside className="hidden md:block"><FiltersPanel /></aside>

            <div>
              {loading && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-[28px] border border-black/10 bg-white/60">
                      <div className="aspect-[4/5] animate-pulse bg-black/5" />
                      <div className="space-y-3 p-4">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-black/5" />
                        <div className="h-5 w-24 animate-pulse rounded bg-black/5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !err && products.length > 0 && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => {
                    const img = imgUrl(p.image_path);
                    const badge = pickBadge(p.tag_slugs);
                    const availableQty = normalizeAvailableQty(p.available_qty);
                    const isAvailable = availableQty > 0;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => navigate(`/produto/${p.slug}`)}
                        className="group overflow-hidden rounded-[28px] border border-black/10 bg-white/80 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(43,85,78,0.08)]"
                      >
                        <div className="relative">
                          {!isAvailable && (
                            <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b746b] shadow-sm">
                              Esgotado
                            </span>
                          )}

                          {badge && isAvailable && (
                            <span className="absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: CALEA.primary, color: "#F8F3EA" }}>
                              {badge}
                            </span>
                          )}

                          <div className="aspect-[4/5] bg-gradient-to-b from-black/5 to-black/0">
                            {img ? (
                              <img
                                src={img}
                                alt={p.image_alt ?? p.name}
                                className={["h-full w-full object-cover transition duration-500", isAvailable ? "group-hover:scale-[1.03]" : "opacity-70 grayscale-[15%]"].join(" ")}
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#f6f3ee] px-4 text-center text-xs text-[#8a8175]">Foto em breve</div>
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="min-h-[42px] line-clamp-2 text-[15px] font-semibold leading-5" style={{ color: CALEA.primary }}>{p.name}</div>
                          <div className="mt-2 text-lg font-semibold" style={{ color: CALEA.accent }}>{centsToBRL(p.min_price_cents)}</div>
                          {!isAvailable && (
                            <div className="mt-1 text-xs text-black/45">
                              Sem estoque
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            <span className="inline-flex h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold transition-all" style={{ backgroundColor: isAvailable ? CALEA.primary : "#d8d1c6", color: isAvailable ? "#ffffff" : "#7b746b" }}>
                              {isAvailable ? "Comprar" : "Indisponível"}
                            </span>

                            <span className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold" style={{ borderColor: `${CALEA.primary}22`, color: CALEA.primary }}>
                              Ver
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && !err && products.length === 0 && (
                <div className="rounded-[28px] border border-black/10 bg-white/70 p-10 text-center">
                  <p className="text-lg font-semibold" style={{ color: CALEA.primary }}>Nenhuma peça encontrada</p>
                  <p className="mt-2 text-sm text-black/50">Ajuste os filtros ou limpe a busca.</p>
                  <button type="button" onClick={clearAll} className="mt-5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: CALEA.primary }}>
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button type="button" aria-label="Fechar filtros" className="absolute inset-0 bg-black/35" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-[30px] bg-[#FCFAF6] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold" style={{ color: CALEA.primary }}>Filtrar catálogo</p>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="rounded-full bg-white p-2 shadow-sm">
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

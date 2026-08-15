import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal, ChevronDown, Heart } from "lucide-react";
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

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#FCFAF6",
};

const VIEW_NAME = "v_catalog_products_with_filters";
const STORAGE_BUCKET = "product-images";
const FAVORITES_KEY = "calea_favorites";

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

  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function moneyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function centsToBRL(cents?: number | null) {
  if (cents === null || cents === undefined) {
    return "Preço indisponível";
  }

  return moneyBRL(cents / 100);
}

function brlToCents(value: number) {
  return Math.max(0, Math.round(value * 100));
}

function parseNum(value: string | null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getMulti(searchParams: URLSearchParams, key: string) {
  return searchParams.getAll(key);
}

function setMulti(searchParams: URLSearchParams, key: string, values: string[]) {
  searchParams.delete(key);
  values.forEach((value) => searchParams.append(key, value));
}

function imgUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(cleanPath);

  return data.publicUrl;
}

function pickBadge(tagSlugs?: string[] | null) {
  const tags = tagSlugs ?? [];

  if (tags.includes("novo")) return "Novo";
  if (tags.includes("destaque")) return "Destaque";
  if (tags.includes("mais-vendido")) return "Mais vendido";

  return undefined;
}

function normalizeAvailableQty(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export default function JewelryListing() {
  const { categorySlug, collectionSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedMaterial = useMemo(
    () => getMulti(searchParams, "material"),
    [searchParams]
  );

  const selectedPedra = useMemo(
    () => getMulti(searchParams, "pedra"),
    [searchParams]
  );

  const selectedCor = useMemo(
    () => getMulti(searchParams, "cor"),
    [searchParams]
  );

  const sort = useMemo(
    () => searchParams.get("sort") ?? "relevance",
    [searchParams]
  );

  const qText = useMemo(
    () => (searchParams.get("q") ?? "").trim(),
    [searchParams]
  );

  const minFromUrl = useMemo(
    () => parseNum(searchParams.get("min")),
    [searchParams]
  );

  const maxFromUrl = useMemo(
    () => parseNum(searchParams.get("max")),
    [searchParams]
  );

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
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      setFavoriteIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];

      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("calea-favorites-updated"));
      return next;
    });
  }

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

      setCategoryIds([
        parentId,
        ...(children ?? []).map((child: any) => child.id),
      ]);
    }

    loadCategoryIds();

    return () => {
      alive = false;
    };
  }, [categorySlug]);

  useEffect(() => {
    let alive = true;

    function baseQuery() {
      let query = supabase
        .from(VIEW_NAME)
        .select(
          "min_price_cents,material_slugs,stone_slugs,color_slugs,primary_category_id,collection_slugs,available_qty"
        )
        .eq("status", "active");

      if (categorySlug && categoryIds && categoryIds.length > 0) {
        query = query.in("primary_category_id", categoryIds);
      }

      if (collectionSlug) {
        query = query.contains("collection_slugs", [collectionSlug]);
      }

      return query;
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
        baseQuery()
          .order("min_price_cents", { ascending: true, nullsFirst: false })
          .limit(1)
          .maybeSingle(),

        baseQuery()
          .order("min_price_cents", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),

        baseQuery().limit(1000),
      ]);

      if (!alive) return;

      const minCents = Number((minRes.data as any)?.min_price_cents ?? 0);
      const maxCents = Number((maxRes.data as any)?.min_price_cents ?? 0);

      setPriceBounds({
        min: Math.max(0, minCents / 100),
        max: Math.max(0, maxCents / 100),
      });

      if (rowsRes.error) {
        setMaterialOptions([]);
        setStoneOptions([]);
        setColorOptions([]);
        return;
      }

      const materials = new Set<string>();
      const stones = new Set<string>();
      const colors = new Set<string>();

      (rowsRes.data ?? []).forEach((row: any) => {
        (row.material_slugs ?? []).forEach((value: string) => materials.add(value));
        (row.stone_slugs ?? []).forEach((value: string) => stones.add(value));
        (row.color_slugs ?? []).forEach((value: string) => colors.add(value));
      });

      setMaterialOptions(
        Array.from(materials)
          .sort()
          .map((value) => ({ value, label: titleizeSlug(value) }))
      );

      setStoneOptions(
        Array.from(stones)
          .sort()
          .map((value) => ({ value, label: titleizeSlug(value) }))
      );

      setColorOptions(
        Array.from(colors)
          .sort()
          .map((value) => ({ value, label: titleizeSlug(value) }))
      );
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

      let query = supabase
        .from(VIEW_NAME)
        .select(
          "id,slug,name,min_price_cents,image_path,image_alt,created_at,status,collection_slugs,primary_category_id,material_slugs,stone_slugs,color_slugs,tag_slugs,available_qty"
        )
        .eq("status", "active");

      if (categorySlug && categoryIds && categoryIds.length > 0) {
        query = query.in("primary_category_id", categoryIds);
      }

      if (collectionSlug) {
        query = query.contains("collection_slugs", [collectionSlug]);
      }

      if (qText) {
        const safeQ = qText.replace(/[%_]/g, "\\$&");

        query = query.or(
          [
            `name.ilike.%${safeQ}%`,
            `slug.ilike.%${safeQ}%`,
          ].join(",")
        );
      }

      const min = userSetPrice ? effMin : priceBounds?.min ?? 0;
      const max = userSetPrice ? effMax : priceBounds?.max ?? 0;

      query = query
        .gte("min_price_cents", brlToCents(min))
        .lte("min_price_cents", brlToCents(max));

      if (selectedMaterial.length) {
        query = query.overlaps("material_slugs", selectedMaterial);
      }

      if (selectedPedra.length) {
        query = query.overlaps("stone_slugs", selectedPedra);
      }

      if (selectedCor.length) {
        query = query.overlaps("color_slugs", selectedCor);
      }

      if (sort === "price_asc") {
        query = query.order("min_price_cents", {
          ascending: true,
          nullsFirst: false,
        });
      } else if (sort === "price_desc") {
        query = query.order("min_price_cents", {
          ascending: false,
          nullsFirst: false,
        });
      } else {
        query = query
          .order("available_qty", { ascending: false })
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      const normalizedRows = ((data ?? []) as CatalogProduct[]).map((item) => ({
        ...item,
        available_qty: normalizeAvailableQty(item.available_qty),
      }));
      if (import.meta.env.DEV) {
        console.table(
          normalizedRows.map((product) => ({
            name: product.name,
            slug: product.slug,
            available_qty: product.available_qty,
            available: normalizeAvailableQty(product.available_qty) > 0,
          }))
        );
      }
      
      setProducts(normalizedRows);
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
        if (alive) {
          setHeroImage(imgUrl(products?.[0]?.image_path) ?? null);
        }
        return;
      }

      const { data, error } = await supabase
        .from("category_tree")
        .select("cover_image_path")
        .eq("slug", categorySlug)
        .maybeSingle();

      if (!alive) return;

      const cover = (data as any)?.cover_image_path
        ? imgUrl((data as any).cover_image_path)
        : null;

      const fallback = imgUrl(products?.[0]?.image_path) ?? null;

      setHeroImage(error ? fallback : cover || fallback);
    }

    loadHeroImage();

    return () => {
      alive = false;
    };
  }, [categorySlug, products]);

  function setQueryParam(value: string) {
    const nextParams = new URLSearchParams(searchParams);
    const cleanValue = value.trim();

    if (!cleanValue) nextParams.delete("q");
    else nextParams.set("q", cleanValue);

    setSearchParams(nextParams, { replace: true });
  }

  function toggleMulti(key: "material" | "pedra" | "cor", value: string) {
    const nextParams = new URLSearchParams(searchParams);
    const currentValues = nextParams.getAll(key);

    const nextValues = currentValues.includes(value)
      ? currentValues.filter((current) => current !== value)
      : [...currentValues, value];

    setMulti(nextParams, key, nextValues);
    setSearchParams(nextParams, { replace: true });
  }

  function setSort(value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (!value || value === "relevance") nextParams.delete("sort");
    else nextParams.set("sort", value);

    setSearchParams(nextParams, { replace: true });
  }

  function setPriceParams(nextMin: number, nextMax: number) {
    const nextParams = new URLSearchParams(searchParams);

    const boundMin = priceBounds?.min ?? 0;
    const boundMax = priceBounds?.max ?? 0;

    let min = Math.max(0, Number(nextMin) || 0);
    let max = Math.max(0, Number(nextMax) || 0);

    if (max < min) max = min;

    const isDefault =
      Math.abs(min - boundMin) < 0.0001 &&
      Math.abs(max - boundMax) < 0.0001;

    if (isDefault) {
      nextParams.delete("min");
      nextParams.delete("max");
    } else {
      nextParams.set("min", String(min));
      nextParams.set("max", String(max));
    }

    setSearchParams(nextParams, { replace: true });
  }

  function clearAll() {
    const nextParams = new URLSearchParams(searchParams);

    ["material", "pedra", "cor", "min", "max", "sort", "q"].forEach((key) => {
      nextParams.delete(key);
    });

    setSearchParams(nextParams, { replace: true });
  }

  const appliedChips = useMemo(() => {
    const chips: Array<{
      key: string;
      label: string;
      value: string;
      raw?: string;
    }> = [];

    const findLabel = (options: Option[], value: string) =>
      options.find((option) => option.value === value)?.label ?? titleizeSlug(value);

    selectedMaterial.forEach((value) => {
      chips.push({
        key: "material",
        label: "Material",
        value: findLabel(materialOptions, value),
        raw: value,
      });
    });

    selectedPedra.forEach((value) => {
      chips.push({
        key: "pedra",
        label: "Pedra",
        value: findLabel(stoneOptions, value),
        raw: value,
      });
    });

    selectedCor.forEach((value) => {
      chips.push({
        key: "cor",
        label: "Cor",
        value: findLabel(colorOptions, value),
        raw: value,
      });
    });

    if (qText) {
      chips.push({
        key: "q",
        label: "Busca",
        value: qText,
      });
    }

    if (userSetPrice) {
      chips.push({
        key: "preco",
        label: "Preço",
        value: `${moneyBRL(effMin)} – ${moneyBRL(effMax)}`,
      });
    }

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

  function removeChip(chip: { key: string; value: string; label: string; raw?: string }) {
    const nextParams = new URLSearchParams(searchParams);

    if (chip.key === "preco") {
      nextParams.delete("min");
      nextParams.delete("max");
    } else if (chip.key === "q") {
      nextParams.delete("q");
    } else {
      const allValues = nextParams.getAll(chip.key);
      const nextValues = allValues.filter((value) => value !== (chip.raw ?? chip.value));

      setMulti(nextParams, chip.key, nextValues);
    }

    setSearchParams(nextParams, { replace: true });
  }

  const total = products.length;

  const FiltersPanel = ({ compact }: { compact?: boolean }) => (
    <div className={compact ? "" : "sticky top-[150px]"}>
      <div className={compact ? "" : "border-t border-[#2b554e]/12"}>
        <div className="flex items-center justify-between border-b border-[#2b554e]/12 py-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2b554e]">
            Filtrar por
          </div>

          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] text-[#8b8176] transition hover:text-[#2b554e]"
          >
            Limpar
          </button>
        </div>

        <div className="border-b border-[#2b554e]/12 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14px] font-medium text-[#2b554e]">Preço</div>
            <div className="text-[12px] text-[#8b8176]">
              {moneyBRL(effMin)} – {moneyBRL(effMax)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8b8176]">Mín</label>
              <input
                type="number"
                value={effMin}
                min={0}
                onChange={(event) => setPriceParams(Number(event.target.value || 0), effMax)}
                className="mt-2 h-11 w-full border border-[#2b554e]/15 bg-transparent px-3 text-[14px] text-[#2b554e] outline-none transition focus:border-[#2b554e]"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8b8176]">Máx</label>
              <input
                type="number"
                value={effMax}
                min={0}
                onChange={(event) => setPriceParams(effMin, Number(event.target.value || 0))}
                className="mt-2 h-11 w-full border border-[#2b554e]/15 bg-transparent px-3 text-[14px] text-[#2b554e] outline-none transition focus:border-[#2b554e]"
              />
            </div>
          </div>
        </div>

        {([
          ["Material", "material", materialOptions, selectedMaterial] as const,
          ["Pedra", "pedra", stoneOptions, selectedPedra] as const,
          ["Cor", "cor", colorOptions, selectedCor] as const,
        ] as const).map(([title, key, options, selected]) => (
          <div key={key} className="border-b border-[#2b554e]/12 py-5">
            <div className="mb-3 text-[14px] font-medium text-[#2b554e]">{title}</div>

            {options.length === 0 ? (
              <div className="text-[13px] text-[#8b8176]">Sem opções.</div>
            ) : (
              <div className="space-y-2">
                {options.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center justify-between gap-3 py-1 text-[14px]"
                  >
                    <span className="text-[#5f5b57]">{option.label}</span>

                    <input
                      type="checkbox"
                      checked={selected.includes(option.value)}
                      onChange={() => toggleMulti(key, option.value)}
                      className="h-4 w-4 rounded-none"
                      style={{ accentColor: CALEA.primary }}
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
            className="mt-6 h-12 w-full text-[12px] font-semibold uppercase tracking-[0.16em] text-white"
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
      <Header
        searchValue={qText}
        onSearchChange={setQueryParam}
        onSearchSubmit={setQueryParam}
      />

      <main className="pt-[92px] md:pt-[108px]">
        <section className="container mx-auto px-4 pt-0 md:px-6">
          <div className="overflow-hidden border border-black/10 bg-white/60 shadow-sm">
            <div className="relative h-[220px] md:h-[340px]">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 animate-pulse bg-black/5" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <div className="text-xs uppercase tracking-[0.18em] text-white/80">
                  Joias • {pageTitle}
                </div>

                <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">
                  {pageTitle}
                </h1>

                <div
                  className="mt-3 h-[2px] w-20 rounded-full"
                  style={{ backgroundColor: CALEA.accent }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto mt-8 px-4 pb-16 md:px-6">
          <div className="flex flex-col gap-5 border-b border-[#2b554e]/10 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[13px] text-[#7a736b]">
                {loading ? "Carregando..." : `${total} peça(s)`}

                {err ? (
                  <span className="ml-2 text-red-600">Erro: {err}</span>
                ) : null}
              </div>

              {appliedChips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {appliedChips.map((chip, index) => (
                    <button
                      key={`${chip.key}-${index}`}
                      type="button"
                      onClick={() => removeChip(chip)}
                      className="inline-flex items-center gap-2 border border-[#2b554e]/12 bg-transparent px-3 py-2 text-[12px] transition hover:border-[#2b554e]/30"
                    >
                      <span className="text-[#8b8176]">{chip.label}:</span>

                      <span className="font-medium" style={{ color: CALEA.primary }}>
                        {chip.value}
                      </span>

                      <X className="h-3.5 w-3.5 text-[#8b8176]" />
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={clearAll}
                    className="ml-1 text-[12px] hover:underline"
                    style={{ color: CALEA.accent }}
                  >
                    Limpar tudo
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex h-11 items-center gap-2 border border-[#2b554e]/15 bg-transparent px-4 text-[13px] text-[#2b554e] md:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 text-black/60" />
                Filtros
              </button>

              <div className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-[#8b8176] md:block">
                Ordenar por
              </div>

              <div className="relative min-w-[180px]">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-11 w-full appearance-none border-0 border-b border-[#2b554e]/20 bg-transparent px-0 pr-8 text-[14px] font-medium text-[#2b554e] outline-none transition focus:border-[#2b554e]"
                >
                  {SORTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2b554e]/55" />
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] xl:gap-10">
            <aside className="hidden md:block">
              <FiltersPanel />
            </aside>

            <div>
              {loading && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className=""
                    >
                      <div className="aspect-[3/4] animate-pulse bg-[#eee7dc]" />

                      <div className="space-y-2 pt-3">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-black/5" />
                        <div className="h-5 w-24 animate-pulse rounded bg-black/5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !err && products.length > 0 && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => {
                    const img = imgUrl(product.image_path);
                    const badge = pickBadge(product.tag_slugs);
                    const availableQty = normalizeAvailableQty(product.available_qty);
                    const isAvailable = availableQty > 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => navigate(`/produto/${product.slug}`)}
                        className="group min-w-0 text-left"
                      >
                        <div className="relative">
                          {!isAvailable && (
                            <span className="absolute left-3 top-3 z-10 bg-[#FCFAF6]/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f675e] backdrop-blur-sm">
                              Esgotado
                            </span>
                          )}

                          {badge && isAvailable && (
                            <span
                              className="absolute left-3 top-3 z-10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                              style={{
                                backgroundColor: CALEA.primary,
                                color: "#F8F3EA",
                              }}
                            >
                              {badge}
                            </span>
                          )}

                          <div className="aspect-[3/4] overflow-hidden bg-[#f3efe8]">
                            {img ? (
                              <img
                                src={img}
                                alt={product.image_alt ?? product.name}
                                className={[
                                  "h-full w-full object-cover transition-transform duration-700 ease-out",
                                  isAvailable
                                    ? "group-hover:scale-[1.025]"
                                    : "opacity-70 grayscale-[15%]",
                                ].join(" ")}
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#f6f3ee] px-4 text-center text-xs text-[#8a8175]">
                                Foto em breve
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            aria-label={
                              favoriteIds.includes(product.id)
                                ? `Remover ${product.name} dos favoritos`
                                : `Favoritar ${product.name}`
                            }
                            aria-pressed={favoriteIds.includes(product.id)}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(product.id);
                            }}
                            className={[
                              "absolute bottom-3 left-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full",
                              "shadow-sm backdrop-blur-sm transition duration-200 hover:scale-105",
                              favoriteIds.includes(product.id)
                                ? "bg-[#173a35] text-white"
                                : "bg-[#FCFAF6]/90 text-[#173a35] hover:bg-white",
                            ].join(" ")}
                          >
                            <Heart
                              className="h-[19px] w-[19px]"
                              strokeWidth={1.5}
                              fill={
                                favoriteIds.includes(product.id)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        </div>
                        <div className="pt-3 pb-1">
                          <h3 className="truncate text-[15px] font-normal leading-snug text-[#2b2b2b] md:text-[16px]">
                            {product.name}
                          </h3>

                          <div className="mt-2 text-[16px] font-semibold leading-none text-[#173a35] md:text-[17px]">
                            {product.min_price_cents !== null &&
                            product.min_price_cents !== undefined
                              ? centsToBRL(product.min_price_cents)
                              : centsToBRL(product.min_price_cents)}
                          </div>

                          {product.min_price_cents !== null &&
                            product.min_price_cents !== undefined && (
                              <div className="mt-1.5 text-[13px] text-[#6e6a64]">
                                6x de {moneyBRL((product.min_price_cents / 100) / 6)} sem juros
                              </div>
                            )}

                          {!isAvailable && (
                            <div className="mt-1.5 text-[12px] text-[#8b8176]">
                              Sem estoque
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && !err && products.length === 0 && (
                <div className="rounded-[28px] border border-black/10 bg-white/70 p-10 text-center">
                  <p
                    className="text-lg font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Nenhuma peça encontrada
                  </p>

                  <p className="mt-2 text-sm text-black/50">
                    Ajuste os filtros ou limpe a busca.
                  </p>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="mt-5 rounded-full px-6 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: CALEA.primary }}
                  >
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
          <button
            type="button"
            aria-label="Fechar filtros"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileFiltersOpen(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-auto bg-[#FCFAF6] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p
                className="text-base font-semibold"
                style={{ color: CALEA.primary }}
              >
                Filtrar catálogo
              </p>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="border border-[#2b554e]/10 bg-transparent p-2"
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
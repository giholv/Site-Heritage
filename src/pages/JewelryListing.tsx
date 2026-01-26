// JewelryListing.tsx (mesmo arquivo) — só layout/UX
import React, { useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { X, SlidersHorizontal, ChevronDown, ShoppingBag } from "lucide-react";

type Option = { label: string; value: string };

const FILTERS = {
  material: [
    { label: "Prata 925", value: "prata925" },
    { label: "Banho Ouro", value: "banho-ouro" },
    { label: "Aço", value: "aco" },
  ] as Option[],
  pedra: [
    { label: "Zircônia", value: "zirconia" },
    { label: "Pérola", value: "perola" },
    { label: "Cristal", value: "cristal" },
  ] as Option[],
  cor: [
    { label: "Dourado", value: "dourado" },
    { label: "Prata", value: "prata" },
    { label: "Rosé", value: "rose" },
  ] as Option[],
};

const SORTS: Option[] = [
  { label: "Relevância", value: "relevance" },
  { label: "Menor preço", value: "price_asc" },
  { label: "Maior preço", value: "price_desc" },
  { label: "Novidades", value: "new" },
];

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

/** Mock só pra layout */
const mockProducts = Array.from({ length: 24 }).map((_, i) => ({
  id: String(i + 1),
  slug: `produto-${i + 1}`,
  title: `Joia Caléa ${i + 1}`,
  price: 149.9 + i,
  tag: i % 7 === 0 ? "Novo" : i % 5 === 0 ? "Mais vendido" : undefined,
}));

export default function JewelryListing() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedMaterial = useMemo(
    () => getMulti(searchParams, "material"),
    [searchParams]
  );
  const selectedPedra = useMemo(() => getMulti(searchParams, "pedra"), [searchParams]);
  const selectedCor = useMemo(() => getMulti(searchParams, "cor"), [searchParams]);

  const minPrice = useMemo(() => parsePrice(searchParams.get("min"), 0), [searchParams]);
  const maxPrice = useMemo(() => parsePrice(searchParams.get("max"), 9999), [searchParams]);

  const sort = useMemo(() => searchParams.get("sort") ?? "relevance", [searchParams]);

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

    const tag = searchParams.get("tag");
    if (tag) chips.push({ key: "tag", label: "Tag", value: tag });

    return chips;
  }, [searchParams, selectedMaterial, selectedPedra, selectedCor, minPrice, maxPrice]);

  const products = useMemo(() => {
    // depois você pluga Supabase e filtra de verdade
    return mockProducts;
  }, []);

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
    } else if (chip.key === "tag") {
      sp.delete("tag");
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
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-black/50 hover:text-black"
          >
            Limpar
          </button>
        </div>

        {/* Preço */}
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

        {/* bloco genérico checkbox */}
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
                <label
                  key={o.value}
                  className="flex items-center justify-between gap-3 text-sm cursor-pointer"
                >
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
            <div className="text-xs tracking-[0.18em] text-black/45 uppercase">
              Joias • {titleize(slug)}
            </div>

            <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-[#2b554e]">
              {titleize(slug)}
            </h1>

            <div className="mt-3 h-[2px] w-20 bg-[#b08d57] rounded-full" />

            <div className="mt-3 text-sm text-black/55">
              {total} peças selecionadas
            </div>
          </div>

          {/* ordenar (desktop) */}
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

            <button
              type="button"
              onClick={clearAll}
              className="ml-1 text-sm text-[#b08d57] hover:underline"
            >
              Limpar tudo
            </button>
          </div>
        )}

        {/* layout */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* sidebar filtros (desktop) */}
          <div className="hidden md:block">
            <FiltersPanel />
          </div>

          {/* lista */}
          <div>
            {/* mobile: barra de ações */}
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

            {/* grid produtos — cara de Caléa */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/produto/${p.slug}?from=${encodeURIComponent(slug ?? "")}`)}
                  className="text-left group rounded-3xl bg-white/80 backdrop-blur border border-black/10 overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <div className="relative">
                    {/* placeholder da foto */}
                    <div className="aspect-[4/5] bg-gradient-to-b from-black/5 to-black/0" />

                    {/* tag */}
                    {p.tag && (
                      <span className="absolute top-3 left-3 text-xs font-semibold bg-[#2b554e] text-[#F8F3EA] px-3 py-1 rounded-full">
                        {p.tag}
                      </span>
                    )}

                    {/* brilho sutil */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
                      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#b08d57]/10 blur-2xl" />
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-sm font-semibold text-[#2b554e] line-clamp-1">
                      {p.title}
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[#b08d57]">
                      {moneyBRL(p.price)}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 text-xs text-black/55">
                        Elegante • atemporal
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <span className="flex-1 h-10 inline-flex items-center justify-center rounded-2xl bg-[#2b554e] text-white text-sm font-semibold group-hover:opacity-95 transition">
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Adicionar
                      </span>

                      <span className="h-10 px-4 inline-flex items-center justify-center rounded-2xl border border-[#2b554e]/15 text-[#2b554e] text-sm font-semibold group-hover:border-[#b08d57]/35 group-hover:text-[#b08d57] transition">
                        Ver
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* drawer filtros (mobile) */}
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

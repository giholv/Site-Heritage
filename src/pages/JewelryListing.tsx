import React, { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";

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

/** Mock só pra layout */
const mockProducts = Array.from({ length: 24 }).map((_, i) => ({
  id: String(i + 1),
  title: `Produto ${i + 1}`,
  price: 149.9 + i,
}));

export default function JewelryListing() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // estado UI
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // leitura da URL -> estado derivado
  const selectedMaterial = useMemo(() => getMulti(searchParams, "material"), [searchParams]);
  const selectedPedra = useMemo(() => getMulti(searchParams, "pedra"), [searchParams]);
  const selectedCor = useMemo(() => getMulti(searchParams, "cor"), [searchParams]);

  const minPrice = useMemo(() => parsePrice(searchParams.get("min"), 0), [searchParams]);
  const maxPrice = useMemo(() => parsePrice(searchParams.get("max"), 9999), [searchParams]);

  const sort = useMemo(() => searchParams.get("sort") ?? "relevance", [searchParams]);

  const appliedChips = useMemo(() => {
    const chips: { key: string; label: string; value: string }[] = [];

    selectedMaterial.forEach((v) => {
      const opt = FILTERS.material.find((o) => o.value === v);
      chips.push({ key: "material", label: "Material", value: opt?.label ?? v });
    });

    selectedPedra.forEach((v) => {
      const opt = FILTERS.pedra.find((o) => o.value === v);
      chips.push({ key: "pedra", label: "Pedra", value: opt?.label ?? v });
    });

    selectedCor.forEach((v) => {
      const opt = FILTERS.cor.find((o) => o.value === v);
      chips.push({ key: "cor", label: "Cor", value: opt?.label ?? v });
    });

    if (searchParams.get("min") || searchParams.get("max")) {
      chips.push({
        key: "preco",
        label: "Preço",
        value: `R$ ${minPrice} – R$ ${maxPrice}`,
      });
    }

    // qualquer outra tag passada (ex: ?tag=lancamento)
    const tag = searchParams.get("tag");
    if (tag) chips.push({ key: "tag", label: "Tag", value: tag });

    return chips;
  }, [searchParams, selectedMaterial, selectedPedra, selectedCor, minPrice, maxPrice]);

  const products = useMemo(() => {
    // Aqui você pluga seus produtos reais + filtra com base nos params.
    // Por enquanto só retorna mock.
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

    // mantém slug como rota, limpa filtros conhecidos
    ["material", "pedra", "cor", "min", "max", "sort"].forEach((k) => sp.delete(k));

    // se você quiser manter tag=lancamento, NÃO delete tag
    // sp.delete("tag");

    setSearchParams(sp, { replace: true });
  };

  const removeChip = (chip: { key: string; value: string; label: string }) => {
    const sp = new URLSearchParams(searchParams);

    if (chip.key === "preco") {
      sp.delete("min");
      sp.delete("max");
    } else if (chip.key === "tag") {
      sp.delete("tag");
    } else {
      // material/pedra/cor (remover um valor)
      const all = sp.getAll(chip.key);
      // achar pelo value "real" (aqui usamos label no chip, então remove por label não dá)
      // solução: remover por qualquer item que bate no label OU valor (mais simples pro seu caso atual)
      const next = all.filter((v) => {
        const opt =
          chip.key === "material"
            ? FILTERS.material.find((o) => o.value === v)?.label
            : chip.key === "pedra"
            ? FILTERS.pedra.find((o) => o.value === v)?.label
            : FILTERS.cor.find((o) => o.value === v)?.label;

        return opt !== chip.value && v !== chip.value;
      });
      setMulti(sp, chip.key as any, next);
    }

    setSearchParams(sp, { replace: true });
  };

  const FiltersPanel = ({ compact }: { compact?: boolean }) => (
    <div className={compact ? "" : "sticky top-[160px]"}>
      <div className="bg-white border border-black/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-[#2b554e]">Filtros</div>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-black/60 hover:text-black"
          >
            Limpar
          </button>
        </div>

        {/* Preço */}
        <div className="border-t border-black/10 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-black">Preço</div>
            <span className="text-xs text-black/60">R$ {minPrice} – {maxPrice}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-black/60">Mín</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setPrice(Number(e.target.value || 0), maxPrice)}
                className="mt-1 w-full h-10 rounded-xl border border-black/10 px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-black/60">Máx</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setPrice(minPrice, Number(e.target.value || 9999))}
                className="mt-1 w-full h-10 rounded-xl border border-black/10 px-3 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Material */}
        <div className="border-t border-black/10 pt-4 mt-4">
          <div className="text-sm font-medium text-black mb-2">Material</div>
          <div className="space-y-2">
            {FILTERS.material.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedMaterial.includes(o.value)}
                  onChange={() => toggleMulti("material", o.value)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Pedra */}
        <div className="border-t border-black/10 pt-4 mt-4">
          <div className="text-sm font-medium text-black mb-2">Pedra</div>
          <div className="space-y-2">
            {FILTERS.pedra.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPedra.includes(o.value)}
                  onChange={() => toggleMulti("pedra", o.value)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div className="border-t border-black/10 pt-4 mt-4">
          <div className="text-sm font-medium text-black mb-2">Cor</div>
          <div className="space-y-2">
            {FILTERS.cor.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCor.includes(o.value)}
                  onChange={() => toggleMulti("cor", o.value)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* CTA (mobile) */}
        {compact && (
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="mt-5 w-full h-11 rounded-xl bg-[#2b554e] text-white text-sm font-medium"
          >
            Aplicar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-[#FCFAF6] pt-[140px] md:pt-[180px]">
      <div className="container mx-auto px-4 md:px-6">
        {/* topo */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-black/50">Joias &gt; {titleize(slug)}</div>
            <h1 className="mt-2 text-2xl font-semibold text-black">{titleize(slug)}</h1>
            <div className="mt-1 text-sm text-black/60">Exibindo {total} produtos</div>
          </div>

          {/* ordenar (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-black/60">Ordenar:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => {
                  const sp = new URLSearchParams(searchParams);
                  sp.set("sort", e.target.value);
                  setSearchParams(sp, { replace: true });
                }}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 pr-10 text-sm"
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
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {appliedChips.map((c, i) => (
              <button
                key={`${c.key}-${i}`}
                type="button"
                onClick={() => removeChip(c)}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
              >
                <span className="text-black/70">{c.label}:</span>
                <span className="font-medium">{c.value}</span>
                <X className="h-4 w-4 text-black/40" />
              </button>
            ))}

            <button
              type="button"
              onClick={clearAll}
              className="ml-1 text-sm text-[#2b554e] hover:underline"
            >
              Limpar tudo
            </button>
          </div>
        )}

        {/* layout */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* sidebar filtros (desktop) */}
          <div className="hidden md:block">
            <FiltersPanel />
          </div>

          {/* lista */}
          <div>
            {/* mobile: barra de ações */}
            <div className="md:hidden flex items-center justify-between gap-3 mb-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="h-11 px-4 rounded-xl bg-white border border-black/10 text-sm inline-flex items-center gap-2"
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
                  className="w-full h-11 rounded-xl border border-black/10 bg-white px-3 pr-10 text-sm"
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

            {/* grid produtos */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white border border-black/10 overflow-hidden">
                  <div className="h-[220px] bg-black/5" />
                  <div className="p-3">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-sm text-black/70 mt-1">R$ {p.price.toFixed(2)}</div>
                  </div>
                </div>
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

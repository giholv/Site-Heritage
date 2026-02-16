
    import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Metrics = {
  products: number;
  skus: number;
};

export default function AdminDashboard() {
  const [m, setM] = useState<Metrics>({ products: 0, skus: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [{ count: productsCount }, { count: skusCount }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("skus").select("id", { count: "exact", head: true }),
      ]);

      setM({
        products: productsCount ?? 0,
        skus: skusCount ?? 0,
      });

      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      {loading ? (
        <div>Carregando métricas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border p-5">
            <div className="text-sm text-gray-500">Produtos</div>
            <div className="text-3xl font-semibold">{m.products}</div>
          </div>

          <div className="rounded-2xl bg-white border p-5">
            <div className="text-sm text-gray-500">SKUs</div>
            <div className="text-3xl font-semibold">{m.skus}</div>
          </div>
        </div>
      )}
    </div>
  );
}

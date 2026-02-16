import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};

export default function AdminProducts() {
  const nav = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,status,created_at")
      .order("created_at", { ascending: false });

    if (error) setErr(error.message);
    setItems((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Produtos</h1>

        <button
          onClick={() => nav("/admin/produtos/novo")}
          className="rounded-xl bg-[#2b554e] text-white px-4 py-2 hover:opacity-95"
        >
          Novo produto
        </button>
      </div>

      {loading && <div>Carregando...</div>}
      {err && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="rounded-2xl bg-white border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-gray-500 border-b">
          <div className="col-span-5">Nome</div>
          <div className="col-span-3">Slug</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {items.length === 0 && !loading ? (
          <div className="p-6 text-sm text-gray-600">Nenhum produto cadastrado.</div>
        ) : (
          items.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b">
              <div className="col-span-5 font-medium text-gray-900">{p.name}</div>
              <div className="col-span-3 text-gray-600">{p.slug}</div>
              <div className="col-span-2 text-gray-700">{p.status}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  onClick={() => nav(`/admin/produtos/${p.id}`)}
                  className="text-sm underline text-[#2b554e]"
                >
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={load}
        className="mt-4 text-sm underline text-gray-600 hover:text-gray-800"
      >
        Recarregar
      </button>
    </div>
  );
}

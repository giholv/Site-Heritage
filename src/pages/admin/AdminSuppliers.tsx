import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase"; // ajuste o path

type SupplierType = {
  id: string;
  name: string;
  slug: string;
  code_prefix: string;
  active: boolean;
  position: number;
};

type Supplier = {
  id: string;
  supplier_type_id: string;
  name: string;
  code: string;
  cnpj: string | null;
  corporate_name: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  state_registration: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
  created_at: string;
};

type SupplierFormState = {
  id?: string;
  supplier_type_id: string;
  name: string;
  cnpj: string;
  corporate_name: string;
  email: string;
  phone: string;
  contact_name: string;
  state_registration: string;
  city: string;
  state: string;
  active: boolean;
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function normalizeUF(v: string) {
  const s = (v || "").trim().toUpperCase();
  return s.slice(0, 2);
}

function emptyForm(defaultTypeId: string): SupplierFormState {
  return {
    supplier_type_id: defaultTypeId,
    name: "",
    cnpj: "",
    corporate_name: "",
    email: "",
    phone: "",
    contact_name: "",
    state_registration: "",
    city: "",
    state: "",
    active: true,
  };
}

export default function AdminSuppliersPage() {
  const [types, setTypes] = useState<SupplierType[]>([]);
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<SupplierFormState | null>(null);

  const typeMap = useMemo(() => {
    const m = new Map<string, SupplierType>();
    types.forEach((t) => m.set(t.id, t));
    return m;
  }, [types]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const typeName = typeMap.get(r.supplier_type_id)?.name ?? "";
      return (
        r.name.toLowerCase().includes(s) ||
        r.code.toLowerCase().includes(s) ||
        (r.cnpj ?? "").toLowerCase().includes(s) ||
        (r.email ?? "").toLowerCase().includes(s) ||
        typeName.toLowerCase().includes(s)
      );
    });
  }, [rows, q, typeMap]);

  async function loadAll() {
    setLoading(true);

    const { data: tData, error: tErr } = await supabase
      .from("supplier_types")
      .select("id,name,slug,code_prefix,active,position")
      .eq("active", true)
      .order("position", { ascending: true });

    if (tErr) {
      alert(tErr.message);
      setLoading(false);
      return;
    }

    const typesList = (tData ?? []) as SupplierType[];
    setTypes(typesList);

    const { data: sData, error: sErr } = await supabase
      .from("suppliers")
      .select(
        "id,supplier_type_id,name,code,cnpj,corporate_name,email,phone,contact_name,state_registration,city,state,active,created_at"
      )
      .order("created_at", { ascending: false });

    if (sErr) {
      alert(sErr.message);
      setLoading(false);
      return;
    }

    setRows((sData ?? []) as Supplier[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function openCreate() {
    const defaultTypeId = types[0]?.id ?? "";
    setForm(emptyForm(defaultTypeId));
    setDrawerOpen(true);
  }

  function openEdit(r: Supplier) {
    setForm({
      id: r.id,
      supplier_type_id: r.supplier_type_id,
      name: r.name ?? "",
      cnpj: r.cnpj ?? "",
      corporate_name: r.corporate_name ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      contact_name: r.contact_name ?? "",
      state_registration: r.state_registration ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
      active: !!r.active,
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(null);
  }

  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    const payload = {
      supplier_type_id: form.supplier_type_id,
      name: form.name.trim(),
      cnpj: form.cnpj ? onlyDigits(form.cnpj) : null,
      corporate_name: form.corporate_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      contact_name: form.contact_name.trim() || null,
      state_registration: form.state_registration.trim() || null,
      city: form.city.trim() || null,
      state: form.state ? normalizeUF(form.state) : null,
      active: !!form.active,
    };

    if (!payload.supplier_type_id) return alert("Selecione o tipo.");
    if (!payload.name) return alert("Informe o nome do fornecedor.");
    if (payload.cnpj && payload.cnpj.length !== 14) return alert("CNPJ precisa ter 14 dígitos (somente números).");
    if (payload.state && payload.state.length !== 2) return alert("UF inválida (ex: SP).");

    setSaving(true);

    try {
      if (form.id) {
        const { data, error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", form.id)
          .select(
            "id,supplier_type_id,name,code,cnpj,corporate_name,email,phone,contact_name,state_registration,city,state,active,created_at"
          )
          .single();

        if (error) throw error;

        setRows((prev) => prev.map((x) => (x.id === form.id ? (data as Supplier) : x)));
        closeDrawer();
      } else {
        // IMPORTANT: não envia "code" -> DB gera automaticamente
        const { data, error } = await supabase
          .from("suppliers")
          .insert(payload)
          .select(
            "id,supplier_type_id,name,code,cnpj,corporate_name,email,phone,contact_name,state_registration,city,state,active,created_at"
          )
          .single();

        if (error) throw error;

        setRows((prev) => [data as Supplier, ...prev]);
        closeDrawer();
      }
    } catch (err: any) {
      alert(err?.message ?? "Erro ao salvar fornecedor");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: Supplier) {
    const next = !r.active;
    const { error } = await supabase.from("suppliers").update({ active: next }).eq("id", r.id);
    if (error) return alert(error.message);
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: next } : x)));
  }

  async function deleteSupplier(r: Supplier) {
    if (!confirm(`Excluir fornecedor "${r.name}"?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", r.id);
    if (error) return alert(error.message);
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fornecedores</h1>
          <p className="text-sm text-gray-500">
            Cadastro de fornecedores
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadAll()}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Recarregar
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            Novo fornecedor
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, código, tipo, CNPJ, email..."
          className="w-full px-4 py-2 rounded-xl border"
        />
      </div>

      <div className="mt-4 rounded-2xl border overflow-hidden bg-white">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Código</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">CNPJ</th>
                <th className="p-3">Ativo</th>
                <th className="p-3 w-[220px]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const typeName = typeMap.get(r.supplier_type_id)?.name ?? "—";
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-mono">{r.code}</td>
                    <td className="p-3">{r.name}</td>
                    <td className="p-3">{typeName}</td>
                    <td className="p-3">{r.cnpj ?? "—"}</td>
                    <td className="p-3">{r.active ? "Sim" : "Não"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActive(r)}
                          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                        >
                          {r.active ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          onClick={() => deleteSupplier(r)}
                          className="px-3 py-1.5 rounded-lg border text-red-600 hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filtered.length && (
                <tr className="border-t">
                  <td className="p-6 text-gray-500" colSpan={6}>
                    Nada encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && form && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {form.id ? "Editar fornecedor" : "Novo fornecedor"}
              </h2>
              <button onClick={closeDrawer} className="px-3 py-2 rounded-lg border">
                Fechar
              </button>
            </div>

            <form onSubmit={saveSupplier} className="mt-4 grid gap-3">
              <div className="grid gap-1">
                <label className="text-xs text-gray-600">Tipo</label>
                <select
                  value={form.supplier_type_id}
                  onChange={(e) => setForm((f) => (f ? { ...f, supplier_type_id: e.target.value } : f))}
                  className="px-3 py-2 rounded-xl border"
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-xs text-gray-600">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className="px-3 py-2 rounded-xl border"
                  placeholder="Ex: Fornecedor ABC"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">CNPJ (opcional)</label>
                  <input
                    value={form.cnpj}
                    onChange={(e) => setForm((f) => (f ? { ...f, cnpj: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                    placeholder="Só números"
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Razão social (opcional)</label>
                  <input
                    value={form.corporate_name}
                    onChange={(e) => setForm((f) => (f ? { ...f, corporate_name: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Telefone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Contato</label>
                  <input
                    value={form.contact_name}
                    onChange={(e) => setForm((f) => (f ? { ...f, contact_name: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Inscrição estadual</label>
                  <input
                    value={form.state_registration}
                    onChange={(e) => setForm((f) => (f ? { ...f, state_registration: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Cidade</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => (f ? { ...f, city: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">UF</label>
                  <input
                    value={form.state}
                    onChange={(e) => setForm((f) => (f ? { ...f, state: e.target.value } : f))}
                    className="px-3 py-2 rounded-xl border"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm mt-1">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => (f ? { ...f, active: e.target.checked } : f))}
                />
                Ativo
              </label>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded-xl border"
                >
                  Cancelar
                </button>
              </div>


            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { Link, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-[#2b554e] text-white p-6 space-y-4">
        <h2 className="text-xl font-semibold">Painel Caléa</h2>

        <nav className="space-y-2">
          <Link to="/admin" className="block hover:underline">Dashboard</Link>
          <Link to="/admin/produtos" className="block hover:underline">Produtos</Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

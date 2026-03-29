import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
};

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 13l-7 7-11-11V2h7l11 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7.5 7.5h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7h11v10H3V7Zm11 3h4l3 3v4h-7v-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm12 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconBoxes() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 4 7l8 4 8-4-8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M4 7v10l8 4 8-4V7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 11v10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: <IconGrid />, end: true },
  { to: "/admin/produtos", label: "Produtos", icon: <IconTag /> },
  { to: "/admin/estoques", label: "Estoques", icon: <IconBoxes /> },
  { to: "/admin/fornecedores", label: "Fornecedores", icon: <IconTruck /> },
  { to: "/admin/clientes", label: "Clientes", icon: <IconUsers /> },
  { to: "/admin/catalogo/imagens", label: "Imagens do Catálogo", icon: <IconGrid /> },
  { to: "/admin/vendas-externas", label: "Vendas Externas", icon: <IconGrid /> },
  { to: "/admin/kanban", label: "Kanban", icon: <IconGrid /> },
  { to: "/admin/configuracoes", label: "Configurações", icon: <IconGrid /> },
  
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  const currentNav = NAV.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  });

  const currentLabel = currentNav?.label || "Painel";

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-[#2b554e] p-5 text-white flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
            <div>
              <div className="text-lg font-semibold leading-tight">Painel Caléa</div>
              <div className="text-xs text-white/70">Admin</div>
            </div>

            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center font-semibold">
              C
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                    isActive ? "bg-white text-[#2b554e]" : "text-white/90 hover:bg-white/10",
                  ].join(" ")
                }
              >
                <span className="shrink-0 opacity-90">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/15 pt-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
            >
              Sair
            </button>

            <div className="mt-3 text-[11px] text-white/60">
              © {new Date().getFullYear()} Caléa
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-white border-b flex items-center justify-between px-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Admin</span>
              <span className="mx-2 text-gray-300">/</span>
              <span className="text-gray-600">{currentLabel}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-xs text-gray-500">
                Controle de catálogo, estoque e fornecedores
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type AdminUser = {
  name: string;
  email: string;
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

function IconCart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6h15l-2 9H8L6 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M6 6 5 2H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11 12 3l9 8v10h-6v-6H9v6H3V11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 16V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMoney() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a8 8 0 0 0 .1-1 8 8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 5.5h-4l-.3 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a8 8 0 0 0-.1 1 8 8 0 0 0 .1 1l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Início",
    items: [
      { to: "/admin", label: "Início", icon: <IconHome />, end: true },
      { to: "/admin/estatisticas", label: "Estatísticas", icon: <IconChart /> }
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/admin/vendas", label: "Vendas", icon: <IconCart /> },
      { to: "/admin/produtos", label: "Produtos", icon: <IconTag /> },
      { to: "/admin/estoques", label: "Estoque", icon: <IconBoxes /> },
      { to: "/admin/fornecedores", label: "Fornecedores", icon: <IconTruck /> },
      { to: "/admin/clientes", label: "Clientes", icon: <IconUsers /> },
      { to: "/admin/cupons", label: "Cupons", icon: <IconMoney />, badge: "Novo" },
       { to: "/admin/parcerias", label: "Parcerias", icon: <IconUsers /> },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { to: "/admin/catalogo/imagens", label: "Imagens do Catálogo", icon: <IconGrid /> },
      { to: "/admin/vendas-externas", label: "Vendas Externas", icon: <IconGrid /> },
      { to: "/admin/kanban", label: "Kanban", icon: <IconGrid /> },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/admin/configuracoes", label: "Configurações", icon: <IconSettings /> },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((group) => group.items);

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminUser, setAdminUser] = useState<AdminUser>({
    name: "Administrador",
    email: "",
  });

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        return;
      }

      const user = data.user;

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.nome ||
        user.email?.split("@")[0] ||
        "Administrador";

      setAdminUser({
        name,
        email: user.email || "",
      });
    }

    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  const currentNav = FLAT_NAV.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  });

  const currentLabel = currentNav?.label || "Painel";

  return (
    <div className="min-h-screen bg-[#FCFAF6]">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-white border-r border-[#e9e2d6] p-5 text-[#2b554e] flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[#e9e2d6] pb-4">
            <div>
              <div className="text-lg font-semibold leading-tight">Caléa Admin</div>

              <div className="text-xs text-zinc-500">
                Olá, {adminUser.name}
              </div>
            </div>

            <div className="h-9 w-9 rounded-xl bg-[#2b554e] text-white flex items-center justify-center font-semibold">
              {adminUser.name.charAt(0).toUpperCase()}
            </div>
          </div>

          <nav className="mt-5 space-y-6 overflow-y-auto pr-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {group.title}
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [
                          "flex items-center justify-between rounded-xl px-3 py-2 transition",
                          isActive
                            ? "bg-[#eef4f2] text-[#2b554e] font-semibold"
                            : "text-zinc-700 hover:bg-[#f6f3ee] hover:text-[#2b554e]",
                        ].join(" ")
                      }
                    >
                      <span className="flex items-center gap-3">
                        <span className="shrink-0">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </span>

                      {item.badge ? (
                        <span className="rounded-full border border-[#2b554e]/30 bg-[#eef4f2] px-2 py-0.5 text-[10px] font-semibold text-[#2b554e]">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#e9e2d6] pt-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-xl bg-[#2b554e] px-3 py-2 text-sm font-medium text-white hover:bg-[#244841]"
            >
              Sair
            </button>

            <div className="mt-3 text-[11px] text-zinc-400">
              © {new Date().getFullYear()} Caléa
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-white border-b border-[#e9e2d6] flex items-center justify-between px-6">
            <div className="text-sm text-zinc-500">
              <span className="font-medium text-[#2b554e]">Admin</span>
              <span className="mx-2 text-zinc-300">/</span>
              <span>{currentLabel}</span>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-[#2b554e]">
                {adminUser.name}
              </div>

              {adminUser.email ? (
                <div className="text-xs text-zinc-400">
                  {adminUser.email}
                </div>
              ) : null}
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
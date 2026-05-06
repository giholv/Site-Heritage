import { Link } from "react-router-dom";

export default function AdminInicio() {
  const atalhos = [
    {
      title: "Estatísticas",
      description: "Veja vendas, pagamentos, produtos e desempenho geral.",
      href: "/admin/estatisticas",
    },
    {
      title: "Vendas",
      description: "Acompanhe pedidos, status e histórico de compras.",
      href: "/admin/vendas",
    },
    {
      title: "Produtos",
      description: "Gerencie produtos, SKUs, imagens e categorias.",
      href: "/admin/produtos",
    },
    {
      title: "Clientes",
      description: "Consulte clientes cadastrados e dados de contato.",
      href: "/admin/clientes",
    },
    {
      title: "Cupons",
      description: "Crie e gerencie cupons de desconto.",
      href: "/admin/cupons",
    },
    {
      title: "Configurações",
      description: "Ajuste módulos, permissões e preferências do admin.",
      href: "/admin/configuracoes",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#b08d57]">
          Painel administrativo
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-[#2b554e]">
          Início
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Bem-vindo ao painel da Caléa. Use os atalhos abaixo para acessar as principais áreas da loja.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {atalhos.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="rounded-3xl border border-[#e9e2d6] bg-[#f6f3ee] p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[#2b554e]">
              {item.title}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {item.description}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
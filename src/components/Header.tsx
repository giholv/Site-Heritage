import React, { useEffect, useState } from 'react';
import { Menu, X, Search, ShoppingBag, User } from 'lucide-react';
import { Link } from './ui/Link';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { label: 'Início', href: '#home' },
    { label: 'Lançamentos', href: '#lancamentos' },
    { label: 'Pratas', href: '#pratas' },
    { label: 'Semijoias', href: '#semijoias' },
    { label: 'Sobre Nós', href: '#about' },
    { label: 'Contato', href: '#contact' },
  ];

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Pesquisar:', q);
  };

  const onCart = () => console.log('Abrir carrinho');
  const onLogin = () => console.log('Ir para login');

  const iconBase = scrolled ? 'text-[#2b554e]' : 'text-[#2b554e]';
  const iconHover = 'hover:text-[#b08d57]';

  return (
    <header className="fixed w-full z-50">
      {/* TOP BAR (sua identidade) */}
      <div className="bg-[#2b554e] text-[#f3f0e0]">
        <div className="container mx-auto px-4 md:px-6 h-10 flex items-center justify-center text-sm">
          <span className="opacity-95">
            Frete grátis a partir de <strong>R$699</strong> • 5% OFF no PIX • Troca fácil
          </span>
        </div>
      </div>

      {/* HEADER */}
      <div
        className={`transition-all duration-300 ${scrolled
            ? "bg-[#FCFAF6]/96 shadow-sm backdrop-blur-md border-b border-[#2b554e]/10"
            : "bg-[#FCFAF6] border-b border-[#2b554e]/10"
          }`}
      >
        {/* Linha principal */}
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center">
          {/* Mobile: menu */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
              className="text-[#2b554e]"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Logo (esquerda no mobile, centro no desktop) */}
          <div className="flex-1 flex justify-center md:justify-start md:flex-none md:w-[260px]">
            <Link href="#home" className="inline-flex items-center">
              <img
                src="/logo_fundo_claro2.png"
                alt="Logo da loja"
                className="h-[90px] w-auto object-contain"
              />
            </Link>
          </div>

          {/* Busca (desktop) */}
          <div className="hidden md:flex flex-1 justify-center">
            <form onSubmit={onSearchSubmit} className="w-full max-w-[520px]">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nome ou código"
                  className="w-full h-11 pl-4 pr-11 rounded-md border border-[#2b554e]/20 bg-white/60 text-[#2b554e] placeholder:text-[#2b554e]/45 focus:outline-none focus:ring-2 focus:ring-[#b08d57]/35"
                />
                <button
                  type="submit"
                  aria-label="Pesquisar"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2b554e]/70 hover:text-[#b08d57] transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>

          {/* Ícones (direita) */}
          <div className="flex items-center justify-end gap-3 md:w-[260px]">
            {/* Mobile: ícone de busca */}
            <button
              type="button"
              aria-label="Pesquisar"
              onClick={() => console.log('Abrir busca mobile')}
              className={`md:hidden transition-colors ${iconBase} ${iconHover}`}
            >
              <Search className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={onLogin}
              aria-label="Login"
              className={`transition-colors ${iconBase} ${iconHover}`}
            >
              <User className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={onCart}
              aria-label="Carrinho"
              className={`transition-colors ${iconBase} ${iconHover} relative`}
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 text-[10px] leading-none bg-[#b08d57] text-white rounded-full px-1.5 py-1">
                0
              </span>
            </button>
          </div>
        </div>

        {/* MENU (desktop) */}
        <nav className="hidden md:block border-t border-[#2b554e]/10">
          <div className="container mx-auto px-4 md:px-6 h-12 flex items-center justify-center gap-10">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium tracking-wide text-[#2b554e] hover:text-[#b08d57] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* DRAWER MOBILE */}
      <div
        className={`md:hidden fixed inset-0 bg-[#2b554e]/95 z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="pt-24 px-6">
          {/* Busca mobile */}
          <form onSubmit={onSearchSubmit} className="mb-8">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome ou código"
                className="w-full h-12 pl-4 pr-12 rounded-md border border-white/25 bg-transparent text-[#f3f0e0] placeholder:text-[#f3f0e0]/60 focus:outline-none focus:ring-2 focus:ring-[#b08d57]/50"
              />
              <button
                type="submit"
                aria-label="Pesquisar"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f3f0e0]/90 hover:text-white"
              >
                <Search className="h-6 w-6" />
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[#f3f0e0] text-xl font-medium hover:text-[#e7d3a8]"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={onLogin}
                aria-label="Login"
                className="text-[#f3f0e0] hover:text-[#e7d3a8]"
              >
                <User className="h-7 w-7" />
              </button>

              <button
                type="button"
                onClick={onCart}
                aria-label="Carrinho"
                className="text-[#f3f0e0] hover:text-[#e7d3a8] relative"
              >
                <ShoppingBag className="h-7 w-7" />
                <span className="absolute -top-2 -right-2 text-[10px] leading-none bg-[#b08d57] text-white rounded-full px-1.5 py-1">
                  0
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
                className="ml-auto text-[#f3f0e0]/80 hover:text-white"
              >
                <X className="h-7 w-7" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

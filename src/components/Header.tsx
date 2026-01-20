import React, { useEffect, useState } from "react";
import { Menu, X, Search, ShoppingBag, User } from "lucide-react";
import { Link } from "./ui/Link";
import { useNavigate } from "react-router-dom";
import CartDrawer from "./CartDrawer";
import { useCart } from "../context/CartContext";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { state, subtotal, count, remove, setQty } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // fecha menu mobile com ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // trava scroll quando menu mobile abre
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const menuItems = [
    { label: "Início", href: "#home" },
    { label: "Lançamentos", href: "#lancamentos" },
    { label: "Pratas", href: "#pratas" },
    { label: "Semijoias", href: "#semijoias" },
    { label: "Sobre Nós", href: "#about" },
    { label: "Contato", href: "#contact" },
  ];

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Pesquisar:", q);
  };

  const onLogin = () => navigate("/login");

  const openCart = () => {
    setIsOpen(false);
    setCartOpen(true);
  };

  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] leading-none bg-[#b08d57] text-white rounded-full">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  return (
    <>
      <header className="fixed w-full z-50">
        {/* TOP BAR */}
        <div className="bg-[#2b554e] text-[#f3f0e0]">
          <div className="container mx-auto px-3 md:px-6 h-8 md:h-9 flex items-center justify-center">
            <span className="text-[11px] md:text-sm opacity-95 text-center leading-none">
              Frete grátis a partir de <strong>R$699</strong> • 5% OFF no PIX • Troca fácil
            </span>
          </div>
        </div>

        {/* HEADER */}
        <div
          className={[
            "transition-all duration-300 border-b border-[#2b554e]/10",
            scrolled ? "bg-[#FCFAF6]/96 shadow-sm backdrop-blur-md" : "bg-[#FCFAF6]",
          ].join(" ")}
        >
          <div className="container mx-auto px-3 md:px-6">
            {/* MOBILE */}
            <div className="md:hidden grid grid-cols-[44px_1fr_120px] items-center h-14 py-2">
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-label="Abrir menu"
                className="h-11 w-11 inline-flex items-center justify-center text-[#2b554e]"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <div className="justify-self-center">
                <Link href="#home" className="inline-flex items-center">
                  <img
                    src="/logo_fundo_claro.svg"
                    alt="Logo da loja"
                    className="h-12 w-auto object-contain"
                  />
                </Link>
              </div>

              <div className="justify-self-end flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Pesquisar"
                  onClick={() => setIsOpen(true)}
                  className="h-11 w-11 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={onLogin}
                  aria-label="Login"
                  className="h-11 w-11 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  <User className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={openCart}
                  aria-label="Carrinho"
                  className="relative h-11 w-11 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {badge(count)}
                </button>
              </div>
            </div>

            {/* DESKTOP */}
            <div className="hidden md:flex h-20 items-center gap-6">

              {/* Logo - UMA só */}
             <div className="flex-none w-[260px] flex items-center pt-8">

                <Link href="#home" className="inline-flex items-center">
                  <img
                    src="/logo_fundo_claro.svg"
                    alt="Logo da loja"
                   className="h-24 lg:h-28 w-auto object-contain"
                    

                  />
                </Link>
              </div>

              {/* Busca */}
              <div className="flex-1 flex justify-center">
                <form onSubmit={onSearchSubmit} className="w-full max-w-[560px]">
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nome ou código"
                      className="w-full h-11 pl-4 pr-11 rounded-md border border-[#2b554e]/20 bg-white/60 text-[#2b554e] placeholder:text-[#2b554e]/45 focus:outline-none focus:ring-2 focus:ring-[#b08d57]/30"
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

              {/* Ícones */}
              <div className="flex-none w-[260px] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onLogin}
                  aria-label="Login"
                  className="h-11 w-11 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  <User className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={openCart}
                  aria-label="Carrinho"
                  className="relative h-11 w-11 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {badge(count)}
                </button>
              </div>
            </div>
          </div>

          {/* MENU desktop */}
          <nav className="hidden md:block">
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

        {/* MOBILE DRAWER MENU */}
        <div
          className={`md:hidden fixed inset-0 z-40 ${
            isOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* overlay */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setIsOpen(false)}
            className={`absolute inset-0 bg-black/30 transition-opacity ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* painel */}
          <div
            className={`absolute right-0 top-0 h-full w-[88%] max-w-[380px] bg-[#2b554e] text-[#f3f0e0] transition-transform duration-300 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="pt-6 px-6 flex items-center justify-between">
              <span className="text-sm tracking-[0.18em] opacity-90">MENU</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
                className="h-11 w-11 inline-flex items-center justify-center text-[#f3f0e0]/80 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="pt-8 px-6">
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

              {/* Links */}
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

                {/* Ações */}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onLogin();
                    }}
                    className="h-12 rounded-xl bg-white text-[#2b554e] font-medium"
                  >
                    Entrar
                  </button>

                  <button
                    type="button"
                    onClick={openCart}
                    className="h-12 rounded-xl border border-white/30 text-white font-medium relative"
                  >
                    Sacola
                    {count > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] leading-none bg-[#b08d57] text-white rounded-full">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                </div>

                <p className="mt-6 text-xs text-white/60">Caléa • Elegância sem esforço.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CART DRAWER */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={state.items}
        subtotal={subtotal}
        freeShippingThreshold={699}
        onContinueShopping={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          navigate("/checkout");
        }}
        onRemove={remove}
        onSetQty={setQty}
      />
    </>
  );
};

export default Header;

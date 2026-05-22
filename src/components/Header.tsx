import React, { useEffect, useState } from "react";
import { Menu, X, Search, ShoppingBag, User } from "lucide-react";
import { Link } from "./ui/Link";
import { useNavigate, useLocation } from "react-router-dom";
import CartDrawer from "./CartDrawer";
import { useCart } from "../context/CartContext";

type HeaderProps = {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: (v: string) => void;
};

const Header: React.FC<HeaderProps> = ({ searchValue, onSearchChange, onSearchSubmit }) => {
  const { state, subtotal, count, remove, setQty } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [qLocal, setQLocal] = useState("");
  const q = searchValue ?? qLocal;
  const navigate = useNavigate();

  const location = useLocation();

  const menuItems = [
    { label: "Início", id: "home" },
    { label: "Encontre Sua Joia", id: "categorias" },
    { label: "Lançamentos", id: "semijoias" },
    { label: "Sobre Nós", id: "about" },
    { label: "Contato", id: "contact" },
  ];

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.location.hash = id;
  };

  const goSection = (id: string) => {
    setIsOpen(false);

    // se já estiver na home, só scrolla
    if (location.pathname === "/") {
      scrollToId(id);
      return;
    }

    // se estiver em outra rota, vai pra home e espera renderizar
    navigate("/", { replace: false });

    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const el = document.getElementById(id);
      if (el) {
        clearInterval(t);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (tries >= 40) {
        clearInterval(t);
        window.location.hash = id;
      }
    }, 50);
  };

  const setQ = (v: string) => {
    onSearchChange?.(v);
    if (searchValue === undefined) setQLocal(v);
  };
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



  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) return onSearchSubmit(q);
    console.log("Pesquisar:", q);
  };
  const onLogin = () => navigate("/login");

  const openCart = () => {
    setIsOpen(false);
    setCartOpen(true);
  };

  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 flex items-center justify-center text-[11px] leading-none bg-[#b08d57] text-white rounded-full">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  return (
    <>
      <header
        className={[
          "fixed top-0 left-0 w-full z-50 transition-all duration-300",
          scrolled ? "backdrop-blur-xl" : "",
        ].join(" ")}
      >
        {/* TOP BAR */}
        <div
          className={[
            "text-[#f3f0e0] border-b border-white/10 transition-all duration-300",
            scrolled
              ? "bg-[#2b554e]/95 shadow-sm"
              : "bg-[#2b554e]",
          ].join(" ")}

        >
          <div className="container mx-auto px-3 md:px-6 h-9 md:h-10 flex items-center justify-center">
            <span className="text-[12px] md:text-[14px] lg:text-[15px] opacity-95 text-center leading-none">
              Frete grátis a partir de <strong>R$299</strong> • 5% OFF no PIX • Troca fácil
            </span>
          </div>
        </div>
        {/* HEADER */}
        <div
          className={[
            "transition-all duration-300 border-b",
            scrolled
              ? "bg-white/55 shadow-[0_8px_30px_rgba(43,85,78,0.10)] border-[#2b554e]/10 supports-[backdrop-filter]:bg-white/35"
              : "bg-[#FCFAF6] border-transparent",
          ].join(" ")}
        >
          <div className="container mx-auto px-3 md:px-6">
            {/* MOBILE */}
            <div className="md:hidden grid grid-cols-[44px_1fr_120px] items-center h-14 py-2">
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-label="Abrir menu"
                className="h-12 w-12 inline-flex items-center justify-center text-[#2b554e]"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <div className="justify-self-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/");
                  }}
                  className="inline-flex items-center"
                  aria-label="Ir para Home"
                >
                  <img
                    src="/logo_fundo_escuro_mobile.svg"
                    alt="Logo da loja"
                    className="h-14 w-auto object-contain"
                  />
                </button>
              </div>

              <div className="justify-self-end flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Pesquisar"
                  onClick={() => setIsOpen(true)}
                  className="h-12 w-12 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={onLogin}
                  aria-label="Login"
                  className="h-12 w-12 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
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
            <div
              className={[
                "hidden md:flex items-center gap-6 transition-all duration-300",
                scrolled ? "h-20 lg:h-24" : "h-24 lg:h-28",
              ].join(" ")}
            >

              {/* Logo - UMA só */}
              <div
                className={[
                  "flex-none flex items-center transition-all duration-300",
                  scrolled ? "w-[260px] lg:w-[300px] pt-2" : "w-[320px] lg:w-[360px] pt-9",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex items-center"
                  aria-label="Ir para Home"
                >
                  <img
                    src="/logo_fundo_claro.svg"
                    alt="Logo da loja"
                    className={[
                      "w-auto object-contain transition-all duration-300",
                      scrolled ? "h-[92px] lg:h-[110px] xl:h-[120px]" : "h-[130px] lg:h-[155px] xl:h-[175px]",
                    ].join(" ")}
                  />
                </button>
              </div>

              {/* Busca */}
              <div className="flex-1 flex justify-center">
                <form onSubmit={handleSearchSubmit} className="w-full max-w-[560px]">
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nome ou código"
                      className="w-full h-11 pl-4 pr-11 rounded-md border border-[#2b554e]/15 bg-white/50
text-[#2b554e] text-base lg:text-[17px] placeholder:text-[#2b554e]/45
backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#b08d57]/30"
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
                  className="h-13 w-13 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  <User className="h-6 w-6 lg:h-7 lg:w-7" />
                </button>

                <button
                  type="button"
                  onClick={openCart}
                  aria-label="Carrinho"
                  className="relative h-13 w-13 inline-flex items-center justify-center text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >

                  <ShoppingBag className="h-6 w-6 lg:h-7 lg:w-7" />
                  {badge(count)}
                </button>
              </div>
            </div>
          </div>

          {/* MENU desktop */}
          <nav className="hidden md:block">
            <div className="container mx-auto px-4 md:px-6 h-12 flex items-center justify-center gap-10">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goSection(item.id)}
                  className="text-base lg:text-[17px] font-medium tracking-wide text-[#2b554e] hover:text-[#b08d57] transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
          {/* MOBILE DRAWER MENU */}
          <div
            className={`md:hidden fixed inset-0 z-40 ${isOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
          >
            {/* overlay */}
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setIsOpen(false)}
              className={`absolute inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"
                }`}
            />

            {/* painel */}
            <div
              className={`absolute right-0 top-0 h-full w-[88%] max-w-[380px] bg-[#2b554e] text-[#f3f0e0] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
              <div className="pt-6 px-6 flex items-center justify-between">
                <span className="text-sm tracking-[0.18em] opacity-90">MENU</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar"
                  className="h-13 w-13 inline-flex items-center justify-center text-[#f3f0e0]/80 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="pt-8 px-6">
                {/* Busca mobile */}
                <form onSubmit={handleSearchSubmit} className="mb-8">
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
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goSection(item.id)}
                      className="text-left text-[#f3f0e0] text-xl font-medium hover:text-[#e7d3a8]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

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

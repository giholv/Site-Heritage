import React, { useEffect, useState } from "react";
import { Menu, X, Search, ShoppingBag, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import CartDrawer from "./CartDrawer";
import { useCart } from "../context/CartContext";

type HeaderProps = {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: (v: string) => void;
};

const Header: React.FC<HeaderProps> = ({
  searchValue,
  onSearchChange,
  onSearchSubmit,
}) => {
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

  const setQ = (v: string) => {
    onSearchChange?.(v);
    if (searchValue === undefined) setQLocal(v);
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = id;
    }
  };

  const goSection = (id: string) => {
    setIsOpen(false);

    if (location.pathname === "/") {
      scrollToId(id);
      return;
    }

    navigate("/", { replace: false });

    let tries = 0;

    const timer = window.setInterval(() => {
      tries += 1;

      const el = document.getElementById(id);

      if (el) {
        window.clearInterval(timer);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (tries >= 40) {
        window.clearInterval(timer);
        window.location.hash = id;
      }
    }, 50);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const term = q.trim();
    if (!term) return;

    setIsOpen(false);

    if (onSearchSubmit) {
      onSearchSubmit(term);
      return;
    }

    navigate(`/joias?q=${encodeURIComponent(term)}`);
  };

  const onLogin = () => {
    navigate("/login");
  };

  const openCart = () => {
    setIsOpen(false);
    setCartOpen(true);
  };

  const badge = (n: number, mobile = false) =>
    n > 0 ? (
      <span
        className={[
          "absolute flex items-center justify-center rounded-full bg-[#b08d57] px-1 leading-none text-white",
          mobile
            ? "-right-1 -top-1 h-[17px] min-w-[17px] text-[10px]"
            : "-right-1 -top-1 h-[20px] min-w-[20px] text-[11px]",
        ].join(" ")}
      >
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <header
        className={[
          "fixed left-0 top-0 z-50 w-full transition-all duration-300",
          scrolled ? "backdrop-blur-xl" : "",
        ].join(" ")}
      >
        {/* ========================= */}
        {/* MOBILE HEADER */}
        {/* ========================= */}
        <div className="md:hidden">
          {/* TOP BAR MOBILE */}
          <div
            className={[
              "border-b border-white/10 text-[#f3f0e0] transition-all duration-300",
              scrolled ? "bg-[#2b554e]/95 shadow-sm" : "bg-[#2b554e]",
            ].join(" ")}
          >
            <div className="flex h-8 items-center justify-center px-3">
              <span className="truncate text-center text-[11px] leading-none tracking-[0.04em] opacity-95">
                Frete grátis a partir de <strong>R$299</strong> · 10% OFF cupom <strong>BOASVINDAS</strong>
              </span>
            </div>
          </div>

          {/* NAV MOBILE */}
          <div
            className={[
              "border-b transition-all duration-300",
              scrolled
                ? "border-[#2b554e]/10 bg-white/75 shadow-[0_8px_30px_rgba(43,85,78,0.08)] supports-[backdrop-filter]:bg-white/50"
                : "border-transparent bg-[#FCFAF6]",
            ].join(" ")}
          >
            <div className="grid h-[58px] grid-cols-[40px_1fr_132px] items-center px-4">
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
                className="
                  inline-flex h-10 w-10 items-center justify-center
                  rounded-full text-[#2b554e]
                  transition active:scale-95
                "
              >
                {isOpen ? (
                  <X className="h-6 w-6" strokeWidth={1.8} />
                ) : (
                  <Menu className="h-6 w-6" strokeWidth={1.8} />
                )}
              </button>

              <div className="justify-self-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/");
                  }}
                  className="inline-flex items-center justify-center"
                  aria-label="Ir para Home"
                >
                  <img
                    src="/logo_fundo_escuro_mobile.png"
                    alt="Logo da loja"
                    className="h-14 w-auto object-contain"
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-1 justify-self-end">
                <button
                  type="button"
                  aria-label="Pesquisar"
                  onClick={() => setIsOpen(true)}
                  className="
                    inline-flex h-10 w-10 items-center justify-center
                    rounded-full text-[#2b554e]
                    transition hover:text-[#b08d57] active:scale-95
                  "
                >
                  <Search className="h-[21px] w-[21px]" strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  onClick={onLogin}
                  aria-label="Login"
                  className="
                    inline-flex h-10 w-10 items-center justify-center
                    rounded-full text-[#2b554e]
                    transition hover:text-[#b08d57] active:scale-95
                  "
                >
                  <User className="h-[21px] w-[21px]" strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  onClick={openCart}
                  aria-label="Carrinho"
                  className="
                    relative inline-flex h-10 w-10 items-center justify-center
                    rounded-full text-[#2b554e]
                    transition hover:text-[#b08d57] active:scale-95
                  "
                >
                  <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.8} />
                  {badge(count, true)}
                </button>
              </div>
            </div>
          </div>

          {/* DRAWER MOBILE */}
          <div
            className={[
              "fixed inset-0 z-40",
              isOpen ? "pointer-events-auto" : "pointer-events-none",
            ].join(" ")}
          >
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setIsOpen(false)}
              className={[
                "absolute inset-0 bg-black/30 transition-opacity",
                isOpen ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />

            <div
              className={[
                "absolute right-0 top-0 h-full w-[88%] max-w-[380px]",
                "bg-[#2b554e] text-[#f3f0e0] shadow-2xl",
                "transition-transform duration-300",
                isOpen ? "translate-x-0" : "translate-x-full",
              ].join(" ")}
            >
              <div className="flex items-center justify-between px-6 pt-6">
                <span className="text-sm tracking-[0.18em] opacity-90">
                  MENU
                </span>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar"
                  className="
                    inline-flex h-12 w-12 items-center justify-center
                    rounded-full text-[#f3f0e0]/80 hover:text-white
                  "
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="px-6 pt-8">
                <form onSubmit={handleSearchSubmit} className="mb-8">
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nome ou código"
                      className="
                        h-12 w-full rounded-md border border-white/25
                        bg-transparent pl-4 pr-12 text-[#f3f0e0]
                        placeholder:text-[#f3f0e0]/60
                        focus:outline-none focus:ring-2 focus:ring-[#b08d57]/50
                      "
                    />

                    <button
                      type="submit"
                      aria-label="Pesquisar"
                      className="
                        absolute right-3 top-1/2 -translate-y-1/2
                        text-[#f3f0e0]/90 hover:text-white
                      "
                    >
                      <Search className="h-6 w-6" />
                    </button>
                  </div>
                </form>

                <div className="flex flex-col gap-6">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goSection(item.id)}
                      className="
                        text-left text-xl font-medium text-[#f3f0e0]
                        hover:text-[#e7d3a8]
                      "
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onLogin();
                    }}
                    className="
                      h-12 rounded-xl bg-white font-medium text-[#2b554e]
                      transition active:scale-[0.98]
                    "
                  >
                    Entrar
                  </button>

                  <button
                    type="button"
                    onClick={openCart}
                    className="
                      relative h-12 rounded-xl border border-white/30
                      font-medium text-white transition active:scale-[0.98]
                    "
                  >
                    Sacola

                    {count > 0 && (
                      <span
                        className="
                          absolute -right-2 -top-2
                          flex h-[18px] min-w-[18px] items-center justify-center
                          rounded-full bg-[#b08d57] px-1
                          text-[10px] leading-none text-white
                        "
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                </div>

                <p className="mt-6 text-xs text-white/60">
                  Caléa • Elegância sem esforço.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================= */}
        {/* DESKTOP HEADER */}
        {/* ========================= */}
        <div className="hidden md:block">
          {/* TOP BAR DESKTOP */}
          <div
            className={[
              "border-b border-white/10 text-[#f3f0e0] transition-all duration-300",
              scrolled ? "bg-[#2b554e]/95 shadow-sm" : "bg-[#2b554e]",
            ].join(" ")}
          >
            <div className="mx-auto flex h-10 max-w-[1440px] items-center justify-center px-6">
              <span className="text-center text-[14px] leading-none opacity-95 lg:text-[15px]">
                Frete grátis a partir de <strong>R$299</strong> •
                Cupom de 10% OFF para primeira compra: <strong>BOASVINDAS</strong>
              </span>
            </div>
          </div>

          {/* NAV DESKTOP */}
          <div
            className={[
              "border-b transition-all duration-300",
              scrolled
                ? "border-[#2b554e]/10 bg-white/55 shadow-[0_8px_30px_rgba(43,85,78,0.10)] supports-[backdrop-filter]:bg-white/35"
                : "border-transparent bg-[#FCFAF6]",
            ].join(" ")}
          >
            <div className="mx-auto w-full max-w-[1440px] px-6">
              <div
                className={[
                  "grid grid-cols-[240px_1fr_240px] items-center gap-6 transition-all duration-300 lg:grid-cols-[280px_1fr_280px]",
                  scrolled ? "h-20 lg:h-24" : "h-24 lg:h-28",
                ].join(" ")}
              >
                <div className="flex items-center justify-start">
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
                        scrolled
                          ? "h-[92px] lg:h-[110px]"
                          : "h-[115px] lg:h-[135px] xl:h-[145px]",
                      ].join(" ")}
                    />
                  </button>
                </div>

                <div className="flex w-full justify-center">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="relative w-full max-w-[700px]"
                  >
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nome ou código"
                      className="
                        h-14 w-full rounded-lg border border-[#dcd6cc]
                        bg-white px-6 pr-14 text-base text-[#2b554e]
                        outline-none transition
                        placeholder:text-[#9aa8a3]
                        focus:border-[#2b554e]
                        focus:ring-2 focus:ring-[#2b554e]/10
                      "
                    />

                    <button
                      type="submit"
                      aria-label="Pesquisar"
                      className="
                        absolute right-4 top-1/2 -translate-y-1/2
                        text-[#54716b] transition-colors hover:text-[#b08d57]
                      "
                    >
                      <Search className="h-6 w-6" strokeWidth={1.8} />
                    </button>
                  </form>
                </div>

                <div className="flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={onLogin}
                    aria-label="Login"
                    className="
                      inline-flex h-12 w-12 items-center justify-center
                      text-[#2b554e] transition-colors hover:text-[#b08d57]
                    "
                  >
                    <User className="h-7 w-7" strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    onClick={openCart}
                    aria-label="Carrinho"
                    className="
                      relative inline-flex h-12 w-12 items-center justify-center
                      text-[#2b554e] transition-colors hover:text-[#b08d57]
                    "
                  >
                    <ShoppingBag className="h-7 w-7" strokeWidth={1.8} />
                    {badge(count)}
                  </button>
                </div>
              </div>
            </div>

            {/* MENU DESKTOP */}
            <nav className="border-t border-[#eee8dc]/80">
              <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-center gap-12 px-6">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goSection(item.id)}
                    className="
                      text-base font-medium tracking-[0.12em]
                      text-[#2b554e] transition-colors hover:text-[#b08d57]
                      lg:text-[17px]
                    "
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={state.items}
        subtotal={subtotal}
        freeShippingThreshold={299}
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
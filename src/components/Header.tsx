import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Search,
  ShoppingBag,
  User,
  ChevronDown,
  Home,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import CartDrawer from "./CartDrawer";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";
import { WhatsAppFloatingButton } from "../components/WhatsAppFloatingButton";
import AmbientSound from "./AmbientSound";

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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const q = searchValue ?? qLocal;

  const navigate = useNavigate();
  const location = useLocation();
  const isProductPage = location.pathname.startsWith("/produto/");
  const isAdminPage = location.pathname.startsWith("/admin");
  const isCheckoutPage = location.pathname.startsWith("/checkout");

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


  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(!!data.user);
    }

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  return (
    <>
      <header
        className={[
          "fixed left-0 top-0 z-50 w-full transition-all duration-300",
          isOpen ? "h-screen overflow-hidden" : "",
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
            <div className="relative flex h-[58px] items-center justify-between px-4">
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
                    className="h-9 w-auto object-contain sm:h-10 md:h-10"
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

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    className="
      inline-flex h-10 w-10 items-center justify-center
      rounded-full text-[#2b554e]
      transition hover:text-[#b08d57] active:scale-95
    "
                  >
                    <User className="h-[21px] w-[21px]" strokeWidth={1.8} />
                  </button>


                  {accountMenuOpen && (
                    <div

                      className="
        absolute right-0 top-[120%] z-50
        w-[240px] overflow-hidden
        rounded-[24px]
        border border-[#ece3d7]
        bg-white
        shadow-[0_30px_80px_rgba(0,0,0,0.12)]
      "
                    >
                      <button
                        onClick={() => {
                          navigate(isLoggedIn ? "/conta" : "/login");
                          setAccountMenuOpen(false);
                        }}
                        className="
          flex w-full items-center gap-3
          px-5 py-4 text-left
          text-[14px] text-[#2b554e]
          transition hover:bg-[#fcfaf6]
        "
                      >
                        <Home className="h-5 w-5" />
                        Minha conta
                      </button>

                      <a
                        href="https://wa.me/5511999999999"
                        target="_blank"
                        className="
          flex items-center gap-3
          px-5 py-4
          text-[14px] text-[#2b554e]
          transition hover:bg-[#fcfaf6]
        "
                      >
                        <MessageCircle className="h-5 w-5" />
                        Suporte
                      </a>

                      {isLoggedIn && (
                        <button
                          onClick={async () => {
                            await supabase.auth.signOut();
                            setAccountMenuOpen(false);
                            window.location.href = "/login";
                          }}
                          className="
            flex w-full items-center gap-3
            border-t border-[#f1ebe3]
            px-5 py-4 text-left
            text-[14px] text-[#a35a5a]
            transition hover:bg-[#fcfaf6]
          "
                        >
                          <LogOut className="h-5 w-5" />
                          Sair
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

                <div className="relative flex items-center justify-end gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen((v) => !v)}
                      className="
        flex h-[52px] items-center gap-3 rounded-2xl
        px-4 text-[#2b554e]
        transition hover:bg-[#f7f2ea]
      "
                    >
                      <User className="h-6 w-6" strokeWidth={1.8} />

                      <span className="text-[15px] font-medium">
                        Minha conta
                      </span>

                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {accountMenuOpen && (
                      <div
                        className="
      absolute right-0 top-[115%] z-50
      w-[270px] overflow-hidden
      rounded-[28px]
      border border-[#ece3d7]
      bg-white
      shadow-[0_30px_80px_rgba(0,0,0,0.12)]
    "
                      >
                        <button
                          onClick={() => {
                            navigate(isLoggedIn ? "/conta" : "/login");
                            setAccountMenuOpen(false);
                          }}
                          className="
        flex w-full items-center gap-3
        px-6 py-5 text-left
        text-[15px] text-[#2b554e]
        transition hover:bg-[#fcfaf6]
      "
                        >
                          <Home className="h-5 w-5" />
                          Minha conta
                        </button>

                        <a
                          href="https://wa.me/5511999999999"
                          target="_blank"
                          className="
        flex items-center gap-3
        px-6 py-5
        text-[15px] text-[#2b554e]
        transition hover:bg-[#fcfaf6]
      "
                        >
                          <MessageCircle className="h-5 w-5" />
                          Suporte no WhatsApp
                        </a>

                        {isLoggedIn && (
                          <button
                            onClick={async () => {
                              await supabase.auth.signOut();
                              setAccountMenuOpen(false);
                              window.location.href = "/login";
                            }}
                            className="
          flex w-full items-center gap-3
          border-t border-[#f1ebe3]
          px-6 py-5 text-left
          text-[15px] text-[#a35a5a]
          transition hover:bg-[#fcfaf6]
        "
                          >
                            <LogOut className="h-5 w-5" />
                            Sair
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openCart}
                    aria-label="Carrinho"
                    className="
      relative inline-flex h-12 w-12 items-center justify-center
      rounded-2xl text-[#2b554e]
      transition hover:bg-[#f7f2ea]
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
      {/* DRAWER MOBILE */}
      <div
        className={[
          "fixed inset-0 z-[9999]",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setIsOpen(false)}
          className={[
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity",
            isOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        <div
          className={[
            "absolute right-0 top-0 h-full w-[86%] max-w-[360px]",
            "bg-[#fcfaf6] text-[#2b554e] shadow-2xl",
            "transition-transform duration-300",
            "overflow-y-auto",
            isOpen ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="border-b border-[#e9e2d6] px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b08d57]">
                Menu
              </span>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2b554e] shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#6f6558]">
              Navegue pela Caléa e encontre sua próxima joia.
            </p>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar joias"
                  className="h-12 w-full rounded-2xl border border-[#e9e2d6] bg-white pl-4 pr-12 text-sm text-[#2b554e] outline-none focus:border-[#b08d57] focus:ring-2 focus:ring-[#b08d57]/15"
                />

                <button
                  type="submit"
                  aria-label="Pesquisar"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2b554e]"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>

            <div className="mt-7 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goSection(item.id)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-[15px] font-medium text-[#2b554e] transition hover:bg-white"
                >
                  {item.label}
                  <span className="text-[#b08d57]">›</span>
                </button>
              ))}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(isLoggedIn ? "/conta" : "/login");
                }}
                className="h-12 rounded-2xl bg-[#2b554e] text-sm font-semibold text-white"
              >
                {isLoggedIn ? "Minha conta" : "Entrar"}
              </button>

              <button
                type="button"
                onClick={openCart}
                className="relative h-12 rounded-2xl border border-[#2b554e]/15 bg-white text-sm font-semibold text-[#2b554e]"
              >
                Sacola {count > 0 ? `(${count})` : ""}
              </button>
            </div>

            {isLoggedIn && (
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-medium text-[#a35a5a]"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            )}
          </div>
        </div>
      </div>
      {!isAdminPage && !isCheckoutPage && !cartOpen && !isOpen && !isProductPage && (
        <AmbientSound />
      )}

      {!isAdminPage && !isCheckoutPage && (
        <WhatsAppFloatingButton hidden={cartOpen || isOpen || isProductPage} />
      )}
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
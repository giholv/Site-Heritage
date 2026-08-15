import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Search,
  ShoppingBag,
  Heart,
  User,
  Home,
  MessageCircle,
  LogOut,
  Music,
  VolumeX,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import CartDrawer from "./CartDrawer";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";
import { WhatsAppFloatingButton } from "../components/WhatsAppFloatingButton";

const FAVORITES_KEY = "calea_favorites";

type HeaderProps = {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: (v: string) => void;
};

type MenuItem =
  | { label: string; type: "route"; to: string }
  | { label: string; type: "section"; id: string };

const Header: React.FC<HeaderProps> = ({
  searchValue,
  onSearchChange,
  onSearchSubmit,
}) => {
  const { state, subtotal, count, remove, setQty } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [qLocal, setQLocal] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  const q = searchValue ?? qLocal;
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === "/";
  const isProductPage = location.pathname.startsWith("/produto/");
  const isAdminPage = location.pathname.startsWith("/admin");
  const isCheckoutPage = location.pathname.startsWith("/checkout");

  const transparentHeader = isHomePage && !scrolled && !isOpen && !searchOpen;
  const glassHeader = isHomePage && !scrolled && !isOpen && !searchOpen;

  const showFloatingSound =
    !isAdminPage && !isCheckoutPage && !cartOpen && !isOpen && !isProductPage;

  const showHeaderSound = !isAdminPage && !showFloatingSound;

  const menuItems: MenuItem[] = [
    { label: "SHOP", type: "route", to: "/joias" },
    { label: "COLEÇÕES", type: "section", id: "colecoes" },
    { label: "BEST SELLERS", type: "section", id: "best-sellers" },
    { label: "SOBRE", type: "section", id: "about" },
    { label: "SEU MATCH CALÉA", type: "section", id: "style-quiz" },
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
    setSearchOpen(false);

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

  const handleMenuItem = (item: MenuItem) => {
    setIsOpen(false);
    setSearchOpen(false);

    if (item.type === "route") {
      navigate(item.to);
      return;
    }

    goSection(item.id);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const term = q.trim();
    if (!term) return;

    setIsOpen(false);
    setSearchOpen(false);

    if (onSearchSubmit) {
      onSearchSubmit(term);
      return;
    }

    navigate(`/joias?q=${encodeURIComponent(term)}`);
  };

  const openCart = () => {
    setIsOpen(false);
    setSearchOpen(false);
    setCartOpen(true);
  };

  const toggleHeaderSound = () => {
    window.dispatchEvent(new Event("calea-toggle-sound"));
  };

  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#b08d57] px-1 text-[10px] leading-none text-white">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleSoundState(event: Event) {
      const customEvent = event as CustomEvent<{ playing: boolean }>;
      setSoundPlaying(Boolean(customEvent.detail?.playing));
    }

    window.addEventListener("calea-sound-state", handleSoundState);
    return () => window.removeEventListener("calea-sound-state", handleSoundState);
  }, []);

  useEffect(() => {
    const syncFavorites = () => {
      try {
        const saved = localStorage.getItem(FAVORITES_KEY);
        const ids = saved ? JSON.parse(saved) : [];
        setFavoriteCount(Array.isArray(ids) ? ids.length : 0);
      } catch {
        setFavoriteCount(0);
      }
    };

    syncFavorites();

    window.addEventListener("storage", syncFavorites);
    window.addEventListener("calea-favorites-updated", syncFavorites);

    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener("calea-favorites-updated", syncFavorites);
    };
  }, []);

  const navigationColor = transparentHeader
  ? "text-[#173a35]"
  : "text-[#173a35]";
  const subtleColor = transparentHeader
  ? "text-[#173a35]"
  : "text-[#173a35]";

  return (
    <>
      {!isAdminPage && !isCheckoutPage && (
        <header className="fixed left-0 top-0 z-50 w-full">
          {/* BARRA PROMOCIONAL */}
          <div className="border-b border-white/10 bg-[#173a35] text-[#FCFAF6]">
            <div className="mx-auto flex h-[28px] max-w-[1600px] items-center justify-center px-4 md:h-[32px]">
              <span className="text-center text-[10px] font-medium uppercase tracking-[0.18em]">
                Frete grátis para todo Brasil acima de R$299
              </span>
            </div>
          </div>

          {/* HEADER PRINCIPAL */}
          <div
            className={[
             "relative overflow-visible border-b transition-all duration-500",
              glassHeader
                ? "border-white/15 bg-[#182725]/42 backdrop-blur-[16px] backdrop-saturate-125 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-inset ring-white/10 supports-[backdrop-filter]:bg-[#182725]/34"
                : "border-[#173a35]/10 bg-[#FCFAF6]/82 backdrop-blur-[14px] shadow-[0_6px_20px_rgba(16,48,43,0.06)] supports-[backdrop-filter]:bg-[#FCFAF6]/74",
            ].join(" ")}
          >
            <div
              className={[
                "pointer-events-none absolute inset-0 transition-opacity duration-500",
                glassHeader
                  ? "bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent opacity-100"
                  : "bg-gradient-to-b from-white/25 via-white/[0.04] to-transparent opacity-60",
              ].join(" ")}
            />

            <div className="relative mx-auto flex h-[68px] max-w-[1600px] items-center px-4 md:h-[76px] md:px-7 xl:px-10">
              {/* MOBILE: MENU */}
              <div className="flex flex-1 items-center md:hidden">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  aria-label="Abrir menu"
                  className={["inline-flex h-10 w-10 items-center justify-center transition", navigationColor].join(" ")}
                >
                  <Menu className="h-[21px] w-[21px]" strokeWidth={1.5} />
                </button>
              </div>

              {/* DESKTOP: MENU À ESQUERDA */}
              <nav className="hidden flex-1 items-center gap-5 md:flex lg:gap-7 xl:gap-8">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleMenuItem(item)}
                    className={[
                      "whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.16em] transition-colors hover:text-[#b08d57]",
                      navigationColor,
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* LOGO CENTRAL ABSOLUTA */}
              <button
                type="button"
                onClick={() => navigate("/")}
                aria-label="Ir para Home"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <img
                  src="/logo_fundo_escuro_mobile.png"
                  alt="Caléa Blanc"
                  className="w-[142px] h-auto object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.08)] md:w-[156px] lg:w-[168px] xl:w-[178px]"
                />
              </button>

              {/* AÇÕES À DIREITA */}
              <div className="flex flex-1 items-center justify-end gap-0 md:gap-1">
                {showHeaderSound && (
                  <button
                    type="button"
                    onClick={toggleHeaderSound}
                    aria-label={soundPlaying ? "Desligar som ambiente" : "Ligar som ambiente"}
                    className={["hidden h-10 w-10 items-center justify-center transition hover:text-[#b08d57] lg:inline-flex", subtleColor].join(" ")}
                  >
                    {soundPlaying ? (
                      <Music className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    ) : (
                      <VolumeX className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-label="Buscar"
                  className={[
                    "inline-flex h-10 items-center justify-center gap-2 px-2 transition hover:text-[#b08d57] md:px-3",
                    subtleColor,
                  ].join(" ")}
                >
                  <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] xl:inline">Buscar</span>
                  <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>

                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    className={[
                      "inline-flex h-10 items-center gap-2 px-2 transition hover:text-[#b08d57] lg:px-3",
                      subtleColor,
                    ].join(" ")}
                  >
                    <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] xl:inline">Minha conta</span>
                    <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </button>

                  {accountMenuOpen && (
                   <div className="absolute right-0 top-[115%] z-[9999] w-[250px] overflow-hidden border border-[#e8dfd2] bg-[#FCFAF6] text-[#173a35] shadow-[0_24px_70px_rgba(0,0,0,0.12)]">
                      <button
                        type="button"
                        onClick={() => {
                          navigate(isLoggedIn ? "/conta" : "/login");
                          setAccountMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left text-[13px] transition hover:bg-white"
                      >
                        <Home className="h-4 w-4" />
                        Minha conta
                      </button>

                      <a
                        href="https://wa.me/5511997946257"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-5 py-4 text-[13px] transition hover:bg-white"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Suporte
                      </a>

                      {isLoggedIn && (
                        <button
                          type="button"
                          onClick={async () => {
                            await supabase.auth.signOut();
                            setAccountMenuOpen(false);
                            window.location.href = "/login";
                          }}
                          className="flex w-full items-center gap-3 border-t border-[#eee6da] px-5 py-4 text-left text-[13px] text-[#9c5555] transition hover:bg-white"
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/favoritos")}
                  aria-label="Favoritos"
                  className={[
                    "relative inline-flex h-10 items-center justify-center gap-2 px-2 transition hover:text-[#b08d57] md:px-3",
                    subtleColor,
                  ].join(" ")}
                >
                  <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] xl:inline">
                    Favoritos
                  </span>
                  <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  <span className="hidden text-[11px] font-medium tabular-nums md:inline">
                    {favoriteCount}
                  </span>
                  <span className="md:hidden">{badge(favoriteCount)}</span>
                </button>

                <button
                  type="button"
                  onClick={openCart}
                  aria-label="Sacola"
                  className={[
                    "relative inline-flex h-10 items-center justify-center gap-2 px-2 transition hover:text-[#b08d57] md:px-3",
                    subtleColor,
                  ].join(" ")}
                >
                  <ShoppingBag className="h-[19px] w-[19px]" strokeWidth={1.5} />
                  <span className="hidden text-[11px] font-medium tabular-nums md:inline">{count}</span>
                  <span className="md:hidden">{badge(count)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* BUSCA EXPANSÍVEL */}
          <div
            className={[
              "overflow-hidden border-b border-[#173a35]/10 bg-[#FCFAF6] transition-all duration-300",
              searchOpen ? "max-h-28 opacity-100" : "max-h-0 opacity-0",
            ].join(" ")}
          >
            <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-[900px] items-center gap-3 px-5 py-5 md:px-8">
              <Search className="h-5 w-5 shrink-0 text-[#173a35]" strokeWidth={1.5} />
              <input
                autoFocus={searchOpen}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="O que você procura?"
                className="h-10 flex-1 border-0 bg-transparent text-[14px] text-[#173a35] outline-none placeholder:text-[#7e8e89]"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Fechar busca"
                className="inline-flex h-9 w-9 items-center justify-center text-[#173a35]"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </header>
      )}

      {/* MENU MOBILE */}
      <div
        className={[
          "fixed inset-0 z-[9999] md:hidden",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setIsOpen(false)}
          className={[
            "absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        <div
          className={[
            "absolute left-0 top-0 h-full w-[88%] max-w-[380px] overflow-y-auto bg-[#173a35] text-[#FCFAF6] shadow-2xl transition-transform duration-300",
            isOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <img src="/logo_fundo_escuro_mobile.png" alt="Caléa Blanc" className="h-12 w-auto" />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              className="inline-flex h-10 w-10 items-center justify-center"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="px-6 py-7">
            <form onSubmit={handleSearchSubmit} className="mb-8 flex items-center border-b border-white/30 pb-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar joias"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-white/55"
              />
              <button type="submit" aria-label="Pesquisar">
                <Search className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </form>

            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleMenuItem(item)}
                  className="flex w-full items-center justify-between border-b border-white/10 py-5 text-left text-[12px] font-medium uppercase tracking-[0.18em]"
                >
                  {item.label}
                  <span className="text-[#b08d57]">→</span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/favoritos");
              }}
              className="mt-8 flex h-12 w-full items-center justify-center gap-2 border border-white/20 text-[11px] font-medium uppercase tracking-[0.12em]"
            >
              <Heart className="h-4 w-4" strokeWidth={1.5} />
              Favoritos {favoriteCount > 0 ? `(${favoriteCount})` : ""}
            </button>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(isLoggedIn ? "/conta" : "/login");
                }}
                className="h-12 border border-white/20 text-[11px] font-medium uppercase tracking-[0.12em]"
              >
                {isLoggedIn ? "Minha conta" : "Entrar"}
              </button>

              <button
                type="button"
                onClick={openCart}
                className="h-12 bg-[#FCFAF6] text-[11px] font-medium uppercase tracking-[0.12em] text-[#173a35]"
              >
                Sacola {count > 0 ? `(${count})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFloatingSound && (
        <button
          type="button"
          onClick={toggleHeaderSound}
          aria-label={soundPlaying ? "Desligar som ambiente" : "Ligar som ambiente"}
          title={soundPlaying ? "Desligar som ambiente" : "Ligar som ambiente"}
          className={[
            "fixed bottom-[142px] left-4 z-[9998] flex h-11 w-11 items-center justify-center rounded-full border border-[#e8dfd2]/80 bg-[#FCFAF6]/90 text-[#2b554e] shadow-[0_10px_28px_rgba(43,85,78,0.16)] backdrop-blur-xl transition hover:bg-white active:scale-95 md:bottom-6 md:left-5 md:h-12 md:w-12",
            soundPlaying ? "border-[#2b554e] bg-[#2b554e] text-white" : "",
          ].join(" ")}
        >
          {soundPlaying ? (
            <Music size={19} strokeWidth={1.8} />
          ) : (
            <VolumeX size={19} strokeWidth={1.8} />
          )}
        </button>
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
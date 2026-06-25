import React from "react";
import { Instagram, Mail, Phone, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "./ui/Link";

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
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
    // já na home → só scroll
    if (location.pathname === "/") {
      scrollToId(id);
      return;
    }

    // outra rota → vai pra home e espera renderizar
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

  return (
    <footer className="bg-[#2b554e] text-[#FCFAF6] pt-14 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center"
                aria-label="Ir para Home"
              >
                <img
                  src="/logo_fundo_escuro.svg"
                  alt="Caléa Logo"
                  className="h-[95px] w-auto object-contain"
                />
              </button>
            </div>

            <p className="text-[#FCFAF6]/75 text-sm leading-relaxed">
              Semijoias com estética clean, brilho elegante e acabamento premium — feitas pra acompanhar sua fase.
            </p>

            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://www.instagram.com/calea.blanc/?utm_source=ig_web_button_share_sheet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[#FCFAF6]/80 hover:text-[#b08d57] transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links rápidos */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-[#FCFAF6] mb-4">
              Navegação
            </h3>

            <ul className="space-y-2 text-sm">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goSection(item.id)}
                    className="text-[#FCFAF6]/75 hover:text-[#b08d57] transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Confiança / políticas */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-[#FCFAF6] mb-4">
              Compra segura
            </h3>

            <ul className="space-y-2 text-sm text-[#FCFAF6]/75">
              <li>• 5% OFF na primeira compra: <strong>BOASVINDAS</strong></li>
              <li>• Troca fácil</li>
              <li>• Atendimento pelo WhatsApp</li>
            </ul>

            <div className="mt-5 rounded-2xl border border-[#FCFAF6]/15 bg-[#FCFAF6]/10 p-3">
        
              <img
                src="/Bandeiras-horizontal-grande.svg"
                alt="Pix, Visa, Mastercard, American Express, Elo e Hipercard"
                className="h-auto max-h-12 w-auto object-contain opacity-90"
              />
            </div>

            <div className="mt-4">
              <span className="inline-flex items-center rounded-full border border-[#b08d57]/40 bg-[#FCFAF6]/10 px-3 py-1 text-xs text-[#FCFAF6]">
                ✦ Acabamento premium • Brilho elegante
              </span>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-[#FCFAF6] mb-4">
              Fale com a gente
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 text-[#FCFAF6]/75">
                <Mail className="h-4 w-4 mt-0.5 text-[#b08d57]" />
                <a
                  href="mailto:contato@calea.com.br"
                  className="hover:text-[#b08d57] transition-colors"
                >
                  contato@calea.com.br
                </a>
              </div>

              <div className="flex items-start gap-3 text-[#FCFAF6]/75">
                <Phone className="h-4 w-4 mt-0.5 text-[#b08d57]" />
                <a
                  href="tel:+5511997946257"
                  className="hover:text-[#b08d57] transition-colors"
                >
                  +55 (11) 99794-6257
                </a>
              </div>

              <div className="flex items-start gap-3 text-[#FCFAF6]/75">
                <MapPin className="h-4 w-4 mt-0.5 text-[#b08d57]" />
                <p>
                  Sorocaba • SP <br />
                  Envio para todo o Brasil
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra final */}
        <div className="mt-10 pt-6 border-t border-[#FCFAF6]/15">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#FCFAF6]/65">
              Copyright © {new Date().getFullYear()} Caléa. Todos os direitos reservados. CNPJ: 64.568.833/0001-36
            </p>

            <div className="flex items-center gap-6 text-xs">
              <Link href="#" className="text-[#FCFAF6]/65 hover:text-[#b08d57] transition-colors">
                Política de Privacidade
              </Link>
              <Link href="#" className="text-[#FCFAF6]/65 hover:text-[#b08d57] transition-colors">
                Trocas e Devoluções
              </Link>
              <Link href="#" className="text-[#FCFAF6]/65 hover:text-[#b08d57] transition-colors">
                Termos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
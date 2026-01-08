import React from "react";
import { Instagram, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "./ui/Link";

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#2b554e] text-[#FCFAF6] pt-14 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo_fundo_escuro.png"
                alt="Héritage"
                className="h-[44px] w-auto object-contain"
              />
            </div>

            <p className="text-[#FCFAF6]/75 text-sm leading-relaxed">
              Semijoias e pratas com estética clean, brilho elegante e acabamento
              premium — feitas pra acompanhar sua fase.
            </p>

            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://www.instagram.com/heritagemaison.co?igsh=MWVnd3ExdWg5MmRx&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[#FCFAF6]/80 hover:text-[#b08d57] transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              {/* Se quiser adicionar TikTok depois, eu coloco */}
            </div>
          </div>

          {/* Links rápidos */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-[#FCFAF6] mb-4">
              Navegação
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Início", href: "#home" },
                { label: "Lançamentos", href: "#lancamentos" },
                { label: "Pratas", href: "#pratas" },
                { label: "Semijoias", href: "#semijoias" },
                { label: "Sobre Nós", href: "#about" },
                { label: "Contato", href: "#contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[#FCFAF6]/75 hover:text-[#b08d57] transition-colors"
                  >
                    {item.label}
                  </Link>
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
              <li>• 5% OFF no PIX</li>
              <li>• Troca fácil</li>
              <li>• Cuidados: banho / prata 925</li>
              <li>• Atendimento pelo WhatsApp</li>
            </ul>

            <div className="mt-5">
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
                  href="mailto:contato@heritage.com.br"
                  className="hover:text-[#b08d57] transition-colors"
                >
                  contato@heritage.com.br
                </a>
              </div>

              <div className="flex items-start gap-3 text-[#FCFAF6]/75">
                <Phone className="h-4 w-4 mt-0.5 text-[#b08d57]" />
                <a
                  href="tel:+5511999999999"
                  className="hover:text-[#b08d57] transition-colors"
                >
                  +55 (11) 99999-9999
                </a>
              </div>

              <div className="flex items-start gap-3 text-[#FCFAF6]/75">
                <MapPin className="h-4 w-4 mt-0.5 text-[#b08d57]" />
                <p>
                  São Paulo • SP <br />
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
              © {new Date().getFullYear()} Héritage. Todos os direitos reservados.
            </p>

            <div className="flex items-center gap-6 text-xs">
              <Link
                href="#"
                className="text-[#FCFAF6]/65 hover:text-[#b08d57] transition-colors"
              >
                Política de Privacidade
              </Link>
              <Link
                href="#"
                className="text-[#FCFAF6]/65 hover:text-[#b08d57] transition-colors"
              >
                Trocas e Devoluções
              </Link>
              <Link
                href="#"
                className="text-[#FCFAF6]/65 hover:text-[#b08d57] transition-colors"
              >
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


import {
  Instagram,
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "../lib/supabase";



const Footer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const navItems = [
    {
      label: "Início",
      type: "section",
      id: "home",
    },
    {
      label: "Encontre Sua Joia",
      type: "section",
      id: "categorias",
    },
    {
      label: "Lançamentos",
      type: "section",
      id: "semijoias",
    },
    {
      label: "Quem Somos",
      type: "route",
      path: "/faq#quem-somos",
    },
    {
      label: "FAQ",
      type: "route",
      path: "/faq#perguntas",
    },
  ];

  function scrollToId(id: string) {
    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    window.location.hash = id;
  }


  function goSection(id: string) {
    if (location.pathname === "/") {
      scrollToId(id);
      return;
    }

    navigate("/");

    let tries = 0;

    const timer = window.setInterval(() => {
      tries += 1;

      const element =
        document.getElementById(id);

      if (element) {
        window.clearInterval(timer);

        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      if (tries >= 40) {
        window.clearInterval(timer);
      }
    }, 50);
  }
  async function handleNewsletterSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const email = newsletterEmail
      .trim()
      .toLowerCase();

    setNewsletterMessage("");
    setNewsletterSuccess(false);

    if (!email) {
      setNewsletterMessage("Digite seu e-mail.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMessage("Digite um e-mail válido.");
      return;
    }

    try {
      setNewsletterLoading(true);

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({
          email,
          source: "footer",
        });

      if (error) {
        if (error.code === "23505") {
          setNewsletterSuccess(true);
          setNewsletterMessage(
            "Você já faz parte do universo Caléa ✦"
          );
          return;
        }

        throw error;
      }

      setNewsletterSuccess(true);
      setNewsletterMessage(
        "Bem-vinda ao universo Caléa ✦"
      );

      setNewsletterEmail("");
    } catch (error) {
      console.error(
        "Erro ao cadastrar newsletter:",
        error
      );

      setNewsletterMessage(
        "Não foi possível cadastrar agora. Tente novamente."
      );
    } finally {
      setNewsletterLoading(false);
    }
  }
  return (
    <footer className="bg-[#173a35] text-[#FCFAF6]">

      {/* NEWSLETTER */}
      <section className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-[1540px] gap-8 px-5 py-10 sm:px-6 md:px-8 lg:grid-cols-[1fr_1fr] lg:items-end lg:px-10 lg:py-14">

          <div>

            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d2b078]">
              Assine e entre para o universo Caléa
            </p>

            <h2 className="mt-3 max-w-[520px] font-serif text-[30px] font-normal leading-[1.05] tracking-[-0.03em] text-[#FCFAF6] md:text-[40px]">
              Novidades que chegam
              <span className="ml-2 italic text-[#d2b078]">
                primeiro a você.
              </span>
            </h2>

            <p className="mt-5 max-w-[460px] text-sm leading-6 text-white/60">
              Receba lançamentos, curadorias e novidades da Caléa.
            </p>
          </div>

          <div>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex border-b border-white/30"
            >
              <input
                type="email"
                value={newsletterEmail}
                onChange={(event) =>
                  setNewsletterEmail(event.target.value)
                }
                placeholder="Seu melhor e-mail"
                autoComplete="email"
                className="
      h-14
      min-w-0
      flex-1
      bg-transparent
      px-0
      text-sm
      text-white
      outline-none
      placeholder:text-white/45
    "
              />

              <button
                type="submit"
                disabled={newsletterLoading}
                className="
      px-4
      text-[9px]
      font-semibold
      uppercase
      tracking-[0.16em]
      text-[#d2b078]
      transition
      hover:text-white
      disabled:cursor-not-allowed
      disabled:opacity-50
    "
              >
                {newsletterLoading
                  ? "Enviando..."
                  : "Quero receber"}
              </button>
            </form>


            {newsletterMessage && (
              <p
                className={[
                  "mt-3 text-[10px] leading-4",
                  newsletterSuccess
                    ? "text-[#d2b078]"
                    : "text-red-300",
                ].join(" ")}
              >
                {newsletterMessage}
              </p>
            )}
            <p className="mt-3 max-w-[270px] text-[9px] leading-4 text-white/35 md:max-w-none md:text-[10px] md:leading-5">
              Ao se cadastrar, você concorda com nossa Política de Privacidade.
            </p>
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="mx-auto w-full max-w-[1540px] px-5 py-12 sm:px-6 md:px-8 lg:px-10 lg:py-16">

        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_0.9fr_1fr]">

          {/* MARCA */}
          {/* MARCA */}
          <div>
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Ir para Home"
              className="inline-flex items-center"
            >
              <div className="flex h-[46px] w-[120px] items-center justify-start overflow-hidden">
                <img
                  src="/Logo (3).png"
                  alt="Caléa"
                  className="
          h-full
          w-full
          scale-[1.15]
          object-contain
          object-left
        "
                />
              </div>
            </button>

            <p className="mt-2 max-w-[310px] text-sm leading-7 text-white/60">
              Semijoias pensadas para realçar,
              acompanhar e fazer parte das suas
              diferentes versões.
            </p>

            <a
              href="https://www.instagram.com/calea.blanc?igsh=MWVnd3ExdWg5MmRx&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:text-[#d2b078]"
            >
              <Instagram size={16} />
              @calea.blanc
              <ArrowUpRight size={13} />
            </a>
          </div>

          {/* NAVEGAÇÃO */}
          <div>
            <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d2b078]">
              Navegue
            </p>

            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        item.type === "route" &&
                        item.path
                      ) {
                        navigate(item.path);
                        return;
                      }

                      if (item.id) {
                        goSection(item.id);
                      }
                    }}
                    className="text-sm text-white/65 transition hover:text-white"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* AJUDA */}
          <div>
            <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d2b078]">
              Ajuda
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  navigate("/faq#perguntas")
                }
                className="block text-sm text-white/65 transition hover:text-white"
              >
                Perguntas frequentes
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/faq#perguntas")
                }
                className="block text-sm text-white/65 transition hover:text-white"
              >
                Trocas e devoluções
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/politica-de-privacidade")
                }
                className="block text-sm text-white/65 transition hover:text-white"
              >
                Política de Privacidade
              </button>

              <p className="text-sm text-white/65">
                Envio para todo o Brasil
              </p>
            </div>
          </div>

          {/* CONTATO */}
          <div id="contact">
            <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d2b078]">
              Fale com a gente
            </p>

            <div className="space-y-4">

              <a
                href="mailto:contato@calea.com.br"
                className="flex items-start gap-3 text-sm text-white/65 transition hover:text-white"
              >
                <Mail
                  size={15}
                  className="mt-0.5 text-[#d2b078]"
                />

                contato@calea.com.br
              </a>

              <a
                href="https://wa.me/5511997946257"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm text-white/65 transition hover:text-white"
              >
                <Phone
                  size={15}
                  className="mt-0.5 text-[#d2b078]"
                />

                +55 (11) 99794-6257
              </a>

              <div className="flex items-start gap-3 text-sm text-white/65">
                <MapPin
                  size={15}
                  className="mt-0.5 text-[#d2b078]"
                />

                <p>
                  Sorocaba • SP
                  <br />
                  Brasil
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PAGAMENTOS */}
        <div className="mt-14 flex flex-col gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Pagamento seguro
            </p>

            <img
              src="/Bandeiras-horizontal-grande.svg"
              alt="Formas de pagamento"
              className="mt-3 max-h-9 w-auto opacity-80"
            />
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs leading-6 text-white/45">
              © {new Date().getFullYear()} Caléa Blanc.
              Todos os direitos reservados.
            </p>

            <p className="text-[10px] text-white/35">
              CNPJ 64.568.833/0001-36
            </p>
          </div>
        </div>
      </div >
    </footer >
  );
};

export default Footer;
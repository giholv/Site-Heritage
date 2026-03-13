import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("calea_cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("calea_cookie_consent", "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem("calea_cookie_consent", "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[9999] md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md">
      <div className="rounded-[24px] border border-[#2b554e]/10 bg-[#FCFAF6]/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#2b554e]">
              Usamos cookies
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#2b554e]/75">
              Utilizamos cookies para melhorar sua navegação, analisar acessos e
              oferecer uma experiência mais fluida no site.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reject}
            className="h-10 rounded-xl border border-[#2b554e]/15 px-4 text-sm font-medium text-[#2b554e] hover:bg-[#2b554e]/5 transition"
          >
            Recusar
          </button>

          <button
            type="button"
            onClick={accept}
            className="h-10 rounded-xl bg-[#2b554e] px-5 text-sm font-semibold text-[#FCFAF6] hover:bg-[#23463f] transition"
          >
            Aceitar
          </button>

          <a
            href="/politica-de-privacidade"
            className="text-sm font-medium text-[#b08d57] hover:underline underline-offset-4"
          >
            Política de Privacidade
          </a>
        </div>
      </div>
    </div>
  );
}
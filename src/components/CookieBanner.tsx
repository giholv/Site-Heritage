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
    <div
      className="
        fixed left-3 right-3 bottom-3 z-[9999]
        md:left-auto md:right-6 md:bottom-6 md:w-[400px]
      "
    >
      <div
        className="
          rounded-[20px]
          border border-[#2b554e]/10
          bg-[#FCFAF6]/95
          p-4
          shadow-[0_10px_35px_rgba(0,0,0,0.14)]
          backdrop-blur-xl
          md:p-5
        "
      >
        <p className="text-[13px] font-semibold text-[#2b554e] md:text-sm">
          Usamos cookies
        </p>

        <p className="mt-1.5 text-[12px] leading-relaxed text-[#2b554e]/70 md:text-sm">
          Utilizamos cookies para melhorar sua experiência no site.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={reject}
            className="
              h-9 flex-1 rounded-xl
              border border-[#2b554e]/15
              px-3 text-[12px] font-medium text-[#2b554e]
              transition hover:bg-[#2b554e]/5
              md:text-sm
            "
          >
            Recusar
          </button>

          <button
            type="button"
            onClick={accept}
            className="
              h-9 flex-1 rounded-xl
              bg-[#2b554e]
              px-3 text-[12px] font-semibold text-[#FCFAF6]
              transition hover:bg-[#23463f]
              md:text-sm
            "
          >
            Aceitar
          </button>
        </div>

        <a
          href="/politica-de-privacidade"
          className="
            mt-2 block text-center
            text-[11px] font-medium text-[#b08d57]
            underline-offset-4 hover:underline
            md:text-xs
          "
        >
          Política de Privacidade
        </a>
      </div>
    </div>
  );
}
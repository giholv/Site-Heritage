import { buildWhatsAppLink } from "./whatsapp";

export function WhatsAppFloatingButton({ orderCode }: { orderCode?: string }) {
  const href = buildWhatsAppLink({ orderCode });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="
        fixed right-4 bottom-[142px] z-[9999]
        flex h-12 w-12 items-center justify-center
        rounded-full
        bg-[#2b554e]
        text-white
        shadow-[0_12px_32px_rgba(43,85,78,0.24)]
        transition hover:scale-105 hover:brightness-95 active:scale-95

        md:right-5 md:bottom-5
        md:h-14 md:w-14
      "
    >
      <svg
        viewBox="0 0 32 32"
        width="24"
        height="24"
        fill="white"
        aria-hidden="true"
        className="md:h-[26px] md:w-[26px]"
      >
        <path d="M19.11 17.53c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.34-.81-.72-1.36-1.6-1.52-1.87-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.44-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.64 1.11 2.82.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
        <path d="M26.67 5.33A14.88 14.88 0 0 0 16.02 1C7.74 1 1 7.73 1 16.01c0 2.65.69 5.24 2 7.52L1 31l7.68-2.01a15 15 0 0 0 7.34 1.87h.01c8.28 0 15.01-6.73 15.01-15.01 0-4.01-1.56-7.78-4.37-10.52zM16.03 28.3h-.01a12.42 12.42 0 0 1-6.33-1.73l-.45-.27-4.56 1.2 1.22-4.44-.3-.46a12.4 12.4 0 0 1-1.9-6.59C3.7 9.17 9.17 3.7 16.03 3.7c3.31 0 6.41 1.29 8.74 3.61a12.28 12.28 0 0 1 3.62 8.74c0 6.86-5.47 12.25-12.36 12.25z" />
      </svg>
    </a>
  );
}
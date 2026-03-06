const PHONE = import.meta.env.VITE_WHATSAPP_NUMBER as string;

export function buildWhatsAppLink(opts?: { orderCode?: string; topic?: string }) {
  const order = opts?.orderCode ? `Meu pedido é #${opts.orderCode}. ` : "";
  const topic = opts?.topic ? `Assunto: ${opts.topic}. ` : "Preciso de ajuda com: ";
  const msg = `Olá! ${order}${topic}`;

  return `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
}
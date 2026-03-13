import React from "react";
import { Phone, MapPin, Instagram, ArrowRight, Clock3, ShieldCheck, RefreshCcw, Gem } from "lucide-react";

const Contact: React.FC = () => {
  return (
    <section id="contact" className="py-20 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-stretch">
          {/* BLOCO PRINCIPAL */}
          <div className="bg-white rounded-[28px] border border-[#2b554e]/10 shadow-sm p-8 md:p-10 flex flex-col justify-between">
            <div>
              <span className="inline-block text-xs tracking-[0.22em] uppercase text-[#b08d57] font-semibold mb-4">
                Atendimento
              </span>

              <h2 className="text-3xl md:text-5xl font-semibold text-[#2b554e] leading-tight">
                Fale com a <span className="text-[#b08d57]">Caléa</span>
              </h2>

              <p className="mt-4 text-base md:text-lg text-[#2b554e]/72 max-w-xl">
                Dúvidas sobre banho, tamanhos, trocas ou envio? Nosso atendimento
                é rápido e direto.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/5511997946257?text=Olá! Preciso de ajuda com meu pedido."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-[#2b554e] px-6 py-3 text-[#FCFAF6] font-semibold hover:bg-[#23463f] transition"
                >
                  Falar no WhatsApp
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>

                <a
                  href="#faq"
                  className="inline-flex items-center justify-center rounded-xl border border-[#2b554e]/15 px-6 py-3 text-[#2b554e] font-semibold hover:bg-[#2b554e]/5 transition"
                >
                  Ver perguntas frequentes
                </a>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#f7f3ea] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-[#b08d57]" />
                  <p className="font-semibold text-[#2b554e]">Materiais e banho</p>
                </div>
                <p className="text-sm text-[#2b554e]/70">
                  Tire dúvidas sobre durabilidade, cuidados e composição das peças.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f3ea] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCcw className="h-5 w-5 text-[#b08d57]" />
                  <p className="font-semibold text-[#2b554e]">Trocas e devoluções</p>
                </div>
                <p className="text-sm text-[#2b554e]/70">
                  Saiba prazos, condições e como solicitar atendimento.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f3ea] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Gem className="h-5 w-5 text-[#b08d57]" />
                  <p className="font-semibold text-[#2b554e]">Tamanhos</p>
                </div>
                <p className="text-sm text-[#2b554e]/70">
                  Ajuda para escolher anéis, pulseiras e colares com mais segurança.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f3ea] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Clock3 className="h-5 w-5 text-[#b08d57]" />
                  <p className="font-semibold text-[#2b554e]">Envios e prazos</p>
                </div>
                <p className="text-sm text-[#2b554e]/70">
                  Informações sobre postagem, rastreio e acompanhamento do pedido.
                </p>
              </div>
            </div>
          </div>

          {/* COLUNA LATERAL */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#2b554e] rounded-[28px] shadow-sm p-8 text-[#FCFAF6]">
              <h3 className="text-2xl font-semibold mb-6">Canais de contato</h3>

              <div className="space-y-5">
                <a
                  href="https://wa.me/5511997946257?text=Olá! Preciso de ajuda."
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <Phone className="h-6 w-6 text-[#e7d3a8] mt-0.5" />
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <p className="text-[#FCFAF6]/85 group-hover:text-white">
                      +55 (11) 99794-6257
                    </p>
                  </div>
                </a>

                <a
                  href="https://www.instagram.com/calea.blanc/?utm_source=ig_web_button_share_sheet"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <Instagram className="h-6 w-6 text-[#e7d3a8] mt-0.5" />
                  <div>
                    <p className="font-semibold">Instagram</p>
                    <p className="text-[#FCFAF6]/85 group-hover:text-white">
                      @calea.blanc
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-[#e7d3a8] mt-0.5" />
                  <div>
                    <p className="font-semibold">Localização</p>
                    <p className="text-[#FCFAF6]/85">
                      Sorocaba – SP
                      <br />
                      Atendimento online
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[28px] border border-[#2b554e]/10 shadow-sm p-8">
              <h3 className="text-xl font-semibold text-[#2b554e] mb-4">
                Horário de atendimento
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#2b554e]/70">Segunda a sexta</span>
                  <span className="font-semibold text-[#2b554e]">09:00–18:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2b554e]/70">Sábado</span>
                  <span className="font-semibold text-[#2b554e]">Fechado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2b554e]/70">Domingo</span>
                  <span className="font-semibold text-[#2b554e]">Fechado</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-[#f7f3ea] p-4">
                <p className="text-sm text-[#2b554e]/75">
                  Resposta em horário comercial. Mensagens enviadas fora do período são
                  respondidas no próximo atendimento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
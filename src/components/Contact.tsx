import React, { useState } from "react";
import { Mail, Phone, MapPin, ArrowRight, Instagram } from "lucide-react";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const Contact: React.FC = () => {
  const [formValues, setFormValues] = useState<FormValues>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // aqui você pluga o envio real (WhatsApp, EmailJS, Formspree, etc.)
    console.log("Contato enviado:", formValues);

    setFormSubmitted(true);
  };

  return (
    <section id="contact" className="py-20 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e] mb-3">
            Fale com a <span className="text-[#b08d57]">Caléa</span>
          </h2>
          <div className="h-[2px] w-24 bg-[#b08d57] mx-auto mb-4 rounded-full" />
          <p className="text-base md:text-lg text-[#2b554e]/75">
            Dúvidas sobre banho, Prata 925, tamanhos ou troca? A gente responde rápido.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Form */}
          <div className="bg-white/85 rounded-2xl border border-[#2b554e]/10 shadow-sm p-8">
            {formSubmitted ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2b554e]/10 text-[#2b554e] mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#2b554e] mb-2">
                  Mensagem enviada!
                </h3>
                <p className="text-[#2b554e]/70 mb-5">
                  Recebemos seu contato e já vamos te responder.
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className="text-[#b08d57] hover:underline font-semibold"
                  type="button"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-[#2b554e] mb-1"
                  >
                    Seu nome
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formValues.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-[#2b554e]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b08d57]/35"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-[#2b554e] mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formValues.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-[#2b554e]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b08d57]/35"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-semibold text-[#2b554e] mb-1"
                    >
                      WhatsApp (opcional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formValues.phone}
                      onChange={handleChange}
                      placeholder="(11) 9xxxx-xxxx"
                      className="w-full px-4 py-2.5 border border-[#2b554e]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b08d57]/35"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-[#2b554e] mb-1"
                  >
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formValues.message}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Tenho alergia, qual material? Como cuidar do banho? Qual prazo de troca?"
                    className="w-full px-4 py-2.5 border border-[#2b554e]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b08d57]/35"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#2b554e] hover:bg-[#23463f] text-[#FCFAF6] font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-md flex items-center justify-center"
                >
                  Enviar mensagem
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>

                <p className="text-xs text-[#2b554e]/60 text-center">
                  Ao enviar, você concorda em ser contatada para retorno do atendimento.
                </p>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div className="bg-[#2b554e] rounded-2xl shadow-sm p-8 text-[#FCFAF6]">
              <h3 className="text-2xl font-semibold mb-6">Contato</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 text-[#e7d3a8]" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a
                      href="mailto:contato@heritage.com"
                      className="text-[#FCFAF6]/85 hover:text-white"
                    >
                      contato@calea.com.br
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 text-[#e7d3a8]" />
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <a
                      href="tel:+5511980000000"
                      className="text-[#FCFAF6]/85 hover:text-white"
                    >
                      +55 (11) 98000-0000
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Instagram className="h-6 w-6 text-[#e7d3a8]" />
                  <div>
                    <p className="font-semibold">Instagram</p>
                    <a
                      href="https://www.instagram.com/calea.blanc/?utm_source=ig_web_button_share_sheet"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#FCFAF6]/85 hover:text-white"
                    >
                      @calea.blanc
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-[#e7d3a8]" />
                  <div>
                    <p className="font-semibold">Localização</p>
                    <p className="text-[#FCFAF6]/85">
                      Sorocaba – SP
                      <br />
                      (atendimento online)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/85 rounded-2xl border border-[#2b554e]/10 shadow-sm p-8">
              <h3 className="text-xl font-semibold text-[#2b554e] mb-4">
                Horário de atendimento
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#2b554e]/70">Segunda a sexta</span>
                  <span className="font-semibold text-[#2b554e]">09:00–18:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2b554e]/70">Sábado</span>
                  <span className="font-semibold text-[#2b554e]">10:00–14:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2b554e]/70">Domingo</span>
                  <span className="font-semibold text-[#2b554e]">Fechado</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#2b554e]/10">
                <p className="text-sm text-[#2b554e]/70">
                  Resposta em horário comercial. Mensagens fora do horário são respondidas no próximo período.
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

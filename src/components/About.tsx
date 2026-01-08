import React from "react";
import { Gem, ShieldCheck, Sparkles, HeartHandshake } from "lucide-react";

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ValueCard: React.FC<ValueCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-white/85 rounded-2xl border border-[#2b554e]/10 shadow-sm p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="rounded-2xl bg-[#2b554e]/10 w-14 h-14 flex items-center justify-center mb-4 mx-auto">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#2b554e] mb-2">{title}</h3>
      <p className="text-sm text-[#2b554e]/70 leading-relaxed">{description}</p>
    </div>
  );
};

const About: React.FC = () => {
  const values = [
    {
      icon: <Sparkles className="h-7 w-7 text-[#2b554e]" />,
      title: "Design que combina com você",
      description:
        "Peças pensadas para o dia a dia: do look básico ao marcante, sem exagero.",
    },
    {
      icon: <Gem className="h-7 w-7 text-[#2b554e]" />,
      title: "Acabamento premium",
      description:
        "Brilho bonito, detalhes bem feitos e cuidado real em cada peça e embalagem.",
    },
    {
      icon: <ShieldCheck className="h-7 w-7 text-[#2b554e]" />,
      title: "Qualidade e segurança",
      description:
        "Transparência nos materiais e padrão de qualidade para você comprar tranquila.",
    },
    {
      icon: <HeartHandshake className="h-7 w-7 text-[#2b554e]" />,
      title: "Experiência sem complicação",
      description:
        "Compra simples, atendimento humano e troca fácil quando precisar.",
    },
  ];

  return (
    <section id="about" className="py-20 bg-[#FCFAF6] scroll-mt-[140px]">
      <div className="container mx-auto px-4 md:px-6">
        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* COLUNA DE TEXTO */}
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold text-[#2b554e] mb-4">
              Sobre nós
            </h2>
            <div className="h-[2px] w-24 bg-[#b08d57] mb-6 rounded-full"></div>

            <p className="text-base md:text-lg text-[#2b554e]/80 mb-5">
              A Héritage nasce da ideia de que joias acompanham fases. Mudam com você,
              refletem quem você é hoje e quem está se tornando.
            </p>

            <p className="text-base md:text-lg text-[#2b554e]/80 mb-5">
              Criamos semijoias e pratas com design atemporal, acabamento cuidadoso e
              brilho que se encaixa no dia a dia — do básico ao marcante, sem exagero.
            </p>

            <p className="text-base md:text-lg text-[#2b554e]/80 mb-8">
              Mais do que acessórios, entregamos escolha, identidade e liberdade para
              se expressar do seu jeito.
            </p>

            {/* “mini stats” (opcional) */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Acabamento premium", value: "Detalhe" },
                { label: "Peças versáteis", value: "Todo dia" },
                { label: "Linha Prata 925", value: "Atemporal" },
                { label: "NOUVEAU", value: "Nova fase" },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/85 border border-[#2b554e]/10 p-4 rounded-xl shadow-sm"
                >
                  <p className="text-[#b08d57] font-semibold text-lg">{stat.value}</p>
                  <p className="text-[#2b554e]/70 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* COLUNA DA IMAGEM */}
          <div className="relative">
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-md border border-[#2b554e]/10 bg-white/70">
              <img
                src="/Dona.jpg"
                alt="Dona Héritage"
                className="w-full h-auto object-contain p-10"
              />
            </div>

            {/* blobs decorativos */}
            <div className="absolute top-1/2 right-0 translate-x-1/4 -translate-y-1/2 w-32 h-32 md:w-48 md:h-48 bg-[#b08d57] rounded-full opacity-20 blur-2xl" />
            <div className="absolute bottom-1/3 left-0 -translate-x-1/4 w-32 h-32 md:w-48 md:h-48 bg-[#2b554e] rounded-full opacity-20 blur-2xl" />
          </div>
        </div>

        {/* VALORES */}
        <div className="mt-16">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h3 className="text-2xl md:text-3xl font-semibold text-[#2b554e] mb-3">
              Nossos valores
            </h3>
            <div className="h-[2px] w-20 bg-[#b08d57] mx-auto mb-4 rounded-full"></div>
            <p className="text-[#2b554e]/75">
              O que guia cada peça, do design ao envio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <ValueCard
                key={index}
                icon={value.icon}
                title={value.title}
                description={value.description}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

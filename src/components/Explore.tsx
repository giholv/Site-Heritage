import React from "react";
import { Smartphone, CalendarCheck2, Clock4, ShoppingBag } from "lucide-react";

const UnifitSolutions: React.FC = () => {
  const items = [
    {
      icon: <CalendarCheck2 className="h-10 w-10 text-primary" />,
      title: "Planos Semanais Econômicos",
      description:
        "Monte seu plano da semana, escolha quantas marmitas quer, combine sabores e pague menos no pacote. Mais previsibilidade, menos gasto e zero preocupação.",
    },
    {
      icon: <ShoppingBag className="h-10 w-10 text-primary" />,
      title: "Planos Sob Medida",
      description:
        "Planos criados para diferentes rotinas: foco nos estudos, ganho de energia ou leveza no dia. Ajuste conforme seus treinos e horários.",
    },
    {
      icon: <Smartphone className="h-10 w-10 text-primary" />,
      title: "Compra Rápida pelo App",
      description:
        "Faça seu pedido em segundos, escolha sabores, agende horários e finalize tudo em poucos toques — sem complicação.",
    },
    {
      icon: <Clock4 className="h-10 w-10 text-primary" />,
      title: "Retirada Sem Fila",
      description:
        "Receba a confirmação, passe no ponto Unifit dentro da faculdade e retire sua marmita em segundos. Mais tempo para viver, menos tempo esperando.",
    },
  ];

  return (
    <section id="solutions" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Explore a praticidade da Unifit
          </h2>

          <div className="h-1 w-20 bg-accent mx-auto mb-6"></div>

          <p className="text-lg text-gray-600">
            Planos semanais econômicos + compra rápida pelo app, feitos para o ritmo universitário.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="rounded-full bg-primary bg-opacity-10 w-16 h-16 flex items-center justify-center mb-4 mx-auto">
                {item.icon}
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
                {item.title}
              </h3>

              <p className="text-gray-600 text-center">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UnifitSolutions;

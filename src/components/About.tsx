  import React from 'react';
  import { Award, Users, Globe, Leaf } from 'lucide-react';

  interface ValueCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
  }

  const ValueCard: React.FC<ValueCardProps> = ({ icon, title, description }) => {
    return (
      <div className="flex flex-col items-center text-center p-6">
        <div className="rounded-full bg-primary bg-opacity-10 w-16 h-16 flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    );
  };

  const About: React.FC = () => {
    const values = [
      {
        icon: <Leaf className="h-7 w-7 text-primary" />,
        title: "Praticidade Inteligente",
        description: "Tornamos a alimentação do universitário simples, rápida e sempre acessível — sem perder qualidade."
      },
      {
        icon: <Award className="h-7 w-7 text-primary" />,
        title: "Nutrição de Verdade",
        description: "Cada refeição é pensada para dar energia, foco e bem-estar no ritmo puxado da faculdade."
      },
      {
        icon: <Users className="h-7 w-7 text-primary" />,
        title: "Sustentabilidade Real",
        description: "Usamos processos e embalagens que reduzem impacto, porque cuidar do corpo também é cuidar do mundo."
      },
      {
        icon: <Globe className="h-7 w-7 text-primary" />,
        title: "Excelência no Sabor",
        description: "Fit não precisa ser sem graça. Entregamos refeições equilibradas, gostosas e consistentes todos os dias."
      }
    ];

    return (
    <section id="about" className="py-20 bg-gray-50">
    <div className="container mx-auto px-4 md:px-6">

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* COLUNA DE TEXTO */}
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-4">
            Sobre nós
          </h2>
          <div className="h-1 w-20 bg-accent mb-6"></div>

          <p className="text-lg text-primary-dark mb-6">
            A Unifit nasceu para simplificar a alimentação dos universitários. 
            A rotina é corrida, cheia de prazos, provas e atividades — e encontrar comida saudável,
            rápida e acessível raramente é fácil.
          </p>

          <p className="text-lg text-primary mb-6">
            Por isso criamos uma solução prática, nutritiva e pensada exatamente para quem passa 
            horas estudando: refeições balanceadas, gostosas e prontas para acompanhar o ritmo intenso 
            da vida acadêmica.
          </p>

          <p className="text-lg text-primary-dark mb-8">
            Acreditamos que uma boa alimentação é combustível para corpo e mente. 
            A Unifit não entrega apenas comida — entrega cuidado, saúde e praticidade no dia a dia do universitário.
          </p>

          {/* ESTATÍSTICAS */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: "Refeições servidas", value: "15k+" },
              { label: "Campus atendidos", value: "8+" },
              { label: "Avaliação média", value: "4.9 ★" },
              { label: "Pratos no menu", value: "40+" },
            ].map((stat, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-primary font-bold text-2xl">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DA IMAGEM */}
        <div className="relative">
          <div className="relative z-10 rounded-lg overflow-hidden shadow-xl">
            <img
              src="/Logo3.png"
              alt="logo Unifit"
              className="w-full h-auto"
            />
          </div>

          <div className="absolute top-1/2 right-0 translate-x-1/4 -translate-y-1/2 
                          w-32 h-32 md:w-48 md:h-48 bg-accent rounded-full 
                          opacity-30 blur-2xl">
          </div>

          <div className="absolute bottom-1/3 left-0 -translate-x-1/4
                          w-32 h-32 md:w-48 md:h-48 bg-primary rounded-full 
                          opacity-30 blur-2xl">
          </div>
        </div>
      </div>

  {/* VALORES */}
<div className="mt-20 py-16 bg-gray-50 rounded-2xl">
  <div className="text-center max-w-3xl mx-auto mb-12">
    <h2 className="text-3xl font-bold text-primary-dark mb-4">Nossos Valores</h2>
    <div className="h-1 w-16 bg-accent mx-auto mb-6"></div>
    <p className="text-lg text-primary-dark">
      Os princípios que guiam nossa missão.
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
  }

  export default About;
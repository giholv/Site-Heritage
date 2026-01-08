import React from 'react';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
  const handleExploreClick = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-blue-600">
      {/* Imagem de fundo com overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-primary opacity-70" />
        <img  
          src="/Cidade.png.jpg" 
          alt="Cidade em fundo ilustrativo" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 md:px-6 relative z-10 pt-24 md:pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Texto principal */}
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              <span className="block">Energia para</span> 
              <span className="block mt-2">seus estudos</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-lg">
              Nutrição prática para o seu dia a dia universitário.            </p>

            {/* Botão único */}
            <div className="flex">
              <button 
                onClick={handleExploreClick}
                className="bg-accent hover:bg-accent-dark text-white font-semibold py-3 px-6 rounded-md transition-all transform hover:scale-105 flex items-center justify-center"
              >
                Explore o Menu
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Bloco com estatísticas */}
          <div className="hidden md:block">
            <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg border border-white border-opacity-20 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <h3 className="text-white text-xl font-semibold mb-3"></h3>
              <div className="space-y-4">
                {[
                  { label: "Refeições servidas", value: "15k+" },
                  { label: "Campus atendidos", value: "8+" },
                  { label: "Avaliação média", value: "4.9 ★" },
                  { label: "Pratos no menu", value: "40+" },
                ].map((stat, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-200">{stat.label}</span>
                    <span className="text-accent font-bold text-gray-200">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divisor ondulado */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full">
          <path 
            fill="#f9fafb" 
            fillOpacity="1" 
            d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;

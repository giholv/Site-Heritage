import React, { useState, useEffect } from 'react';

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  position: string;
  organization: string;
  image: string;
}

const Testimonials: React.FC = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      quote:
        "A Unifit salvou minha rotina. Agora eu como bem todos os dias sem perder tempo e sem gastar mais do que posso.",
      author: "Giovanna Pires",
      position: "Estudante de Data Science",
      organization: "FIAP",
      image: "/giovanna-pires.png"
    },
    {
      id: 2,
      quote:
        "As marmitas proteicas melhoraram meu desempenho no treino e ainda retiro tudo rapidinho dentro da faculdade.",
      author: "Gabriel Santos",
      position: "Engenharia da Computação",
      organization: "Anhanguera",
      image: "/gabriel-santos.png"
    },
    {
      id: 3,
      quote:
        "Eu vivia pedindo delivery caro e demorando muito. Com a Unifit, retiro em segundos e economizo todo mês.",
      author: "Júlia Ribeiro",
      position: "Publicidade",
      organization: "UNIP",
      image: "/julia-ribeiro.png"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section id="testimonials" className="py-20 bg-gray-200"> 
      {/* FUNDO CINZA AQUI */}
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2E3F55] mb-4">
            Depoimentos de quem vive a rotina Unifit
          </h2>
          <div className="h-1 w-20 bg-[#2E3F55] mx-auto"></div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* CARD AZUL UNIFIT */}
          <div className="relative bg-[#2E3F55] rounded-lg p-8 shadow-lg">

            {/* bolinhas */}
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      currentTestimonial === index ? 'bg-white' : 'bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Carrossel */}
            <div className="relative overflow-hidden h-[260px]">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className={`absolute w-full transition-all duration-500 ${
                    index === currentTestimonial
                      ? 'opacity-100 translate-x-0'
                      : index < currentTestimonial
                      ? 'opacity-0 -translate-x-full'
                      : 'opacity-0 translate-x-full'
                  }`}
                >
                  <div className="text-center px-4 flex flex-col items-center">

                    {/* Foto */}
                    <img
                      src={testimonial.image}
                      alt={testimonial.author}
                      className="w-20 h-20 rounded-full object-cover mb-4 shadow-lg border-2 border-white"
                    />

                    <blockquote className="text-xl italic text-white mb-6">
                      "{testimonial.quote}"
                    </blockquote>

                    <p className="text-lg font-semibold text-white">
                      {testimonial.author}
                    </p>

                    <p className="text-gray-300">
                      {testimonial.position}, {testimonial.organization}
                    </p>

                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;

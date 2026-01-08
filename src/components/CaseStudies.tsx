import React, { useState } from 'react';

interface CaseStudy {
  id: number;
  title: string;
  location: string;
  image: string;
  challenge: string;
  solution: string;
  result: string;
}

const CaseStudies: React.FC = () => {
  const [activeCase, setActiveCase] = useState<number>(1);

  const caseStudies: CaseStudy[] = [
    {
      id: 1,
      title: "Organizando a alimentação em rotina de plantão",
      location: "Maria Eduarda • Enfermagem • UNIP",
      image: "/case-unifit-1.png",
      challenge:
        "Com plantão, estágio e aulas, Maria vivia pulando refeições ou comendo qualquer lanche rápido, se sentia cansada e gastava mais do que podia.",
      solution:
        "Ela contratou um plano semanal da Unifit com marmitas já organizadas por dia, retirando tudo dentro da faculdade nos intervalos entre aulas.",
      result:
        "Passou a se alimentar bem todos os dias, sentiu mais energia nos plantões e ainda reduziu o gasto mensal com comida."
    },
    {
      id: 2,
      title: "Desempenho melhor no treino e nos estudos",
      location: "Gabriel Santos • Engenharia da Computação • Anhanguera",
      image: "/case-unifit-2.png",
      challenge:
        "Gabriel saía da aula direto para o treino, comia mal no meio do caminho e não conseguia manter uma rotina alimentar alinhada com os objetivos de treino.",
      solution:
        "Começou a usar as marmitas proteicas da Unifit, fazendo a compra rápida pelo app e retirando as refeições prontas dentro do campus.",
      result:
        "Teve melhora no desempenho nos treinos, começou a descansar melhor e ganhou tempo no dia a dia sem depender de fast food."
    },
    {
      id: 3,
      title: "Economia com plano semanal e fim do delivery caro",
      location: "Júlia Ribeiro • Publicidade • UNIP",
      image: "/case-unifit-3.png",
      challenge:
        "Júlia vivia pedindo delivery na hora do desespero, gastando muito e esperando demais. Em vários dias acabava nem comendo direito.",
      solution:
        "Ela migrou para um plano semanal econômico da Unifit, com marmitas programadas para os dias de aula e retirada em poucos segundos no ponto Unifit.",
      result:
        "Passou a ter alimentação regular, reduziu significativamente os gastos com delivery e ganhou praticidade na correria da faculdade."
    },
    {
      id: 4,
      title: "Planejamento alimentar para focar no TCC",
      location: "Pedro Carvalho • Administração • UNIFESP",
      image: "/ .png",
      challenge:
        "Com o TCC e estágio, Pedro não queria perder tempo pensando em almoço e jantar, mas também não queria descuidar da saúde.",
      solution:
        "Fechou um plano com marmitas fixas durante a semana e algumas opções leves para o fim de semana, tudo pela plataforma da Unifit.",
      result:
        "Conseguiu manter foco total no TCC, ficou menos ansioso com comida e teve mais clareza financeira sobre quanto gastava por mês."
    }
  ];

  return (
    <section id="case-studies" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Histórias de Sucesso Unifit
          </h2>
          <div className="h-1 w-20 bg-accent mx-auto mb-6"></div>
          <p className="text-lg text-gray-600">
            Como universitários transformaram a rotina com planos semanais, marmitas prontas e compra rápida pelo app.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navegação entre os cases */}
          <div className="lg:w-1/3">
            <div className="bg-gray-50 rounded-lg p-4">
              {caseStudies.map((caseStudy) => (
                <div
                  key={caseStudy.id}
                  className={`p-4 mb-3 rounded-md cursor-pointer transition-colors ${
                    activeCase === caseStudy.id
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveCase(caseStudy.id)}
                >
                  <h3
                    className={`font-semibold ${
                      activeCase === caseStudy.id ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {caseStudy.title}
                  </h3>
                  <p
                    className={`text-sm ${
                      activeCase === caseStudy.id ? 'text-gray-100' : 'text-gray-500'
                    }`}
                  >
                    {caseStudy.location}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detalhes do case selecionado */}
          {caseStudies.map(
            (caseStudy) =>
              caseStudy.id === activeCase && (
                <div key={caseStudy.id} className="lg:w-2/3">
                  <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                    <div className="h-64 overflow-hidden">
                      <img
                        src={caseStudy.image}
                        alt={caseStudy.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-100"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">
                        {caseStudy.title}
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-primary font-semibold mb-1">Desafio</h4>
                          <p className="text-gray-600">{caseStudy.challenge}</p>
                        </div>

                        <div>
                          <h4 className="text-primary font-semibold mb-1">Como a Unifit ajudou</h4>
                          <p className="text-gray-600">{caseStudy.solution}</p>
                        </div>

                        <div>
                          <h4 className="text-primary font-semibold mb-1">Resultado</h4>
                          <p className="text-gray-600">{caseStudy.result}</p>
                        </div>
                      </div>

                      <button className="mt-6 bg-accent hover:bg-accent-dark text-white font-semibold py-2 px-4 rounded-md transition-all hover:shadow-md">
                        Ver detalhes do plano
                      </button>
                    </div>
                  </div>
                </div>
              )
          )}
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;

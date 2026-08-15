import React from "react";

const items = [
  "USE MUITO",
  "BRILHE SEM MEDO",
  "ENVIO PARA TODO BRASIL",
  "TROCA FACILITADA · CONSULTE O REGULAMENTO",
];

export default function BenefitsBar() {
  const content = [...items, ...items];

  return (
    <section className="overflow-hidden bg-[#173a35] py-4">
      <div className="benefits-marquee flex w-max items-center">
        {content.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex shrink-0 items-center"
          >
            <span className="whitespace-nowrap px-8 text-[12px] font-medium uppercase tracking-[0.16em] text-[#FCFAF6] md:px-12 md:text-[13px]">
              {item}
            </span>

            <span className="text-[10px] text-[#b08d57]">
              ✦
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes benefitsMarquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        .benefits-marquee {
          animation: benefitsMarquee 28s linear infinite;
        }

        .benefits-marquee:hover {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .benefits-marquee {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
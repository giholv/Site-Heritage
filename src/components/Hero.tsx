import React, { useEffect, useMemo, useState } from "react";

const Hero: React.FC = () => {
  const banners = useMemo(
    () => [
      { src: "/Banner1.jpg", alt: "Banner semijoias 1" },
      { src: "/Banner2.jpg", alt: "Banner semijoias 2" },
      { src: "/Banner3.jpg", alt: "Banner semijoias 3" },
    ],
    []
  );

  const [idx, setIdx] = useState(0);

  // auto-slide (mobile e desktop também funciona, mas no desktop nem aparece)
  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((v) => (v + 1) % banners.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [banners.length]);

  return (
    <section id="home" className="bg-[#FCFAF6] pt-[140px] sm:pt-[150px] md:pt-[180px]">
      <div className="container mx-auto px-4 md:px-6">
        {/* MOBILE: carousel */}
        <div className="md:hidden">
          <div className="relative overflow-hidden rounded-2xl">
            <div className="h-[420px]">
              {banners.map((b, i) => (
                <img
                  key={b.src}
                  src={b.src}
                  alt={b.alt}
                  className={[
                    "absolute inset-0 block w-full h-full object-cover rounded-2xl transition-opacity duration-700",
                    i === idx ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ))}
            </div>

            {/* dots */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir para banner ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={[
                    "h-2 w-2 rounded-full transition-all",
                    i === idx ? "bg-black/70 w-5" : "bg-black/25",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>

        {/* DESKTOP: grid 3 colunas */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          {banners.map((b) => (
            <div key={b.src} className="overflow-hidden rounded-2xl">
              <img
                src={b.src}
                alt={b.alt}
                className="block w-full h-[560px] object-cover rounded-2xl"
                loading="eager"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;

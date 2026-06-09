import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Banner = { src: string; alt: string };

const BUCKET = "product-images";
const FOLDER = "banners";

function getPublicUrl(path: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const FALLBACK: Banner[] = [
  { src: "/Banner4.jpg", alt: "Banner semijoias 1" },
  { src: "/Banner6.jpg", alt: "Banner semijoias 2" },
  { src: "/Banner7.jpg", alt: "Banner semijoias 3" },
];

const Hero: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>(FALLBACK);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadBanners() {
      const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
        limit: 10,
        sortBy: { column: "name", order: "asc" },
      });

      if (error || !data?.length || !active) return;

      const mapped = data
        .filter((file) => /\.(png|jpg|jpeg|webp|avif)$/i.test(file.name))
        .map((file) => ({
          src: getPublicUrl(`${FOLDER}/${file.name}`),
          alt: file.name,
        }));

      if (mapped.length && active) setBanners(mapped);
    }

    loadBanners();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (idx >= banners.length) setIdx(0);
  }, [banners.length, idx]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const id = window.setInterval(() => {
      setIdx((v) => (v + 1) % banners.length);
    }, 4000);

    return () => window.clearInterval(id);
  }, [banners.length]);

  const currentBanner = banners[idx];

  const nextBanner = useMemo(() => {
    if (banners.length <= 1) return null;
    return banners[(idx + 1) % banners.length];
  }, [banners, idx]);

  useEffect(() => {
    if (!nextBanner?.src) return;

    const img = new Image();
    img.src = nextBanner.src;
  }, [nextBanner]);

  const prev = () => {
    setIdx((v) => (v - 1 + banners.length) % banners.length);
  };

  const next = () => {
    setIdx((v) => (v + 1) % banners.length);
  };

  return (
    <section id="home" className="bg-[#FCFAF6] -mt-6 md:mt-0">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="relative h-[400px] md:h-[560px]">
            <img
              key={currentBanner.src}
              src={currentBanner.src}
              alt={currentBanner.alt}
              className="block h-full w-full rounded-2xl object-cover"
              style={{
                objectPosition: idx === 0 ? "50% 35%" : "50% 30%",
              }}
              loading="eager"
              decoding="async"
              width={1600}
              height={700}
            />
          </div>

          {banners.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Banner anterior"
                onClick={prev}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full bg-white/85 text-black shadow-md"
              >
                ‹
              </button>

              <button
                type="button"
                aria-label="Próximo banner"
                onClick={next}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full bg-white/85 text-black shadow-md"
              >
                ›
              </button>

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
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
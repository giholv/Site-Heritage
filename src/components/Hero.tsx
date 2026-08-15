import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Banner = { src: string; alt: string };

const BUCKET = "product-images";

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
      const { data, error } = await supabase
        .from("hero_banners")
        .select("image_path, alt")
        .eq("active", true)
        .order("position", { ascending: true });

      if (error) {
        console.error("Erro ao carregar banners:", error.message);
        return;
      }

      if (!data?.length || !active) return;

      const mapped = data
        .filter((banner) => /\.(webp|avif)$/i.test(banner.image_path))
        .map((banner) => ({
          src: getPublicUrl(banner.image_path),
          alt: banner.alt || "Banner Caléa Blanc",
        }));

      if (mapped.length && active) {
        setBanners(mapped);
      }
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
    }, 6000);

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
    <section id="home" className="relative bg-[#FCFAF6]">
      <div className="relative w-full overflow-hidden">
        <div className="relative h-[520px] md:h-[680px] lg:h-[760px]">
          <img
            key={currentBanner.src}
            src={currentBanner.src}
            alt={currentBanner.alt}
            className="block h-full w-full object-cover"
            style={{ objectPosition: "50% 30%" }}
            loading="eager"
            {...({ fetchpriority: "high" } as any)}
            decoding="async"
            width={1600}
            height={900}
          />
        </div>

        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={prev}
              className="
                absolute left-5 top-1/2 hidden
                h-11 w-11 -translate-y-1/2
                items-center justify-center rounded-full
                border border-white/30
                bg-white/75 text-[#173a35]
                shadow-md backdrop-blur-md
                transition hover:bg-white
                md:flex
              "
            >
              ‹
            </button>

            <button
              type="button"
              aria-label="Próximo banner"
              onClick={next}
              className="
                absolute right-5 top-1/2 hidden
                h-11 w-11 -translate-y-1/2
                items-center justify-center rounded-full
                border border-white/30
                bg-white/75 text-[#173a35]
                shadow-md backdrop-blur-md
                transition hover:bg-white
                md:flex
              "
            >
              ›
            </button>

            <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir para banner ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={[
                    "h-[6px] rounded-full transition-all duration-300",
                    i === idx ? "w-8 bg-white" : "w-[6px] bg-white/45",
                  ].join(" ")}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Hero;
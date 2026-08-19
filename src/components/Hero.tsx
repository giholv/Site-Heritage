import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

type Banner = {
  src: string;
  mobileSrc?: string;
  alt: string;
  href?: string;
};

const BUCKET = "product-images";

function getPublicUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

const FIRST_BANNER: Banner = {
  src: "/banner-local-1.png",
  mobileSrc: "/14.webp",
  alt: "Banner semijoias 1",
  href: "/joias?colecao=calea-nouveau",
};

export default function Hero() {
  const [banners, setBanners] = useState<Banner[]>([FIRST_BANNER]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadBanners() {
      const { data, error } = await supabase
        .from("hero_banners")
        .select("image_path, mobile_image_path, alt, link_url")
        .eq("active", true)
        .order("position", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Erro ao carregar banners:", error.message);
        return;
      }

      if (!data?.length) return;

      const mapped: Banner[] = data
        .filter((banner) => banner.image_path)
        .map((banner) => {
          const src = getPublicUrl(banner.image_path);

          return {
            src,
            mobileSrc: banner.mobile_image_path
              ? getPublicUrl(banner.mobile_image_path)
              : src,
            alt: banner.alt || "Banner Caléa Blanc",
            href: banner.link_url || undefined,
          };
        });

      if (mapped.length && active) {
        const others = mapped.filter(
          (banner) => banner.src !== FIRST_BANNER.src
        );

        setBanners([
          FIRST_BANNER,
          ...others,
        ]);
      }
    }

    loadBanners();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;

    const id = window.setInterval(() => {
      setIdx((value) => (value + 1) % banners.length);
    }, 6000);

    return () => window.clearInterval(id);
  }, [banners.length]);

  const currentBanner = banners[idx];

  const nextBanner = useMemo(() => {
    if (banners.length <= 1) return null;

    return banners[(idx + 1) % banners.length];
  }, [banners, idx]);

  useEffect(() => {
    if (!nextBanner) return;

    const desktop = new Image();
    desktop.src = nextBanner.src;

    if (
      nextBanner.mobileSrc &&
      nextBanner.mobileSrc !== nextBanner.src
    ) {
      const mobile = new Image();
      mobile.src = nextBanner.mobileSrc;
    }
  }, [nextBanner]);

  function prev() {
    setIdx(
      (value) =>
        (value - 1 + banners.length) % banners.length
    );
  }

  function next() {
    setIdx(
      (value) =>
        (value + 1) % banners.length
    );
  }

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-[#FCFAF6]"
    >
      <div
        className="
    relative
    w-full
    overflow-hidden

    aspect-[16/9]

    md:aspect-auto
    md:h-[620px]
    lg:h-[720px]
    xl:h-[760px]
  "
      >
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={
              currentBanner.mobileSrc ??
              currentBanner.src
            }
          />

          <img
            src={currentBanner.src}
            alt={currentBanner.alt}
            width={1600}
            height={900}
            loading="eager"
            {...({ fetchpriority: "high" } as any)}
            decoding="async"
            className="block h-full w-full object-cover"
            style={{
              objectPosition: "center center",
            }}
          />
        </picture>

        {currentBanner.href && (
          <Link
            to={currentBanner.href}
            aria-label={currentBanner.alt}
            className="absolute inset-0 z-[5]"
          />
        )}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={prev}
              className="
                absolute
                left-3
                top-1/2
                z-10
                flex
                h-9
                w-9
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                border
                border-white/40
                bg-white/80
                text-[24px]
                text-[#173a35]
                shadow-md
                backdrop-blur-md
                transition
                hover:bg-white
                md:left-5
                md:h-11
                md:w-11
              "
            >
              ‹
            </button>

            <button
              type="button"
              aria-label="Próximo banner"
              onClick={next}
              className="
                absolute
                right-3
                top-1/2
                z-10
                flex
                h-9
                w-9
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                border
                border-white/40
                bg-white/80
                text-[24px]
                text-[#173a35]
                shadow-md
                backdrop-blur-md
                transition
                hover:bg-white
                md:right-5
                md:h-11
                md:w-11
              "
            >
              ›
            </button>

            <div
              className="
                absolute
                bottom-4
                left-0
                right-0
                z-10
                flex
                items-center
                justify-center
                gap-2
                md:bottom-5
              "
            >
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir para banner ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={[
                    "h-[6px] rounded-full transition-all duration-300",
                    i === idx
                      ? "w-8 bg-white"
                      : "w-[6px] bg-white/45",
                  ].join(" ")}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
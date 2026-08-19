const images = [
  "/calea-girl-01.png",
  "/calea-girl-02.png",
  "/calea-girl-03.png",
  "/calea-girl-04.png",
];

export default function CaleaGirlsSection() {
  return (
    <section className="bg-[#FCFAF6] py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1540px] px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
              #CALÉAGIRLS
            </p>

            <h2 className="mt-3 font-serif text-[34px] font-normal leading-[1.03] tracking-[-0.03em] text-[#2b554e] sm:text-[40px] md:text-[50px]">
              Nosso universo.
              <span className="ml-2 italic text-[#8a7660]">
                A vida real.
              </span>
            </h2>
          </div>

          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#2b554e]"
          >
            Ver mais no Instagram

            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>

        <div
          className="
            mt-8
            flex
            gap-3
            overflow-x-auto
            pb-3
            snap-x
            snap-mandatory
            scroll-smooth
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden

            md:grid
            md:grid-cols-4
            md:gap-5
            md:overflow-visible
            md:pb-0
          "
        >
          {images.map((image, index) => (
            <a
  key={image}
  href="https://www.instagram.com/"
  target="_blank"
  rel="noreferrer"
className="
  group
  relative
 w-[64vw]
  flex-none
  snap-start
  overflow-hidden
  bg-[#eee8df]

 sm:w-[50vw]

  md:w-auto
"
>
              <img
                src={image}
                alt={`Caléa Girls ${index + 1}`}
                loading="lazy"
              className="
  aspect-[4/5]
  w-full
  object-cover
  transition-transform
  duration-700
  ease-out
  group-hover:scale-[1.025]

  md:aspect-[3/4]
"
              />

              <div className="absolute inset-0 bg-[#2b554e]/0 transition-colors duration-500 group-hover:bg-[#2b554e]/5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
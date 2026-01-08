import React from 'react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="bg-[#f3f0e0] pt-[160px] md:pt-[170px]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="overflow-hidden rounded-2xl">
            <img
              src="/Banner1.jpg"
              alt="Banner semijoias 1"
              className="block w-full h-[420px] md:h-[560px] object-cover rounded-2xl"
              loading="eager"
            />
          </div>

          <div className="overflow-hidden rounded-2xl">
            <img
              src="/Banner2.jpg"
              alt="Banner semijoias 2"
              className="block w-full h-[420px] md:h-[560px] object-cover rounded-2xl"
              loading="eager"
            />
          </div>

          <div className="overflow-hidden rounded-2xl">
            <img
              src="/Banner3.jpg"
              alt="Banner semijoias 3"
              className="block w-full h-[420px] md:h-[560px] object-cover rounded-2xl"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

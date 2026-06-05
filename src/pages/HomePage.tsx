import { useEffect, lazy, Suspense } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Footer from "../components/Footer";

const EncontreSuaJoia = lazy(() => import("../components/findyourjewelry"));
const Semijoias = lazy(() => import("../components/Semijoias"));
const About = lazy(() => import("../components/About"));
const Faq = lazy(() => import("../components/FAQ"));
const Contact = lazy(() => import("../components/Contact"));

function SectionLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="h-32 animate-pulse rounded-3xl bg-[#eee7dc]" />
    </div>
  );
}

export default function HomePage() {
  useEffect(() => {
    document.title = "Caléa - SemiJoias";
  }, []);

  return (
    <div className="antialiased">
      <Header />

      <main className="pt-[160px] md:pt-[180px]">
        <Hero />

        <Suspense fallback={<SectionLoading />}>
          <EncontreSuaJoia />
          <Semijoias />
          <About />
          <Faq />
          <Contact />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
import { useEffect, lazy, Suspense } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import BenefitsBar from "../components/BenefitsBar_Calea";

const EncontreSuaJoia = lazy(() => import("../components/findyourjewelry"));
const Semijoias = lazy(() => import("../components/Semijoias"));
const StyleQuiz = lazy(() => import("../components/StyleQuiz_Calea"));
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
    <div className="min-h-screen bg-[#FCFAF6] antialiased">
      <Header />

      <main className="pt-[96px] md:pt-[108px]">
        <Hero />
        <BenefitsBar />

        <Suspense fallback={<SectionLoading />}>
          <Semijoias />
          <EncontreSuaJoia />
          <StyleQuiz />
          <Faq />
          <Contact />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
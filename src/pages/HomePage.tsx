import { useEffect } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Lancamentos from "../components/Lancamentos";
import PratasCarousel from "../components/Pratas";
import About from "../components/About";
import Faq from "../components/FAQ";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import Semijoias from "../components/Semijoias";

export default function HomePage() {
  useEffect(() => {
    document.title = "Caléa - SemiJoias";
  }, []);

  return (
    <div className="antialiased">
      <Header />
      <main>
        <Hero />
        <Lancamentos />
        <PratasCarousel />
        <Semijoias />
        <About />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

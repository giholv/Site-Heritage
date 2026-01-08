import React, { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Lancamentos from './components/Lancamentos';
import Praticidades from './components/Praticidades';
import PratasCarousel from './components/Pratas';
import About from './components/About';
import Faq from './components/FAQ';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Semijoias from './components/Semijoias';

function App() {
  useEffect(() => {
    document.title = 'Héritage - SemiJoias';

    const handleHashChange = () => {
      const { hash } = window.location;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="antialiased">
      <Header />
      <main>
        <Hero />
        <Lancamentos />
        <PratasCarousel />
        <Semijoias />
        <Praticidades />
        <About />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;

import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import Header from "./components/Header";
import CadastroUsuariosPage from "./pages/cadastro_users";
import LoginPage from "./pages/LoginPage";
import Checkout from "./pages/Checkout";
import CheckoutIdentificacao from "./pages/CheckoutIdentificacao";

function ScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    requestAnimationFrame(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    });
  }, [hash, pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/produto/:slug" element={<ProductPage />} />
           <Route path="/cadastro" element={<CadastroUsuariosPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/carrinho" element={<div className="p-6">Carrinho</div>} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/identificacao" element={<CheckoutIdentificacao />} />
      </Routes>
    </>
  );
}

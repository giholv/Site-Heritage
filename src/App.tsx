import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import CadastroUsuariosPage from "./pages/cadastro_users";
import LoginPage from "./pages/LoginPage";
import Checkout from "./pages/Checkout";
import CheckoutIdentificacao from "./pages/CheckoutIdentificacao";
import JewelryListing from "./pages/JewelryListing";
import CookieBanner from "./components/CookieBanner";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import EsqueciSenhaPage from "./pages/EsqueciSenhaPage";
import RedefinirSenhaPage from "./pages/RedefinirSenhaPage";

// ADMIN
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import { AdminGuard } from "./routes/AdminGuard";
import AdminProductEdit from "./pages/admin/AdminProductEdit";
import AdminProductCreate from "./pages/admin/AdminProductCreate";
import AdminSuppliersPage from "./pages/admin/AdminSuppliers";
import AdminCategoryImagesPage from "./pages/admin/AdminCategoryImagesPage";

import { WhatsAppFloatingButton } from "./components/WhatsAppFloatingButton";

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
  const location = useLocation();
  const hideWhatsApp = location.pathname.startsWith("/admin");
  const hideCookieBanner = location.pathname.startsWith("/admin");

  return (
    <>
      <ScrollToHash />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cadastro" element={<CadastroUsuariosPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/carrinho" element={<div className="p-6">Carrinho</div>} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/identificacao" element={<CheckoutIdentificacao />} />
        <Route path="/joias" element={<JewelryListing />} />
        <Route path="/joias/categoria/:categorySlug" element={<JewelryListing />} />
        <Route path="/joias/colecao/:collectionSlug" element={<JewelryListing />} />
        <Route path="/produto/:slug" element={<ProductPage />} />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />

        <Route path="/admin" element={<AdminGuard />}>node -v
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="produtos" element={<AdminProducts />} />
            <Route path="produtos/novo" element={<AdminProductCreate />} />
            <Route path="produtos/:productId" element={<AdminProductEdit />} />
            <Route path="fornecedores" element={<AdminSuppliersPage />} />
            <Route path="catalogo/imagens" element={<AdminCategoryImagesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>

      {!hideWhatsApp && <WhatsAppFloatingButton />}
      {!hideCookieBanner && <CookieBanner />}
    </>
  );
}
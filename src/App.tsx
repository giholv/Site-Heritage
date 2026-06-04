import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import CadastroUsuariosPage from "./pages/cadastro_users";
import LoginPage from "./pages/LoginPage";
import Checkout from "./pages/Checkout";
import CheckoutIdentificacao from "./pages/CheckoutIdentificacao";
import CheckoutPagamento from "./pages/CheckoutPagamento";
import JewelryListing from "./pages/JewelryListing";
import CookieBanner from "./components/CookieBanner";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import EsqueciSenhaPage from "./pages/EsqueciSenhaPage";
import RedefinirSenhaPage from "./pages/RedefinirSenhaPage";
import ContaPage from "./pages/users/conta_page";
import CheckoutConfirmacao from "./pages/CheckoutConfirmacao";
// ADMIN
import AdminLayout from "./pages/admin/AdminLayout";
import AdminInicio from "./pages/admin/AdminInicio";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";
import AdminProducts from "./pages/admin/AdminProducts";
import { AdminGuard } from "./routes/AdminGuard";
import AdminProductEdit from "./pages/admin/AdminProductEdit";
import AdminProductCreate from "./pages/admin/AdminProductCreate";
import AdminSuppliersPage from "./pages/admin/AdminSuppliers";
import AdminCategoryImagesPage from "./pages/admin/AdminCategoryImagesPage";
import AdminStockLocations from "./pages/admin/AdminStockLocations";

import { WhatsAppFloatingButton } from "./components/WhatsAppFloatingButton";;
import AdminExternalSalesPage from "./pages/admin/AdminExternalSalesPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersKanban from "./pages/admin/AdminOrdersKanban";
import MinhaContaRedirect from "./pages/MinhaContaRedirect";
import AmbientSound from "./components/AmbientSound";
import AdminEstatisticas from "./pages/admin/AdminEstatisticas";
import AdminCupons from "./pages/admin/AdminCupons";
import AdminParcerias from "./pages/admin/AdminParcerias";
import PedidoDetalhePage from "./pages/users/PedidoDetalhePage";



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
  const hideAmbientSound = location.pathname.startsWith("/admin");

  return (
    <>
      <ScrollToHash />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cadastro" element={<CadastroUsuariosPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/minha-conta" element={<MinhaContaRedirect />} />
        <Route path="/minha-conta/pedidos/:orderId" element={<PedidoDetalhePage />} />
        <Route path="/conta" element={<ContaPage />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />


        <Route path="/carrinho" element={<div className="p-6">Carrinho</div>} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/identificacao" element={<CheckoutIdentificacao />} />
        <Route path="/checkout/pagamento" element={<CheckoutPagamento />} />
        <Route path="/checkout/confirmacao" element={<CheckoutConfirmacao />} />
        <Route path="/joias" element={<JewelryListing />} />
        <Route path="/joias/categoria/:categorySlug" element={<JewelryListing />} />
        <Route path="/joias/colecao/:collectionSlug" element={<JewelryListing />} />
        <Route path="/produto/:slug" element={<ProductPage />} />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />

        <Route path="/admin" element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminInicio />} />

            <Route path="estatisticas" element={<AdminEstatisticas />} />
            <Route path="cupons" element={<AdminCupons />} />
            <Route path="parcerias" element={<AdminParcerias />} />

            <Route path="produtos" element={<AdminProducts />} />
            <Route path="produtos/novo" element={<AdminProductCreate />} />
            <Route path="produtos/:productId" element={<AdminProductEdit />} />

            <Route path="fornecedores" element={<AdminSuppliersPage />} />
            <Route path="catalogo/imagens" element={<AdminCategoryImagesPage />} />
            <Route path="estoques" element={<AdminStockLocations />} />
            <Route path="vendas-externas" element={<AdminExternalSalesPage />} />

            <Route path="vendas" element={<AdminOrdersPage />} />
            <Route path="clientes" element={<AdminCustomersPage />} />

            <Route path="configuracoes" element={<AdminConfiguracoes />} />
            <Route path="kanban" element={<AdminOrdersKanban />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>

      {!hideWhatsApp && <WhatsAppFloatingButton />}
      {!hideAmbientSound && <AmbientSound />}
      {!hideCookieBanner && <CookieBanner />}
    </>
  );
}
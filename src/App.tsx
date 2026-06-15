import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import CookieBanner from "./components/CookieBanner";
import { AdminGuard } from "./routes/AdminGuard";
import AmbientSound from "./components/AmbientSound";
import ClarityScript from "./components/ClarityScript";


const HomePage = lazy(() => import("./pages/HomePage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CadastroUsuariosPage = lazy(() => import("./pages/cadastro_users"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutIdentificacao = lazy(() => import("./pages/CheckoutIdentificacao"));
const CheckoutPagamento = lazy(() => import("./pages/CheckoutPagamento"));
const CheckoutConfirmacao = lazy(() => import("./pages/CheckoutConfirmacao"));
const JewelryListing = lazy(() => import("./pages/JewelryListing"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const EsqueciSenhaPage = lazy(() => import("./pages/EsqueciSenhaPage"));
const RedefinirSenhaPage = lazy(() => import("./pages/RedefinirSenhaPage"));
const ContaPage = lazy(() => import("./pages/users/conta_page"));
const PedidoDetalhePage = lazy(() => import("./pages/users/PedidoDetalhePage"));
const MinhaContaRedirect = lazy(() => import("./pages/MinhaContaRedirect"));

// ADMIN
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminInicio = lazy(() => import("./pages/admin/AdminInicio"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/AdminConfiguracoes"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductEdit = lazy(() => import("./pages/admin/AdminProductEdit"));
const AdminProductCreate = lazy(() => import("./pages/admin/AdminProductCreate"));
const AdminSuppliersPage = lazy(() => import("./pages/admin/AdminSuppliers"));
const AdminCategoryImagesPage = lazy(() => import("./pages/admin/AdminCategoryImagesPage"));
const AdminStockLocations = lazy(() => import("./pages/admin/AdminStockLocations"));
const AdminExternalSalesPage = lazy(() => import("./pages/admin/AdminExternalSalesPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/AdminCustomersPage"));
const AdminOrdersKanban = lazy(() => import("./pages/admin/AdminOrdersKanban"));
const AdminEstatisticas = lazy(() => import("./pages/admin/AdminEstatisticas"));
const AdminCupons = lazy(() => import("./pages/admin/AdminCupons"));
const AdminParcerias = lazy(() => import("./pages/admin/AdminParcerias"));

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

function PageLoading() {
  return (
    <div className="min-h-screen bg-[#fcfaf6] px-6 pt-28 text-center text-sm text-[#2b554e]">
      Carregando...
    </div>
  );
}

export default function App() {
  const location = useLocation();

  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <>
      <ScrollToHash />

      <Suspense fallback={<PageLoading />}>
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
      </Suspense>



      {!isAdmin && <CookieBanner />}
      {!isAdmin && <AmbientSound hidden />}
      {!isAdmin && <ClarityScript />}
    </>
  );
}
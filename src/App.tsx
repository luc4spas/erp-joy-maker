import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Auth from "./pages/Auth";
import Historico from "./pages/Historico";
import FechamentoDetalhes from "./pages/FechamentoDetalhes";
import Funcionarios from "./pages/Funcionarios";
import Despesas from "./pages/Despesas";
import Rateio from "./pages/Rateio";
import ContasPagar from "./pages/ContasPagar";
import Empresas from "./pages/Empresas";
import Fornecedores from "./pages/Fornecedores";
import GruposAcesso from "./pages/GruposAcesso";
import Usuarios from "./pages/Usuarios";
import Lancamentos from "./pages/Lancamentos";
import FechamentoFolha from "./pages/FechamentoFolha";
import FinancialDashboard from "./pages/FinancialDashboard";
import SupplyChainDashboard from "./pages/SupplyChainDashboard";
import OperacionalRequisicoes from "./pages/OperacionalRequisicoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PermissionsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute module="financeiro"><Home /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute module="upload"><Upload /></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute module="financeiro"><Historico /></ProtectedRoute>} />
              <Route path="/fechamento/:id" element={<ProtectedRoute module="financeiro"><FechamentoDetalhes /></ProtectedRoute>} />
              <Route path="/funcionarios" element={<ProtectedRoute module="colaboradores"><Funcionarios /></ProtectedRoute>} />
              <Route path="/despesas" element={<ProtectedRoute module="financeiro"><Despesas /></ProtectedRoute>} />
              <Route path="/rateio" element={<ProtectedRoute module="financeiro"><Rateio /></ProtectedRoute>} />
              <Route path="/contas-pagar" element={<ProtectedRoute module="contas_pagar"><ContasPagar /></ProtectedRoute>} />
              <Route path="/empresas" element={<ProtectedRoute module="administracao"><Empresas /></ProtectedRoute>} />
              <Route path="/fornecedores" element={<ProtectedRoute module="contas_pagar"><Fornecedores /></ProtectedRoute>} />
              <Route path="/lancamentos" element={<ProtectedRoute module="folha_pagamento"><Lancamentos /></ProtectedRoute>} />
              <Route path="/fechamento-folha" element={<ProtectedRoute module="folha_pagamento"><FechamentoFolha /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute module="financeiro"><FinancialDashboard /></ProtectedRoute>} />
              <Route path="/suprimentos" element={<ProtectedRoute><SupplyChainDashboard /></ProtectedRoute>} />
              <Route path="/operacional/requisicoes" element={<ProtectedRoute><OperacionalRequisicoes /></ProtectedRoute>} />
              <Route path="/empresas" element={<ProtectedRoute module="administracao"><Empresas /></ProtectedRoute>} />
              <Route path="/grupos-acesso" element={<ProtectedRoute module="administracao"><GruposAcesso /></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute module="administracao"><Usuarios /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PermissionsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

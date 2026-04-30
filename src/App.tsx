import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MockRoleProvider } from "@/contexts/MockRoleContext";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
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
      <MockRoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute module="financeiro"><RoleProtectedRoute group="financeiro"><Home /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute module="upload"><RoleProtectedRoute group="financeiro"><Upload /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute module="financeiro"><RoleProtectedRoute group="financeiro"><Historico /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/fechamento/:id" element={<ProtectedRoute module="financeiro"><RoleProtectedRoute group="financeiro"><FechamentoDetalhes /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/funcionarios" element={<ProtectedRoute module="colaboradores"><RoleProtectedRoute group="gestao"><Funcionarios /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/despesas" element={<ProtectedRoute module="financeiro"><RoleProtectedRoute group="financeiro"><Despesas /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/rateio" element={<ProtectedRoute module="financeiro"><RoleProtectedRoute group="financeiro"><Rateio /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/contas-pagar" element={<ProtectedRoute module="contas_pagar"><RoleProtectedRoute group="financeiro"><ContasPagar /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/empresas" element={<ProtectedRoute module="administracao"><RoleProtectedRoute group="gestao"><Empresas /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/fornecedores" element={<ProtectedRoute module="contas_pagar"><RoleProtectedRoute group="suprimentos"><Fornecedores /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/lancamentos" element={<ProtectedRoute module="folha_pagamento"><RoleProtectedRoute group="gestao"><Lancamentos /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/fechamento-folha" element={<ProtectedRoute module="folha_pagamento"><RoleProtectedRoute group="gestao"><FechamentoFolha /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute module="financeiro"><RoleProtectedRoute group="financeiro"><FinancialDashboard /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/suprimentos" element={<ProtectedRoute><RoleProtectedRoute group="suprimentos"><SupplyChainDashboard /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/operacional/requisicoes" element={<ProtectedRoute><RoleProtectedRoute group="operacional"><OperacionalRequisicoes /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/grupos-acesso" element={<ProtectedRoute module="administracao"><RoleProtectedRoute group="gestao"><GruposAcesso /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute module="administracao"><RoleProtectedRoute group="gestao"><Usuarios /></RoleProtectedRoute></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </MockRoleProvider>
      </PermissionsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Auth from "./pages/Auth";
import Historico from "./pages/Historico";
import FechamentoDetalhes from "./pages/FechamentoDetalhes";
import Funcionarios from "./pages/Funcionarios";
import Despesas from "./pages/Despesas";
import Rateio from "./pages/Rateio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/fechamento/:id" element={<FechamentoDetalhes />} />
            <Route path="/funcionarios" element={<Funcionarios />} />
            <Route path="/despesas" element={<Despesas />} />
            <Route path="/rateio" element={<Rateio />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

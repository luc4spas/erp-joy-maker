import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMockRole, canAccessGroup, NavGroup } from '@/contexts/MockRoleContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserSwitcher } from '@/components/UserSwitcher';
import {
  Utensils,
  LogOut,
  LayoutDashboard,
  History,
  Users,
  Receipt,
  Menu,
  X,
  FileText,
  Building2,
  Truck,
  Shield,
  UserCog,
  Wallet,
  ClipboardList,
  LineChart,
  Boxes,
  Workflow,
  ChevronRight,
  ShoppingCart,
  Package,
  Banknote,
  Briefcase,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

interface NavLink {
  path: string;
  label: string;
  icon: any;
}

interface NavSection {
  group: NavGroup;
  label: string;
  icon: any;
  items: NavLink[];
}

const sections: NavSection[] = [
  {
    group: 'operacional',
    label: 'Operacional',
    icon: Workflow,
    items: [
      { path: '/operacional/requisicoes', label: 'Minhas Requisições', icon: ClipboardList },
    ],
  },
  {
    group: 'suprimentos',
    label: 'Suprimentos',
    icon: Boxes,
    items: [
      { path: '/suprimentos', label: 'Catálogo', icon: Package },
      { path: '/suprimentos?tab=cotacao', label: 'Mapa de Cotação', icon: LineChart },
      { path: '/suprimentos?tab=pos', label: 'Pedidos (POs)', icon: ShoppingCart },
      { path: '/suprimentos?tab=estoque', label: 'Estoque', icon: Boxes },
      { path: '/fornecedores', label: 'Fornecedores', icon: Truck },
    ],
  },
  {
    group: 'financeiro',
    label: 'Financeiro',
    icon: Banknote,
    items: [
      { path: '/', label: 'Visão Geral', icon: LayoutDashboard },
      { path: '/financeiro', label: 'Dashboard Financeiro', icon: LineChart },
      { path: '/contas-pagar', label: 'Contas a Pagar', icon: FileText },
      { path: '/despesas', label: 'Despesas Diárias', icon: Receipt },
      { path: '/historico', label: 'Histórico', icon: History },
    ],
  },
  {
    group: 'gestao',
    label: 'Gestão',
    icon: Briefcase,
    items: [
      { path: '/funcionarios', label: 'Equipe (RH)', icon: Users },
      { path: '/lancamentos', label: 'Lançamentos', icon: Wallet },
      { path: '/fechamento-folha', label: 'Fechamento Folha', icon: ClipboardList },
      { path: '/empresas', label: 'Unidades', icon: Building2 },
      { path: '/usuarios', label: 'Usuários', icon: UserCog },
      { path: '/grupos-acesso', label: 'Grupos de Acesso', icon: Shield },
    ],
  },
];

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useMockRole();

  const visibleSections = sections.filter((s) => canAccessGroup(profile.role, s.group));

  // Inicializa abertos os grupos que contém a rota atual
  const initialOpen = visibleSections.reduce<Record<string, boolean>>((acc, s) => {
    acc[s.group] = s.items.some((i) => i.path.split('?')[0] === location.pathname) || visibleSections.length === 1;
    return acc;
  }, {});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Joy Maker</h1>
                <p className="text-xs text-muted-foreground">ERP Gastronômico</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleSections.map((section) => {
              const isOpen = !!openGroups[section.group];
              const SectionIcon = section.icon;
              return (
                <Collapsible
                  key={section.group}
                  open={isOpen}
                  onOpenChange={(o) => setOpenGroups((p) => ({ ...p, [section.group]: o }))}
                >
                  <CollapsibleTrigger
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                      'text-foreground hover:bg-secondary',
                    )}
                  >
                    <SectionIcon className="w-4 h-4 text-primary" />
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronRight className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-90')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 ml-2 pl-3 border-l border-border/60 space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = location.pathname + location.search === item.path
                        || (location.pathname === item.path.split('?')[0] && !item.path.includes('?'));
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setSidebarOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
            <UserSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

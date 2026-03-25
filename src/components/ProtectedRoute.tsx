import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, ModuleName } from '@/hooks/usePermissions';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  module?: ModuleName;
  action?: 'read' | 'create' | 'edit' | 'delete';
}

export function ProtectedRoute({ children, module, action = 'read' }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: permLoading, permissions, isAdmin } = usePermissions();

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If no module specified, just check auth
  if (!module) return <>{children}</>;

  // If user has no groups assigned yet (new user), allow access
  // This prevents locking out the first admin
  if (permissions.length === 0 && !isAdmin) {
    return <>{children}</>;
  }

  if (!hasPermission(module, action)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

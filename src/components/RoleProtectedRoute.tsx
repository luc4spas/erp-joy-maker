import { ReactNode } from 'react';
import { useMockRole, NavGroup, canAccessGroup } from '@/contexts/MockRoleContext';
import { ShieldAlert } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

export function RoleProtectedRoute({ group, children }: { group: NavGroup; children: ReactNode }) {
  const { profile } = useMockRole();
  if (!canAccessGroup(profile.role, group)) {
    return (
      <AppLayout title="Acesso Negado" subtitle="Você não tem permissão para esta área">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            O perfil <span className="font-semibold text-foreground">{profile.nome} ({profile.role})</span> não tem permissão para acessar esta área.
          </p>
        </div>
      </AppLayout>
    );
  }
  return <>{children}</>;
}

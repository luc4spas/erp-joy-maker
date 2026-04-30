import { useMockRole, MOCK_PROFILES, MockRole } from '@/contexts/MockRoleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, UserCircle2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<MockRole, string> = {
  admin: 'Admin',
  manager: 'Gerente',
  operator: 'Operador',
};

const ROLE_CLS: Record<MockRole, string> = {
  admin: 'bg-primary/15 text-primary border-primary/30',
  manager: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  operator: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
};

export function UserSwitcher() {
  const { profile, setRole } = useMockRole();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-10">
          <UserCircle2 className="w-4 h-4" />
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-medium">{profile.nome}</div>
            <div className="text-[10px] text-muted-foreground">{profile.setor}</div>
          </div>
          <Badge variant="outline" className={cn('font-normal text-[10px]', ROLE_CLS[profile.role])}>
            {ROLE_LABEL[profile.role]}
          </Badge>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Trocar perfil (modo teste)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(MOCK_PROFILES) as MockRole[]).map((r) => {
          const p = MOCK_PROFILES[r];
          const active = profile.role === r;
          return (
            <DropdownMenuItem key={r} onClick={() => setRole(r)} className="cursor-pointer">
              <div className="flex items-center gap-2 flex-1">
                <UserCircle2 className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {p.nome}
                    <Badge variant="outline" className={cn('font-normal text-[10px]', ROLE_CLS[r])}>
                      {ROLE_LABEL[r]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.setor}</div>
                </div>
                {active && <Check className="w-4 h-4 text-primary" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

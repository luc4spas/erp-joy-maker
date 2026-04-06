import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ModuleName = 'financeiro' | 'colaboradores' | 'administracao' | 'upload' | 'contas_pagar' | 'folha_pagamento';
export type ActionType = 'read' | 'create' | 'edit' | 'delete';

interface Permission {
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermissionsContextType {
  permissions: Permission[];
  isAdmin: boolean;
  isLoading: boolean;
  hasPermission: (module: ModuleName, action: ActionType) => boolean;
  refetch: () => void;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  isAdmin: false,
  isLoading: true,
  hasPermission: () => false,
  refetch: () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      // Get user's groups
      const { data: userGroups } = await supabase
        .from('user_access_groups')
        .select('group_id, access_groups(name)')
        .eq('user_id', user.id);

      const groupIds = userGroups?.map(ug => ug.group_id) || [];
      const adminCheck = userGroups?.some((ug: any) => ug.access_groups?.name === 'Admin') || false;
      setIsAdmin(adminCheck);

      if (groupIds.length > 0) {
        const { data: perms } = await supabase
          .from('group_permissions')
          .select('module, can_read, can_create, can_edit, can_delete')
          .in('group_id', groupIds);

        // Merge permissions from multiple groups (OR logic)
        const merged: Record<string, Permission> = {};
        perms?.forEach(p => {
          if (!merged[p.module]) {
            merged[p.module] = { ...p };
          } else {
            merged[p.module].can_read = merged[p.module].can_read || p.can_read;
            merged[p.module].can_create = merged[p.module].can_create || p.can_create;
            merged[p.module].can_edit = merged[p.module].can_edit || p.can_edit;
            merged[p.module].can_delete = merged[p.module].can_delete || p.can_delete;
          }
        });

        setPermissions(Object.values(merged));
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((module: ModuleName, action: ActionType): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    if (!perm) return false;
    switch (action) {
      case 'read': return perm.can_read;
      case 'create': return perm.can_create;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
    }
  }, [permissions, isAdmin]);

  return (
    <PermissionsContext.Provider value={{ permissions, isAdmin, isLoading, hasPermission, refetch: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);

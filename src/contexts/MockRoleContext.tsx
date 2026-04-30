import { createContext, useContext, useState, ReactNode } from 'react';

export type MockRole = 'admin' | 'manager' | 'operator';

export interface MockProfile {
  id: string;
  nome: string;
  setor: string;
  role: MockRole;
}

export const MOCK_PROFILES: Record<MockRole, MockProfile> = {
  admin: { id: 'mock-admin', nome: 'Lucas', setor: 'Diretoria', role: 'admin' },
  manager: { id: 'mock-manager', nome: 'Francisco', setor: 'Gerência', role: 'manager' },
  operator: { id: 'mock-operator', nome: 'Otávio', setor: 'Cozinha Japonesa', role: 'operator' },
};

interface Ctx {
  profile: MockProfile;
  setRole: (r: MockRole) => void;
}

const MockRoleContext = createContext<Ctx>({
  profile: MOCK_PROFILES.admin,
  setRole: () => {},
});

const STORAGE_KEY = 'mock-role';

export function MockRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<MockRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as MockRole | null;
    return saved && MOCK_PROFILES[saved] ? saved : 'admin';
  });

  const setRole = (r: MockRole) => {
    localStorage.setItem(STORAGE_KEY, r);
    setRoleState(r);
  };

  return (
    <MockRoleContext.Provider value={{ profile: MOCK_PROFILES[role], setRole }}>
      {children}
    </MockRoleContext.Provider>
  );
}

export const useMockRole = () => useContext(MockRoleContext);

// Helper para checar acesso por grupo
export type NavGroup = 'operacional' | 'suprimentos' | 'financeiro' | 'gestao';

export const GROUP_ACCESS: Record<NavGroup, MockRole[]> = {
  operacional: ['operator', 'manager', 'admin'],
  suprimentos: ['manager', 'admin'],
  financeiro: ['admin'],
  gestao: ['admin'],
};

export function canAccessGroup(role: MockRole, group: NavGroup): boolean {
  return GROUP_ACCESS[group].includes(role);
}

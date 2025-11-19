import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: number;
  userName: string;
  nome: string;
  mail: string;
  adminType: string;
  themeColor: string;
  permissions: Record<string, boolean>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  hasPermission: (module: string) => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      darkMode: false,
      sidebarCollapsed: false,
      _hasHydrated: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      toggleDarkMode: () => {
        set((state) => ({ darkMode: !state.darkMode }));
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      hasPermission: (module) => {
        const { user } = get();
        if (!user) return false;
        if (user.adminType === 'admin') return true;
        return user.permissions?.[module] === true;
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'coregre-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook per aspettare l'hydration
export const useHydration = () => {
  return useAuthStore((state) => state._hasHydrated);
};

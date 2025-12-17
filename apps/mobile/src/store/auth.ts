import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MobileUser {
  id: number;
  user: string; // matricola
  full_name: string;
  reparto: string;
  enabled_modules?: string[]; // ['quality', 'repairs', etc.]
}

interface AuthState {
  user: MobileUser | null;
  isAuthenticated: boolean;
  selectedModule: string | null;
  _hasHydrated: boolean;
  setAuth: (user: MobileUser) => void;
  logout: () => void;
  selectModule: (module: string) => void;
  hasModule: (module: string) => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      selectedModule: null,
      _hasHydrated: false,

      setAuth: (user) => {
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, selectedModule: null });
      },

      selectModule: (module) => {
        set({ selectedModule: module });
      },

      hasModule: (module) => {
        const { user } = get();
        if (!user || !user.enabled_modules) return false;
        return user.enabled_modules.includes(module);
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'coregre-mobile-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        selectedModule: state.selectedModule,
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

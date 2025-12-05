import { create } from 'zustand';
import { settingsApi } from '@/lib/api';

interface ModulesState {
  activeModules: Record<string, boolean>;
  isLoading: boolean;
  lastFetched: number | null;
  fetchModules: () => Promise<void>;
  isModuleActive: (moduleName: string) => boolean;
  clearCache: () => void;
}

const CACHE_DURATION = 60000; // 1 minute

export const useModulesStore = create<ModulesState>((set, get) => ({
  activeModules: {},
  isLoading: false,
  lastFetched: null,

  fetchModules: async () => {
    const now = Date.now();
    const { lastFetched } = get();

    // Return cached data if still valid
    if (lastFetched && now - lastFetched < CACHE_DURATION) {
      return;
    }

    set({ isLoading: true });

    try {
      const modules = await settingsApi.getActiveModules();
      set({ activeModules: modules, lastFetched: now, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch active modules:', error);
      // On error, assume all modules are active to avoid blocking users
      set({ isLoading: false });
    }
  },

  isModuleActive: (moduleName: string) => {
    const { activeModules } = get();
    // If no data yet, assume module is active
    if (Object.keys(activeModules).length === 0) {
      return true;
    }
    return activeModules[moduleName] === true;
  },

  clearCache: () => {
    set({ lastFetched: null });
  },
}));

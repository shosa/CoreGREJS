import { create } from 'zustand';

export interface WidgetConfig {
  id: string;
  enabled: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardState {
  widgets: Record<string, WidgetConfig>;
  isEditMode: boolean;
  showConfigModal: boolean;
  isLoaded: boolean;
  setEditMode: (enabled: boolean) => void;
  setShowConfigModal: (show: boolean) => void;
  updateWidget: (id: string, config: Partial<WidgetConfig>) => void;
  toggleWidget: (id: string) => void;
  updateLayout: (layouts: WidgetConfig[]) => void;
  resetLayout: () => void;
  loadWidgets: (widgets: WidgetConfig[]) => void;
  saveWidgets: () => Promise<void>;
}

// Default widget configurations
export const defaultWidgets: Record<string, WidgetConfig> = {
  'riparazioni': { id: 'riparazioni', enabled: true, x: 0, y: 0, w: 1, h: 1 },
  'produzione': { id: 'produzione', enabled: true, x: 1, y: 0, w: 1, h: 1 },
  'quality': { id: 'quality', enabled: true, x: 2, y: 0, w: 1, h: 1 },
  'export-stats': { id: 'export-stats', enabled: true, x: 3, y: 0, w: 1, h: 1 },
  'tracking': { id: 'tracking', enabled: true, x: 0, y: 1, w: 1, h: 1 },
  'scm': { id: 'scm', enabled: true, x: 1, y: 1, w: 1, h: 1 },
  'quick-actions': { id: 'quick-actions', enabled: true, x: 0, y: 2, w: 2, h: 2 },
  'activities': { id: 'activities', enabled: true, x: 2, y: 1, w: 2, h: 2 },
  'produzione-trend': { id: 'produzione-trend', enabled: false, x: 0, y: 4, w: 2, h: 2 },
  'produzione-reparti': { id: 'produzione-reparti', enabled: false, x: 2, y: 4, w: 2, h: 2 },
  'system-health': { id: 'system-health', enabled: false, x: 0, y: 6, w: 2, h: 1 },
  'system-jobs': { id: 'system-jobs', enabled: false, x: 0, y: 8, w: 2, h: 2 },
  'system-log': { id: 'system-log', enabled: false, x: 2, y: 8, w: 2, h: 2 },
};

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  widgets: defaultWidgets,
  isEditMode: false,
  showConfigModal: false,
  isLoaded: false,

  setEditMode: (enabled) => {
    set({ isEditMode: enabled });
    // Auto-save when exiting edit mode
    if (!enabled) {
      get().saveWidgets();
    }
  },

  setShowConfigModal: (show) => {
    set({ showConfigModal: show });
  },

  updateWidget: (id, config) => {
    set((state) => ({
      widgets: {
        ...state.widgets,
        [id]: {
          ...state.widgets[id],
          ...config,
        },
      },
    }));
  },

  toggleWidget: (id) => {
    set((state) => ({
      widgets: {
        ...state.widgets,
        [id]: {
          ...state.widgets[id],
          enabled: !state.widgets[id]?.enabled,
        },
      },
    }));
  },

  updateLayout: (layouts) => {
    set((state) => {
      const newWidgets = { ...state.widgets };
      layouts.forEach((layout) => {
        if (newWidgets[layout.id]) {
          newWidgets[layout.id] = {
            ...newWidgets[layout.id],
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h,
          };
        }
      });
      return { widgets: newWidgets };
    });
  },

  resetLayout: () => {
    set({ widgets: defaultWidgets });
    get().saveWidgets();
  },

  loadWidgets: (widgets) => {
    if (widgets.length === 0) {
      // Use defaults if no configuration exists
      set({ widgets: defaultWidgets, isLoaded: true });
      return;
    }

    const widgetMap: Record<string, WidgetConfig> = {};
    widgets.forEach((w) => {
      widgetMap[w.id] = w;
    });

    // Merge with defaults to ensure all widgets exist
    const mergedWidgets = { ...defaultWidgets };
    Object.keys(mergedWidgets).forEach((key) => {
      if (widgetMap[key]) {
        mergedWidgets[key] = widgetMap[key];
      }
    });

    set({ widgets: mergedWidgets, isLoaded: true });
  },

  saveWidgets: async () => {
    const { widgets } = get();
    try {
      const authStorage = localStorage.getItem('coregre-auth');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const response = await fetch('/api/widgets/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          widgets: Object.values(widgets),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save widgets');
      }
    } catch (error) {
      console.error('Error saving widgets:', error);
    }
  },
}));

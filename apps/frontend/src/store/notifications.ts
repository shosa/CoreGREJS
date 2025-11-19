import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Date.now().toString();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));

    // Auto-remove after duration
    const duration = notification.duration || 5000;
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, duration);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));

// Helper functions
export const showSuccess = (message: string) => {
  useNotificationStore.getState().addNotification({ type: 'success', message });
};

export const showError = (message: string) => {
  useNotificationStore.getState().addNotification({ type: 'error', message });
};

export const showWarning = (message: string) => {
  useNotificationStore.getState().addNotification({ type: 'warning', message });
};

export const showInfo = (message: string) => {
  useNotificationStore.getState().addNotification({ type: 'info', message });
};

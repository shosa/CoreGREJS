'use client';

import { useNotificationStore } from '@/store/notifications';

const iconMap = {
  success: 'fa-check-circle',
  error: 'fa-times-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
};

const colorMap = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
};

export default function Notifications() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-99999 flex flex-col gap-2 w-96 max-w-full">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`animate-fade-in rounded-lg border p-4 shadow-lg ${colorMap[notification.type]}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <i className={`fas ${iconMap[notification.type]}`}></i>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => removeNotification(notification.id)}
                className="inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

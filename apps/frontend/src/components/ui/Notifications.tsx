'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [displayedNotifications, setDisplayedNotifications] = useState(notifications);
  const prevNotificationsRef = useRef(notifications);

  // Sincronizza le notifiche e gestisci l'animazione di uscita
  useEffect(() => {
    const prev = prevNotificationsRef.current;
    const current = notifications;

    // Trova notifiche rimosse
    const removedIds = prev
      .filter(p => !current.find(c => c.id === p.id))
      .map(n => n.id);

    if (removedIds.length > 0) {
      // Avvia animazione di uscita
      setExitingIds(prev => {
        const newSet = new Set(prev);
        removedIds.forEach(id => newSet.add(id));
        return newSet;
      });

      // Rimuovi dalla visualizzazione dopo l'animazione
      setTimeout(() => {
        setDisplayedNotifications(current);
        setExitingIds(prev => {
          const newSet = new Set(prev);
          removedIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }, 400); // Durata animazione slide-out
    } else {
      // Aggiungi nuove notifiche immediatamente
      setDisplayedNotifications(current);
    }

    prevNotificationsRef.current = current;
  }, [notifications]);

  const handleRemove = (id: string) => {
    setExitingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      removeNotification(id);
    }, 400);
  };

  if (displayedNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-99999 flex flex-col gap-2 w-96 max-w-full">
      {displayedNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`${exitingIds.has(notification.id) ? 'animate-slide-out' : 'animate-slide-in'} rounded-lg border p-4 shadow-lg ${colorMap[notification.type]}`}
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
                onClick={() => handleRemove(notification.id)}
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

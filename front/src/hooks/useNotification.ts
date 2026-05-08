import { useState } from 'react';

interface Notifications {
  id?: string; 
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  duration?: number; 
  timestamp?: Date; 
}

const DEFAULT_NOTIFICATIONS: Notifications = {
    message: "",
    type: "error",
    isVisible: false,
}

export const useNotification = () => {
  const [notification, setNotification] = useState<Notifications>(DEFAULT_NOTIFICATIONS);
  const closeNotification = () => setNotification(prev => ({ ...prev, isVisible: false }));
  const showNotification = (message: string, type: 'success' | 'error') => setNotification({ message, type, isVisible: true });

  return {
    notification,
    showNotification,
    closeNotification
  };
};
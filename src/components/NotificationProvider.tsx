import { useEffect, createContext, useContext } from 'react';
import { notificationService } from '@/utils/notifications';

interface NotificationContextType {
  notificationService: typeof notificationService;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  useEffect(() => {
    // Make notification service globally available
    (window as any).notificationService = notificationService;
    
    // Initialize notification monitoring if permission is granted
    if (Notification.permission === 'granted') {
      notificationService.startBookingMonitor();
    }

    // Listen for permission changes
    const checkPermission = () => {
      if (Notification.permission === 'granted') {
        notificationService.startBookingMonitor();
      }
    };

    // Check permission periodically
    const permissionInterval = setInterval(checkPermission, 5000);

    return () => {
      clearInterval(permissionInterval);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ notificationService }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

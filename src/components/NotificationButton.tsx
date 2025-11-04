import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { notificationService } from '@/utils/notifications';

const NotificationButton = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }
    
    setPermission(Notification.permission);
    setIsMonitoring(notificationService.isMonitoringActive());
    setSoundEnabled(notificationService.isSoundEnabled());
  }, []);

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      notificationService.showInAppNotification('Browser tidak mendukung notifikasi', '', 'error');
      return;
    }

    if (permission === 'denied') {
      notificationService.showInAppNotification(
        'Notifikasi Diblokir',
        'Silakan aktifkan di pengaturan browser.',
        'warning'
      );
      return;
    }

    if (permission === 'default') {
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        notificationService.showInAppNotification('Notifikasi Aktif', 'Notifikasi berhasil diaktifkan!', 'success');
        notificationService.startBookingMonitor();
        setIsMonitoring(true);
      } else {
        notificationService.showInAppNotification('Notifikasi Ditolak', 'Izin notifikasi ditolak', 'error');
      }
    } else if (permission === 'granted') {
      // Toggle monitoring on/off
      if (isMonitoring) {
        notificationService.stopBookingMonitor();
        setIsMonitoring(false);
        notificationService.showInAppNotification('Notifikasi Dimatikan', 'Monitoring notifikasi dihentikan', 'info');
      } else {
        notificationService.startBookingMonitor();
        setIsMonitoring(true);
        notificationService.showInAppNotification('Notifikasi Dinyalakan', 'Monitoring notifikasi dimulai', 'success');
      }
    }
  };

  const handleToggleSound = () => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    notificationService.setSoundEnabled(newSoundState);
    
    notificationService.showInAppNotification(
      newSoundState ? 'Suara Notifikasi ON' : 'Suara Notifikasi OFF',
      newSoundState ? 'Suara notifikasi diaktifkan' : 'Suara notifikasi dimatikan',
      'info'
    );
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Notification Toggle Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Notifikasi</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleNotifications}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          title={
            permission === 'granted' && isMonitoring
              ? 'Matikan notifikasi' 
              : permission === 'granted' && !isMonitoring
              ? 'Nyalakan notifikasi'
              : permission === 'denied'
              ? 'Notifikasi diblokir'
              : 'Aktifkan notifikasi'
          }
        >
          {permission === 'granted' && isMonitoring ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          <span className="text-xs">
            {permission === 'granted' && isMonitoring ? 'ON' : 'OFF'}
          </span>
        </Button>
      </div>

      {/* Sound Toggle Button - Only show if notifications are enabled */}
      {permission === 'granted' && isMonitoring && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Suara</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleSound}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            title={soundEnabled ? 'Matikan suara notifikasi' : 'Nyalakan suara notifikasi'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            <span className="text-xs">
              {soundEnabled ? 'ON' : 'OFF'}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationButton;

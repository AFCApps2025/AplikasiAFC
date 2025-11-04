// Notification utility for AFC Service Buddy
export class NotificationService {
  private static instance: NotificationService;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastBookingId: string | null = null;
  private lastWorkReportId: string | null = null;
  private notificationSound: HTMLAudioElement | null = null;
  private soundEnabled = true;

  private constructor() {
    this.initializeSound();
    this.loadSoundSettings();
  }

  // Load sound settings from localStorage
  private loadSoundSettings() {
    const saved = localStorage.getItem('notificationSoundEnabled');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    }
  }

  // Initialize notification sound
  private initializeSound() {
    try {
      this.notificationSound = new Audio('https://cdn.pixabay.com/download/audio/2025/04/11/audio_8fc2b30703.mp3');
      this.notificationSound.preload = 'auto';
      this.notificationSound.volume = 0.7;
    } catch (error) {
      console.warn('Gagal memuat suara notifikasi:', error);
    }
  }

  // Play notification sound
  private playNotificationSound() {
    if (this.soundEnabled && this.notificationSound) {
      try {
        this.notificationSound.currentTime = 0;
        this.notificationSound.play().catch(error => {
          console.warn('Gagal memutar suara notifikasi:', error);
        });
      } catch (error) {
        console.warn('Error saat memutar suara:', error);
      }
    }
  }

  // Enable/disable notification sound
  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    localStorage.setItem('notificationSoundEnabled', enabled.toString());
    
    // Test sound when enabled
    if (enabled) {
      this.testSound();
    }
  }

  // Test sound method
  testSound() {
    if (this.notificationSound) {
      try {
        this.notificationSound.currentTime = 0;
        this.notificationSound.play().catch(error => {
          console.warn('Gagal memutar test suara:', error);
        });
      } catch (error) {
        console.warn('Error saat test suara:', error);
      }
    }
  }

  // Enable/disable notifications
  setEnabled(enabled: boolean) {
    // This method is called from App.tsx but we don't need to do anything special
    // The notification permission is handled separately
    localStorage.setItem('notificationsEnabled', enabled.toString());
    
    // Test notification when enabled
    if (enabled) {
      this.showInAppNotification('Notifikasi Aktif', 'Notifikasi telah diaktifkan!', 'success');
    }
  }

  // Get sound enabled status
  isSoundEnabled(): boolean {
    const saved = localStorage.getItem('notificationSoundEnabled');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    }
    return this.soundEnabled;
  }
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser tidak mendukung notifikasi');
      return 'denied';
    }
    
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    
    return Notification.permission;
  }
  
  // Show desktop notification
  showNotification(title: string, options: NotificationOptions = {}, playSound: boolean = false) {
    // Only play sound if explicitly requested
    if (playSound) {
      this.playNotificationSound();
    }
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
      
      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
      
      return notification;
    }
  }
  
  // Show in-app notification popup
  showInAppNotification(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', playSound: boolean = false) {
    // Only play sound if explicitly requested
    if (playSound) {
      this.playNotificationSound();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    // Set colors based on type
    const colors = {
      success: 'bg-green-500 text-white',
      info: 'bg-blue-500 text-white', 
      warning: 'bg-yellow-500 text-black',
      error: 'bg-red-500 text-white'
    };
    
    notification.className += ` ${colors[type]}`;
    
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <h4 class="font-semibold text-sm">${title}</h4>
          <p class="text-xs mt-1 opacity-90">${message}</p>
        </div>
        <button class="text-white hover:text-gray-200 ml-2" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
  
  // Notification for new scheduled booking
  notifyNewBooking(bookingData: any) {
    const title = 'Jadwal Booking Baru';
    const message = `Booking baru: ${bookingData.customer_name} - ${bookingData.tanggal_kunjungan}`;
    
    // Desktop notification WITH SOUND
    this.showNotification(title, {
      body: message,
      tag: 'new-booking'
    }, true);
    
    // In-app notification WITH SOUND
    this.showInAppNotification(title, `📅 ${message}`, 'info', true);
  }
  
  // Send notification (generic method) - NO SOUND for standby notifications
  async sendNotification(title: string, message: string) {
    // Desktop notification WITHOUT SOUND
    this.showNotification(title, {
      body: message,
      tag: 'general'
    }, false);
    
    // In-app notification WITHOUT SOUND
    this.showInAppNotification(`📢 ${message}`, 'info');
  }

  // Notification for work report submitted - NO SOUND
  notifyWorkReportSubmitted(reportData: any) {
    const title = 'Laporan Kerja Dikirim';
    const message = `Laporan kerja untuk ${reportData.customer || reportData.bookingId} telah dikirim`;
    
    // Desktop notification WITHOUT SOUND
    this.showNotification(title, {
      body: message,
      tag: 'work-report'
    }, false);
    
    // In-app notification WITHOUT SOUND
    this.showInAppNotification(title, `✅ ${message}`, 'success', false);
  }
  
  // Check for new bookings periodically using Supabase
  startBookingMonitor() {
    if (this.isMonitoring) {
      console.log('Booking monitor already running');
      return;
    }
    
    this.isMonitoring = true;
    console.log('Starting booking monitor...');
    
    // Clear any existing interval first
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Check immediately
    this.checkForNewBookings();
    
    // Then check every 30 seconds (increased from 5 seconds to reduce frequency)
    this.monitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.checkForNewBookings();
      }
    }, 30000); // Changed from 5000ms to 30000ms
  }

  // Stop booking monitor
  stopBookingMonitor() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Check if monitoring is active
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
  
  private async checkForNewBookings() {
    try {
      // Import supabase client
      const { supabase } = await import('../integrations/supabase/client');
      
      // Track notified items to prevent duplicate sounds
      const notifiedBookings = JSON.parse(localStorage.getItem('notifiedBookings') || '[]');
      const notifiedReports = JSON.parse(localStorage.getItem('notifiedReports') || '[]');

      // Get all bookings to check for new ones
      const { data: allBookings, error } = await supabase
        .from('bookings')
        .select('id, nama, tanggal_kunjungan, jenis_layanan, alamat, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      // Check for new bookings that haven't been notified yet
      if (allBookings && allBookings.length > 0) {
        let hasNewBooking = false;
        
        allBookings.forEach(booking => {
          if (!notifiedBookings.includes(booking.id)) {
            // Only notify if this is truly a new booking (created in last 5 minutes)
            const createdAt = new Date(booking.created_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
            
            if (diffMinutes <= 5) {
              this.notifyNewBooking({
                customer_name: booking.nama,
                tanggal_kunjungan: booking.tanggal_kunjungan,
                jenis_layanan: booking.jenis_layanan,
                alamat: booking.alamat
              });
              hasNewBooking = true;
            }
            
            // Mark as notified regardless
            notifiedBookings.push(booking.id);
          }
        });
        
        // Only save if there were actual new bookings
        if (hasNewBooking || notifiedBookings.length > 0) {
          // Keep only last 100 notified bookings to prevent memory bloat
          const trimmedBookings = notifiedBookings.slice(-100);
          localStorage.setItem('notifiedBookings', JSON.stringify(trimmedBookings));
        }
      }

      // Check for new work reports (silent - no sound)
      const { data: allReports, error: reportError } = await supabase
        .from('work_reports')
        .select('id, nama_pelanggan, booking_id, teknisi, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!reportError && allReports && allReports.length > 0) {
        allReports.forEach((report: any) => {
          if (!notifiedReports.includes(report.id)) {
            // Only notify for very recent reports (last 5 minutes)
            const createdAt = new Date(report.created_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
            
            if (diffMinutes <= 5) {
              this.notifyWorkReportSubmitted({
                customer: report.nama_pelanggan || 'Unknown Customer',
                bookingId: report.booking_id || report.id,
                teknisi: report.teknisi || 'Unknown Technician'
              });
            }
            
            notifiedReports.push(report.id);
          }
        });
        
        // Keep only last 100 notified reports
        const trimmedReports = notifiedReports.slice(-100);
        localStorage.setItem('notifiedReports', JSON.stringify(trimmedReports));
      }
      
    } catch (error) {
      console.error('Error in checkForNewBookings:', error);
    }
  }

  // Notification for reschedule
  notifyReschedule(bookingData: any) {
    const title = 'Jadwal Diubah';
    const message = `Jadwal ${bookingData.nama} diubah ke ${bookingData.tanggal_kunjungan}`;
    
    // Desktop notification
    this.showNotification(title, {
      body: message,
      tag: 'reschedule'
    });
    
    // In-app notification
    this.showInAppNotification(`📅 ${message}`, 'warning');
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

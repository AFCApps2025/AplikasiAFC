import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Bell, Clock, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Booking {
  id: string;
  booking_id?: string;
  nama: string;
  no_hp: string;
  alamat: string;
  jenis_layanan: string;
  tanggal_kunjungan: string;
  status: string;
  teknisi: string;
}

const ReminderSystem = () => {
  const [tomorrowBookings, setTomorrowBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastReminderCheck, setLastReminderCheck] = useState<string | null>(null);

  useEffect(() => {
    // Check if reminders should be sent automatically
    checkAndSendReminders();
    
    // Set up interval to check every hour
    const interval = setInterval(checkAndSendReminders, 60 * 60 * 1000); // Every hour
    
    return () => clearInterval(interval);
  }, []);

  const checkAndSendReminders = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toDateString();
    
    // Only send reminders at 8 AM and if not already sent today
    if (currentHour === 8 && lastReminderCheck !== today) {
      await sendAutomaticReminders();
      setLastReminderCheck(today);
      localStorage.setItem('lastReminderCheck', today);
    }
  };

  const getTomorrowBookings = async () => {
    try {
      setLoading(true);
      
      // Calculate tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['confirmed', 'pending', 'Terjadwal'])
        .gte('tanggal_kunjungan', tomorrowStr)
        .lt('tanggal_kunjungan', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching tomorrow bookings:', error);
        return [];
      }

      // Filter bookings that match tomorrow's date more precisely
      const filteredBookings = (data || []).filter(booking => {
        if (!booking.tanggal_kunjungan) return false;
        
        try {
          // Handle different date formats
          let bookingDate: Date;
          
          if (booking.tanggal_kunjungan.includes('/')) {
            // DD/MM/YYYY format
            const [day, month, year] = booking.tanggal_kunjungan.split('/');
            bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            // ISO format
            bookingDate = new Date(booking.tanggal_kunjungan);
          }
          
          return bookingDate.toDateString() === tomorrow.toDateString();
        } catch (error) {
          console.error('Error parsing date:', booking.tanggal_kunjungan);
          return false;
        }
      });

      return filteredBookings;
    } catch (error) {
      console.error('Error in getTomorrowBookings:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = async (booking: Booking) => {
    try {
      // Format phone number
      let formattedPhone = booking.no_hp.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('62')) {
        formattedPhone = '62' + formattedPhone;
      }

      const message = `*REMINDER*

Assalamualaikum Bapak/Ibu *${booking.nama}*,

Insya Allah teknisi kami *BESOK* akan melakukan kunjungan *SESUAI* dengan tanggal booking Bapak/ibu ke alamat *${booking.alamat}*

Mohon pastikan :
✅ Ada orang yang di rumah saat teknisi datang
✅ Jika ada perubahan, mohon *SEGERA* hubungi kami

Terima kasih🙏
_Note_:
_Mohon pengertiannya saat adzan berkumandang, crew kami agar diberikan ijin menunaikan sholat terlebih dahulu di masjid_

*Aqsha Fresh & Cool*`;

      const response = await fetch('https://crm.woo-wa.com/send/message-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId: 'd_ID@6753a3309becd_BGhPsyGyyZujb',
          number: formattedPhone,
          message: message
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending WhatsApp reminder:', error);
      return false;
    }
  };

  const sendAutomaticReminders = async () => {
    const bookings = await getTomorrowBookings();
    setTomorrowBookings(bookings);
    
    if (bookings.length === 0) {
      console.log('No bookings for tomorrow - no reminders to send');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const booking of bookings) {
      if (booking.no_hp && booking.no_hp.trim() !== '') {
        const success = await sendWhatsAppReminder(booking);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // Add small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    toast({
      title: "H-1 Reminder Sent",
      description: `${successCount} reminder berhasil dikirim, ${failCount} gagal`,
      variant: successCount > 0 ? "default" : "destructive"
    });
  };

  const handleManualReminderCheck = async () => {
    const bookings = await getTomorrowBookings();
    setTomorrowBookings(bookings);
    
    toast({
      title: "Check Complete",
      description: `Ditemukan ${bookings.length} booking untuk besok`,
      variant: "default"
    });
  };

  const handleSendRemindersNow = async () => {
    await sendAutomaticReminders();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          H-1 Reminder System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>Otomatis berjalan setiap hari jam 08:00 WIB</span>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleManualReminderCheck}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            Check Booking Besok
          </Button>
          
          <Button
            onClick={handleSendRemindersNow}
            size="sm"
            disabled={loading || tomorrowBookings.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Kirim Reminder Sekarang
          </Button>
        </div>

        {tomorrowBookings.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Booking Besok ({tomorrowBookings.length}):</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tomorrowBookings.map((booking) => (
                <div key={booking.id} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="font-medium">{booking.nama}</div>
                  <div className="text-gray-600">{booking.no_hp} - {booking.alamat}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastReminderCheck && (
          <div className="text-xs text-gray-500">
            Reminder terakhir dikirim: {lastReminderCheck}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReminderSystem;

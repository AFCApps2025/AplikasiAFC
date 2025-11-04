import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarDays, Clock, User, MapPin } from 'lucide-react';

interface Booking {
  id: string;
  nama: string;
  no_hp: string;
  alamat: string;
  jenis_layanan: string;
  tanggal_kunjungan: string;
  status: string;
  teknisi: string;
  created_at: string;
}

interface BookingCalendarProps {
  onDateSelect?: (date: Date) => void;
  onBookingSelect?: (booking: Booking) => void;
}

const BookingCalendar = ({ onDateSelect, onBookingSelect }: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('tanggal_kunjungan', { ascending: true });

      if (error) throw error;

      // Filter booking yang bukan completed/selesai
      const scheduledBookings = (data || []).filter(booking => {
        const status = booking.status?.toLowerCase();
        return status !== 'completed' && status !== 'selesai';
      });

      setBookings(scheduledBookings);
      
      // Extract unique dates that have bookings
      const dates = scheduledBookings?.map(booking => {
        // Parse tanggal dengan format DD/MM/YYYY
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          
          // Coba format DD/MM/YYYY dulu
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(date.getTime())) return date;
          }
          
          // Coba parse langsung
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date;
        };
        
        return parseDate(booking.tanggal_kunjungan);
      }).filter(date => date !== null) || [];
      setBookedDates(dates);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);
    }
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      if (!booking.tanggal_kunjungan) return false;
      
      // Parse tanggal dengan format DD/MM/YYYY
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        
        // Coba format DD/MM/YYYY dulu
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) return date;
        }
        
        // Coba parse langsung
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };
      
      const bookingDate = parseDate(booking.tanggal_kunjungan);
      if (!bookingDate) return false;
      return isSameDay(bookingDate, date);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'confirmed':
        return 'Dikonfirmasi';
      case 'in_progress':
        return 'Sedang Dikerjakan';
      case 'completed':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Kalender Booking
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Booking yang terjadwal akan tampil pada kalender
          </p>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={id}
            className="rounded-md border"
            modifiers={{
              booked: bookedDates,
            }}
            modifiersStyles={{
              booked: {
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 'bold',
              },
            }}
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Tanggal dengan booking</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Jadwal {format(selectedDate, 'dd MMMM yyyy', { locale: id })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : selectedDateBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada booking untuk tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onBookingSelect?.(booking)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {(() => {
                          if (!booking.tanggal_kunjungan) return 'Tanggal tidak tersedia';
                          
                          // Parse tanggal dengan format DD/MM/YYYY
                          const parseDate = (dateStr) => {
                            const parts = dateStr.split('/');
                            if (parts.length === 3) {
                              const [day, month, year] = parts;
                              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              if (!isNaN(date.getTime())) return date;
                            }
                            
                            const date = new Date(dateStr);
                            return isNaN(date.getTime()) ? null : date;
                          };
                          
                          const date = parseDate(booking.tanggal_kunjungan);
                          if (!date) return 'Format tanggal salah';
                          
                          return date.toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          });
                        })()}
                      </span>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusText(booking.status)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.nama}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">
                        {booking.alamat}
                      </span>
                    </div>
                    
                    <div className="font-medium text-primary">
                      {booking.jenis_layanan}
                    </div>
                    
                    {booking.teknisi && (
                      <div className="text-muted-foreground">
                        Teknisi: {booking.teknisi}
                      </div>
                    )}
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingCalendar;

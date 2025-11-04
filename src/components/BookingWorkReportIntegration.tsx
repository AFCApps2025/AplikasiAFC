import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Calendar, FileText, User, MapPin, Phone, Clock } from 'lucide-react';

interface BookingData {
  id: string;
  booking_id: string;
  scheduled_date: string;
  status: string;
  notes?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  service_name: string;
  service_price: number;
}

const BookingWorkReportIntegration = () => {
  const [completedBookings, setCompletedBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedBookings();
  }, []);

  const fetchCompletedBookings = async () => {
    setLoading(true);
    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock completed bookings data
      const mockBookings: BookingData[] = [
        {
          id: '1',
          booking_id: 'AFC-001',
          scheduled_date: '2025-01-08',
          status: 'completed',
          notes: 'AC sudah dibersihkan dengan baik',
          customer_name: 'John Doe',
          customer_phone: '081234567890',
          customer_address: 'Jl. Sudirman No. 123, Jakarta',
          service_name: 'Cuci AC Split',
          service_price: 150000
        },
        {
          id: '2',
          booking_id: 'AFC-002',
          scheduled_date: '2025-01-07',
          status: 'completed',
          notes: 'Perbaikan kompresor selesai',
          customer_name: 'Jane Smith',
          customer_phone: '081987654321',
          customer_address: 'Jl. Thamrin No. 456, Jakarta',
          service_name: 'Service AC Central',
          service_price: 300000
        }
      ];
      
      setCompletedBookings(mockBookings);
    } catch (error) {
      console.error('Error fetching completed bookings:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkReportFromBooking = async (booking: BookingData) => {
    try {
      // Get current user from localStorage
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        toast({
          title: "Error",
          description: "Anda harus login terlebih dahulu",
          variant: "destructive",
        });
        return;
      }

      const user = JSON.parse(currentUser);

      // Simulate creating work report
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create work report data
      const workReportData = {
        id: `WR-${Date.now()}`,
        booking_id: booking.booking_id,
        customer_name: booking.customer_name,
        technician_name: user.name,
        technician_id: user.username,
        work_date: formatDateForDisplay(booking.scheduled_date),
        service_type: booking.service_name,
        notes: booking.notes || '',
        created_at: formatDateForDisplay(new Date().toISOString()),
        status: 'completed'
      };

      // Store in localStorage for demo purposes
      const existingReports = JSON.parse(localStorage.getItem('workReports') || '[]');
      existingReports.push(workReportData);
      localStorage.setItem('workReports', JSON.stringify(existingReports));

      // Remove from completed bookings list
      setCompletedBookings(prev => prev.filter(b => b.id !== booking.id));

      toast({
        title: "Berhasil",
        description: "Laporan kerja berhasil dibuat dari booking",
      });

    } catch (error) {
      console.error('Error creating work report:', error);
      toast({
        title: "Error",
        description: "Gagal membuat laporan kerja",
        variant: "destructive",
      });
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Booking Selesai - Buat Laporan Kerja</h2>
        <Badge variant="outline" className="text-sm">
          {completedBookings.length} booking tersedia
        </Badge>
      </div>

      {completedBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Tidak ada booking selesai
            </h3>
            <p className="text-gray-600">
              Belum ada booking dengan status selesai yang belum memiliki laporan kerja.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {completedBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Booking #{booking.booking_id}
                  </CardTitle>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Selesai
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Customer:</span>
                      <span>{booking.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Telepon:</span>
                      <span>{booking.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Alamat:</span>
                      <span className="text-sm">{booking.customer_address}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Tanggal:</span>
                      <span>{formatDateForDisplay(booking.scheduled_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Layanan:</span>
                      <span>{booking.service_name}</span>
                    </div>
                    {booking.notes && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                        <span className="font-medium">Catatan:</span>
                        <span className="text-sm">{booking.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => createWorkReportFromBooking(booking)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Buat Laporan Kerja
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingWorkReportIntegration;

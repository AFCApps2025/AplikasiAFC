import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Calendar, User, Wrench, FileText, Image } from 'lucide-react';

interface Booking {
  id: string;
  booking_id?: string;
  nama: string;
  no_hp: string;
  alamat: string;
  jenis_layanan: string;
  tanggal_kunjungan: string;
  tanggal_selesai?: string;
  status: string;
  teknisi: string;
  created_at: string;
  catatan?: string;
  merk?: string;
  no_unit?: string;
  spek_unit?: string;
  foto_url?: string;
  isWorkReport?: boolean;
}

const BrandHistory = () => {
  const navigate = useNavigate();
  const { phoneNumber, brandName } = useParams<{ phoneNumber: string; brandName: string }>();
  const [brandServices, setBrandServices] = useState<Booking[]>([]);
  const [customerInfo, setCustomerInfo] = useState<{
    nama: string;
    no_hp: string;
    alamat: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (phoneNumber && brandName) {
      fetchBrandHistory();
    }
  }, [phoneNumber, brandName]);

  const fetchBrandHistory = async () => {
    try {
      const decodedBrand = decodeURIComponent(brandName!);
      
      // Fetch both bookings and work reports for this phone number and brand
      const [bookingsResult, workReportsResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('no_hp', phoneNumber)
          .eq('merk', decodedBrand)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('work_reports')
          .select('*')
          .eq('no_wa_pelanggan', phoneNumber)
          .eq('merk', decodedBrand)
          .order('created_at', { ascending: false })
      ]);

      const bookingsData = bookingsResult.data || [];
      const workReportsData = workReportsResult.data || [];
      
      // Convert work reports to booking-like format
      const workReportsAsBookings = workReportsData.map(report => ({
        id: `wr_${report.id}`,
        booking_id: report.booking_id,
        nama: report.nama_pelanggan,
        no_hp: report.no_wa_pelanggan,
        alamat: report.alamat_pelanggan,
        jenis_layanan: report.jenis_pekerjaan,
        tanggal_kunjungan: report.tanggal_dikerjakan,
        tanggal_selesai: report.tanggal_dikerjakan,
        status: 'completed',
        teknisi: report.teknisi,
        created_at: report.created_at,
        catatan: report.keterangan,
        no_unit: report.no_unit,
        merk: report.merk,
        spek_unit: report.spek_unit,
        foto_url: report.foto_url,
        isWorkReport: true
      }));
      
      // Combine and sort by date
      const allServices = [...bookingsData, ...workReportsAsBookings].sort((a, b) => 
        new Date(b.tanggal_selesai || b.tanggal_kunjungan).getTime() - 
        new Date(a.tanggal_selesai || a.tanggal_kunjungan).getTime()
      );
      
      setBrandServices(allServices);
      
      // Set customer info from first service
      if (allServices.length > 0) {
        const firstService = allServices[0];
        setCustomerInfo({
          nama: firstService.nama,
          no_hp: firstService.no_hp,
          alamat: firstService.alamat
        });
      }
    } catch (error) {
      console.error('Error fetching brand history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'selesai':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'dikerjakan':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'menunggu':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'dibatalkan':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Memuat riwayat merk...</span>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gradient-to-br from-green-50 via-white to-orange-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Wrench className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-orange-500 bg-clip-text text-transparent">
          Riwayat Service {decodeURIComponent(brandName || '')}
        </h1>
      </div>

      {/* Customer & Brand Info */}
      {customerInfo && (
        <div className="bg-white rounded-lg shadow-lg border border-green-100 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{customerInfo.nama}</h2>
              <div className="flex items-center gap-4 text-gray-600 mt-2">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {customerInfo.no_hp}
                </span>
                <span>{customerInfo.alamat}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{brandServices.length}</div>
              <div className="text-sm text-gray-500">Total Service</div>
              <div className="text-sm text-gray-500">Merk: {decodeURIComponent(brandName || '')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Service History */}
      <div className="space-y-4">
        {brandServices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada riwayat service untuk merk ini</p>
          </div>
        ) : (
          brandServices.map((service, index) => (
            <div
              key={service.id}
              className="bg-white rounded-lg shadow-lg border border-green-100 p-6 hover:shadow-xl transition-shadow"
            >
              {/* Service Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Service #{brandServices.length - index}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                      {service.status === 'completed' ? 'Selesai' : service.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{service.jenis_layanan}</h3>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(service.tanggal_selesai || service.tanggal_kunjungan).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-r from-green-50 to-orange-50 p-4 rounded-lg mb-4">
                <div>
                  <span className="text-gray-600 font-medium text-sm">Teknisi:</span>
                  <p className="font-semibold text-gray-800">{service.teknisi}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium text-sm">No Unit:</span>
                  <p className="font-semibold text-gray-800">{service.no_unit || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium text-sm">Spek Unit:</span>
                  <p className="font-semibold text-gray-800">{service.spek_unit || '-'}</p>
                </div>
              </div>

              {/* Notes */}
              {service.catatan && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-600 font-medium text-sm">Catatan:</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-700">{service.catatan}</p>
                  </div>
                </div>
              )}

              {/* Foto URL */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Image className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-600 font-medium text-sm">Foto URL:</span>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-gray-700 text-sm break-all">
                    FOTO URL: {service.foto_url || 'NULL/EMPTY'}
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Debug: isWorkReport = {service.isWorkReport ? 'YES' : 'NO'}
                  </p>
                </div>
              </div>

              {/* Booking ID */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  Booking ID: {service.booking_id || service.id}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BrandHistory;

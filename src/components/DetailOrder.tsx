import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Search, User, Phone, MapPin, Package, Calendar, Clock, FileText, Image, CheckCircle } from 'lucide-react';

interface BookingData {
  id?: string;
  booking_id?: string;
  nama?: string;
  no_hp?: string;
  alamat?: string;
  cluster?: string;
  jenis_layanan?: string;
  jumlah_unit?: number;
  tanggal_kunjungan?: string;
  waktu_kunjungan?: string;
  teknisi?: string;
  status?: string;
  catatan?: string;
  created_at?: string;
}

interface WorkReportData {
  id?: string;
  booking_id?: string;
  nama_pelanggan?: string;
  no_wa_pelanggan?: string;
  alamat_pelanggan?: string;
  teknisi?: string;
  helper?: string;
  jenis_pekerjaan?: string;
  no_unit?: string;
  merk?: string;
  spek_unit?: string;
  tanggal_dikerjakan?: string;
  keterangan?: string;
  catatan_teknisi?: string;
  foto_url?: string | null;
  status?: string;
  created_at?: string;
}

interface CombinedOrderData extends BookingData {
  work_report?: WorkReportData;
  has_work_report: boolean;
}

const DetailOrder = () => {
  const [orders, setOrders] = useState<CombinedOrderData[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<CombinedOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<CombinedOrderData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchOrdersData();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, statusFilter]);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);

      // Fetch bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch work reports data
      const { data: workReportsData, error: workReportsError } = await supabase
        .from('work_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (workReportsError) throw workReportsError;

      // Combine data: prioritize bookings, supplement with work_reports
      const combinedData: CombinedOrderData[] = (bookingsData || []).map(booking => {
        const workReport = (workReportsData || []).find(wr => wr.booking_id === booking.booking_id);
        
        return {
          ...booking,
          // If data missing in booking, use work_report data
          nama: booking?.nama || (workReport?.nama_pelanggan || ''),
          no_hp: booking?.no_hp || (workReport?.no_wa_pelanggan || ''),
          alamat: booking?.alamat || (workReport?.alamat_pelanggan || ''),
          jumlah_unit: booking?.jumlah_unit || 0,
          // Update status to 'completed' if work report exists
          status: workReport ? 'completed' : (booking?.status || 'pending'),
          work_report: workReport,
          has_work_report: !!workReport
        };
      });

      // Add work reports that don't have corresponding bookings
      const orphanWorkReports = (workReportsData || []).filter(wr => 
        !(bookingsData || []).some(booking => booking.booking_id === wr.booking_id)
      );

      orphanWorkReports.forEach(wr => {
        combinedData.push({
          id: wr?.id || '',
          booking_id: wr?.booking_id || '',
          nama: wr?.nama_pelanggan || '',
          no_hp: wr?.no_wa_pelanggan || '',
          alamat: wr?.alamat_pelanggan || '',
          cluster: '',
          jenis_layanan: wr?.jenis_pekerjaan || '',
          jumlah_unit: 1, // Default to 1 since work_reports doesn't have this field
          tanggal_kunjungan: wr?.tanggal_dikerjakan || '',
          waktu_kunjungan: '',
          teknisi: wr?.teknisi || '',
          status: wr?.status || 'completed',
          catatan: wr?.keterangan || '',
          created_at: wr?.created_at || '',
          work_report: wr,
          has_work_report: true
        });
      });

      setOrders(combinedData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        (order?.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order?.booking_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order?.no_hp || '').includes(searchTerm) ||
        (order?.alamat || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order?.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Sedang Dikerjakan', color: 'bg-orange-100 text-orange-800' },
      completed: { label: 'Selesai', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const showOrderDetail = (order: CombinedOrderData) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const renderPhotos = (photoUrl: string | null) => {
    if (!photoUrl) return null;

    try {
      // Handle both single photo (string) and multiple photos (JSON array)
      const photos = typeof photoUrl === 'string' && photoUrl.startsWith('[') 
        ? JSON.parse(photoUrl) 
        : [photoUrl];

      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {photos.map((photo: string, index: number) => (
            <img
              key={index}
              src={photo}
              alt={`Foto ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg border"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/200x150/e2e8f0/4a5568?text=No+Image';
              }}
            />
          ))}
        </div>
      );
    } catch (error) {
      return (
        <img
          src={photoUrl}
          alt="Foto laporan"
          className="w-full h-32 object-cover rounded-lg border"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/200x150/e2e8f0/4a5568?text=No+Image';
          }}
        />
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="h-6 w-6" />
          Detail Order
        </h1>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cari berdasarkan nama, booking ID, no HP, atau alamat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
              <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pagination Info */}
        {filteredOrders.length > 0 && (
          <div className="flex justify-between items-center text-sm text-gray-600 bg-white p-3 rounded-lg border">
            <span>
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} dari {filteredOrders.length} order
            </span>
            <span>Halaman {currentPage} dari {totalPages}</span>
          </div>
        )}

        {/* Orders List */}
        <div className="grid gap-4">
          {currentOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {filteredOrders.length === 0 ? 'Tidak ada order yang ditemukan' : 'Tidak ada data di halaman ini'}
                </p>
              </CardContent>
            </Card>
          ) : (
            currentOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{order?.booking_id || ''}</h3>
                        {getStatusBadge(order?.status || 'pending')}
                        {order?.has_work_report && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ada Laporan
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{order?.nama || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{order?.no_hp || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{order?.alamat || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{order?.jumlah_unit || 0} unit AC</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(order?.tanggal_kunjungan || '')}</span>
                        {order?.waktu_kunjungan && (
                          <>
                            <Clock className="h-4 w-4 ml-2" />
                            <span>{order.waktu_kunjungan}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => showOrderDetail(order)}
                      variant="outline"
                      size="sm"
                      className="self-start sm:self-center"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Detail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Sebelumnya
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-green-600 text-white border-green-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Detail Order {selectedOrder?.booking_id || ''}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Tutup
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informasi Pelanggan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nama</label>
                        <p className="font-medium">{selectedOrder?.nama || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">No HP</label>
                        <p className="font-medium">{selectedOrder?.no_hp || '-'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Alamat</label>
                        <p className="font-medium">{selectedOrder?.alamat || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Cluster</label>
                        <p className="font-medium">{selectedOrder?.cluster || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Jumlah Unit</label>
                        <p className="font-medium">{selectedOrder?.jumlah_unit || 0} unit AC</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informasi Layanan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Jenis Layanan</label>
                        <p className="font-medium">{selectedOrder?.jenis_layanan || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(selectedOrder?.status || 'pending')}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tanggal Kunjungan</label>
                        <p className="font-medium">{formatDate(selectedOrder?.tanggal_kunjungan || '')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Waktu Kunjungan</label>
                        <p className="font-medium">{selectedOrder?.waktu_kunjungan || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Teknisi</label>
                        <p className="font-medium">{selectedOrder?.teknisi || '-'}</p>
                      </div>
                      {selectedOrder?.work_report?.helper && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Helper</label>
                          <p className="font-medium">{selectedOrder.work_report.helper}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedOrder?.catatan && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Catatan</label>
                        <p className="font-medium bg-gray-50 p-3 rounded-lg">{selectedOrder.catatan}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Work Report Info */}
                {selectedOrder?.work_report && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Laporan Kerja
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedOrder?.work_report?.catatan_teknisi && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Catatan Teknisi</label>
                          <p className="font-medium bg-green-50 p-3 rounded-lg">{selectedOrder.work_report.catatan_teknisi}</p>
                        </div>
                      )}
                      
                      {selectedOrder?.work_report?.foto_url && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Foto Laporan</label>
                          {renderPhotos(selectedOrder.work_report.foto_url)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailOrder;

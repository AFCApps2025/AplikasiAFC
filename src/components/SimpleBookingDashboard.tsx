import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Phone, MapPin, Package, Droplets, Wrench, Plus, X, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

const SimpleBookingDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => {
    fetchBookings();
  }, []);

  // Add refresh function for manual data reload
  const refreshData = () => {
    setBookings([]);
    fetchBookings();
  };

  const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
    try {
      // Format phone number
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('62')) {
        formattedPhone = '62' + formattedPhone;
      }

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

      if (response.ok) {
        console.log('WhatsApp message sent successfully');
      } else {
        console.error('Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from Supabase first (for real customer data)
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!supabaseError && supabaseData) {
        // Use real Supabase data if available
        setBookings(supabaseData);
        console.log('Dashboard loaded bookings from Supabase:', supabaseData.length);
      } else {
        // Fallback to localStorage for offline mode
        console.log('Supabase unavailable for dashboard, using localStorage fallback');
        const existingBookings = JSON.parse(localStorage.getItem('allBookings') || '[]');
        setBookings(existingBookings);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Gagal memuat data dashboard');
      // Fallback to localStorage on any error
      const existingBookings = JSON.parse(localStorage.getItem('allBookings') || '[]');
      setBookings(existingBookings);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics - count units from jenis_layanan column
  const cuciBookings = bookings.filter(b => b.jenis_layanan?.toLowerCase().includes('cuci'));
  const perbaikanBookings = bookings.filter(b => b.jenis_layanan?.toLowerCase().includes('perbaikan') || b.jenis_layanan?.toLowerCase().includes('service'));
  const pasangBaruBookings = bookings.filter(b => b.jenis_layanan?.toLowerCase().includes('pasang') || b.jenis_layanan?.toLowerCase().includes('instalasi'));
  
  // Extract unit counts from jenis_layanan strings
  const extractUnitCount = (jenisLayanan: string): number => {
    if (!jenisLayanan) return 0;
    const match = jenisLayanan.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 1; // Default to 1 if no number found
  };
  
  const totalCuci = cuciBookings.reduce((sum, booking) => sum + extractUnitCount(booking.jenis_layanan), 0);
  const totalPerbaikan = perbaikanBookings.reduce((sum, booking) => sum + extractUnitCount(booking.jenis_layanan), 0);
  const totalPasangBaru = pasangBaruBookings.reduce((sum, booking) => sum + extractUnitCount(booking.jenis_layanan), 0);
  const totalUnit = totalCuci + totalPerbaikan + totalPasangBaru;
  
  const allBookings = bookings.filter(b => !b.id.startsWith('wr_'));
  const totalBooking = allBookings.length;

  const handleCardClick = (type: string) => {
    let data: Booking[] = [];
    
    switch (type) {
      case 'unit':
        data = bookings;
        break;
      case 'cuci':
        data = cuciBookings;
        break;
      case 'perbaikan':
        data = perbaikanBookings;
        break;
      case 'pasang_baru':
        data = pasangBaruBookings;
        break;
      case 'booking':
        data = allBookings;
        break;
      default:
        data = [];
    }
    
    setModalData(data);
    setSelectedModal(type);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const closeModal = () => {
    setSelectedModal(null);
    setModalData([]);
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Filter data based on search term
  const filteredData = modalData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.nama?.toLowerCase().includes(searchLower) ||
      item.alamat?.toLowerCase().includes(searchLower) ||
      item.jenis_layanan?.toLowerCase().includes(searchLower) ||
      item.teknisi?.toLowerCase().includes(searchLower) ||
      item.status?.toLowerCase().includes(searchLower) ||
      item.id?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getModalTitle = (type: string) => {
    switch (type) {
      case 'unit': return 'Detail Semua Unit';
      case 'cuci': return 'Detail Layanan Cuci';
      case 'perbaikan': return 'Detail Layanan Perbaikan';
      case 'pasang_baru': return 'Detail Layanan Pasang Baru';
      case 'booking': return 'Detail Semua Booking';
      default: return 'Detail';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'selesai':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'menunggu':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
      case 'dikerjakan':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
      case 'terjadwal':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
      case 'dikonfirmasi':
        return 'bg-green-100 text-green-800';
      case 'rescheduled':
      case 'dijadwal_ulang':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Memuat data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto bg-gradient-to-br from-green-50 via-white to-orange-50 min-h-screen">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-orange-500 bg-clip-text text-transparent">Dashboard Booking</h1>
        </div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Booking</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card 
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
              onClick={() => handleCardClick('unit')}
            >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Unit</p>
                  <p className="text-2xl font-bold">{totalUnit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-200" />
                  <Package className="h-8 w-8 text-blue-200" />
                </div>
              </div>
            </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-r from-green-500 to-green-600 text-white cursor-pointer hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
              onClick={() => handleCardClick('cuci')}
            >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Cuci</p>
                  <p className="text-2xl font-bold">{totalCuci}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-200" />
                  <Droplets className="h-8 w-8 text-green-200" />
                </div>
              </div>
            </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105"
              onClick={() => handleCardClick('perbaikan')}
            >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Total Perbaikan</p>
                  <p className="text-2xl font-bold">{totalPerbaikan}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-orange-200" />
                  <Wrench className="h-8 w-8 text-orange-200" />
                </div>
              </div>
            </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              onClick={() => handleCardClick('pasang_baru')}
            >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Pasang Baru</p>
                  <p className="text-2xl font-bold">{totalPasangBaru}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-200" />
                  <Plus className="h-8 w-8 text-purple-200" />
                </div>
              </div>
            </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white cursor-pointer hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
              onClick={() => handleCardClick('booking')}
            >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Total Booking</p>
                  <p className="text-2xl font-bold">{totalBooking}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-200" />
                  <Calendar className="h-8 w-8 text-indigo-200" />
                </div>
              </div>
            </CardContent>
            </Card>

        </div>

        {/* Area Coverage Info (tanpa peta) */}
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center">
            <MapPin className="mr-2" size={20} />
            Area Layanan AFC
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sm">BSD</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Aktif</Badge>
              </div>
              <p className="text-xs text-gray-600 ml-6">Bumi Serpong Damai</p>
            </div>
            
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sm">Bintaro</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Aktif</Badge>
              </div>
              <p className="text-xs text-gray-600 ml-6">Bintaro Jaya</p>
            </div>
            
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sm">Tangerang Selatan</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Aktif</Badge>
              </div>
              <p className="text-xs text-gray-600 ml-6">Ciputat, Pamulang</p>
            </div>
            
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sm">Jakarta Selatan</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Aktif</Badge>
              </div>
              <p className="text-xs text-gray-600 ml-6">Pondok Indah</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg mb-20">
            <h4 className="font-semibold text-blue-800 mb-2">Statistik Coverage</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <span className="text-blue-600 block">Total Area</span>
                <span className="font-bold text-lg">4 Zona</span>
              </div>
              <div className="text-center">
                <span className="text-blue-600 block">Region</span>
                <span className="font-bold text-lg">Jabodetabek</span>
              </div>
              <div className="text-center">
                <span className="text-blue-600 block">Status</span>
                <span className="font-bold text-lg text-green-600">Aktif</span>
              </div>
            </div>
          </div>
        </div>

        </CardContent>
      </Card>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 shadow-md">
          {error}
        </div>
      )}
      
      {/* Detail Modal */}
      {selectedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">{getModalTitle(selectedModal)}</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="p-4 sm:p-6 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama, alamat, layanan..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
              {filteredData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">{searchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Tidak ada data untuk ditampilkan'}</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {currentData.map((item, index) => (
                    <Card key={startIndex + index} className="border border-gray-200">
                      <CardContent className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Nama Pelanggan</label>
                            <p className="font-medium">{item.nama || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Alamat</label>
                            <p className="font-medium">{item.alamat || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Jenis Layanan</label>
                            <p className="font-medium">{item.jenis_layanan || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Tanggal Kunjungan</label>
                            <p className="font-medium">{item.tanggal_kunjungan || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Teknisi</label>
                            <p className="font-medium">{item.teknisi || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status || 'Tidak diketahui'}
                            </Badge>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">ID Booking</label>
                            <p className="font-medium text-xs">{item.id || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Dibuat</label>
                            <p className="font-medium text-xs">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            {/* Pagination - Fixed at bottom */}
            {filteredData.length > 0 && totalPages > 1 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 sm:relative sm:shadow-none sm:p-6 sm:border-t sm:bg-gray-50 flex-shrink-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-2 order-2 sm:order-1">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="flex items-center gap-1 max-w-[200px] sm:max-w-none overflow-x-auto">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm min-w-[32px] ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-600 order-1 sm:order-2">
                    <span className="hidden sm:inline">Halaman {currentPage} dari {totalPages} • </span>
                    <span className="sm:hidden">{currentPage}/{totalPages} • </span>
                    {startIndex + 1}-{Math.min(endIndex, filteredData.length)} dari {filteredData.length}
                  </p>
                </div>
              </div>
            )}
            
            {/* Footer - only show if no pagination */}
            {!(filteredData.length > 0 && totalPages > 1) && (
              <div className="p-4 sm:p-6 border-t bg-gray-50 flex-shrink-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <p className="text-sm text-gray-600 order-2 sm:order-1">
                    Total: {filteredData.length} {selectedModal === 'pelanggan' ? 'pelanggan' : 'data'}
                  </p>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors order-1 sm:order-2"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
            
            {/* Close button for paginated content - Mobile */}
            {filteredData.length > 0 && totalPages > 1 && (
              <div className="sm:hidden fixed top-4 right-4 z-10">
                <button
                  onClick={closeModal}
                  className="p-2 bg-white rounded-full shadow-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {/* Close button for paginated content - Desktop */}
            {filteredData.length > 0 && totalPages > 1 && (
              <div className="hidden sm:block p-4 border-t flex-shrink-0">
                <div className="flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleBookingDashboard;

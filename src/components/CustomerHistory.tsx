import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, User, Wrench, X, Calendar, UserCheck, Hash, Settings } from 'lucide-react';

interface WorkReport {
  id: string;
  booking_id: string;
  nama_pelanggan: string;
  no_wa_pelanggan: string;
  alamat_pelanggan: string;
  jenis_pekerjaan: string;
  tanggal_dikerjakan: string;
  teknisi: string;
  merk: string;
  no_unit: string;
  spek_unit: string | null;
  keterangan: string;
  created_at: string;
  foto_url?: string;
}

interface BrandSummary {
  merk: string;
  count: number;
  lastService: string;
  services: WorkReport[];
}

const CustomerHistory = () => {
  const navigate = useNavigate();
  const { phoneNumber } = useParams<{ phoneNumber: string }>();
  const [customerData, setCustomerData] = useState<{
    nama: string;
    no_hp: string;
    alamat: string;
    totalOrders: number;
    brands: BrandSummary[];
    allServices: WorkReport[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<BrandSummary | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (phoneNumber) {
      fetchCustomerHistory();
    }
  }, [phoneNumber]);

  const fetchCustomerHistory = async () => {
    try {
      // Fetch work reports for this phone number
      const { data: workReportsData, error } = await supabase
        .from('work_reports')
        .select('*')
        .eq('no_wa_pelanggan', phoneNumber)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work reports:', error);
        return;
      }

      if (!workReportsData || workReportsData.length === 0) {
        setCustomerData(null);
        setLoading(false);
        return;
      }

      // Get customer basic info from first service
      const firstService = workReportsData[0];
      
      // Group by brand
      const brandMap = new Map<string, BrandSummary>();
      
      workReportsData.forEach(service => {
        const brand = service.merk || 'Tidak Diketahui';
        
        if (brandMap.has(brand)) {
          const existing = brandMap.get(brand)!;
          existing.services.push(service);
          existing.count += 1;
          
          if (service.tanggal_dikerjakan && new Date(service.tanggal_dikerjakan) > new Date(existing.lastService)) {
            existing.lastService = service.tanggal_dikerjakan;
          }
        } else {
          brandMap.set(brand, {
            merk: brand,
            count: 1,
            lastService: service.tanggal_dikerjakan || '',
            services: [service]
          });
        }
      });

      setCustomerData({
        nama: firstService.nama_pelanggan,
        no_hp: firstService.no_wa_pelanggan,
        alamat: firstService.alamat_pelanggan,
        totalOrders: workReportsData.length,
        brands: Array.from(brandMap.values()).sort((a, b) => b.count - a.count),
        allServices: workReportsData
      });
    } catch (error) {
      console.error('Error fetching customer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandClick = (brand: BrandSummary) => {
    setSelectedBrand(brand);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBrand(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Memuat riwayat pelanggan...</span>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Riwayat Pelanggan</h1>
        </div>
        <div className="text-center py-8 text-gray-500">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Data pelanggan tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <User className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold text-green-600">
          Riwayat Pelanggan
        </h1>
      </div>

      {/* Customer Info Header */}
      <div className="bg-white rounded-lg shadow-md border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{customerData.nama}</h2>
            {(localStorage.getItem('currentUser') && 
              ['admin', 'manager'].includes(JSON.parse(localStorage.getItem('currentUser') || '{}').role)) && (
              <p className="text-blue-600 text-lg">{customerData.no_hp}</p>
            )}
            <p className="text-gray-600 mt-1">{customerData.alamat}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">{customerData.totalOrders}</div>
            <div className="text-sm text-gray-500">Total Transaksi</div>
          </div>
        </div>
      </div>

      {/* Brand Summary */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-500" />
          Riwayat per Merk AC
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customerData.brands.map((brand) => (
            <div 
              key={brand.merk} 
              className="bg-white rounded-lg shadow-md border p-4 cursor-pointer hover:shadow-lg hover:border-green-300 transition-all duration-200 transform hover:scale-105"
              onClick={() => handleBrandClick(brand)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-lg text-gray-800">{brand.merk}</h4>
                  <div className="text-sm text-gray-500">Service</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Terakhir</div>
                  <div className="text-sm font-medium text-gray-700">
                    {brand.lastService || '-'}
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">{brand.count}x</div>
              <div className="text-xs text-gray-400 mt-2">Klik untuk detail</div>
            </div>
          ))}
        </div>
      </div>

      {/* Service History */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-500" />
          Riwayat Service Terbaru
        </h3>
        <div className="space-y-4">
          {customerData.allServices.slice(0, 1).map((service) => (
            <div key={service.id} className="bg-white rounded-lg shadow-md border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-gray-800">{service.jenis_pekerjaan}</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                  Selesai
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Tanggal:</span>
                  <div className="font-medium">
                    {(() => {
                      console.log('Service ID:', service.id, 'tanggal_dikerjakan:', service.tanggal_dikerjakan);
                      if (service.tanggal_dikerjakan) {
                        // If it's already in DD/MM/YYYY format, return as is
                        if (typeof service.tanggal_dikerjakan === 'string' && service.tanggal_dikerjakan.includes('/')) {
                          return service.tanggal_dikerjakan;
                        }
                        // If it's a date object or ISO string, format it
                        try {
                          const date = new Date(service.tanggal_dikerjakan);
                          return date.toLocaleDateString('id-ID');
                        } catch (e) {
                          return service.tanggal_dikerjakan;
                        }
                      }
                      return '-';
                    })()}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Teknisi:</span>
                  <div className="font-medium">{service.teknisi || '-'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-500">No Unit:</span>
                  <div className="font-medium">{service.no_unit || '-'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Status:</span>
                  <div className="font-medium text-green-600">Selesai</div>
                </div>
              </div>
              
              {service.keterangan && (
                <div className="mt-3 pt-3 border-t">
                  <span className="font-medium text-gray-500">Catatan:</span>
                  <p className="mt-1 text-gray-700">{service.keterangan}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBrand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  Detail Service - {selectedBrand.merk}
                </h2>
              </div>
              <button
                onClick={closeDetailModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Brand Summary */}
              <div className="bg-gradient-to-r from-green-50 to-orange-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{selectedBrand.merk}</h3>
                    <p className="text-gray-600">Total {selectedBrand.count} kali service</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Service Terakhir</p>
                    <p className="font-medium text-gray-700">
                      {selectedBrand.lastService ? 
                        (() => {
                          if (selectedBrand.lastService.includes('/')) {
                            return selectedBrand.lastService;
                          }
                          try {
                            return new Date(selectedBrand.lastService).toLocaleDateString('id-ID');
                          } catch (e) {
                            return selectedBrand.lastService;
                          }
                        })() 
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Riwayat Service Detail</h4>
                {selectedBrand.services.map((service, index) => (
                  <div key={service.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Service Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Service #{selectedBrand.services.length - index}
                        </span>
                        <span className="text-gray-600">{service.jenis_pekerjaan}</span>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Selesai
                      </span>
                    </div>

                    {/* Service Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-xs text-gray-500 block">Tanggal Dikerjakan</span>
                          <span className="font-medium text-gray-800">
                            {(() => {
                              if (service.tanggal_dikerjakan) {
                                if (service.tanggal_dikerjakan.includes('/')) {
                                  return service.tanggal_dikerjakan;
                                }
                                try {
                                  return new Date(service.tanggal_dikerjakan).toLocaleDateString('id-ID');
                                } catch (e) {
                                  return service.tanggal_dikerjakan;
                                }
                              }
                              return '-';
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-xs text-gray-500 block">Teknisi</span>
                          <span className="font-medium text-gray-800">{service.teknisi || '-'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-xs text-gray-500 block">No Unit</span>
                          <span className="font-medium text-gray-800">{service.no_unit || '-'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-xs text-gray-500 block">Model</span>
                          <span className="font-medium text-gray-800">{service.spek_unit || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    {service.keterangan && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1">Catatan:</span>
                        <p className="text-gray-700">{service.keterangan}</p>
                      </div>
                    )}

                    {/* Foto Service */}
                    {service.foto_url && service.foto_url !== 'null' && service.foto_url !== '' && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500 block mb-2">Foto Service:</span>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          {(() => {
                            try {
                              const photos = JSON.parse(service.foto_url);
                              return Array.isArray(photos) ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {photos.map((photo, photoIndex) => (
                                    <img
                                      key={photoIndex}
                                      src={photo}
                                      alt={`Foto service ${photoIndex + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border hover:scale-105 transition-transform cursor-pointer"
                                      onClick={() => window.open(photo, '_blank')}
                                      onError={(e) => {
                                        console.error('Image load error:', photo);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <img
                                  src={service.foto_url}
                                  alt="Foto service"
                                  className="w-full max-w-xs h-32 object-cover rounded-lg border hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(service.foto_url, '_blank')}
                                  onError={(e) => {
                                    console.error('Image load error:', service.foto_url);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              );
                            } catch (e) {
                              return (
                                <img
                                  src={service.foto_url}
                                  alt="Foto service"
                                  className="w-full max-w-xs h-32 object-cover rounded-lg border hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(service.foto_url, '_blank')}
                                  onError={(e) => {
                                    console.error('Image load error:', service.foto_url);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerHistory;

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { History, Search, Filter, User, Eye, Calendar, Phone, MapPin, X, Image, CheckCircle, Clock, Edit, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';

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
  helper?: string;
  created_at: string;
  catatan?: string;
  merk?: string;
  no_unit?: string;
  spek_unit?: string;
  foto_url?: string;
  isWorkReport?: boolean;
}

interface CustomerSummary {
  nama: string;
  no_hp: string;
  alamat: string;
  total_orders: number;
  last_service: string;
  services: Booking[];
}

const OrderHistoryNew = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'customer'>('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Booking>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [showComplainModal, setShowComplainModal] = useState(false);
  const [complainBooking, setComplainBooking] = useState<Booking | null>(null);
  const [complainFormData, setComplainFormData] = useState({
    tanggal_kunjungan: '',
    teknisi: '',
    keterangan_komplain: ''
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Optimize query with specific fields and date filtering
      let query = supabase
        .from('work_reports')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      // Apply month filtering if selected
      if (selectedMonth) {
        const year = selectedMonth.split('-')[0];
        const month = selectedMonth.split('-')[1];
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;
        
        query = query
          .gte('tanggal_dikerjakan', startDate)
          .lte('tanggal_dikerjakan', endDate);
      }

      const { data: workReportsData, error } = await query;
      
      if (error) throw error;
      
      // Process data efficiently
      const processedBookings = (workReportsData || []).map(report => ({
        id: `wr_${report.id}`, // Add wr_ prefix for consistency
        workReportId: report.id, // Store original ID for deletion
        booking_id: report.booking_id,
        nama: report.nama_pelanggan || 'Unknown',
        no_hp: report.no_wa_pelanggan || '',
        alamat: report.alamat_pelanggan || '',
        jenis_layanan: report.jenis_pekerjaan || '',
        tanggal_kunjungan: report.tanggal_dikerjakan || '',
        tanggal_selesai: report.tanggal_dikerjakan || '',
        status: 'completed',
        teknisi: report.teknisi || '',
        helper: (report as any).helper || '',
        created_at: report.created_at,
        catatan: report.keterangan || '',
        merk: report.merk || '',
        no_unit: report.no_unit || '',
        spek_unit: report.spek_unit || '',
        foto_url: report.foto_url,
        isWorkReport: true
      }));
      
      setBookings(processedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (bookings.length > 0) {
      generateCustomerSummaries();
    }
  }, [bookings]);

  useEffect(() => {
    setCurrentPage(1);
    setCustomerCurrentPage(1);
  }, [searchQuery, filterBy, selectedMonth, activeTab]);

  const originalFetchBookings = async () => {
    try {
      // Fetch only APPROVED work reports for order history
      const workReportsResult = await supabase
        .from('work_reports')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (workReportsResult.error) throw workReportsResult.error;
      
      const workReportsData = workReportsResult.data || [];
      
      // Helper function to parse DD/MM/YYYY format to valid date
      const parseDDMMYYYY = (dateString: string) => {
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
          // Use current date as fallback for completed work reports
          return new Date().toISOString().split('T')[0];
        }
        
        // Handle DD/MM/YYYY format
        if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
          }
        }
        
        // Handle ISO format
        if (dateString.includes('-')) {
          return dateString;
        }
        
        // If all else fails, use current date
        return new Date().toISOString().split('T')[0];
      };

      // Convert work reports to booking-like format
      const workReportsAsBookings = workReportsData.map(report => {
        // Debug logging to see what data we're getting
        console.log('Work report raw data:', {
          id: report.id,
          tanggal_dikerjakan: report.tanggal_dikerjakan,
          tanggal_dikerjakan_type: typeof report.tanggal_dikerjakan,
          nama_pelanggan: report.nama_pelanggan,
          teknisi: report.teknisi,
          created_at: report.created_at
        });
        
        // Use tanggal_dikerjakan from work_reports table as the completion date
        const tanggalDikerjakan = report.tanggal_dikerjakan || new Date().toLocaleDateString('id-ID');
        console.log('Tanggal dikerjakan from work_reports:', tanggalDikerjakan);
        
        return {
          id: `wr_${report.id}`,
          booking_id: report.booking_id,
          nama: report.nama_pelanggan,
          no_hp: report.no_wa_pelanggan,
          alamat: report.alamat_pelanggan,
          jenis_layanan: report.jenis_pekerjaan,
          tanggal_kunjungan: tanggalDikerjakan, // Use tanggal_dikerjakan
          tanggal_selesai: tanggalDikerjakan,   // Use tanggal_dikerjakan as completion date
          status: 'completed',
          teknisi: report.teknisi,
          created_at: report.created_at,
          keterangan: report.keterangan,
          no_unit: report.no_unit,
          merk: report.merk,
          spek_unit: report.spek_unit,
          foto_url: report.foto_url,
          isWorkReport: true
        };
      });
      
      // Hanya gunakan data dari work_reports (semua sudah selesai)
      let filteredData = [...workReportsAsBookings];
      
      if (selectedMonth) {
        const year = parseInt(selectedMonth.split('-')[0]);
        const month = parseInt(selectedMonth.split('-')[1]);
        
        filteredData = filteredData.filter(booking => {
          // Primary filter: tanggal_selesai (completion date)
          if (booking.tanggal_selesai) {
            try {
              let dateToCheck;
              if (booking.tanggal_selesai.includes('-')) {
                const parts = booking.tanggal_selesai.split('-');
                if (parts[0].length === 4) {
                  dateToCheck = new Date(booking.tanggal_selesai);
                } else {
                  dateToCheck = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
              } else if (booking.tanggal_selesai.includes('/')) {
                const parts = booking.tanggal_selesai.split('/');
                dateToCheck = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                dateToCheck = new Date(booking.tanggal_selesai);
              }
              
              if (!isNaN(dateToCheck.getTime())) {
                return dateToCheck.getFullYear() === year && (dateToCheck.getMonth() + 1) === month;
              }
            } catch (e) {
              console.error('Error parsing tanggal_selesai:', booking.tanggal_selesai, e);
            }
          }
          
          // Secondary filter: tanggal_kunjungan if tanggal_selesai is invalid/null
          if (booking.tanggal_kunjungan) {
            try {
              const bookingDate = new Date(booking.tanggal_kunjungan);
              if (!isNaN(bookingDate.getTime())) {
                return bookingDate.getFullYear() === year && (bookingDate.getMonth() + 1) === month;
              }
            } catch (e) {
              console.error('Error parsing tanggal_kunjungan:', booking.tanggal_kunjungan, e);
            }
          }
          
          // Final fallback: created_at
          if (booking.created_at) {
            try {
              const createdDate = new Date(booking.created_at);
              if (!isNaN(createdDate.getTime())) {
                return createdDate.getFullYear() === year && (createdDate.getMonth() + 1) === month;
              }
            } catch (e) {
              console.error('Error parsing created_at:', booking.created_at, e);
            }
          }
          
          return false;
        });
      }
      
      setBookings(filteredData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCustomerSummaries = () => {
    const customerMap = new Map<string, CustomerSummary>();

    bookings.forEach(booking => {
      const key = `${booking.nama}-${booking.no_hp}`;
      
      if (customerMap.has(key)) {
        const existing = customerMap.get(key)!;
        existing.services.push(booking);
        existing.total_orders += 1;
        
        // For work reports, use tanggal_selesai (which is tanggal_dikerjakan)
        // For bookings, use tanggal_selesai if available, otherwise tanggal_kunjungan
        const serviceDate = booking.isWorkReport ? booking.tanggal_selesai : (booking.tanggal_selesai || booking.tanggal_kunjungan);
        if (new Date(serviceDate) > new Date(existing.last_service)) {
          existing.last_service = serviceDate;
        }
      } else {
        const initialServiceDate = booking.isWorkReport ? booking.tanggal_selesai : (booking.tanggal_selesai || booking.tanggal_kunjungan);
        customerMap.set(key, {
          nama: booking.nama,
          no_hp: booking.no_hp,
          alamat: booking.alamat,
          total_orders: 1,
          last_service: initialServiceDate,
          services: [booking]
        });
      }
    });

    setCustomerSummaries(Array.from(customerMap.values()));
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

  const formatDisplayDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return 'Tanggal tidak tersedia';
    }
    
    // If already in DD/MM/YYYY format, return as is
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString;
    }
    
    try {
      // Handle DD/MM/YYYY format with validation
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          
          // Validate date parts
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
            return `${day}/${month}/${year}`;
          }
        }
      }
      
      // Handle ISO format (YYYY-MM-DD)
      if (dateString.includes('-')) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
      }
      
      // Try to parse as regular date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      // If still can't parse, return original string
      console.warn('Could not parse date:', dateString);
      return dateString;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Format tanggal tidak valid';
    }
  };

  const openDetailModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
    setIsEditing(false);
  };

  const openEditModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditFormData(booking);
    setShowModal(true);
    setIsEditing(true);
  };

  const openDeleteConfirm = (booking: Booking) => {
    setBookingToDelete(booking);
    setShowDeleteConfirm(true);
  };

  const openComplainModal = (booking: Booking) => {
    setComplainBooking(booking);
    setComplainFormData({
      tanggal_kunjungan: new Date().toISOString().split('T')[0],
      teknisi: '',
      keterangan_komplain: ''
    });
    setShowComplainModal(true);
  };

  const handleSubmitComplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complainBooking) return;

    try {
      // Get booking data from work report
      const workReportId = complainBooking.id.replace('wr_', '');
      const { data: workReportData, error: fetchError } = await supabase
        .from('work_reports')
        .select('*')
        .eq('id', workReportId)
        .single();

      if (fetchError) throw fetchError;

      // Update work report status menjadi 'komplain'
      const { error: wrUpdateError } = await supabase
        .from('work_reports')
        .update({
          status: 'komplain',
          keterangan_komplain: complainFormData.keterangan_komplain,
          updated_at: new Date().toISOString()
        })
        .eq('id', workReportId);

      if (wrUpdateError) {
        console.error('Error updating work report:', wrUpdateError);
        throw wrUpdateError;
      }

      // Update booking asli dengan catatan komplain dan status komplain
      if (workReportData.booking_id) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            catatan: `KOMPLAIN: ${complainFormData.keterangan_komplain}`,
            status: 'komplain',
            tanggal_kunjungan: complainFormData.tanggal_kunjungan,
            teknisi: complainFormData.teknisi,
            updated_at: new Date().toISOString()
          })
          .eq('booking_id', workReportData.booking_id);

        if (updateError) {
          console.error('Error updating booking:', updateError);
          throw updateError;
        }
      }

      setShowComplainModal(false);
      setComplainBooking(null);
      setComplainFormData({
        tanggal_kunjungan: '',
        teknisi: '',
        keterangan_komplain: ''
      });
      
      alert('✅ Komplain berhasil dibuat! Booking telah diupdate dengan status KOMPLAIN dan dijadwalkan ulang.');
      
      // Refresh data
      fetchBookings();
    } catch (error) {
      console.error('Error creating complain:', error);
      alert('❌ Gagal membuat komplain. Silakan coba lagi.');
    }
  };

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      // Check if this is a work report (has wr_ prefix)
      if (bookingToDelete.id.startsWith('wr_')) {
        // Use workReportId if available, otherwise extract from id
        const workReportId = (bookingToDelete as any).workReportId || bookingToDelete.id.replace('wr_', '');
        
        console.log('🗑️ Deleting work report from Supabase with ID:', workReportId);
        
        // Delete the work report from Supabase - PERMANENT DELETE
        const { error: wrError } = await supabase
          .from('work_reports')
          .delete()
          .eq('id', workReportId);

        if (wrError) {
          console.error('❌ Error deleting work report:', wrError);
          alert('❌ Gagal menghapus: ' + wrError.message);
          throw wrError;
        }

        console.log('✅ Work report deleted from Supabase successfully');
        
        // TIDAK update booking status - biarkan tetap 'completed'
        // Booking TIDAK muncul kembali di jadwal
        // Work report HILANG SEPENUHNYA dari database
        
      } else {
        // Regular booking deletion
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', bookingToDelete.id);

        if (error) throw error;
      }

      // Close modal first
      setShowDeleteConfirm(false);
      setBookingToDelete(null);
      
      // Show success message
      alert('✅ Data berhasil dihapus dari database');
      
      // Force refresh the bookings list from database
      console.log('🔄 Refreshing bookings list from database...');
      await fetchBookings();
      
    } catch (error) {
      console.error('❌ Error deleting:', error);
      alert('❌ Gagal menghapus data: ' + (error as Error).message);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    setIsEditing(false);
    setEditFormData({});
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update(editFormData)
        .eq('id', selectedBooking.id);

      if (error) {
        console.error('Error updating booking:', error);
        alert('Gagal menyimpan perubahan');
        return;
      }

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === selectedBooking.id 
          ? { ...booking, ...editFormData }
          : booking
      ));

      setIsEditing(false);
      setShowModal(false);
      alert('Perubahan berhasil disimpan');
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Terjadi kesalahan saat menyimpan');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    switch (filterBy) {
      case 'customer':
        return booking.nama?.toLowerCase().includes(query) || 
               booking.no_hp?.includes(query);
      case 'brand':
        return booking.merk?.toLowerCase().includes(query);
      case 'service':
        return booking.jenis_layanan?.toLowerCase().includes(query);
      case 'notes':
        return booking.catatan?.toLowerCase().includes(query);
      case 'booking_id':
        return booking.booking_id?.toLowerCase().includes(query) ||
               booking.id?.toLowerCase().includes(query);
      default:
        return booking.nama?.toLowerCase().includes(query) ||
               booking.no_hp?.includes(query) ||
               booking.alamat?.toLowerCase().includes(query) ||
               booking.jenis_layanan?.toLowerCase().includes(query) ||
               booking.merk?.toLowerCase().includes(query) ||
               booking.catatan?.toLowerCase().includes(query);
    }
  });

  const filteredCustomerSummaries = customerSummaries.filter(customer => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return customer.nama?.toLowerCase().includes(query) ||
           customer.no_hp?.includes(query) ||
           customer.alamat?.toLowerCase().includes(query);
  });

  const filteredCustomers = filteredCustomerSummaries;

  // Pagination logic
  const paginationData = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    
    return { currentBookings, totalPages, indexOfFirstItem, indexOfLastItem };
  }, [filteredBookings, currentPage, itemsPerPage]);

  const customerPaginationData = useMemo(() => {
    const indexOfLastCustomer = customerCurrentPage * itemsPerPage;
    const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage;
    const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);
    const customerTotalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    
    return { currentCustomers, customerTotalPages, indexOfFirstCustomer, indexOfLastCustomer };
  }, [filteredCustomers, customerCurrentPage, itemsPerPage]);

  // ...

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Memuat data...</span>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gradient-to-br from-green-50 via-white to-orange-50 min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-orange-500 bg-clip-text text-transparent">Riwayat Orderan</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gradient-to-r from-green-100 to-orange-100 rounded-lg p-1 mb-6 border border-green-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'all'
              ? 'bg-white text-green-600 shadow-md border border-green-200'
              : 'text-gray-600 hover:text-green-600 hover:bg-white/50'
          }`}
        >
          Semua Laporan
        </button>
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'customer'
              ? 'bg-white text-green-600 shadow-md border border-green-200'
              : 'text-gray-600 hover:text-green-600 hover:bg-white/50'
          }`}
        >
          Per Pelanggan
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-lg border border-green-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Cari pelanggan atau layanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50/30 focus:bg-white transition-colors"
              />
            </div>
          </div>
          
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50/30 focus:bg-white transition-colors"
          >
            <option value="">Semua Filter</option>
            <option value="customer">Pelanggan</option>
            <option value="brand">Merk AC</option>
            <option value="service">Jenis Layanan</option>
            <option value="notes">Catatan</option>
            <option value="booking_id">Booking ID</option>
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50/30 focus:bg-white transition-colors"
          >
            <option value="">Semua Bulan</option>
            <option value="2025-01">January 2025</option>
            <option value="2025-02">February 2025</option>
            <option value="2025-03">March 2025</option>
            <option value="2025-04">April 2025</option>
            <option value="2025-05">May 2025</option>
            <option value="2025-06">June 2025</option>
            <option value="2025-07">July 2025</option>
            <option value="2025-08">August 2025</option>
            <option value="2025-09">September 2025</option>
            <option value="2025-10">October 2025</option>
            <option value="2025-11">November 2025</option>
            <option value="2025-12">December 2025</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md border border-green-100 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{bookings.length}</div>
          <div className="text-sm text-gray-600">Total Selesai</div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-orange-100 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{customerSummaries.length}</div>
          <div className="text-sm text-gray-600">Total Pelanggan</div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-blue-100 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {bookings.filter(b => b.jenis_layanan?.toLowerCase().includes('cuci')).length}
          </div>
          <div className="text-sm text-gray-600">Cuci AC</div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-purple-100 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {bookings.filter(b => b.jenis_layanan?.toLowerCase().includes('perbaikan')).length}
          </div>
          <div className="text-sm text-gray-600">Perbaikan</div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'all' ? (
        <div className="space-y-4">
          {/* Pagination Info */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, paginationData.currentBookings.length)} dari {paginationData.currentBookings.length} data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === paginationData.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sebelumnya
              </button>
              <span className="text-sm text-gray-600">
                Halaman {currentPage} dari {paginationData.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationData.totalPages))}
                disabled={currentPage >= paginationData.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
          
          {paginationData.currentBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-lg shadow-lg border border-green-100 p-4 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-lg">{booking.nama}</h3>
                  {(localStorage.getItem('currentUser') && 
                    ['admin', 'manager'].includes(JSON.parse(localStorage.getItem('currentUser') || '{}').role)) ? (
                    <button
                      onClick={() => navigate(`/customer-history/${booking.no_hp}`)}
                      className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1 transition-colors text-sm"
                    >
                      {booking.no_hp}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">***-***-****</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(booking.status)}`}>
                    {booking.status === 'completed' ? 'Selesai' : booking.status}
                  </span>
                  {(localStorage.getItem('currentUser') && 
                    ['admin', 'manager'].includes(JSON.parse(localStorage.getItem('currentUser') || '{}').role)) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(booking)}
                        className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-full transition-colors flex-shrink-0"
                        title="Edit Booking"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {JSON.parse(localStorage.getItem('currentUser') || '{}').role === 'admin' && (
                        <button
                          onClick={() => openDeleteConfirm(booking)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                          title="Hapus Booking"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openComplainModal(booking)}
                        className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors flex-shrink-0"
                        title="Buat Komplain"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-gradient-to-r from-green-50 to-orange-50 p-3 rounded-lg">
                <div>
                  <span className="text-gray-600 font-medium">Booking ID:</span>
                  <p className="font-semibold text-blue-600">{booking.booking_id || booking.id}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Alamat:</span>
                  <button
                    onClick={() => navigate(`/customer-history/${booking.no_hp}`)}
                    className="font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 transition-colors"
                  >
                    {booking.alamat}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Layanan:</span>
                  <p className="font-semibold text-gray-800">{booking.jenis_layanan}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Merk AC:</span>
                  <p className="font-semibold text-gray-800">{booking.merk || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">No Unit:</span>
                  <p className="font-semibold text-gray-800">{booking.no_unit || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Teknisi:</span>
                  <p className="font-semibold text-gray-800">{booking.teknisi}</p>
                </div>
                {booking.helper && (
                  <div>
                    <span className="text-gray-600 font-medium">Helper:</span>
                    <p className="font-semibold text-gray-800">{booking.helper}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-600 font-medium">Tanggal Selesai:</span>
                  <p className="font-semibold text-green-600">
                    {booking.isWorkReport ? booking.tanggal_selesai : (booking.tanggal_selesai || 'Belum selesai')}
                  </p>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {customerPaginationData.currentCustomers.map((customer) => (
            <div key={`${customer.nama}-${customer.no_hp}`} className="bg-white rounded-lg shadow-lg border border-green-100 p-4 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{customer.nama}</h3>
                  {(localStorage.getItem('currentUser') && 
                    ['admin', 'manager'].includes(JSON.parse(localStorage.getItem('currentUser') || '{}').role)) ? (
                    <p className="text-gray-600">{customer.no_hp}</p>
                  ) : (
                    <p className="text-gray-500">***-***-****</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Order</div>
                  <div className="text-xl font-bold text-green-600">{customer.total_orders}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-gradient-to-r from-green-50 to-orange-50 p-3 rounded-lg mb-3">
                <div>
                  <span className="text-gray-600 font-medium">Alamat:</span>
                  <p className="font-semibold text-gray-800">{customer.alamat}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Layanan Terakhir:</span>
                  <p className="font-semibold text-green-600">{customer.last_service || 'Tanggal tidak tersedia'}</p>
                </div>
              </div>
              
              <button
                onClick={() => setExpandedCustomer(expandedCustomer === `${customer.nama}-${customer.no_hp}` ? null : `${customer.nama}-${customer.no_hp}`)}
                className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-green-600 to-orange-500 text-white rounded-lg hover:from-green-700 hover:to-orange-600 transition-all"
              >
                {expandedCustomer === `${customer.nama}-${customer.no_hp}` ? 'Tutup Detail' : 'Lihat Riwayat Lengkap'}
              </button>
              
              {expandedCustomer === `${customer.nama}-${customer.no_hp}` && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  {customer.services.map((service) => (
                    <div key={service.id} className="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{service.jenis_layanan}</div>
                          <div className="text-sm text-gray-600">Teknisi: {service.teknisi}</div>
                          <div className="text-sm text-gray-600">Tanggal: {service.isWorkReport ? service.tanggal_selesai : (service.tanggal_selesai || service.tanggal_kunjungan || 'Tanggal tidak tersedia')}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                          {service.status === 'completed' ? 'Selesai' : service.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredBookings.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Tidak ada data yang ditemukan</p>
        </div>
      )}

      {/* Modal for booking details/edit */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {isEditing ? 'Edit Booking' : 'Detail Booking'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                      <input
                        type="text"
                        value={editFormData.nama || ''}
                        onChange={(e) => setEditFormData({...editFormData, nama: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No HP</label>
                      <input
                        type="text"
                        value={editFormData.no_hp || ''}
                        onChange={(e) => setEditFormData({...editFormData, no_hp: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                      <textarea
                        value={editFormData.alamat || ''}
                        onChange={(e) => setEditFormData({...editFormData, alamat: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Layanan</label>
                      <input
                        type="text"
                        value={editFormData.jenis_layanan || ''}
                        onChange={(e) => setEditFormData({...editFormData, jenis_layanan: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editFormData.status || ''}
                        onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teknisi</label>
                      <input
                        type="text"
                        value={editFormData.teknisi || ''}
                        onChange={(e) => setEditFormData({...editFormData, teknisi: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                      <input
                        type="date"
                        value={editFormData.tanggal_selesai || ''}
                        onChange={(e) => setEditFormData({...editFormData, tanggal_selesai: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                      <textarea
                        value={editFormData.catatan || ''}
                        onChange={(e) => setEditFormData({...editFormData, catatan: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama</label>
                      <p className="text-gray-900">{selectedBooking.nama}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">No HP</label>
                      <button
                        onClick={() => navigate(`/customer-history/${selectedBooking.no_hp}`)}
                        className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1 transition-colors"
                      >
                        {selectedBooking.no_hp}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Alamat</label>
                      <button
                        onClick={() => navigate(`/customer-history/${selectedBooking.no_hp}`)}
                        className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1 transition-colors text-left"
                      >
                        {selectedBooking.alamat}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Jenis Layanan</label>
                      <p className="text-gray-900">{selectedBooking.jenis_layanan}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status === 'completed' ? 'Selesai' : selectedBooking.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teknisi</label>
                      <p className="text-gray-900">{selectedBooking.teknisi}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal Kunjungan</label>
                      <p className="text-gray-900">{selectedBooking.tanggal_kunjungan}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                      <p className="text-gray-900">{selectedBooking.tanggal_selesai || 'Belum selesai'}</p>
                    </div>
                    {selectedBooking.merk && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Merk AC</label>
                        <p className="text-gray-900">{selectedBooking.merk}</p>
                      </div>
                    )}
                    {selectedBooking.spek_unit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Spek Unit</label>
                        <p className="text-gray-900">{selectedBooking.spek_unit}</p>
                      </div>
                    )}
                    {selectedBooking.catatan && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Catatan</label>
                        <p className="text-gray-900">{selectedBooking.catatan}</p>
                      </div>
                    )}
                    {selectedBooking.foto_url && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Foto</label>
                        <div className="mt-2">
                          {(() => {
                            try {
                              const photos = JSON.parse(selectedBooking.foto_url);
                              return Array.isArray(photos) ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {photos.map((photo, index) => (
                                    <img
                                      key={index}
                                      src={photo}
                                      alt={`Foto ${index + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <img
                                  src={selectedBooking.foto_url}
                                  alt="Foto booking"
                                  className="w-full max-w-md h-48 object-cover rounded-lg border"
                                />
                              );
                            } catch (e) {
                              return (
                                <img
                                  src={selectedBooking.foto_url}
                                  alt="Foto booking"
                                  className="w-full max-w-md h-48 object-cover rounded-lg border"
                                />
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  {(localStorage.getItem('currentUser') && 
                    ['admin', 'manager'].includes(JSON.parse(localStorage.getItem('currentUser') || '{}').role)) && (
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complain Modal */}
      {showComplainModal && complainBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full my-8 max-h-[calc(100vh-4rem)]">
            <div className="sticky top-0 bg-white rounded-t-lg border-b px-6 py-4 flex items-center gap-3 z-10">
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Buat Komplain</h3>
            </div>
            
            <form onSubmit={handleSubmitComplain} className="overflow-y-auto max-h-[calc(100vh-12rem)] px-6 py-4">
              <div className="space-y-4 pb-4">
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-medium text-gray-900">{complainBooking.nama}</p>
                <p className="text-sm text-gray-600">{complainBooking.no_hp}</p>
                <p className="text-sm text-gray-600">Booking ID: {complainBooking.booking_id || complainBooking.id}</p>
                <p className="text-sm text-gray-600">Layanan: {complainBooking.jenis_layanan}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Kunjungan Ulang <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={complainFormData.tanggal_kunjungan}
                  onChange={(e) => setComplainFormData({...complainFormData, tanggal_kunjungan: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teknisi <span className="text-red-500">*</span>
                </label>
                <select
                  value={complainFormData.teknisi}
                  onChange={(e) => setComplainFormData({...complainFormData, teknisi: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                >
                  <option value="">Pilih kode teknisi</option>
                  <option value="A1">A1 - Taufiq</option>
                  <option value="A3">A3 - Dedy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan Komplain <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={complainFormData.keterangan_komplain}
                  onChange={(e) => setComplainFormData({...complainFormData, keterangan_komplain: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  rows={4}
                  placeholder="Jelaskan detail komplain pelanggan..."
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>ℹ️ Informasi:</strong> Booking baru akan dibuat dengan status KOMPLAIN dan masuk ke jadwal booking. Tidak ada transaksi tambahan.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowComplainModal(false);
                    setComplainBooking(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Buat Komplain
                </button>
              </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && bookingToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                Apakah Anda yakin ingin menghapus booking ini?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{bookingToDelete.nama}</p>
                <p className="text-sm text-gray-600">{bookingToDelete.no_hp}</p>
                <p className="text-sm text-gray-600">
                  Booking ID: {bookingToDelete.booking_id || bookingToDelete.id}
                </p>
              </div>
              <p className="text-red-600 text-sm mt-3 font-medium">
                ⚠️ Tindakan ini tidak dapat dibatalkan!
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setBookingToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteBooking}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryNew;

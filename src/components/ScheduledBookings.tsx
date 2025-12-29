import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarClock,
  Phone,
  MapPin,
  User,
  CheckCircle,
  Calendar,
  RefreshCw,
  X,
  Clock,
  XCircle,
} from "lucide-react";
import { notificationService } from "../utils/notifications";

// Component for technician selector
const TechnicianSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [techCodes, setTechCodes] = useState<any[]>([]);

  useEffect(() => {
    const loadTechCodes = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("technician_codes")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        if (data) {
          console.log("Loaded active technician codes:", data);
          setTechCodes(data);
        }
      } catch (error) {
        console.error("Error loading tech codes:", error);
      }
    };

    loadTechCodes();

    // Subscribe to changes in technician_codes table
    const subscription = supabase
      .channel("technician_codes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "technician_codes",
        },
        (payload) => {
          console.log("Technician codes changed:", payload);
          loadTechCodes(); // Reload when data changes
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div>
      <label className="text-sm font-medium text-gray-600 block mb-2">
        Tentukan Teknisi
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Pilih kode teknisi</option>
        {techCodes.map((tc) => (
          <option key={tc.id} value={tc.code}>
            {tc.code}
            {tc.name ? ` - ${tc.name}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
};

interface Booking {
  id: string;
  booking_id?: string;
  nama: string;
  no_hp: string;
  alamat: string;
  jenis_layanan: string;
  tanggal_kunjungan: string;
  waktu_kunjungan: string;
  cluster?: string;
  jumlah_unit?: number;
  merk?: string;
  model_unit?: string;
  no_unit?: string;
  catatan?: string;
  catatan_reschedule?: string;
  catatan_internal?: string;
  status: string;
  teknisi?: string;
  kode_teknisi?: string;
  foto_url?: string;
  kode_referral?: string;
  created_at: string;
  updated_at: string;
  work_reports?: Array<{
    id: string;
    status: string;
  }>;
}

interface User {
  username: string;
  role: string;
  name: string;
  technicianCode?: string;
}

const ScheduledBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [isUpdatingTechnician, setIsUpdatingTechnician] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const navigate = useNavigate();

  // Get current user from localStorage
  const currentUser: User | null = JSON.parse(
    localStorage.getItem("currentUser") || "null"
  );
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const isTeknisi =
    currentUser?.role === "teknisi" ||
    currentUser?.role === "teknisi2" ||
    currentUser?.role === "teknisi3";
  const isHelper = currentUser?.role === "helper";

  // Get technician code mapping
  const getTechnicianCode = (username: string): string | null => {
    const mapping: { [key: string]: string } = {
      teknisi1: "A1",
      teknisi2: "A2",
      teknisi3: "A3",
    };
    return mapping[username] || null;
  };

  const technicianCode = currentUser
    ? getTechnicianCode(currentUser.username)
    : null;

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch work reports first to check which bookings have reports
      const { data: workReportsData, error: workReportsError } = await supabase
        .from("work_reports")
        .select("id, booking_id, status");

      if (workReportsError) {
        console.error("Error fetching work reports:", workReportsError);
      }

      // Get list of booking IDs that have work reports (any status)
      const bookingIdsWithReports = new Set(
        (workReportsData || []).map((report) => report.booking_id)
      );

      console.log(
        "Booking IDs with work reports:",
        Array.from(bookingIdsWithReports)
      );

      // Fetch bookings - EXCLUDE completed, selesai status, and bookings with work reports
      // INCLUDE ditolak status so rejected bookings appear in schedule
      let bookingsQuery = supabase
        .from("bookings")
        .select("*")
        .not("status", "in", "(completed,selesai,deleted)") // Hide completed & deleted entries
        .order("tanggal_kunjungan", { ascending: true })
        .order("waktu_kunjungan", { ascending: true });

      // Filter by technician for teknisi roles
      if (isTeknisi && technicianCode) {
        bookingsQuery = bookingsQuery.eq("teknisi", technicianCode);
      }

      const { data: bookingsData, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        alert("Error loading bookings: " + bookingsError.message);
        return;
      }

      // Filter out bookings that have APPROVED work reports
      // Keep bookings with pending/rejected work reports OR no work reports at all
      const filteredBookings = (bookingsData || []).filter((booking) => {
        // Find related work reports for this booking
        const relatedReports = (workReportsData || []).filter(
          (report) =>
            report.booking_id === booking.id ||
            report.booking_id === booking.booking_id
        );

        // If no work reports, keep the booking (it's truly pending)
        if (relatedReports.length === 0) {
          return true;
        }

        // If has work reports, only filter out if ANY report is approved
        const hasApprovedReport = relatedReports.some(
          (report) => report.status === "approved"
        );

        if (hasApprovedReport) {
          console.log(
            "Filtering out booking with approved work report:",
            booking.booking_id || booking.id,
            booking.nama
          );
          return false;
        }

        // Keep bookings with only pending/rejected work reports
        console.log(
          "Keeping booking with pending/rejected work report:",
          booking.booking_id || booking.id,
          booking.nama,
          "statuses:",
          relatedReports.map((r) => r.status)
        );
        return true;
      });

      // Gabungkan data bookings dengan work_reports info
      const bookingsWithReports = filteredBookings.map((booking) => {
        const relatedReports = (workReportsData || []).filter(
          (report) =>
            report.booking_id === booking.id ||
            report.booking_id === booking.booking_id
        );
        return {
          ...booking,
          work_reports: relatedReports,
        };
      });

      console.log(
        `Total bookings fetched: ${
          bookingsData?.length || 0
        }, After filtering: ${bookingsWithReports.length}`
      );
      setBookings(bookingsWithReports);
    } catch (error) {
      console.error("Error:", error);
      alert("Error loading bookings");
    } finally {
      setLoading(false);
    }
  }, [isTeknisi, technicianCode]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const getStatusColor = (status: string, hasRejectedReport?: boolean) => {
    if (hasRejectedReport) {
      return "bg-red-100 text-red-800";
    }

    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "rescheduled":
        return "bg-orange-100 text-orange-800";
      case "menunggu_konfirmasi":
        return "bg-gray-700 text-white border-2 border-gray-800";
      case "menunggu_sparepart":
        return "bg-purple-100 text-purple-800 border-2 border-purple-500";
      case "komplain":
        return "bg-red-100 text-red-800 border-2 border-red-500";
      case "rejected":
      case "ditolak":
        return "bg-red-100 text-red-800";
      case "completed":
      case "selesai":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string, hasRejectedReport?: boolean) => {
    if (hasRejectedReport) {
      return "Laporan Ditolak";
    }

    switch (status) {
      case "pending":
        return "Menunggu Assign Manager";
      case "confirmed":
        return "Dikonfirmasi";
      case "rescheduled":
        return "Dijadwal Ulang";
      case "menunggu_konfirmasi":
        return "⏳ Menunggu Konfirmasi Customer";
      case "menunggu_sparepart":
        return "⏳ Menunggu Sparepart";
      case "komplain":
        return "⚠️ KOMPLAIN";
      case "rejected":
      case "ditolak":
        return "Ditolak";
      case "completed":
      case "selesai":
        return "Selesai";
      default:
        return status;
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    if (!currentUser || (!isAdmin && !isManager)) {
      alert("Anda tidak memiliki akses untuk mengkonfirmasi booking");
      return;
    }

    try {
      setIsConfirming(true);

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;

      // Send WhatsApp confirmation
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        await sendWhatsAppConfirmation(booking);
      }

      alert("Booking berhasil dikonfirmasi");
      await fetchBookings();
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error confirming booking:", error);
      alert("Error confirming booking");
    } finally {
      setIsConfirming(false);
    }
  };

  const sendWhatsAppConfirmation = async (booking: Booking) => {
    try {
      const message = `Halo ${booking.nama}, booking Anda telah dikonfirmasi!\n\nDetail:\n📅 Tanggal: ${booking.tanggal_kunjungan}\n⏰ Waktu: ${booking.waktu_kunjungan}\n🏠 Alamat: ${booking.alamat}\n🔧 Layanan: ${booking.jenis_layanan}\n\nTerima kasih telah mempercayai AFC Service!`;

      // Redirect to WhatsApp Web (manual)
      const whatsappUrl = `https://wa.me/${
        booking.no_hp
      }?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
    }
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      alert("Mohon lengkapi tanggal dan waktu reschedule");
      return;
    }

    try {
      setIsRescheduling(true);

      const { error } = await supabase
        .from("bookings")
        .update({
          tanggal_kunjungan: rescheduleDate,
          waktu_kunjungan: rescheduleTime,
          catatan_reschedule: rescheduleReason,
          status: "rescheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      // Send WhatsApp reschedule notification
      await sendWhatsAppReschedule(
        selectedBooking,
        rescheduleDate,
        rescheduleTime,
        rescheduleReason
      );

      alert("Booking berhasil dijadwal ulang");
      await fetchBookings();
      setShowRescheduleModal(false);
      setShowDetailModal(false);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
    } catch (error) {
      console.error("Error rescheduling:", error);
      alert("Error rescheduling booking");
    } finally {
      setIsRescheduling(false);
    }
  };

  const sendWhatsAppReschedule = async (
    booking: Booking,
    newDate: string,
    newTime: string,
    reason: string
  ) => {
    try {
      // Format date to DD/MM/YYYY
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const formattedDate = formatDate(newDate);

      const message = `*RESCHEDULE KUNJUNGAN TEKNISI AFC*
*Kode Booking* : ${booking.booking_id || "N/A"}

Yth. Bapak/Ibu *${booking.nama}*
*Nomor HP* : ${booking.no_hp}
*Alamat* : ${booking.alamat}

Sesuai konfirmasi Bapak/Ibu bahwa jadwal kunjungan teknisi telah kami lakukan penjadwalan ulang (RESCHEDULE)..

📅 *Jadwal Kunjungan Baru:*
${formattedDate}

📝 *Keterangan:*
${reason || "Penjadwalan ulang sesuai kesepakatan"}

Terima kasih, semoga Bapak/Ibu selalu dalam keadaan sehat wal afiat.

*FROST*`;

      // Format phone number
      let formattedPhone = booking.no_hp.replace(/\D/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "62" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("62")) {
        formattedPhone = "62" + formattedPhone;
      }

      const response = await fetch(
        "https://nonleaking-cameron-eagerly.ngrok-free.dev/api/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "FrostAC2025",
          },
          body: JSON.stringify({
            sessionId: "f1",
            number: formattedPhone,
            message,
          }),
        }
      );

      if (response.ok) {
        console.log("WhatsApp reschedule notification sent successfully");
      } else {
        console.error("Failed to send WhatsApp reschedule notification");
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      setIsCompleting(true);

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;

      alert("Booking berhasil diselesaikan");
      await fetchBookings();
      setShowDetailModal(false);

      // Navigate to work report form
      navigate(`/work-report/${bookingId}`);
    } catch (error) {
      console.error("Error completing booking:", error);
      alert("Error completing booking");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleUpdateTechnician = async () => {
    if (!selectedBooking || !selectedTechnician) return;

    try {
      setIsUpdatingTechnician(true);

      const { error } = await supabase
        .from("bookings")
        .update({
          teknisi: selectedTechnician,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      alert("Teknisi berhasil ditentukan");
      await fetchBookings();
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error updating technician:", error);
      alert("Error updating technician");
    } finally {
      setIsUpdatingTechnician(false);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedBooking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          catatan: editedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      alert("Catatan berhasil diupdate");
      await fetchBookings();
      setIsEditingNotes(false);
      setSelectedBooking({ ...selectedBooking, catatan: editedNotes });
    } catch (error) {
      console.error("Error updating notes:", error);
      alert("Error updating notes");
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!currentUser || (!isAdmin && !isManager)) {
      alert("Anda tidak memiliki akses untuk menghapus booking");
      return;
    }

    if (
      !confirm(
        "Sembunyikan booking ini dari daftar? Data tetap tersimpan di database."
      )
    ) {
      return;
    }

    try {
      setIsCancelling(true);

      // Soft delete booking by marking status 'deleted'
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "deleted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;

      alert("✅ Booking berhasil disembunyikan (soft delete)");
      await fetchBookings();
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("❌ Gagal menghapus booking");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Jadwal Booking ({bookings.length})
            </h1>
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {isHelper && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm font-medium">
              🔍 Mode Lihat Saja - Anda dapat melihat semua jadwal booking
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <CalendarClock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Tidak ada booking
              </h3>
              <p className="text-gray-500">
                Belum ada booking yang dijadwalkan
              </p>
            </div>
          ) : (
            bookings.map((booking) => {
              const hasRejectedReport = booking.work_reports?.some(
                (report) => report.status === "ditolak"
              );

              return (
                <div
                  key={booking.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-base">
                          {booking.nama}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            booking.status,
                            hasRejectedReport
                          )}`}
                        >
                          {getStatusText(booking.status, hasRejectedReport)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{booking.alamat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 flex-shrink-0" />
                          <span>Waktu: {booking.waktu_kunjungan}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 flex-shrink-0 text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            Teknisi: {booking.teknisi || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-gray-900">
                        {booking.tanggal_kunjungan}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {booking.jenis_layanan}
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <button
                          className="text-blue-600 text-xs hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            setShowDetailModal(true);
                          }}
                        >
                          Tap untuk detail
                        </button>
                        {(isAdmin || isManager) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelBooking(booking.id);
                            }}
                            className="text-red-600 text-xs hover:underline flex items-center justify-center gap-1 mr-8"
                            title="Hapus booking"
                          >
                            <XCircle className="h-3 w-3" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Display Referral Code if exists */}
                  {booking.kode_referral && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-red-600">🎯</span>
                        <span className="text-blue-600 font-medium">
                          Kode Referral: {booking.kode_referral}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)]">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-green-600" />
                Detail Booking
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-12rem)] px-6 py-4">
              <p className="text-gray-600 mb-6">
                Informasi lengkap booking dan aksi yang tersedia
              </p>

              <div className="space-y-4 pb-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Nama Pelanggan
                    </label>
                    <p className="font-semibold">{selectedBooking.nama}</p>
                  </div>

                  {!isTeknisi && !isHelper && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        No. HP
                      </label>
                      <p>{selectedBooking.no_hp}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Alamat
                    </label>
                    <p>{selectedBooking.alamat}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Tanggal
                      </label>
                      <p>{selectedBooking.tanggal_kunjungan}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Waktu
                      </label>
                      <p>{selectedBooking.waktu_kunjungan}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Jenis Layanan
                    </label>
                    <p>{selectedBooking.jenis_layanan}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Status
                    </label>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        selectedBooking.status,
                        selectedBooking.work_reports?.some(
                          (report) => report.status === "ditolak"
                        )
                      )}`}
                    >
                      {getStatusText(
                        selectedBooking.status,
                        selectedBooking.work_reports?.some(
                          (report) => report.status === "ditolak"
                        )
                      )}
                    </span>
                  </div>

                  {selectedBooking.cluster && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Cluster
                      </label>
                      <p>{selectedBooking.cluster}</p>
                    </div>
                  )}

                  {selectedBooking.jumlah_unit && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Jumlah Unit
                      </label>
                      <p>{selectedBooking.jumlah_unit}</p>
                    </div>
                  )}

                  {selectedBooking.merk && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Merk AC
                      </label>
                      <p>{selectedBooking.merk}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Layanan
                    </label>
                    <p>{selectedBooking.jenis_layanan}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Teknisi
                    </label>
                    <p>{selectedBooking.teknisi || "-"}</p>
                  </div>

                  {selectedBooking.kode_referral && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Kode Referral
                      </label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🎯</span>
                          <div>
                            <p className="font-bold text-blue-600">
                              {selectedBooking.kode_referral}
                            </p>
                            <p className="text-xs text-blue-600">
                              Booking dengan kode referral affiliate
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-600">
                        Catatan
                      </label>
                      {(isAdmin || isManager) && !isEditingNotes && (
                        <button
                          onClick={() => {
                            setIsEditingNotes(true);
                            setEditedNotes(selectedBooking.catatan || "");
                          }}
                          className="px-3 py-1 text-sm text-green-600 border border-green-600 rounded-lg hover:bg-green-50"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateNotes}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setIsEditingNotes(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="bg-gray-50 p-3 rounded-lg">
                        {selectedBooking.catatan || "-"}
                      </p>
                    )}
                  </div>

                  {(isAdmin || isManager) && (
                    <div className="space-y-3">
                      <TechnicianSelector
                        value={
                          selectedTechnician || selectedBooking.teknisi || ""
                        }
                        onChange={setSelectedTechnician}
                      />
                      {selectedTechnician &&
                        selectedTechnician !== selectedBooking.teknisi && (
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  `Tetapkan teknisi ${selectedTechnician} untuk booking ini?`
                                )
                              ) {
                                try {
                                  const { error } = await supabase
                                    .from("bookings")
                                    .update({ teknisi: selectedTechnician })
                                    .eq("id", selectedBooking.id);

                                  if (error) throw error;

                                  alert("✅ Teknisi berhasil ditetapkan!");
                                  await fetchBookings();
                                  setShowDetailModal(false);
                                  setSelectedTechnician("");
                                } catch (error) {
                                  console.error(
                                    "Error updating technician:",
                                    error
                                  );
                                  alert("❌ Gagal menetapkan teknisi");
                                }
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            <CheckCircle className="h-5 w-5" />
                            Tetapkan Teknisi {selectedTechnician}
                          </button>
                        )}
                    </div>
                  )}

                  {selectedBooking.catatan_reschedule && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Catatan Reschedule
                      </label>
                      <p className="bg-orange-50 p-3 rounded-lg">
                        {selectedBooking.catatan_reschedule}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isHelper && (
                  <div className="flex flex-col gap-3 pt-4 border-t mt-4">
                    {/* Tombol Konfirmasi Jadwal - untuk admin/manager dengan status pending */}
                    {selectedBooking.status === "pending" &&
                      (isAdmin || isManager) && (
                        <button
                          onClick={() =>
                            handleConfirmBooking(selectedBooking.id)
                          }
                          disabled={isConfirming}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          <CheckCircle className="h-5 w-5" />
                          {isConfirming
                            ? "Mengkonfirmasi..."
                            : "Konfirmasi Jadwal"}
                        </button>
                      )}

                    {/* Tombol Reschedule - hanya untuk admin/manager dengan status confirmed */}
                    {selectedBooking.status === "confirmed" &&
                      (isAdmin || isManager) && (
                        <button
                          onClick={() => setShowRescheduleModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                        >
                          <Calendar className="h-5 w-5" />
                          Reschedule
                        </button>
                      )}

                    {/* Tombol Menunggu Konfirmasi Customer - untuk admin/manager/teknisi dengan status confirmed */}
                    {selectedBooking.status === "confirmed" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                "Ubah status menjadi Menunggu Konfirmasi Customer?"
                              )
                            ) {
                              try {
                                const { error } = await supabase
                                  .from("bookings")
                                  .update({ status: "menunggu_konfirmasi" })
                                  .eq("id", selectedBooking.id);

                                if (error) throw error;

                                alert(
                                  "✅ Status berhasil diubah menjadi Menunggu Konfirmasi Customer"
                                );
                                await fetchBookings();
                                setShowDetailModal(false);
                              } catch (error) {
                                console.error("Error updating status:", error);
                                alert("❌ Gagal mengubah status");
                              }
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
                        >
                          <Clock className="h-5 w-5" />
                          Menunggu Konfirmasi Customer
                        </button>
                      )}

                    {/* Tombol Menunggu Sparepart - untuk admin/manager/teknisi dengan status confirmed */}
                    {selectedBooking.status === "confirmed" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={async () => {
                            if (
                              confirm("Ubah status menjadi Menunggu Sparepart?")
                            ) {
                              try {
                                const { error } = await supabase
                                  .from("bookings")
                                  .update({ status: "menunggu_sparepart" })
                                  .eq("id", selectedBooking.id);

                                if (error) throw error;

                                alert(
                                  "✅ Status berhasil diubah menjadi Menunggu Sparepart"
                                );
                                await fetchBookings();
                                setShowDetailModal(false);
                              } catch (error) {
                                console.error("Error updating status:", error);
                                alert("❌ Gagal mengubah status");
                              }
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                        >
                          <Clock className="h-5 w-5" />
                          Menunggu Sparepart
                        </button>
                      )}

                    {/* Tombol Selesaikan Booking - untuk admin/manager/teknisi dengan status confirmed */}
                    {selectedBooking.status === "confirmed" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={() =>
                            navigate(
                              `/work-report?bookingId=${selectedBooking.id}`
                            )
                          }
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Selesaikan Booking
                        </button>
                      )}

                    {/* Tombol Reschedule - untuk admin/manager/teknisi dengan status rescheduled */}
                    {selectedBooking.status === "rescheduled" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={() => setShowRescheduleModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                        >
                          <Calendar className="h-5 w-5" />
                          Reschedule
                        </button>
                      )}

                    {/* Tombol Menunggu Konfirmasi Customer - untuk admin/manager/teknisi dengan status rescheduled */}
                    {selectedBooking.status === "rescheduled" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                "Ubah status menjadi Menunggu Konfirmasi Customer?"
                              )
                            ) {
                              try {
                                const { error } = await supabase
                                  .from("bookings")
                                  .update({ status: "menunggu_konfirmasi" })
                                  .eq("id", selectedBooking.id);

                                if (error) throw error;

                                alert(
                                  "✅ Status berhasil diubah menjadi Menunggu Konfirmasi Customer"
                                );
                                await fetchBookings();
                                setShowDetailModal(false);
                              } catch (error) {
                                console.error("Error updating status:", error);
                                alert("❌ Gagal mengubah status");
                              }
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
                        >
                          <Clock className="h-5 w-5" />
                          Menunggu Konfirmasi Customer
                        </button>
                      )}

                    {/* Tombol Menunggu Sparepart - untuk admin/manager/teknisi dengan status rescheduled */}
                    {selectedBooking.status === "rescheduled" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={async () => {
                            if (
                              confirm("Ubah status menjadi Menunggu Sparepart?")
                            ) {
                              try {
                                const { error } = await supabase
                                  .from("bookings")
                                  .update({ status: "menunggu_sparepart" })
                                  .eq("id", selectedBooking.id);

                                if (error) throw error;

                                alert(
                                  "✅ Status berhasil diubah menjadi Menunggu Sparepart"
                                );
                                await fetchBookings();
                                setShowDetailModal(false);
                              } catch (error) {
                                console.error("Error updating status:", error);
                                alert("❌ Gagal mengubah status");
                              }
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                        >
                          <Clock className="h-5 w-5" />
                          Menunggu Sparepart
                        </button>
                      )}

                    {/* Tombol Selesaikan Booking - untuk admin/manager/teknisi dengan status rescheduled */}
                    {selectedBooking.status === "rescheduled" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={() =>
                            navigate(
                              `/work-report?bookingId=${selectedBooking.id}`
                            )
                          }
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Selesaikan Booking
                        </button>
                      )}

                    {/* Tombol untuk status menunggu_konfirmasi */}
                    {selectedBooking.status === "menunggu_konfirmasi" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <>
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  "Customer sudah konfirmasi? Ubah status ke Dikonfirmasi?"
                                )
                              ) {
                                try {
                                  const { error } = await supabase
                                    .from("bookings")
                                    .update({ status: "confirmed" })
                                    .eq("id", selectedBooking.id);

                                  if (error) throw error;

                                  alert(
                                    "✅ Status berhasil diubah menjadi Dikonfirmasi"
                                  );
                                  await fetchBookings();
                                  setShowDetailModal(false);
                                } catch (error) {
                                  console.error(
                                    "Error updating status:",
                                    error
                                  );
                                  alert("❌ Gagal mengubah status");
                                }
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            <CheckCircle className="h-5 w-5" />
                            Customer Sudah Konfirmasi
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `/work-report?bookingId=${selectedBooking.id}`
                              )
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            <CheckCircle className="h-5 w-5" />
                            Selesaikan Booking
                          </button>
                        </>
                      )}

                    {/* Tombol untuk status menunggu_sparepart */}
                    {selectedBooking.status === "menunggu_sparepart" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <>
                          <button
                            onClick={async () => {
                              if (
                                confirm("Ubah status kembali ke Dikonfirmasi?")
                              ) {
                                try {
                                  const { error } = await supabase
                                    .from("bookings")
                                    .update({ status: "confirmed" })
                                    .eq("id", selectedBooking.id);

                                  if (error) throw error;

                                  alert(
                                    "✅ Status berhasil diubah menjadi Dikonfirmasi"
                                  );
                                  await fetchBookings();
                                  setShowDetailModal(false);
                                } catch (error) {
                                  console.error(
                                    "Error updating status:",
                                    error
                                  );
                                  alert("❌ Gagal mengubah status");
                                }
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            <CheckCircle className="h-5 w-5" />
                            Sparepart Sudah Tersedia
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `/work-report?bookingId=${selectedBooking.id}`
                              )
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            <CheckCircle className="h-5 w-5" />
                            Selesaikan Booking
                          </button>
                        </>
                      )}

                    {/* Tombol untuk status komplain */}
                    {selectedBooking.status === "komplain" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={() => setShowRescheduleModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                        >
                          <Calendar className="h-5 w-5" />
                          Reschedule
                        </button>
                      )}

                    {selectedBooking.status === "komplain" &&
                      (isAdmin || isManager || isTeknisi) && (
                        <>
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  "Ubah status menjadi Menunggu Sparepart?"
                                )
                              ) {
                                try {
                                  const { error } = await supabase
                                    .from("bookings")
                                    .update({ status: "menunggu_sparepart" })
                                    .eq("id", selectedBooking.id);

                                  if (error) throw error;

                                  alert(
                                    "✅ Status berhasil diubah menjadi Menunggu Sparepart"
                                  );
                                  await fetchBookings();
                                  setShowDetailModal(false);
                                } catch (error) {
                                  console.error(
                                    "Error updating status:",
                                    error
                                  );
                                  alert("❌ Gagal mengubah status");
                                }
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                          >
                            <Clock className="h-5 w-5" />
                            Menunggu Sparepart
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `/work-report?bookingId=${selectedBooking.id}`
                              )
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            <CheckCircle className="h-5 w-5" />
                            Selesaikan Booking
                          </button>
                        </>
                      )}

                    {(selectedBooking.status === "ditolak" ||
                      selectedBooking.status === "rejected") &&
                      (isAdmin || isManager || isTeknisi) && (
                        <button
                          onClick={() =>
                            navigate(
                              `/work-report?bookingId=${selectedBooking.id}`
                            )
                          }
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Selesaikan Booking
                        </button>
                      )}

                    {/* Tombol Hapus Booking - hanya untuk admin/manager */}
                    {(isAdmin || isManager) && (
                      <button
                        onClick={() => handleCancelBooking(selectedBooking.id)}
                        disabled={isCancelling}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        <XCircle className="h-5 w-5" />
                        {isCancelling ? "Menghapus..." : "Hapus Booking"}
                      </button>
                    )}
                  </div>
                )}

                {isHelper && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 text-center">
                      Mode Lihat Saja - Tidak dapat melakukan aksi
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Reschedule Booking</h2>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Baru
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Waktu Baru
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alasan Reschedule (Opsional)
                  </label>
                  <textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan alasan reschedule..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowRescheduleModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={
                      isRescheduling || !rescheduleDate || !rescheduleTime
                    }
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isRescheduling ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledBookings;

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  User,
  Calendar,
  MapPin,
  Phone,
  Wrench,
  FileText,
  Image,
  Edit3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WorkReportUnit {
  id: string;
  jenis_pekerjaan: string;
  no_unit: string | null;
  merk: string | null;
  spek_unit: string | null;
  keterangan: string | null;
  foto_url: string | null;
  status: string | null;
}

interface WorkReport {
  id: string;
  nama_pelanggan: string;
  alamat_pelanggan: string | null;
  no_wa_pelanggan: string;
  no_unit: string | null;
  merk: string | null;
  spek_unit: string | null;
  tanggal_dikerjakan: string | null;
  jenis_pekerjaan: string;
  teknisi: string;
  keterangan: string | null;
  booking_id: string | null;
  foto_url: string | null;
  status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  units?: WorkReportUnit[];
  jumlah_unit?: number;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  kode_referral?: string | null;
}

const WorkReportApproval = () => {
  const [workReports, setWorkReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isEditingInternalNotes, setIsEditingInternalNotes] = useState<
    string | null
  >(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(
    new Set()
  );
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending_approval" | "approved" | "rejected"
  >("pending_approval");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Get current user info
  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  };

  const currentUser = getCurrentUser();
  const isManagerOrAdmin =
    currentUser?.role === "admin" || currentUser?.role === "manager";

  const fetchWorkReports = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("work_reports")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filter based on selected filter
      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching work reports:", error);
        toast({
          title: "Error",
          description: "Gagal mengambil data laporan kerja",
          variant: "destructive",
        });
        return;
      }

      console.log("Fetched work reports from work_reports table:", data);

      // Group reports by booking_id to combine multi-unit reports
      const groupedReports = new Map();

      (data || []).forEach((report) => {
        const key = report.booking_id || `manual_${report.id}`;

        if (groupedReports.has(key)) {
          const existing = groupedReports.get(key);
          existing.units.push({
            id: report.id,
            jenis_pekerjaan: report.jenis_pekerjaan,
            no_unit: report.no_unit,
            merk: report.merk,
            spek_unit: report.spek_unit,
            keterangan: report.keterangan,
            foto_url: report.foto_url,
            status: report.status,
          });
          existing.jumlah_unit = existing.units.length;
        } else {
          groupedReports.set(key, {
            ...report,
            units: [
              {
                id: report.id,
                jenis_pekerjaan: report.jenis_pekerjaan,
                no_unit: report.no_unit,
                merk: report.merk,
                spek_unit: report.spek_unit,
                keterangan: report.keterangan,
                foto_url: report.foto_url,
                status: report.status,
              },
            ],
            jumlah_unit: 1,
          });
        }
      });

      // Fetch referral codes for grouped reports
      const processedData = await Promise.all(
        Array.from(groupedReports.values()).map(async (report) => {
          let kode_referral = null;

          if (report.booking_id) {
            try {
              const { data: bookingData } = await supabase
                .from("bookings")
                .select("kode_referral")
                .eq("booking_id", report.booking_id)
                .single();

              kode_referral = bookingData?.kode_referral || null;
            } catch (error) {
              console.log(
                "Could not fetch referral code for booking:",
                report.booking_id
              );
            }
          }

          return {
            ...report,
            kode_referral,
          };
        })
      );

      setWorkReports(processedData);
    } catch (error) {
      console.error("Error in fetchWorkReports:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchWorkReports();
  }, [fetchWorkReports]);

  const sendAffiliateNotification = async (
    bookingId: string,
    customerName: string
  ) => {
    try {
      // Get booking data to check for referral code
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("kode_referral, nama, jenis_layanan")
        .eq("booking_id", bookingId)
        .single();

      if (bookingError || !bookingData?.kode_referral) {
        console.log("No referral code found for booking:", bookingId);
        return false;
      }

      console.log("Found referral code:", bookingData.kode_referral);

      // Get partner data based on referral code
      const { data: partnerData, error: partnerError } = await supabase
        .from("partners")
        .select("partner_id, nama_lengkap, nomor_whatsapp")
        .eq("partner_id", bookingData.kode_referral)
        .single();

      if (partnerError || !partnerData) {
        console.log(
          "Partner not found for referral code:",
          bookingData.kode_referral
        );
        return false;
      }

      console.log("Found partner:", partnerData.nama_lengkap);

      // Create affiliate notification message - only congratulatory message without work report details
      const message = `🎉 *SELAMAT! POIN AFFILIATE ANDA BERTAMBAH* 🎉

Halo *${partnerData.nama_lengkap}*,

🏆 ANDA MENDAPAT +1 POIN!

Pelanggan yang Anda referensikan telah selesai dikerjakan.

Terima kasih telah menjadi partner affiliate FROST. Poin Anda dapat ditukar dengan :
*1 poin senilai Rp 50.000 atau Cuci AC GRATIS (1 unit)*

📊 Cek total poin Anda di: www.aqshafreshncool.com/affiliate, jika sudah melebihi 10 poin dapat ditukarkan dengan rupiah 

Referensikan terus teman dan keluarga anda yang lain untuk mendapat lebih banyak poin!

*FROST*
Partner Affiliate Program`;

      // Format partner phone number
      let partnerPhone = partnerData.nomor_whatsapp;
      if (partnerPhone.startsWith("0")) {
        partnerPhone = "62" + partnerPhone.substring(1);
      } else if (!partnerPhone.startsWith("62")) {
        partnerPhone = "62" + partnerPhone;
      }

      // Send WhatsApp to affiliate
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
            number: partnerPhone,
            message,
          }),
        }
      );

      const success = response.ok;
      console.log(
        `Affiliate notification to ${partnerPhone}: ${
          success ? "SUCCESS" : "FAILED"
        }`
      );

      if (success) {
        console.log(
          "Affiliate notification sent successfully to:",
          partnerData.nama_lengkap
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error sending affiliate notification:", error);
      return false;
    }
  };

  const sendWhatsAppNotification = async (reportData: WorkReport) => {
    try {
      // Get all approved work reports for the same booking to combine them
      let allReports = [];

      if (reportData.booking_id) {
        try {
          const { data: relatedReports } = await supabase
            .from("work_reports")
            .select("*")
            .eq("booking_id", reportData.booking_id)
            .eq("status", "approved");

          if (relatedReports && relatedReports.length > 0) {
            allReports = relatedReports;
          } else {
            // If no other approved reports, just use current report
            allReports = [reportData];
          }
        } catch (error) {
          console.error("Error fetching related reports:", error);
          allReports = [reportData];
        }
      } else {
        allReports = [reportData];
      }

      let message = `*LAPORAN KERJA TEKNISI FROST*
Kode Booking : *${reportData.booking_id || "Manual"}*

📅 Tanggal : *${reportData.tanggal_dikerjakan}*
👤 Nama Pelanggan : *Bpk/Ibu ${reportData.nama_pelanggan}*
📱 No HP : *${reportData.no_wa_pelanggan}*
📍 Alamat : *${reportData.alamat_pelanggan}*
👨‍🔧 Nama Teknisi : *${reportData.teknisi}*
📦 Total Unit : *${allReports.length}* unit`;

      // Add details for all units
      if (allReports.length > 1) {
        message += `\n\n🔧 DETAIL SEMUA UNIT:`;
        allReports.forEach((report, index) => {
          message += `\n\n*UNIT ${index + 1}:*`;
          if (report.jenis_pekerjaan)
            message += `\n📋 Layanan: *${report.jenis_pekerjaan}*`;
          if (report.no_unit) message += `\n• No Unit: *${report.no_unit}*`;
          if (report.merk) message += `\n• Merk: *${report.merk}*`;
          if (report.spek_unit) message += `\n• Model: *${report.spek_unit}*`;
          if (report.keterangan && report.keterangan.trim() !== "") {
            message += `\n📝 Catatan: *${report.keterangan.trim()}*`;
          }
        });
      } else {
        // Single unit
        if (reportData.jenis_pekerjaan)
          message += `\n\n📋 DETAIL LAYANAN : *${reportData.jenis_pekerjaan}*`;

        if (reportData.no_unit || reportData.merk || reportData.spek_unit) {
          message += `\n\n🔧 DETAIL UNIT:`;
          if (reportData.no_unit)
            message += `\n• No Unit: *${reportData.no_unit}*`;
          if (reportData.merk) message += `\n• Merk: *${reportData.merk}*`;
          if (reportData.spek_unit)
            message += `\n• Model: *${reportData.spek_unit}*`;
        }

        // Add technician notes if available
        if (reportData.keterangan && reportData.keterangan.trim() !== "") {
          message += `\n\n📝 CATATAN TEKNISI :\n*${reportData.keterangan.trim()}*`;
        }
      }

      message += `\n\nStatus: *✅ Selesai dikerjakan*

Terima kasih telah mempercayakan perawatan & perbaikan AC kepada kami.

*FROST*`;

      // Recipients list
      const recipients = [];

      // Format customer phone
      let customerPhone = reportData.no_wa_pelanggan;
      if (customerPhone.startsWith("0")) {
        customerPhone = "62" + customerPhone.substring(1);
      } else if (!customerPhone.startsWith("62")) {
        customerPhone = "62" + customerPhone;
      }
      recipients.push(customerPhone);

      // Add additional numbers
      recipients.push("6285175392159");
      recipients.push("6285710758662");
      recipients.push("628991549549");

      // Send to all recipients
      const validRecipients = recipients.filter(
        (phone) => phone && phone.trim() !== ""
      );

      const sendPromises = validRecipients.map(async (phoneNumber) => {
        try {
          let formattedPhone = phoneNumber;

          if (formattedPhone.startsWith("+")) {
            formattedPhone = formattedPhone.substring(1);
          }

          formattedPhone = formattedPhone.replace(/\D/g, "");

          if (formattedPhone.startsWith("0")) {
            formattedPhone = "62" + formattedPhone.substring(1);
          } else if (formattedPhone.startsWith("62")) {
            formattedPhone = formattedPhone;
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

          return response.ok;
        } catch (error) {
          console.error(`Error sending to ${phoneNumber}:`, error);
          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      const successCount = results.filter((r) => r === true).length;

      return successCount > 0;
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
      return false;
    }
  };

  const updateBookingStatus = async (bookingId: string) => {
    if (!bookingId) return;

    try {
      // Try multiple approaches to find and update the booking
      console.log("Attempting to update booking status for:", bookingId);

      // First try: Find by booking_id field
      let { data: findData, error: findError } = await supabase
        .from("bookings")
        .select("id, booking_id, status")
        .eq("booking_id", bookingId)
        .maybeSingle();

      // If not found, try finding by id field directly
      if (!findData && !findError) {
        const result = await supabase
          .from("bookings")
          .select("id, booking_id, status")
          .eq("id", bookingId)
          .maybeSingle();
        findData = result.data;
        findError = result.error;
      }

      // If still not found, try a broader search
      if (!findData && !findError) {
        const result = await supabase
          .from("bookings")
          .select("id, booking_id, status")
          .ilike("booking_id", `%${bookingId}%`)
          .limit(1)
          .maybeSingle();
        findData = result.data;
        findError = result.error;
      }

      if (findData) {
        console.log("Found booking:", findData);
        // Update using the actual UUID id
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            status: "selesai",
            updated_at: new Date().toISOString(),
          })
          .eq("id", findData.id);

        if (updateError) {
          console.error("Error updating booking status:", updateError);
        } else {
          console.log(
            "Booking status successfully updated to completed for ID:",
            findData.id
          );
        }
      } else {
        console.log("Booking not found for ID:", bookingId);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  const handleApprove = async (report: WorkReport) => {
    if (!currentUser) return;

    setProcessingId(report.id);
    try {
      // Step 1: Find or create customer record
      let customerId = null;
      if (report.nama_pelanggan && report.no_wa_pelanggan) {
        // Try to find existing customer
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("phone_number", report.no_wa_pelanggan)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              name: report.nama_pelanggan,
              phone_number: report.no_wa_pelanggan,
              address: report.alamat_pelanggan,
            })
            .select("id")
            .single();

          if (customerError) {
            console.error("Error creating customer:", customerError);
          } else {
            customerId = newCustomer.id;
          }
        }
      }

      // Skip profile creation steps - not needed for basic approval

      // Update ALL units for this booking to approved status
      const unitIds = report.units
        ? report.units.map((unit) => unit.id)
        : [report.id];
      const { error: updateError } = await supabase
        .from("work_reports")
        .update({
          status: "approved",
          approved_by: currentUser.username || currentUser.email,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes,
          updated_at: new Date().toISOString(),
        })
        .in("id", unitIds)
        .select();

      if (updateError) {
        console.error("Error updating approval status:", updateError);
        toast({
          title: "Error",
          description: "Gagal mengupdate status persetujuan",
          variant: "destructive",
        });
        return;
      }

      // Update referral count ONLY ONCE per booking when approved
      // Use atomic transaction to prevent race conditions
      if (report.booking_id && report.kode_referral) {
        console.log("=== CHECKING REFERRAL UPDATE FOR BOOKING ===");
        console.log("Booking ID:", report.booking_id);
        console.log("Referral Code:", report.kode_referral);

        try {
          // Use atomic update with conditional check to prevent race conditions
          // First, try to mark ONE work report as referral_counted atomically
          const atomicUpdateData: Record<string, any> = {
            referral_counted: true,
            updated_at: new Date().toISOString(),
          };
          const { data: atomicUpdate, error: atomicError } = await (
            supabase as any
          )
            .from("work_reports")
            .update(atomicUpdateData)
            .eq("booking_id", report.booking_id)
            .eq("referral_counted", false)
            .limit(1)
            .select("id");

          if (atomicError) {
            console.error("Error in atomic referral check:", atomicError);
            return;
          }

          // If no rows were updated, it means referral was already counted
          if (!atomicUpdate || atomicUpdate.length === 0) {
            console.log(
              "⚠️ Referral already counted for booking:",
              report.booking_id,
              "- SKIPPING"
            );
            return;
          }

          console.log(
            "✅ First approval for booking:",
            report.booking_id,
            "- UPDATING REFERRAL"
          );
          console.log(
            "✅ Atomic lock acquired on work_report:",
            atomicUpdate[0].id
          );

          // Now safely increment the referral count
          const { data: currentPartner, error: getError } = await supabase
            .from("partners")
            .select("total_poin")
            .eq("partner_id", report.kode_referral)
            .single();

          if (getError) {
            console.error("Error getting current partner data:", getError);
            return;
          }

          const newCount = ((currentPartner as any)?.total_poin || 0) + 1;

          const partnerUpdateData: Record<string, any> = {
            total_poin: newCount,
            updated_at: new Date().toISOString(),
          };
          const { error: updateError } = await (supabase as any)
            .from("partners")
            .update(partnerUpdateData)
            .eq("partner_id", report.kode_referral);

          if (updateError) {
            console.error("Error updating referral count:", updateError);
            return;
          }

          // Mark ALL remaining work reports for this booking as referral counted
          const updateData: Record<string, any> = {
            referral_counted: true,
            updated_at: new Date().toISOString(),
          };
          const { error: markAllError } = await (supabase as any)
            .from("work_reports")
            .update(updateData)
            .eq("booking_id", report.booking_id)
            .eq("referral_counted", false);

          if (markAllError) {
            console.error(
              "Error marking all referrals as counted:",
              markAllError
            );
          } else {
            console.log(
              "✅ SUCCESS: +1 referral point added to total_poin for partner:",
              report.kode_referral
            );
            console.log(
              "✅ All work reports marked as referral_counted for booking:",
              report.booking_id
            );
          }
        } catch (error) {
          console.error("Exception in referral update:", error);
        }
      }

      // Send work report notification to customer and admin numbers only
      await sendWhatsAppNotification(report);

      // Send separate affiliate notification (only congratulatory message) if applicable
      if (report.booking_id) {
        try {
          const affiliateNotificationSent = await sendAffiliateNotification(
            report.booking_id,
            report.nama_pelanggan
          );
          if (affiliateNotificationSent) {
            sonnerToast.success("Notifikasi affiliate berhasil dikirim");
            console.log(
              "Affiliate congratulatory notification sent separately"
            );
          }
        } catch (affiliateError) {
          console.error(
            "Error sending affiliate notification:",
            affiliateError
          );
        }
      }

      await updateBookingStatus(report.booking_id);

      toast({
        title: "Berhasil",
        description:
          "Laporan kerja telah disetujui dan notifikasi WhatsApp telah dikirim",
      });

      // Refresh the list and force re-render
      await fetchWorkReports();
      setSelectedReport(null);
      setApprovalNotes("");

      // Force component re-render by updating state
      setProcessingId(null);
    } catch (error) {
      console.error("Error in approval process:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memproses persetujuan",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const updateBookingStatusToRejected = async (
    bookingId: string,
    rejectionNotes: string
  ) => {
    if (!bookingId) return;

    try {
      console.log("Updating booking status to ditolak for:", bookingId);

      // Find booking by booking_id
      let { data: findData, error: findError } = await supabase
        .from("bookings")
        .select("id, booking_id, status, catatan")
        .eq("booking_id", bookingId)
        .maybeSingle();

      // If not found, try finding by id field directly
      if (!findData && !findError) {
        const result = await supabase
          .from("bookings")
          .select("id, booking_id, status, catatan")
          .eq("id", bookingId)
          .maybeSingle();
        findData = result.data;
        findError = result.error;
      }

      if (findData) {
        console.log("Found booking for rejection:", findData);
        console.log("Old catatan:", findData.catatan);
        console.log("New rejection notes:", rejectionNotes);

        // Update booking status to 'ditolak' and replace catatan with rejection reason
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            status: "ditolak",
            catatan: rejectionNotes, // Timpa catatan lama dengan alasan penolakan
            updated_at: new Date().toISOString(),
          })
          .eq("id", findData.id);

        if (updateError) {
          console.error(
            "Error updating booking status to ditolak:",
            updateError
          );
        } else {
          console.log(
            "Booking status successfully updated to ditolak for ID:",
            findData.id
          );
          console.log("Catatan updated with rejection reason");
        }
      } else {
        console.log("Booking not found for rejection, ID:", bookingId);
      }
    } catch (error) {
      console.error("Error updating booking to rejected:", error);
    }
  };

  const handleReject = async (report: WorkReport) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Alasan penolakan harus diisi",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(report.id);

    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      // Update ALL units for this booking to rejected status
      const unitIds = report.units
        ? report.units.map((unit) => unit.id)
        : [report.id];
      const { error: updateError } = await supabase
        .from("work_reports")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          approved_by: currentUser.username || currentUser.email,
          approved_at: new Date().toISOString(),
          internal_notes: internalNotes || null,
          updated_at: new Date().toISOString(),
        })
        .in("id", unitIds);

      if (updateError) {
        console.error("Error rejecting work report:", updateError);
        toast({
          title: "Error",
          description: "Gagal menolak laporan kerja",
          variant: "destructive",
        });
        return;
      }

      // Update booking status back to 'ditolak' so it appears in scheduled bookings
      // Pass rejection reason to update booking catatan
      if (report.booking_id) {
        await updateBookingStatusToRejected(report.booking_id, rejectionReason);
      }

      toast({
        title: "Berhasil",
        description:
          "Laporan kerja telah ditolak dan booking dikembalikan ke jadwal dengan status ditolak",
      });

      // Refresh the list
      fetchWorkReports();
      setSelectedReport(null);
      setRejectionReason("");
      setInternalNotes("");
    } catch (error) {
      console.error("Error in rejection process:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menolak laporan",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "pending_approval":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Menunggu Persetujuan
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Disetujui
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Ditolak
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Menunggu Persetujuan
          </Badge>
        );
    }
  };

  const parsePhotoUrls = (photoUrlString: string): string[] => {
    if (!photoUrlString) return [];
    try {
      return JSON.parse(photoUrlString);
    } catch {
      return [photoUrlString];
    }
  };

  // Show view-only mode for technicians
  const isViewOnly = currentUser?.role === "teknisi";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isViewOnly ? "Lihat Laporan Kerja" : "Persetujuan Laporan Kerja"}
          </h1>
          <p className="text-gray-600">
            {isViewOnly
              ? "Lihat status laporan kerja dari semua teknisi"
              : "Kelola dan setujui laporan kerja dari teknisi"}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              {
                key: "pending_approval",
                label: "Menunggu Persetujuan",
                icon: Clock,
              },
              { key: "approved", label: "Disetujui", icon: CheckCircle },
              { key: "rejected", label: "Ditolak", icon: XCircle },
              { key: "all", label: "Semua", icon: Eye },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat laporan kerja...</p>
          </div>
        ) : workReports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tidak ada laporan kerja
              </h3>
              <p className="text-gray-600">
                {filter === "pending_approval"
                  ? "Tidak ada laporan kerja yang menunggu persetujuan"
                  : `Tidak ada laporan kerja dengan status ${filter}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pagination Info */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, workReports.length)} dari{" "}
                {workReports.length} laporan
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Sebelumnya
                </button>
                <span className="text-sm text-gray-600">
                  Halaman {currentPage} dari{" "}
                  {Math.ceil(workReports.length / itemsPerPage)}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        Math.ceil(workReports.length / itemsPerPage)
                      )
                    )
                  }
                  disabled={
                    currentPage >= Math.ceil(workReports.length / itemsPerPage)
                  }
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>

            <div className="grid gap-6">
              {workReports
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage
                )
                .map((report) => (
                  <Card key={report.id} className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {report.nama_pelanggan || "Nama tidak tersedia"}
                          </CardTitle>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            {report.tanggal_dikerjakan && (
                              <>
                                <Calendar className="w-4 h-4 mr-1" />
                                {report.tanggal_dikerjakan}
                              </>
                            )}
                            {report.tanggal_dikerjakan && report.teknisi && (
                              <span className="mx-2">•</span>
                            )}
                            {report.teknisi && (
                              <>
                                <User className="w-4 h-4 mr-1" />
                                {report.teknisi}
                              </>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          {report.no_wa_pelanggan &&
                            currentUser?.role !== "teknisi" && (
                              <div className="flex items-center text-sm">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="font-medium">No. WA:</span>
                                <span className="ml-2">
                                  {report.no_wa_pelanggan}
                                </span>
                              </div>
                            )}
                          {report.alamat_pelanggan && (
                            <div className="flex items-start text-sm">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                              <span className="font-medium">Alamat:</span>
                              <span className="ml-2">
                                {report.alamat_pelanggan}
                              </span>
                            </div>
                          )}
                          {report.jenis_pekerjaan && (
                            <div className="flex items-center text-sm">
                              <Wrench className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">
                                Jenis Pekerjaan:
                              </span>
                              <span className="ml-2">
                                {report.jenis_pekerjaan}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {report.no_unit && (
                            <div className="flex items-center text-sm">
                              <span className="font-medium">No Unit:</span>
                              <span className="ml-2">{report.no_unit}</span>
                            </div>
                          )}
                          {report.merk && (
                            <div className="flex items-center text-sm">
                              <span className="font-medium">Merk AC:</span>
                              <span className="ml-2">{report.merk}</span>
                            </div>
                          )}
                          {report.booking_id && (
                            <div className="flex items-center text-sm">
                              <span className="font-medium">Booking ID:</span>
                              <span className="ml-2">{report.booking_id}</span>
                              {report.units && report.units.length > 1 && (
                                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                  {report.units.length} Unit
                                </span>
                              )}
                            </div>
                          )}
                          {report.kode_referral && (
                            <div className="flex items-center text-sm">
                              <span className="font-medium">
                                Kode Referral:
                              </span>
                              <div className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                🎯 {report.kode_referral}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Multi-unit details section */}
                      {report.units && report.units.length > 1 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              Detail Semua Unit ({report.units.length} Unit)
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newExpanded = new Set(expandedReports);
                                if (expandedReports.has(report.id)) {
                                  newExpanded.delete(report.id);
                                } else {
                                  newExpanded.add(report.id);
                                }
                                setExpandedReports(newExpanded);
                              }}
                              className="text-xs"
                            >
                              {expandedReports.has(report.id) ? (
                                <>
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                  Tutup Detail
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  Lihat Detail Semua Unit
                                </>
                              )}
                            </Button>
                          </div>

                          {expandedReports.has(report.id) && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                              {report.units.map((unit, index) => (
                                <div
                                  key={unit.id}
                                  className="bg-white p-4 rounded-lg border"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-sm text-gray-900">
                                      Unit {index + 1}
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                      ID: {unit.id}
                                    </span>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-2">
                                      {unit.jenis_pekerjaan && (
                                        <div className="flex items-center text-sm">
                                          <Wrench className="w-4 h-4 mr-2 text-gray-400" />
                                          <span className="font-medium">
                                            Jenis:
                                          </span>
                                          <span className="ml-2">
                                            {unit.jenis_pekerjaan}
                                          </span>
                                        </div>
                                      )}
                                      {unit.no_unit && (
                                        <div className="flex items-center text-sm">
                                          <span className="font-medium">
                                            No Unit:
                                          </span>
                                          <span className="ml-2">
                                            {unit.no_unit}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      {unit.merk && (
                                        <div className="flex items-center text-sm">
                                          <span className="font-medium">
                                            Merk:
                                          </span>
                                          <span className="ml-2">
                                            {unit.merk}
                                          </span>
                                        </div>
                                      )}
                                      {unit.spek_unit && (
                                        <div className="flex items-center text-sm">
                                          <span className="font-medium">
                                            Spek:
                                          </span>
                                          <span className="ml-2">
                                            {unit.spek_unit}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {unit.keterangan && (
                                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                      <span className="font-medium text-sm">
                                        Keterangan:
                                      </span>
                                      <p className="text-sm mt-1">
                                        {unit.keterangan}
                                      </p>
                                    </div>
                                  )}

                                  {unit.foto_url && (
                                    <div>
                                      <span className="font-medium text-sm mb-2 block">
                                        Foto Unit:
                                      </span>
                                      <div className="flex gap-2 flex-wrap">
                                        {parsePhotoUrls(unit.foto_url).map(
                                          (url, photoIndex) => (
                                            <img
                                              key={photoIndex}
                                              src={url}
                                              alt={`Foto unit ${index + 1} - ${
                                                photoIndex + 1
                                              }`}
                                              className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                                              onClick={() => {
                                                setSelectedPhotos(
                                                  parsePhotoUrls(unit.foto_url)
                                                );
                                                setShowPhotoModal(true);
                                              }}
                                            />
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Single unit details */}
                      {(!report.units || report.units.length <= 1) && (
                        <>
                          {report.keterangan && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-sm">
                                Keterangan:
                              </span>
                              <p className="text-sm mt-1">
                                {report.keterangan}
                              </p>
                            </div>
                          )}

                          {report.foto_url && (
                            <div className="mb-4">
                              <span className="font-medium text-sm mb-2 block">
                                Foto Pekerjaan:
                              </span>
                              <div className="flex gap-2 flex-wrap">
                                {parsePhotoUrls(report.foto_url).map(
                                  (url, index) => (
                                    <img
                                      key={index}
                                      src={url}
                                      alt={`Foto pekerjaan ${index + 1}`}
                                      className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                                      onClick={() => {
                                        setSelectedPhotos(
                                          parsePhotoUrls(report.foto_url)
                                        );
                                        setShowPhotoModal(true);
                                      }}
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {(report.status === "pending_approval" ||
                        !report.status) &&
                        !isViewOnly && (
                          <div className="border-t pt-4">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Catatan Persetujuan (Opsional)
                                </label>
                                <Textarea
                                  value={
                                    selectedReport?.id === report.id
                                      ? approvalNotes
                                      : ""
                                  }
                                  onChange={(e) => {
                                    setSelectedReport(report);
                                    setApprovalNotes(e.target.value);
                                  }}
                                  placeholder="Tambahkan catatan untuk persetujuan..."
                                  className="w-full"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Alasan Penolakan{" "}
                                  <span className="text-red-500">*</span>
                                  <span className="text-xs text-gray-500 ml-1">
                                    (Wajib diisi untuk menolak laporan)
                                  </span>
                                </label>
                                <Textarea
                                  value={
                                    selectedReport?.id === report.id
                                      ? rejectionReason
                                      : ""
                                  }
                                  onChange={(e) => {
                                    setSelectedReport(report);
                                    setRejectionReason(e.target.value);
                                  }}
                                  placeholder="Jelaskan alasan penolakan laporan..."
                                  className={`w-full ${
                                    selectedReport?.id === report.id &&
                                    !rejectionReason.trim()
                                      ? "border-red-300 focus:border-red-500"
                                      : ""
                                  }`}
                                />
                                {selectedReport?.id === report.id &&
                                  !rejectionReason.trim() && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Alasan penolakan harus diisi untuk dapat
                                      menolak laporan
                                    </p>
                                  )}
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium">
                                    Catatan Internal (Tidak tampil di WhatsApp)
                                  </label>
                                  {report.internal_notes && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedReport(report);
                                        if (
                                          isEditingInternalNotes === report.id
                                        ) {
                                          // Stop editing - keep current value
                                          setIsEditingInternalNotes(null);
                                        } else {
                                          // Start editing - auto-fill from database
                                          setInternalNotes(
                                            report.internal_notes || ""
                                          );
                                          setIsEditingInternalNotes(report.id);
                                        }
                                      }}
                                      className="text-xs"
                                    >
                                      <Edit3 className="w-3 h-3 mr-1" />
                                      {isEditingInternalNotes === report.id
                                        ? "Selesai Edit"
                                        : "Edit Catatan Internal"}
                                    </Button>
                                  )}
                                </div>

                                {/* Show existing internal notes if not editing */}
                                {report.internal_notes &&
                                  isEditingInternalNotes !== report.id && (
                                    <div className="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <span className="text-sm font-medium text-blue-700">
                                        Catatan Internal Tersimpan:
                                      </span>
                                      <p className="text-sm mt-1 text-blue-600">
                                        {report.internal_notes}
                                      </p>
                                    </div>
                                  )}

                                {/* Show textarea when editing or no existing notes */}
                                {(!report.internal_notes ||
                                  isEditingInternalNotes === report.id) && (
                                  <Textarea
                                    value={
                                      selectedReport?.id === report.id
                                        ? internalNotes
                                        : report.internal_notes || ""
                                    }
                                    onChange={(e) => {
                                      setSelectedReport(report);
                                      setInternalNotes(e.target.value);
                                    }}
                                    onFocus={() => {
                                      setSelectedReport(report);
                                      // Auto-fill from database when focusing if not already filled
                                      if (
                                        !internalNotes &&
                                        report.internal_notes
                                      ) {
                                        setInternalNotes(report.internal_notes);
                                      }
                                    }}
                                    placeholder="Catatan internal untuk riwayat/detail order..."
                                    className="w-full"
                                  />
                                )}
                              </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                              <Button
                                onClick={() => handleApprove(report)}
                                disabled={processingId === report.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {processingId === report.id
                                  ? "Memproses..."
                                  : "Setujui"}
                              </Button>
                              <Button
                                onClick={() => handleReject(report)}
                                disabled={
                                  processingId === report.id ||
                                  !rejectionReason.trim() ||
                                  selectedReport?.id !== report.id
                                }
                                variant="destructive"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                {processingId === report.id
                                  ? "Memproses..."
                                  : "Tolak"}
                              </Button>
                            </div>
                          </div>
                        )}

                      {/* View-only message for technicians */}
                      {isViewOnly &&
                        (report.status === "pending_approval" ||
                          !report.status) && (
                          <div className="border-t pt-4">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center">
                                <Eye className="w-5 h-5 text-blue-600 mr-2" />
                                <span className="text-sm font-medium text-blue-700">
                                  Mode Lihat Saja - Hanya admin dan manager yang
                                  dapat menyetujui atau menolak laporan
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                      {(report.status === "approved" ||
                        report.status === "rejected") && (
                        <div className="border-t pt-4 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 mt-4">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">
                              {report.status === "approved"
                                ? "Disetujui"
                                : "Ditolak"}{" "}
                              oleh:
                            </span>
                            <span className="ml-2">{report.approved_by}</span>
                            {report.approved_at && (
                              <>
                                <span className="mx-2">•</span>
                                <span>
                                  {new Date(report.approved_at).toLocaleString(
                                    "id-ID"
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                          {report.approval_notes && (
                            <div className="mt-2">
                              <span className="font-medium text-sm">
                                Catatan Persetujuan:
                              </span>
                              <p className="text-sm mt-1">
                                {report.approval_notes}
                              </p>
                            </div>
                          )}
                          {report.rejection_reason && (
                            <div className="mt-2">
                              <span className="font-medium text-sm text-red-600">
                                Alasan Penolakan:
                              </span>
                              <p className="text-sm mt-1 text-red-600">
                                {report.rejection_reason}
                              </p>
                            </div>
                          )}
                          {report.internal_notes && (
                            <div className="mt-2">
                              <span className="font-medium text-sm text-blue-600">
                                Catatan Internal:
                              </span>
                              <p className="text-sm mt-1 text-blue-600">
                                {report.internal_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Photo Modal */}
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">Foto Pekerjaan</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPhotoModal(false)}
                >
                  Tutup
                </Button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedPhotos.map((url, index) => (
                    <div key={index} className="space-y-2">
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(url, "_blank")}
                        className="w-full text-xs"
                      >
                        Buka di Tab Baru
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkReportApproval;

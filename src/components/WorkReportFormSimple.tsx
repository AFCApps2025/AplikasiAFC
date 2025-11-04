import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Camera, Upload, X, Send, Plus, Minus } from 'lucide-react';
import { notificationService } from '../utils/notifications';
import { useToast } from '../hooks/use-toast';

// Helper Select Component - Load from Supabase
const HelperSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [helpers, setHelpers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHelpers = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('system_accounts')
          .select('id, name, username')
          .eq('role', 'helper')
          .eq('active', true)
          .order('name', { ascending: true });

        if (error) throw error;
        setHelpers(data || []);
      } catch (error) {
        console.error('Error loading helpers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpers();
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
      disabled={loading}
    >
      <option value="">{loading ? 'Loading...' : 'Pilih Helper'}</option>
      {helpers.map((helper) => (
        <option key={helper.id} value={helper.name}>
          {helper.name}
        </option>
      ))}
    </select>
  );
};

const WorkReportForm = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [unitPhotos, setUnitPhotos] = useState<{[key: number]: {files: File[], previews: string[]}}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Check if form data comes from booking (auto-filled)
  const [isFromBooking, setIsFromBooking] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    namaPelanggan: '',
    alamatPelanggan: '',
    noWaPelanggan: '',
    bookingUnitCount: 0, // Track expected unit count from booking
    units: [{
      noUnit: '',
      merk: '',
      merkLain: '',
      spekUnit: '',
      keterangan: '',
      internalNotes: ''
    }],
    tanggalDikerjakan: (() => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      return `${year}-${month}-${day}`;
    })(),
    workTypes: [{
      jenisPekerjaan: ''
    }],
    teknisi: '',
    helper: '',
    bookingId: '',
    kodeReferral: ''
  });

  // Auto-fill form from URL parameters or localStorage
  useEffect(() => {
    
    // First try URL parameters - prioritize bookingId from query
    const bookingIdFromQuery = searchParams.get('bookingId');
    const customerName = searchParams.get('customerName');
    const customerPhone = searchParams.get('customerPhone');
    const customerAddress = searchParams.get('customerAddress');
    const serviceType = searchParams.get('serviceType');
    const technician = searchParams.get('technician');
    
    // If bookingId exists in query, fetch booking data from Supabase
    if (bookingIdFromQuery) {
      const fetchBookingData = async () => {
        try {
          const { data: bookingData, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingIdFromQuery)
            .maybeSingle();
          
          if (error) throw error;
          
          if (bookingData) {
            // Check if this booking has an existing work report (for komplain cases)
            const { data: existingReport, error: reportError } = await (supabase as any)
              .from('work_reports')
              .select('*')
              .eq('booking_id', bookingData.booking_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (reportError) {
              console.error('Error checking existing report:', reportError);
            }
            
            // If booking status is 'komplain' and there's an existing report, auto-fill with previous data
            if (bookingData.status === 'komplain' && existingReport) {
              console.log('📋 Auto-filling form with previous work report data for komplain');
              
              // Parse existing data
              const existingUnits = existingReport.units ? JSON.parse(existingReport.units) : [];
              const existingWorkTypes = existingReport.jenis_pekerjaan ? JSON.parse(existingReport.jenis_pekerjaan) : [];
              const existingPhotos = existingReport.foto_url ? JSON.parse(existingReport.foto_url) : [];
              
              setFormData(prev => ({
                ...prev,
                namaPelanggan: existingReport.nama_pelanggan || bookingData.nama || '',
                alamatPelanggan: existingReport.alamat_pelanggan || bookingData.alamat || '',
                noWaPelanggan: existingReport.no_wa_pelanggan || bookingData.no_hp || '',
                bookingUnitCount: existingUnits.length || bookingData.jumlah_unit || 1,
                units: existingUnits.length > 0 ? existingUnits : [{
                  noUnit: '',
                  merk: bookingData.merk || '',
                  merkLain: '',
                  spekUnit: '',
                  keterangan: '',
                  internalNotes: ''
                }],
                workTypes: existingWorkTypes.length > 0 ? existingWorkTypes : [{ 
                  jenisPekerjaan: bookingData.jenis_layanan || '' 
                }],
                teknisi: existingReport.teknisi || bookingData.teknisi || currentUser?.username || '',
                helper: existingReport.helper || '',
                bookingId: bookingData.booking_id || '',
                kodeReferral: existingReport.kode_referral || bookingData.kode_referral || ''
              }));
              
              // Store existing report ID for update later
              sessionStorage.setItem('existingReportId', existingReport.id);
              sessionStorage.setItem('isComplainUpdate', 'true');
              
              setIsFromBooking(true);
            } else {
              // Normal booking flow - create new report
              const unitCount = bookingData.jumlah_unit || 1;
              const initialUnits = Array.from({ length: unitCount }, () => ({
                noUnit: '',
                merk: bookingData.merk || '',
                merkLain: '',
                spekUnit: '',
                keterangan: '',
                internalNotes: ''
              }));
              const initialWorkTypes = Array.from({ length: unitCount }, () => ({ 
                jenisPekerjaan: bookingData.jenis_layanan || '' 
              }));
              
              setFormData(prev => ({
                ...prev,
                namaPelanggan: bookingData.nama || '',
                alamatPelanggan: bookingData.alamat || '',
                noWaPelanggan: bookingData.no_hp || '',
                bookingUnitCount: unitCount,
                units: initialUnits,
                workTypes: initialWorkTypes,
                teknisi: bookingData.teknisi || currentUser?.username || '',
                bookingId: bookingData.booking_id || '',
                kodeReferral: bookingData.kode_referral || ''
              }));
              
              // Clear session storage for new report
              sessionStorage.removeItem('existingReportId');
              sessionStorage.removeItem('isComplainUpdate');
              
              setIsFromBooking(true);
            }
          }
        } catch (error) {
          console.error('Error fetching booking data:', error);
        }
      };
      
      fetchBookingData();
      return;
    }
    
    const bookingId = bookingIdFromQuery;
    
    // Check for rejected report data
    const checkRejectedReport = async () => {
      if (bookingId) {
        try {
          const { data: rejectedReport } = await supabase
            .from('work_reports')
            .select('*')
            .eq('booking_id', bookingId)
            .eq('status', 'rejected')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (rejectedReport) {
            // Pre-fill form with rejected report data
            setFormData(prev => ({
              ...prev,
              namaPelanggan: rejectedReport.nama_pelanggan || customerName || '',
              alamatPelanggan: rejectedReport.alamat_pelanggan || customerAddress || '',
              noWaPelanggan: rejectedReport.no_wa_pelanggan || customerPhone || '',
              units: rejectedReport.no_unit ? [{
                noUnit: rejectedReport.no_unit,
                merk: rejectedReport.merk || '',
                merkLain: '',
                spekUnit: rejectedReport.spek_unit || '',
                keterangan: rejectedReport.keterangan || '',
                internalNotes: rejectedReport.catatan_internal || ''
              }] : prev.units,
              workTypes: rejectedReport.jenis_pekerjaan ? [{
                jenisPekerjaan: rejectedReport.jenis_pekerjaan
              }] : prev.workTypes,
              teknisi: rejectedReport.teknisi || technician || '',
              bookingId: bookingId
            }));
            
            toast({
              title: "Error",
              description: "Harap isi semua data yang diperlukan",
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          console.log('No rejected report found, continuing with normal flow');
        }
      }
    };
    
    checkRejectedReport();
    
    if (customerName || customerPhone || customerAddress) {
      setFormData(prev => ({
        ...prev,
        namaPelanggan: customerName || '',
        alamatPelanggan: customerAddress || '',
        noWaPelanggan: customerPhone || '',
        workTypes: [{ jenisPekerjaan: serviceType || '' }],
        teknisi: technician || '',
        bookingId: bookingId || ''
      }));
      
      toast({
        title: "Berhasil!",
        description: "Laporan kerja berhasil disimpan!",
      });
      return;
    }
    
    // Check for current booking data from ScheduledBookings
    const currentBookingData = localStorage.getItem('currentBookingForReport');
    
    if (currentBookingData) {
      try {
        const bookingData = JSON.parse(currentBookingData);
        
        // Also fetch referral code and unit count if booking exists
        const fetchBookingDetails = async () => {
          if (bookingData.booking_id) {
            try {
              const { data: bookingDetails } = await supabase
                .from('bookings')
                .select('kode_referral, jumlah_unit')
                .eq('booking_id', bookingData.booking_id)
                .maybeSingle();
              
              const unitCount = bookingDetails?.jumlah_unit || 1;
              const initialUnits = Array.from({ length: unitCount }, () => ({
                noUnit: '',
                merk: '',
                merkLain: '',
                spekUnit: '',
                keterangan: '',
                internalNotes: ''
              }));
              const initialWorkTypes = Array.from({ length: unitCount }, () => ({ jenisPekerjaan: bookingData.jenis_pekerjaan || '' }));
              
              setFormData(prev => ({
                ...prev,
                namaPelanggan: bookingData.nama_pelanggan || '',
                alamatPelanggan: bookingData.alamat_pelanggan || '',
                noWaPelanggan: bookingData.no_wa_pelanggan || '',
                bookingUnitCount: unitCount,
                units: initialUnits,
                workTypes: initialWorkTypes,
                teknisi: bookingData.teknisi || currentUser?.username || '',
                bookingId: bookingData.booking_id || '',
                kodeReferral: bookingDetails?.kode_referral || ''
              }));
            } catch (error) {
              console.error('Error fetching referral code:', error);
              setFormData(prev => ({
                ...prev,
                namaPelanggan: bookingData.nama_pelanggan || '',
                alamatPelanggan: bookingData.alamat_pelanggan || '',
                noWaPelanggan: bookingData.no_wa_pelanggan || '',
                bookingUnitCount: 1, // Default if no unit count found
                workTypes: [{ jenisPekerjaan: bookingData.jenis_pekerjaan || '' }],
                teknisi: bookingData.teknisi || currentUser?.username || '',
                bookingId: bookingData.booking_id || '',
                kodeReferral: ''
              }));
            }
          }
        };
        
        fetchBookingDetails();
        
        // Clear the booking data after using it
        localStorage.removeItem('currentBookingForReport');
        
        toast({
          title: "Berhasil!",
          description: "Laporan kerja berhasil disimpan!",
        });
        return;
      } catch (error) {
        console.error('Error parsing booking data:', error);
      }
    }
    
    // Fallback to localStorage
    const prefillData = localStorage.getItem('workReportPrefill');
    
    if (prefillData) {
      try {
        const data = JSON.parse(prefillData);
        
        setFormData(prev => {
          const newFormData = {
            ...prev,
            namaPelanggan: data.customerName || '',
            alamatPelanggan: data.customerAddress || '',
            noWaPelanggan: data.customerPhone || '',
            workTypes: [{ jenisPekerjaan: data.serviceType || '' }],
            teknisi: data.technician || '',
            bookingId: data.bookingId || ''
          };
          return newFormData;
        });
        
        // Clear the prefill data after using it
        localStorage.removeItem('workReportPrefill');
        
        toast({
          title: "Berhasil!",
          description: "Data pelanggan berhasil dimuat dari booking",
        });
      } catch (error) {
        console.error('Error parsing prefill data:', error);
      }
    }
  }, [searchParams]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUnitChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.map((unit, i) => 
        i === index ? { ...unit, [field]: value } : unit
      )
    }));
  };

  const handleWorkTypeChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      workTypes: prev.workTypes.map((workType, i) => 
        i === index ? { ...workType, jenisPekerjaan: value } : workType
      )
    }));
  };

  const addUnit = () => {
    // Allow tambah unit tanpa batasan - user bisa tambah sesuai kebutuhan lapangan
    setFormData(prev => ({
      ...prev,
      units: [...prev.units, { noUnit: '', merk: '', merkLain: '', spekUnit: '', keterangan: '', internalNotes: '' }],
      workTypes: [...prev.workTypes, { jenisPekerjaan: '' }]
    }));
    
    // Info jika berbeda dari booking
    if (formData.bookingUnitCount > 0 && formData.units.length + 1 > formData.bookingUnitCount) {
      toast({
        title: "Info",
        description: `Unit ditambahkan. Total unit sekarang: ${formData.units.length + 1} (booking: ${formData.bookingUnitCount} unit)`,
      });
    }
  };

  const removeUnit = (index: number) => {
    // Allow hapus unit - minimal 1 unit harus ada
    if (formData.units.length > 1) {
      setFormData(prev => ({
        ...prev,
        units: prev.units.filter((_, i) => i !== index),
        workTypes: prev.workTypes.filter((_, i) => i !== index)
      }));
      
      // Info jika berbeda dari booking
      if (formData.bookingUnitCount > 0 && formData.units.length - 1 < formData.bookingUnitCount) {
        toast({
          title: "Info",
          description: `Unit dihapus. Total unit sekarang: ${formData.units.length - 1} (booking: ${formData.bookingUnitCount} unit)`,
        });
      }
      
      // Remove unit photos
      setUnitPhotos(prev => {
        const newUnitPhotos = { ...prev };
        delete newUnitPhotos[index];
        // Reindex remaining photos
        const reindexed: {[key: number]: {files: File[], previews: string[]}} = {};
        Object.keys(newUnitPhotos).forEach((key, newIndex) => {
          const oldIndex = parseInt(key);
          if (oldIndex > index) {
            reindexed[oldIndex - 1] = newUnitPhotos[oldIndex];
          } else {
            reindexed[oldIndex] = newUnitPhotos[oldIndex];
          }
        });
        return reindexed;
      });
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setPhotos(prev => [...prev, ...newFiles]);
      
      // Create previews for new files
      newFiles.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setPhotoPreviews(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    
    // Reset input value to allow taking multiple photos
    if (event.target) {
      event.target.value = '';
    }
  };

  const openCamera = async () => {
    try {
      // Check if device supports camera access
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to file input with capture
        if (cameraInputRef.current) {
          cameraInputRef.current.value = '';
          cameraInputRef.current.click();
        }
        return;
      }

      // Try to access camera directly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera
      });
      
      // Stop the stream immediately (we just wanted to trigger permission)
      stream.getTracks().forEach(track => track.stop());
      
      // Now trigger the file input which should open camera
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
        cameraInputRef.current.click();
      }
    } catch (error) {
      console.log('Camera access failed, using file input:', error);
      // Fallback to regular file input
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
        cameraInputRef.current.click();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setPhotos(prev => [...prev, ...newFiles]);
      
      // Create previews for new files
      newFiles.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setPhotoPreviews(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Unit-specific photo functions
  const handleUnitPhotoCapture = (unitIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      
      setUnitPhotos(prev => {
        const currentUnit = prev[unitIndex] || { files: [], previews: [] };
        const updatedFiles = [...currentUnit.files, ...newFiles];
        
        // Create previews for new files
        const newPreviews = [...currentUnit.previews];
        newFiles.forEach((file: File) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              setUnitPhotos(prevPhotos => ({
                ...prevPhotos,
                [unitIndex]: {
                  ...prevPhotos[unitIndex],
                  previews: [...(prevPhotos[unitIndex]?.previews || []), e.target!.result as string]
                }
              }));
            }
          };
          reader.readAsDataURL(file);
        });
        
        return {
          ...prev,
          [unitIndex]: {
            files: updatedFiles,
            previews: newPreviews
          }
        };
      });
    }
    
    // Reset input value
    if (event.target) {
      event.target.value = '';
    }
  };

  const openUnitCamera = async (unitIndex: number) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to file input with capture
        const input = document.getElementById(`unit-camera-${unitIndex}`) as HTMLInputElement;
        if (input) {
          input.value = '';
          input.click();
        }
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      const input = document.getElementById(`unit-camera-${unitIndex}`) as HTMLInputElement;
      if (input) {
        input.value = '';
        input.click();
      }
    } catch (error) {
      console.log('Camera access failed, using file input:', error);
      const input = document.getElementById(`unit-camera-${unitIndex}`) as HTMLInputElement;
      if (input) {
        input.value = '';
        input.click();
      }
    }
  };

  const handleUnitFileUpload = (unitIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      
      setUnitPhotos(prev => {
        const currentUnit = prev[unitIndex] || { files: [], previews: [] };
        const updatedFiles = [...currentUnit.files, ...newFiles];
        
        // Create previews for new files
        const newPreviews = [...currentUnit.previews];
        newFiles.forEach((file: File) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              setUnitPhotos(prevPhotos => ({
                ...prevPhotos,
                [unitIndex]: {
                  ...prevPhotos[unitIndex],
                  previews: [...(prevPhotos[unitIndex]?.previews || []), e.target!.result as string]
                }
              }));
            }
          };
          reader.readAsDataURL(file);
        });
        
        return {
          ...prev,
          [unitIndex]: {
            files: updatedFiles,
            previews: newPreviews
          }
        };
      });
    }
  };

  const removeUnitPhoto = (unitIndex: number, photoIndex: number) => {
    setUnitPhotos(prev => {
      const currentUnit = prev[unitIndex];
      if (!currentUnit) return prev;
      
      return {
        ...prev,
        [unitIndex]: {
          files: currentUnit.files.filter((_, i) => i !== photoIndex),
          previews: currentUnit.previews.filter((_, i) => i !== photoIndex)
        }
      };
    });
  };

  const removeAllUnitPhotos = (unitIndex: number) => {
    setUnitPhotos(prev => {
      const newPhotos = { ...prev };
      delete newPhotos[unitIndex];
      return newPhotos;
    });
  };

  const removeAllPhotos = () => {
    setPhotos([]);
    setPhotoPreviews([]);
  };

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const photo of photos) {
      try {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `work-reports/${fileName}`;

        const { data, error } = await supabase.storage
          .from('work-report-photos')
          .upload(filePath, photo);

        if (error) {
          console.error('Error uploading photo:', error);
          throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('work-report-photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading photo:', error);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const updateBookingStatus = async (bookingId: string) => {
    if (!bookingId) {
      console.log('No booking ID provided to updateBookingStatus');
      return;
    }

    try {
      console.log('=== BOOKING UPDATE PROCESS START ===');
      console.log('Booking ID:', bookingId);
      console.log('Booking ID type:', typeof bookingId);
      
      // Try multiple search strategies
      let findData = null;
      let searchMethod = '';
      
      // Method 1: Search by booking_id field
      console.log('Method 1: Searching by booking_id field...');
      const { data: data1, error: error1 } = await supabase
        .from('bookings')
        .select('id, booking_id, status, nama')
        .eq('booking_id', bookingId)
        .maybeSingle();
      
      if (data1) {
        findData = data1;
        searchMethod = 'booking_id field';
        console.log('Found by booking_id:', data1);
      }
      
      // Method 2: Search by id field if not found
      if (!findData) {
        console.log('Method 2: Searching by id field...');
        const { data: data2, error: error2 } = await supabase
          .from('bookings')
          .select('id, booking_id, status, nama')
          .eq('id', bookingId)
          .maybeSingle();
        
        if (data2) {
          findData = data2;
          searchMethod = 'id field';
          console.log('Found by id:', data2);
        }
      }
      
      // Method 3: Partial search if still not found
      if (!findData) {
        console.log('Method 3: Partial search...');
        const { data: data3, error: error3 } = await supabase
          .from('bookings')
          .select('id, booking_id, status, nama')
          .ilike('booking_id', `%${bookingId}%`)
          .limit(5);
        
        console.log('Partial search results:', data3);
        if (data3 && data3.length > 0) {
          findData = data3[0];
          searchMethod = 'partial match';
          console.log('Found by partial match:', data3[0]);
        }
      }

      if (findData) {
        console.log(`Booking found via ${searchMethod}:`, findData);
        console.log('Current status:', findData.status);
        
        // Update the booking status
        const { data: updateData, error: updateError } = await supabase
          .from('bookings')
          .update({ 
            status: 'selesai',
            updated_at: new Date().toISOString()
          })
          .eq('id', findData.id)
          .select();

        if (updateError) {
          console.error('Error updating booking status:', updateError);
          console.error('Update error details:', JSON.stringify(updateError, null, 2));
        } else {
          console.log('✅ Booking status successfully updated to selesai!');
          console.log('Updated booking data:', updateData);
          
          // Verify the update worked
          const { data: verifyData } = await supabase
            .from('bookings')
            .select('id, booking_id, status')
            .eq('id', findData.id)
            .maybeSingle();
          
          console.log('Verification - booking status after update:', verifyData);
        
          // Force refresh of scheduled bookings by dispatching a custom event
          window.dispatchEvent(new CustomEvent('bookingStatusUpdated', { 
            detail: { bookingId: findData.id, newStatus: 'selesai' } 
          }));
        }
      } else {
        console.error('❌ Booking not found with any search method!');
        console.log('Searched booking ID:', bookingId);
        
        // Let's see what bookings exist
        const { data: allBookings } = await supabase
          .from('bookings')
          .select('id, booking_id, status, nama')
          .limit(10);
        
        console.log('Sample of existing bookings:', allBookings);
      }
    } catch (error) {
      console.error('Exception in updateBookingStatus:', error);
    }
    
    console.log('=== BOOKING UPDATE PROCESS END ===');
  };

  const sendAffiliateNotification = async (bookingId: string, customerName: string) => {
    try {
      console.log('=== AFFILIATE NOTIFICATION DEBUG ===');
      console.log('Booking ID:', bookingId);
      console.log('Customer Name:', customerName);
      
      // Skip if no booking ID
      if (!bookingId) {
        console.log('No booking ID provided, skipping affiliate notification');
        return false;
      }
      
      // Get booking data to check for referral code, jenis_layanan, and status
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('kode_referral, nama, jenis_layanan, status')
        .eq('booking_id', bookingId)
        .maybeSingle();

      console.log('Booking query result:', { bookingData, bookingError });

      if (bookingError || !bookingData?.kode_referral) {
        console.log('No referral code found for booking:', bookingId);
        return false;
      }

      // Skip notifikasi jika jenis_layanan adalah 'cek' atau status adalah 'komplain'
      const jenisLayananLower = bookingData.jenis_layanan?.toLowerCase() || '';
      const statusLower = bookingData.status?.toLowerCase() || '';
      
      if (jenisLayananLower.includes('cek') || statusLower === 'komplain') {
        console.log('Skipping affiliate notification - jenis_layanan is "cek" or status is "komplain"');
        console.log('Jenis Layanan:', bookingData.jenis_layanan);
        console.log('Status:', bookingData.status);
        return false;
      }

      console.log('Found referral code:', bookingData.kode_referral);

      // Get partner data based on referral code
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('partner_id, nama_lengkap, nomor_whatsapp')
        .eq('partner_id', bookingData.kode_referral)
        .maybeSingle();

      if (partnerError || !partnerData) {
        console.log('Partner not found for referral code:', bookingData.kode_referral);
        return false;
      }

      console.log('Found partner:', partnerData.nama_lengkap);
      console.log('Partner phone:', partnerData.nomor_whatsapp);

      // Create affiliate notification message
      const message = `🎉 *SELAMAT! POIN AFFILIATE ANDA BERTAMBAH* 🎉

Halo *${partnerData.nama_lengkap}*,

Pelanggan yang Anda referensikan telah selesai kami kerjakan :

👤 Nama Pelanggan: ${customerName}
🔧 Layanan: ${bookingData.jenis_layanan}
📋 Kode Booking: ${bookingId}
🎯 Kode Referral: ${bookingData.kode_referral}

✅ Status: SELESAI DIKERJAKAN

🏆 ANDA MENDAPAT +1 POIN!

Terima kasih telah menjadi partner affiliate AFC. Poin Anda dapat ditukar dengan :
*1 poin senilai Rp 50.000 atau Cuci AC GRATIS (1 unit)*

📊 Cek total poin Anda di: https://aqshafreshncool.com/pages/affiliate_program.html, jika sudah melebihi 10 poin dapat ditukarkan dengan rupiah 

Referensikan terus teman dan keluarga anda yang lain untuk mendapat lebih banyak poin!

*Aqsha Fresh & Cool*
Partner Affiliate Program`;

      // Format partner phone number
      let partnerPhone = partnerData.nomor_whatsapp;
      if (partnerPhone.startsWith('0')) {
        partnerPhone = '62' + partnerPhone.substring(1);
      } else if (!partnerPhone.startsWith('62')) {
        partnerPhone = '62' + partnerPhone;
      }

      console.log('Sending WhatsApp to partner phone:', partnerPhone);
      console.log('Message content:', message);

      // Send WhatsApp to affiliate
      const response = await fetch('https://crm.woo-wa.com/send/message-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId: 'd_ID@6753a3309becd_BGhPsyGyyZujb',
          number: partnerPhone,
          message: message
        })
      });

      console.log('WhatsApp API response status:', response.status);
      console.log('WhatsApp API response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('WhatsApp API error response:', errorText);
      }

      const success = response.ok;
      console.log(`Affiliate notification to ${partnerPhone}: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      if (success) {
        console.log('Affiliate notification sent successfully to:', partnerData.nama_lengkap);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error sending affiliate notification:', error);
      return false;
    }
  };

  const sendWhatsAppNotification = async (reportData: any) => {
    try {
      let message = `*LAPORAN KERJA TEKNISI AFC*
Kode Booking : *${reportData.booking_id || 'Manual'}*

📅 Tanggal : *${reportData.tanggal_dikerjakan}*
👤 Nama Pelanggan : *Bpk/Ibu ${reportData.nama_pelanggan}*
📱 No HP : *${reportData.no_wa_pelanggan}*
📍 Alamat : *${reportData.alamat_pelanggan}*
👨‍🔧 Nama Teknisi : *${reportData.teknisi}*
📦 Total Unit : *${reportData.jumlah_unit || 1}* unit`;

      // Handle multiple units in single message
      if (reportData.units && Array.isArray(reportData.units)) {
        message += `\n\n🔧 DETAIL SEMUA UNIT:`;
        reportData.units.forEach((unit, index) => {
          message += `\n\n*UNIT ${index + 1}:*`;
          if (unit.jenis_pekerjaan) message += `\n📋 Layanan: *${unit.jenis_pekerjaan}*`;
          if (unit.no_unit) message += `\n• No Unit: *${unit.no_unit}*`;
          if (unit.merk) message += `\n• Merk: *${unit.merk}*`;
          if (unit.spek_unit) message += `\n• Spek: *${unit.spek_unit}*`;
          if (unit.keterangan && unit.keterangan.trim() !== "") {
            message += `\n📝 Catatan: *${unit.keterangan.trim()}*`;
          }
        });
      } else {
        // Single unit (backward compatibility)
        if (reportData.jenis_pekerjaan) message += `\n\n📋 DETAIL LAYANAN : *${reportData.jenis_pekerjaan}*`;
        
        if (reportData.no_unit || reportData.merk || reportData.spek_unit) {
          message += `\n\n🔧 DETAIL UNIT:`;
          if (reportData.no_unit) message += `\n• No Unit: *${reportData.no_unit}*`;
          if (reportData.merk) message += `\n• Merk: *${reportData.merk}*`;
          if (reportData.spek_unit) message += `\n• Spek: *${reportData.spek_unit}*`;
        }

        // Tambahkan catatan teknisi jika ada (gunakan field keterangan)
        if (reportData.keterangan && reportData.keterangan.trim() !== "") {
          message += `\n\n📝 CATATAN TEKNISI :\n*${reportData.keterangan.trim()}*`;
        } else if (reportData.catatan_teknisi && reportData.catatan_teknisi.trim() !== "") {
          message += `\n\n📝 CATATAN TEKNISI :\n*${reportData.catatan_teknisi.trim()}*`;
        }
      }

      message += `\n\nStatus: *✅ Selesai dikerjakan*

Terima kasih telah mempercayakan perawatan & perbaikan AC kepada kami.

*Aqsha Fresh & Cool*`;

      // Daftar penerima: customer + 2 nomor tambahan + referral (jika ada)
      const recipients = [];
      
      // Format nomor customer
      let customerPhone = reportData.no_wa_pelanggan;
      if (customerPhone.startsWith('0')) {
        customerPhone = '62' + customerPhone.substring(1);
      } else if (!customerPhone.startsWith('62')) {
        customerPhone = '62' + customerPhone;
      }
      recipients.push(customerPhone);
      
      // Tambahkan 3 nomor tambahan
      recipients.push('6285175392159');
      recipients.push('6285710758662');
      recipients.push('628991549549');
      
      // Cek dan tambahkan kontak referral jika ada booking_id
      if (reportData.booking_id) {
        try {
          // Get booking data to check for referral code
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('kode_referral')
            .eq('booking_id', reportData.booking_id)
            .maybeSingle();

          if (!bookingError && bookingData?.kode_referral) {
            console.log('Found referral code for work report:', bookingData.kode_referral);
            
            // Get partner data based on referral code
            const { data: partnerData, error: partnerError } = await supabase
              .from('partners')
              .select('nomor_whatsapp')
              .eq('partner_id', bookingData.kode_referral)
              .maybeSingle();

            if (!partnerError && partnerData?.nomor_whatsapp) {
              // Format partner phone number
              let partnerPhone = partnerData.nomor_whatsapp;
              if (partnerPhone.startsWith('0')) {
                partnerPhone = '62' + partnerPhone.substring(1);
              } else if (!partnerPhone.startsWith('62')) {
                partnerPhone = '62' + partnerPhone;
              }
              
              // Add to recipients list
              recipients.push(partnerPhone);
              console.log('Added referral contact to recipients:', partnerPhone);
            }
          }
        } catch (error) {
          console.log('Error checking referral for work report:', error);
        }
      }

      console.log('Sending WhatsApp to recipients:', recipients);

      // Kirim ke semua penerima (filter empty numbers)
      const validRecipients = recipients.filter(phone => phone && phone.trim() !== '');
      console.log('Valid recipients:', validRecipients);
      
      const sendPromises = validRecipients.map(async (phoneNumber) => {
        try {
          // Format phone number: handle +62 prefix properly
          let formattedPhone = phoneNumber;
          
          // Remove + sign first
          if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.substring(1);
          }
          
          // Remove all non-digits
          formattedPhone = formattedPhone.replace(/\D/g, '');
          
          // Format based on starting digits
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
          } else if (formattedPhone.startsWith('62')) {
            // Already in correct format
            formattedPhone = formattedPhone;
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
          
          const result = response.ok;
          console.log(`WhatsApp to ${formattedPhone}: ${result ? 'SUCCESS' : 'FAILED'}`);
          return result;
        } catch (error) {
          console.error(`Error sending to ${phoneNumber}:`, error);
          return false;
        }
      });

      // Tunggu semua pengiriman selesai
      const results = await Promise.all(sendPromises);
      
      // Hitung hasil
      const successCount = results.filter(r => r === true).length;
      const totalCount = results.length;
      
      console.log(`WhatsApp results: ${successCount}/${totalCount} successful`);
      
      if (successCount === totalCount) {
        console.log('All WhatsApp notifications sent successfully');
      } else if (successCount > 0) {
        console.log(`Partial WhatsApp success: ${successCount}/${totalCount}`);
      } else {
        console.log('All WhatsApp notifications failed');
      }
      
      return successCount > 0;
      
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      toast({
        title: "Error",
        description: "Error mengirim notifikasi WhatsApp",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) {
      console.log('Form submission already in progress, ignoring duplicate submit');
      return;
    }
    
    if (!formData.namaPelanggan || !formData.noWaPelanggan) {
      toast({
        title: "Error",
        description: "Nama pelanggan dan No WA wajib diisi",
        variant: "destructive",
      });
      return;
    }
    
    // Info jika jumlah unit berbeda dari booking (tidak block submit)
    if (formData.bookingUnitCount > 0 && formData.units.length !== formData.bookingUnitCount) {
      console.log(`INFO: Unit count berbeda - Booking: ${formData.bookingUnitCount}, Laporan: ${formData.units.length}`);
      // Tetap lanjut submit - tidak block
    }

    setLoading(true);
    
    try {
      console.log('Starting work report submission...');
      
      // Mobile-specific optimizations
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobile) {
        toast({
          title: "Memproses...",
          description: "Sedang menyimpan laporan kerja, mohon tunggu...",
        });
      }

      // Helper function to format date to ISO format for database
      const formatDateForDatabase = (dateString: string) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
      };

      // Helper function to format date to DD/MM/YYYY for display
      const formatDateToDDMMYYYY = (dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      // Upload photos first (if any) with mobile timeout handling
      let generalPhotoUrls: string[] = [];
      if (photos.length > 0) {
        try {
          console.log('Uploading general photos...');
          generalPhotoUrls = await Promise.race([
            uploadPhotos(photos),
            new Promise<string[]>((_, reject) => 
              setTimeout(() => reject(new Error('Photo upload timeout')), isMobile ? 30000 : 20000)
            )
          ]);
          console.log('General photos uploaded:', generalPhotoUrls.length);
        } catch (error) {
          console.warn('Photo upload failed, continuing without photos:', error);
          // Continue without photos rather than failing completely
        }
      }

      // Upload unit photos with mobile timeout handling
      const unitPhotoUrls: {[key: number]: string[]} = {};
      for (const [unitIndex, unitPhotoData] of Object.entries(unitPhotos)) {
        if (unitPhotoData.files.length > 0) {
          try {
            console.log(`Uploading photos for unit ${unitIndex}...`);
            const urls = await Promise.race([
              uploadPhotos(unitPhotoData.files),
              new Promise<string[]>((_, reject) => 
                setTimeout(() => reject(new Error('Unit photo upload timeout')), isMobile ? 30000 : 20000)
              )
            ]);
            unitPhotoUrls[parseInt(unitIndex)] = urls;
            console.log(`Unit ${unitIndex} photos uploaded:`, urls.length);
          } catch (error) {
            console.warn(`Unit ${unitIndex} photo upload failed, continuing without photos:`, error);
            // Continue without unit photos rather than failing completely
          }
        }
      }

      // Check if this is a komplain update (should UPDATE existing report, not INSERT new)
      const existingReportId = sessionStorage.getItem('existingReportId');
      const isComplainUpdate = sessionStorage.getItem('isComplainUpdate') === 'true';
      
      if (isComplainUpdate && existingReportId) {
        console.log('🔄 Updating existing work report for komplain:', existingReportId);
        
        // For komplain, we UPDATE the existing report instead of creating new ones
        const unit = formData.units[0]; // Use first unit data
        const unitPhotosForThisUnit = unitPhotoUrls[0] || [];
        const allPhotosForThisUnit = [...generalPhotoUrls, ...unitPhotosForThisUnit];
        
        // Prepare units array for storage
        const unitsArray = formData.units.map(u => ({
          noUnit: u.noUnit || null,
          merk: u.merk || null,
          merkLain: u.merkLain || null,
          spekUnit: u.spekUnit || null,
          keterangan: u.keterangan || null,
          internalNotes: u.internalNotes || null
        }));
        
        // Prepare work types array
        const workTypesArray = formData.workTypes.map(wt => ({
          jenisPekerjaan: wt.jenisPekerjaan || null
        }));
        
        const updateData = {
          nama_pelanggan: formData.namaPelanggan || 'Unknown Customer',
          no_wa_pelanggan: formData.noWaPelanggan || '0',
          jenis_pekerjaan: JSON.stringify(workTypesArray),
          units: JSON.stringify(unitsArray),
          teknisi: formData.teknisi || 'Unknown Technician',
          alamat_pelanggan: formData.alamatPelanggan || null,
          tanggal_dikerjakan: formatDateForDatabase(formData.tanggalDikerjakan) || new Date().toISOString().split('T')[0],
          foto_url: allPhotosForThisUnit.length > 0 ? JSON.stringify(allPhotosForThisUnit) : null,
          helper: formData.helper || null,
          status: 'pending_approval', // Reset to pending approval after komplain fix
          keterangan_komplain: null, // Clear komplain notes
          updated_at: new Date().toISOString()
        };
        
        const { error: updateError } = await supabase
          .from('work_reports')
          .update(updateData)
          .eq('id', existingReportId);
        
        if (updateError) {
          console.error('Error updating work report:', updateError);
          throw updateError;
        }
        
        console.log('✅ Work report updated successfully for komplain');
        
        // Clear session storage
        sessionStorage.removeItem('existingReportId');
        sessionStorage.removeItem('isComplainUpdate');
        
        // Create dummy results array for compatibility
        const results = [{ error: null, data: { success: true } }];
        
        // Continue to booking status update below...
      } else {
        // Normal flow - Create NEW work reports for each unit
        const reportPromises = formData.units.map(async (unit, index) => {
          const unitPhotosForThisUnit = unitPhotoUrls[index] || [];
          const allPhotosForThisUnit = [...generalPhotoUrls, ...unitPhotosForThisUnit];

          // Ensure all required fields are present and valid according to schema
          const reportData = {
            nama_pelanggan: formData.namaPelanggan || 'Unknown Customer',
            no_wa_pelanggan: formData.noWaPelanggan || '0',
            jenis_pekerjaan: formData.workTypes[index]?.jenisPekerjaan || formData.workTypes[0]?.jenisPekerjaan || 'Service',
            teknisi: formData.teknisi || 'Unknown Technician',
            booking_id: formData.bookingId || null,
            alamat_pelanggan: formData.alamatPelanggan || null,
            no_unit: unit.noUnit || null,
            merk: unit.merk || null,
            spek_unit: unit.spekUnit || null,
            tanggal_dikerjakan: formatDateForDatabase(formData.tanggalDikerjakan) || new Date().toISOString().split('T')[0],
            keterangan: unit.keterangan || null,
            internal_notes: unit.internalNotes || null,
            foto_url: allPhotosForThisUnit.length > 0 ? JSON.stringify(allPhotosForThisUnit) : null,
            helper: formData.helper || null,
            total_referrals: 0,
            status: 'pending_approval',
            approved_by: null,
            approved_at: null,
            approval_notes: null,
            rejection_reason: null
          };

          console.log(`Saving work report ${index + 1}:`, reportData);

          try {
            // Simple insert tanpa return data
            const { error } = await supabase
              .from('work_reports')
              .insert(reportData);

            if (error) {
              console.error(`Error saving work report ${index + 1}:`, error);
              return { error, data: null };
            }

            console.log(`Work report ${index + 1} saved successfully`);
            return { error: null, data: { success: true } };
          } catch (err) {
            console.error(`Exception saving work report ${index + 1}:`, err);
            return { error: err, data: null };
          }
        });
        
        var results = await Promise.race([
          Promise.all(reportPromises),
          new Promise<any[]>((_, reject) => 
            setTimeout(() => reject(new Error('Database save timeout')), isMobile ? 45000 : 30000)
          )
        ]);
      }
      
      // Check if any reports failed to save
      const hasErrors = results.some(result => result.error);
      
      if (hasErrors) {
        console.error('Error saving some work reports');
        results.forEach((result, index) => {
          if (result.error) {
            console.error(`Error saving report ${index + 1}:`, result.error);
          }
        });
        
        // Try to save to localStorage as fallback
        const existingReports = JSON.parse(localStorage.getItem('workReports') || '[]');
        
        formData.units.forEach((unit, index) => {
          const reportData = {
            id: `offline_${Date.now()}_${index}`,
            booking_id: formData.bookingId || null,
            nama_pelanggan: formData.namaPelanggan,
            alamat_pelanggan: formData.alamatPelanggan,
            no_wa_pelanggan: formData.noWaPelanggan,
            no_unit: unit.noUnit,
            merk: unit.merk,
            spek_unit: unit.spekUnit,
            tanggal_dikerjakan: formatDateForDatabase(formData.tanggalDikerjakan),
            jenis_pekerjaan: formData.workTypes[index]?.jenisPekerjaan || formData.workTypes[0]?.jenisPekerjaan,
            keterangan: unit.keterangan,
            internal_notes: unit.internalNotes,
            teknisi: formData.teknisi,
            helper: formData.helper,
            status: 'offline_pending',
            created_at: new Date().toISOString(),
            kode_referral: formData.kodeReferral || null
          };
          existingReports.push(reportData);
        });
        
        localStorage.setItem('workReports', JSON.stringify(existingReports));
        
        toast({
          title: "Peringatan",
          description: "Laporan disimpan offline. Akan dikirim otomatis saat koneksi stabil.",
          variant: "destructive",
        });
      } else {
        console.log('All work reports saved successfully');
        
        toast({
          title: "Berhasil",
          description: "Laporan kerja berhasil disimpan",
        });
      }

      // Update booking status if booking ID exists - ALWAYS update regardless of save errors
      if (formData.bookingId) {
        console.log('=== BOOKING STATUS UPDATE DEBUG ===');
        console.log('Booking ID to update:', formData.bookingId);
        console.log('Form data booking ID type:', typeof formData.bookingId);
        
        try {
          await updateBookingStatus(formData.bookingId);
          console.log('Booking status update completed');
        } catch (error) {
          console.error('Failed to update booking status:', error);
          // Don't fail the entire process for this
        }
      } else {
        console.log('No booking ID found, skipping status update');
      }

      // SKIP referral update at submit - will be handled at approval stage
      if (formData.bookingId && formData.kodeReferral) {
        console.log('=== REFERRAL TRACKING INFO ===');
        console.log('Booking ID:', formData.bookingId);
        console.log('Referral Code:', formData.kodeReferral);
        console.log('Status: Laporan submitted, referral akan di-update saat approved');
      }

      // All roles now go through approval workflow - no direct WhatsApp sending
      console.log('Work report saved, waiting for approval before sending WhatsApp');
      toast({
        title: "Laporan Dikirim",
        description: "Laporan kerja berhasil dikirim dan menunggu persetujuan admin/manager"
      });

      // Reset form
      setFormData({
        namaPelanggan: '',
        alamatPelanggan: '',
        noWaPelanggan: '',
        bookingUnitCount: 0,
        units: [{
          noUnit: '',
          merk: '',
          merkLain: '',
          spekUnit: '',
          keterangan: '',
          internalNotes: ''
        }],
        tanggalDikerjakan: (() => {
          const today = new Date();
          const day = String(today.getDate()).padStart(2, '0');
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const year = today.getFullYear();
          return `${year}-${month}-${day}`;
        })(),
        workTypes: [{
          jenisPekerjaan: ''
        }],
        teknisi: currentUser?.username || '',
        helper: '',
        bookingId: '',
        kodeReferral: ''
      });

      setPhotos([]);
      setPhotoPreviews([]);
      setUnitPhotos({});

      // Clear booking data from localStorage
      localStorage.removeItem('currentBookingForReport');

      // Send notification to system
      notificationService.notifyWorkReportSubmitted({
        customer: formData.namaPelanggan,
        bookingId: formData.bookingId || 'Manual',
        teknisi: formData.teknisi
      });

      console.log('Work report submission completed successfully');

    } catch (error: any) {
      console.error('Error submitting work report:', error);
      
      // More user-friendly error messages for mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      let errorMessage = "Terjadi kesalahan saat menyimpan laporan";
      
      if (error.message?.includes('timeout')) {
        errorMessage = isMobile 
          ? "Koneksi lambat. Laporan mungkin masih diproses, silakan cek kembali nanti."
          : "Timeout - koneksi terlalu lambat";
      } else if (error.message?.includes('network')) {
        errorMessage = "Masalah koneksi internet. Silakan coba lagi.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full bg-white">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Form Laporan Kerja</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 text-lg">Informasi Pelanggan</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Nama Pelanggan *</label>
              <input
                type="text"
                value={formData.namaPelanggan}
                onChange={(e) => handleInputChange('namaPelanggan', e.target.value)}
                placeholder="Masukkan nama pelanggan"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                required
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Alamat Pelanggan</label>
              <textarea
                value={formData.alamatPelanggan}
                onChange={(e) => handleInputChange('alamatPelanggan', e.target.value)}
                placeholder="Masukkan alamat pelanggan"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">No WA Pelanggan *</label>
              <input
                type="text"
                value={currentUser?.role === 'teknisi' ? formData.noWaPelanggan.replace(/./g, '\u2022') : formData.noWaPelanggan}
                onChange={(e) => handleInputChange('noWaPelanggan', e.target.value)}
                placeholder={currentUser?.role === 'teknisi' ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'Contoh: 628123456789'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  (isFromBooking && formData.noWaPelanggan) || currentUser?.role === 'teknisi' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
                readOnly={Boolean((isFromBooking && formData.noWaPelanggan) || currentUser?.role === 'teknisi')}
                style={currentUser?.role === 'teknisi' ? { 
                  backgroundColor: '#f3f4f6', 
                  color: '#6b7280',
                  filter: 'blur(2px)',
                  userSelect: 'none'
                } as React.CSSProperties : {}}
              />
              {currentUser?.role === 'teknisi' && (
                <p className="text-xs text-gray-500 mt-1">Nomor telepon disembunyikan untuk akun teknisi</p>
              )}
            </div>
          </div>

          {/* Unit Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">Informasi Unit</h3>
                {formData.bookingUnitCount > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    Booking memerlukan {formData.bookingUnitCount} unit (saat ini: {formData.units.length} unit)
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    units: [...prev.units, {
                      noUnit: '',
                      merk: '',
                      merkLain: '',
                      spekUnit: '',
                      keterangan: '',
                      internalNotes: ''
                    }],
                    workTypes: [...prev.workTypes, { jenisPekerjaan: '' }]
                  }));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus className="h-4 w-4" />
                Tambah Unit
              </button>
            </div>
            
            {formData.units.map((unit, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-700">Unit {index + 1}</h4>
                  {formData.units.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          units: prev.units.filter((_, i) => i !== index),
                          workTypes: prev.workTypes.filter((_, i) => i !== index)
                        }));
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      <Minus className="h-4 w-4" />
                      Hapus
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">No Unit</label>
                  <input
                    type="text"
                    value={unit.noUnit}
                    onChange={(e) => handleUnitChange(index, 'noUnit', e.target.value)}
                    placeholder="Masukkan nomor unit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Merk</label>
                  <select
                    value={unit.merk}
                    onChange={(e) => {
                      handleUnitChange(index, 'merk', e.target.value);
                      if (e.target.value !== 'MERK LAIN') {
                        handleUnitChange(index, 'merkLain', '');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Merk</option>
                    <option value="AQUA">AQUA</option>
                    <option value="AUX">AUX</option>
                    <option value="DAIKIN">DAIKIN</option>
                    <option value="GREE">GREE</option>
                    <option value="LG">LG</option>
                    <option value="MIDEA">MIDEA</option>
                    <option value="MITSUBISHI">MITSUBISHI</option>
                    <option value="PANASONIC">PANASONIC</option>
                    <option value="POLYTRON">POLYTRON</option>
                    <option value="SHARP">SHARP</option>
                    <option value="SAMSUNG">SAMSUNG</option>
                    <option value="TCL">TCL</option>
                    <option value="MERK LAIN">MERK LAIN</option>
                  </select>
                  
                  {unit.merk === 'MERK LAIN' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-2">Sebutkan Merk Lain</label>
                      <input
                        type="text"
                        value={unit.merkLain}
                        onChange={(e) => handleUnitChange(index, 'merkLain', e.target.value)}
                        placeholder="Ketik merk lainnya..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <input
                    type="text"
                    value={unit.spekUnit}
                    onChange={(e) => handleUnitChange(index, 'spekUnit', e.target.value)}
                    placeholder="Contoh: AR05TXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Unit-specific photo upload */}
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h5 className="font-medium text-blue-800 mb-3">Foto Unit {index + 1}</h5>
                  
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => openUnitCamera(index)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Camera size={16} />
                      Ambil Foto
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById(`unit-file-${index}`) as HTMLInputElement;
                        if (input) input.click();
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Upload size={16} />
                      Upload File
                    </button>
                    
                    {unitPhotos[index]?.files.length > 0 && (
                      <button
                        type="button"
                        onClick={() => removeAllUnitPhotos(index)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <X size={16} />
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  <input
                    id={`unit-camera-${index}`}
                    type="file"
                    accept="image/*"
                    capture
                    onChange={(e) => handleUnitPhotoCapture(index, e)}
                    className="hidden"
                  />
                  
                  <input
                    id={`unit-file-${index}`}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleUnitFileUpload(index, e)}
                    className="hidden"
                  />

                  {unitPhotos[index]?.files.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-blue-600 mb-2">
                        {unitPhotos[index].files.length} foto dipilih untuk unit {index + 1}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {unitPhotos[index].previews.map((preview, photoIndex) => (
                          <div key={photoIndex} className="relative">
                            <img
                              src={preview}
                              alt={`Unit ${index + 1} Preview ${photoIndex + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-blue-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeUnitPhoto(index, photoIndex)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 text-lg">Informasi Pekerjaan</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tanggal Dikerjakan</label>
              <input
                type="date"
                value={formData.tanggalDikerjakan}
                onChange={(e) => handleInputChange('tanggalDikerjakan', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Jenis Pekerjaan</h4>
              {formData.workTypes.map((workType, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium">Jenis Pekerjaan {index + 1}</label>
                    {formData.workTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUnit(index)}
                        className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        <Minus size={14} />
                        Hapus
                      </button>
                    )}
                  </div>
                  <select
                    value={workType.jenisPekerjaan}
                    onChange={(e) => handleWorkTypeChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih jenis pekerjaan</option>
                    <option value="bongkar_pasang">Bongkar Pasang</option>
                    <option value="bongkar">Bongkar</option>
                    <option value="cuci">Cuci</option>
                    <option value="isi_freon">Isi Freon</option>
                    <option value="cek unit">Cek Unit</option>
                    <option value="perbaikan_mayor">Perbaikan Mayor</option>
                    <option value="perbaikan_minor">Perbaikan Minor</option>
                    <option value="pasang_baru">Pasang Baru</option>
                  </select>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Keterangan Unit {index + 1} (Kondisi Unit)</label>
                    <textarea
                      value={formData.units[index]?.keterangan || ''}
                      onChange={(e) => handleUnitChange(index, 'keterangan', e.target.value)}
                      placeholder="Masukkan keterangan kondisi unit atau catatan tambahan"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Catatan Internal Unit {index + 1}</label>
                    <textarea
                      value={formData.units[index]?.internalNotes || ''}
                      onChange={(e) => handleUnitChange(index, 'internalNotes', e.target.value)}
                      placeholder="Catatan internal untuk teknisi atau management (tidak terlihat di laporan customer)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-yellow-50"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Teknisi yang Mengerjakan</label>
              <input
                type="text"
                value={formData.teknisi}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Helper *</label>
              <HelperSelect 
                value={formData.helper}
                onChange={(value) => handleInputChange('helper', value)}
              />
            </div>


            <div>
              <label className="block text-sm font-medium mb-2">Kode Booking</label>
              <input
                type="text"
                value={formData.bookingId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                readOnly
              />
            </div>

            {/* Display Referral Code if exists */}
            {formData.kodeReferral && (
              <div>
                <label className="block text-sm font-medium mb-2">Kode Referral</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎯</span>
                    <div>
                      <p className="font-bold text-blue-800 text-lg">{formData.kodeReferral}</p>
                      <p className="text-sm text-blue-600">Booking dengan kode referral affiliate</p>
                      <p className="text-xs text-blue-500 mt-1">Partner akan mendapat notifikasi +1 poin setelah pekerjaan selesai</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Kirim Laporan Kerja'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WorkReportForm;

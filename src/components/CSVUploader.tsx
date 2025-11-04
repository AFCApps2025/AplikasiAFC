import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Download, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

interface CSVRow {
  timestamp: string;
  nama: string;
  no_hp: string;
  cluster: string;
  alamat: string;
  jenis_layanan: string;
  waktu_kunjungan: string;
  jumlah_unit: string;
  tanggal_kunjungan: string;
  status: string;
  tanggal_selesai: string;
  booking_id: string;
  teknisi: string;
  catatan: string;
  foto: string;
  catatan_reschedule: string;
  kode_teknisi: string;
  catatan_internal: string;
}

interface UpdateCSVRow {
  id: string;
  booking_id?: string;
  tanggal_selesai?: string;
  no_hp?: string;
}

const DataExporter = () => {
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    filename: string;
    count: number;
  } | null>(null);
  const { toast } = useToast();

  // Check if user is admin or manager
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const canExport = currentUser.role === 'admin' || currentUser.role === 'manager';

  if (!canExport) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Akses ditolak. Hanya admin dan manager yang dapat mengekspor data.</p>
        </CardContent>
      </Card>
    );
  }

  const handleExportBookings = async () => {
    setExporting(true);
    setExportResult(null);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "Tidak ada data booking untuk diekspor",
          variant: "destructive",
        });
        return;
      }

      // Convert to CSV
      const csv = Papa.unparse(data);
      
      // Create download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const filename = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportResult({
        success: true,
        filename,
        count: data.length
      });

      toast({
        title: "Export Berhasil",
        description: `${data.length} records berhasil diekspor ke ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Gagal",
        description: "Terjadi kesalahan saat mengekspor data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-green-200 rounded-lg p-8 text-center bg-gradient-to-br from-green-50 to-white">
          <FileText className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <p className="text-sm text-gray-700 mb-4">
            Ekspor semua data booking dari database Supabase ke file CSV
          </p>
          <p className="text-xs text-gray-500 mb-6">
            File akan berisi semua kolom: ID, Nama, No HP, Alamat, Jenis Layanan, Tanggal, Status, dll.
          </p>
          <Button
            onClick={handleExportBookings}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Mengekspor...' : 'Export Data Booking'}
          </Button>
        </div>

        {exportResult && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Export Berhasil</span>
              </div>
              <div className="space-y-1 text-sm text-green-700">
                <p>File: {exportResult.filename}</p>
                <p>Total records: {exportResult.count}</p>
                <p>Status: Download otomatis dimulai</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default DataExporter;

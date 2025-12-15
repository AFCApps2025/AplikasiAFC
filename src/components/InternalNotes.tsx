import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Search, RefreshCw, Calendar, User, Phone } from 'lucide-react';

interface InternalNote {
  id: string;
  booking_id: string;
  nama_pelanggan: string;
  no_wa_pelanggan: string;
  tanggal_dikerjakan: string;
  teknisi: string;
  internal_notes: string;
  jenis_pekerjaan: string;
  created_at: string;
}

const InternalNotes = () => {
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInternalNotes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('work_reports')
        .select('id, booking_id, nama_pelanggan, no_wa_pelanggan, tanggal_dikerjakan, teknisi, internal_notes, jenis_pekerjaan, created_at')
        .not('internal_notes', 'is', null)
        .neq('internal_notes', '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotes(data || []);
      setFilteredNotes(data || []);
    } catch (error) {
      console.error('Error fetching internal notes:', error);
      alert('Error loading internal notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternalNotes();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = notes.filter(note => 
      note.nama_pelanggan?.toLowerCase().includes(query) ||
      note.booking_id?.toLowerCase().includes(query) ||
      note.teknisi?.toLowerCase().includes(query) ||
      note.internal_notes?.toLowerCase().includes(query)
    );
    setFilteredNotes(filtered);
  }, [searchQuery, notes]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading catatan internal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">Catatan Internal ({filteredNotes.length})</h1>
          </div>
          <button
            onClick={fetchInternalNotes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search Box */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama customer, booking ID, teknisi, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-600 to-orange-500 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Booking ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">No. WA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Teknisi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Jenis Pekerjaan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Catatan Internal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm">
                        {searchQuery ? 'Tidak ada catatan yang sesuai dengan pencarian' : 'Tidak ada catatan internal'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono text-blue-600">{note.booking_id || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {note.nama_pelanggan}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {note.no_wa_pelanggan}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(note.tanggal_dikerjakan)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1 text-green-600">
                          <User className="h-3 w-3" />
                          {note.teknisi}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {note.jenis_pekerjaan}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="max-w-xs">
                          <p className="text-gray-900 whitespace-pre-wrap break-words bg-orange-50 p-2 rounded border-l-4 border-orange-500">
                            {note.internal_notes}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {filteredNotes.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Menampilkan {filteredNotes.length} dari {notes.length} catatan internal
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalNotes;

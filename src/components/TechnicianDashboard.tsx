import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Wrench, TrendingUp, Users } from 'lucide-react';

interface WorkReport {
  id: string;
  teknisi: string;
  helper?: string | null;
  tanggal_dikerjakan: string;
  status: string;
  nama_pelanggan: string;
  jenis_pekerjaan: string;
  no_unit: string;
  [key: string]: any;
}

interface JobTypeStats {
  jobType: string;
  totalUnits: number;
  monthlyCount: number;
  yearlyCount: number;
}

interface TechnicianJobStats {
  name: string;
  role: string;
  cuci: number;
  cekUnit: number;
  perbaikanMinor: number;
  perbaikanMayor: number;
  bongkar: number;
  pasangBaru: number;
  bongkarPasang: number;
  isiFreon: number;
  totalJobs: number;
}

const TechnicianDashboard = () => {
  const [workReports, setWorkReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobTypeStats, setJobTypeStats] = useState<JobTypeStats[]>([]);
  const [technicianStats, setTechnicianStats] = useState<TechnicianJobStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return now.getFullYear().toString();
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTechCodes, setActiveTechCodes] = useState<string[]>([]);

  useEffect(() => {
    // Get current user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    console.log('=== LOADING CURRENT USER ===');
    console.log('Raw localStorage currentUser:', savedUser);
    if (savedUser) {
      const user = JSON.parse(savedUser);
      console.log('Parsed user:', user);
      console.log('User role:', user.role);
      console.log('User username:', user.username);
      console.log('User name:', user.name);
      setCurrentUser(user);
    } else {
      console.log('WARNING: No currentUser in localStorage');
    }
    
    // Load active technician codes from database
    loadActiveTechCodes();
  }, []);

  const loadActiveTechCodes = async () => {
    try {
      // Get active technician codes
      const { data: techData, error: techError } = await (supabase as any)
        .from('technician_codes')
        .select('code')
        .eq('active', true);
      
      if (techError) throw techError;
      
      const codes = techData?.map(item => item.code) || [];
      console.log('Active technician codes:', codes);
      setActiveTechCodes(codes);
    } catch (error) {
      console.error('Error loading active technician codes:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchWorkReports();
    }
  }, [selectedMonth, selectedYear, currentUser]);

  const fetchWorkReports = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get date range for selected year (for yearly stats)
      const year = selectedYear;
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;
      
      // Build query based on user role
      let query = supabase
        .from('work_reports')
        .select('*')
        .eq('status', 'approved')
        .gte('tanggal_dikerjakan', startOfYear)
        .lte('tanggal_dikerjakan', endOfYear); // Filter by selected year

      // Role-based filtering
      const role = currentUser.role;
      const username = currentUser.username;

      if (role === 'teknisi') {
        // Map teknisi username to kode teknisi
        const technicianMap: { [key: string]: string } = {
          'teknisi1': 'A1',
          'teknisi2': 'A2',
          'teknisi3': 'A3'
        };
        const techCode = technicianMap[username];
        
        console.log('=== TEKNISI DASHBOARD DEBUG ===');
        console.log('Username:', username);
        console.log('Tech Code:', techCode);
        
        // Filter by tech CODE (A1, A2, A3) instead of name
        if (techCode) {
          query = query.eq('teknisi', techCode);
          console.log('Filtering by teknisi code:', techCode);
        } else {
          console.log('WARNING: No tech code found for username:', username);
        }
      } else if (role === 'helper') {
        // Helper can only see their own work
        // Try both name and username for helper matching
        const helperName = currentUser.name?.toUpperCase();
        const helperUsername = currentUser.username?.toUpperCase();
        
        console.log('=== HELPER DASHBOARD DEBUG ===');
        console.log('Helper name from currentUser:', helperName);
        console.log('Helper username from currentUser:', helperUsername);
        console.log('Current user object:', currentUser);
        
        // Try to match by name first, then username
        if (helperName) {
          query = query.or(`helper.eq.${helperName},helper.ilike.${helperName}`);
          console.log('Filtering by helper name (case-insensitive):', helperName);
        } else if (helperUsername) {
          query = query.or(`helper.eq.${helperUsername},helper.ilike.${helperUsername}`);
          console.log('Filtering by helper username (case-insensitive):', helperUsername);
        } else {
          console.log('WARNING: No helper name or username found');
        }
      }
      // Admin and manager can see all data (no filter)

      const { data, error } = await query.order('tanggal_dikerjakan', { ascending: false });
      
      console.log('Query result - data count:', data?.length || 0);
      console.log('Query result - error:', error);
      if (data && data.length > 0) {
        console.log('Sample data:', data[0]);
      }
      
      // For helper role, also check what helpers exist in database
      if (role === 'helper' && (!data || data.length === 0)) {
        console.log('=== CHECKING ALL HELPERS IN DATABASE ===');
        const { data: allReports } = await (supabase as any)
          .from('work_reports')
          .select('helper')
          .eq('status', 'approved')
          .not('helper', 'is', null)
          .limit(20);
        
        const uniqueHelpers = [...new Set(allReports?.map(r => r.helper))];
        console.log('Unique helpers in database:', uniqueHelpers);
        console.log('Looking for helper:', currentUser.name?.toUpperCase());
      }

      if (error) throw error;

      setWorkReports(data || []);
      calculateStats(data || []);
      calculateTechnicianStats(data || []);
    } catch (error) {
      console.error('Error fetching work reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reports: WorkReport[]) => {
    const statsMap = new Map<string, JobTypeStats>();
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth.split('-')[1]);

    reports.forEach(report => {
      const jobType = report.jenis_pekerjaan || 'Tidak Diketahui';
      const reportDate = new Date(report.tanggal_dikerjakan);
      const reportYear = reportDate.getFullYear();
      const reportMonth = reportDate.getMonth() + 1;

      if (!statsMap.has(jobType)) {
        statsMap.set(jobType, {
          jobType: jobType,
          totalUnits: 0,
          monthlyCount: 0,
          yearlyCount: 0
        });
      }

      const stats = statsMap.get(jobType)!;
      
      // Count units (parse no_unit as number, default to 1)
      const unitCount = parseInt(report.no_unit) || 1;
      stats.totalUnits += unitCount;

      // Count for selected month
      if (reportYear === year && reportMonth === month) {
        stats.monthlyCount++;
      }

      // Count for selected year
      if (reportYear === year) {
        stats.yearlyCount++;
      }
    });

    setJobTypeStats(Array.from(statsMap.values()).sort((a, b) => b.totalUnits - a.totalUnits));
  };

  const calculateTechnicianStats = (reports: WorkReport[]) => {
    const statsMap = new Map<string, TechnicianJobStats>();
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth.split('-')[1]);
    
    // Get current user info for filtering
    const role = currentUser?.role;
    const username = currentUser?.username;

    reports.forEach(report => {
      const reportDate = new Date(report.tanggal_dikerjakan);
      const reportYear = reportDate.getFullYear();
      const reportMonth = reportDate.getMonth() + 1;
      
      // Only count reports from selected month and year
      const isInSelectedMonth = (reportYear === year && reportMonth === month);
      
      // Process technicians
      if (report.teknisi) {
        // Skip if technician code is not active (for admin/manager view)
        if ((role === 'admin' || role === 'manager') && !activeTechCodes.includes(report.teknisi)) {
          return;
        }
        
        // For teknisi role, only show their own stats
        if (role === 'teknisi') {
          const technicianMap: { [key: string]: string } = {
            'teknisi1': 'A1',
            'teknisi2': 'A2',
            'teknisi3': 'A3'
          };
          const techCode = technicianMap[username || ''];
          
          // Skip if this report is not for current teknisi (compare by code)
          if (report.teknisi !== techCode) {
            return;
          }
        }
        
        if (!statsMap.has(report.teknisi)) {
          statsMap.set(report.teknisi, {
            name: report.teknisi,
            role: 'Teknisi',
            cuci: 0,
            cekUnit: 0,
            perbaikanMinor: 0,
            perbaikanMayor: 0,
            bongkar: 0,
            pasangBaru: 0,
            bongkarPasang: 0,
            isiFreon: 0,
            totalJobs: 0
          });
        }

        // Only count if in selected month
        if (isInSelectedMonth) {
          const stats = statsMap.get(report.teknisi)!;
          stats.totalJobs++;

          // Count by job type
          const jobType = report.jenis_pekerjaan?.toLowerCase();
          if (jobType === 'cuci') stats.cuci++;
          else if (jobType === 'cek unit') stats.cekUnit++;
          else if (jobType === 'perbaikan_minor' || jobType === 'perbaikan minor') stats.perbaikanMinor++;
          else if (jobType === 'perbaikan_mayor' || jobType === 'perbaikan mayor') stats.perbaikanMayor++;
          else if (jobType === 'bongkar') stats.bongkar++;
          else if (jobType === 'pasang_baru' || jobType === 'pasang baru') stats.pasangBaru++;
          else if (jobType === 'bongkar_pasang' || jobType === 'bongkar pasang') stats.bongkarPasang++;
          else if (jobType === 'isi_freon' || jobType === 'isi freon') stats.isiFreon++;
        }
      }

      // Process helpers
      if (report.helper) {
        // Skip if helper is not in active accounts list (for admin/manager view)
        // We need to check if helper name exists in system_accounts with active status
        // For now, we'll filter out helpers with totalJobs = 0 at the end
        
        // For helper role, only show their own stats
        if (role === 'helper') {
          const helperName = currentUser?.name?.toUpperCase();
          // Skip if this report is not for current helper
          if (report.helper !== helperName) {
            return;
          }
        }
        
        if (!statsMap.has(report.helper)) {
          statsMap.set(report.helper, {
            name: report.helper,
            role: 'Helper',
            cuci: 0,
            cekUnit: 0,
            perbaikanMinor: 0,
            perbaikanMayor: 0,
            bongkar: 0,
            pasangBaru: 0,
            bongkarPasang: 0,
            isiFreon: 0,
            totalJobs: 0
          });
        }

        // Only count if in selected month
        if (isInSelectedMonth) {
          const stats = statsMap.get(report.helper)!;
          stats.totalJobs++;

          // Count by job type
          const jobType = report.jenis_pekerjaan?.toLowerCase();
          if (jobType === 'cuci') stats.cuci++;
          else if (jobType === 'cek unit') stats.cekUnit++;
          else if (jobType === 'perbaikan_minor' || jobType === 'perbaikan minor') stats.perbaikanMinor++;
          else if (jobType === 'perbaikan_mayor' || jobType === 'perbaikan mayor') stats.perbaikanMayor++;
          else if (jobType === 'bongkar') stats.bongkar++;
          else if (jobType === 'pasang_baru' || jobType === 'pasang baru') stats.pasangBaru++;
          else if (jobType === 'bongkar_pasang' || jobType === 'bongkar pasang') stats.bongkarPasang++;
          else if (jobType === 'isi_freon' || jobType === 'isi freon') stats.isiFreon++;
        }
      }
    });

    setTechnicianStats(Array.from(statsMap.values()).sort((a, b) => b.totalJobs - a.totalJobs));
  };

  const getTotalUnitsAllTime = () => {
    return jobTypeStats.reduce((sum, stat) => sum + stat.totalUnits, 0);
  };

  const getTotalMonthly = () => {
    return jobTypeStats.reduce((sum, stat) => sum + stat.monthlyCount, 0);
  };

  const getTotalYearly = () => {
    return jobTypeStats.reduce((sum, stat) => sum + stat.yearlyCount, 0);
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i.toString());
    }
    return years;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Wrench className="h-6 w-6 text-green-600" />
              Dashboard Statistik Pekerjaan
            </h1>
            <p className="text-gray-600 mt-1">
              {currentUser?.role === 'teknisi' && `Teknisi: ${currentUser?.name || currentUser?.username}`}
              {currentUser?.role === 'helper' && `Helper: ${currentUser?.name || currentUser?.username}`}
              {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && 'Semua Teknisi & Helper'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {getYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Total Unit (All Time)</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{getTotalUnitsAllTime()}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Pekerjaan Bulan Ini</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{getTotalMonthly()}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(selectedMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Pekerjaan Tahun {selectedYear}</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">{getTotalYearly()}</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Technician/Helper Breakdown Stats - Hidden for helper role */}
      {technicianStats.length > 0 && currentUser?.role !== 'helper' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Statistik Per Teknisi & Helper
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuci
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cek Unit
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Minor
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mayor
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bongkar
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pasang
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {technicianStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          stat.role === 'Teknisi' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          <span className={`font-semibold text-sm ${
                            stat.role === 'Teknisi' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {stat.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{stat.name}</div>
                          <div className="text-xs text-gray-500">{stat.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{stat.cuci}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{stat.cekUnit}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{stat.perbaikanMinor}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{stat.perbaikanMayor}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{stat.bongkar}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{stat.pasangBaru}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {stat.totalJobs}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Job Type Stats Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Statistik Per Jenis Pekerjaan</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jenis Pekerjaan
                </th>
                {currentUser?.role !== 'helper' && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Unit
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bulan Ini
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tahun {selectedYear}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobTypeStats.map((stat, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{stat.jobType}</div>
                      </div>
                    </div>
                  </td>
                  {currentUser?.role !== 'helper' && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-semibold text-blue-600">{stat.totalUnits}</span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {stat.monthlyCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                      {stat.yearlyCount}
                    </span>
                  </td>
                </tr>
              ))}
              
              {jobTypeStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default TechnicianDashboard;
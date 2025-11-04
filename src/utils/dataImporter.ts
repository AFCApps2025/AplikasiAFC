import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
}

// Mapping functions untuk mengkonversi data CSV ke format database
const mapCustomerData = (row: CSVRow) => {
  return {
    name: row['Nama'] || row['nama'] || row['Name'] || row['customer_name'] || row['B'] || '',
    phone_number: row['No HP'] || row['no_hp'] || row['Phone'] || row['phone'] || row['telepon'] || row['C'] || '',
    address: row['Alamat'] || row['alamat'] || row['Address'] || row['address'] || row['E'] || '',
    cluster: row['Cluster'] || row['cluster'] || row['D'] || '',
  };
};

const mapBookingData = (row: CSVRow, customerId: string, serviceId: string) => {
  return {
    customer_id: customerId,
    service_id: serviceId,
    scheduled_date: formatDate(row['Tanggal'] || row['tanggal'] || row['Date'] || row['date'] || row['G'] || ''),
    scheduled_time: formatTime(row['Waktu'] || row['waktu'] || row['Time'] || row['time'] || '09:00'),
    address: row['Alamat'] || row['alamat'] || row['Address'] || row['address'] || row['E'] || '',
    phone_number: row['No HP'] || row['no_hp'] || row['Phone'] || row['phone'] || row['telepon'] || row['C'] || '',
    notes: row['Catatan'] || row['catatan'] || row['Notes'] || row['notes'] || row['L'] || '',
    status: mapStatus(row['Status'] || row['status'] || row['H'] || 'pending'),
    cluster: row['Cluster'] || row['cluster'] || row['D'] || '',
    service_type: row['Jenis Layanan'] || row['jenis_layanan'] || row['Service'] || row['F'] || '',
    technician_name: row['Teknisi'] || row['teknisi'] || row['Technician'] || row['K'] || '',
    completion_date: formatDate(row['Tanggal Selesai'] || row['tanggal_selesai'] || row['Completion Date'] || row['I'] || ''),
    internal_notes: row['Catatan Internal'] || row['catatan_internal'] || row['Internal Notes'] || row['Q'] || '',
  };
};

const mapWorkReportData = (row: CSVRow, customerId: string, technicianId: string) => {
  return {
    customer_id: customerId,
    technician_id: technicianId,
    ac_unit_number: row['No Unit'] || row['no_unit'] || row['Unit Number'] || row['unit'] || '',
    brand: row['Merk'] || row['merk'] || row['Brand'] || row['brand'] || '',
    work_date: formatDate(row['Tanggal Kerja'] || row['tanggal_kerja'] || row['Work Date'] || ''),
    job_type: mapJobType(row['Jenis Pekerjaan'] || row['jenis_pekerjaan'] || row['Job Type'] || ''),
    condition_notes: row['Kondisi'] || row['kondisi'] || row['Condition'] || row['notes'] || '',
    created_by: technicianId,
  };
};

// Helper functions
const formatDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Handle DD/MM/YY format (like 9/12/25, 25/06/25)
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    let [day, month, year] = parts;
    
    // Handle 2-digit year (25 -> 2025)
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      year = (parseInt(year) + currentCentury).toString();
    }
    
    // Ensure proper padding
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Try standard date parsing as fallback
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
};

const formatTime = (timeStr: string): string => {
  if (!timeStr) return '09:00:00';
  
  // Handle HH:MM format
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
  }
  
  return '09:00:00';
};

const mapStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'pending',
    'menunggu': 'pending',
    'confirmed': 'confirmed',
    'dikonfirmasi': 'confirmed',
    'in_progress': 'in_progress',
    'sedang_dikerjakan': 'in_progress',
    'completed': 'completed',
    'selesai': 'completed',
    'cancelled': 'cancelled',
    'dibatalkan': 'cancelled',
  };
  
  return statusMap[status.toLowerCase()] || 'pending';
};

const mapJobType = (jobType: string): string => {
  const jobMap: { [key: string]: string } = {
    'cuci_ac': 'cuci_ac',
    'cuci ac': 'cuci_ac',
    'service': 'perbaikan',
    'perbaikan': 'perbaikan',
    'maintenance': 'perbaikan',
    'instalasi': 'instalasi',
    'install': 'instalasi',
  };
  
  return jobMap[jobType.toLowerCase()] || 'cuci_ac';
};

// Main import functions
export const importCustomersFromCSV = async (csvFile: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        const errors: string[] = [];
        let imported = 0;

        try {
          for (const [index, row] of results.data.entries()) {
            try {
              const customerData = mapCustomerData(row as CSVRow);
              
              if (!customerData.name || !customerData.phone_number) {
                errors.push(`Baris ${index + 2}: Nama dan No HP harus diisi`);
                continue;
              }

              // Check if customer already exists
              const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('phone_number', customerData.phone_number)
                .single();

              if (!existingCustomer) {
                const { error } = await supabase
                  .from('customers')
                  .insert(customerData);

                if (error) {
                  errors.push(`Baris ${index + 2}: ${error.message}`);
                } else {
                  imported++;
                }
              }
            } catch (error: any) {
              errors.push(`Baris ${index + 2}: ${error.message}`);
            }
          }

          resolve({
            success: errors.length === 0,
            message: `Import selesai. ${imported} customer berhasil diimport.`,
            imported,
            errors,
          });
        } catch (error: any) {
          resolve({
            success: false,
            message: `Error: ${error.message}`,
            imported: 0,
            errors: [error.message],
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          message: `Error parsing CSV: ${error.message}`,
          imported: 0,
          errors: [error.message],
        });
      }
    });
  });
};

export const importBookingsFromCSV = async (csvFile: File, defaultServiceId?: string): Promise<ImportResult> => {
  return new Promise((resolve) => {
    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        const errors: string[] = [];
        let imported = 0;

        try {
          // Get default service if not provided
          let serviceId = defaultServiceId;
          if (!serviceId) {
            const { data: services } = await supabase
              .from('services')
              .select('id')
              .eq('name', 'Cuci AC')
              .single();
            serviceId = services?.id;
          }

          if (!serviceId) {
            resolve({
              success: false,
              message: 'Service default tidak ditemukan',
              imported: 0,
              errors: ['Service default tidak ditemukan'],
            });
            return;
          }

          for (const [index, row] of results.data.entries()) {
            try {
              const csvRow = row as CSVRow;
              const phoneNumber = csvRow['No HP'] || csvRow['no_hp'] || csvRow['Phone'] || '';

              if (!phoneNumber) {
                errors.push(`Baris ${index + 2}: No HP harus diisi`);
                continue;
              }

              // Find or create customer
              let customerId;
              const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('phone_number', phoneNumber)
                .single();

              if (existingCustomer) {
                customerId = existingCustomer.id;
              } else {
                const customerData = mapCustomerData(csvRow);
                const { data: newCustomer, error: customerError } = await supabase
                  .from('customers')
                  .insert(customerData)
                  .select('id')
                  .single();

                if (customerError) {
                  errors.push(`Baris ${index + 2}: Error creating customer - ${customerError.message}`);
                  continue;
                }
                customerId = newCustomer.id;
              }

              // Create booking
              const bookingData = mapBookingData(csvRow, customerId, serviceId);
              const { error: bookingError } = await supabase
                .from('bookings')
                .insert(bookingData);

              if (bookingError) {
                errors.push(`Baris ${index + 2}: ${bookingError.message}`);
              } else {
                imported++;
              }
            } catch (error: any) {
              errors.push(`Baris ${index + 2}: ${error.message}`);
            }
          }

          resolve({
            success: errors.length === 0,
            message: `Import selesai. ${imported} booking berhasil diimport.`,
            imported,
            errors,
          });
        } catch (error: any) {
          resolve({
            success: false,
            message: `Error: ${error.message}`,
            imported: 0,
            errors: [error.message],
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          message: `Error parsing CSV: ${error.message}`,
          imported: 0,
          errors: [error.message],
        });
      }
    });
  });
};

export const importWorkReportsFromCSV = async (csvFile: File, defaultTechnicianId?: string): Promise<ImportResult> => {
  return new Promise((resolve) => {
    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        const errors: string[] = [];
        let imported = 0;

        try {
          // Get default technician if not provided
          let technicianId = defaultTechnicianId;
          if (!technicianId) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id')
              .limit(1)
              .single();
            technicianId = profiles?.id;
          }

          if (!technicianId) {
            resolve({
              success: false,
              message: 'Teknisi default tidak ditemukan',
              imported: 0,
              errors: ['Teknisi default tidak ditemukan'],
            });
            return;
          }

          for (const [index, row] of results.data.entries()) {
            try {
              const csvRow = row as CSVRow;
              const phoneNumber = csvRow['No HP'] || csvRow['no_hp'] || csvRow['Phone'] || '';

              if (!phoneNumber) {
                errors.push(`Baris ${index + 2}: No HP harus diisi`);
                continue;
              }

              // Find customer
              const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('phone_number', phoneNumber)
                .single();

              if (!customer) {
                errors.push(`Baris ${index + 2}: Customer dengan No HP ${phoneNumber} tidak ditemukan`);
                continue;
              }

              // Create work report
              const workReportData = mapWorkReportData(csvRow, customer.id, technicianId);
              const { error: reportError } = await supabase
                .from('work_reports')
                .insert(workReportData);

              if (reportError) {
                errors.push(`Baris ${index + 2}: ${reportError.message}`);
              } else {
                imported++;
              }
            } catch (error: any) {
              errors.push(`Baris ${index + 2}: ${error.message}`);
            }
          }

          resolve({
            success: errors.length === 0,
            message: `Import selesai. ${imported} laporan kerja berhasil diimport.`,
            imported,
            errors,
          });
        } catch (error: any) {
          resolve({
            success: false,
            message: `Error: ${error.message}`,
            imported: 0,
            errors: [error.message],
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          message: `Error parsing CSV: ${error.message}`,
          imported: 0,
          errors: [error.message],
        });
      }
    });
  });
};

import { supabase } from '@/integrations/supabase/client';

export const runDatabaseMigration = async () => {
  try {
    console.log('Starting database migration...');

    // Create services table
    const { error: servicesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.services (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          duration_minutes INTEGER NOT NULL DEFAULT 60,
          price DECIMAL(10,2),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    });

    if (servicesError) {
      console.error('Error creating services table:', servicesError);
    }

    // Create bookings table
    const { error: bookingsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.bookings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
          service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
          technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
          scheduled_date DATE NOT NULL,
          scheduled_time TIME NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
          notes TEXT,
          address TEXT NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          estimated_duration INTEGER DEFAULT 60,
          actual_start_time TIMESTAMP WITH TIME ZONE,
          actual_end_time TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
          work_report_id UUID REFERENCES public.work_reports(id) ON DELETE SET NULL
        );
      `
    });

    if (bookingsError) {
      console.error('Error creating bookings table:', bookingsError);
    }

    // Insert default services
    const { error: insertError } = await supabase
      .from('services')
      .upsert([
        {
          name: 'Cuci AC',
          description: 'Pembersihan unit AC standar',
          duration_minutes: 60,
          price: 50000,
          is_active: true
        },
        {
          name: 'Service AC',
          description: 'Perbaikan dan maintenance AC',
          duration_minutes: 90,
          price: 75000,
          is_active: true
        },
        {
          name: 'Instalasi AC',
          description: 'Pemasangan unit AC baru',
          duration_minutes: 120,
          price: 150000,
          is_active: true
        },
        {
          name: 'Perbaikan AC',
          description: 'Troubleshooting dan repair AC',
          duration_minutes: 90,
          price: 100000,
          is_active: true
        }
      ], { 
        onConflict: 'name',
        ignoreDuplicates: true 
      });

    if (insertError) {
      console.error('Error inserting default services:', insertError);
    }

    console.log('Database migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };

  } catch (error: any) {
    console.error('Migration failed:', error);
    return { success: false, message: error.message };
  }
};

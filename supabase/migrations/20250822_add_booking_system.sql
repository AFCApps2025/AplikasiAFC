-- Migration: Add booking system tables
-- Created: 2025-08-22

-- Create services table
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

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    cluster VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create bookings table based on spreadsheet structure (columns A-R)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE, -- A: Timestamp
    nama VARCHAR(100), -- B: Nama
    no_hp VARCHAR(20), -- C: No HP
    cluster VARCHAR(100), -- D: Cluster
    alamat TEXT, -- E: Alamat
    jenis_layanan VARCHAR(100), -- F: Jenis Layanan
    waktu_kunjungan TIME, -- G: Waktu Kunjungan
    jumlah_unit INTEGER, -- H: Jumlah Unit
    tanggal_kunjungan DATE, -- I: Tanggal Kunjungan
    status VARCHAR(50), -- J: Status
    tanggal_selesai DATE, -- K: Tanggal Selesai
    booking_id VARCHAR(100), -- L: Booking ID
    teknisi VARCHAR(100), -- M: Teknisi
    catatan TEXT, -- N: Catatan
    foto TEXT, -- O: Foto
    catatan_reschedule TEXT, -- P: Catatan Reschedule
    kode_teknisi VARCHAR(50), -- Q: Kode Teknisi
    catatan_internal TEXT, -- R: Catatan Internal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create booking_attachments table for photos/documents
CREATE TABLE IF NOT EXISTS public.booking_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create technician_schedules table for availability
CREATE TABLE IF NOT EXISTS public.technician_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    break_start TIME,
    break_end TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(technician_id, date)
);

-- Add work_report_id to bookings for linking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS work_report_id UUID REFERENCES public.work_reports(id) ON DELETE SET NULL;

-- Insert default services
INSERT INTO public.services (name, description, duration_minutes, price, is_active) VALUES
('Cuci AC', 'Pembersihan unit AC standar', 60, 50000, true),
('Service AC', 'Perbaikan dan maintenance AC', 90, 75000, true),
('Instalasi AC', 'Pemasangan unit AC baru', 120, 150000, true),
('Perbaikan AC', 'Troubleshooting dan repair AC', 90, 100000, true)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_technician_id ON public.bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON public.bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_technician_schedules_date ON public.technician_schedules(technician_id, date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public can view active services" ON public.services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view bookings" ON public.bookings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their bookings" ON public.bookings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_schedules_updated_at BEFORE UPDATE ON public.technician_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

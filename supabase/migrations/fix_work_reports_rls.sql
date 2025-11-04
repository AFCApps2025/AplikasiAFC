-- Fix work_reports table RLS policies to prevent error 21000
-- This error occurs when RLS policies return multiple rows

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.work_reports;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.work_reports;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.work_reports;
DROP POLICY IF EXISTS "Public can insert work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Public can view work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Public can update work reports" ON public.work_reports;

-- Disable RLS temporarily to check if table exists
ALTER TABLE IF EXISTS public.work_reports DISABLE ROW LEVEL SECURITY;

-- Create work_reports table if not exists
CREATE TABLE IF NOT EXISTS public.work_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id VARCHAR(100),
    nama_pelanggan VARCHAR(255) NOT NULL,
    alamat_pelanggan TEXT,
    no_wa_pelanggan VARCHAR(20) NOT NULL,
    no_unit VARCHAR(50),
    merk VARCHAR(100),
    spek_unit VARCHAR(255),
    tanggal_dikerjakan VARCHAR(20) NOT NULL,
    jenis_pekerjaan VARCHAR(100) NOT NULL,
    keterangan TEXT,
    internal_notes TEXT,
    foto_url TEXT,
    teknisi VARCHAR(100) NOT NULL,
    helper VARCHAR(100),
    total_referrals INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending_approval',
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Re-enable RLS
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

-- Create simple, non-conflicting policies
-- Policy 1: Allow anonymous users to INSERT (for public form submissions)
CREATE POLICY "allow_anon_insert" ON public.work_reports
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Policy 2: Allow authenticated users to INSERT
CREATE POLICY "allow_auth_insert" ON public.work_reports
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Policy 3: Allow service_role to do everything
CREATE POLICY "allow_service_role_all" ON public.work_reports
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 4: Allow anonymous users to SELECT
CREATE POLICY "allow_anon_select" ON public.work_reports
    FOR SELECT
    TO anon
    USING (true);

-- Policy 5: Allow authenticated users to SELECT
CREATE POLICY "allow_auth_select" ON public.work_reports
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 6: Allow authenticated users to UPDATE
CREATE POLICY "allow_auth_update" ON public.work_reports
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_reports_booking_id ON public.work_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_teknisi ON public.work_reports(teknisi);
CREATE INDEX IF NOT EXISTS idx_work_reports_status ON public.work_reports(status);
CREATE INDEX IF NOT EXISTS idx_work_reports_created_at ON public.work_reports(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_work_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_work_reports_updated_at ON public.work_reports;
CREATE TRIGGER update_work_reports_updated_at 
    BEFORE UPDATE ON public.work_reports
    FOR EACH ROW 
    EXECUTE FUNCTION update_work_reports_updated_at();

-- Grant permissions
GRANT ALL ON public.work_reports TO anon;
GRANT ALL ON public.work_reports TO authenticated;
GRANT ALL ON public.work_reports TO service_role;

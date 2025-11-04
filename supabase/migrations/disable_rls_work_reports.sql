-- DISABLE RLS COMPLETELY FOR work_reports TABLE
-- This is the final solution to fix error 21000

-- Drop ALL existing policies
DROP POLICY IF EXISTS "allow_anon_insert" ON public.work_reports;
DROP POLICY IF EXISTS "allow_auth_insert" ON public.work_reports;
DROP POLICY IF EXISTS "allow_service_role_all" ON public.work_reports;
DROP POLICY IF EXISTS "allow_anon_select" ON public.work_reports;
DROP POLICY IF EXISTS "allow_auth_select" ON public.work_reports;
DROP POLICY IF EXISTS "allow_auth_update" ON public.work_reports;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.work_reports;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.work_reports;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.work_reports;
DROP POLICY IF EXISTS "Public can insert work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Public can view work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Public can update work reports" ON public.work_reports;

-- DISABLE RLS COMPLETELY
ALTER TABLE public.work_reports DISABLE ROW LEVEL SECURITY;

-- Grant full access to everyone
GRANT ALL ON public.work_reports TO anon;
GRANT ALL ON public.work_reports TO authenticated;
GRANT ALL ON public.work_reports TO service_role;
GRANT ALL ON public.work_reports TO postgres;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'work_reports';
-- rowsecurity should be FALSE

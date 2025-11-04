-- TEST INSERT QUERY UNTUK WORK_REPORTS
-- Jalankan di Supabase SQL Editor untuk diagnosa error 21000

-- 1. CHECK RLS STATUS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'work_reports';

-- 2. CHECK EXISTING POLICIES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_reports';

-- 3. TEST INSERT DENGAN EXPLAIN ANALYZE
EXPLAIN ANALYZE
INSERT INTO work_reports (
    nama_pelanggan,
    no_wa_pelanggan,
    jenis_pekerjaan,
    teknisi,
    tanggal_dikerjakan,
    status,
    alamat_pelanggan,
    no_unit,
    merk,
    spek_unit,
    keterangan,
    internal_notes,
    helper,
    booking_id,
    total_referrals,
    approved_by,
    approved_at,
    approval_notes,
    rejection_reason
) VALUES (
    'Test Customer',
    '628118335411',
    'Test Service',
    'Test Teknisi',
    CURRENT_DATE,
    'pending_approval',
    'Test Address',
    'Unit-001',
    'Test Brand',
    'Test Spec',
    'Test Keterangan',
    'Test Internal Notes',
    'Test Helper',
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    NULL
);

-- 4. VERIFY INSERT BERHASIL
SELECT 
    id,
    nama_pelanggan,
    no_wa_pelanggan,
    jenis_pekerjaan,
    teknisi,
    status,
    created_at
FROM work_reports 
WHERE nama_pelanggan = 'Test Customer'
ORDER BY created_at DESC 
LIMIT 1;

-- 5. DELETE TEST DATA
DELETE FROM work_reports 
WHERE nama_pelanggan = 'Test Customer';

-- 6. CHECK TRIGGERS
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'work_reports';

-- 7. CHECK FUNCTIONS YANG DIPANGGIL TRIGGERS
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN (
    'update_partner_referral_count',
    'update_partner_referral_on_approval',
    'update_work_reports_updated_at'
);

-- ANALISIS HASIL:
-- Jika RLS enabled = true → Disable dengan: ALTER TABLE work_reports DISABLE ROW LEVEL SECURITY;
-- Jika ada policies → Drop semua policies
-- Jika EXPLAIN ANALYZE menunjukkan error → Check trigger functions
-- Jika trigger error → Temporarily disable triggers untuk test

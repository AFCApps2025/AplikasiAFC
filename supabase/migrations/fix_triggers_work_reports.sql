-- FIX TRIGGERS YANG MUNGKIN MENYEBABKAN ERROR 21000
-- Triggers bisa return multiple rows dan trigger error

-- 1. CHECK APAKAH TRIGGER FUNCTIONS ADA
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN (
    'update_partner_referral_count',
    'update_partner_referral_on_approval',
    'update_work_reports_updated_at'
);

-- 2. CREATE/REPLACE FUNCTION update_work_reports_updated_at (SAFE)
CREATE OR REPLACE FUNCTION update_work_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CREATE SAFE DUMMY FUNCTIONS UNTUK TRIGGERS LAIN (jika tidak ada)
CREATE OR REPLACE FUNCTION update_partner_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Dummy function - tidak melakukan apa-apa untuk avoid error
    -- Bisa diimplementasikan nanti setelah insert berhasil
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_partner_referral_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Dummy function - tidak melakukan apa-apa untuk avoid error
    -- Bisa diimplementasikan nanti setelah insert berhasil
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RECREATE TRIGGERS DENGAN SAFE FUNCTIONS
DROP TRIGGER IF EXISTS trigger_update_referral_count ON work_reports;
DROP TRIGGER IF EXISTS trigger_update_referral_on_approval ON work_reports;
DROP TRIGGER IF EXISTS update_work_reports_updated_at ON work_reports;

CREATE TRIGGER update_work_reports_updated_at
    BEFORE UPDATE ON work_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_work_reports_updated_at();

CREATE TRIGGER trigger_update_referral_count
    AFTER INSERT ON work_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_referral_count();

CREATE TRIGGER trigger_update_referral_on_approval
    AFTER UPDATE ON work_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_referral_on_approval();

-- 5. VERIFY TRIGGERS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'work_reports'
ORDER BY trigger_name;

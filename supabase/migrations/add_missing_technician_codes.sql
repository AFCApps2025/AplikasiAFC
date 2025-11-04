-- Add missing technician code A2 for Herman (teknisi2)
-- This ensures all system accounts have corresponding technician codes

-- First, check if A2 exists
DO $$
BEGIN
  -- Insert A2 if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM technician_codes WHERE code = 'A2') THEN
    INSERT INTO technician_codes (code, name, active, sort_order, account_id)
    VALUES (
      'A2',
      'Herman',
      true,
      2,
      (SELECT id FROM system_accounts WHERE username = 'teknisi2' LIMIT 1)
    );
    RAISE NOTICE 'Added technician code A2 for Herman';
  ELSE
    -- Update existing A2 to link to Herman
    UPDATE technician_codes
    SET 
      name = 'Herman',
      active = true,
      account_id = (SELECT id FROM system_accounts WHERE username = 'teknisi2' LIMIT 1)
    WHERE code = 'A2';
    RAISE NOTICE 'Updated technician code A2 to link to Herman';
  END IF;
END $$;

-- Verify the result
SELECT 
  tc.code,
  tc.name,
  tc.active,
  tc.sort_order,
  sa.username,
  sa.name as account_name,
  sa.role
FROM technician_codes tc
LEFT JOIN system_accounts sa ON tc.account_id = sa.id
ORDER BY tc.sort_order;

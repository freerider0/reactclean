-- =====================================================
-- FIX EXISTING BUCKETS: Make them PRIVATE
-- =====================================================

-- 1. Update existing buckets to be private
UPDATE storage.buckets
SET public = false
WHERE name LIKE 'tenant-%';

-- 2. Verify the change
SELECT name, public, file_size_limit, created_at
FROM storage.buckets
WHERE name LIKE 'tenant-%'
ORDER BY created_at DESC;

-- =====================================================
-- Expected result: is_public should be FALSE for all
-- =====================================================

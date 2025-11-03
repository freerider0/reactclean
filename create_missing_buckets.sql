-- =====================================================
-- CREATE MISSING BUCKETS FOR EXISTING TENANTS
-- =====================================================
-- This creates buckets for tenants that don't have them yet
-- =====================================================

-- 1. First, check which tenants are missing buckets
SELECT
  t.id,
  t.name,
  t.bucket_name,
  CASE
    WHEN b.name IS NULL THEN '❌ MISSING'
    ELSE '✅ EXISTS'
  END as bucket_status
FROM public.tenants t
LEFT JOIN storage.buckets b ON b.name = t.bucket_name
ORDER BY t.created_at DESC;

-- =====================================================
-- 2. Create buckets for ALL tenants that don't have them
-- =====================================================
DO $$
DECLARE
  tenant_record RECORD;
  bucket_exists BOOLEAN;
BEGIN
  FOR tenant_record IN
    SELECT id, bucket_name, name FROM public.tenants
  LOOP
    -- Check if bucket already exists
    SELECT EXISTS(
      SELECT 1 FROM storage.buckets WHERE name = tenant_record.bucket_name
    ) INTO bucket_exists;

    -- Create bucket if it doesn't exist
    IF NOT bucket_exists THEN
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        tenant_record.bucket_name,
        tenant_record.bucket_name,
        false, -- PRIVATE bucket
        52428800, -- 50MB
        NULL -- Allow all file types
      );

      RAISE NOTICE 'Created bucket: % for tenant: %', tenant_record.bucket_name, tenant_record.name;
    ELSE
      RAISE NOTICE 'Bucket already exists: %', tenant_record.bucket_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 3. Verify all tenants now have buckets
-- =====================================================
SELECT
  t.id,
  t.name,
  t.bucket_name,
  b.name as bucket_exists,
  b.public as is_public,
  CASE
    WHEN b.name IS NULL THEN '❌ STILL MISSING'
    WHEN b.public = true THEN '⚠️ PUBLIC (should be private)'
    ELSE '✅ OK'
  END as status
FROM public.tenants t
LEFT JOIN storage.buckets b ON b.name = t.bucket_name
ORDER BY t.created_at DESC;

-- =====================================================
-- 4. Fix any PUBLIC buckets to be PRIVATE
-- =====================================================
UPDATE storage.buckets
SET public = false
WHERE name LIKE 'tenant-%' AND public = true;

-- =====================================================
-- 5. Final verification - all should be private now
-- =====================================================
SELECT
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE name LIKE 'tenant-%'
ORDER BY created_at DESC;

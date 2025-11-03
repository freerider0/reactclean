-- =====================================================
-- SETUP RLS POLICIES FOR STORAGE
-- =====================================================
-- This allows users to upload/download files from their tenant bucket
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON storage.objects
-- =====================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP EXISTING POLICIES (if any)
-- =====================================================
DROP POLICY IF EXISTS "Users can read their tenant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their tenant bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their tenant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their tenant files" ON storage.objects;

-- =====================================================
-- 3. CREATE RLS POLICIES
-- =====================================================

-- Policy: Users can SELECT (read/download) files from their tenant's bucket
CREATE POLICY "Users can read their tenant files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN (
    SELECT t.bucket_name
    FROM public.tenants t
    INNER JOIN public.user_tenants ut ON ut.tenant_id = t.id
    WHERE ut.user_id = auth.uid()
  )
);

-- Policy: Users can INSERT (upload) files to their tenant's bucket
CREATE POLICY "Users can upload to their tenant bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN (
    SELECT t.bucket_name
    FROM public.tenants t
    INNER JOIN public.user_tenants ut ON ut.tenant_id = t.id
    WHERE ut.user_id = auth.uid()
  )
);

-- Policy: Users can UPDATE files in their tenant's bucket
CREATE POLICY "Users can update their tenant files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    SELECT t.bucket_name
    FROM public.tenants t
    INNER JOIN public.user_tenants ut ON ut.tenant_id = t.id
    WHERE ut.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id IN (
    SELECT t.bucket_name
    FROM public.tenants t
    INNER JOIN public.user_tenants ut ON ut.tenant_id = t.id
    WHERE ut.user_id = auth.uid()
  )
);

-- Policy: Users can DELETE files from their tenant's bucket
CREATE POLICY "Users can delete their tenant files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN (
    SELECT t.bucket_name
    FROM public.tenants t
    INNER JOIN public.user_tenants ut ON ut.tenant_id = t.id
    WHERE ut.user_id = auth.uid()
  )
);

-- =====================================================
-- 4. VERIFY POLICIES ARE CREATED
-- =====================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Expected to see 4 policies:
-- - Users can read their tenant files (SELECT)
-- - Users can upload to their tenant bucket (INSERT)
-- - Users can update their tenant files (UPDATE)
-- - Users can delete their tenant files (DELETE)

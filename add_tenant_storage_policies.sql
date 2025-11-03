-- =====================================================
-- ADD TENANT-AWARE STORAGE POLICIES
-- =====================================================
-- This adds new policies for authenticated users based on tenant
-- Keeps existing public policies intact
-- =====================================================

-- Create policies for authenticated users to access their tenant's bucket files
CREATE POLICY "Authenticated users can upload to their tenant bucket"
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

CREATE POLICY "Authenticated users can read their tenant files"
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

CREATE POLICY "Authenticated users can update their tenant files"
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

CREATE POLICY "Authenticated users can delete their tenant files"
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
-- VERIFY ALL POLICIES
-- =====================================================
SELECT
  policyname,
  cmd,
  roles,
  CASE
    WHEN roles::text LIKE '%authenticated%' THEN '✅ Authenticated'
    WHEN roles::text LIKE '%public%' THEN 'ℹ️ Public/Anon'
    ELSE '⚠️ Other'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, roles;

-- Expected: You should now see 4 new policies for 'authenticated' role

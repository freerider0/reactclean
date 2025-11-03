-- =====================================================
-- SIMPLE STORAGE RLS SETUP
-- =====================================================
-- Run this in Supabase SQL Editor (runs as postgres superuser)
-- =====================================================

-- First, check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Enable RLS (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to access their tenant's bucket
CREATE POLICY "Tenant users can upload files"
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

CREATE POLICY "Tenant users can read files"
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

CREATE POLICY "Tenant users can update files"
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
);

CREATE POLICY "Tenant users can delete files"
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

-- Verify
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

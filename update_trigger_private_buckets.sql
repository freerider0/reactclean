-- =====================================================
-- CREATE PRIVATE BUCKETS WITH TENANT-BASED ACCESS
-- =====================================================
-- Buckets will be PRIVATE with RLS policies
-- Only users in the tenant can access their files
-- =====================================================

-- =====================================================
-- 1. UPDATE FUNCTION TO CREATE PRIVATE BUCKET
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  new_bucket_name TEXT;
BEGIN
  -- Create tenant for the new user (get the ID first)
  INSERT INTO public.tenants (name, bucket_name, company_name)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Organization'),
    '', -- Placeholder, will update
    NULL
  )
  RETURNING id INTO new_tenant_id;

  -- Use tenant ID for bucket name
  new_bucket_name := 'tenant-' || new_tenant_id::text;

  -- Update tenant with the bucket name
  UPDATE public.tenants
  SET bucket_name = new_bucket_name
  WHERE id = new_tenant_id;

  -- Create user-tenant relationship (owner role)
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');

  -- Create PRIVATE storage bucket for this tenant
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    new_bucket_name,
    new_bucket_name,
    false, -- ← PRIVATE BUCKET
    52428800, -- 50MB
    NULL -- Allow all file types
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE RLS POLICIES FOR STORAGE ACCESS
-- =====================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT (read) files from their tenant's bucket
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
-- 3. UPDATE EXISTING BUCKETS TO PRIVATE (if needed)
-- =====================================================

-- Update all tenant buckets to be private
UPDATE storage.buckets
SET public = false
WHERE name LIKE 'tenant-%';

-- =====================================================
-- VERIFY SETUP
-- =====================================================

-- Check bucket privacy settings
SELECT name, public, file_size_limit, created_at
FROM storage.buckets
WHERE name LIKE 'tenant-%'
ORDER BY created_at DESC;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

-- =====================================================
-- VERIFY AND FIX TRIGGER FOR BUCKET CREATION
-- =====================================================

-- 1. First, let's check what the current function does
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 2. Check if trigger exists
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 3. Check existing buckets
SELECT id, name, public, created_at
FROM storage.buckets
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check existing tenants
SELECT id, name, bucket_name, created_at
FROM public.tenants
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- NOW UPDATE THE FUNCTION TO INCLUDE BUCKET CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  new_bucket_name TEXT;
BEGIN
  -- Generate unique bucket name
  new_bucket_name := 'tenant-' || gen_random_uuid()::text;

  -- Create tenant for the new user
  INSERT INTO public.tenants (name, bucket_name, company_name)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Organization'),
    new_bucket_name,
    NULL
  )
  RETURNING id INTO new_tenant_id;

  -- Create user-tenant relationship (owner role)
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');

  -- Create storage bucket for this tenant
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    new_bucket_name,
    new_bucket_name,
    true,
    52428800, -- 50MB
    NULL -- Allow all file types
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE BUCKETS FOR EXISTING TENANTS (if missing)
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
        true,
        52428800, -- 50MB
        NULL
      );

      RAISE NOTICE 'Created bucket: % for tenant: %', tenant_record.bucket_name, tenant_record.name;
    ELSE
      RAISE NOTICE 'Bucket already exists: %', tenant_record.bucket_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- VERIFY THE FIX
-- =====================================================

-- Check buckets were created
SELECT
  t.name as tenant_name,
  t.bucket_name,
  b.name as bucket_exists,
  b.created_at as bucket_created
FROM public.tenants t
LEFT JOIN storage.buckets b ON b.name = t.bucket_name
ORDER BY t.created_at DESC;

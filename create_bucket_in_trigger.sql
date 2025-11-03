-- =====================================================
-- UPDATE TRIGGER TO CREATE BUCKET AUTOMATICALLY
-- =====================================================
-- This creates the storage bucket when tenant is created
-- No need to create it from frontend code!
-- =====================================================

-- =====================================================
-- 1. UPDATE FUNCTION TO CREATE TENANT + BUCKET
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
-- The trigger on_auth_user_created already exists,
-- so we just updated the function.
-- No need to recreate the trigger!
-- =====================================================

-- =====================================================
-- VERIFY IT WORKS
-- =====================================================
-- After running this, sign up a new user and check:

-- SELECT * FROM storage.buckets WHERE name LIKE 'tenant-%';
-- Should show buckets for each tenant

-- =====================================================
-- BONUS: Create buckets for existing tenants
-- =====================================================
-- If you have existing tenants without buckets, run this:

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN
    SELECT bucket_name FROM tenants
    WHERE bucket_name NOT IN (SELECT name FROM storage.buckets)
  LOOP
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES (
      tenant_record.bucket_name,
      tenant_record.bucket_name,
      true,
      52428800
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created bucket: %', tenant_record.bucket_name;
  END LOOP;
END $$;

-- =====================================================

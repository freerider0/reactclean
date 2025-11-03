-- =====================================================
-- UPDATE TRIGGER TO USE TENANT ID FOR BUCKET NAME
-- =====================================================
-- This creates bucket with tenant ID as the name
-- Files will be stored like: tenant-{uuid}/{entityType}/{entityId}/file.jpg
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

  -- Create storage bucket for this tenant using tenant ID
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    new_bucket_name,
    new_bucket_name,
    false, -- ← PRIVATE bucket
    52428800, -- 50MB
    NULL -- Allow all file types
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFY IT WORKS
-- =====================================================
-- After running this, sign up a new user and check:
-- SELECT * FROM public.tenants;
-- SELECT * FROM storage.buckets WHERE name LIKE 'tenant-%';
-- The bucket name should match the tenant ID now!

-- =====================================================
-- OPTIONAL: Migrate existing tenants to use tenant ID
-- =====================================================
-- WARNING: This will create new buckets and you'll need to migrate files manually
-- Only run if you want to standardize existing tenants

/*
DO $$
DECLARE
  tenant_record RECORD;
  new_bucket_name TEXT;
BEGIN
  FOR tenant_record IN
    SELECT id, bucket_name, name FROM public.tenants
  LOOP
    new_bucket_name := 'tenant-' || tenant_record.id::text;

    -- Update tenant bucket_name
    UPDATE public.tenants
    SET bucket_name = new_bucket_name
    WHERE id = tenant_record.id;

    -- Create new bucket with tenant ID
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      new_bucket_name,
      new_bucket_name,
      true,
      52428800,
      NULL
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Updated tenant % to use bucket: %', tenant_record.name, new_bucket_name;
  END LOOP;
END $$;
*/

-- =====================================================
-- FIX SIGNUP TRIGGER (Correct Syntax)
-- =====================================================
-- The issue was with the $ delimiter
-- PostgreSQL needs $$ for function bodies
-- =====================================================

-- =====================================================
-- 1. CREATE FUNCTION TO AUTO-CREATE TENANT
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
  -- Uses user's full_name from metadata, falls back to email
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE TRIGGER ON auth.users
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. VERIFY IT WORKED
-- =====================================================
-- Check function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check trigger exists
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- If you see results, the trigger is installed! ✓
-- =====================================================

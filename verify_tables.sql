-- =====================================================
-- VERIFY TENANT TABLES EXIST
-- =====================================================
-- Run this to check if you need to create tables or just add trigger
-- =====================================================

-- Check if tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN (
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('tenants', 'user_tenants')
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (
  VALUES ('tenants'), ('user_tenants')
) AS t(table_name);

-- Check columns in tenants table (if exists)
SELECT
  'tenants' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'tenants'
ORDER BY ordinal_position;

-- Check columns in user_tenants table (if exists)
SELECT
  'user_tenants' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_tenants'
ORDER BY ordinal_position;

-- Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS status
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'user_tenants');

-- =====================================================
-- WHAT TO DO NEXT:
-- =====================================================
-- IF tenants/user_tenants MISSING:
--   → Run: create_tenant_tables.sql
--   → Then run: add_signup_trigger.sql
--
-- IF tenants/user_tenants EXIST but trigger MISSING:
--   → Run: add_signup_trigger.sql
--
-- IF everything EXISTS:
--   → You're all set! Just test signup flow
-- =====================================================

-- =====================================================
-- CREATE FUNCTION TO GET USER'S BUCKET INFO
-- =====================================================
-- This function returns the bucket info for the authenticated user
-- Much cleaner than trying to list buckets from frontend!
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_bucket()
RETURNS TABLE (
  bucket_name TEXT,
  bucket_exists BOOLEAN,
  is_public BOOLEAN,
  tenant_id UUID,
  tenant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.bucket_name,
    (b.name IS NOT NULL) as bucket_exists,
    b.public as is_public,
    t.id as tenant_id,
    t.name as tenant_name
  FROM public.tenants t
  INNER JOIN public.user_tenants ut ON ut.tenant_id = t.id
  LEFT JOIN storage.buckets b ON b.name = t.bucket_name
  WHERE ut.user_id = auth.uid()
  LIMIT 1;
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSION
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_user_bucket() TO authenticated;

-- =====================================================
-- TEST THE FUNCTION
-- =====================================================
-- Run this while logged in as a user:
-- SELECT * FROM get_user_bucket();
--
-- Expected result:
-- bucket_name                              | bucket_exists | is_public | tenant_id | tenant_name
-- tenant-98c7fe51-d096-42b5-888d-44559df2ca22 | true         | false     | 98c7...   | Josep
-- =====================================================

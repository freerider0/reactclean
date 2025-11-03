# 🚀 Deployment Steps - Tenant System

## Quick Start

Follow these steps in order:

---

## Step 1: Check What You Have

Run this in Supabase SQL Editor to see what's missing:

**File**: `verify_tables.sql`

This will show you:
- ✓ Which tables exist
- ✓ If RLS is enabled
- ✓ If signup trigger exists

---

## Step 2A: If Tables DON'T Exist

Run this (creates everything):

**File**: `complete_tenant_setup.sql`

This will:
1. Drop old customer tables
2. Create tenant tables
3. Set up RLS
4. Add signup trigger

---

## Step 2B: If Tables EXIST but Trigger MISSING

Run just the trigger:

**File**: `add_signup_trigger.sql`

This will:
1. Create the `handle_new_user()` function
2. Create the `on_auth_user_created` trigger

---

## Step 3: Verify It Worked

Run this in Supabase SQL Editor:

```sql
-- Check trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Should return:
-- trigger_name: on_auth_user_created
-- event_object_table: users
```

✅ If you see the trigger, you're good!

---

## Step 4: Test Signup Flow

1. **Sign up a new test user** in your app
2. **Check tenant was created**:

```sql
-- In Supabase SQL Editor
SELECT
  u.email,
  t.name as tenant_name,
  t.bucket_name,
  ut.role
FROM auth.users u
JOIN user_tenants ut ON ut.user_id = u.id
JOIN tenants t ON t.id = ut.tenant_id
WHERE u.email = 'your-test-email@example.com';
```

You should see:
- Your test user's email
- Tenant name (same as email or full_name)
- Unique bucket name
- Role = 'owner'

✅ If you see this data, **tenant auto-creation is working!**

---

## Step 5: Test in Your App

1. **Login** with the test user
2. **Open browser console**, should see:
   ```
   [TenantContext] Found tenant: {uuid}
   ```
3. **Try uploading a file** (media gallery)
4. **Verify** it uploads successfully

---

## Troubleshooting

### ❌ Trigger not firing

**Check function exists:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';
```

If missing, run `add_signup_trigger.sql` again.

### ❌ Permission error when creating tenant

**Check RLS policies:**
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('tenants', 'user_tenants');
```

Should show policies like:
- "Users can insert tenants"
- "Users can create tenant relationships"

If missing, run `complete_tenant_setup.sql` again.

### ❌ Tenant not loading in app

**Check user has tenant:**
```sql
SELECT * FROM user_tenants WHERE user_id = '{your-user-id}';
```

If empty, the trigger didn't run. Manually create tenant:
```sql
DO $$
DECLARE
  new_tenant_id UUID;
  user_email TEXT := 'user@example.com';
BEGIN
  INSERT INTO tenants (name, bucket_name)
  VALUES ('My Organization', 'tenant-' || gen_random_uuid()::text)
  RETURNING id INTO new_tenant_id;

  INSERT INTO user_tenants (user_id, tenant_id, role)
  SELECT id, new_tenant_id, 'owner'
  FROM auth.users WHERE email = user_email;
END $$;
```

---

## Summary

**What you need to do:**

1. ✅ Run `verify_tables.sql` - See what's missing
2. ✅ Run appropriate SQL file (complete or just trigger)
3. ✅ Sign up test user
4. ✅ Verify tenant created
5. ✅ Test in app

**Files to use:**
- `verify_tables.sql` - Check status
- `complete_tenant_setup.sql` - Full setup (tables + trigger)
- `add_signup_trigger.sql` - Just add trigger
- `create_tenant_tables.sql` - Just tables (no trigger)

**Current trigger status:** Based on your list, you have `update_tenants_updated_at` but NOT `on_auth_user_created`, so you need to run `add_signup_trigger.sql`!

🎯 **Next step**: Run `add_signup_trigger.sql` in Supabase SQL Editor!

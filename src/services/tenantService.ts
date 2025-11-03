import { supabase } from '@/lib/supabase';

/**
 * TENANT SERVICE - Multi-tenant Architecture
 *
 * ARCHITECTURE:
 * - One user = One tenant (the user who signs up is the tenant owner/payer)
 * - Tenant creation is AUTOMATIC via database trigger (handle_new_user)
 * - Each tenant has its own storage bucket (created by trigger)
 *
 * SIGNUP FLOW:
 * 1. User signs up via auth.signUp()
 * 2. Database trigger creates:
 *    - Tenant record
 *    - Profile record (with tenant_id and role='owner')
 *    - Storage bucket for the tenant
 * 3. Frontend does NOT create tenants manually
 *
 * USER INVITATIONS:
 * - Tenant owner can invite users
 * - Invited users get profile with role='admin' or 'member'
 * - All users in a tenant share the same tenant_id in profiles table
 *
 * DATA STRUCTURE:
 * - auth.users (Supabase managed)
 * - public.profiles (tenant_id, role, user data)
 * - public.tenants (tenant info, bucket_name)
 * - storage.buckets (one bucket per tenant)
 */

// Debug function - expose to window for testing
if (typeof window !== 'undefined') {
  (window as any).testTenantQuery = async () => {
    console.log('Testing database connection...');

    try {
      // Test 1: Get current user
      console.log('Test 1: Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('User error:', userError);
        return;
      }
      console.log('✓ User:', user?.id);

      // Test 2: Query user_tenants table
      console.log('Test 2: Querying user_tenants...');
      const { data: userTenants, error: utError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', user?.id)
        .limit(5);

      if (utError) {
        console.error('user_tenants error:', utError);
        return;
      }
      console.log('✓ user_tenants:', userTenants);

      // Test 3: Query tenants table
      console.log('Test 3: Querying tenants...');
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .limit(5);

      if (tenantError) {
        console.error('tenants error:', tenantError);
        return;
      }
      console.log('✓ tenants:', tenants);

      console.log('All tests passed!');
    } catch (error) {
      console.error('Test failed:', error);
    }
  };
}

// =====================================================
// TYPES
// =====================================================

export interface ContactInfo {
  value: string;
  type: 'personal' | 'work' | 'emergency' | 'other';
  is_primary?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  emails?: ContactInfo[];
  phones?: ContactInfo[];
  company_name?: string;
  bucket_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface CreateTenantInput {
  name: string;
  emails?: ContactInfo[];
  phones?: ContactInfo[];
  company_name?: string;
}

export interface UpdateTenantInput {
  name?: string;
  emails?: ContactInfo[];
  phones?: ContactInfo[];
  company_name?: string;
  is_active?: boolean;
}

// =====================================================
// TENANT CRUD OPERATIONS
// =====================================================

/**
 * Get the tenant for the current user (users can only have ONE tenant)
 */
export async function getUserTenant(): Promise<Tenant | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error('Failed to get user:', userError);
    throw new Error(userError.message);
  }

  if (!user || !user.id) {
    console.warn('No authenticated user found');
    return null;
  }

  // Query profiles table with tenant relationship
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, tenants(*)')
    .eq('id', user.id)
    .single();

  if (profileError) {
    if (profileError.code === 'PGRST116') return null; // Not found
    console.error('Failed to get profile:', profileError);
    throw new Error(profileError.message);
  }

  if (!profile || !profile.tenants) {
    return null;
  }

  const tenant = profile.tenants as unknown as Tenant;

  // Only return if active
  if (!tenant.is_active) {
    return null;
  }

  return tenant;
}

/**
 * Get a single tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }

  return data;
}

/**
 * DEPRECATED: Tenants are created automatically by database trigger on user signup
 *
 * The trigger (handle_new_user) creates:
 * 1. Tenant record
 * 2. Profile with tenant_id and role='owner'
 * 3. Storage bucket for the tenant
 *
 * This function is kept for backward compatibility but should not be used.
 * Use getUserTenant() to get the automatically created tenant instead.
 */
export async function createTenant(
  input: CreateTenantInput
): Promise<{ tenant: Tenant; error?: string }> {
  return {
    tenant: null as any,
    error: 'Tenants are created automatically on user signup. Use getUserTenant() instead.',
  };
}

/**
 * Update a tenant
 */
export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tenants')
    .update(input)
    .eq('id', tenantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a tenant (soft delete - set is_active to false)
 */
export async function deleteTenant(
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tenants')
    .update({ is_active: false })
    .eq('id', tenantId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// USER-TENANT RELATIONSHIP OPERATIONS
// =====================================================
// Note: Since users can only have ONE tenant, most multi-tenant operations are not needed

/**
 * Get user's role in a tenant
 */
export async function getUserRoleInTenant(
  tenantId: string
): Promise<'owner' | 'admin' | 'member' | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) return null;

  return data.role as 'owner' | 'admin' | 'member';
}

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { getUserTenant, type Tenant } from '@/services/tenantService';

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: PropsWithChildren) {
  const { user, isLoading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenant = async () => {
    // Don't attempt to load tenant if auth is still loading
    if (authLoading) {
      return;
    }

    // Don't attempt to load tenant if user is not authenticated
    if (!user) {
      setTenant(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userTenant = await getUserTenant();
      setTenant(userTenant);
    } catch (error) {
      console.error('[TenantProvider] Failed to load tenant:', error);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshTenant = async () => {
    await loadTenant();
  };

  useEffect(() => {
    loadTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAuth } from './context/auth-context';

/**
 * Component to protect routes that require authentication.
 * If user is not authenticated, redirects to the login page.
 *
 * Note: Auth state is managed by AuthProvider via onAuthStateChange.
 * No need to verify on every route - just check the current state.
 */
export const RequireAuth = () => {
  const { session, isLoading, user } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log('[RequireAuth]', {
    isLoading,
    hasSession: !!session,
    hasUser: !!user,
    userId: user?.id,
    path: location.pathname,
  });

  // Show screen loader while checking authentication
  if (isLoading) {
    console.log('[RequireAuth] Still loading, showing loader...');
    return <ScreenLoader />;
  }

  // If not authenticated, redirect to login
  if (!session) {
    console.log('[RequireAuth] No session, redirecting to signin...');
    return (
      <Navigate
        to={`/auth/signin?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  console.log('[RequireAuth] Authenticated, showing protected route');
  // If authenticated, render child routes
  return <Outlet />;
};

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

  // Show screen loader while checking authentication
  if (isLoading) {
    return <ScreenLoader />;
  }

  // If not authenticated, redirect to login
  if (!session) {
    return (
      <Navigate
        to={`/auth/signin?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // If authenticated, render child routes
  return <Outlet />;
};

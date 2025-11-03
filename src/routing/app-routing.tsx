import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useLocation } from 'react-router';
import { useLoadingBar } from 'react-top-loading-bar';
import { AppRoutingSetup } from './app-routing-setup';

/**
 * App routing with loading bar
 * Note: Auth verification is handled by onAuthStateChange in AuthProvider
 * No need to manually verify on route changes
 */
export function AppRouting() {
  const { start, complete } = useLoadingBar({
    color: 'var(--color-primary)',
    shadow: false,
    waitingTime: 400,
    transitionTime: 200,
    height: 2,
  });

  const { isLoading } = useAuth();
  const [previousLocation, setPreviousLocation] = useState('');
  const location = useLocation();
  const path = location.pathname.trim();

  // Show loading bar on route change
  useEffect(() => {
    if (!isLoading && previousLocation !== path) {
      start('static');
      setTimeout(() => {
        setPreviousLocation(path);
        complete();
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isLoading]);

  // Scroll to top on route change
  useEffect(() => {
    if (!CSS.escape(window.location.hash)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [previousLocation]);

  return <AppRoutingSetup />;
}

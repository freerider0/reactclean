import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Callback page for OAuth authentication redirects.
 * Following official Supabase docs - onAuthStateChange handles the session automatically
 * Reference: https://supabase.com/docs/guides/auth/social-login
 */
export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { session, isLoading } = useAuth();

  useEffect(() => {
    // Check for OAuth errors in URL
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed');
      setTimeout(() => {
        navigate(
          `/auth/signin?error=${errorParam}&error_description=${encodeURIComponent(errorDescription || 'Authentication failed')}`,
        );
      }, 1500);
      return;
    }

    // Wait for session to be processed by onAuthStateChange
    if (!isLoading) {
      if (session) {
        // Session established, redirect to home or next param
        const nextPath = searchParams.get('next') || '/';
        console.log('OAuth callback successful, redirecting to:', nextPath);
        navigate(nextPath);
      } else {
        // No session after loading, something went wrong
        setError('Failed to establish session');
        setTimeout(() => {
          navigate('/auth/signin?error=no_session');
        }, 1500);
      }
    }
  }, [session, isLoading, searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      {error ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-destructive">
            Authentication Error
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm">Redirecting to sign-in page...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Completing sign in...</h2>
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      )}
    </div>
  );
}

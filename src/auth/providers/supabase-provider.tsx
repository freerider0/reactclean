import { PropsWithChildren, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthContext } from '@/auth/context/auth-context';
import { supabase } from '@/lib/supabase';

/**
 * Supabase Auth Provider combining official patterns:
 * - State management from: https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth
 * - Auth methods from: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
 *
 * Pattern:
 * 1. Fetch session on mount with getSession()
 * 2. Subscribe to auth changes with onAuthStateChange()
 * 3. Fetch profile when session changes
 * 4. Provide auth methods that call supabase.auth directly
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Fetch session once on mount and subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;

    // Subscribe to auth state changes first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);
      if (isMounted) {
        setSession(session);
        // Mark initial load as complete after INITIAL_SESSION event
        if (_event === 'INITIAL_SESSION') {
          setInitialLoadComplete(true);
        }
        // On sign out, clear profile and reset loading
        if (_event === 'SIGNED_OUT') {
          setProfile(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profile when session changes AND initial load is complete
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      // Wait for initial session check to complete
      if (!initialLoadComplete) {
        return;
      }

      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('[AuthProvider] Profile fetch error:', error);
          console.error('[AuthProvider] Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
        }

        if (isMounted) {
          setProfile(data);
          setIsLoading(false);
        }
      } else {
        // No session after initial load is complete
        if (isMounted) {
          setProfile(null);
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [session, initialLoadComplete]);

  // Auth methods - calling supabase.auth directly (from official docs)
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: any) => {
    if (!session?.user) throw new Error('No user');

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Refresh profile
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    setProfile(data);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        isLoggedIn: session !== undefined && session !== null,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

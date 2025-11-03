import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Auth context combining both patterns from official Supabase docs:
 * 1. State management (session, user, profile, loading)
 * 2. Auth methods (login, register, logout) - wrapping supabase.auth calls
 *
 * This provides a clean API for components while using Supabase directly
 */
export type AuthContextType = {
  // State
  session: Session | null | undefined;
  user: User | null | undefined;
  profile: any | null;
  isLoading: boolean;
  isLoggedIn: boolean;

  // Auth methods - wrapping supabase.auth directly
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  session: undefined,
  user: undefined,
  profile: undefined,
  isLoading: true,
  isLoggedIn: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

// Hook to use auth context
export function useAuth() {
  return useContext(AuthContext);
}

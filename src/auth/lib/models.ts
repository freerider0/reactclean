import type { User, Session } from '@supabase/supabase-js';

// Define UUID type for consistent usage
export type UUID = string;

// Language code type for user preferences
export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'zh';

/**
 * Auth model representing the authentication session
 * Maps to Supabase Session tokens
 */
export interface AuthModel {
  access_token: string;
  refresh_token?: string;
}

/**
 * User model representing the user profile
 * Extended from Supabase User with custom metadata
 */
export interface UserModel {
  id?: UUID; // Supabase user ID
  username: string;
  password?: string; // Optional as we don't always retrieve passwords
  email: string;
  first_name: string;
  last_name: string;
  fullname?: string; // May be stored directly in metadata
  email_verified?: boolean;
  occupation?: string;
  company_name?: string; // Using snake_case consistently
  companyName?: string; // For backward compatibility
  phone?: string;
  roles?: number[]; // Array of role IDs
  pic?: string;
  language?: LanguageCode; // Maintain existing type
  is_admin?: boolean; // Added admin flag
}

/**
 * Type guard to check if a Supabase User has required metadata
 */
export function isValidUserMetadata(user: User): boolean {
  return user.user_metadata !== null && user.user_metadata !== undefined;
}

/**
 * Helper to convert Supabase Session to AuthModel
 */
export function sessionToAuthModel(session: Session): AuthModel {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
}

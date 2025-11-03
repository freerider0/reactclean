# Auth Usage Examples - Following Official Supabase Docs

This guide shows how to use the Auth context in your components, following the official Supabase documentation patterns.

## Pattern Overview

✅ **Best of both worlds:**
- Uses `supabase.auth` directly (no adapter layer)
- Provides clean component API via context methods
- Uses official Supabase `Session` type
- Follows patterns from official docs

---

## Basic Usage

### 1. Login Component

```tsx
import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      // onAuthStateChange will handle navigation
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### 2. Register Component

```tsx
import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { signUp, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password, {
        full_name: fullName,
      });
      alert('Check your email for verification!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### 3. Account/Profile Component

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';

export default function AccountPage() {
  const { session, profile, updateProfile, signOut, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setWebsite(profile.website || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        username,
        website,
      });
      alert('Profile updated!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Account</h1>
      <p>Email: {session?.user?.email}</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website"
        />
        <button type="submit">Update Profile</button>
      </form>

      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}
```

### 4. Protected Route Component

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';

export function RequireAuth() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

---

## Auth Context API

### State Properties

```tsx
const {
  session,      // Session | null | undefined - Supabase session object
  user,         // User | null | undefined - Supabase user object (from session.user)
  profile,      // any | null - User profile from profiles table
  isLoading,    // boolean - Loading state
  isLoggedIn,   // boolean - Computed from session
} = useAuth();
```

### Auth Methods

```tsx
const {
  signIn,       // (email, password) => Promise<void>
  signUp,       // (email, password, metadata?) => Promise<void>
  signOut,      // () => Promise<void>
  updateProfile // (updates) => Promise<void>
} = useAuth();
```

---

## How It Works

1. **State Management** (from Expo Social Auth docs)
   - `getSession()` on mount
   - `onAuthStateChange()` for real-time updates
   - Profile fetched when session changes

2. **Auth Methods** (from Expo User Management docs)
   - Call `supabase.auth` directly
   - No adapter layer
   - Throw errors for components to handle

3. **Clean Component API**
   - Components use context methods
   - No need to import `supabase` everywhere
   - Easy to test and mock

---

## Example: Complete Login Flow

```tsx
// 1. User enters credentials and submits
await signIn(email, password);

// 2. supabase.auth.signInWithPassword() is called

// 3. onAuthStateChange fires with SIGNED_IN event

// 4. Session is updated in context

// 5. Profile is fetched from profiles table

// 6. isLoggedIn becomes true

// 7. Component re-renders with session data
```

---

## TypeScript Types

```tsx
import type { Session, User } from '@supabase/supabase-js';

// Session is the official Supabase type
const { session } = useAuth();
console.log(session?.user.id);
console.log(session?.access_token);

// User is the official Supabase User type (extracted from session.user)
const { user } = useAuth();
console.log(user?.id);
console.log(user?.email);

// Profile is from your profiles table
const { profile } = useAuth();
console.log(profile?.username);
console.log(profile?.website);
```

---

## Best Practices

✅ **DO:**
- Use context methods in components
- Handle errors with try/catch
- Show loading states during auth operations
- Let `onAuthStateChange` handle navigation

❌ **DON'T:**
- Import `supabase` in auth components (use context instead)
- Manually manage session state (context handles it)
- Call `supabase.auth` directly in components (use context methods)

---

## References

- [Expo Social Auth Example](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth)
- [Expo User Management Example](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JavaScript Client Reference](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)

---

## Summary

✅ **Direct Supabase Usage** - No adapter layer, calls `supabase.auth` directly
✅ **Clean Component API** - Use `signIn()`, `signOut()` from context
✅ **Official Supabase Types** - Using `Session` type directly
✅ **100% From Docs** - Combines patterns from official examples
✅ **Simple & Maintainable** - Easy to understand and extend

This is the best of both worlds! 🚀

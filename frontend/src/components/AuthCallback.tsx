import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * AuthCallback — handles the redirect back from the backend after Google OAuth.
 *
 * The backend has already:
 *   1. Exchanged the OAuth code for tokens
 *   2. Created/found the user
 *   3. Set access_token and refresh_token HttpOnly cookies
 *   4. Redirected here
 *
 * Our job: call /api/users/me (which reads the cookie) to hydrate the auth store.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
      timeoutId = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timeoutId);
    }

    // Since App.tsx already blocks rendering until hydrate() completes,
    // if we mount, hydration is done.
    const { isAuthenticated } = useAuthStore.getState();
    
    if (isAuthenticated) {
      navigate('/workspace', { replace: true });
    } else {
      setError('Authentication failed. Please try again.');
      timeoutId = setTimeout(() => navigate('/'), 3000);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <div className="text-red-400 text-lg">Login failed: {error}</div>
        <div className="text-text-muted text-sm">Redirecting to home...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <div className="w-8 h-8 border-2 border-gold-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-text-secondary text-sm">Completing sign-in...</div>
    </div>
  );
}

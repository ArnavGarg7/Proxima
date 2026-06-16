import { api } from '@/lib/axios';

export default function Landing() {
  const handleLogin = () => {
    // Stage 1: Google OAuth PKCE initiated by server
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <h1 className="font-display text-4xl text-gold-primary">Proxima v4.0</h1>
      <p className="text-text-secondary text-lg">AI-Native Document Intelligence</p>
      <button onClick={handleLogin} className="btn-primary">
        Sign in with Google
      </button>
    </div>
  );
}

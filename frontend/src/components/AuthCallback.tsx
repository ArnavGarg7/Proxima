import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    // In a real implementation, we'd exchange code here or verify the cookie
    // For Stage 1 stub, we just simulate a successful login
    login({
      id: 'stub-user-123',
      email: 'user@example.com',
      name: 'Test User',
      role: 'admin',
      plan: 'pro'
    });
    
    navigate('/workspace');
  }, [login, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-gold-primary animate-pulse">Authenticating...</div>
    </div>
  );
}

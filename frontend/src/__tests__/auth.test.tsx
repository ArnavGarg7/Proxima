import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/useAuthStore';
import Navbar from '@/components/Navbar';
import { BrowserRouter } from 'react-router-dom';

describe('Auth Store & Components', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout();
    });
  });

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('renders navbar correctly for admin users', () => {
    act(() => {
      useAuthStore.getState().login({
        id: '1',
        email: 'admin@proxima.test',
        name: 'Admin',
        role: 'admin',
        plan: 'enterprise'
      });
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('admin@proxima.test')).toBeInTheDocument();
  });
});

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
}

interface UseAuthReturn extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
  });

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            accessToken: null,
          });
          return;
        }

        // Decode JWT to get user info (basic decode without verification)
        const payload = decodeJWT(accessToken);
        
        if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: {
              sub: payload.sub as string,
              name: payload.name as string | undefined,
              given_name: payload.given_name as string | undefined,
              family_name: payload.family_name as string | undefined,
              email: payload.email as string | undefined,
              email_verified: payload.email_verified as boolean | undefined,
              preferred_username: payload.preferred_username as string | undefined,
            },
            accessToken,
          });
        } else {
          // Token expired, try to refresh
          await refreshTokenInternal();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          accessToken: null,
        });
      }
    };

    checkAuth();
  }, []);

  const decodeJWT = (token: string): Record<string, unknown> | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  };

  const refreshTokenInternal = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      const payload = decodeJWT(data.accessToken);
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: payload ? {
          sub: payload.sub as string,
          name: payload.name as string | undefined,
          given_name: payload.given_name as string | undefined,
          family_name: payload.family_name as string | undefined,
          email: payload.email as string | undefined,
          email_verified: payload.email_verified as boolean | undefined,
          preferred_username: payload.preferred_username as string | undefined,
        } : null,
        accessToken: data.accessToken,
      });

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Clear tokens on refresh failure
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
      });

      return false;
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store tokens
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      const payload = decodeJWT(data.accessToken);

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: payload ? {
          sub: payload.sub as string,
          name: payload.name as string | undefined,
          given_name: payload.given_name as string | undefined,
          family_name: payload.family_name as string | undefined,
          email: payload.email as string | undefined,
          email_verified: payload.email_verified as boolean | undefined,
          preferred_username: payload.preferred_username as string | undefined,
        } : null,
        accessToken: data.accessToken,
      });

      router.push('/dashboard');
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [router]);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear tokens regardless of API response
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
    });

    router.push('/auth/login?logged_out=true');
  }, [router]);

  const refreshToken = useCallback(async () => {
    await refreshTokenInternal();
  }, []);

  return {
    ...state,
    login,
    logout,
    refreshToken,
  };
}

// Export types
export type { User, AuthState, UseAuthReturn };

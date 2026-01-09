import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseAuthOptions {
  onTokenExpired?: () => void;
  refreshBeforeExpiry?: number; // milliseconds before expiry to refresh
}

export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { onTokenExpired, refreshBeforeExpiry = 5 * 60 * 1000 } = options; // 5 minutes default

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Schedule next refresh
      if (data.expiresIn) {
        const refreshTime = (data.expiresIn * 1000) - refreshBeforeExpiry;
        scheduleTokenRefresh(refreshTime);
      }

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (onTokenExpired) {
        onTokenExpired();
      } else {
        router.push('/login?expired=true');
      }
      
      return false;
    }
  }, [router, onTokenExpired, refreshBeforeExpiry]);

  const scheduleTokenRefresh = useCallback((delayMs: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Schedule refresh
    refreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, delayMs);
  }, [refreshToken]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    // Check token status on mount and schedule refresh if needed
    const checkTokenStatus = async () => {
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        
        if (data.expiresIn) {
          // Schedule refresh before expiry
          const refreshTime = Math.max(
            0,
            (data.expiresIn * 1000) - refreshBeforeExpiry
          );
          scheduleTokenRefresh(refreshTime);
        }
      } catch (error) {
        console.error('Token status check failed:', error);
      }
    };

    checkTokenStatus();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [router, refreshBeforeExpiry, scheduleTokenRefresh]);

  return {
    refreshToken,
    logout,
  };
}
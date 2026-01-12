'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw } from 'lucide-react';
import type { UserSession } from '@/lib/zitadel/types';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Clear client-side tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/auth/login?logged_out=true');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      Sign out
    </button>
  );
}

export function RefreshTokenButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh token');
      }

      // Update client-side tokens
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      setMessage({ type: 'success', text: 'Token refreshed successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to refresh token',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Refreshing...' : 'Refresh Token'}
      </button>
      {message && (
        <p
          className={`mt-2 text-sm ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

interface SessionInfoProps {
  session: UserSession;
}

export function SessionInfo({ session }: SessionInfoProps) {
  const expiresAt = new Date(session.expiresAt);
  const now = new Date();
  const isExpired = expiresAt < now;
  const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <dl className="space-y-3">
      <div>
        <dt className="text-sm text-slate-500">Session Status</dt>
        <dd className="text-sm font-medium">
          {isExpired ? (
            <span className="text-red-600">Expired</span>
          ) : (
            <span className="text-green-600">Active</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-slate-500">Expires At</dt>
        <dd className="text-sm text-slate-900">
          {expiresAt.toLocaleString()}
        </dd>
      </div>
      {!isExpired && (
        <div>
          <dt className="text-sm text-slate-500">Time Remaining</dt>
          <dd className="text-sm text-slate-900">{formatTime(timeRemaining)}</dd>
        </div>
      )}
      <div>
        <dt className="text-sm text-slate-500">Has Refresh Token</dt>
        <dd className="text-sm text-slate-900">
          {session.refreshToken ? (
            <span className="text-green-600">Yes</span>
          ) : (
            <span className="text-amber-600">No</span>
          )}
        </dd>
      </div>
    </dl>
  );
}

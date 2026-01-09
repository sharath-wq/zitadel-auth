'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';

interface UserInfo {
  id: string;
  loginName: string;
  displayName?: string;
}

export default function DashboardClient({ user }: { user: UserInfo }) {
  const { logout } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<{ expiresIn: number | null }>({ 
    expiresIn: null 
  });

  useEffect(() => {
    // Fetch token status
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          setTokenInfo({ expiresIn: data.expiresIn });
        }
      } catch (error) {
        console.error('Failed to fetch token status:', error);
      }
    };

    fetchStatus();
    
    // Update every minute
    const interval = setInterval(fetchStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (seconds: number | null) => {
    if (seconds === null) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Welcome!</h2>
              <p className="text-gray-600">
                You are logged in as: {user?.displayName || user?.loginName}
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Your Information:</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">User ID:</dt>
                  <dd className="text-sm font-mono">{user?.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Login Name:</dt>
                  <dd className="text-sm">{user?.loginName}</dd>
                </div>
              </dl>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Session Information:</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Token expires in:</dt>
                  <dd className="text-sm font-medium">
                    {formatTimeRemaining(tokenInfo?.expiresIn)}
                  </dd>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Your token will be automatically refreshed before it expires.
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
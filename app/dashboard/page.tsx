import { redirect } from 'next/navigation';
import { getSession } from '@/lib/zitadel/auth';
import { LogoutButton, RefreshTokenButton, SessionInfo } from './client';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-slate-900">Dashboard</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {session.user?.name || session.user?.email || 'User'}
                </p>
                <p className="text-xs text-slate-500">
                  {session.user?.email}
                </p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session.user?.given_name || 'there'}!
          </h1>
          <p className="text-slate-600 mt-1">
            You&apos;re successfully authenticated with Zitadel.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Session Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Session Information
            </h2>
            <SessionInfo session={session} />
          </div>

          {/* User Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              User Profile
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-slate-500">User ID</dt>
                <dd className="text-sm font-mono text-slate-900 truncate">
                  {session.userId}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Name</dt>
                <dd className="text-sm text-slate-900">
                  {session.user?.name || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Email</dt>
                <dd className="text-sm text-slate-900">
                  {session.user?.email || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Email Verified</dt>
                <dd className="text-sm text-slate-900">
                  {session.user?.email_verified ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="text-amber-600">Not verified</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Token Management Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Token Management
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  Access tokens expire periodically. Use the refresh button to get a new token.
                </p>
                <RefreshTokenButton />
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Tokens are stored securely in HTTP-only cookies and are automatically refreshed when needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Access Token Preview (for demo) */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Access Token (Truncated)
          </h2>
          <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-600 break-all">
            {/* {session.accessToken.substring(0, 50)}...
            {session.accessToken.substring(session.accessToken.length - 20)} */}
            {session.accessToken}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Use this token in the Authorization header for API requests.
          </p>
        </div>
      </main>
    </div>
  );
}

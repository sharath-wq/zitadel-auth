import { redirect } from 'next/navigation';
import { getSessionCookie } from '@/lib/session';
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardPage() {
  const session = await getSessionCookie();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <LogoutButton />
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Welcome!</h2>
              <p className="text-gray-600">
                You are logged in as: {session.displayName || session.loginName}
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Your Information:</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">User ID:</dt>
                  <dd className="text-sm font-mono">{session.userId}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Login Name:</dt>
                  <dd className="text-sm">{session.loginName}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
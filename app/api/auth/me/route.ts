import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSessionCookie();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      loginName: session.loginName,
      displayName: session.displayName,
    },
  });
}
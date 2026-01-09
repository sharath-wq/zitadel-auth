import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionCookie();

    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Calculate time until expiry
    const expiresIn = session.expiresAt 
      ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
      : null;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        loginName: session.loginName,
        displayName: session.displayName,
      },
      expiresIn, // seconds until token expires
    });
  } catch (error: any) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get auth status' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie, clearSessionCookie } from '@/lib/session';
import { zitadelClient } from '@/lib/zitadel';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionCookie();

    if (session) {
      // Terminate session in Zitadel
      await zitadelClient.terminateSession(
        session.sessionId,
        session.sessionToken
      );
    }

    // Clear our cookie
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    // Clear cookie even if Zitadel call fails
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
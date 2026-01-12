import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { getSessionId, getAccessToken, clearSession } from '@/lib/zitadel/auth';
import { getBaseUrl } from '@/lib/utils';

/**
 * POST /api/auth/logout
 * 
 * Logs out the user by:
 * 1. Deleting the session in Zitadel
 * 2. Clearing session cookies
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const sessionToken = await getAccessToken();

    // Delete session in Zitadel (best effort)
    if (sessionId && sessionToken) {
      try {
        await zitadelClient.deleteSession(sessionId, sessionToken);
        console.log('Session deleted in Zitadel:', sessionId);
      } catch (err) {
        console.warn('Failed to delete session in Zitadel:', err);
        // Continue with local logout even if remote fails
      }
    }

    // Clear session cookies
    await clearSession();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear session even if there's an error
    await clearSession();

    return NextResponse.json({
      success: true,
      message: 'Logged out (with warnings)',
    });
  }
}

/**
 * GET /api/auth/logout
 * 
 * Alternative logout that redirects to login page.
 * Useful for link-based logout.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const sessionToken = await getAccessToken();

    // Delete session in Zitadel
    if (sessionId && sessionToken) {
      try {
        await zitadelClient.deleteSession(sessionId, sessionToken);
      } catch {
        // Ignore errors
      }
    }
  } catch {
    // Ignore errors
  }

  // Clear session
  await clearSession();

  // Redirect to login
  return NextResponse.redirect(`${getBaseUrl()}/auth/login?logged_out=true`);
}
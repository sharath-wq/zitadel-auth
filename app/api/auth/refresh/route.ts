import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { zitadelClient } from '@/lib/zitadel/client';
import { getSessionId, getAccessToken } from '@/lib/zitadel/auth';

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * POST /api/auth/refresh
 * 
 * Validates and extends the current session.
 * For Session API, this checks if the session is still valid.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const sessionToken = await getAccessToken();

    if (!sessionId || !sessionToken) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Validate session with Zitadel
    const sessionDetails = await zitadelClient.getSession(sessionId, sessionToken);

    // Check if session is expired
    if (sessionDetails.session.expirationDate) {
      const expiresAt = new Date(sessionDetails.session.expirationDate).getTime();
      if (expiresAt < Date.now()) {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    // Get user details
    let userDetails = null;
    const userId = sessionDetails.session.factors?.user?.id;
    
    if (userId) {
      try {
        const userResponse = await zitadelClient.getUserById(userId);
        userDetails = {
          sub: userResponse.user.userId,
          name: userResponse.user.human?.profile?.displayName || 
                `${userResponse.user.human?.profile?.givenName} ${userResponse.user.human?.profile?.familyName}`,
          given_name: userResponse.user.human?.profile?.givenName,
          family_name: userResponse.user.human?.profile?.familyName,
          email: userResponse.user.human?.email?.email,
          email_verified: userResponse.user.human?.email?.isVerified,
          preferred_username: userResponse.user.preferredLoginName,
        };
      } catch (e) {
        console.warn('Could not fetch user details:', e);
      }
    }

    // Calculate remaining time
    const expiresAt = sessionDetails.session.expirationDate 
      ? new Date(sessionDetails.session.expirationDate).getTime()
      : Date.now() + 12 * 60 * 60 * 1000;
    
    const expiresIn = Math.floor((expiresAt - Date.now()) / 1000);

    // Update session cookie with fresh data
    const cookieStore = await cookies();
    cookieStore.set('zitadel_session', JSON.stringify({
      userId,
      expiresAt,
      user: userDetails,
    }), {
      ...COOKIE_OPTIONS,
      maxAge: expiresIn,
    });

    return NextResponse.json({
      success: true,
      message: 'Session validated successfully',
      expiresIn,
      accessToken: sessionToken,
      user: userDetails,
    });
  } catch (error) {
    console.error('Session refresh error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Session validation failed';

    // Handle session expiry
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('invalid')
    ) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    );
  }
}
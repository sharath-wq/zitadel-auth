import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { zitadelClient } from '@/lib/zitadel/client';
import { getRefreshToken, storeTokens, clearSession } from '@/lib/zitadel/auth';

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
 * Uses OAuth2 refresh token to obtain a new access token.
 * This extends the user's session without requiring re-authentication.
 *
 * Flow:
 * 1. Get refresh token from HTTP-only cookie
 * 2. Exchange refresh token for new access token via OAuth2
 * 3. Store new tokens in cookies
 * 4. Return new access token to client
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found. Please log in again.' },
        { status: 401 }
      );
    }

    console.log('Refreshing access token using OAuth2 refresh token...');

    // Exchange refresh token for new tokens via OAuth2
    const newTokens = await zitadelClient.refreshAccessToken(refreshToken);

    console.log('New tokens obtained successfully');

    // Store the new tokens in cookies
    await storeTokens(newTokens);

    // Extract user info from ID token if available
    let userDetails = null;
    if (newTokens.id_token) {
      try {
        const jose = await import('jose');
        const decoded = jose.decodeJwt(newTokens.id_token);
        userDetails = {
          sub: decoded.sub as string,
          name: decoded.name as string | undefined,
          given_name: decoded.given_name as string | undefined,
          family_name: decoded.family_name as string | undefined,
          email: decoded.email as string | undefined,
          email_verified: decoded.email_verified as boolean | undefined,
          preferred_username: decoded.preferred_username as string | undefined,
        };
      } catch (e) {
        console.warn('Could not decode ID token:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Access token refreshed successfully',
      accessToken: newTokens.access_token,
      tokenType: newTokens.token_type,
      expiresIn: newTokens.expires_in,
      refreshToken: newTokens.refresh_token ? 'present' : 'not_present',
      user: userDetails,
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';

    // Handle refresh token expiry or invalidity
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('revoked') ||
      errorMessage.includes('not found')
    ) {
      // Clear all auth cookies since refresh failed
      await clearSession();

      return NextResponse.json(
        { error: 'Refresh token expired or invalid. Please log in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: 'Failed to refresh access token'
      },
      { status: 500 }
    );
  }
}
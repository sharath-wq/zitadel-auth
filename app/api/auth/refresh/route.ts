import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { getRefreshToken, storeTokens } from '@/lib/zitadel/auth';

/**
 * POST /api/auth/refresh
 * 
 * Refreshes the access token using the stored refresh token.
 * Returns new tokens and updates the session cookies.
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or request body
    let refreshToken = await getRefreshToken();

    // Allow passing refresh token in body for flexibility
    if (!refreshToken) {
      const body = await request.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    // Refresh the tokens
    const tokens = await zitadelClient.refreshAccessToken(refreshToken);

    // Store new tokens
    await storeTokens(tokens);

    return NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';

    // Handle refresh token expiry
    if (
      errorMessage.includes('invalid_grant') ||
      errorMessage.includes('expired')
    ) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

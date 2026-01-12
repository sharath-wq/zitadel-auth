import { NextRequest, NextResponse } from 'next/server';
import { getSession, getSessionId, storeTokens } from '@/lib/zitadel/auth';
import { zitadelClient } from '@/lib/zitadel/client';
import { generatePKCE } from '@/lib/zitadel/auth';
import { getBaseUrl } from '@/lib/utils';

/**
 * POST /api/auth/access-token
 *
 * Exchanges the current session for a proper OAuth access token.
 * This is useful when you need a standard OAuth token for API calls.
 *
 * Flow:
 * 1. Get current session
 * 2. Create OIDC auth request with PKCE
 * 3. Set session on auth request
 * 4. Exchange authorization code for tokens
 * 5. Return access token
 */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth/callback`;

    // Get current session
    const session = await getSession();
    const sessionId = await getSessionId();

    if (!session || !sessionId) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Generate PKCE for token exchange
    const pkce = await generatePKCE();

    // Exchange session for OIDC tokens
    const tokens = await zitadelClient.exchangeSessionForTokens(
      sessionId,
      session.accessToken, // This is the session token
      redirectUri,
      pkce.codeVerifier,
      pkce.codeChallenge
    );

    // Store the new tokens
    await storeTokens(tokens);

    return NextResponse.json({
      success: true,
      message: 'Access token obtained successfully',
      accessToken: tokens.access_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      refreshToken: tokens.refresh_token ? 'present' : 'not_present',
    });
  } catch (error) {
    console.error('Access token exchange error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to get access token';

    return NextResponse.json(
      {
        error: errorMessage,
        details: 'Could not exchange session for OAuth access token'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/access-token
 *
 * Returns the current access token from the session
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken ? 'present' : 'not_present',
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Get access token error:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve access token' },
      { status: 500 }
    );
  }
}

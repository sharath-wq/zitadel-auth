import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { zitadelClient } from '@/lib/zitadel/client';
import { generatePKCE, storePKCE, storeTokens } from '@/lib/zitadel/auth';
import { getBaseUrl } from '@/lib/utils';
import { z } from 'zod';

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// Validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 *
 * Uses Zitadel Session API v2 for authentication.
 * This is the recommended approach for custom login UIs.
 *
 * Flow:
 * 1. Create session with user check + password check
 * 2. Get user details from session
 * 3. Immediately exchange session for OAuth tokens (access token, refresh token, ID token)
 * 4. Store OAuth tokens and session info in cookies
 * 5. Return OAuth access token for API access
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // Create session using Zitadel Session API v2
    console.log('Creating session for user:', username);
    const sessionResult = await zitadelClient.createSession(username, password);

    console.log('Session created:', {
      sessionId: sessionResult.sessionId,
      userId: sessionResult.userId,
    });

    // Get user details
    let userDetails = null;
    if (sessionResult.userId) {
      try {
        const userResponse = await zitadelClient.getUserById(sessionResult.userId);
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
        // Use session factors as fallback
        userDetails = {
          sub: sessionResult.userId,
          name: sessionResult.factors?.user?.displayName,
          preferred_username: sessionResult.factors?.user?.loginName,
        };
      }
    }

    // Exchange session for OAuth access token immediately
    console.log('Exchanging session for OAuth tokens...');
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth/callback`;

    // Generate PKCE for token exchange
    const pkce = await generatePKCE();

    // Exchange session for OIDC tokens
    const tokens = await zitadelClient.exchangeSessionForTokens(
      sessionResult.sessionId,
      sessionResult.sessionToken,
      redirectUri,
      pkce.codeVerifier,
      pkce.codeChallenge
    );

    console.log('OAuth tokens obtained successfully');

    // Store the OAuth tokens in cookies
    await storeTokens(tokens);

    // Also store session ID for reference
    const cookieStore = await cookies();
    cookieStore.set('zitadel_session_id', sessionResult.sessionId, {
      ...COOKIE_OPTIONS,
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      sessionId: sessionResult.sessionId,
      userId: sessionResult.userId,
      expiresIn: tokens.expires_in,
      accessToken: tokens.access_token,
      tokenType: tokens.token_type,
      refreshToken: tokens.refresh_token ? 'present' : 'not_present',
      user: userDetails,
    });
  } catch (error) {
    console.error('Login error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Login failed';

    // Handle common authentication errors
    if (
      errorMessage.includes('password') ||
      errorMessage.includes('credentials') ||
      errorMessage.includes('user') ||
      errorMessage.includes('authentication')
    ) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('locked') || errorMessage.includes('LOCKED')) {
      return NextResponse.json(
        { error: 'Account is locked. Please contact support.' },
        { status: 403 }
      );
    }

    if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/login
 * 
 * Initiates PKCE OAuth2 flow by redirecting to Zitadel.
 * This is an alternative to the Session API approach.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth/callback`;

    // Generate PKCE challenge
    const pkce = await generatePKCE();

    // Store PKCE verifier in cookie for callback
    await storePKCE(pkce);

    // Get authorization URL
    const authUrl = zitadelClient.getAuthorizationUrl({
      redirectUri,
      codeChallenge: pkce.codeChallenge,
      state: pkce.state,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    });

    // Redirect to Zitadel
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('PKCE initiation error:', error);
    return NextResponse.redirect(
      `${getBaseUrl()}/auth/login?error=auth_init_failed`
    );
  }
}
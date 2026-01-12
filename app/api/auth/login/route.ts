import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { generatePKCE, storePKCE, storeTokens } from '@/lib/zitadel/auth';
import { getBaseUrl } from '@/lib/utils';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 * 
 * Two login modes are supported:
 * 1. ROPC (Resource Owner Password Credentials) - Direct login with username/password
 * 2. PKCE redirect - Redirects to Zitadel for authentication
 * 
 * ROPC is used here for a seamless custom UI experience.
 * For higher security requirements, use the PKCE flow via GET.
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

    // Use Resource Owner Password Credentials flow
    // Note: This requires ROPC to be enabled in Zitadel
    const tokens = await zitadelClient.loginWithPassword(
      username,
      password,
      ['openid', 'profile', 'email', 'offline_access']
    );

    // Store tokens in HTTP-only cookies
    await storeTokens(tokens);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      // Return non-sensitive token info
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      // Include tokens for client-side use if needed
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
    });
  } catch (error) {
    console.error('Login error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Login failed';

    // Handle common authentication errors
    if (
      errorMessage.includes('invalid_grant') ||
      errorMessage.includes('invalid credentials') ||
      errorMessage.includes('INVALID_CREDENTIALS')
    ) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('user not found') || errorMessage.includes('NOT_FOUND')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (errorMessage.includes('locked') || errorMessage.includes('LOCKED')) {
      return NextResponse.json(
        { error: 'Account is locked. Please contact support.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/login
 * 
 * Initiates PKCE OAuth2 flow by redirecting to Zitadel.
 * This is more secure than ROPC and is recommended for production.
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

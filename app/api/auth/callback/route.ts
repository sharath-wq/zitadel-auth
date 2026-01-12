import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { getPKCE, clearPKCE, storeTokens } from '@/lib/zitadel/auth';
import { getBaseUrl } from '@/lib/utils';

/**
 * GET /api/auth/callback
 * 
 * Handles the OAuth2 callback from Zitadel after successful authentication.
 * Exchanges the authorization code for tokens using PKCE.
 */
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();
  const searchParams = request.nextUrl.searchParams;

  // Get authorization code and state from query params
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Validate code presence
  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=missing_code`
    );
  }

  try {
    // Get stored PKCE challenge
    const pkce = await getPKCE();

    if (!pkce) {
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=session_expired`
      );
    }

    // Validate state to prevent CSRF
    if (state !== pkce.state) {
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=invalid_state`
      );
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/auth/callback`;
    const tokens = await zitadelClient.exchangeCodeForTokens(
      code,
      pkce.codeVerifier,
      redirectUri
    );

    // Clear PKCE cookie
    await clearPKCE();

    // Store tokens in HTTP-only cookies
    await storeTokens(tokens);

    // Redirect to dashboard or return URL
    const returnUrl = searchParams.get('return_url') || '/dashboard';
    return NextResponse.redirect(`${baseUrl}${returnUrl}`);
  } catch (error) {
    console.error('Token exchange error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Token exchange failed';

    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent(errorMessage)}`
    );
  }
}

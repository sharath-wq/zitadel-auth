import { cookies } from 'next/headers';
import * as jose from 'jose';
import { PKCEChallenge, UserSession, TokenResponse } from './types';

// Cookie names
const ACCESS_TOKEN_COOKIE = 'zitadel_access_token';
const REFRESH_TOKEN_COOKIE = 'zitadel_refresh_token';
const ID_TOKEN_COOKIE = 'zitadel_id_token';
const SESSION_ID_COOKIE = 'zitadel_session_id';
const SESSION_COOKIE = 'zitadel_session';
const PKCE_COOKIE = 'zitadel_pkce';

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Generate PKCE challenge for OAuth2 flow
 * Uses crypto-secure random values
 */
export async function generatePKCE(): Promise<PKCEChallenge> {
  // Generate code verifier (43-128 characters)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64URLEncode(array);

  // Generate code challenge (SHA-256 hash of verifier)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64URLEncode(new Uint8Array(hash));

  // Generate state for CSRF protection
  const stateArray = new Uint8Array(16);
  crypto.getRandomValues(stateArray);
  const state = base64URLEncode(stateArray);

  return {
    codeVerifier,
    codeChallenge,
    state,
  };
}

/**
 * Base64 URL encode (for PKCE)
 */
function base64URLEncode(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Store PKCE challenge in cookie (server-side)
 */
export async function storePKCE(pkce: PKCEChallenge): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PKCE_COOKIE, JSON.stringify(pkce), {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 10, // 10 minutes
  });
}

/**
 * Get stored PKCE challenge (server-side)
 */
export async function getPKCE(): Promise<PKCEChallenge | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(PKCE_COOKIE);
  if (!cookie) return null;

  try {
    return JSON.parse(cookie.value) as PKCEChallenge;
  } catch {
    return null;
  }
}

/**
 * Clear PKCE cookie
 */
export async function clearPKCE(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PKCE_COOKIE);
}

/**
 * Store tokens in HTTP-only cookies
 */
export async function storeTokens(tokens: TokenResponse): Promise<void> {
  const cookieStore = await cookies();

  // Decode ID token to get expiry
  let expiresAt = Date.now() + tokens.expires_in * 1000;

  if (tokens.id_token) {
    try {
      const decoded = jose.decodeJwt(tokens.id_token);
      if (decoded.exp) {
        expiresAt = decoded.exp * 1000;
      }
    } catch {
      // Use default expiry
    }
  }

  // Store access token
  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...COOKIE_OPTIONS,
    maxAge: tokens.expires_in,
  });

  // Store refresh token (longer lived)
  if (tokens.refresh_token) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // Store ID token
  if (tokens.id_token) {
    cookieStore.set(ID_TOKEN_COOKIE, tokens.id_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in,
    });
  }

  // Store session info (for quick access)
  const sessionData: Partial<UserSession> = {
    expiresAt,
  };

  if (tokens.id_token) {
    try {
      const decoded = jose.decodeJwt(tokens.id_token);
      sessionData.userId = decoded.sub as string;
      sessionData.user = {
        sub: decoded.sub as string,
        name: decoded.name as string | undefined,
        given_name: decoded.given_name as string | undefined,
        family_name: decoded.family_name as string | undefined,
        email: decoded.email as string | undefined,
        email_verified: decoded.email_verified as boolean | undefined,
        preferred_username: decoded.preferred_username as string | undefined,
      };
    } catch {
      // Ignore decode errors
    }
  }

  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), {
    ...COOKIE_OPTIONS,
    maxAge: tokens.expires_in,
  });
}

/**
 * Get current session (server-side)
 * Supports both OIDC tokens and Session API tokens
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const idToken = cookieStore.get(ID_TOKEN_COOKIE)?.value;
  const sessionId = cookieStore.get(SESSION_ID_COOKIE)?.value;
  const sessionData = cookieStore.get(SESSION_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  let session: Partial<UserSession> = {};

  if (sessionData) {
    try {
      session = JSON.parse(sessionData);
    } catch {
      // Ignore parse errors
    }
  }

  return {
    userId: session.userId || '',
    accessToken,
    refreshToken: refreshToken || (sessionId ? `session:${sessionId}` : undefined),
    idToken,
    expiresAt: session.expiresAt || 0,
    user: session.user,
  };
}

/**
 * Get access token (server-side)
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
}

/**
 * Get refresh token (server-side)
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null;
}

/**
 * Get session ID (for Session API)
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_ID_COOKIE)?.value || null;
}

/**
 * Clear all auth cookies (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(ID_TOKEN_COOKIE);
  cookieStore.delete(SESSION_ID_COOKIE);
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(PKCE_COOKIE);
}

/**
 * Check if session is expired
 */
export async function isSessionExpired(): Promise<boolean> {
  const session = await getSession();
  if (!session) return true;

  // Add 30 second buffer
  return session.expiresAt < Date.now() + 30000;
}

/**
 * Verify JWT token (basic verification)
 * For production, use proper JWKS verification
 */
export async function verifyToken(token: string): Promise<jose.JWTPayload | null> {
  try {
    const issuer = process.env.NEXT_PUBLIC_ZITADEL_ISSUER;
    if (!issuer) return null;

    // Get JWKS
    const JWKS = jose.createRemoteJWKSet(
      new URL(`${issuer}/oauth/v2/keys`)
    );

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer,
      audience: process.env.NEXT_PUBLIC_ZITADEL_CLIENT_ID,
    });

    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Decode JWT without verification (for reading claims)
 */
export function decodeToken(token: string): jose.JWTPayload | null {
  try {
    return jose.decodeJwt(token);
  } catch {
    return null;
  }
}
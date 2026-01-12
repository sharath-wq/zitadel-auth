import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { getAccessToken, getRefreshToken, clearSession } from '@/lib/zitadel/auth';
import { getBaseUrl } from '@/lib/utils';

/**
 * POST /api/auth/logout
 * 
 * Logs out the user by:
 * 1. Revoking tokens in Zitadel
 * 2. Clearing session cookies
 */
export async function POST(request: NextRequest) {
  try {
    // Get tokens to revoke
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();

    // Revoke tokens in Zitadel (best effort)
    const revocationPromises = [];

    if (accessToken) {
      revocationPromises.push(
        zitadelClient.revokeToken(accessToken).catch((err) => {
          console.warn('Failed to revoke access token:', err);
        })
      );
    }

    if (refreshToken) {
      revocationPromises.push(
        zitadelClient.revokeToken(refreshToken).catch((err) => {
          console.warn('Failed to revoke refresh token:', err);
        })
      );
    }

    // Wait for revocations (don't fail if they error)
    await Promise.allSettled(revocationPromises);

    // Clear session cookies
    await clearSession();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear session even if revocation fails
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
    // Revoke tokens
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();

    if (accessToken) {
      await zitadelClient.revokeToken(accessToken).catch(() => {});
    }
    if (refreshToken) {
      await zitadelClient.revokeToken(refreshToken).catch(() => {});
    }
  } catch {
    // Ignore errors
  }

  // Clear session
  await clearSession();

  // Redirect to login
  return NextResponse.redirect(`${getBaseUrl()}/auth/login?logged_out=true`);
}

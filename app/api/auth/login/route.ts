import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel';
import { createSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginName, password } = body;

    if (!loginName || !password) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      );
    }

    // Step 1: Create session with username
    const sessionData = await zitadelClient.createSession(loginName);

    console.log(sessionData, "SessionData");

    // Step 2: Update session with password
    const updatedSession = await zitadelClient.updateSessionWithPassword(
      sessionData.sessionId,
      password
    );

    // Step 3: Get full session details
    const session = await zitadelClient.getSession(
      sessionData.sessionId,
      updatedSession.sessionToken
    );

    // Step 4: Create OAuth tokens (access + refresh)
    const tokens = await zitadelClient.createTokens(
      sessionData.sessionId,
      updatedSession.sessionToken
    );

    // Step 5: Create our app session cookie with tokens
    await createSessionCookie({
      sessionId: sessionData.sessionId,
      sessionToken: updatedSession.sessionToken,
      userId: session.session.factors.user.id,
      loginName: session.session.factors.user.loginName,
      displayName: session.session.factors.user.displayName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: session.session.factors.user.id,
        loginName: session.session.factors.user.loginName,
        displayName: session.session.factors.user.displayName,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}
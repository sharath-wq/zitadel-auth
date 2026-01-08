import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, firstName, lastName } = body;

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create user in Zitadel
    const user = await zitadelClient.createUser({
      username,
      email,
      password,
      firstName,
      lastName,
    });

    return NextResponse.json({
      success: true,
      userId: user.userId,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
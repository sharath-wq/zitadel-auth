import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { z } from 'zod';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/forgot-password
 * 
 * Initiates password reset flow by:
 * 1. Finding user by email
 * 2. Sending password reset email via Zitadel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Find user by email
    const searchResult = await zitadelClient.findUserByEmail(email);

    if (!searchResult.result || searchResult.result.length === 0) {
      // Don't reveal if user exists - return success anyway for security
      // This prevents email enumeration attacks
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    const user = searchResult.result[0];

    // Request password reset
    await zitadelClient.requestPasswordReset(user.userId);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    // Don't reveal specific errors for security
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  }
}

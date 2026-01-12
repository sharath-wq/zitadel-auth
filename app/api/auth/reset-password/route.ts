import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { z } from 'zod';

// Validation schema
const resetPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  code: z.string().min(1, 'Verification code is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

/**
 * POST /api/auth/reset-password
 * 
 * Completes password reset by setting new password with verification code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { userId, code, newPassword } = validation.data;

    // Set new password with verification code
    await zitadelClient.setPassword(userId, newPassword, code);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Password reset failed';

    // Handle specific errors
    if (
      errorMessage.includes('invalid code') ||
      errorMessage.includes('INVALID_CODE') ||
      errorMessage.includes('expired')
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please request a new password reset.' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}

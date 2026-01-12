import { NextRequest, NextResponse } from 'next/server';
import { zitadelClient } from '@/lib/zitadel/client';
import { z } from 'zod';

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  username: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, username } = validation.data;

    // Step 1: Create the user in Zitadel
    console.log('Creating user in Zitadel...');
    const createUserResponse = await zitadelClient.createUser({
      email,
      password,
      firstName,
      lastName,
      username: username || email,
    });

    console.log('User created:', createUserResponse.userId);

    // Step 2: Add user to the project (create user grant)
    // This gives the user access to the application
    try {
      console.log('Adding user to project...');
      await zitadelClient.createUserGrant(createUserResponse.userId, ["user"]);
      console.log('User added to project successfully');
    } catch (projectError) {
      // Log but don't fail - user is created, project membership is secondary
      console.error('Failed to add user to project:', projectError);
      // Optionally, you could also try adding as project member:
      // await zitadelClient.addUserToProject(createUserResponse.userId, ['PROJECT_OWNER_VIEWER']);
    }

    return NextResponse.json(
      {
        success: true,
        userId: createUserResponse.userId,
        message: 'Registration successful. Please check your email to verify your account.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific Zitadel errors
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';

    // Check for common error cases
    if (errorMessage.includes('already exists') || errorMessage.includes('ALREADY_EXISTS')) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/graph/auth';
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const RESET_TTL = 60 * 60; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const user = await findUserByEmail(email.trim());

    if (!user) {
      return NextResponse.json(
        {
          error:
            'You are not a registered user. Please contact support.',
        },
        { status: 404 }
      );
    }

    // Generate a short-lived reset token
    const resetToken = await new SignJWT({ userId: user.id, email: user.email, purpose: 'reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${RESET_TTL}s`)
      .sign(SECRET);

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    // TODO: Send email via configured email service (powerapps@yoda-tech.com)
    // For now we return the reset link in development; in production wire up your email service here
    console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);

    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link shortly.',
      // Remove the below in production:
      devResetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

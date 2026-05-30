import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, storeResetLink } from '@/lib/graph/auth';
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
        { error: 'You are not a registered user. Please contact support.' },
        { status: 404 }
      );
    }

    // Generate a short-lived signed reset token
    const resetToken = await new SignJWT({ userId: user.id, email: user.email, purpose: 'reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${RESET_TTL}s`)
      .sign(SECRET);

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    // Store reset link in SharePoint.
    // Power Automate watches for resetLink changes and emails it to the user.
    await storeResetLink(user.id, resetLink);
    console.log(`[DEV] Reset link stored in SP for ${email}: ${resetLink}`);

    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link shortly.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

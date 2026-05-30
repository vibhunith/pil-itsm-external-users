import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { updateUserPassword, clearResetLink, getStoredResetLink } from '@/lib/graph/auth';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword, confirmPassword } = await req.json();

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.' },
        { status: 400 }
      );
    }

    // Verify JWT signature + expiry (self-contained, no SP lookup needed)
    let payload: { userId: string; purpose: string };
    try {
      const result = await jwtVerify(token, SECRET);
      payload = result.payload as typeof payload;
    } catch {
      return NextResponse.json({ error: 'Reset link is invalid or has expired.' }, { status: 400 });
    }

    if (payload.purpose !== 'reset') {
      return NextResponse.json({ error: 'Invalid reset token.' }, { status: 400 });
    }

    // Check the link is still active in SharePoint (one-time use)
    const storedLink = await getStoredResetLink(payload.userId);
    if (!storedLink) {
      return NextResponse.json(
        { error: 'Reset link has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update password and clear the reset link from SharePoint (invalidates the link)
    await updateUserPassword(payload.userId, newPassword);
    await clearResetLink(payload.userId);

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

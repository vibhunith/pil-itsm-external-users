import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername } from '@/lib/graph/auth';
import { createSession } from '@/lib/auth/session';
import type { SessionUser } from '@/types/user';

const COOKIE_NAME = 'pil_itsm_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username.trim());

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    if (user.status?.toLowerCase() !== 'active') {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Direct comparison — passwords are managed by PowerApps admin tool in SharePoint
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      company: user.company,
    };

    const token = await createSession(sessionUser);

    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

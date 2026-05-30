import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/graph/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const email = String(body.email ?? '').trim();
    const company = String(body.company ?? '').trim();
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!firstName || !lastName || !email || !company || !username || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const result = await createUser({ firstName, lastName, email, company, username, password });

    if (!result.ok) {
      // 409 Conflict — duplicate username or email
      return NextResponse.json({ error: result.message }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your access request has been submitted for approval.',
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json(
      { error: 'Failed to submit your request. Please try again.' },
      { status: 500 }
    );
  }
}

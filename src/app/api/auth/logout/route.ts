import { NextResponse } from 'next/server';

const COOKIE_NAME = 'pil_itsm_session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}

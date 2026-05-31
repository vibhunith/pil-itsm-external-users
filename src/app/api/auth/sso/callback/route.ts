import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForIdToken,
  verifyIdToken,
  emailDomainAllowed,
  ALLOWED_DOMAIN,
  APP_BASE_URL,
  SSO_STATE_COOKIE,
} from '@/lib/auth/sso';
import { createSession } from '@/lib/auth/session';
import type { SessionUser } from '@/types/user';

export const runtime = 'nodejs';

const COOKIE_NAME = 'pil_itsm_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

function redirectToLogin(message: string): NextResponse {
  const url = new URL('/login', APP_BASE_URL);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return redirectToLogin(searchParams.get('error_description') ?? 'Microsoft sign-in was cancelled.');
  }
  if (!code || !state) {
    return redirectToLogin('Invalid sign-in response. Please try again.');
  }

  // Validate state + recover nonce/PKCE verifier from the stashed cookie
  const raw = req.cookies.get(SSO_STATE_COOKIE)?.value;
  if (!raw) return redirectToLogin('Your sign-in session expired. Please try again.');

  let saved: { state: string; nonce: string; codeVerifier: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return redirectToLogin('Invalid sign-in session. Please try again.');
  }
  if (saved.state !== state) {
    return redirectToLogin('Sign-in verification failed. Please try again.');
  }

  let claims;
  try {
    const idToken = await exchangeCodeForIdToken(code, saved.codeVerifier);
    claims = await verifyIdToken(idToken, saved.nonce);
  } catch (err) {
    console.error('SSO callback error:', err);
    return redirectToLogin('Microsoft sign-in failed. Please try again.');
  }

  const email = String(claims.email ?? claims.preferred_username ?? '').trim();
  if (!email || !emailDomainAllowed(email)) {
    return redirectToLogin(`Only @${ALLOWED_DOMAIN} accounts can sign in with Microsoft.`);
  }

  const fullName = String(claims.name ?? '').trim();
  const sessionUser: SessionUser = {
    id: claims.oid ?? email,
    username: claims.preferred_username ?? email,
    firstName: claims.given_name ?? fullName.split(' ')[0] ?? '',
    lastName: claims.family_name ?? fullName.split(' ').slice(1).join(' ') ?? '',
    displayName: fullName || email,
    email,
    company: 'Yoda Technologies',
  };

  const token = await createSession(sessionUser);
  const res = NextResponse.redirect(new URL('/dashboard', APP_BASE_URL));
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
  // Clear the one-time SSO state cookie
  res.cookies.set(SSO_STATE_COOKIE, '', { path: '/api/auth/sso', maxAge: 0 });
  return res;
}

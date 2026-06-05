import { NextResponse } from 'next/server';
import config from '@/config/google-calendar.json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  // Build redirect URI dynamically — must exactly match what was sent in the login step
  const url = new URL(request.url);
  const redirectUri = `${url.protocol}//${url.host}/api/auth/google/callback`;

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    const userId = searchParams.get('state') || 'default';

    if (data.error) {
      return NextResponse.json(data, { status: 400 });
    }

    // Set tokens in user-specific cookies
    const responseRedirect = NextResponse.redirect(new URL('/calendar', request.url));
    
    responseRedirect.cookies.set(`google_access_token_${userId}`, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: data.expires_in,
      path: '/',
    });

    if (data.refresh_token) {
      responseRedirect.cookies.set(`google_refresh_token_${userId}`, data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return responseRedirect;
  } catch (error) {
    console.error('Error exchanging code:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

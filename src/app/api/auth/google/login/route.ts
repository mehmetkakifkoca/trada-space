import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default';

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

  // Build redirect URI: prefer NEXT_PUBLIC_APP_URL, then x-forwarded-host (Vercel), then request.url
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const reqUrl = new URL(request.url);
  const baseUrl = appUrl
    ? appUrl.replace(/\/$/, '')
    : forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : `${reqUrl.protocol}//${reqUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    state: userId,
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.file',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  
  return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
}

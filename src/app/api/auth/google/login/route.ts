import { NextResponse } from 'next/server';
import config from '@/config/google-calendar.json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default';

  // Build the redirect URI dynamically so it works on localhost AND production
  const url = new URL(request.url);
  const redirectUri = `${url.protocol}//${url.host}/api/auth/google/callback`;

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  
  const options = {
    redirect_uri: redirectUri,
    client_id: config.clientId,
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

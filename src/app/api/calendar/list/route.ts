import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getAccessToken(userId: string) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(`google_access_token_${userId}`)?.value;
  const refreshToken = cookieStore.get(`google_refresh_token_${userId}`)?.value;

  if (!accessToken && refreshToken) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
          grant_type: 'refresh_token',
        }),
      });
      const data = await response.json();
      if (data.access_token) accessToken = data.access_token;
    } catch (e) {}
  }
  return accessToken;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default';
  const accessToken = await getAccessToken(userId);

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch calendar list' }, { status: 500 });
  }
}

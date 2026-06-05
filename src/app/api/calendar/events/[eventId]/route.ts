import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getAccessToken() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('google_access_token')?.value;
  const refreshToken = cookieStore.get('google_refresh_token')?.value;

  if (!accessToken && refreshToken) {
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
  }
  return accessToken;
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  const calendarId = searchParams.get('calendarId') || 'primary';
  const accessToken = await getAccessToken();

  if (!accessToken || !eventId) {
    return NextResponse.json({ error: 'Unauthorized or missing eventId' }, { status: 401 });
  }

  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 204) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

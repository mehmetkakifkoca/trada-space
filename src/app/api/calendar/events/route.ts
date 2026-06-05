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
  const calendarId = searchParams.get('calendarId') || 'primary';
  const userId = searchParams.get('userId') || 'default';
  const accessToken = await getAccessToken(userId);

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch from 3 months ago to show some history and plenty of future
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 3);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` + 
      new URLSearchParams({
        timeMin: timeMin.toISOString(),
        singleEvents: 'true', // Expand recurring events
        orderBy: 'startTime',
        maxResults: '2500', // Fetch a large number of events
      }), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const calendarId = searchParams.get('calendarId') || 'primary';
  const userId = searchParams.get('userId') || 'default';
  const accessToken = await getAccessToken(userId);

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { cookies } from 'next/headers';

async function getGoogleTokens(userId: string): Promise<{ accessToken?: string; refreshToken?: string }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(`google_access_token_${userId}`)?.value;
  const refreshToken = cookieStore.get(`google_refresh_token_${userId}`)?.value;
  return { accessToken, refreshToken };
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';

    const { data } = await request.json();
    if (!data) {
      return NextResponse.json({ error: 'Keine Daten zum Sichern übergeben.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `trada-space-backup-${timestamp}.json`;

    const fileMetadata: any = {
      name: fileName,
      mimeType: 'application/json',
    };

    let drive;

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
    const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';

    // 1. Try User's Personal Google Account OAuth first
    const { accessToken, refreshToken } = await getGoogleTokens(userId);
    if (accessToken || refreshToken) {
      console.log(`[Trada Backup] Authenticating with user's personal Google Account for userId: ${userId}`);
      const oauth2Client = new google.auth.OAuth2(
        oauthClientId,
        oauthClientSecret,
        redirectUri
      );
      // Pass BOTH tokens — googleapis will auto-refresh the access token using the refresh token if it has expired
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      drive = google.drive({ version: 'v3', auth: oauth2Client });

    } else {
      // 2. Fallback to Service Account
      console.log(`[Trada Backup] No personal Google connection found. Falling back to Google Service Account.`);
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!clientEmail || !privateKey) {
        return NextResponse.json({ 
          error: 'Google hesabınızı Takvim bölümünden yeniden bağlayın ve ardından tekrar deneyin.' 
        }, { status: 400 });
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
      drive = google.drive({ version: 'v3', auth });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const jsonString = JSON.stringify(data, null, 2);
    const stream = Readable.from(Buffer.from(jsonString, 'utf-8'));

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'application/json',
        body: stream,
      },
      fields: 'id, name',
    });

    console.log(`Successfully uploaded backup! Google File ID: ${response.data.id}`);

    return NextResponse.json({ 
      success: true, 
      fileId: response.data.id,
      fileName: response.data.name,
      isPersonal: !!personalAccessToken
    });
  } catch (error: any) {
    console.error('Backup API Exception:', error);
    let errorMessage = error.message || 'Google Drive bağlantısı başarısız.';
    
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('account not found')) {
      errorMessage = 'Google hesap bağlantısı süresi dolmuş. Lütfen Takvim sayfasına gidin ve Google hesabınızı yeniden bağlayın.';
    } else if (errorMessage.includes('storage quota')) {
      errorMessage = 'Google Drive depolama alanı yetersiz. Kişisel Google hesabınızı Takvim bölümünden yeniden bağlayın.';
    } else if (errorMessage.includes('insufficientPermissions') || errorMessage.includes('forbidden')) {
      errorMessage = 'Google Drive izni yetersiz. Takvim sayfasından Google hesabınızı tekrar bağlayın ve Drive iznine onay verin.';
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

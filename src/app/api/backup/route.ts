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

    // Use NEXT_PUBLIC_APP_URL on production, localhost for local dev
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/auth/google/callback`;


    let authMethod = "None";
    let tokenScopes: string[] = [];
    let tokenEmail = "";

    const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';

    // 1. Try User's Personal Google Account OAuth first
    const { accessToken, refreshToken } = await getGoogleTokens(userId);
    if (accessToken || refreshToken) {
      authMethod = `Personal OAuth (userId: ${userId})`;
      if (accessToken) {
        try {
          const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
          if (tokenInfoRes.ok) {
            const info = await tokenInfoRes.json();
            tokenScopes = info.scope ? info.scope.split(' ') : [];
            tokenEmail = info.email || "";
          } else {
            console.warn(`[Trada Backup] TokenInfo API returned status: ${tokenInfoRes.status}`);
          }
        } catch (e: any) {
          console.error('[Trada Backup] TokenInfo fetch error:', e);
        }
      }
      console.log(`[Trada Backup] Authenticating with user's personal Google Account for userId: ${userId}. Scopes: ${tokenScopes.join(', ')}`);
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
      authMethod = "Service Account";
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

      // Upload to configured folder (folder must be accessible to the authenticated user)
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (folderId) fileMetadata.parents = [folderId];


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
      isPersonal: !!accessToken
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
    
    // Add debug context to error message
    errorMessage = `${errorMessage} [Auth: ${authMethod}, Scopes: ${tokenScopes.length ? tokenScopes.join(', ') : 'none'}, Email: ${tokenEmail || 'N/A'}, Folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID || 'none'}]`;
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

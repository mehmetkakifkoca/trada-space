import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { cookies } from 'next/headers';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import path from 'path';

async function getGoogleTokens(userId: string): Promise<{ accessToken?: string; refreshToken?: string }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(`google_access_token_${userId}`)?.value;
  const refreshToken = cookieStore.get(`google_refresh_token_${userId}`)?.value;
  return { accessToken, refreshToken };
}

// GET /api/backup: Lists backups in Firebase Storage OR downloads a specific backup file
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileParam = searchParams.get('file');

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = adminStorage.bucket(bucketName);

    if (fileParam) {
      // Prevent directory traversal
      const fileName = path.basename(fileParam);
      const file = bucket.file(`backups/${fileName}`);

      const [exists] = await file.exists();
      if (!exists) {
        return NextResponse.json({ error: 'Backup-Datei nicht gefunden.' }, { status: 404 });
      }

      const [content] = await file.download();
      return new Response(content.toString('utf-8'), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    // List files
    const [files] = await bucket.getFiles({ prefix: 'backups/' });
    const backupList = files
      .filter(file => file.name !== 'backups/')
      .map(file => ({
        name: file.name.replace('backups/', ''),
        size: parseInt(file.metadata.size?.toString() || '0', 10),
        updated: String(file.metadata.updated || file.metadata.timeCreated || new Date().toISOString()),
      }))
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

    return NextResponse.json(backupList);
  } catch (error: any) {
    console.error('[Backup API GET Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/backup?file=xxx: Deletes a backup from Firebase Storage
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileParam = searchParams.get('file');

    if (!fileParam) {
      return NextResponse.json({ error: 'Dateiname fehlt.' }, { status: 400 });
    }

    const fileName = path.basename(fileParam);
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = adminStorage.bucket(bucketName);
    const file = bucket.file(`backups/${fileName}`);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Backup-Datei nicht gefunden.' }, { status: 404 });
    }

    await file.delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Backup API DELETE Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/backup: Creates a backup OR restores a database state from a backup file
export async function POST(request: Request) {
  let authMethod = "None";
  let tokenScopes: string[] = [];
  let tokenEmail = "";

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    const action = searchParams.get('action');
    const type = searchParams.get('type') || 'firebase';

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = adminStorage.bucket(bucketName);

    // 1. Check if action is RESTORE
    if (action === 'restore') {
      const fileParam = searchParams.get('file');
      if (!fileParam) {
        return NextResponse.json({ error: 'Dateiname fehlt.' }, { status: 400 });
      }

      const fileName = path.basename(fileParam);
      const file = bucket.file(`backups/${fileName}`);

      const [exists] = await file.exists();
      if (!exists) {
        return NextResponse.json({ error: 'Backup-Datei nicht gefunden.' }, { status: 404 });
      }

      const [content] = await file.download();
      const parsedData = JSON.parse(content.toString('utf-8'));

      // Overwrite global state in Firestore
      const docRef = adminDb.collection('trada_app_data').doc('global_state');
      await docRef.set(parsedData);

      return NextResponse.json({ success: true, data: parsedData });
    }

    // 2. Otherwise, check if type is FIREBASE
    if (type === 'firebase') {
      const { data } = await request.json();
      if (!data) {
        return NextResponse.json({ error: 'Keine Daten zum Sichern übergeben.' }, { status: 400 });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `trada-space-backup-${timestamp}.json`;
      const file = bucket.file(`backups/${fileName}`);

      const jsonString = JSON.stringify(data, null, 2);
      await file.save(jsonString, {
        metadata: {
          contentType: 'application/json',
        },
      });

      console.log(`[Trada Backup] Successfully uploaded backup to Firebase Storage: backups/${fileName}`);
      return NextResponse.json({
        success: true,
        fileName,
        isFirebase: true,
      });
    }

    // 3. Fallback to Google Drive backup if type is GDRIVE
    if (type === 'gdrive') {
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
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
      const redirectUri = `${baseUrl}/api/auth/google/callback`;

      const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
      const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';

      const { accessToken: rawAccessToken, refreshToken } = await getGoogleTokens(userId);
      let accessToken = rawAccessToken;
      let newAccessTokenFetched = false;

      if (!accessToken && refreshToken) {
        console.log(`[Trada Backup] Access token is missing/expired. Refreshing using refresh token...`);
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              refresh_token: refreshToken,
              client_id: oauthClientId,
              client_secret: oauthClientSecret,
              grant_type: 'refresh_token',
            }),
          });
          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            accessToken = tokenData.access_token;
            newAccessTokenFetched = true;
            console.log(`[Trada Backup] Access token refreshed successfully.`);
          } else {
            console.error(`[Trada Backup] Refresh response error:`, tokenData);
          }
        } catch (e) {
          console.error('[Trada Backup] Error refreshing access token:', e);
        }
      }

      if (accessToken || refreshToken) {
        authMethod = `Personal OAuth (userId: ${userId})`;
        if (accessToken) {
          try {
            const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
            if (tokenInfoRes.ok) {
              const info = await tokenInfoRes.json();
              tokenScopes = info.scope ? info.scope.split(' ') : [];
              tokenEmail = info.email || "";
            }
          } catch (e: any) {
            console.error('[Trada Backup] TokenInfo fetch error:', e);
          }
        }
        const oauth2Client = new google.auth.OAuth2(
          oauthClientId,
          oauthClientSecret,
          redirectUri
        );
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        drive = google.drive({ version: 'v3', auth: oauth2Client });
      } else {
        authMethod = "Service Account";
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
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        drive = google.drive({ version: 'v3', auth });
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (folderId) fileMetadata.parents = [folderId];

      const jsonString = JSON.stringify(data, null, 2);
      const stream = Readable.from(Buffer.from(jsonString, 'utf-8'));
      let response;

      try {
        response = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: 'application/json',
            body: stream,
          },
          fields: 'id, name',
        });
      } catch (createError: any) {
        const isNotFoundError = createError.message?.includes('File not found') || 
                              createError.status === 404 || 
                              createError.code === 404;
                              
        if (fileMetadata.parents && isNotFoundError) {
          console.warn(`[Trada Backup] Target folder ${folderId} was not found or is inaccessible. Falling back to root...`);
          const fallbackMetadata = { ...fileMetadata };
          delete fallbackMetadata.parents;
          
          const streamFallback = Readable.from(Buffer.from(jsonString, 'utf-8'));
          
          response = await drive.files.create({
            requestBody: fallbackMetadata,
            media: {
              mimeType: 'application/json',
              body: streamFallback,
            },
            fields: 'id, name',
          });
        } else {
          throw createError;
        }
      }

      console.log(`Successfully uploaded backup to Google Drive! File ID: ${response.data.id}`);
      const apiResponse = NextResponse.json({ 
        success: true, 
        fileId: response.data.id,
        fileName: response.data.name,
        isPersonal: !!accessToken
      });

      if (newAccessTokenFetched && accessToken) {
        apiResponse.cookies.set(`google_access_token_${userId}`, accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600,
          path: '/',
        });
      }

      return apiResponse;
    }

    return NextResponse.json({ error: 'Ungültiger Backup-Typ.' }, { status: 400 });
  } catch (error: any) {
    console.error('Backup API Exception:', error);
    let errorMessage = error.message || 'Google Drive bağlantısı başarısız.';
    
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('account not found')) {
      errorMessage = 'Google hesap bağlantısı süresi dolmuş. Lütfen Takvim sayfasına gidin und Google hesabınızı yeniden bağlayın.';
    } else if (errorMessage.includes('storage quota')) {
      errorMessage = 'Google Drive depolama alanı yetersiz. Kişisel Google hesabınızı Takvim bölümünden yeniden bağlayın.';
    } else if (errorMessage.includes('insufficientPermissions') || errorMessage.includes('forbidden')) {
      errorMessage = 'Google Drive izni yetersiz. Takvim sayfasından Google hesabınızı tekrar bağlayın ve Drive iznine onay verin.';
    }
    
    errorMessage = `${errorMessage} [Auth: ${authMethod}, Scopes: ${tokenScopes.length ? tokenScopes.join(', ') : 'none'}, Email: ${tokenEmail || 'N/A'}, Folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID || 'none'}]`;
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

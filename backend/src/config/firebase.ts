import admin from 'firebase-admin';

let firebaseInitialized = false;

export function initFirebase(): void {
  if (firebaseInitialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.warn('⚠️  Firebase credentials not fully set — Firebase auth will be unavailable');
    return;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    }
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Firebase initialization failed:', err);
  }
}

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  if (!firebaseInitialized) return null;
  try {
    return await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function getFirebaseUser(uid: string): Promise<admin.auth.UserRecord | null> {
  if (!firebaseInitialized) return null;
  try {
    return await admin.auth().getUser(uid);
  } catch {
    return null;
  }
}

export { admin };

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'session';

export async function GET(req: NextRequest) {
  try {
    const session = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Decode raw ID token payload without verification (hackathon-simple)
    const parts = session.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    const uid = payload.user_id || payload.uid || payload.sub;
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch app user from Firestore client SDK
    const db = getFirebaseFirestore();
    let appUser: any = null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      appUser = snap.exists() ? snap.data() : null;
    } catch {}

    return NextResponse.json({
      uid,
      role: appUser?.role ?? 'patient',
      user: {
        email: payload.email ?? null,
        phoneNumber: payload.phone_number ?? null,
        displayName: payload.name ?? null,
        photoURL: payload.picture ?? null,
      },
      appUser,
    });
  } catch (e: any) {
    console.error('GET /api/auth/me error', e);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'session';

type AppRole = 'patient' | 'doctor' | 'pharmacyOwner';

function decodeUid(session: string | undefined): string | null {
  if (!session) return null;
  const parts = session.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    return payload.user_id || payload.uid || payload.sub || null;
  } catch {
    return null;
  }
}

async function getUidAndRoleFromCookie(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const uid = decodeUid(session);
  if (!uid) return null;
  const db = getFirebaseFirestore();
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const role = (snap.exists() ? (snap.data() as any).role : 'patient') as AppRole;
    return { uid, role } as const;
  } catch (e) {
    console.warn('⚠️ Failed to read user doc, defaulting role to patient', e);
    return { uid, role: 'patient' as AppRole } as const;
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getUidAndRoleFromCookie(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getFirebaseFirestore();
    const collectionName = ctx.role === 'patient' ? 'patients' : ctx.role === 'doctor' ? 'doctors' : 'pharmacies';
    const snap = await getDoc(doc(db, collectionName, ctx.uid));
    const profile = snap.exists() ? snap.data() : null;
    return NextResponse.json({ role: ctx.role, profile });
  } catch (e) {
    console.error('GET /api/profile/me error', e);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getUidAndRoleFromCookie(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    const db = getFirebaseFirestore();
    const collectionName = ctx.role === 'patient' ? 'patients' : ctx.role === 'doctor' ? 'doctors' : 'pharmacies';
    const ref = doc(db, collectionName, ctx.uid);
    const now = Date.now();
    const snap = await getDoc(ref);
    const toWrite = snap.exists() ? { ...data, updatedAt: now } : { ...data, createdAt: now, updatedAt: now };
    await setDoc(ref, toWrite, { merge: true });
    return NextResponse.json({ ok: true, role: ctx.role, profile: toWrite });
  } catch (e: any) {
    console.error('PUT /api/profile/me error', e);
    return NextResponse.json({ error: e.message || 'Bad Request' }, { status: 400 });
  }
}

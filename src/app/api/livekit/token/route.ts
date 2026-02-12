import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUidAndNameFromCookie(req: NextRequest): { uid: string | null; name: string | null } {
  const token = req.cookies.get('session')?.value;
  if (!token) return { uid: null, name: null };
  const parts = token.split('.');
  if (parts.length !== 3) return { uid: null, name: null };
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    const uid = payload.user_id || payload.uid || payload.sub || null;
    const name = payload.name || payload.displayName || payload.email || null;
    return { uid, name };
  } catch {
    return { uid: null, name: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid, name } = getUidAndNameFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const search = request.nextUrl.searchParams;
    const room = search.get('room') || 'default';
    const role = (search.get('role') || 'patient').toLowerCase();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json({ error: 'LiveKit env not configured' }, { status: 500 });
    }

    const grant: VideoGrant = {
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === 'doctor',
    };

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uid,
      name: name || (role === 'doctor' ? 'Doctor' : 'Patient'),
    });
    at.addGrant(grant);

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (e) {
    console.error('LiveKit token error:', e);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}

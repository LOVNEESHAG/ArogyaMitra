import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/firestore';

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

// GET /api/doctors - list doctors for appointment booking (auth required)
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value;
    const uid = decodeUid(session);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const doctors = await userService.getUserByRole('doctor');

    // Limit fields for the booking list
    const data = doctors.map((d: any) => ({
      id: d.id || d.uid,
      displayName: d.displayName || 'Doctor',
      photoURL: d.photoURL || null,
      specialization: d.specialization || [],
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 });
  }
}

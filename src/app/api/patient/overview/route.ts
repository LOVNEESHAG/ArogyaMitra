import { NextRequest, NextResponse } from 'next/server';
import { appointmentService, healthRecordService } from '@/lib/firestore';

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

// GET /api/patient/overview - quick stats for patient dashboard
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value;
    const uid = decodeUid(session);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [appointments, records] = await Promise.all([
      appointmentService.getPatientAppointments(uid),
      healthRecordService.getPatientRecords(uid),
    ]);

    const now = new Date();
    const upcoming = appointments.filter(a => {
      const date = new Date((a as any).scheduledAt?.toDate ? (a as any).scheduledAt.toDate() : a.scheduledAt as any);
      return date >= now && a.status !== 'cancelled';
    });

    const nextAppointment = upcoming.sort((a, b) => {
      const da = new Date((a as any).scheduledAt?.toDate ? (a as any).scheduledAt.toDate() : a.scheduledAt as any).getTime();
      const db = new Date((b as any).scheduledAt?.toDate ? (b as any).scheduledAt.toDate() : b.scheduledAt as any).getTime();
      return da - db;
    })[0] || null;

    const recentRecords = records.slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        upcomingCount: upcoming.length,
        nextAppointment,
        recentRecords,
      }
    });
  } catch (error) {
    console.error('Error fetching patient overview:', error);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { appointmentService, userService } from '@/lib/firestore';
import type { Appointment } from '@/types';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Ensure Node.js runtime for Firestore SDK stability (avoid Edge streaming issues)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hackathon-simple auth: decode UID from raw ID token stored in session cookie (no verification)
function getUidFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return payload.user_id || payload.uid || payload.sub || null;
  } catch {
    return null;
  }
}

// GET /api/appointments - Get appointments for current user
export async function GET(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let appointments: Appointment[] = [];

    try {
      if (role === 'patient') {
        appointments = await appointmentService.getPatientAppointments(uid);
      } else if (role === 'doctor') {
        const appointmentDate = date ? new Date(date) : undefined;
        appointments = await appointmentService.getDoctorAppointments(uid, appointmentDate);
        // Enrich with patient names/photos for doctor view
        const ids = Array.from(new Set(appointments.map(a => (a as any).patientId).filter(Boolean)));
        if (ids.length) {
          const profiles = await Promise.all(ids.map(id => userService.getById(id)));
          const map = new Map<string, any>();
          profiles.forEach((p, idx) => { if (p) map.set(ids[idx], p); });
          appointments = appointments.map(a => {
            const p = map.get((a as any).patientId);
            return {
              ...a,
              patientName: p?.displayName || p?.name || p?.fullName || p?.email || (a as any).patientId,
              patientPhoto: p?.photoURL || p?.avatarUrl || null,
            } as any;
          });
        }
      }
    } catch (firestoreError) {
      console.warn('⚠️ Failed to fetch appointments from Firestore:', firestoreError);
      // Return empty array as fallback
      appointments = [];
    }

    // Filter by status if provided
    if (status) {
      appointments = appointments.filter(apt => apt.status === status);
    }

    return NextResponse.json({ success: true, data: appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// POST /api/appointments - Create new appointment
export async function POST(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const appointmentData: Omit<Appointment, 'id'> = {
      patientId: uid,
      doctorId: body.doctorId,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration || 30,
      type: body.type || 'video',
      status: 'scheduled',
      reasonForVisit: body.reasonForVisit,
      symptoms: body.symptoms || [],
      urgency: body.urgency || 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const appointmentId = await appointmentService.bookAppointment(appointmentData);
    
    return NextResponse.json({ 
      success: true, 
      data: { id: appointmentId, ...appointmentData } 
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    if (error instanceof Error && error.message.includes('not available')) {
      return NextResponse.json(
        { error: 'Time slot not available' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

// PUT /api/appointments - Update appointment
export async function PUT(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    await appointmentService.updateAppointmentStatus(id, status, notes);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// PATCH /api/appointments - Reschedule or cancel appointment
export async function PATCH(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, id } = body as { action: 'reschedule' | 'cancel'; id: string };

    if (!id || !action) {
      return NextResponse.json({ error: 'Appointment ID and action are required' }, { status: 400 });
    }

    if (action === 'reschedule') {
      const { newScheduledAt, duration } = body as { newScheduledAt: string; duration?: number };
      if (!newScheduledAt) {
        return NextResponse.json({ error: 'newScheduledAt is required for reschedule' }, { status: 400 });
      }
      const newStart = new Date(newScheduledAt);
      await appointmentService.rescheduleAppointment(id, newStart, duration || 30, uid);
      return NextResponse.json({ success: true });
    }

    if (action === 'cancel') {
      const { reason } = body as { reason?: string };
      await appointmentService.cancelAppointment(id, reason || 'Cancelled', uid);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error modifying appointment:', error);
    if (error instanceof Error && error.message.includes('Time slot not available')) {
      return NextResponse.json(
        { error: 'Time slot not available' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to modify appointment' },
      { status: 500 }
    );
  }
}


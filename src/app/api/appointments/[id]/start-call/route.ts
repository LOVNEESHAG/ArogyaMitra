import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { appointmentAuditService } from '@/lib/firestore';

// POST /api/appointments/{id}/start-call - Generate Jitsi video room for appointment
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Decode UID from raw ID token stored in session cookie (no verification)
    const token = request.cookies.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parts = token.split('.');
    if (parts.length !== 3) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    const userId = payload.user_id || payload.uid || payload.sub;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { id: appointmentId } = await context.params;
    const db = getFirebaseFirestore();
    const body = await request.json().catch(() => ({}));
    const demoMode = request.nextUrl.searchParams.get('demo') === 'true' || body?.demo === true || body?.force === true;
    const callType: 'video' | 'voice' = (body?.callType === 'voice' ? 'voice' : 'video');
    
    // Fetch the appointment
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (!appointmentSnap.exists()) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    
    const appointmentData = appointmentSnap.data();
    
    // Verify user is either the doctor or patient for this appointment
    if (appointmentData.doctorId !== userId && appointmentData.patientId !== userId) {
      return NextResponse.json({ error: 'Access denied. You are not part of this appointment.' }, { status: 403 });
    }
    
    // If a call is already in progress, return the existing room details to prevent duplicates
    if (appointmentData.status === 'in-progress' && appointmentData.callRoomId) {
      const existingRoomId = appointmentData.callRoomId as string;
      const existingStart = (appointmentData.callStartTime as any)?.toDate
        ? (appointmentData.callStartTime as any).toDate()
        : appointmentData.callStartTime || new Date();
      return NextResponse.json({
        success: true,
        appointmentId,
        roomId: existingRoomId,
        jitsiUrl: `https://meet.jit.si/${existingRoomId}`,
        callStartTime: existingStart,
        callType: appointmentData.callType || callType,
        reused: true
      });
    }
    
    // Check if appointment is in correct status (unless demo mode)
    if (!demoMode) {
      const allowedStatuses = new Set(['scheduled', 'confirmed']);
      if (!allowedStatuses.has(appointmentData.status)) {
        return NextResponse.json({ error: 'Appointment must be scheduled or confirmed to start a call' }, { status: 400 });
      }
    }

    // Only teleconsultations can start a call (unless demo mode)
    if (!demoMode && appointmentData.type !== 'video') {
      return NextResponse.json({ error: 'Only video appointments can start a call' }, { status: 400 });
    }
    
    // Generate a unique room ID for Jitsi Meet
    const roomId = `arogyamitra-${appointmentId}-${Date.now()}`;
    const callStartTime = new Date();
    
    // Update appointment with call information
    await updateDoc(appointmentRef, {
      callType,
      callRoomId: roomId,
      callStartTime: callStartTime,
      status: 'in-progress',
      updatedAt: new Date()
    });

    // Audit trail
    try {
      await appointmentAuditService.record({
        appointmentId,
        userId,
        action: 'status_change',
        details: { event: 'start_call', callType, callRoomId: roomId, demoMode },
        previous: { status: 'scheduled' },
        next: { status: 'in-progress', callType, callRoomId: roomId, callStartTime }
      });
    } catch {}
    
    // Jitsi Meet room URL
    const jitsiUrl = `https://meet.jit.si/${roomId}`;
    
    return NextResponse.json({
      success: true,
      appointmentId,
      roomId,
      jitsiUrl,
      callStartTime,
      callType,
      demoMode,
      message: 'Video call room created successfully'
    });
    
  } catch (error) {
    console.error('Error starting video call:', error);
    return NextResponse.json({ 
      error: 'Failed to start video call' 
    }, { status: 500 });
  }
}

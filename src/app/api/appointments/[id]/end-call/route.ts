import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { appointmentAuditService } from '@/lib/firestore';

// POST /api/appointments/{id}/end-call - End call and track duration
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
    
    // Check if appointment has an active call
    if (!appointmentData.callStartTime || appointmentData.status !== 'in-progress') {
      return NextResponse.json({ error: 'No active call found for this appointment' }, { status: 400 });
    }
    
    const callEndTime = new Date();
    const callStartTime = appointmentData.callStartTime.toDate ? appointmentData.callStartTime.toDate() : new Date(appointmentData.callStartTime);
    const callDurationMs = callEndTime.getTime() - callStartTime.getTime();
    const callDurationMinutes = Math.round(callDurationMs / 60000); // Convert to minutes
    
    // Update appointment with end call information
    await updateDoc(appointmentRef, {
      callEndTime: callEndTime,
      callDuration: callDurationMinutes,
      status: 'completed',
      updatedAt: new Date()
    });

    // Audit trail
    try {
      await appointmentAuditService.record({
        appointmentId,
        userId,
        action: 'status_change',
        details: { event: 'end_call' },
        previous: { status: 'in-progress' },
        next: { status: 'completed', callEndTime, callDuration: callDurationMinutes }
      });
    } catch {}
    
    return NextResponse.json({
      success: true,
      appointmentId,
      callStartTime,
      callEndTime,
      callDurationMinutes,
      message: `Call ended successfully. Duration: ${callDurationMinutes} minutes`
    });
    
  } catch (error) {
    console.error('Error ending video call:', error);
    return NextResponse.json({ 
      error: 'Failed to end video call' 
    }, { status: 500 });
  }
}

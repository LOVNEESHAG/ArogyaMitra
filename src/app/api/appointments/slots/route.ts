import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const doctorId = searchParams.get('doctorId');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

    const date = dateStr ? new Date(dateStr) : new Date();
    const slots = await appointmentService.generateSlots(doctorId, date);

    // Serialize dates to ISO for JSON transport
    const data = slots.map(s => ({ start: s.start.toISOString(), end: s.end.toISOString() }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error generating slots:', error);
    return NextResponse.json(
      { error: 'Failed to generate slots' },
      { status: 500 }
    );
  }
}

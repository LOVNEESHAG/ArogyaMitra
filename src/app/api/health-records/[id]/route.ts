import { NextRequest, NextResponse } from 'next/server';
import { healthRecordService } from '@/lib/firestore';

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

// DELETE /api/health-records/{id} - Delete uploaded document (owner only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: recordId } = await context.params;
    if (!recordId) return NextResponse.json({ error: 'Record ID required' }, { status: 400 });

    const record = await healthRecordService.getById(recordId);
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Simple ownership check (hackathon): only the patient can delete their own record
    if ((record as any).patientId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete Firestore document
    await healthRecordService.delete(recordId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting health record:', error);
    return NextResponse.json({ error: 'Failed to delete health record' }, { status: 500 });
  }
}

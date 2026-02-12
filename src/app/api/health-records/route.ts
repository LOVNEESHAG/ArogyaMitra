import { NextRequest, NextResponse } from 'next/server';
import { appointmentService, healthRecordService } from '@/lib/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
type AppRole = 'patient' | 'doctor' | 'pharmacyOwner' | 'admin';
import type { HealthRecord } from '@/types';

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

// GET /api/health-records - Get health records for current user
export async function GET(request: NextRequest) {
  try {
    // Use server-side session authentication
    const session = request.cookies.get('session')?.value;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Decode raw ID token payload without verification (hackathon-simple)
    const parts = session.split('.');
    if (parts.length !== 3) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    const uid = payload.user_id || payload.uid || payload.sub;
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Try to get user role from Firestore, but fallback if unavailable
    const db = getFirebaseFirestore();
    let appUser: { role: AppRole } | null = null;
    try {
      const snap = await (await import('firebase/firestore')).getDoc(
        (await import('firebase/firestore')).doc(db, 'users', uid)
      );
      appUser = snap.exists() ? (snap.data() as any) : null;
    } catch (error) {
      console.warn('⚠️ Failed to read from Firestore, using fallback role:', error);
      appUser = { role: 'patient' as AppRole };
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || appUser?.role;
    const type = searchParams.get('type');

    let records: HealthRecord[] = [];

    try {
      if (role === 'patient') {
        records = await healthRecordService.getPatientRecords(uid);
      } else if (role === 'doctor') {
        const patientIds = await appointmentService.getDoctorPatientIds(uid);
        const [patientRecords, sharedRecords] = await Promise.all([
          healthRecordService.getRecordsForPatients(patientIds),
          healthRecordService.getSharedRecords(uid)
        ]);
        const dedup = new Map<string, HealthRecord>();
        [...patientRecords, ...sharedRecords].forEach((record) => {
          if (record.id) dedup.set(record.id, record);
        });
        records = Array.from(dedup.values());

        const db = getFirebaseFirestore();
        const uniquePatientIds = Array.from(new Set(records.map((rec: any) => rec.patientId).filter(Boolean)));
        const patientNameEntries = await Promise.all(uniquePatientIds.map(async (patientId) => {
          try {
            const firestore = await import('firebase/firestore');
            const patientRef = firestore.doc(db, 'patients', patientId);
            const patientSnap = await firestore.getDoc(patientRef);
            const sourceData = patientSnap.exists() ? patientSnap.data() : null;
            if (sourceData) {
              const name = (sourceData as any).fullName || (sourceData as any).name || (sourceData as any).displayName;
              if (name) return [patientId, name] as const;
            }
            const userRef = firestore.doc(db, 'users', patientId);
            const userSnap = await firestore.getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data() as any;
              const name = userData.fullName || userData.name || userData.displayName || userData.email || 'Patient';
              return [patientId, name] as const;
            }
          } catch (error) {
            console.warn('⚠️ Failed to load patient profile for records view:', error);
          }
          return [patientId, 'Patient'] as const;
        }));
        const patientNameMap = new Map<string, string>(patientNameEntries);

        records = records.map((record: any) => ({
          ...record,
          patientName: patientNameMap.get(record.patientId) || 'Patient'
        }));
      }
    } catch (firestoreError) {
      console.warn('⚠️ Failed to fetch health records from Firestore:', firestoreError);
      // Return empty array as fallback
      records = [];
    }

    // Filter by type if provided
    if (type) {
      records = records.filter(record => record.type === type);
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching health records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health records' },
      { status: 500 }
    );
  }
}

// POST /api/health-records - Create new health record
export async function POST(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const recordRaw = formData.get('data');
    if (!recordRaw || typeof recordRaw !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const recordData = JSON.parse(recordRaw);

    const fileUrl: string | undefined = recordData?.fileUrl;
    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl required. Upload to Cloudinary first.' }, { status: 400 });
    }

    const fileName: string = recordData?.fileName || 'document';
    const fileSize: number = Number(recordData?.fileSize) || 0;
    const mimeType: string = recordData?.mimeType || 'application/octet-stream';

    const recordDateRaw = recordData?.recordDate;
    const recordDate = recordDateRaw ? new Date(recordDateRaw) : new Date();

    const healthRecord: Omit<HealthRecord, 'id'> = {
      patientId: uid,
      type: recordData?.type || 'other',
      title: recordData?.title || fileName,
      description: recordData?.description || '',
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      uploadedAt: new Date(),
      recordDate,
      doctorId: recordData?.doctorId ?? null,
      labName: recordData?.labName ?? null,
      isShared: false,
      sharedWith: Array.isArray(recordData?.sharedWith) ? recordData.sharedWith : [],
      tags: Array.isArray(recordData?.tags) ? recordData.tags : [],
      metadata: recordData?.metadata ?? {}
    };

    const recordId = await healthRecordService.create(healthRecord);
    
    return NextResponse.json({ 
      success: true, 
      data: { id: recordId, ...healthRecord } 
    });
  } catch (error) {
    console.error('Error creating health record:', error);
    return NextResponse.json(
      { error: 'Failed to create health record' },
      { status: 500 }
    );
  }
}

// PUT /api/health-records/share - Share health record with doctors
export async function PUT(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { recordId, doctorIds } = body;

    if (!recordId || !doctorIds || !Array.isArray(doctorIds)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    await healthRecordService.shareRecord(recordId, doctorIds);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sharing health record:', error);
    return NextResponse.json(
      { error: 'Failed to share health record' },
      { status: 500 }
    );
  }
}

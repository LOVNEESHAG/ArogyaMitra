import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { collection, getDocs, query, where, and, doc, getDoc } from 'firebase/firestore';

// GET /api/patients/{id}/records - Doctor access to patient records (with appointment validation)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = request.cookies.get('session')?.value;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Decode UID from raw ID token stored in session cookie (no verification)
    const parts = session.split('.');
    if (parts.length !== 3) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    const doctorId = payload.user_id || payload.uid || payload.sub;
    if (!doctorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Verify the current user is a doctor via users collection
    const db = getFirebaseFirestore();
    const userSnap = await getDoc(doc(db, 'users', doctorId));
    const role = userSnap.exists() ? (userSnap.data() as any).role : null;
    if (role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can access patient records' }, { status: 403 });
    }

    const patientId = params.id;
    
    // First, verify that the doctor has an appointment with this patient
    const appointmentsRef = collection(db, 'appointments');
    const appointmentQuery = query(
      appointmentsRef,
      and(
        where('doctorId', '==', doctorId),
        where('patientId', '==', patientId),
        where('status', 'in', ['scheduled', 'completed', 'in-progress'])
      )
    );
    
    const appointmentSnapshot = await getDocs(appointmentQuery);
    if (appointmentSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Access denied. You can only view records for patients with whom you have appointments.' 
      }, { status: 403 });
    }

    // If appointment exists, fetch the patient's health records
    const recordsRef = collection(db, 'healthRecords');
    const recordsQuery = query(recordsRef, where('patientId', '==', patientId));
    const recordsSnapshot = await getDocs(recordsQuery);
    
    const records = recordsSnapshot.docs.map(snap => {
      const data = snap.data() as any;
      const { fileUrl, downloadURL, ...rest } = data || {};
      return {
        id: snap.id,
        ...rest,
        hasFile: !!fileUrl,
      } as any;
    });

    return NextResponse.json({ 
      patientId,
      records,
      message: `Found ${records.length} health records for patient`
    });
    
  } catch (error) {
    console.error('Error fetching patient records:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch patient records' 
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/firestore';

export type ApiPharmacy = {
  id: string;
  displayName: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  } | null;
  phone: string | null;
};

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

// GET /api/pharmacies - list pharmacies (auth required)
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value;
    const uid = decodeUid(session);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pharmacies = await userService.getUserByRole('pharmacyOwner');

    const data: ApiPharmacy[] = pharmacies.map((p: any) => {
      const rawAddress = p.address;
      const normalizedAddress = typeof rawAddress === 'string'
        ? { street: rawAddress }
        : (rawAddress && typeof rawAddress === 'object')
          ? {
              street: rawAddress.street,
              city: rawAddress.city,
              state: rawAddress.state,
              pincode: rawAddress.pincode,
              country: rawAddress.country,
            }
          : null;

      return {
        id: p.id || p.uid,
        displayName: p.pharmacyName || p.displayName || 'Pharmacy',
        address: normalizedAddress,
        phone: p.contactNumber || p.phone || null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    return NextResponse.json({ error: 'Failed to fetch pharmacies' }, { status: 500 });
  }
}

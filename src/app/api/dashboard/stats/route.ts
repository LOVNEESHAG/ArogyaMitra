import { NextRequest, NextResponse } from 'next/server';
import { userService, appointmentService, healthRecordService, inventoryService } from '@/lib/firestore';

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

// GET /api/dashboard/stats - simple role-aware counts for dashboard
export async function GET(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await userService.getById(uid);
    const role = (profile as any)?.role || 'patient';

    const now = new Date();

    if (role === 'patient') {
      const [appointments, records] = await Promise.all([
        appointmentService.getPatientAppointments(uid),
        healthRecordService.getPatientRecords(uid)
      ]);
      const upcomingCount = appointments.filter(a => {
        const d = (a as any).scheduledAt?.toDate ? (a as any).scheduledAt.toDate() : new Date((a as any).scheduledAt);
        return d >= now && a.status !== 'cancelled';
      }).length;
      return NextResponse.json({
        success: true,
        data: {
          role,
          totalAppointments: appointments.length,
          upcomingAppointments: upcomingCount,
          totalRecords: records.length,
        }
      });
    }

    if (role === 'doctor') {
      const [appointments, sharedRecords] = await Promise.all([
        appointmentService.getDoctorAppointments(uid),
        healthRecordService.getSharedRecords(uid)
      ]);
      const today = new Date();
      today.setHours(0,0,0,0);
      const endToday = new Date(today);
      endToday.setHours(23,59,59,999);
      const todaysAppointments = appointments.filter(a => {
        const d = (a as any).scheduledAt?.toDate ? (a as any).scheduledAt.toDate() : new Date((a as any).scheduledAt);
        return d >= today && d <= endToday && a.status !== 'cancelled';
      }).length;
      return NextResponse.json({
        success: true,
        data: {
          role,
          totalAppointments: appointments.length,
          todaysAppointments,
          sharedRecords: sharedRecords.length
        }
      });
    }

    if (role === 'pharmacyOwner') {
      const [inventory, lowStock] = await Promise.all([
        inventoryService.getPharmacyInventory(uid),
        inventoryService.getLowStockItems(uid)
      ]);
      return NextResponse.json({
        success: true,
        data: {
          role,
          inventoryCount: inventory.length,
          lowStockCount: lowStock.length,
        }
      });
    }

    // admin
    const users = await userService.getAll();
    const counts = {
      total: users.length,
      patients: users.filter((u: any) => u.role === 'patient').length,
      doctors: users.filter((u: any) => u.role === 'doctor').length,
      pharmacyOwners: users.filter((u: any) => u.role === 'pharmacyOwner').length,
      admins: users.filter((u: any) => u.role === 'admin').length,
    };
    return NextResponse.json({ success: true, data: { role, ...counts } });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

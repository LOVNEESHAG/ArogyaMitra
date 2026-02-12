import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/firestore';
import type { UserRole } from '@/types';

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

// GET /api/users - Get users (admin only)
export async function GET(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user is admin
    const userProfile = await userService.getById(uid);
    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') as UserRole;
    const status = searchParams.get('status');

    let users;

    if (role && role !== null) {
      users = await userService.getUserByRole(role);
    } else {
      // Get all users
      users = await userService.getAll();
    }

    // Filter by status if provided
    if (status) {
      users = users.filter(user => {
        if (status === 'verified') return user.isVerified;
        if (status === 'pending') return !user.isVerified;
        if (status === 'active') return user.isActive;
        if (status === 'suspended') return !user.isActive;
        return true;
      });
    }

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PUT /api/users - Update user (admin only)
export async function PUT(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user is admin
    const userProfile = await userService.getById(uid);
    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, role } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action required' }, { status: 400 });
    }

    switch (action) {
      case 'verify':
        await userService.verifyUser(userId);
        break;
      case 'suspend':
        await userService.suspendUser(userId);
        break;
      case 'activate':
        await userService.update(userId, { isActive: true } as any);
        break;
      case 'changeRole':
        if (!role) {
          return NextResponse.json({ error: 'Role required for role change' }, { status: 400 });
        }
        await userService.updateUserRole(userId, role);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// GET /api/users/stats - Get user statistics (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user is admin
    const userProfile = await userService.getById(uid);
    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users for statistics
    const allUsers = await userService.getAll();

    const stats = {
      total: allUsers.length,
      patients: allUsers.filter(u => u.role === 'patient').length,
      doctors: allUsers.filter(u => u.role === 'doctor').length,
      pharmacies: allUsers.filter(u => u.role === 'pharmacyOwner').length,
      admins: allUsers.filter(u => u.role === 'admin').length,
      verified: allUsers.filter(u => u.isVerified).length,
      pending: allUsers.filter(u => !u.isVerified).length,
      active: allUsers.filter(u => u.isActive).length,
      suspended: allUsers.filter(u => !u.isActive).length,
      newThisMonth: allUsers.filter(u => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return new Date(u.createdAt) > oneMonthAgo;
      }).length
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    );
  }
}

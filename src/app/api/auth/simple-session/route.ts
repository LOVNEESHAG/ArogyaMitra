import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Temporary simplified auth for testing
export async function POST(req: NextRequest) {
  try {
    const { idToken, role } = await req.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

    // For now, just set a simple session cookie with the idToken
    // This bypasses Firebase Admin SDK temporarily
    const res = NextResponse.json({ 
      ok: true, 
      message: 'Temporary auth - Admin SDK bypassed',
      role: role || 'patient'
    });

    res.cookies.set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res;
  } catch (e: any) {
    console.error('POST /api/auth/simple-session error', e);
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return res;
  } catch (e: any) {
    console.error('DELETE /api/auth/simple-session error', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}


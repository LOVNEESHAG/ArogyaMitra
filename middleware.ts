import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Protect dashboard routes: if no session cookie, redirect to /login
export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const hasSession = Boolean(cookies.get('session')?.value);

  // Redirect unauthenticated users away from dashboard
  if (nextUrl.pathname.startsWith('/dashboard') && !hasSession) {
    const loginUrl = new URL('/login', req.url);
    const nextParam = nextUrl.pathname + (nextUrl.search || '');
    loginUrl.searchParams.set('next', nextParam);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login
  if (nextUrl.pathname === '/login' && hasSession) {
    const dashUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};

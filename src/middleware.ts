import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { firebaseConfig } from '@/firebase/config';
import type { RoleString } from '@/shared/types/roles';

// ─── Route configuration ──────────────────────────────────────────────────────

/** Maps each protected path prefix to the roles allowed to access it. */
const ROUTE_RULES: Array<{ prefix: string; allowed: RoleString[] }> = [
  { prefix: '/admin', allowed: ['admin'] },
];

/** Auth-flow paths: authenticated users are redirected away from these. */
const AUTH_PATHS = ['/login', '/signup', '/forgot-password'];

/** Landing dashboard per role after a successful login / root redirect. */
const ROLE_DASHBOARDS: Record<RoleString, string> = {
  admin: '/admin',
  professor: '/login',
  student: '/login',
};

const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? firebaseConfig.projectId;

const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

// ─── Token helpers ────────────────────────────────────────────────────────────

function getToken(req: NextRequest): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  // 2. Firebase App Hosting / session cookie
  return req.cookies.get('__session')?.value ?? null;
}

async function verifyToken(
  token: string,
): Promise<{ uid: string; role: RoleString | null } | null> {
  if (!FIREBASE_PROJECT_ID) return null;

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
    });

    const rawRole = payload['role'];
    const role: RoleString | null =
      rawRole === 'admin' || rawRole === 'professor' || rawRole === 'student'
        ? rawRole
        : null;

    const uid =
      typeof payload['user_id'] === 'string'
        ? payload['user_id']
        : typeof payload.sub === 'string'
          ? payload.sub
          : '';

    if (!uid) return null;

    return { uid, role };
  } catch {
    // Invalid / expired token — treat as unauthenticated.
    return null;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  const token    = getToken(req);
  const verified = token ? await verifyToken(token) : null;

  // ── 1. Root → redirect by role ───────────────────────────────────────────
  if (pathname === '/') {
    if (!verified?.role || verified.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.redirect(
      new URL(ROLE_DASHBOARDS[verified.role], req.url),
    );
  }

  // ── 2. Auth paths → send authenticated users to their dashboard ──────────
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPath) {
    if (verified?.role === 'admin') {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARDS[verified.role], req.url),
      );
    }
    return NextResponse.next();
  }

  // ── 3. Protected paths → enforce role ────────────────────────────────────
  const rule = ROUTE_RULES.find(({ prefix }) => pathname.startsWith(prefix));
  if (rule) {
    if (!verified) {
      // Preserve intended destination for post-login redirect
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!verified.role || !rule.allowed.includes(verified.role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Excludes: _next/static, _next/image, favicon, api routes, and public assets.

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/unauthorized',
  ],
};

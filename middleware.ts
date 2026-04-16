import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  // Vercel上の環境変数を読み込む（設定してない時はデフォルト値）
  const AUTH_USER = process.env.BASIC_AUTH_USER || 'admin';
  const AUTH_PASS = process.env.BASIC_AUTH_PASSWORD || 'password123';

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    if (user === AUTH_USER && pwd === AUTH_PASS) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Auth Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  // すべてのページに適用する設定だお
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
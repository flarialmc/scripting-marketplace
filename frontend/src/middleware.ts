import { NextResponse } from 'next/server';

export function middleware() {
  const response = NextResponse.next();

  // Add CSP headers
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' https://1klcjc8um5aq.flarial.xyz; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
  );

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', 'https://1klcjc8um5aq.flarial.xyz');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export const config = {
  matcher: '/:path*',
};
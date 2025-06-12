import { NextResponse } from 'next/server';

export function middleware() {
  const response = NextResponse.next();

 
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "connect-src 'self' https://1klcjc8um5aq.flarial.xyz https://cloudflareinsights.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "style-src-attr 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src 'self'"
    ].join('; ')
  );

 
  response.headers.set('Access-Control-Allow-Origin', 'https://1klcjc8um5aq.flarial.xyz');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export const config = {
  matcher: '/:path*',
};
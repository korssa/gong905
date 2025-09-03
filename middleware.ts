import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 정적 파일 요청은 middleware를 거치지 않도록 처리
  const { pathname } = request.nextUrl;
  
  // manifest.json과 정적 파일들을 명시적으로 허용
  if (pathname === '/manifest.json' || 
      pathname === '/favicon.ico' || 
      pathname === '/robots.txt' || 
      pathname === '/sitemap.xml' ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      /\.(json|ico|png|jpg|jpeg|gif|svg|css|js|woff2)$/.test(pathname)) {
    return NextResponse.next();
  }
  
  // 나머지 요청에만 middleware 로직 적용
  return NextResponse.next();
}

// 더 명확한 matcher 설정
export const config = {
  matcher: [
    // 모든 요청에 middleware 적용하되, 함수 내에서 정적 파일 처리
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

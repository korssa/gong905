import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 모든 요청을 그대로 통과시킴 (정적 파일 차단 없음)
  return NextResponse.next();
}

// 정적 파일을 완전히 제외하는 matcher
export const config = {
  matcher: [
    // 정적 파일과 API를 완전히 제외
    '/((?!_next|api|manifest.json|favicon.ico|robots.txt|sitemap.xml|.*\\.(json|ico|png|jpg|jpeg|gif|svg|css|js|woff2)$).*)',
  ],
};

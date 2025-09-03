import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 모든 요청을 그대로 통과시킴 (정적 파일 차단 없음)
  return NextResponse.next();
}

// Next.js 호환 matcher - 정적 파일과 API를 제외
export const config = {
  matcher: [
    // 페이지 라우트만 포함 (정적 파일 제외)
    '/((?!_next|api|manifest.json|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

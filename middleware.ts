import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 기본 미들웨어 로직 (필요한 경우)
  // 현재는 정적 파일 접근만 허용하도록 설정
  
  return NextResponse.next();
}

// 정적 파일들을 middleware에서 제외
export const config = {
  matcher: [
    // /_next, /api, 정적 파일들을 제외한 모든 요청에만 middleware 적용
    "/((?!_next|api|manifest.json|favicon.ico|logo.png|robots.txt|sitemap.xml|.*\\.(?:json|ico|png|jpg|jpeg|gif|svg|css|js)$).*)"
  ],
};

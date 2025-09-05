import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

// 캐시 설정
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// 상수
const EVENTS_FILENAME = 'events.json';
const LOCAL_EVENTS_PATH = path.join(process.cwd(), 'data', 'events.json');

// 메모리 폴백
let memoryEvents: string[] = [];

// 로컬 파일 읽기
async function readLocalFile(): Promise<string[] | null> {
  try {
    const data = await fs.readFile(LOCAL_EVENTS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// GET: Events 앱 목록 조회
export async function GET() {
  try {
    // 1) 로컬 파일에서 읽기 (개발/배포 환경 모두)
    try {
      const local = await readLocalFile();
      if (local && local.length > 0) {
        return NextResponse.json(local);
      }
    } catch (error) {
      // 로컬 파일 읽기 실패 무시
    }

    // 2) Vercel 환경에서는 Blob에서 읽기
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        const { blobs } = await list({ prefix: EVENTS_FILENAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const json = await response.json();
            const data = Array.isArray(json) ? json : [];
            
            memoryEvents = data;
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        // Blob 조회 실패 무시
      }
    }

    // 3) 메모리에서 읽기
    if (memoryEvents.length > 0) {
      return NextResponse.json(memoryEvents);
    }

    // 4) 모든 방법 실패 시 빈 배열
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Events 앱 목록 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newEvents = Array.isArray(body?.events) ? body.events : [];

    if (!Array.isArray(newEvents)) {
      return NextResponse.json(
        { success: false, error: 'events 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 데이터 로드
    let currentEvents: string[] = [];
    try {
      const { blobs } = await list({ prefix: EVENTS_FILENAME, limit: 1 });
      if (blobs && blobs.length > 0) {
        const latest = blobs[0];
        const response = await fetch(latest.url, { cache: 'no-store' });
        if (response.ok) {
          currentEvents = await response.json();
        }
      }
    } catch (error) {
      // 기존 데이터 로드 실패, 메모리 사용
      currentEvents = memoryEvents;
    }

    // 병합 (중복 제거)
    const mergedEvents = Array.from(new Set([...currentEvents, ...newEvents]));
    
    // Blob에 저장 (재시도 로직)
    let blobSaved = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await put(EVENTS_FILENAME, JSON.stringify(mergedEvents, null, 2), {
          access: 'public',
          addRandomSuffix: false
        });
        blobSaved = true;
        break;
      } catch (error) {
        if (attempt === 3) {
          // 모든 시도 실패, 메모리 폴백 사용
        }
      }
    }

    // 메모리 업데이트
    memoryEvents = mergedEvents;

    return NextResponse.json({
      success: true,
      count: mergedEvents.length,
      storage: blobSaved ? 'blob' : 'memory'
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Events 저장에 실패했습니다.' 
    }, { status: 500 });
  }
}
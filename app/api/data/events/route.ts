import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

// Events 앱 정보만 저장하는 전용 파일
const EVENTS_FILENAME = 'events.json';
const LOCAL_EVENTS_PATH = path.join(process.cwd(), 'data', 'events.json');

// Vercel 환경에서의 임시 메모리 저장소 (Blob 실패 시 폴백)
let memoryEvents: string[] = [];

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_EVENTS_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_EVENTS_PATH);
  } catch {
    await fs.writeFile(LOCAL_EVENTS_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<string[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_EVENTS_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(events: string[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_EVENTS_PATH, JSON.stringify(events, null, 2));
}

// GET: Blob 또는 로컬에서 Events 앱 정보 반환
export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    if (isProd) {
      // 1) Blob에서 최신 JSON 파일 시도
      try {
        const { blobs } = await list({ prefix: EVENTS_FILENAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // 최신순 정렬 (uploadedAt 기준)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? json : [];
            
            // 메모리와 동기화
            memoryEvents = [...data];
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        console.warn('[Events Blob] 조회 실패:', error);
      }

      // 2) 메모리 폴백
      if (memoryEvents.length > 0) {
        return NextResponse.json(memoryEvents);
      }

      // 3) 모든 소스에서 데이터가 없으면 기본값
      return NextResponse.json([]);
    }

    // 개발 환경: 로컬 파일
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Events 앱 정보를 받아 Blob(또는 로컬)에 저장
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const events = Array.isArray(body) ? body : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob 저장 강화 - 재시도 로직 추가
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Events Blob] 저장 시도 ${attempt}/3`);
          await put(EVENTS_FILENAME, JSON.stringify(events, null, 2), {
            access: 'public',
            contentType: 'application/json; charset=utf-8',
            addRandomSuffix: false,
          });
          console.log(`[Events Blob] 저장 성공 (시도 ${attempt})`);
          blobSaved = true;
          break;
        } catch (error) {
          console.error(`[Events Blob] 저장 실패 (시도 ${attempt}):`, error);
          if (attempt === 3) {
            console.error('[Events Blob] 모든 시도 실패, 메모리 폴백 사용');
          }
        }
      }
      
      // 메모리도 항상 업데이트
      memoryEvents = [...events];
      
      if (blobSaved) {
        return NextResponse.json({ success: true, storage: 'blob' });
      } else {
        return NextResponse.json({ 
          success: true, 
          storage: 'memory', 
          warning: 'Blob save failed after 3 attempts; using in-memory fallback' 
        });
      }
    }

    // 로컬 파일 저장
    await writeToLocal(events);
    return NextResponse.json({ success: true, storage: 'local' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save events apps' }, { status: 500 });
  }
}

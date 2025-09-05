import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

// Events ???�보�??�?�하???�용 ?�일
const EVENTS_FILENAME = 'events.json';
const LOCAL_EVENTS_PATH = path.join(process.cwd(), 'data', 'events.json');

// Vercel ?�경?�서???�시 메모�??�?�소 (Blob ?�패 ???�백)
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

// GET: 로컬 ?�일 ?�선, Blob ?�백?�로 Events ???�보 반환
export async function GET() {
  try {
    // 1) 먼�? 로컬 ?�일?�서 ?�기 (개발/배포 ?�경 모두)
    try {
      const local = await readFromLocal();
      if (local && local.length > 0) {
        return NextResponse.json(local);
      }
    } catch (error) {
      }

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // 2) Blob?�서 최신 JSON ?�일 ?�도
      try {
        const { blobs } = await list({ prefix: EVENTS_FILENAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // 최신???�렬 (uploadedAt 기�?)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? json : [];
            // 메모리�? ?�기??
            memoryEvents = [...data];
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        }

      // 3) 메모�??�백
      if (memoryEvents.length > 0) {
        return NextResponse.json(memoryEvents);
      }
    }

    // 4) 모든 방법 ?�패 ??�?배열
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Events ???�보�?받아 기존 ?�이?��? 병합 ???�??(?�버?�이??방�?)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const newEvents = Array.isArray(body) ? body : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // 1. 기존 Events ?�이??로드 (?�버?�이??방�?)
      let currentEvents: string[] = [];
      try {
        const { blobs } = await list({ prefix: EVENTS_FILENAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const res = await fetch(blobs[0].url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            currentEvents = Array.isArray(json) ? json : [];
          }
        }
      } catch (error) {
        currentEvents = memoryEvents;
      }
      
      // 2. 기존 ?�이?��? ???�이??병합 (중복 ?�거)
      const mergedEvents = Array.from(new Set([...currentEvents, ...newEvents]));
      // 3. 병합???�이???�??
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await put(EVENTS_FILENAME, JSON.stringify(mergedEvents, null, 2), {
            access: 'public',
            contentType: 'application/json; charset=utf-8',
            addRandomSuffix: false,
          });
          `);
          blobSaved = true;
          break;
        } catch (error) {
          :`, error);
          if (attempt === 3) {
            }
        }
      }
      
      // 메모리도 ??�� ?�데?�트
      memoryEvents = [...mergedEvents];
      
      if (blobSaved) {
        return NextResponse.json({ 
          success: true, 
          storage: 'blob',
          data: mergedEvents // 병합??최종 ?�이??반환
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          storage: 'memory',
          data: mergedEvents, // 병합??최종 ?�이??반환
          warning: 'Blob save failed after 3 attempts; using in-memory fallback' 
        });
      }
    }

    // 로컬 ?�일 ?�??(병합 로직)
    const currentLocal = await readFromLocal();
    const mergedLocal = Array.from(new Set([...currentLocal, ...newEvents]));
    await writeToLocal(mergedLocal);
    return NextResponse.json({ 
      success: true, 
      storage: 'local',
      data: mergedLocal // 병합??최종 ?�이??반환
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save events apps' }, { status: 500 });
  }
}

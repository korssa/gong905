import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import type { ContentItem } from '@/types';

// ?�일 ?�일�?모든 ?�?�의 콘텐츠�? ?�??
const CONTENTS_FILE_NAME = 'contents.json';
const LOCAL_CONTENTS_PATH = path.join(process.cwd(), 'data', 'contents.json');

// Vercel ?�경?�서???�시 메모�??�?�소 (Blob ?�패 ???�백)
// /api/content??메모리�? ?�기?�하�??�한 공유 ?�?�소
let memoryContents: ContentItem[] = [];

// /api/content??메모리�? ?�기?�하???�수
async function syncWithContentMemory(): Promise<ContentItem[]> {
  try {
    // /api/content?�서 ?�재 메모�??�태 조회
    const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${origin}/api/content`, { cache: 'no-store' });
    if (res.ok) {
      const contentMemory = await res.json();
      if (Array.isArray(contentMemory)) {
        memoryContents = [...contentMemory];
        return memoryContents;
      }
    }
  } catch (error) {
    }
  return memoryContents;
}

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_CONTENTS_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_CONTENTS_PATH);
  } catch {
    await fs.writeFile(LOCAL_CONTENTS_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<ContentItem[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_CONTENTS_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(contents: ContentItem[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_CONTENTS_PATH, JSON.stringify(contents, null, 2));
}

// GET: Blob ?�는 로컬?�서 콘텐�?배열 반환
export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    if (isProd) {
      // 1) Blob?�서 최신 JSON ?�일 ?�도 (?�러 �?가?��???최신 �??�택)
      try {
        const { blobs } = await list({ prefix: CONTENTS_FILE_NAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // 최신???�렬 (uploadedAt 기�?)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? (json as ContentItem[]) : [];
            
            // App Story ?�용 ?�버�?
            const appStoryCount = data.filter(c => c.type === 'appstory').length;
            const newsCount = data.filter(c => c.type === 'news').length;
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        // Blob 조회 ?�패 ??무시?�고 ?�백 진행
      }

      // 2) 메모�??�백
      if (memoryContents.length > 0) {
        
        // App Story ?�용 ?�버�?
        const appStoryCount = memoryContents.filter(c => c.type === 'appstory').length;
        const newsCount = memoryContents.filter(c => c.type === 'news').length;
        
        return NextResponse.json(memoryContents);
      }

      // 4) 모든 ?�스?�서 ?�이?��? ?�으�?�?배열
      return NextResponse.json([]);
    }

    // 개발 ?�경: 로컬 ?�일
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: ?�체 콘텐�?배열??받아 Blob(?�는 로컬)???�??
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const contents = Array.isArray(body) ? (body as ContentItem[]) : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob ?�??강화 - ?�시??로직 추�?
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // App Story ?�용 ?�버�?
          const appStoryCount = contents.filter(c => c.type === 'appstory').length;
          const newsCount = contents.filter(c => c.type === 'news').length;
          await put(CONTENTS_FILE_NAME, JSON.stringify(contents, null, 2), {
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
      memoryContents = [...contents];
      
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

    await writeToLocal(contents);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save contents' }, { status: 500 });
  }
}

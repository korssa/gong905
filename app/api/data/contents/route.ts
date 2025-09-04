import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import type { ContentItem } from '@/types';

// 단일 파일로 모든 타입의 콘텐츠를 저장
const CONTENTS_FILE_NAME = 'contents.json';
const LOCAL_CONTENTS_PATH = path.join(process.cwd(), 'data', 'contents.json');

// Vercel 환경에서의 임시 메모리 저장소 (Blob 실패 시 폴백)
// /api/content의 메모리와 동기화하기 위한 공유 저장소
let memoryContents: ContentItem[] = [];

// /api/content의 메모리와 동기화하는 함수
async function syncWithContentMemory(): Promise<ContentItem[]> {
  try {
    // /api/content에서 현재 메모리 상태 조회
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
    console.warn('Failed to sync with /api/content memory:', error);
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

// GET: Blob 또는 로컬에서 콘텐츠 배열 반환
export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    if (isProd) {
      // 1) Blob에서 최신 JSON 파일 시도 (여러 개 가져와서 최신 것 선택)
      try {
        const { blobs } = await list({ prefix: CONTENTS_FILE_NAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // 최신순 정렬 (uploadedAt 기준)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? (json as ContentItem[]) : [];
            
            // App Story 전용 디버깅
            const appStoryCount = data.filter(c => c.type === 'appstory').length;
            const newsCount = data.filter(c => c.type === 'news').length;
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        console.warn('[Blob] 조회 실패:', error);
        // Blob 조회 실패 시 무시하고 폴백 진행
      }

      // 2) 메모리 폴백
      if (memoryContents.length > 0) {
        
        // App Story 전용 디버깅
        const appStoryCount = memoryContents.filter(c => c.type === 'appstory').length;
        const newsCount = memoryContents.filter(c => c.type === 'news').length;
        
        return NextResponse.json(memoryContents);
      }

      // 4) 모든 소스에서 데이터가 없으면 빈 배열
      return NextResponse.json([]);
    }

    // 개발 환경: 로컬 파일
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: 전체 콘텐츠 배열을 받아 Blob(또는 로컬)에 저장
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const contents = Array.isArray(body) ? (body as ContentItem[]) : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob 저장 강화 - 재시도 로직 추가
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Contents Blob] 저장 시도 ${attempt}/3`);
          
          // App Story 전용 디버깅
          const appStoryCount = contents.filter(c => c.type === 'appstory').length;
          const newsCount = contents.filter(c => c.type === 'news').length;
          console.log(`[Contents Blob] App Story: ${appStoryCount}, News: ${newsCount}`);
          
          await put(CONTENTS_FILE_NAME, JSON.stringify(contents, null, 2), {
            access: 'public',
            contentType: 'application/json; charset=utf-8',
            addRandomSuffix: false,
          });
          console.log(`[Contents Blob] 저장 성공 (시도 ${attempt})`);
          blobSaved = true;
          break;
        } catch (error) {
          console.error(`[Contents Blob] 저장 실패 (시도 ${attempt}):`, error);
          if (attempt === 3) {
            console.error('[Contents Blob] 모든 시도 실패, 메모리 폴백 사용');
          }
        }
      }
      
      // 메모리도 항상 업데이트
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

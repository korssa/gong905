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
      // 1) Blob에서 단일 JSON 파일 시도
      try {
        const { blobs } = await list({ prefix: CONTENTS_FILE_NAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const url = blobs[0].url;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? (json as ContentItem[]) : [];
            return NextResponse.json(data);
          }
        }
      } catch {
        // Blob 조회 실패 시 무시하고 폴백 진행
      }

      // 2) 메모리 폴백 - /api/content와 동기화
      if (memoryContents.length > 0) {
        return NextResponse.json(memoryContents);
      }

      // 3) /api/content 메모리와 동기화 시도
      const syncedContents = await syncWithContentMemory();
      if (syncedContents.length > 0) {
        return NextResponse.json(syncedContents);
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
      // Blob 저장 우선 시도, 실패 시 메모리 폴백으로도 성공 처리
      try {
        await put(CONTENTS_FILE_NAME, JSON.stringify(contents, null, 2), {
          access: 'public',
          contentType: 'application/json; charset=utf-8',
          addRandomSuffix: false,
        });
        // Blob 저장 성공
        // 메모리와의 불일치 방지를 위해 메모리도 최신으로 갱신
        memoryContents = [...contents];
        return NextResponse.json({ success: true, storage: 'blob' });
      } catch {
        // Blob 저장 실패: 토큰 누락 등
        memoryContents = [...contents];
        return NextResponse.json({ success: true, storage: 'memory', warning: 'Blob save failed; using in-memory fallback' });
      }
    }

    await writeToLocal(contents);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save contents' }, { status: 500 });
  }
}

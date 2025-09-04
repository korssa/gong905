import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import type { AppItem } from '@/types';

const APPS_FILE_NAME = 'apps.json';
const LOCAL_APPS_PATH = path.join(process.cwd(), 'data', APPS_FILE_NAME);

// Vercel 환경에서의 임시 메모리 저장소 (Blob 실패 시 폴백)
let memoryApps: AppItem[] = [];

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_APPS_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_APPS_PATH);
  } catch {
    await fs.writeFile(LOCAL_APPS_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<AppItem[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_APPS_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(apps: AppItem[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_APPS_PATH, JSON.stringify(apps, null, 2));
}

export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // 1) Blob에서 최신 JSON 시도
      try {
        const { blobs } = await list({ prefix: APPS_FILE_NAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const url = blobs[0].url;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? (json as AppItem[]) : [];
            return NextResponse.json(data);
          }
        }
      } catch {
        // Blob 조회 실패 시 무시하고 폴백 진행
      }

      // 2) 메모리 폴백
      if (memoryApps.length > 0) {
        return NextResponse.json(memoryApps);
      }

      // 3) Blob/메모리 모두 없으면 빈 배열
      return NextResponse.json([]);
    }
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const apps = Array.isArray(body) ? (body as AppItem[]) : [];
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob 저장 강화 - 재시도 로직 추가
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Apps Blob] 저장 시도 ${attempt}/3`);
          await put(APPS_FILE_NAME, JSON.stringify(apps, null, 2), {
            access: 'public',
            contentType: 'application/json; charset=utf-8',
            addRandomSuffix: false,
          });
          console.log(`[Apps Blob] 저장 성공 (시도 ${attempt})`);
          blobSaved = true;
          break;
        } catch (error) {
          console.error(`[Apps Blob] 저장 실패 (시도 ${attempt}):`, error);
          if (attempt === 3) {
            console.error('[Apps Blob] 모든 시도 실패, 메모리 폴백 사용');
          }
        }
      }
      
      // 메모리도 항상 업데이트
      memoryApps = [...apps];
      
      if (blobSaved) {
        return NextResponse.json({ 
          success: true, 
          storage: 'blob',
          data: apps // 최종 저장된 데이터 반환
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          storage: 'memory', 
          data: apps, // 최종 저장된 데이터 반환
          warning: 'Blob save failed after 3 attempts; using in-memory fallback' 
        });
      }
    }
    // 로컬 파일 저장
    await writeToLocal(apps);
    return NextResponse.json({ 
      success: true, 
      storage: 'local',
      data: apps // 최종 저장된 데이터 반환
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save apps' }, { status: 500 });
  }
}

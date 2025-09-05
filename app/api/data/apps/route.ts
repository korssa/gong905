import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import type { AppItem } from '@/types';

const APPS_FILE_NAME = 'apps.json';
const LOCAL_APPS_PATH = path.join(process.cwd(), 'data', APPS_FILE_NAME);

// Vercel ?�경?�서???�시 메모�??�?�소 (Blob ?�패 ???�백)
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
    
    // 1) 먼�? 로컬 ?�일?�서 ?�기 (개발/배포 ?�경 모두)
    try {
      const local = await readFromLocal();
      if (local && local.length > 0) {
        return NextResponse.json(local);
      }
    } catch (error) {
      }

    if (isProd) {
      // 2) Blob?�서 최신 JSON ?�도
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
      } catch (error) {
        }

      // 3) 메모�??�백
      if (memoryApps.length > 0) {
        return NextResponse.json(memoryApps);
      }
    }

    // 4) 모든 방법 ?�패 ??�?배열
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const apps = Array.isArray(body) ? (body as AppItem[]) : [];
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob ?�??강화 - ?�시??로직 추�?
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await put(APPS_FILE_NAME, JSON.stringify(apps, null, 2), {
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
      memoryApps = [...apps];
      
      if (blobSaved) {
        return NextResponse.json({ 
          success: true, 
          storage: 'blob',
          data: apps // 최종 ?�?�된 ?�이??반환
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          storage: 'memory', 
          data: apps, // 최종 ?�?�된 ?�이??반환
          warning: 'Blob save failed after 3 attempts; using in-memory fallback' 
        });
      }
    }
    // 로컬 ?�일 ?�??
    await writeToLocal(apps);
    return NextResponse.json({ 
      success: true, 
      storage: 'local',
      data: apps // 최종 ?�?�된 ?�이??반환
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save apps' }, { status: 500 });
  }
}

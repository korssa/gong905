import { NextRequest, NextResponse } from 'next/server';
import { loadFeaturedAppsFromBlob, saveFeaturedAppsToBlob } from '@/lib/data-loader';
import { put, list } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

// 캐시 설정
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// 상수
const FEATURED_FILE_NAME = 'featured-apps.json';
const LOCAL_FEATURED_PATH = path.join(process.cwd(), 'data', 'featured-apps.json');

// 메모리 폴백
let memoryFeatured: { featured: string[]; events: string[] } = { featured: [], events: [] };

// 타입 정의
type FeaturedSets = { featured: string[]; events: string[] };

// 로컬 파일 읽기
async function readLocalFile(): Promise<FeaturedSets | null> {
  try {
    const data = await fs.readFile(LOCAL_FEATURED_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Blob 저장 (재시도 로직 포함)
async function writeBlobSets(sets: FeaturedSets): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const blob = await put(FEATURED_FILE_NAME, JSON.stringify(sets, null, 2), {
        access: 'public',
        addRandomSuffix: false
      });
      return "blob";
    } catch (e) {
      if (attempt === 3) {
        memoryFeatured = { ...sets };
        return "memory";
      }
    }
  }
  return "memory";
}

// GET: Featured/Events 앱 목록 조회
export async function GET() {
  try {
    // 1) 로컬 파일에서 읽기 (개발/배포 환경 모두)
    try {
      const local = await readLocalFile();
      if (local && (local.featured.length > 0 || local.events.length > 0)) {
        return NextResponse.json(local, { headers: { 'Cache-Control': 'no-store' } });
      }
    } catch (error) {
      // 로컬 파일 읽기 실패 무시
    }

    // 2) Vercel 환경에서는 Blob에서 읽기
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        const { blobs } = await list({ prefix: FEATURED_FILE_NAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            if (data) {
              memoryFeatured = { ...data };
              return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
            }
          }
        }
      } catch (error) {
        // Blob 조회 실패 무시
      }
    }

    // 3) 메모리에서 읽기
    if (memoryFeatured.featured.length > 0 || memoryFeatured.events.length > 0) {
      return NextResponse.json(memoryFeatured, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 4) 모든 방법 실패 시 빈 세트 반환
    return NextResponse.json({ featured: [], events: [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ featured: [], events: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}

// POST: Featured/Events 앱 목록 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const featured = Array.isArray(body?.featured) ? body.featured : null;
    const events = Array.isArray(body?.events) ? body.events : null;

    if (!featured || !events) {
      return NextResponse.json(
        { success: false, error: 'featured와 events 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    const storage = await writeBlobSets({ featured, events });
    return NextResponse.json({ success: true, storage }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save featured apps' }, { status: 500 });
  }
}

// PUT: Featured/Events 앱 토글
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const type = searchParams.get('type') as 'featured' | 'events' | null;
    const action = searchParams.get('action') as 'add' | 'remove' | null;

    if (!appId) {
      return NextResponse.json({ success: false, error: 'appId required' }, { status: 400 });
    }

    if (!type || !['featured', 'events'].includes(type)) {
      return NextResponse.json({ success: false, error: 'type must be featured or events' }, { status: 400 });
    }

    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action must be add or remove' }, { status: 400 });
    }

    // 현재 세트 로드
    let sets: FeaturedSets | null = null;
    try {
      sets = await readLocalFile();
      if (sets && (sets.featured.length > 0 || sets.events.length > 0)) {
        // 로컬 파일에서 현재 세트 로드
      } else {
        sets = null;
      }
    } catch (error) {
      // 로컬 파일 읽기 실패 무시
      sets = null;
    }

    // Blob에서 읽기 시도
    if (!sets) {
      try {
        const { blobs } = await list({ prefix: FEATURED_FILE_NAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            sets = await response.json();
          }
        }
      } catch (error) {
        // Blob 읽기 실패 무시
      }
    }

    // 메모리에서 읽기
    if (!sets) {
      sets = { ...memoryFeatured };
    }

    // 현재 세트
    const current = sets || { featured: [], events: [] };
    const next = { ...current };

    // 타겟 배열 선택
    const target = type === 'featured' ? next.featured : next.events;

    if (action === 'add') {
      if (!target.includes(appId)) {
        target.push(appId);
      }
    } else {
      const idx = target.indexOf(appId);
      if (idx !== -1) {
        target.splice(idx, 1);
      }
    }

    // 업데이트된 세트
    const storage = await writeBlobSets(next);
    
    return NextResponse.json({ success: true, storage, sets: next }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to toggle featured/events' }, { status: 500 });
  }
}

// PATCH: 개별 앱 추가/제거
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get('list') as 'featured' | 'events' | null;
    const op = searchParams.get('op') as 'add' | 'remove' | null;
    const id = searchParams.get('id');

    if (!['featured', 'events'].includes(list) || !['add', 'remove'].includes(op) || !id) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // 현재 세트 로드
    let sets: FeaturedSets | null = null;
    try {
      sets = await readLocalFile();
      if (sets && (sets.featured.length > 0 || sets.events.length > 0)) {
        // 로컬 파일에서 현재 세트 로드
      } else {
        sets = null;
      }
    } catch (error) {
      // 로컬 파일 읽기 실패 무시
      sets = null;
    }

    // Blob에서 읽기 시도
    if (!sets) {
      try {
        const { blobs } = await list({ prefix: FEATURED_FILE_NAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            sets = await response.json();
          }
        }
      } catch (error) {
        // Blob 읽기 실패 무시
      }
    }

    // 메모리에서 읽기
    if (!sets) {
      sets = { ...memoryFeatured };
    }

    // 현재 세트
    const current = sets || { featured: [], events: [] };
    const next = { ...current };

    // 타겟 배열 선택
    const target = list === 'featured' ? next.featured : next.events;

    if (op === 'add') {
      if (!target.includes(id)) {
        target.push(id);
      }
    } else {
      const idx = target.indexOf(id);
      if (idx !== -1) {
        target.splice(idx, 1);
      }
    }

    // 업데이트된 세트
    const storage = await writeBlobSets(next);
    
    return NextResponse.json({ success: true, storage, sets: next }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update featured/events' }, { status: 500 });
  }
}
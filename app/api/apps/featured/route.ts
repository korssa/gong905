import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { AppItem } from '@/types';

// 로컬 파일 경로
const APPS_FILE_PATH = path.join(process.cwd(), 'data', 'apps.json');
const FEATURED_FILE_PATH = path.join(process.cwd(), 'data', 'featured-apps.json');

// 메모리 기반 저장소 (Vercel 환경에서 사용)
const memoryApps: AppItem[] = [];
let memoryFeatured: { featured: string[]; events: string[] } = { featured: [], events: [] };

// 데이터 디렉토리 생성 및 파일 초기화
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(APPS_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // 파일이 없으면 빈 배열로 초기화
    try {
      await fs.access(APPS_FILE_PATH);
    } catch {
      await fs.writeFile(APPS_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // 에러 무시
  }
}

async function ensureFeaturedFile() {
  try {
    const dataDir = path.dirname(FEATURED_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // 파일이 없으면 기본값으로 초기화
    try {
      await fs.access(FEATURED_FILE_PATH);
    } catch {
      await fs.writeFile(FEATURED_FILE_PATH, JSON.stringify({ featured: [], events: [] }));
    }
  } catch {
    // 에러 무시
  }
}

// 앱 데이터 로드
async function loadApps(): Promise<AppItem[]> {
  try {
    // Vercel 환경에서는 메모리 저장소만 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return memoryApps;
    }
    
    // 로컬 환경에서는 파일에서 로드
    await ensureDataFile();
    const data = await fs.readFile(APPS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Featured/Events 데이터 로드
async function loadFeatured(): Promise<{ featured: string[]; events: string[] }> {
  try {
    // Vercel 환경에서는 메모리 저장소만 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return memoryFeatured;
    }
    
    // 로컬 환경에서는 파일에서 로드
    await ensureFeaturedFile();
    const data = await fs.readFile(FEATURED_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { featured: [], events: [] };
  }
}

// Featured/Events 데이터 저장
async function saveFeatured(featured: { featured: string[]; events: string[] }) {
  try {
    // Vercel 환경에서는 메모리 저장소 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      memoryFeatured = { ...featured };
      return;
    }
    
    // 로컬 환경에서는 파일 저장
    await ensureFeaturedFile();
    const jsonData = JSON.stringify(featured, null, 2);
    await fs.writeFile(FEATURED_FILE_PATH, jsonData);
  } catch (error) {
    throw new Error(`Featured 앱 저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

// GET: Featured/Events 앱 정보 조회
export async function GET() {
  try {
    const featured = await loadFeatured();
    
    return NextResponse.json({
      success: true,
      featured: featured.featured,
      events: featured.events,
      count: {
        featured: featured.featured.length,
        events: featured.events.length
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Featured 앱 정보 조회에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// POST: Featured/Events 앱 정보 업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { featured, events } = body;
    
    if (!Array.isArray(featured) || !Array.isArray(events)) {
      return NextResponse.json({ error: 'featured와 events는 배열이어야 합니다.' }, { status: 400 });
    }
    
    // 앱 목록 로드하여 유효성 검증
    const apps = await loadApps();
    const validFeatured = featured.filter(id => apps.some(app => app.id === id));
    const validEvents = events.filter(id => apps.some(app => app.id === id));
    
    const newFeatured = {
      featured: validFeatured,
      events: validEvents
    };
    
    await saveFeatured(newFeatured);
    
    // Blob 동기화
    try {
      const origin = new URL(request.url).origin;
      await fetch(`${origin}/api/data/featured-apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeatured),
      });
    } catch (error) {
      console.warn('Blob 동기화 실패:', error);
    }
    
    return NextResponse.json({
      success: true,
      featured: validFeatured,
      events: validEvents,
      count: {
        featured: validFeatured.length,
        events: validEvents.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: 'Featured 앱 정보 업데이트에 실패했습니다.',
      details: errorMessage
    }, { status: 500 });
  }
}

// PUT: 특정 앱의 Featured/Events 상태 토글
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, type, action } = body;
    
    if (!appId || !type || !action) {
      return NextResponse.json({ error: 'appId, type, action이 필요합니다.' }, { status: 400 });
    }
    
    if (!['featured', 'events'].includes(type)) {
      return NextResponse.json({ error: 'type은 featured 또는 events여야 합니다.' }, { status: 400 });
    }
    
    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'action은 add 또는 remove여야 합니다.' }, { status: 400 });
    }
    
    // 앱 목록 로드하여 유효성 검증
    const apps = await loadApps();
    if (!apps.some(app => app.id === appId)) {
      return NextResponse.json({ error: '존재하지 않는 앱입니다.' }, { status: 404 });
    }
    
    const currentFeatured = await loadFeatured();
    let updatedList: string[];
    
    if (action === 'add') {
      updatedList = currentFeatured[type as keyof typeof currentFeatured].includes(appId) 
        ? currentFeatured[type as keyof typeof currentFeatured]
        : [...currentFeatured[type as keyof typeof currentFeatured], appId];
    } else {
      updatedList = currentFeatured[type as keyof typeof currentFeatured].filter(id => id !== appId);
    }
    
    const newFeatured = {
      ...currentFeatured,
      [type]: updatedList
    };
    
    await saveFeatured(newFeatured);
    
    // Blob 동기화
    try {
      const origin = new URL(request.url).origin;
      await fetch(`${origin}/api/data/featured-apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeatured),
      });
    } catch (error) {
      console.warn('Blob 동기화 실패:', error);
    }
    
    return NextResponse.json({
      success: true,
      [type]: updatedList,
      count: updatedList.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: 'Featured 앱 상태 토글에 실패했습니다.',
      details: errorMessage
    }, { status: 500 });
  }
}

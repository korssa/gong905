import { NextRequest, NextResponse } from 'next/server';
import { AppItem } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// 로컬 파일 경로
const APPS_FILE_PATH = path.join(process.cwd(), 'data', 'apps.json');

// 메모리 기반 저장소 (Vercel 환경에서 사용)
let memoryStorage: AppItem[] = [];

// 갤러리 앱 타입별 배열 분리
const TYPE_RANGES = {
  gallery: { min: 20000, max: 29999 }
};

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

// 앱 로드
async function loadApps(): Promise<AppItem[]> {
  try {
    // Vercel 환경에서는 메모리 저장소만 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return memoryStorage;
    }
    
    // 로컬 환경에서는 파일에서 로드
    await ensureDataFile();
    const data = await fs.readFile(APPS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 타입별 앱 분리
function separateAppsByType(apps: AppItem[]) {
  const separated: Record<string, AppItem[]> = {
    gallery: []
  };

  apps.forEach(app => {
    if (app.type === 'gallery') {
      separated.gallery.push(app);
    }
  });

  // 각 타입별로 ID 범위 검증 및 정리
  Object.entries(separated).forEach(([type, typeApps]) => {
    const range = TYPE_RANGES[type as keyof typeof TYPE_RANGES];
    separated[type] = typeApps.filter(app => {
      const id = parseInt(app.id);
      return id >= range.min && id <= range.max;
    });
  });

  return separated;
}

// GET: 타입별 앱 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | null;
    
    if (!type || !['gallery'].includes(type)) {
      return NextResponse.json({ error: '유효한 타입이 필요합니다.' }, { status: 400 });
    }

    const apps = await loadApps();
    const separated = separateAppsByType(apps);
    
    // 요청된 타입의 앱만 반환
    const typeApps = separated[type] || [];
    
    // 최신순 정렬
    typeApps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      type,
      count: typeApps.length,
      apps: typeApps,
      range: TYPE_RANGES[type]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '앱 목록을 불러오는데 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// POST: 타입별 앱 저장
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | null;
    
    if (!type || !['gallery'].includes(type)) {
      return NextResponse.json({ error: '유효한 타입이 필요합니다.' }, { status: 400 });
    }

    const body = await request.json();
    const { apps } = body;

    if (!Array.isArray(apps)) {
      return NextResponse.json({ error: '앱 배열이 필요합니다.' }, { status: 400 });
    }

    // 타입별 ID 범위 검증
    const range = TYPE_RANGES[type];
    const validApps = apps.filter(app => {
      const id = parseInt(app.id);
      return id >= range.min && id <= range.max;
    });

    // 메모리 저장소 업데이트
    memoryStorage = validApps;

    // 로컬 환경에서는 파일에도 저장
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      await ensureDataFile();
      await fs.writeFile(APPS_FILE_PATH, JSON.stringify(validApps, null, 2));
    }

    return NextResponse.json({
      success: true,
      type,
      count: validApps.length,
      message: `${type} 앱이 성공적으로 저장되었습니다.`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '앱 저장에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

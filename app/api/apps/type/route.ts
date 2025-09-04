import { NextRequest, NextResponse } from 'next/server';
import { AppItem } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';
import { list } from '@vercel/blob';

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

// 앱 로드 (로컬 파일 우선, Blob 폴백)
async function loadApps(): Promise<AppItem[]> {
  try {
    // 1) 먼저 로컬 파일에서 읽기 (개발/배포 환경 모두)
    try {
      await ensureDataFile();
      const data = await fs.readFile(APPS_FILE_PATH, 'utf-8');
      const apps = JSON.parse(data);
      if (apps && apps.length > 0) {
        console.log(`[Type API] 로컬 파일에서 ${apps.length}개 앱 로드`);
        return apps;
      }
    } catch (error) {
      console.log('[Type API] 로컬 파일 읽기 실패:', error);
    }

    // 2) Vercel 환경에서는 Blob에서 직접 읽기 (메모장 방식)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        const { blobs } = await list({ prefix: 'apps.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            console.log(`[Type API] Blob에서 ${data.length}개 앱 로드`);
            // 메모리도 업데이트 (동기화)
            memoryStorage = data;
            return data;
          }
        }
        // Blob에서 읽기 실패시 메모리 사용
        if (memoryStorage.length > 0) {
          console.log(`[Type API] 메모리에서 ${memoryStorage.length}개 앱 로드`);
          return memoryStorage;
        }
      } catch (blobError) {
        console.log('[Type API] Blob 에러:', blobError);
        // Blob 에러시 메모리 사용
        if (memoryStorage.length > 0) {
          console.log(`[Type API] 메모리에서 ${memoryStorage.length}개 앱 로드`);
          return memoryStorage;
        }
      }
    }
    
    console.log('[Type API] 모든 로드 방법 실패, 빈 배열 반환');
    return [];
  } catch (error) {
    console.error('[Type API] loadApps 오류:', error);
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


  // 각 타입별로 ID 범위 검증 및 정리 (문자열 ID 지원)
  Object.entries(separated).forEach(([type, typeApps]) => {
    const range = TYPE_RANGES[type as keyof typeof TYPE_RANGES];
    
    const beforeFilter = typeApps.length;
    separated[type] = typeApps.filter(app => {
      // ID가 숫자인 경우 범위 검증
      if (/^\d+$/.test(app.id)) {
        const id = parseInt(app.id);
        const isValid = id >= range.min && id <= range.max;
        if (!isValid) {
        }
        return isValid;
      }
      // ID가 문자열인 경우 (Date.now_ 형태) 허용
      if (app.id.includes('_')) {
        return true;
      }
      // 기타 형태의 ID도 허용
      return true;
    });
    
    const afterFilter = separated[type].length;
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
    typeApps.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

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

    // 타입별 ID 범위 검증 (문자열 ID 지원)
    const range = TYPE_RANGES[type];
    const validApps = apps.filter(app => {
      // ID가 숫자인 경우 범위 검증
      if (/^\d+$/.test(app.id)) {
        const id = parseInt(app.id);
        return id >= range.min && id <= range.max;
      }
      // ID가 문자열인 경우 (Date.now_ 형태) 허용
      if (app.id.includes('_')) {
        return true;
      }
      // 기타 형태의 ID도 허용
      return true;
    });

    // 메모리 저장소 업데이트
    memoryStorage = validApps;

    // 로컬 환경에서도 글로벌 저장소 우선 사용 (로컬 파일 저장 제거)
    // 로컬 파일 저장을 제거하여 글로벌에만 전달되도록 함

    // Vercel 환경에서는 Blob 동기화 확인 (메모장 방식)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        // Blob에 저장 후 즉시 다시 읽어서 동기화 확인
        const { blobs } = await list({ prefix: 'apps.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const savedData = await response.json();
            // 저장된 데이터와 메모리 동기화
            memoryStorage = savedData;
          }
        }
      } catch (blobError) {
        // Blob 동기화 실패시 무시 (메모리는 이미 업데이트됨)
      }
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

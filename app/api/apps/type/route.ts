import { NextRequest, NextResponse } from 'next/server';
import { AppItem } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';
import { list } from '@vercel/blob';

// 로컬 ?�일 경로
const APPS_FILE_PATH = path.join(process.cwd(), 'data', 'apps.json');

// 메모�?기반 ?�?�소 (Vercel ?�경?�서 ?�용)
let memoryStorage: AppItem[] = [];

// 갤러�????�?�별 배열 분리
const TYPE_RANGES = {
  gallery: { min: 20000, max: 29999 }
};

// ?�이???�렉?�리 ?�성 �??�일 초기??
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(APPS_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // ?�일???�으�?�?배열�?초기??
    try {
      await fs.access(APPS_FILE_PATH);
    } catch {
      await fs.writeFile(APPS_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // ?�러 무시
  }
}

// ??로드 (로컬 ?�일 ?�선, Blob ?�백)
async function loadApps(): Promise<AppItem[]> {
  try {
    // 1) 먼�? 로컬 ?�일?�서 ?�기 (개발/배포 ?�경 모두)
    try {
      await ensureDataFile();
      const data = await fs.readFile(APPS_FILE_PATH, 'utf-8');
      const apps = JSON.parse(data);
      if (apps && apps.length > 0) {
        return apps;
      }
    } catch (error) {
      }

    // 2) Vercel ?�경?�서??Blob?�서 직접 ?�기 (메모??방식)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        const { blobs } = await list({ prefix: 'apps.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            // 메모리도 ?�데?�트 (?�기??
            memoryStorage = data;
            return data;
          }
        }
        // Blob?�서 ?�기 ?�패??메모�??�용
        if (memoryStorage.length > 0) {
          return memoryStorage;
        }
      } catch (blobError) {
        // Blob ?�러??메모�??�용
        if (memoryStorage.length > 0) {
          return memoryStorage;
        }
      }
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

// ?�?�별 ??분리
function separateAppsByType(apps: AppItem[]) {
  
  const separated: Record<string, AppItem[]> = {
    gallery: []
  };

  apps.forEach(app => {
    if (app.type === 'gallery') {
      separated.gallery.push(app);
    }
  });


  // �??�?�별�?ID 범위 검�?�??�리 (문자??ID 지??
  Object.entries(separated).forEach(([type, typeApps]) => {
    const range = TYPE_RANGES[type as keyof typeof TYPE_RANGES];
    
    const beforeFilter = typeApps.length;
    separated[type] = typeApps.filter(app => {
      // ID가 ?�자??경우 범위 검�?
      if (/^\d+$/.test(app.id)) {
        const id = parseInt(app.id);
        const isValid = id >= range.min && id <= range.max;
        if (!isValid) {
        }
        return isValid;
      }
      // ID가 문자?�인 경우 (Date.now_ ?�태) ?�용
      if (app.id.includes('_')) {
        return true;
      }
      // 기�? ?�태??ID???�용
      return true;
    });
    
    const afterFilter = separated[type].length;
  });

  return separated;
}

// GET: ?�?�별 ??조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | null;
    
    if (!type || !['gallery'].includes(type)) {
      return NextResponse.json({ error: '?�효???�?�이 ?�요?�니??' }, { status: 400 });
    }

    const apps = await loadApps();
    const separated = separateAppsByType(apps);
    
    // ?�청???�?�의 ?�만 반환
    const typeApps = separated[type] || [];
    
    // 최신???�렬
    typeApps.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return NextResponse.json({
      type,
      count: typeApps.length,
      apps: typeApps,
      range: TYPE_RANGES[type]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '??목록??불러?�는???�패?�습?�다.',
      details: error instanceof Error ? error.message : '?????�는 ?�류'
    }, { status: 500 });
  }
}

// POST: ?�?�별 ???�??
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | null;
    
    if (!type || !['gallery'].includes(type)) {
      return NextResponse.json({ error: '?�효???�?�이 ?�요?�니??' }, { status: 400 });
    }

    const body = await request.json();
    const { apps } = body;

    if (!Array.isArray(apps)) {
      return NextResponse.json({ error: '??배열???�요?�니??' }, { status: 400 });
    }

    // ?�?�별 ID 범위 검�?(문자??ID 지??
    const range = TYPE_RANGES[type];
    const validApps = apps.filter(app => {
      // ID가 ?�자??경우 범위 검�?
      if (/^\d+$/.test(app.id)) {
        const id = parseInt(app.id);
        return id >= range.min && id <= range.max;
      }
      // ID가 문자?�인 경우 (Date.now_ ?�태) ?�용
      if (app.id.includes('_')) {
        return true;
      }
      // 기�? ?�태??ID???�용
      return true;
    });

    // 메모�??�?�소 ?�데?�트
    memoryStorage = validApps;

    // 로컬 ?�경?�서??글로벌 ?�?�소 ?�선 ?�용 (로컬 ?�일 ?�???�거)
    // 로컬 ?�일 ?�?�을 ?�거?�여 글로벌?�만 ?�달?�도�???

    // Vercel ?�경?�서??Blob ?�기???�인 (메모??방식)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        // Blob???�????즉시 ?�시 ?�어???�기???�인
        const { blobs } = await list({ prefix: 'apps.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const savedData = await response.json();
            // ?�?�된 ?�이?��? 메모�??�기??
            memoryStorage = savedData;
          }
        }
      } catch (blobError) {
        // Blob ?�기???�패??무시 (메모리는 ?��? ?�데?�트??
      }
    }

    return NextResponse.json({
      success: true,
      type,
      count: validApps.length,
      message: `${type} ?�이 ?�공?�으�??�?�되?�습?�다.`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '???�?�에 ?�패?�습?�다.',
      details: error instanceof Error ? error.message : '?????�는 ?�류'
    }, { status: 500 });
  }
}

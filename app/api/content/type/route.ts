import { NextRequest, NextResponse } from 'next/server';
import { ContentItem } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// 로컬 ?�일 경로
const CONTENT_FILE_PATH = path.join(process.cwd(), 'data', 'contents.json');

// 메모�?기반 ?�?�소 (Vercel ?�경?�서 ?�용)
let memoryStorage: ContentItem[] = [];

// ?�?�별 배열 분리
const TYPE_RANGES = {
  appstory: { min: 1, max: 9999 },
  news: { min: 10000, max: 19999 }
};

// ?�이???�렉?�리 ?�성 �??�일 초기??
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(CONTENT_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // ?�일???�으�?�?배열�?초기??
    try {
      await fs.access(CONTENT_FILE_PATH);
    } catch {
      await fs.writeFile(CONTENT_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // ?�러 무시
  }
}

// 콘텐�?로드
async function loadContents(): Promise<ContentItem[]> {
  try {
    // Vercel ?�경?�서??메모�??�?�소�??�용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return memoryStorage;
    }
    
    // 로컬 ?�경?�서???�일?�서 로드
    await ensureDataFile();
    const data = await fs.readFile(CONTENT_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// ?�?�별 콘텐�?분리
function separateContentsByType(contents: ContentItem[]) {
  const separated: Record<string, ContentItem[]> = {
    appstory: [],
    news: []
  };

  contents.forEach(content => {
    if (content.type === 'appstory' || content.type === 'news') {
      separated[content.type].push(content);
    }
  });

  // �??�?�별�?ID 범위 검�?�??�리
  Object.entries(separated).forEach(([type, typeContents]) => {
    const range = TYPE_RANGES[type as keyof typeof TYPE_RANGES];
    separated[type] = typeContents.filter(content => {
      const id = parseInt(content.id);
      return id >= range.min && id <= range.max;
    });
  });

  return separated;
}

// GET: ?�?�별 콘텐�?조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'appstory' | 'news' | null;
    
    if (!type || !['appstory', 'news'].includes(type)) {
      return NextResponse.json({ error: '?�효???�?�이 ?�요?�니??' }, { status: 400 });
    }

    const contents = await loadContents();
    const separated = separateContentsByType(contents);
    
    // ?�청???�?�의 콘텐츠만 반환
    const typeContents = separated[type] || [];
    
    // 최신???�렬
    typeContents.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    return NextResponse.json({
      type,
      count: typeContents.length,
      contents: typeContents,
      range: TYPE_RANGES[type]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '?�?�별 콘텐�?조회???�패?�습?�다.',
      details: error instanceof Error ? error.message : '?????�는 ?�류'
    }, { status: 500 });
  }
}

// POST: ?�?�별 콘텐�??�??(배열 분리)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'appstory' | 'news' | null;
    
    if (!type || !['appstory', 'news'].includes(type)) {
      return NextResponse.json({ error: '?�효???�?�이 ?�요?�니??' }, { status: 400 });
    }

    const body: ContentItem[] = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: '콘텐�?배열???�요?�니??' }, { status: 400 });
    }

    // ?�?�별�??�터�?�?ID 범위 검�?
    const range = TYPE_RANGES[type];
    const validContents = body.filter(content => {
      if (content.type !== type) return false;
      const id = parseInt(content.id);
      return id >= range.min && id <= range.max;
    });

    // 기존 콘텐�?로드
    const existingContents = await loadContents();
    
    // ?�른 ?�?�의 콘텐츠는 ?��??�고 ?�재 ?�?�만 교체
    const otherTypeContents = existingContents.filter(content => content.type !== type);
    const updatedContents = [...otherTypeContents, ...validContents];

    // 메모�??�?�소 ?�데?�트
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      memoryStorage = [...updatedContents];
    } else {
      // 로컬 ?�일 ?�??
      await ensureDataFile();
      await fs.writeFile(CONTENT_FILE_PATH, JSON.stringify(updatedContents, null, 2));
    }

    // Blob ?�기??
    try {
      const origin = new URL(request.url).origin;
      await fetch(`${origin}/api/data/contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedContents),
      });
    } catch (error) {
      }

    return NextResponse.json({
      success: true,
      type,
      count: validContents.length,
      totalCount: updatedContents.length,
      range
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '?�?�별 콘텐�??�?�에 ?�패?�습?�다.',
      details: error instanceof Error ? error.message : '?????�는 ?�류'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ContentItem } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// ë¡œì»¬ ?Œì¼ ê²½ë¡œ
const CONTENT_FILE_PATH = path.join(process.cwd(), 'data', 'contents.json');

// ë©”ëª¨ë¦?ê¸°ë°˜ ?€?¥ì†Œ (Vercel ?˜ê²½?ì„œ ?¬ìš©)
let memoryStorage: ContentItem[] = [];

// ?€?…ë³„ ë°°ì—´ ë¶„ë¦¬
const TYPE_RANGES = {
  appstory: { min: 1, max: 9999 },
  news: { min: 10000, max: 19999 }
};

// ?°ì´???”ë ‰? ë¦¬ ?ì„± ë°??Œì¼ ì´ˆê¸°??
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(CONTENT_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // ?Œì¼???†ìœ¼ë©?ë¹?ë°°ì—´ë¡?ì´ˆê¸°??
    try {
      await fs.access(CONTENT_FILE_PATH);
    } catch {
      await fs.writeFile(CONTENT_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // ?ëŸ¬ ë¬´ì‹œ
  }
}

// ì½˜í…ì¸?ë¡œë“œ
async function loadContents(): Promise<ContentItem[]> {
  try {
    // Vercel ?˜ê²½?ì„œ??ë©”ëª¨ë¦??€?¥ì†Œë§??¬ìš©
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return memoryStorage;
    }
    
    // ë¡œì»¬ ?˜ê²½?ì„œ???Œì¼?ì„œ ë¡œë“œ
    await ensureDataFile();
    const data = await fs.readFile(CONTENT_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// ?€?…ë³„ ì½˜í…ì¸?ë¶„ë¦¬
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

  // ê°??€?…ë³„ë¡?ID ë²”ìœ„ ê²€ì¦?ë°??•ë¦¬
  Object.entries(separated).forEach(([type, typeContents]) => {
    const range = TYPE_RANGES[type as keyof typeof TYPE_RANGES];
    separated[type] = typeContents.filter(content => {
      const id = parseInt(content.id);
      return id >= range.min && id <= range.max;
    });
  });

  return separated;
}

// GET: ?€?…ë³„ ì½˜í…ì¸?ì¡°íšŒ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'appstory' | 'news' | null;
    
    if (!type || !['appstory', 'news'].includes(type)) {
      return NextResponse.json({ error: '? íš¨???€?…ì´ ?„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    const contents = await loadContents();
    const separated = separateContentsByType(contents);
    
    // ?”ì²­???€?…ì˜ ì½˜í…ì¸ ë§Œ ë°˜í™˜
    const typeContents = separated[type] || [];
    
    // ìµœì‹ ???•ë ¬
    typeContents.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    return NextResponse.json({
      type,
      count: typeContents.length,
      contents: typeContents,
      range: TYPE_RANGES[type]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '?€?…ë³„ ì½˜í…ì¸?ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
      details: error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜'
    }, { status: 500 });
  }
}

// POST: ?€?…ë³„ ì½˜í…ì¸??€??(ë°°ì—´ ë¶„ë¦¬)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'appstory' | 'news' | null;
    
    if (!type || !['appstory', 'news'].includes(type)) {
      return NextResponse.json({ error: '? íš¨???€?…ì´ ?„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    const body: ContentItem[] = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'ì½˜í…ì¸?ë°°ì—´???„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    // ?€?…ë³„ë¡??„í„°ë§?ë°?ID ë²”ìœ„ ê²€ì¦?
    const range = TYPE_RANGES[type];
    const validContents = body.filter(content => {
      if (content.type !== type) return false;
      const id = parseInt(content.id);
      return id >= range.min && id <= range.max;
    });

    // ê¸°ì¡´ ì½˜í…ì¸?ë¡œë“œ
    const existingContents = await loadContents();
    
    // ?¤ë¥¸ ?€?…ì˜ ì½˜í…ì¸ ëŠ” ? ì??˜ê³  ?„ì¬ ?€?…ë§Œ êµì²´
    const otherTypeContents = existingContents.filter(content => content.type !== type);
    const updatedContents = [...otherTypeContents, ...validContents];

    // ë©”ëª¨ë¦??€?¥ì†Œ ?…ë°?´íŠ¸
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      memoryStorage = [...updatedContents];
    } else {
      // ë¡œì»¬ ?Œì¼ ?€??
      await ensureDataFile();
      await fs.writeFile(CONTENT_FILE_PATH, JSON.stringify(updatedContents, null, 2));
    }

    // Blob ?™ê¸°??
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
      error: '?€?…ë³„ ì½˜í…ì¸??€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.',
      details: error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜'
    }, { status: 500 });
  }
}

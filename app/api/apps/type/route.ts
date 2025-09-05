import { NextRequest, NextResponse } from 'next/server';
import { AppItem } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';
import { list } from '@vercel/blob';

// ë¡œì»¬ ?Œì¼ ê²½ë¡œ
const APPS_FILE_PATH = path.join(process.cwd(), 'data', 'apps.json');

// ë©”ëª¨ë¦?ê¸°ë°˜ ?€?¥ì†Œ (Vercel ?˜ê²½?ì„œ ?¬ìš©)
let memoryStorage: AppItem[] = [];

// ê°¤ëŸ¬ë¦????€?…ë³„ ë°°ì—´ ë¶„ë¦¬
const TYPE_RANGES = {
  gallery: { min: 20000, max: 29999 }
};

// ?°ì´???”ë ‰? ë¦¬ ?ì„± ë°??Œì¼ ì´ˆê¸°??
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(APPS_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // ?Œì¼???†ìœ¼ë©?ë¹?ë°°ì—´ë¡?ì´ˆê¸°??
    try {
      await fs.access(APPS_FILE_PATH);
    } catch {
      await fs.writeFile(APPS_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // ?ëŸ¬ ë¬´ì‹œ
  }
}

// ??ë¡œë“œ (ë¡œì»¬ ?Œì¼ ?°ì„ , Blob ?´ë°±)
async function loadApps(): Promise<AppItem[]> {
  try {
    // 1) ë¨¼ì? ë¡œì»¬ ?Œì¼?ì„œ ?½ê¸° (ê°œë°œ/ë°°í¬ ?˜ê²½ ëª¨ë‘)
    try {
      await ensureDataFile();
      const data = await fs.readFile(APPS_FILE_PATH, 'utf-8');
      const apps = JSON.parse(data);
      if (apps && apps.length > 0) {
        return apps;
      }
    } catch (error) {
      }

    // 2) Vercel ?˜ê²½?ì„œ??Blob?ì„œ ì§ì ‘ ?½ê¸° (ë©”ëª¨??ë°©ì‹)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        const { blobs } = await list({ prefix: 'apps.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            // ë©”ëª¨ë¦¬ë„ ?…ë°?´íŠ¸ (?™ê¸°??
            memoryStorage = data;
            return data;
          }
        }
        // Blob?ì„œ ?½ê¸° ?¤íŒ¨??ë©”ëª¨ë¦??¬ìš©
        if (memoryStorage.length > 0) {
          return memoryStorage;
        }
      } catch (blobError) {
        // Blob ?ëŸ¬??ë©”ëª¨ë¦??¬ìš©
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

// ?€?…ë³„ ??ë¶„ë¦¬
function separateAppsByType(apps: AppItem[]) {
  
  const separated: Record<string, AppItem[]> = {
    gallery: []
  };

  apps.forEach(app => {
    if (app.type === 'gallery') {
      separated.gallery.push(app);
    }
  });


  // ê°??€?…ë³„ë¡?ID ë²”ìœ„ ê²€ì¦?ë°??•ë¦¬ (ë¬¸ì??ID ì§€??
  Object.entries(separated).forEach(([type, typeApps]) => {
    const range = TYPE_RANGES[type as keyof typeof TYPE_RANGES];
    
    const beforeFilter = typeApps.length;
    separated[type] = typeApps.filter(app => {
      // IDê°€ ?«ì??ê²½ìš° ë²”ìœ„ ê²€ì¦?
      if (/^\d+$/.test(app.id)) {
        const id = parseInt(app.id);
        const isValid = id >= range.min && id <= range.max;
        if (!isValid) {
        }
        return isValid;
      }
      // IDê°€ ë¬¸ì?´ì¸ ê²½ìš° (Date.now_ ?•íƒœ) ?ˆìš©
      if (app.id.includes('_')) {
        return true;
      }
      // ê¸°í? ?•íƒœ??ID???ˆìš©
      return true;
    });
    
    const afterFilter = separated[type].length;
  });

  return separated;
}

// GET: ?€?…ë³„ ??ì¡°íšŒ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | null;
    
    if (!type || !['gallery'].includes(type)) {
      return NextResponse.json({ error: '? íš¨???€?…ì´ ?„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    const apps = await loadApps();
    const separated = separateAppsByType(apps);
    
    // ?”ì²­???€?…ì˜ ?±ë§Œ ë°˜í™˜
    const typeApps = separated[type] || [];
    
    // ìµœì‹ ???•ë ¬
    typeApps.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return NextResponse.json({
      type,
      count: typeApps.length,
      apps: typeApps,
      range: TYPE_RANGES[type]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '??ëª©ë¡??ë¶ˆëŸ¬?¤ëŠ”???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
      details: error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜'
    }, { status: 500 });
  }
}

// POST: ?€?…ë³„ ???€??
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | null;
    
    if (!type || !['gallery'].includes(type)) {
      return NextResponse.json({ error: '? íš¨???€?…ì´ ?„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    const body = await request.json();
    const { apps } = body;

    if (!Array.isArray(apps)) {
      return NextResponse.json({ error: '??ë°°ì—´???„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    // ?€?…ë³„ ID ë²”ìœ„ ê²€ì¦?(ë¬¸ì??ID ì§€??
    const range = TYPE_RANGES[type];
    const validApps = apps.filter(app => {
      // IDê°€ ?«ì??ê²½ìš° ë²”ìœ„ ê²€ì¦?
      if (/^\d+$/.test(app.id)) {
        const id = parseInt(app.id);
        return id >= range.min && id <= range.max;
      }
      // IDê°€ ë¬¸ì?´ì¸ ê²½ìš° (Date.now_ ?•íƒœ) ?ˆìš©
      if (app.id.includes('_')) {
        return true;
      }
      // ê¸°í? ?•íƒœ??ID???ˆìš©
      return true;
    });

    // ë©”ëª¨ë¦??€?¥ì†Œ ?…ë°?´íŠ¸
    memoryStorage = validApps;

    // ë¡œì»¬ ?˜ê²½?ì„œ??ê¸€ë¡œë²Œ ?€?¥ì†Œ ?°ì„  ?¬ìš© (ë¡œì»¬ ?Œì¼ ?€???œê±°)
    // ë¡œì»¬ ?Œì¼ ?€?¥ì„ ?œê±°?˜ì—¬ ê¸€ë¡œë²Œ?ë§Œ ?„ë‹¬?˜ë„ë¡???

    // Vercel ?˜ê²½?ì„œ??Blob ?™ê¸°???•ì¸ (ë©”ëª¨??ë°©ì‹)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        // Blob???€????ì¦‰ì‹œ ?¤ì‹œ ?½ì–´???™ê¸°???•ì¸
        const { blobs } = await list({ prefix: 'apps.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const savedData = await response.json();
            // ?€?¥ëœ ?°ì´?°ì? ë©”ëª¨ë¦??™ê¸°??
            memoryStorage = savedData;
          }
        }
      } catch (blobError) {
        // Blob ?™ê¸°???¤íŒ¨??ë¬´ì‹œ (ë©”ëª¨ë¦¬ëŠ” ?´ë? ?…ë°?´íŠ¸??
      }
    }

    return NextResponse.json({
      success: true,
      type,
      count: validApps.length,
      message: `${type} ?±ì´ ?±ê³µ?ìœ¼ë¡??€?¥ë˜?ˆìŠµ?ˆë‹¤.`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '???€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.',
      details: error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

// Events ???•ë³´ë§??€?¥í•˜???„ìš© ?Œì¼
const EVENTS_FILENAME = 'events.json';
const LOCAL_EVENTS_PATH = path.join(process.cwd(), 'data', 'events.json');

// Vercel ?˜ê²½?ì„œ???„ì‹œ ë©”ëª¨ë¦??€?¥ì†Œ (Blob ?¤íŒ¨ ???´ë°±)
let memoryEvents: string[] = [];

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_EVENTS_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_EVENTS_PATH);
  } catch {
    await fs.writeFile(LOCAL_EVENTS_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<string[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_EVENTS_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(events: string[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_EVENTS_PATH, JSON.stringify(events, null, 2));
}

// GET: ë¡œì»¬ ?Œì¼ ?°ì„ , Blob ?´ë°±?¼ë¡œ Events ???•ë³´ ë°˜í™˜
export async function GET() {
  try {
    // 1) ë¨¼ì? ë¡œì»¬ ?Œì¼?ì„œ ?½ê¸° (ê°œë°œ/ë°°í¬ ?˜ê²½ ëª¨ë‘)
    try {
      const local = await readFromLocal();
      if (local && local.length > 0) {
        return NextResponse.json(local);
      }
    } catch (error) {
      }

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // 2) Blob?ì„œ ìµœì‹  JSON ?Œì¼ ?œë„
      try {
        const { blobs } = await list({ prefix: EVENTS_FILENAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // ìµœì‹ ???•ë ¬ (uploadedAt ê¸°ì?)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? json : [];
            // ë©”ëª¨ë¦¬ì? ?™ê¸°??
            memoryEvents = [...data];
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        }

      // 3) ë©”ëª¨ë¦??´ë°±
      if (memoryEvents.length > 0) {
        return NextResponse.json(memoryEvents);
      }
    }

    // 4) ëª¨ë“  ë°©ë²• ?¤íŒ¨ ??ë¹?ë°°ì—´
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Events ???•ë³´ë¥?ë°›ì•„ ê¸°ì¡´ ?°ì´?°ì? ë³‘í•© ???€??(?¤ë²„?¼ì´??ë°©ì?)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const newEvents = Array.isArray(body) ? body : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // 1. ê¸°ì¡´ Events ?°ì´??ë¡œë“œ (?¤ë²„?¼ì´??ë°©ì?)
      let currentEvents: string[] = [];
      try {
        const { blobs } = await list({ prefix: EVENTS_FILENAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const res = await fetch(blobs[0].url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            currentEvents = Array.isArray(json) ? json : [];
          }
        }
      } catch (error) {
        currentEvents = memoryEvents;
      }
      
      // 2. ê¸°ì¡´ ?°ì´?°ì? ???°ì´??ë³‘í•© (ì¤‘ë³µ ?œê±°)
      const mergedEvents = Array.from(new Set([...currentEvents, ...newEvents]));
      // 3. ë³‘í•©???°ì´???€??
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await put(EVENTS_FILENAME, JSON.stringify(mergedEvents, null, 2), {
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
      
      // ë©”ëª¨ë¦¬ë„ ??ƒ ?…ë°?´íŠ¸
      memoryEvents = [...mergedEvents];
      
      if (blobSaved) {
        return NextResponse.json({ 
          success: true, 
          storage: 'blob',
          data: mergedEvents // ë³‘í•©??ìµœì¢… ?°ì´??ë°˜í™˜
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          storage: 'memory',
          data: mergedEvents, // ë³‘í•©??ìµœì¢… ?°ì´??ë°˜í™˜
          warning: 'Blob save failed after 3 attempts; using in-memory fallback' 
        });
      }
    }

    // ë¡œì»¬ ?Œì¼ ?€??(ë³‘í•© ë¡œì§)
    const currentLocal = await readFromLocal();
    const mergedLocal = Array.from(new Set([...currentLocal, ...newEvents]));
    await writeToLocal(mergedLocal);
    return NextResponse.json({ 
      success: true, 
      storage: 'local',
      data: mergedLocal // ë³‘í•©??ìµœì¢… ?°ì´??ë°˜í™˜
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save events apps' }, { status: 500 });
  }
}

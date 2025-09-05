import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

// Featured ???•ë³´ë§??€?¥í•˜???„ìš© ?Œì¼
const FEATURED_FILENAME = 'featured.json';
const LOCAL_FEATURED_PATH = path.join(process.cwd(), 'data', 'featured.json');

// Vercel ?˜ê²½?ì„œ???„ì‹œ ë©”ëª¨ë¦??€?¥ì†Œ (Blob ?¤íŒ¨ ???´ë°±)
let memoryFeatured: string[] = [];

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_FEATURED_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_FEATURED_PATH);
  } catch {
    await fs.writeFile(LOCAL_FEATURED_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<string[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_FEATURED_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(featured: string[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_FEATURED_PATH, JSON.stringify(featured, null, 2));
}

// GET: ë¡œì»¬ ?Œì¼ ?°ì„ , Blob ?´ë°±?¼ë¡œ Featured ???•ë³´ ë°˜í™˜
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
        const { blobs } = await list({ prefix: FEATURED_FILENAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // ìµœì‹ ???•ë ¬ (uploadedAt ê¸°ì?)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? json : [];
            // ë©”ëª¨ë¦¬ì? ?™ê¸°??
            memoryFeatured = [...data];
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        }

      // 3) ë©”ëª¨ë¦??´ë°±
      if (memoryFeatured.length > 0) {
        return NextResponse.json(memoryFeatured);
      }
    }

    // 4) ëª¨ë“  ë°©ë²• ?¤íŒ¨ ??ë¹?ë°°ì—´
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Featured ???•ë³´ë¥?ë°›ì•„ ê¸°ì¡´ ?°ì´?°ì? ë³‘í•© ???€??(?¤ë²„?¼ì´??ë°©ì?)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const newFeatured = Array.isArray(body) ? body : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // 1. ê¸°ì¡´ Featured ?°ì´??ë¡œë“œ (?¤ë²„?¼ì´??ë°©ì?)
      let currentFeatured: string[] = [];
      try {
        const { blobs } = await list({ prefix: FEATURED_FILENAME, limit: 1 });
        if (blobs && blobs.length > 0) {
          const res = await fetch(blobs[0].url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            currentFeatured = Array.isArray(json) ? json : [];
          }
        }
      } catch (error) {
        currentFeatured = memoryFeatured;
      }
      
      // 2. ê¸°ì¡´ ?°ì´?°ì? ???°ì´??ë³‘í•© (ì¤‘ë³µ ?œê±°)
      const mergedFeatured = Array.from(new Set([...currentFeatured, ...newFeatured]));
      // 3. ë³‘í•©???°ì´???€??
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await put(FEATURED_FILENAME, JSON.stringify(mergedFeatured, null, 2), {
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
      memoryFeatured = [...mergedFeatured];
      
      if (blobSaved) {
        return NextResponse.json({ 
          success: true, 
          storage: 'blob',
          data: mergedFeatured // ë³‘í•©??ìµœì¢… ?°ì´??ë°˜í™˜
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          storage: 'memory',
          data: mergedFeatured, // ë³‘í•©??ìµœì¢… ?°ì´??ë°˜í™˜
          warning: 'Blob save failed after 3 attempts; using in-memory fallback' 
        });
      }
    }

    // ë¡œì»¬ ?Œì¼ ?€??(ë³‘í•© ë¡œì§)
    const currentLocal = await readFromLocal();
    const mergedLocal = Array.from(new Set([...currentLocal, ...newFeatured]));
    await writeToLocal(mergedLocal);
    return NextResponse.json({ 
      success: true, 
      storage: 'local',
      data: mergedLocal // ë³‘í•©??ìµœì¢… ?°ì´??ë°˜í™˜
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save featured apps' }, { status: 500 });
  }
}

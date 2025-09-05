import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

// ?¨ì¼ ?Œì¼ë¡?Featured/Events ???•ë³´ë¥??€??
const FEATURED_FILE_NAME = 'featured-apps.json';
const LOCAL_FEATURED_PATH = path.join(process.cwd(), 'data', 'featured-apps.json');

// Vercel ?˜ê²½?ì„œ???„ì‹œ ë©”ëª¨ë¦??€?¥ì†Œ (Blob ?¤íŒ¨ ???´ë°±)
let memoryFeatured: { featured: string[]; events: string[] } = { featured: [], events: [] };

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_FEATURED_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_FEATURED_PATH);
  } catch {
    await fs.writeFile(LOCAL_FEATURED_PATH, JSON.stringify({ featured: [], events: [] }));
  }
}

async function readFromLocal(): Promise<{ featured: string[]; events: string[] }> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_FEATURED_PATH, 'utf-8');
  return JSON.parse(data || '{"featured": [], "events": []}');
}

async function writeToLocal(featured: { featured: string[]; events: string[] }) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_FEATURED_PATH, JSON.stringify(featured, null, 2));
}

// GET: Blob ?ëŠ” ë¡œì»¬?ì„œ Featured/Events ???•ë³´ ë°˜í™˜
export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    if (isProd) {
      // 1) Blob?ì„œ ìµœì‹  JSON ?Œì¼ ?œë„
      try {
        const { blobs } = await list({ prefix: FEATURED_FILE_NAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // ìµœì‹ ???•ë ¬ (uploadedAt ê¸°ì?)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = json.featured && json.events ? json : { featured: [], events: [] };
            
            // ë©”ëª¨ë¦¬ì? ?™ê¸°??
            memoryFeatured = { ...data };
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        }

      // 2) ë©”ëª¨ë¦??´ë°±
      if (memoryFeatured.featured.length > 0 || memoryFeatured.events.length > 0) {
        return NextResponse.json(memoryFeatured);
      }

      // 3) ëª¨ë“  ?ŒìŠ¤?ì„œ ?°ì´?°ê? ?†ìœ¼ë©?ê¸°ë³¸ê°?
      return NextResponse.json({ featured: [], events: [] });
    }

    // ê°œë°œ ?˜ê²½: ë¡œì»¬ ?Œì¼
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json({ featured: [], events: [] }, { status: 200 });
  }
}

// POST: Featured/Events ???•ë³´ë¥?ë°›ì•„ Blob(?ëŠ” ë¡œì»¬)???€??
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const featured = body && typeof body === 'object' && 'featured' in body && 'events' in body 
      ? (body as { featured: string[]; events: string[] })
      : { featured: [], events: [] };

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob ?€??ê°•í™” - ?¬ì‹œ??ë¡œì§ ì¶”ê?
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await put(FEATURED_FILE_NAME, JSON.stringify(featured, null, 2), {
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
      memoryFeatured = { ...featured };
      
      if (blobSaved) {
        return NextResponse.json({ success: true, storage: 'blob' });
      } else {
        return NextResponse.json({ 
          success: true, 
          storage: 'memory', 
          warning: 'Blob save failed after 3 attempts; using in-memory fallback' 
        });
      }
    }

    // ë¡œì»¬ ?Œì¼ ?€??
    await writeToLocal(featured);
    return NextResponse.json({ success: true, storage: 'local' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save featured apps' }, { status: 500 });
  }
}

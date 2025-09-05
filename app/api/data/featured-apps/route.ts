import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

// ?�일 ?�일�?Featured/Events ???�보�??�??
const FEATURED_FILE_NAME = 'featured-apps.json';
const LOCAL_FEATURED_PATH = path.join(process.cwd(), 'data', 'featured-apps.json');

// Vercel ?�경?�서???�시 메모�??�?�소 (Blob ?�패 ???�백)
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

// GET: Blob ?�는 로컬?�서 Featured/Events ???�보 반환
export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    if (isProd) {
      // 1) Blob?�서 최신 JSON ?�일 ?�도
      try {
        const { blobs } = await list({ prefix: FEATURED_FILE_NAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // 최신???�렬 (uploadedAt 기�?)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = json.featured && json.events ? json : { featured: [], events: [] };
            
            // 메모리�? ?�기??
            memoryFeatured = { ...data };
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        }

      // 2) 메모�??�백
      if (memoryFeatured.featured.length > 0 || memoryFeatured.events.length > 0) {
        return NextResponse.json(memoryFeatured);
      }

      // 3) 모든 ?�스?�서 ?�이?��? ?�으�?기본�?
      return NextResponse.json({ featured: [], events: [] });
    }

    // 개발 ?�경: 로컬 ?�일
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json({ featured: [], events: [] }, { status: 200 });
  }
}

// POST: Featured/Events ???�보�?받아 Blob(?�는 로컬)???�??
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const featured = body && typeof body === 'object' && 'featured' in body && 'events' in body 
      ? (body as { featured: string[]; events: string[] })
      : { featured: [], events: [] };

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob ?�??강화 - ?�시??로직 추�?
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
      
      // 메모리도 ??�� ?�데?�트
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

    // 로컬 ?�일 ?�??
    await writeToLocal(featured);
    return NextResponse.json({ success: true, storage: 'local' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save featured apps' }, { status: 500 });
  }
}

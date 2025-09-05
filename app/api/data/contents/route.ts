import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import type { ContentItem } from '@/types';

// ?¨ì¼ ?Œì¼ë¡?ëª¨ë“  ?€?…ì˜ ì½˜í…ì¸ ë? ?€??
const CONTENTS_FILE_NAME = 'contents.json';
const LOCAL_CONTENTS_PATH = path.join(process.cwd(), 'data', 'contents.json');

// Vercel ?˜ê²½?ì„œ???„ì‹œ ë©”ëª¨ë¦??€?¥ì†Œ (Blob ?¤íŒ¨ ???´ë°±)
// /api/content??ë©”ëª¨ë¦¬ì? ?™ê¸°?”í•˜ê¸??„í•œ ê³µìœ  ?€?¥ì†Œ
let memoryContents: ContentItem[] = [];

// /api/content??ë©”ëª¨ë¦¬ì? ?™ê¸°?”í•˜???¨ìˆ˜
async function syncWithContentMemory(): Promise<ContentItem[]> {
  try {
    // /api/content?ì„œ ?„ì¬ ë©”ëª¨ë¦??íƒœ ì¡°íšŒ
    const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${origin}/api/content`, { cache: 'no-store' });
    if (res.ok) {
      const contentMemory = await res.json();
      if (Array.isArray(contentMemory)) {
        memoryContents = [...contentMemory];
        return memoryContents;
      }
    }
  } catch (error) {
    }
  return memoryContents;
}

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_CONTENTS_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_CONTENTS_PATH);
  } catch {
    await fs.writeFile(LOCAL_CONTENTS_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<ContentItem[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_CONTENTS_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(contents: ContentItem[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_CONTENTS_PATH, JSON.stringify(contents, null, 2));
}

// GET: Blob ?ëŠ” ë¡œì»¬?ì„œ ì½˜í…ì¸?ë°°ì—´ ë°˜í™˜
export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    if (isProd) {
      // 1) Blob?ì„œ ìµœì‹  JSON ?Œì¼ ?œë„ (?¬ëŸ¬ ê°?ê°€?¸ì???ìµœì‹  ê²?? íƒ)
      try {
        const { blobs } = await list({ prefix: CONTENTS_FILE_NAME, limit: 100 });
        if (blobs && blobs.length > 0) {
          // ìµœì‹ ???•ë ¬ (uploadedAt ê¸°ì?)
          blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          const latestBlob = blobs[0];
          
          
          const res = await fetch(latestBlob.url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? (json as ContentItem[]) : [];
            
            // App Story ?„ìš© ?”ë²„ê¹?
            const appStoryCount = data.filter(c => c.type === 'appstory').length;
            const newsCount = data.filter(c => c.type === 'news').length;
            
            return NextResponse.json(data);
          }
        }
      } catch (error) {
        // Blob ì¡°íšŒ ?¤íŒ¨ ??ë¬´ì‹œ?˜ê³  ?´ë°± ì§„í–‰
      }

      // 2) ë©”ëª¨ë¦??´ë°±
      if (memoryContents.length > 0) {
        
        // App Story ?„ìš© ?”ë²„ê¹?
        const appStoryCount = memoryContents.filter(c => c.type === 'appstory').length;
        const newsCount = memoryContents.filter(c => c.type === 'news').length;
        
        return NextResponse.json(memoryContents);
      }

      // 4) ëª¨ë“  ?ŒìŠ¤?ì„œ ?°ì´?°ê? ?†ìœ¼ë©?ë¹?ë°°ì—´
      return NextResponse.json([]);
    }

    // ê°œë°œ ?˜ê²½: ë¡œì»¬ ?Œì¼
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: ?„ì²´ ì½˜í…ì¸?ë°°ì—´??ë°›ì•„ Blob(?ëŠ” ë¡œì»¬)???€??
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const contents = Array.isArray(body) ? (body as ContentItem[]) : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // Blob ?€??ê°•í™” - ?¬ì‹œ??ë¡œì§ ì¶”ê?
      let blobSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // App Story ?„ìš© ?”ë²„ê¹?
          const appStoryCount = contents.filter(c => c.type === 'appstory').length;
          const newsCount = contents.filter(c => c.type === 'news').length;
          await put(CONTENTS_FILE_NAME, JSON.stringify(contents, null, 2), {
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
      memoryContents = [...contents];
      
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

    await writeToLocal(contents);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save contents' }, { status: 500 });
  }
}

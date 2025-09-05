import { NextRequest, NextResponse } from 'next/server';
import { loadFeaturedAppsFromBlob, saveFeaturedAppsToBlob } from '@/lib/data-loader';
import { put, list } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

// ?∞Ì???Ï∫êÏãú ?§Ï†ï
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// ?ÅÏàò
const FEATURED_FILE_NAME = 'featured-apps.json';
const LOCAL_FEATURED_PATH = path.join(process.cwd(), 'data', 'featured-apps.json');

// Î©îÎ™®Î¶??¥Î∞±
let memoryFeatured: { featured: string[]; events: string[] } = { featured: [], events: [] };

// ?¨Ìçº ?®Ïàò??
type FeaturedSets = { featured: string[]; events: string[] };

async function readFromBlobLatest(): Promise<FeaturedSets | null> {
  const { blobs } = await list({ prefix: FEATURED_FILE_NAME, limit: 100 });
  if (!blobs || blobs.length === 0) return null;

  blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const latest = blobs[0];
  const res = await fetch(latest.url, { cache: 'no-store' });
  if (!res.ok) return null;

  const json = await res.json();
  const data: FeaturedSets = {
    featured: Array.isArray(json?.featured) ? json.featured : [],
    events: Array.isArray(json?.events) ? json.events : [],
  };
  return data;
}

async function writeBlobSets(sets: FeaturedSets): Promise<"blob" | "memory" | "local"> {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  
  // Vercel ?òÍ≤Ω?êÏÑú Blob ?Ä???úÎèÑ
  if (isProd) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await put(FEATURED_FILE_NAME, JSON.stringify(sets, null, 2), {
          access: 'public',
          contentType: 'application/json; charset=utf-8',
          addRandomSuffix: false,
        });
        memoryFeatured = { ...sets };
        return "blob";
      } catch (e) {
        :`, e);
        if (attempt === 3) {
          // Blob ?Ä???§Ìå® ??Î©îÎ™®Î¶¨Îßå ?¨Ïö© (Vercel ?åÏùº?úÏä§?úÏ? ?ΩÍ∏∞?ÑÏö©)
          memoryFeatured = { ...sets };
          return "memory";
        }
      }
    }
  }
  
  // Í∞úÎ∞ú ?òÍ≤Ω: Î°úÏª¨ ?åÏùº ?Ä??
  const dir = path.dirname(LOCAL_FEATURED_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(LOCAL_FEATURED_PATH, JSON.stringify(sets, null, 2));
  return "local";
}

async function readFromLocal(): Promise<FeaturedSets> {
  try {
    const data = await fs.readFile(LOCAL_FEATURED_PATH, 'utf-8');
    return JSON.parse(data || '{"featured": [], "events": []}');
  } catch {
    return { featured: [], events: [] };
  }
}

// GET: Î°úÏª¨ ?åÏùº ?∞ÏÑ†, Blob ?¥Î∞±?ºÎ°ú Featured/Events ???ïÎ≥¥ Ï°∞Ìöå
export async function GET() {
  try {
    // 1) Î®ºÏ? Î°úÏª¨ ?åÏùº?êÏÑú ?ΩÍ∏∞ (Í∞úÎ∞ú/Î∞∞Ìè¨ ?òÍ≤Ω Î™®Îëê)
    try {
      const local = await readFromLocal();
      if (local && (local.featured.length > 0 || local.events.length > 0)) {
        return NextResponse.json(local, { headers: { 'Cache-Control': 'no-store' } });
      }
    } catch (error) {
      }

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      // 2) Blob?êÏÑú ÏµúÏã† JSON ?åÏùº ?úÎèÑ
      try {
        const data = await readFromBlobLatest();
        if (data) {
          memoryFeatured = { ...data };
          return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
        }
      } catch (error) {
        }
      
      // 3) Î©îÎ™®Î¶??¥Î∞±
      if (memoryFeatured.featured.length > 0 || memoryFeatured.events.length > 0) {
        return NextResponse.json(memoryFeatured, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    // 4) Î™®Îì† Î∞©Î≤ï ?§Ìå® ??Îπ??∏Ìä∏ Î∞òÌôò
    return NextResponse.json({ featured: [], events: [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ featured: [], events: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}

// POST: ?ÑÏ†Ñ ?∏Ìä∏ ?Ä???ÑÏö©
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const featured = Array.isArray(body?.featured) ? body.featured : null;
    const events = Array.isArray(body?.events) ? body.events : null;

    if (!featured || !events) {
      return NextResponse.json(
        { success: false, error: "Body must be { featured: string[], events: string[] }" },
        { status: 400 }
      );
    }

    const storage = await writeBlobSets({ featured, events });
    return NextResponse.json({ success: true, storage }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save featured apps' }, { status: 500 });
  }
}

// PUT: Í∞úÎ≥Ñ ?†Í? ÏßÄ??
/** PUT body: { appId: string, type: 'featured' | 'events', action: 'add' | 'remove' } */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const appId = String(body?.appId || '');
    const type = body?.type === 'featured' ? 'featured' : 'events';
    const action = body?.action === 'remove' ? 'remove' : 'add';

    if (!appId) {
      return NextResponse.json({ success: false, error: 'appId required' }, { status: 400 });
    }

    // ?ÑÏû¨ ?∏Ìä∏ Î°úÎìú (Î°úÏª¨ ?åÏùº ?∞ÏÑ†)
    let sets: FeaturedSets | null = null;
    
    // 1) Î®ºÏ? Î°úÏª¨ ?åÏùº?êÏÑú ?ΩÍ∏∞
    try {
      sets = await readFromLocal();
      if (sets && (sets.featured.length > 0 || sets.events.length > 0)) {
        } else {
        sets = null;
      }
    } catch (error) {
      sets = null;
    }

    // 2) Î°úÏª¨ ?åÏùº???ÜÏúºÎ©?Blob?êÏÑú ?ΩÍ∏∞
    if (!sets) {
      const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
      if (isProd) {
        sets = await readFromBlobLatest();
        if (!sets) {
          sets = { ...memoryFeatured };
        }
      }
    }
    
    if (!sets) sets = { featured: [], events: [] };

    const next: FeaturedSets = {
      featured: Array.from(new Set(sets.featured)),
      events: Array.from(new Set(sets.events)),
    };

    const target = type === 'featured' ? next.featured : next.events;

    if (action === 'add') {
      if (!target.includes(appId)) {
        target.push(appId);
        } else {
        }
    } else {
      const idx = target.indexOf(appId);
      if (idx >= 0) {
        target.splice(idx, 1);
        } else {
        }
    }

    const storage = await writeBlobSets(next);
    return NextResponse.json({ success: true, storage, ...next }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to toggle featured/events' }, { status: 500 });
  }
}

// PATCH: ?†Í? ÏßÄ??- add/remove Ï≤òÎ¶¨ (Í∏∞Ï°¥ ?∏Ìôò???†Ï?)
/** PATCH body: { list: 'featured' | 'events', op: 'add' | 'remove', id: string } */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const list: 'featured' | 'events' = body?.list;
    const op: 'add' | 'remove' = body?.op;
    const id: string = body?.id;

    if (!['featured', 'events'].includes(list) || !['add', 'remove'].includes(op) || !id) {
      return NextResponse.json(
        { success: false, error: "Body must be { list: 'featured'|'events', op: 'add'|'remove', id: string }" },
        { status: 400 }
      );
    }

    // ÏµúÏã† ?∏Ìä∏ Î°úÎìú (Î°úÏª¨ ?åÏùº ?∞ÏÑ†)
    let sets: FeaturedSets | null = null;
    
    // 1) Î®ºÏ? Î°úÏª¨ ?åÏùº?êÏÑú ?ΩÍ∏∞
    try {
      sets = await readFromLocal();
      if (sets && (sets.featured.length > 0 || sets.events.length > 0)) {
        } else {
        sets = null;
      }
    } catch (error) {
      sets = null;
    }

    // 2) Î°úÏª¨ ?åÏùº???ÜÏúºÎ©?Blob?êÏÑú ?ΩÍ∏∞
    if (!sets) {
      const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
      if (isProd) {
        sets = await readFromBlobLatest();
        if (!sets) {
          // Vercel ?òÍ≤Ω?êÏÑú??Î©îÎ™®Î¶??¥Î∞±Îß??¨Ïö©
          sets = { ...memoryFeatured };
        }
      }
    }
    
    if (!sets) sets = { featured: [], events: [] };

    const next: FeaturedSets = {
      featured: Array.from(new Set(sets.featured)),
      events: Array.from(new Set(sets.events)),
    };

    const target = list === 'featured' ? next.featured : next.events;

    if (op === 'add') {
      if (!target.includes(id)) {
        target.push(id);
        } else {
        }
    } else {
      const idx = target.indexOf(id);
      if (idx >= 0) {
        target.splice(idx, 1);
        } else {
        }
    }

    const storage = await writeBlobSets(next);
    return NextResponse.json({ success: true, storage, ...next }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to toggle featured/events' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { ContentItem, ContentFormData } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// ë¡œì»¬ ?Œì¼ ê²½ë¡œ
const CONTENT_FILE_PATH = path.join(process.cwd(), 'data', 'contents.json');

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
    
  }
}

// ì½˜í…ì¸?ë¡œë“œ
async function loadContents(): Promise<ContentItem[]> {
  try {
    // Vercel ?˜ê²½?ì„œ??ë©”ëª¨ë¦??€?¥ì†Œë§??¬ìš© (ë¬´í•œ ?¬ê? ë°©ì?)
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

// ë©”ëª¨ë¦?ê¸°ë°˜ ?€?¥ì†Œ (Vercel ?˜ê²½?ì„œ ?¬ìš©)
let memoryStorage: ContentItem[] = [];

// ì½˜í…ì¸??€??
async function saveContents(contents: ContentItem[]) {
  try {
    // Vercel ?˜ê²½?ì„œ??ë©”ëª¨ë¦??€?¥ì†Œ ?¬ìš©
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      memoryStorage = [...contents];
      return;
    }
    
    // ë¡œì»¬ ?˜ê²½?ì„œ???Œì¼ ?€??
    await ensureDataFile();
    const jsonData = JSON.stringify(contents, null, 2);
    await fs.writeFile(CONTENT_FILE_PATH, jsonData);
  } catch (error) {
    throw new Error(`ì½˜í…ì¸??€???¤ë¥˜: ${error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜'}`);
  }
}

// GET: ëª¨ë“  ì½˜í…ì¸?ì¡°íšŒ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'appstory' | 'news' | null;
    const published = searchParams.get('published');
    
    // ?„ë¡œ?•ì…˜?ì„œ??ë©”ëª¨ë¦??€?¥ì†Œë§??¬ìš© (ë¬´í•œ ?¬ê? ë°©ì?)
    let contents: ContentItem[] = [];
    try {
      contents = await loadContents();
    } catch {
      contents = [];
    }
    let filteredContents = contents;

    // ?€?…ë³„ ?„í„°ë§?
    if (type) {
      filteredContents = filteredContents.filter(content => content.type === type);
    }

    // ê²Œì‹œ??ì½˜í…ì¸ ë§Œ ?„í„°ë§?
    if (published === 'true') {
      filteredContents = filteredContents.filter(content => content.isPublished);
    }

    // ìµœì‹ ???•ë ¬
    filteredContents.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    return NextResponse.json(filteredContents);
  } catch {
    
    return NextResponse.json({ error: 'ì½˜í…ì¸?ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤.' }, { status: 500 });
  }
}

// POST: ??ì½˜í…ì¸??ì„±
export async function POST(request: NextRequest) {
  try {
    const body: ContentFormData & { imageUrl?: string } = await request.json();
    
    // ?„ìˆ˜ ?„ë“œ ê²€ì¦?
    if (!body.title?.trim()) {
      return NextResponse.json({ error: '?œëª©?€ ?„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }
    if (!body.author?.trim()) {
      return NextResponse.json({ error: '?‘ì„±?ëŠ” ?„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: '?´ìš©?€ ?„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: 'ì½˜í…ì¸??€?…ì? ?„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }
    
    const contents = await loadContents();
    
    // ID ë²”ìœ„ ë¶„ë¦¬: App Story (1-9999), News (10000-19999)
    const baseId = body.type === 'appstory' ? 1 : 10000;
    const maxId = body.type === 'appstory' ? 9999 : 19999;
    
    // ê¸°ì¡´ ID?€ ê²¹ì¹˜ì§€ ?ŠëŠ” ê³ ìœ  ID ?ì„±
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      const timestamp = Date.now() + attempts;
      const randomOffset = Math.floor(Math.random() * (maxId - baseId + 1));
      id = (baseId + randomOffset).toString();
      attempts++;
      
      // ?´ë? ì¡´ì¬?˜ëŠ” ID?¸ì? ?•ì¸
      const existingContent = contents.find(c => c.id === id);
      if (!existingContent) break;
      
      if (attempts >= maxAttempts) {
        // ìµœë? ?œë„ ?Ÿìˆ˜ ì´ˆê³¼ ???€?„ìŠ¤?¬í”„ ê¸°ë°˜ ID ?ì„±
        id = (baseId + (Date.now() % (maxId - baseId + 1))).toString();
        break;
      }
    } while (true);
    
    const newContent: ContentItem = {
      id,
      title: body.title.trim(),
      content: body.content.trim(),
      author: body.author.trim(),
      publishDate: new Date().toISOString(),
      type: body.type,
      tags: body.tags ? body.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      isPublished: body.isPublished || false,
      imageUrl: body.imageUrl,
    };

    contents.push(newContent);
    await saveContents(contents);

    // ?”ë²„ê¹? ?„ì¬ ì½˜í…ì¸??íƒœ ë¡œê·¸

    // ì½˜í…ì¸??ì„± ë¡œê·¸

    // Blob ?™ê¸°??(?ì† ?€?? - ?„ì²´ ì½˜í…ì¸??€??
    let blobSyncSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const origin = new URL(request.url).origin;
        
        
        // ?„ì²´ ì½˜í…ì¸ ë? ë³´ë‚´??ëª¨ë“  ?€?…ì˜ ?°ì´?°ë? ë³´ì¡´
        const response = await fetch(`${origin}/api/data/contents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contents),
        });
        
        if (response.ok) {
          const result = await response.json();
          blobSyncSuccess = true;
          break;
        } else {
          : ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        :`, error);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // ì§€??ë°±ì˜¤??
        }
      }
    }
    
    if (!blobSyncSuccess) {
      } else {
    }

    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜';
    return NextResponse.json({ 
      error: 'ì½˜í…ì¸??ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT: ì½˜í…ì¸??…ë°?´íŠ¸
export async function PUT(request: NextRequest) {
  try {
    const body: { id: string } & Partial<ContentFormData> & { imageUrl?: string } = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ì½˜í…ì¸?ID???„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }

    // ?„ìˆ˜ ?„ë“œ ê²€ì¦?(?…ë°?´íŠ¸ ?œì—??
    if (updateData.title !== undefined && !updateData.title.trim()) {
      return NextResponse.json({ error: '?œëª©?€ ?„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }
    if (updateData.author !== undefined && !updateData.author.trim()) {
      return NextResponse.json({ error: '?‘ì„±?ëŠ” ?„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }
    if (updateData.content !== undefined && !updateData.content.trim()) {
      return NextResponse.json({ error: '?´ìš©?€ ?„ìˆ˜?…ë‹ˆ??' }, { status: 400 });
    }

    const contents = await loadContents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: 'ì½˜í…ì¸ ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.' }, { status: 404 });
    }

    contents[contentIndex] = {
      ...contents[contentIndex],
      ...updateData,
      title: updateData.title?.trim() ?? contents[contentIndex].title,
      author: updateData.author?.trim() ?? contents[contentIndex].author,
      content: updateData.content?.trim() ?? contents[contentIndex].content,
      tags: updateData.tags ? updateData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : contents[contentIndex].tags,
    };

    await saveContents(contents);

    // Blob ?™ê¸°??(?ì† ?€?? - ?€?…ë³„ë¡?ë¶„ë¦¬?´ì„œ ?€??
    let blobSyncSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const origin = new URL(request.url).origin;
        
        // ?„ì²´ ì½˜í…ì¸ ë? ë³´ë‚´??ëª¨ë“  ?€?…ì˜ ?°ì´?°ë? ë³´ì¡´
        const response = await fetch(`${origin}/api/data/contents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contents),
        });
        
        if (response.ok) {
          blobSyncSuccess = true;
          break;
        }
      } catch (error) {
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // ì§€??ë°±ì˜¤??
        }
      }
    }
    
    if (!blobSyncSuccess) {
      }

    return NextResponse.json(contents[contentIndex]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜';
    return NextResponse.json({ 
      error: 'ì½˜í…ì¸??…ë°?´íŠ¸???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE: ì½˜í…ì¸??? œ
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ì½˜í…ì¸?IDê°€ ?„ìš”?©ë‹ˆ??' }, { status: 400 });
    }

    const contents = await loadContents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: 'ì½˜í…ì¸ ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.' }, { status: 404 });
    }

    contents.splice(contentIndex, 1);
    await saveContents(contents);

    // Blob ?™ê¸°??(?ì† ?€?? - ?€?…ë³„ë¡?ë¶„ë¦¬?´ì„œ ?€??
    let blobSyncSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const origin = new URL(request.url).origin;
        
        // ?„ì²´ ì½˜í…ì¸ ë? ë³´ë‚´??ëª¨ë“  ?€?…ì˜ ?°ì´?°ë? ë³´ì¡´
        const response = await fetch(`${origin}/api/data/contents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contents),
        });
        
        if (response.ok) {
          blobSyncSuccess = true;
          break;
        }
      } catch (error) {
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // ì§€??ë°±ì˜¤??
        }
      }
    }
    
    if (!blobSyncSuccess) {
      }

    return NextResponse.json({ message: 'ì½˜í…ì¸ ê? ?? œ?˜ì—ˆ?µë‹ˆ??' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜';
    return NextResponse.json({ 
      error: 'ì½˜í…ì¸??? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

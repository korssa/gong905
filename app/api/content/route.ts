import { NextRequest, NextResponse } from 'next/server';
import { ContentItem, ContentFormData } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// 로컬 ?�일 경로
const CONTENT_FILE_PATH = path.join(process.cwd(), 'data', 'contents.json');

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
    
  }
}

// 콘텐�?로드
async function loadContents(): Promise<ContentItem[]> {
  try {
    // Vercel ?�경?�서??메모�??�?�소�??�용 (무한 ?��? 방�?)
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

// 메모�?기반 ?�?�소 (Vercel ?�경?�서 ?�용)
let memoryStorage: ContentItem[] = [];

// 콘텐�??�??
async function saveContents(contents: ContentItem[]) {
  try {
    // Vercel ?�경?�서??메모�??�?�소 ?�용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      memoryStorage = [...contents];
      return;
    }
    
    // 로컬 ?�경?�서???�일 ?�??
    await ensureDataFile();
    const jsonData = JSON.stringify(contents, null, 2);
    await fs.writeFile(CONTENT_FILE_PATH, jsonData);
  } catch (error) {
    throw new Error(`콘텐�??�???�류: ${error instanceof Error ? error.message : '?????�는 ?�류'}`);
  }
}

// GET: 모든 콘텐�?조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'appstory' | 'news' | null;
    const published = searchParams.get('published');
    
    // ?�로?�션?�서??메모�??�?�소�??�용 (무한 ?��? 방�?)
    let contents: ContentItem[] = [];
    try {
      contents = await loadContents();
    } catch {
      contents = [];
    }
    let filteredContents = contents;

    // ?�?�별 ?�터�?
    if (type) {
      filteredContents = filteredContents.filter(content => content.type === type);
    }

    // 게시??콘텐츠만 ?�터�?
    if (published === 'true') {
      filteredContents = filteredContents.filter(content => content.isPublished);
    }

    // 최신???�렬
    filteredContents.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    return NextResponse.json(filteredContents);
  } catch {
    
    return NextResponse.json({ error: '콘텐�?조회???�패?�습?�다.' }, { status: 500 });
  }
}

// POST: ??콘텐�??�성
export async function POST(request: NextRequest) {
  try {
    const body: ContentFormData & { imageUrl?: string } = await request.json();
    
    // ?�수 ?�드 검�?
    if (!body.title?.trim()) {
      return NextResponse.json({ error: '?�목?� ?�수?�니??' }, { status: 400 });
    }
    if (!body.author?.trim()) {
      return NextResponse.json({ error: '?�성?�는 ?�수?�니??' }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: '?�용?� ?�수?�니??' }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: '콘텐�??�?��? ?�수?�니??' }, { status: 400 });
    }
    
    const contents = await loadContents();
    
    // ID 범위 분리: App Story (1-9999), News (10000-19999)
    const baseId = body.type === 'appstory' ? 1 : 10000;
    const maxId = body.type === 'appstory' ? 9999 : 19999;
    
    // 기존 ID?� 겹치지 ?�는 고유 ID ?�성
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      const timestamp = Date.now() + attempts;
      const randomOffset = Math.floor(Math.random() * (maxId - baseId + 1));
      id = (baseId + randomOffset).toString();
      attempts++;
      
      // ?��? 존재?�는 ID?��? ?�인
      const existingContent = contents.find(c => c.id === id);
      if (!existingContent) break;
      
      if (attempts >= maxAttempts) {
        // 최�? ?�도 ?�수 초과 ???�?�스?�프 기반 ID ?�성
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

    // ?�버�? ?�재 콘텐�??�태 로그

    // 콘텐�??�성 로그

    // Blob ?�기??(?�속 ?�?? - ?�체 콘텐�??�??
    let blobSyncSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const origin = new URL(request.url).origin;
        
        
        // ?�체 콘텐츠�? 보내??모든 ?�?�의 ?�이?��? 보존
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
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 지??백오??
        }
      }
    }
    
    if (!blobSyncSuccess) {
      } else {
    }

    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '?????�는 ?�류';
    return NextResponse.json({ 
      error: '콘텐�??�성???�패?�습?�다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT: 콘텐�??�데?�트
export async function PUT(request: NextRequest) {
  try {
    const body: { id: string } & Partial<ContentFormData> & { imageUrl?: string } = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '콘텐�?ID???�수?�니??' }, { status: 400 });
    }

    // ?�수 ?�드 검�?(?�데?�트 ?�에??
    if (updateData.title !== undefined && !updateData.title.trim()) {
      return NextResponse.json({ error: '?�목?� ?�수?�니??' }, { status: 400 });
    }
    if (updateData.author !== undefined && !updateData.author.trim()) {
      return NextResponse.json({ error: '?�성?�는 ?�수?�니??' }, { status: 400 });
    }
    if (updateData.content !== undefined && !updateData.content.trim()) {
      return NextResponse.json({ error: '?�용?� ?�수?�니??' }, { status: 400 });
    }

    const contents = await loadContents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: '콘텐츠�? 찾을 ???�습?�다.' }, { status: 404 });
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

    // Blob ?�기??(?�속 ?�?? - ?�?�별�?분리?�서 ?�??
    let blobSyncSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const origin = new URL(request.url).origin;
        
        // ?�체 콘텐츠�? 보내??모든 ?�?�의 ?�이?��? 보존
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
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 지??백오??
        }
      }
    }
    
    if (!blobSyncSuccess) {
      }

    return NextResponse.json(contents[contentIndex]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '?????�는 ?�류';
    return NextResponse.json({ 
      error: '콘텐�??�데?�트???�패?�습?�다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE: 콘텐�???��
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '콘텐�?ID가 ?�요?�니??' }, { status: 400 });
    }

    const contents = await loadContents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: '콘텐츠�? 찾을 ???�습?�다.' }, { status: 404 });
    }

    contents.splice(contentIndex, 1);
    await saveContents(contents);

    // Blob ?�기??(?�속 ?�?? - ?�?�별�?분리?�서 ?�??
    let blobSyncSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const origin = new URL(request.url).origin;
        
        // ?�체 콘텐츠�? 보내??모든 ?�?�의 ?�이?��? 보존
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
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 지??백오??
        }
      }
    }
    
    if (!blobSyncSuccess) {
      }

    return NextResponse.json({ message: '콘텐츠�? ??��?�었?�니??' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '?????�는 ?�류';
    return NextResponse.json({ 
      error: '콘텐�???��???�패?�습?�다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

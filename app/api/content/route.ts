import { NextRequest, NextResponse } from 'next/server';
import { ContentItem, ContentFormData } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// 로컬 파일 경로
const CONTENT_FILE_PATH = path.join(process.cwd(), 'data', 'contents.json');

// 데이터 디렉토리 생성 및 파일 초기화
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(CONTENT_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // 파일이 없으면 빈 배열로 초기화
    try {
      await fs.access(CONTENT_FILE_PATH);
    } catch {
      await fs.writeFile(CONTENT_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // console.error('데이터 파일 초기화 오류:');
  }
}

// 콘텐츠 로드
async function loadContents(): Promise<ContentItem[]> {
  try {
    await ensureDataFile();
    const data = await fs.readFile(CONTENT_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    // console.error('콘텐츠 로드 오류:');
    return [];
  }
}

// 콘텐츠 저장
async function saveContents(contents: ContentItem[]) {
  try {
    await ensureDataFile();
    await fs.writeFile(CONTENT_FILE_PATH, JSON.stringify(contents, null, 2));
  } catch {
    // console.error('콘텐츠 저장 오류');
    throw new Error('콘텐츠 저장 오류');
  }
}

// GET: 모든 콘텐츠 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'app-story' | 'news' | null;
    const published = searchParams.get('published');

    const contents = await loadContents();
    let filteredContents = contents;

    // 타입별 필터링
    if (type) {
      filteredContents = filteredContents.filter(content => content.type === type);
    }

    // 게시된 콘텐츠만 필터링
    if (published === 'true') {
      filteredContents = filteredContents.filter(content => content.isPublished);
    }

    // 최신순 정렬
    filteredContents.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    return NextResponse.json(filteredContents);
  } catch {
    // console.error('콘텐츠 조회 오류:');
    return NextResponse.json({ error: '콘텐츠 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 콘텐츠 생성
export async function POST(request: NextRequest) {
  try {
    const body: ContentFormData & { imageUrl?: string } = await request.json();
    
    const contents = await loadContents();
    
    const newContent: ContentItem = {
      id: Date.now().toString(),
      title: body.title,
      content: body.content,
      author: body.author,
      publishDate: new Date().toISOString(),
      type: body.type,
      tags: body.tags ? body.tags.split(',').map(tag => tag.trim()) : [],
      isPublished: body.isPublished,
      views: 0,
      imageUrl: body.imageUrl,
    };

    contents.push(newContent);
    await saveContents(contents);

    return NextResponse.json(newContent, { status: 201 });
  } catch {
    // console.error('콘텐츠 생성 오류');
    return NextResponse.json({ error: '콘텐츠 생성에 실패했습니다.' }, { status: 500 });
  }
}

// PUT: 콘텐츠 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body: { id: string } & Partial<ContentFormData> & { imageUrl?: string } = await request.json();
    const { id, ...updateData } = body;

    const contents = await loadContents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    contents[contentIndex] = {
      ...contents[contentIndex],
      ...updateData,
      tags: updateData.tags ? updateData.tags.split(',').map(tag => tag.trim()) : contents[contentIndex].tags,
    };

    await saveContents(contents);

    return NextResponse.json(contents[contentIndex]);
  } catch {
    // console.error('콘텐츠 업데이트 오류');
    return NextResponse.json({ error: '콘텐츠 업데이트에 실패했습니다.' }, { status: 500 });
  }
}

// DELETE: 콘텐츠 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '콘텐츠 ID가 필요합니다.' }, { status: 400 });
    }

    const contents = await loadContents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    contents.splice(contentIndex, 1);
    await saveContents(contents);

    return NextResponse.json({ message: '콘텐츠가 삭제되었습니다.' });
  } catch {
    // console.error('콘텐츠 삭제 오류');
    return NextResponse.json({ error: '콘텐츠 삭제에 실패했습니다.' }, { status: 500 });
  }
}

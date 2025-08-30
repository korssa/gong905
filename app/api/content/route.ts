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
    
  }
}

// 콘텐츠 로드
async function loadContents(): Promise<ContentItem[]> {
  try {
    // Vercel 환경에서는 메모리 저장소 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('Vercel 환경 감지 - 메모리 저장소에서 로드');
      console.log('메모리 저장소 항목 수:', memoryStorage.length);
      return memoryStorage;
    }
    
    // 로컬 환경에서는 파일에서 로드
    console.log('로컬 환경 감지 - 파일에서 로드');
    await ensureDataFile();
    const data = await fs.readFile(CONTENT_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('콘텐츠 로드 오류:', error);
    return [];
  }
}

// 메모리 기반 저장소 (Vercel 환경에서 사용)
let memoryStorage: ContentItem[] = [];

// 콘텐츠 저장
async function saveContents(contents: ContentItem[]) {
  try {
    console.log('=== saveContents 시작 ===');
    console.log('콘텐츠 수:', contents.length);
    console.log('현재 작업 디렉토리:', process.cwd());
    console.log('파일 경로:', CONTENT_FILE_PATH);
    console.log('환경 변수 NODE_ENV:', process.env.NODE_ENV);
    
    // Vercel 환경에서는 메모리 저장소 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('Vercel 환경 감지 - 메모리 저장소 사용');
      memoryStorage = [...contents];
      console.log('메모리 저장소 업데이트 완료, 저장된 항목 수:', memoryStorage.length);
      console.log('=== saveContents 완료 (메모리) ===');
      return;
    }
    
    // 로컬 환경에서는 파일 저장
    console.log('로컬 환경 감지 - 파일 저장소 사용');
    console.log('데이터 파일 확인 시작');
    await ensureDataFile();
    console.log('데이터 파일 확인 완료');
    
    console.log('JSON 데이터 생성 시작');
    const jsonData = JSON.stringify(contents, null, 2);
    console.log('JSON 데이터 생성 완료, 크기:', jsonData.length);
    console.log('JSON 데이터 미리보기:', jsonData.substring(0, 200) + '...');
    
    console.log('파일 쓰기 시작');
    await fs.writeFile(CONTENT_FILE_PATH, jsonData);
    console.log('파일 쓰기 완료:', CONTENT_FILE_PATH);
    
    // 파일이 실제로 생성되었는지 확인
    try {
      const stats = await fs.stat(CONTENT_FILE_PATH);
      console.log('파일 크기:', stats.size, '바이트');
    } catch (statError) {
      console.error('파일 상태 확인 실패:', statError);
    }
    
    console.log('=== saveContents 완료 (파일) ===');
  } catch (error) {
    console.error('=== saveContents 오류 ===');
    console.error('오류 타입:', typeof error);
    console.error('오류 메시지:', error instanceof Error ? error.message : error);
    console.error('오류 스택:', error instanceof Error ? error.stack : '스택 없음');
    console.error('현재 작업 디렉토리:', process.cwd());
    console.error('파일 경로:', CONTENT_FILE_PATH);
    console.error('환경 변수 NODE_ENV:', process.env.NODE_ENV);
    throw new Error(`콘텐츠 저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
    
    return NextResponse.json({ error: '콘텐츠 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 콘텐츠 생성
export async function POST(request: NextRequest) {
  try {
    console.log('=== POST 요청 시작 ===');
    console.log('요청 URL:', request.url);
    console.log('요청 헤더:', Object.fromEntries(request.headers.entries()));
    
    const body: ContentFormData & { imageUrl?: string } = await request.json();
    console.log('요청 본문:', body);
    console.log('요청 본문 타입:', typeof body);
    console.log('요청 본문 키들:', Object.keys(body || {}));
    
    // 필수 필드 검증
    console.log('=== 필수 필드 검증 시작 ===');
    console.log('title:', body.title, '타입:', typeof body.title);
    console.log('author:', body.author, '타입:', typeof body.author);
    console.log('content:', body.content, '타입:', typeof body.content);
    console.log('type:', body.type, '타입:', typeof body.type);
    
    if (!body.title?.trim()) {
      console.log('제목 누락');
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 });
    }
    if (!body.author?.trim()) {
      console.log('작성자 누락');
      return NextResponse.json({ error: '작성자는 필수입니다.' }, { status: 400 });
    }
    if (!body.content?.trim()) {
      console.log('내용 누락');
      return NextResponse.json({ error: '내용은 필수입니다.' }, { status: 400 });
    }
    if (!body.type) {
      console.log('타입 누락');
      return NextResponse.json({ error: '콘텐츠 타입은 필수입니다.' }, { status: 400 });
    }
    
    console.log('=== 필수 필드 검증 통과 ===');
    console.log('기존 콘텐츠 로드 시작');
    const contents = await loadContents();
    console.log('기존 콘텐츠 수:', contents.length);
    
         console.log('=== 새 콘텐츠 객체 생성 ===');
     const newContent: ContentItem = {
       id: Date.now().toString(),
       title: body.title.trim(),
       content: body.content.trim(),
       author: body.author.trim(),
       publishDate: new Date().toISOString(),
       type: body.type,
       tags: body.tags ? body.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
       isPublished: body.isPublished || false,
       imageUrl: body.imageUrl,
     };

    console.log('새 콘텐츠 생성 완료:', newContent);
    contents.push(newContent);
    console.log('콘텐츠 배열에 추가 완료, 총 개수:', contents.length);
    
    console.log('=== 콘텐츠 저장 시작 ===');
    await saveContents(contents);
    console.log('=== 콘텐츠 저장 완료 ===');

    console.log('=== 응답 반환 ===');
    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    console.error('=== 콘텐츠 생성 오류 ===');
    console.error('오류 타입:', typeof error);
    console.error('오류 메시지:', error instanceof Error ? error.message : error);
    console.error('오류 스택:', error instanceof Error ? error.stack : '스택 없음');
    
    // 더 자세한 오류 정보를 클라이언트로 전달
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: '콘텐츠 생성에 실패했습니다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT: 콘텐츠 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body: { id: string } & Partial<ContentFormData> & { imageUrl?: string } = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '콘텐츠 ID는 필수입니다.' }, { status: 400 });
    }

    // 필수 필드 검증 (업데이트 시에도)
    if (updateData.title !== undefined && !updateData.title.trim()) {
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 });
    }
    if (updateData.author !== undefined && !updateData.author.trim()) {
      return NextResponse.json({ error: '작성자는 필수입니다.' }, { status: 400 });
    }
    if (updateData.content !== undefined && !updateData.content.trim()) {
      return NextResponse.json({ error: '내용은 필수입니다.' }, { status: 400 });
    }

    const contents = await loadContents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    contents[contentIndex] = {
      ...contents[contentIndex],
      ...updateData,
      title: updateData.title?.trim() || contents[contentIndex].title,
      author: updateData.author?.trim() || contents[contentIndex].author,
      content: updateData.content?.trim() || contents[contentIndex].content,
      tags: updateData.tags ? updateData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : contents[contentIndex].tags,
    };

    await saveContents(contents);

    return NextResponse.json(contents[contentIndex]);
  } catch (error) {
    console.error('콘텐츠 업데이트 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: '콘텐츠 업데이트에 실패했습니다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
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
  } catch (error) {
    console.error('콘텐츠 삭제 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: '콘텐츠 삭제에 실패했습니다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

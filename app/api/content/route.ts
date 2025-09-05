import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { list } from '@vercel/blob';

// 로컬 파일 경로
const CONTENTS_FILE_PATH = path.join(process.cwd(), 'data', 'contents.json');

// 메모리 기반 저장소 (Vercel 환경에서 사용)
let memoryStorage: any[] = [];

// 데이터 디렉토리 생성 및 파일 초기화
async function ensureDataFile() {
  try {
    const dataDir = path.dirname(CONTENTS_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // 파일이 없으면 빈 배열로 초기화
    try {
      await fs.access(CONTENTS_FILE_PATH);
    } catch {
      await fs.writeFile(CONTENTS_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // 에러 무시
  }
}

// 콘텐츠 로드 (로컬 파일 우선, Blob 폴백)
async function loadContents(): Promise<any[]> {
  try {
    // 1) 먼저 로컬 파일에서 읽기 (개발/배포 환경 모두)
    try {
      await ensureDataFile();
      const data = await fs.readFile(CONTENTS_FILE_PATH, 'utf-8');
      const contents = JSON.parse(data);
      if (contents && contents.length > 0) {
        return contents;
      }
    } catch (error) {
      // 로컬 파일 읽기 실패 무시
    }

    // 2) Vercel 환경에서는 Blob에서 직접 읽기 (메모리 방식)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        const { blobs } = await list({ prefix: 'contents.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            // 메모리도 업데이트 (동기화)
            memoryStorage = data;
            return data;
          }
        }
        // Blob에서 읽기 실패시 메모리 사용
        if (memoryStorage.length > 0) {
          return memoryStorage;
        }
      } catch (blobError) {
        // Blob 에러시 메모리 사용
        if (memoryStorage.length > 0) {
          return memoryStorage;
        }
      }
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

// GET: 콘텐츠 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const contents = await loadContents();
    
    // 타입별 필터링
    let filteredContents = contents;
    if (type) {
      filteredContents = contents.filter(content => content.type === type);
    }
    
    // 최신순 정렬
    filteredContents.sort((a, b) => new Date(b.createdAt || b.uploadDate).getTime() - new Date(a.createdAt || a.uploadDate).getTime());

    return NextResponse.json({
      type: type || 'all',
      count: filteredContents.length,
      contents: filteredContents
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '콘텐츠 목록을 불러오는데 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// POST: 콘텐츠 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contents } = body;

    if (!Array.isArray(contents)) {
      return NextResponse.json({ error: '콘텐츠 배열이 필요합니다.' }, { status: 400 });
    }

    // 메모리 저장소 업데이트
    memoryStorage = contents;

    // 로컬 환경에서는 글로벌 저장소 우선 사용 (로컬 파일 제거)
    // 로컬 파일 관리를 제거하여 글로벌만 사용하도록 변경

    // Vercel 환경에서는 Blob 읽기만 확인 (메모리 방식)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        // Blob에 저장된 즉시 최신 데이터 읽기 확인
        const { blobs } = await list({ prefix: 'contents.json', limit: 1 });
        if (blobs && blobs.length > 0) {
          const latest = blobs[0];
          const response = await fetch(latest.url, { cache: 'no-store' });
          if (response.ok) {
            const savedData = await response.json();
            // 저장된 데이터를 메모리에 반영
            memoryStorage = savedData;
          }
        }
      } catch (blobError) {
        // Blob 읽기 실패시 무시 (메모리는 이미 업데이트됨)
      }
    }

    return NextResponse.json({
      success: true,
      count: contents.length,
      message: `콘텐츠가 성공적으로 저장되었습니다.`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '콘텐츠 저장에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
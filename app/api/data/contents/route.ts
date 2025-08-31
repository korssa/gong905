import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import { ContentItem } from '@/types';

const CONTENTS_BLOB_KEY = 'data/contents.json';

export async function GET() {
  try {
    // Vercel Blob에서 콘텐츠 데이터 로드
    const { blobs } = await list();
    const contentsBlob = blobs.find(blob => blob.pathname === CONTENTS_BLOB_KEY);
    
    if (!contentsBlob) {
      // 파일이 없으면 빈 배열 반환
      return NextResponse.json([]);
    }

    const response = await fetch(contentsBlob.url);
    const contents = await response.json();
    
    return NextResponse.json(contents);
  } catch (error) {
    console.error('Failed to load contents from Vercel Blob:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contents: ContentItem[] = await request.json();
    
    // Vercel Blob에 콘텐츠 데이터 저장
    const blob = await put(CONTENTS_BLOB_KEY, JSON.stringify(contents, null, 2), {
      access: 'public',
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Failed to save contents to Vercel Blob:', error);
    return NextResponse.json({ error: 'Failed to save contents' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    
    // 유효한 갤러리 타입인지 확인
    if (!['a', 'b', 'c'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid gallery type' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const author = formData.get('author') as string || '공명';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📤 갤러리 ${type}에 이미지 업로드 시작: ${file.name}`);

    // 파일을 Vercel Blob에 업로드
    const blob = await put(
      `gallery-${type}/${Date.now()}-${file.name}`,
      file,
      {
        access: 'public',
        contentType: file.type
      }
    );

    // 기존 meta.json 로드
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({
      prefix: `gallery-${type}/`,
      limit: 1000
    });

    const metaFile = blobs.find(blob => blob.pathname === `gallery-${type}/meta.json`);
    
    let existingItems = [];
    if (metaFile) {
      try {
        const response = await fetch(metaFile.url);
        if (response.ok) {
          const data = await response.json();
          existingItems = data.items || [];
        }
      } catch (error) {
        console.warn('기존 meta.json 로드 실패, 새로 생성합니다.');
      }
    }

    // 새 아이템 추가
    const newItem = {
      id: `gallery-${type}-${Date.now()}`,
      imageUrl: blob.url,
      title: title || file.name.split('.')[0],
      author: author,
      likes: 0,
      views: 0,
      uploadDate: new Date().toISOString().split('T')[0],
      tags: []
    };

    const updatedItems = [newItem, ...existingItems];

    // meta.json 업데이트
    const metaData = {
      items: updatedItems,
      lastUpdated: new Date().toISOString(),
      version: 1,
      count: updatedItems.length,
      type: `gallery-${type}`
    };

    const metaBlob = await put(
      `gallery-${type}/meta.json`,
      JSON.stringify(metaData, null, 2),
      {
        access: 'public',
        contentType: 'application/json'
      }
    );

    console.log(`✅ 갤러리 ${type} 업로드 완료: ${blob.url}`);

    return NextResponse.json({
      success: true,
      data: newItem,
      url: blob.url,
      metaUrl: metaBlob.url,
      count: updatedItems.length
    });

  } catch (error) {
    console.error('❌ 갤러리 업로드 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

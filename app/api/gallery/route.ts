import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';

// 갤러리 아이템 타입
export interface GalleryItem {
  id: string;
  title: string;
  content: string;
  author: string;
  imageUrl?: string;
  publishDate: string;
  tags?: string[];
  isPublished: boolean;
  type: 'gallery' | 'featured' | 'events';
  store?: 'google-play' | 'app-store'; // 스토어 정보 추가
  storeUrl?: string; // 스토어 URL 추가
}

// GET: 갤러리 아이템 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | 'featured' | 'events' | null;

    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    // Vercel Blob에서 해당 타입의 폴더 조회
    const folderPath = `gallery-${type}`;
    const { blobs } = await list({
      prefix: `${folderPath}/`,
    });

    // JSON 파일들만 필터링
    const jsonFiles = blobs.filter(blob => blob.pathname.endsWith('.json'));
    
    const items: GalleryItem[] = [];

    // 각 JSON 파일에서 데이터 로드
    for (const jsonFile of jsonFiles) {
      try {
        const response = await fetch(jsonFile.url);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            items.push(...data);
          } else if (data.id) {
            items.push(data);
          }
        }
      } catch (error) {
        console.error(`JSON 파일 로드 실패: ${jsonFile.pathname}`, error);
      }
    }

    // 발행된 아이템만 반환
    const publishedItems = items.filter(item => item.isPublished);
    
    return NextResponse.json(publishedItems);

  } catch (error) {
    console.error('갤러리 조회 오류:', error);
    return NextResponse.json({ error: '갤러리 조회 실패' }, { status: 500 });
  }
}

// POST: 갤러리 아이템 생성/업데이트
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | 'featured' | 'events' | null;

    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const author = formData.get('author') as string;
    const tags = formData.get('tags') as string;
    const isPublished = formData.get('isPublished') === 'true';
    const store = formData.get('store') as 'google-play' | 'app-store' | null;
    const storeUrl = formData.get('storeUrl') as string | null;
    const file = formData.get('file') as File | null;

    if (!title || !content || !author) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다' }, { status: 400 });
    }

    // 고유 ID 생성
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let imageUrl: string | undefined;

    // 이미지 업로드
    if (file) {
      const filename = `${id}.${file.name.split('.').pop()}`;
      const blob = await put(`${type}/${filename}`, file, {
        access: 'public',
      });
      imageUrl = blob.url;
    }

    // 갤러리 아이템 생성
    const galleryItem: GalleryItem = {
      id,
      title,
      content,
      author,
      imageUrl,
      publishDate: new Date().toISOString(),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPublished,
      type,
      store: store || 'google-play', // 기본값으로 구글플레이 설정
      storeUrl: storeUrl || undefined,
    };

    // JSON 파일로 저장
    const jsonFilename = `${id}.json`;
    const jsonBlob = await put(`gallery-${type}/${jsonFilename}`, JSON.stringify(galleryItem, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({ 
      success: true, 
      item: galleryItem,
      jsonUrl: jsonBlob.url 
    });

  } catch (error) {
    console.error('갤러리 생성 오류:', error);
    return NextResponse.json({ error: '갤러리 생성 실패' }, { status: 500 });
  }
}

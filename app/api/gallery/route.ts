import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import type { GalleryItem } from '@/components/gallery-card';
import type { AppItem } from '@/types';

// JSON 파일에서 데이터를 로드하는 헬퍼 함수
async function loadDataFromFile(file: { url: string; pathname: string }): Promise<GalleryItem[]> {
  try {
    const response = await fetch(file.url);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    } else if (data.items && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  } catch (error) {
    console.error(`❌ 파일 로드 실패: ${file.pathname}`, error);
    return [];
  }
}

// 실제 앱 데이터를 로드하는 헬퍼 함수 (이미지 URL 포함)
async function loadAppsByType(type: string): Promise<AppItem[]> {
  try {
    // 앱 데이터 로드 (이미지 URL 포함)
    const { loadAppsByTypeFromBlob } = await import('@/lib/data-loader');
    const apps = await loadAppsByTypeFromBlob(type);
    
    // Featured/Events 플래그 적용
    const { loadFeaturedIds, loadEventIds } = await import('@/lib/data-loader');
    const [featuredIds, eventIds] = await Promise.all([
      loadFeaturedIds(),
      loadEventIds()
    ]);
    
    const f = new Set(featuredIds);
    const e = new Set(eventIds);
    
    return apps.map(app => ({ 
      ...app, 
      isFeatured: f.has(app.id), 
      isEvent: e.has(app.id) 
    }));
  } catch (error) {
    console.error(`❌ 앱 데이터 로드 실패 (${type}):`, error);
    return [];
  }
}

// 특정 타입의 갤러리 데이터를 로드하는 헬퍼 함수 (레거시 지원)
async function loadGalleryByType(type: string): Promise<GalleryItem[]> {
  const { blobs } = await list({
    prefix: `${type}/`,
    limit: 1000
  });

  // data.json 파일을 우선적으로 찾기
  const dataJsonFile = blobs.find(blob => blob.pathname === `${type}/data.json`);
  
  if (dataJsonFile) {
    console.log(`📁 ${type}/data.json 파일 발견, 데이터 로드 중...`);
    const items = await loadDataFromFile(dataJsonFile);
    return items;
  }

  // data.json이 없으면 다른 JSON 파일들에서 로드
  const jsonFiles = blobs.filter(blob => 
    blob.pathname.endsWith('.json') && 
    blob.pathname !== `${type}/data.json`
  );

  const allItems: GalleryItem[] = [];
  for (const file of jsonFiles) {
    const items = await loadDataFromFile(file);
    allItems.push(...items);
  }
  
  return allItems;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📱 갤러리 데이터 로드 시작...');

    // URL 파라미터에서 타입 확인
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'all';
    const format = searchParams.get('format') ?? 'apps'; // 'apps' 또는 'gallery'

    if (format === 'apps') {
      // 실제 앱 데이터 반환 (이미지 URL 포함)
      let apps: AppItem[] = [];
      
      if (type === 'all') {
        apps = await loadAppsByType('gallery');
      } else {
        apps = await loadAppsByType(type);
      }

      console.log(`✅ 앱 데이터 로드 완료: ${apps.length}개 앱`);

      return NextResponse.json({
        success: true,
        data: apps,
        count: apps.length,
        type,
        format: 'apps'
      });
    } else {
      // 레거시 갤러리 데이터 반환
      let items: GalleryItem[] = [];

      if (type === 'all') {
        items = await loadGalleryByType('gallery');
      } else {
        items = await loadGalleryByType(type);
      }

      console.log(`✅ 갤러리 데이터 로드 완료: ${items.length}개 항목`);

      return NextResponse.json({
        success: true,
        data: items,
        count: items.length,
        type,
        format: 'gallery'
      });
    }

  } catch (error) {
    console.error('❌ 갤러리 데이터 로드 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, type = 'gallery' } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Items must be an array' },
        { status: 400 }
      );
    }

    console.log(`📤 갤러리 데이터 저장 시작: ${type} 타입, ${items.length}개 항목`);

    // 기존 데이터와 병합
    const existingResponse = await fetch(`${request.nextUrl.origin}/api/gallery?type=${type}`);
    const existingData = await existingResponse.json();
    const existingItems = existingData.success ? existingData.data : [];

    // 중복 제거 (ID 기준)
    const existingIds = new Set(existingItems.map((item: GalleryItem) => item.id));
    const newItems = items.filter((item: GalleryItem) => !existingIds.has(item.id));
    const mergedItems = [...newItems, ...existingItems];

    // Vercel Blob에 저장
    const { put } = await import('@vercel/blob');
    
    const dataToSave = {
      items: mergedItems,
      lastUpdated: new Date().toISOString(),
      version: 1,
      count: mergedItems.length
    };

    const blobUrl = await put(
      `${type}/data.json`,
      JSON.stringify(dataToSave, null, 2),
      {
        access: 'public',
        contentType: 'application/json'
      }
    );

    console.log(`✅ 갤러리 데이터 저장 완료: ${blobUrl.url}`);

    return NextResponse.json({
      success: true,
      url: blobUrl.url,
      count: mergedItems.length,
      type
    });

  } catch (error) {
    console.error('❌ 갤러리 데이터 저장 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') ?? 'gallery';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ 갤러리 항목 삭제: ${id} (${type})`);

    // 기존 데이터 로드
    const existingResponse = await fetch(`${request.nextUrl.origin}/api/gallery?type=${type}`);
    const existingData = await existingResponse.json();
    
    if (!existingData.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to load existing data' },
        { status: 500 }
      );
    }

    // 항목 제거
    const updatedItems = existingData.data.filter((item: GalleryItem) => item.id !== id);

    // 업데이트된 데이터 저장
    const { put } = await import('@vercel/blob');
    
    const dataToSave = {
      items: updatedItems,
      lastUpdated: new Date().toISOString(),
      version: 1,
      count: updatedItems.length
    };

    const blobUrl = await put(
      `${type}/data.json`,
      JSON.stringify(dataToSave, null, 2),
      {
        access: 'public',
        contentType: 'application/json'
      }
    );

    console.log(`✅ 갤러리 항목 삭제 완료: ${blobUrl.url}`);

    return NextResponse.json({
      success: true,
      url: blobUrl.url,
      count: updatedItems.length,
      type
    });

  } catch (error) {
    console.error('❌ 갤러리 항목 삭제 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

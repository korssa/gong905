import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    console.log('📱 갤러리 데이터 로드 시작...');

    // URL 파라미터에서 타입 확인
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let items = [];

    if (type === 'all') {
      // 모든 갤러리 데이터 로드
      const { blobs } = await list({
        prefix: 'gallery/',
        limit: 1000
      });

      // JSON 파일들만 필터링하고 데이터 로드
      const jsonFiles = blobs.filter(blob => 
        blob.pathname.endsWith('.json') && 
        blob.pathname !== 'gallery/data.json' // 메타데이터 파일 제외
      );

      for (const file of jsonFiles) {
        try {
          const response = await fetch(file.url);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              items.push(...data);
            } else if (data.items && Array.isArray(data.items)) {
              items.push(...data.items);
            }
          }
        } catch (error) {
          console.error(`❌ 파일 로드 실패: ${file.pathname}`, error);
        }
      }
    } else {
      // 특정 타입의 데이터 로드
      const { blobs } = await list({
        prefix: `${type}/`,
        limit: 1000
      });

      const jsonFiles = blobs.filter(blob => 
        blob.pathname.endsWith('.json') && 
        blob.pathname !== `${type}/data.json`
      );

      for (const file of jsonFiles) {
        try {
          const response = await fetch(file.url);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              items.push(...data);
            } else if (data.items && Array.isArray(data.items)) {
              items.push(...data.items);
            }
          }
        } catch (error) {
          console.error(`❌ 파일 로드 실패: ${file.pathname}`, error);
        }
      }
    }

    console.log(`✅ 갤러리 데이터 로드 완료: ${items.length}개 항목`);

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
      type
    });

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
    const existingIds = new Set(existingItems.map((item: any) => item.id));
    const newItems = items.filter((item: any) => !existingIds.has(item.id));
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
    const type = searchParams.get('type') || 'gallery';

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
    const updatedItems = existingData.data.filter((item: any) => item.id !== id);

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

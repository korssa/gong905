import { NextRequest, NextResponse } from 'next/server';
import { loadFeaturedAppsFromBlob, saveFeaturedAppsToBlob } from '@/lib/data-loader';

// GET: Featured/Events 앱 정보 조회
export async function GET() {
  try {
    const featured = await loadFeaturedAppsFromBlob();
    
    return NextResponse.json({
      success: true,
      featured: featured.featured,
      events: featured.events,
      count: {
        featured: featured.featured.length,
        events: featured.events.length
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Featured 앱 정보 조회에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// POST: Featured/Events 앱 정보 업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { featured, events } = body;
    
    if (!Array.isArray(featured) || !Array.isArray(events)) {
      return NextResponse.json({ error: 'featured와 events는 배열이어야 합니다.' }, { status: 400 });
    }
    
    const newFeatured = {
      featured: featured,
      events: events
    };
    
    await saveFeaturedAppsToBlob(newFeatured.featured, newFeatured.events);
    
    return NextResponse.json({
      success: true,
      featured: featured,
      events: events,
      count: {
        featured: featured.length,
        events: events.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: 'Featured 앱 정보 업데이트에 실패했습니다.',
      details: errorMessage
    }, { status: 500 });
  }
}

// PUT: 특정 앱의 Featured/Events 상태 토글
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, type, action } = body;
    
    if (!appId || !type || !action) {
      return NextResponse.json({ error: 'appId, type, action이 필요합니다.' }, { status: 400 });
    }
    
    if (!['featured', 'events'].includes(type)) {
      return NextResponse.json({ error: 'type은 featured 또는 events여야 합니다.' }, { status: 400 });
    }
    
    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'action은 add 또는 remove여야 합니다.' }, { status: 400 });
    }
    
    const currentFeatured = await loadFeaturedAppsFromBlob();
    let updatedList: string[];
    
    if (action === 'add') {
      updatedList = currentFeatured[type as keyof typeof currentFeatured].includes(appId) 
        ? currentFeatured[type as keyof typeof currentFeatured]
        : [...currentFeatured[type as keyof typeof currentFeatured], appId];
    } else {
      updatedList = currentFeatured[type as keyof typeof currentFeatured].filter(id => id !== appId);
    }
    
    const newFeatured = {
      ...currentFeatured,
      [type]: updatedList
    };
    
    await saveFeaturedAppsToBlob(newFeatured.featured, newFeatured.events);
    
    return NextResponse.json({
      success: true,
      [type]: updatedList,
      count: updatedList.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: 'Featured 앱 상태 토글에 실패했습니다.',
      details: errorMessage
    }, { status: 500 });
  }
}
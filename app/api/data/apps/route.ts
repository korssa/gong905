import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import { AppItem } from '@/types';

const APPS_BLOB_KEY = 'data/apps.json';

export async function GET() {
  try {
    // Vercel Blob에서 앱 데이터 로드
    const { blobs } = await list();
    const appsBlob = blobs.find(blob => blob.pathname === APPS_BLOB_KEY);
    
    if (!appsBlob) {
      // 파일이 없으면 빈 배열 반환
      return NextResponse.json([]);
    }

    const response = await fetch(appsBlob.url);
    const apps = await response.json();
    
    return NextResponse.json(apps);
  } catch (error) {
    console.error('Failed to load apps from Vercel Blob:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apps: AppItem[] = await request.json();
    
    // Vercel Blob에 앱 데이터 저장
    const blob = await put(APPS_BLOB_KEY, JSON.stringify(apps, null, 2), {
      access: 'public',
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Failed to save apps to Vercel Blob:', error);
    return NextResponse.json({ error: 'Failed to save apps' }, { status: 500 });
  }
}

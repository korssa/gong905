import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    // 각 폴더에 초기 JSON 파일 생성
    const folders = ['gallery', 'events', 'featured'];
    const results = [];

    for (const folder of folders) {
      try {
        // 각 폴더에 빈 배열로 초기화된 JSON 파일 생성
        const initialData = {
          items: [],
          lastUpdated: new Date().toISOString(),
          version: 1
        };

        const blobUrl = await put(
          `${folder}/data.json`,
          JSON.stringify(initialData, null, 2),
          {
            access: 'public',
            contentType: 'application/json'
          }
        );

        results.push({
          folder,
          success: true,
          url: blobUrl.url
        });
      } catch (error) {
        results.push({
          folder,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount === totalCount,
      message: `${successCount}/${totalCount} 폴더 생성 완료`,
      results
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('📁 3개 갤러리 폴더 초기화 시작...');
    
    // Vercel Blob 토큰 확인
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('❌ BLOB_READ_WRITE_TOKEN이 설정되지 않았습니다.');
      return NextResponse.json(
        { success: false, error: 'Vercel Blob 토큰이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const galleryTypes = ['a', 'b', 'c'];
    const results = [];

    for (const type of galleryTypes) {
      try {
        // 각 갤러리 폴더에 빈 meta.json 생성
        const metaData = {
          items: [],
          lastUpdated: new Date().toISOString(),
          version: 1,
          count: 0,
          type: `gallery-${type}`
        };

        const blobUrl = await put(
          `gallery-${type}/meta.json`,
          JSON.stringify(metaData, null, 2),
          {
            access: 'public',
            contentType: 'application/json'
          }
        );

        results.push({
          type: `gallery-${type}`,
          success: true,
          url: blobUrl.url
        });

        console.log(`✅ 갤러리 ${type} 폴더 초기화 완료: ${blobUrl.url}`);
      } catch (error) {
        console.error(`❌ 갤러리 ${type} 폴더 초기화 실패:`, error);
        results.push({
          type: `gallery-${type}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`🎉 갤러리 폴더 초기화 완료: ${successCount}/3 성공`);

    return NextResponse.json({
      success: true,
      message: `${successCount}개 갤러리 폴더가 초기화되었습니다.`,
      results
    });

  } catch (error) {
    console.error('❌ 갤러리 폴더 초기화 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

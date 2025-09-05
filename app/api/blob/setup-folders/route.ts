import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    // �??�더??초기 JSON ?�일 ?�성
    const folders = ['gallery', 'events', 'featured'];
    const results = [];

    for (const folder of folders) {
      try {
        // �??�더??�?배열�?초기?�된 JSON ?�일 ?�성
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
      message: `${successCount}/${totalCount} ?�더 ?�성 ?�료`,
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

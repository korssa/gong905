import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    console.log('📤 Vercel Blob 업로드 핸들러 시작:', body.payload);

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log('🔐 Blob 토큰 생성:', { pathname, clientPayload });
        
        // 여기서 권한 검사를 할 수 있습니다
        // 예: 관리자 권한 확인
        // const isAdmin = await verifyAdminToken(request);
        // if (!isAdmin) {
        //   throw new Error('Unauthorized');
        // }

        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png', 
            'image/jpg',
            'image/webp',
            'image/gif'
          ],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('✅ Blob 업로드 완료:', { 
          url: blob.url, 
          pathname: blob.pathname 
        });

        // 여기서 데이터베이스에 저장하거나 추가 처리를 할 수 있습니다
        // await saveToDatabase({
        //   url: blob.url,
        //   filename: blob.pathname,
        //   uploadedAt: new Date()
        // });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('❌ Vercel Blob 업로드 에러:', error);
    
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

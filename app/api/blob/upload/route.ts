import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    // Vercel Blob 업로드 핸들러 시작

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Blob 토큰 생성
        
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
        // Blob 업로드 완료

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
    // Vercel Blob 업로드 에러
    
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

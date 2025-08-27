import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const prefix = formData.get('prefix') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📁 Vercel Blob 업로드 시작:', { name: file.name, size: file.size, prefix });

      // BLOB_READ_WRITE_TOKEN 확인 (민감값 직접 로그에 노출하지 않음)
      const getToken = () => {
        if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
        if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN) return process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
        for (const k of Object.keys(process.env)) {
          const lk = k.toLowerCase();
          if (lk.startsWith('vercel_blob_rw_') || lk.includes('vercel_blob_rw_')) {
            return process.env[k];
          }
        }
        return undefined;
      };

      const token = getToken();
      if (!token) {
        console.error('❌ BLOB token not found in environment variables');
        return NextResponse.json(
          { error: 'BLOB_READ_WRITE_TOKEN environment variable is required' },
          { status: 500 }
        );
      }

    // 고유한 파일명 생성
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${prefix}_${timestamp}_${randomId}.${fileExtension}`;

    console.log('📝 생성된 파일명:', fileName);

    // Vercel Blob에 업로드
    const blob = await put(fileName, file, {
      access: 'public',
    });

    console.log('✅ Vercel Blob 업로드 완료:', blob.url);

    return NextResponse.json({ 
      success: true, 
      url: blob.url,
      fileName,
      size: file.size
    });

  } catch (error) {
    console.error('❌ Vercel Blob 업로드 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload file to Vercel Blob',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

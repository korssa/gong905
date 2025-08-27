import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

    console.log('📁 로컬 파일 업로드 시작:', { name: file.name, size: file.size, prefix });

    // uploads 디렉토리 확인/생성
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log('📂 uploads 디렉토리 생성됨');
    }

    // 고유한 파일명 생성
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.name);
    const fileName = `${prefix}_${timestamp}_${randomId}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // 공개 URL 생성 (상대 경로)
    const publicUrl = `/uploads/${fileName}`;

    console.log('✅ 로컬 파일 업로드 완료:', { fileName, size: buffer.length, url: publicUrl });

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName,
      size: buffer.length
    });

  } catch (error) {
    console.error('❌ 로컬 파일 업로드 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

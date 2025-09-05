import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 허용된 파일 타입들
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

// 최대 파일 크기 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const prefix = formData.get('prefix') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 허용됩니다.` },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원되지 않는 파일 형식입니다. 이미지 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // uploads 디렉토리 확인/생성
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // 고유한 파일명 생성 (보안 강화)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.name).toLowerCase();
    const sanitizedPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `${sanitizedPrefix}_${timestamp}_${randomId}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // 공개 URL 생성 (상대 경로)
    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName,
      size: buffer.length,
      type: file.type
    });

  } catch (err) {
    console.error('파일 업로드 오류:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: '파일 업로드에 실패했습니다.',
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}

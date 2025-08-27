import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { del } from '@vercel/blob';

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    console.log('🗑️ 파일 삭제 시작:', url);

    // Vercel Blob Storage URL인 경우
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
      console.log('☁️ Vercel Blob Storage 파일 삭제');
      
      try {
        await del(url);
        console.log('✅ Vercel Blob Storage 파일 삭제 완료');
        
        return NextResponse.json({ 
          success: true,
          deletedFile: url,
          storageType: 'vercel-blob'
        });
      } catch (error) {
        console.error('❌ Vercel Blob Storage 파일 삭제 실패:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to delete Vercel Blob file',
            details: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
    }
    
    // 로컬 업로드 파일인 경우
    if (url.startsWith('/uploads/')) {
      console.log('📁 로컬 파일 삭제');
      
      const fileName = url.split('/').pop();
      const filePath = path.join(process.cwd(), 'public', url);

      // 파일 존재 확인
      try {
        await fs.access(filePath);
      } catch {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      // 파일 삭제
      await fs.unlink(filePath);
      console.log('✅ 로컬 파일 삭제 완료:', fileName);

      return NextResponse.json({ 
        success: true,
        deletedFile: fileName,
        storageType: 'local'
      });
    }

    // 외부 URL인 경우 (삭제 불가)
    console.log('ℹ️ 외부 URL - 삭제 불가능');
    return NextResponse.json({ 
      success: true,
      message: 'External URL - deletion not required',
      storageType: 'external'
    });

  } catch (error) {
    console.error('❌ 파일 삭제 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

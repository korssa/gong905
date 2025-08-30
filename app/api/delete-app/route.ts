import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { del } from '@vercel/blob';

interface AppItem {
  id: string;
  name: string;
  developer: string;
  description: string;
  iconUrl: string;
  screenshotUrls: string[];
  store: string;
  status: string;
  rating: number;
  downloads: string;
  views: number;
  likes: number;
  uploadDate: string;
  tags?: string[];
  storeUrl?: string;
  version?: string;
  size?: string;
  category?: string;
}

// 파일 삭제 헬퍼 함수
async function deleteFile(url: string): Promise<boolean> {
  try {
    console.log('🔍 Attempting to delete file:', url);
    
    // Vercel Blob Storage URL인 경우
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
      console.log('☁️ Deleting from Vercel Blob Storage');
      await del(url);
      console.log('✅ Vercel Blob file deleted');
      return true;
    }

    // 로컬 파일인 경우
    if (url.startsWith('/uploads/')) {
      console.log('📁 Deleting local file');
      const fileName = url.split('/').pop();
      if (!fileName) {
        console.log('❌ Invalid file name');
        return false;
      }

      const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
      console.log('📂 File path:', filePath);
      
      // 파일 존재 여부 확인
      try {
        await fs.access(filePath);
        console.log('✅ File exists');
      } catch {
        console.log('❌ File not found');
        return false;
      }

      // 파일 삭제
      await fs.unlink(filePath);
      console.log('✅ Local file deleted');
      return true;
    }

    // 외부 URL인 경우 (삭제 불가)
    console.log('❌ External URL, cannot delete');
    return false;
  } catch (error) {
    console.error('💥 Error deleting file:', error);
    return false;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, iconUrl, screenshotUrls } = await request.json();

    console.log('🔍 Delete app request:', { id, iconUrl, screenshotUrls });

    if (!id) {
      return NextResponse.json(
        { error: 'App ID is required' },
        { status: 400 }
      );
    }

    // 아이콘 파일 삭제
    let iconDeleted = false;
    if (iconUrl) {
      console.log('🗑️ Deleting icon:', iconUrl);
      iconDeleted = await deleteFile(iconUrl);
      console.log('✅ Icon deleted:', iconDeleted);
    }

    // 스크린샷 파일들 삭제
    let screenshotsDeleted = 0;
    if (screenshotUrls && Array.isArray(screenshotUrls)) {
      for (const screenshotUrl of screenshotUrls) {
        console.log('🗑️ Deleting screenshot:', screenshotUrl);
        const deleted = await deleteFile(screenshotUrl);
        if (deleted) {
          screenshotsDeleted++;
        }
        console.log('✅ Screenshot deleted:', deleted);
      }
    }

    // localStorage 기반 앱 데이터는 클라이언트에서 처리되므로
    // 서버에서는 파일 삭제만 처리하고 성공 응답 반환
    console.log('✅ File deletion completed, localStorage sync handled by client');

    const result = {
      success: true,
      deletedAppId: id,
      deletedIcon: iconDeleted,
      deletedScreenshots: screenshotsDeleted
    };

    console.log('🎉 Delete result:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('💥 Delete app error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete app',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

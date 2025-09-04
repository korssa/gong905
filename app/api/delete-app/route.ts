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
    // Vercel Blob Storage URL인 경우
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
      await del(url);
      return true;
    }

    // 로컬 파일인 경우
    if (url.startsWith('/uploads/')) {
      const fileName = url.split('/').pop();
      if (!fileName) {
        return false;
      }

      const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
      
      // 파일 존재 여부 확인
      try {
        await fs.access(filePath);
      } catch {
        return false;
      }

      // 파일 삭제
      await fs.unlink(filePath);
      return true;
    }

    // 외부 URL인 경우 (삭제 불가)
    return false;
  } catch {
    return false;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, iconUrl, screenshotUrls } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'App ID is required' },
        { status: 400 }
      );
    }

    // 아이콘 파일 삭제
    let iconDeleted = false;
    if (iconUrl) {
      iconDeleted = await deleteFile(iconUrl);
    }

    // 스크린샷 파일들 삭제
    let screenshotsDeleted = 0;
    if (screenshotUrls && Array.isArray(screenshotUrls)) {
      for (const screenshotUrl of screenshotUrls) {
        const deleted = await deleteFile(screenshotUrl);
        if (deleted) {
          screenshotsDeleted++;
        }
      }
    }

    // 글로벌 저장소에서 앱 데이터 삭제 처리
    // 클라이언트에서 이미 글로벌 저장소에 업데이트된 데이터를 저장했으므로
    // 서버에서는 파일 삭제만 처리하고 성공 응답 반환

    const result = {
      success: true,
      deletedAppId: id,
      deletedIcon: iconDeleted,
      deletedScreenshots: screenshotsDeleted
    };

    return NextResponse.json(result);

  } catch (error) {
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

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
    if (iconUrl) {
      try {
        const response = await fetch('/api/delete-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: iconUrl }),
        });
        
        if (response.ok) {
          // 아이콘 삭제 성공
        }
      } catch (_error) {
        // 아이콘 삭제 실패는 무시하고 계속 진행
      }
    }

    // 스크린샷 파일들 삭제
    if (screenshotUrls && Array.isArray(screenshotUrls)) {
      for (const screenshotUrl of screenshotUrls) {
        try {
          const response = await fetch('/api/delete-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: screenshotUrl }),
          });
          
          if (response.ok) {
            // 스크린샷 삭제 성공
          }
        } catch (_error) {
          // 개별 스크린샷 삭제 실패는 무시하고 계속 진행
        }
      }
    }

    // apps.json에서 앱 정보 삭제
    const appsFilePath = path.join(process.cwd(), 'data', 'apps.json');
    
    try {
      const appsData = await fs.readFile(appsFilePath, 'utf-8');
      const apps = JSON.parse(appsData) as AppItem[];
      
      const updatedApps = apps.filter((app: AppItem) => app.id !== id);
      
      if (updatedApps.length < apps.length) {
        await fs.writeFile(appsFilePath, JSON.stringify(updatedApps, null, 2));
      } else {
        // 해당 ID를 찾을 수 없음
      }
      
    } catch (_error) {
      // apps.json 파일이 없거나 읽기 실패, 새로 생성됩니다.
      await fs.writeFile(appsFilePath, JSON.stringify([], null, 2));
    }

    const result = {
      success: true,
      deletedAppId: id,
      deletedIcon: !!iconUrl,
      deletedScreenshots: screenshotUrls ? screenshotUrls.length : 0
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

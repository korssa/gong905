import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { id, iconUrl, screenshotUrls } = await request.json();
    
  // console.log('🗑️ 서버에서 앱 삭제 시작:', { id, iconUrl, screenshotUrls });

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    // 아이콘 파일 삭제
    if (iconUrl && iconUrl.startsWith('/uploads/')) {
      try {
        const iconPath = path.join(process.cwd(), 'public', iconUrl);
        await fs.unlink(iconPath);
        deletedFiles.push(iconUrl);
        // console.log('✅ 아이콘 파일 삭제됨:', iconUrl);
      } catch {
        const errorMsg = `아이콘 삭제 실패: ${iconUrl}`;
        // console.warn('⚠️', errorMsg);
        errors.push(errorMsg);
      }
    }

    // 스크린샷 파일들 삭제
    if (screenshotUrls && Array.isArray(screenshotUrls)) {
      for (const screenshotUrl of screenshotUrls) {
        if (screenshotUrl && screenshotUrl.startsWith('/uploads/')) {
          try {
            const screenshotPath = path.join(process.cwd(), 'public', screenshotUrl);
            await fs.unlink(screenshotPath);
            deletedFiles.push(screenshotUrl);
            // console.log('✅ 스크린샷 파일 삭제됨:', screenshotUrl);
          } catch {
            const errorMsg = `스크린샷 삭제 실패: ${screenshotUrl}`;
            // console.warn('⚠️', errorMsg);
            errors.push(errorMsg);
          }
        }
      }
    }

    // apps.json 파일에서 앱 정보 제거
    try {
      const appsJsonPath = path.join(uploadsDir, 'apps.json');
      
      let apps = [];
      try {
        const data = await fs.readFile(appsJsonPath, 'utf8');
        apps = JSON.parse(data);
      } catch {
        // console.log('📝 apps.json 파일이 없거나 읽기 실패, 새로 생성됩니다.');
      }

      // 해당 ID의 앱 제거
      const originalLength = apps.length;
      apps = apps.filter((app: { id: string }) => app.id !== id);
      
      if (apps.length !== originalLength) {
  await fs.writeFile(appsJsonPath, JSON.stringify(apps, null, 2));
  // console.log('✅ apps.json에서 앱 정보 삭제됨:', id);
      } else {
  // console.log('⚠️ apps.json에서 해당 ID를 찾을 수 없음:', id);
      }

    } catch (jsonError) {
  const errorMsg = `apps.json 업데이트 실패: ${jsonError}`;
  // console.error('❌', errorMsg);
      errors.push(errorMsg);
    }

    const result = {
      success: true,
      deletedFiles,
      errors,
      message: `앱 ID ${id} 삭제 완료. ${deletedFiles.length}개 파일 삭제됨.`
    };

    if (errors.length > 0) {
      result.message += ` (${errors.length}개 에러 발생)`;
    }

  // console.log('🎉 앱 삭제 완료:', result);

    return NextResponse.json(result);

  } catch (err) {
    // console.error('❌ 앱 삭제 API 에러:', err);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete app',
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}

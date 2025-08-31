import fs from 'fs';
import path from 'path';
import { saveAppsToBlob, saveContentsToBlob } from '../lib/data-loader';

async function migrateToBlob() {
  try {
    console.log('🔄 데이터 마이그레이션 시작...');
    
    // 로컬 JSON 파일 읽기
    const appsPath = path.join(process.cwd(), 'data', 'apps.json');
    const contentsPath = path.join(process.cwd(), 'data', 'contents.json');
    
    let apps = [];
    let contents = [];
    
    if (fs.existsSync(appsPath)) {
      const appsData = fs.readFileSync(appsPath, 'utf8');
      apps = JSON.parse(appsData);
      console.log(`📱 앱 데이터 로드: ${apps.length}개`);
    }
    
    if (fs.existsSync(contentsPath)) {
      const contentsData = fs.readFileSync(contentsPath, 'utf8');
      contents = JSON.parse(contentsData);
      console.log(`📝 콘텐츠 데이터 로드: ${contents.length}개`);
    }
    
    // Vercel Blob Storage에 저장
    if (apps.length > 0) {
      const appsSuccess = await saveAppsToBlob(apps);
      if (appsSuccess) {
        console.log('✅ 앱 데이터를 Vercel Blob Storage에 저장 완료');
      } else {
        console.log('❌ 앱 데이터 저장 실패');
      }
    }
    
    if (contents.length > 0) {
      const contentsSuccess = await saveContentsToBlob(contents);
      if (contentsSuccess) {
        console.log('✅ 콘텐츠 데이터를 Vercel Blob Storage에 저장 완료');
      } else {
        console.log('❌ 콘텐츠 데이터 저장 실패');
      }
    }
    
    console.log('🎉 마이그레이션 완료!');
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
  }
}

// 스크립트 실행
migrateToBlob();

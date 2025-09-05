import fs from 'fs';
import path from 'path';
import { saveAppsToBlob, saveContentsToBlob } from '../lib/data-loader';

async function migrateToBlob() {
  try {
    
    // 로컬 JSON ?�일 ?�기
    const appsPath = path.join(process.cwd(), 'data', 'apps.json');
    const contentsPath = path.join(process.cwd(), 'data', 'contents.json');
    
    let apps = [];
    let contents = [];
    
    if (fs.existsSync(appsPath)) {
      const appsData = fs.readFileSync(appsPath, 'utf8');
      apps = JSON.parse(appsData);
    }
    
    if (fs.existsSync(contentsPath)) {
      const contentsData = fs.readFileSync(contentsPath, 'utf8');
      contents = JSON.parse(contentsData);
    }
    
    // Vercel Blob Storage???�??
    if (apps.length > 0) {
      const appsSuccess = await saveAppsToBlob(apps);
    }
    
    if (contents.length > 0) {
      const contentsSuccess = await saveContentsToBlob(contents);
    }
    
  } catch (error) {
    }
}

// ?�크립트 ?�행
migrateToBlob();

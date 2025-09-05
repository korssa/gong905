import fs from 'fs';
import path from 'path';
import { saveAppsToBlob, saveContentsToBlob } from '../lib/data-loader';

async function migrateToBlob() {
  try {
    
    // Î°úÏª¨ JSON ?åÏùº ?ΩÍ∏∞
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
    
    // Vercel Blob Storage???Ä??
    if (apps.length > 0) {
      const appsSuccess = await saveAppsToBlob(apps);
    }
    
    if (contents.length > 0) {
      const contentsSuccess = await saveContentsToBlob(contents);
    }
    
  } catch (error) {
    }
}

// ?§ÌÅ¨Î¶ΩÌä∏ ?§Ìñâ
migrateToBlob();

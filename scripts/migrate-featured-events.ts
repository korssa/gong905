#!/usr/bin/env tsx

/**
 * 기존 featured-apps.json??featured.json�?events.json?�로 분리?�는 마이그레?�션 ?�크립트
 */

import { promises as fs } from 'fs';
import path from 'path';

const OLD_FEATURED_FILE = path.join(process.cwd(), 'data', 'featured-apps.json');
const NEW_FEATURED_FILE = path.join(process.cwd(), 'data', 'featured.json');
const NEW_EVENTS_FILE = path.join(process.cwd(), 'data', 'events.json');

async function migrateFeaturedEvents() {
  try {
    // 기존 ?�일 존재 ?�인
    try {
      await fs.access(OLD_FEATURED_FILE);
    } catch {
      return;
    }
    
    // 기존 ?�이???�기
    const oldData = await fs.readFile(OLD_FEATURED_FILE, 'utf-8');
    const parsed = JSON.parse(oldData);
    
    // ?�이??분리
    const featured = Array.isArray(parsed.featured) ? parsed.featured : [];
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    
    // ?�렉?�리 ?�성
    const dataDir = path.dirname(NEW_FEATURED_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // ?�로???�일???�성
    await fs.writeFile(NEW_FEATURED_FILE, JSON.stringify(featured, null, 2));
    await fs.writeFile(NEW_EVENTS_FILE, JSON.stringify(events, null, 2));
    
    `);
    `);
    
    // 기존 ?�일 백업
    const backupFile = OLD_FEATURED_FILE + '.backup';
    await fs.copyFile(OLD_FEATURED_FILE, backupFile);
    // 기존 ?�일 ??��
    await fs.unlink(OLD_FEATURED_FILE);
    } catch (error) {
    }
}

// ?�크립트 ?�행
if (require.main === module) {
  migrateFeaturedEvents();
}

export { migrateFeaturedEvents };

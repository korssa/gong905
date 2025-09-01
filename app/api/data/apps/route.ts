import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import type { AppItem } from '@/types';

const APPS_FILE_NAME = 'apps.json';
const LOCAL_APPS_PATH = path.join(process.cwd(), 'data', APPS_FILE_NAME);

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_APPS_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_APPS_PATH);
  } catch {
    await fs.writeFile(LOCAL_APPS_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<AppItem[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_APPS_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(apps: AppItem[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_APPS_PATH, JSON.stringify(apps, null, 2));
}

export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      const { blobs } = await list({ prefix: APPS_FILE_NAME, limit: 1 });
      if (blobs && blobs.length > 0) {
        const url = blobs[0].url;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          return NextResponse.json(Array.isArray(json) ? json : []);
        }
      }
      return NextResponse.json([]);
    }
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const apps = Array.isArray(body) ? (body as AppItem[]) : [];
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      await put(APPS_FILE_NAME, JSON.stringify(apps, null, 2), {
        access: 'public',
        contentType: 'application/json; charset=utf-8',
        addRandomSuffix: false,
      });
      return NextResponse.json({ success: true });
    }
    await writeToLocal(apps);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save apps' }, { status: 500 });
  }
}

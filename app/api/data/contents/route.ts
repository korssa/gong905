import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import type { ContentItem } from '@/types';

const CONTENTS_FILE_NAME = 'contents.json';
const LOCAL_CONTENTS_PATH = path.join(process.cwd(), 'data', CONTENTS_FILE_NAME);

async function ensureLocalFile() {
  const dir = path.dirname(LOCAL_CONTENTS_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOCAL_CONTENTS_PATH);
  } catch {
    await fs.writeFile(LOCAL_CONTENTS_PATH, JSON.stringify([]));
  }
}

async function readFromLocal(): Promise<ContentItem[]> {
  await ensureLocalFile();
  const data = await fs.readFile(LOCAL_CONTENTS_PATH, 'utf-8');
  return JSON.parse(data || '[]');
}

async function writeToLocal(contents: ContentItem[]) {
  await ensureLocalFile();
  await fs.writeFile(LOCAL_CONTENTS_PATH, JSON.stringify(contents, null, 2));
}

// GET: Blob 또는 로컬에서 콘텐츠 배열 반환
export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    if (isProd) {
      // Blob에서 고정 파일명으로 조회 (addRandomSuffix: false 로 저장된 최신 파일 1개)
      const { blobs } = await list({ prefix: CONTENTS_FILE_NAME, limit: 1 });
      if (blobs && blobs.length > 0) {
        const url = blobs[0].url;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          return NextResponse.json(Array.isArray(json) ? json : []);
        }
      }
      // Blob에 없으면 빈 배열
      return NextResponse.json([]);
    }

    // 개발 환경: 로컬 파일
    const local = await readFromLocal();
    return NextResponse.json(local);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// POST: 전체 콘텐츠 배열을 받아 Blob(또는 로컬)에 저장
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const contents = Array.isArray(body) ? (body as ContentItem[]) : [];

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      await put(CONTENTS_FILE_NAME, JSON.stringify(contents, null, 2), {
        access: 'public',
        contentType: 'application/json; charset=utf-8',
        addRandomSuffix: false,
      });
      return NextResponse.json({ success: true });
    }

    await writeToLocal(contents);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save contents' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import { ContentItem } from '@/types';

const CONTENTS_BLOB_KEY = 'data/contents.json';

export async function GET() {
  try {
    // Vercel Blob에서 콘텐츠 데이터 로드
    const { blobs } = await list();
    const contentsBlob = blobs.find(blob => blob.pathname === CONTENTS_BLOB_KEY);
    
    if (!contentsBlob) {
      // 파일이 없으면 빈 배열 반환
      return NextResponse.json([]);
    }

    const response = await fetch(contentsBlob.url);
    const contents = await response.json();
    
    return NextResponse.json(contents);
  } catch (error) {
    console.error('Failed to load contents from Vercel Blob:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contents: ContentItem[] = await request.json();
    
    // Vercel Blob에 콘텐츠 데이터 저장
    const blob = await put(CONTENTS_BLOB_KEY, JSON.stringify(contents, null, 2), {
      access: 'public',
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Failed to save contents to Vercel Blob:', error);
    return NextResponse.json({ error: 'Failed to save contents' }, { status: 500 });
  }
}

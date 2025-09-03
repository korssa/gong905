import { AppItem, ContentItem } from '@/types';

/**
 * Vercel Blob Storage에서 앱 데이터 로드
 */
export async function loadAppsFromBlob(): Promise<AppItem[]> {
  try {
    const response = await fetch('/api/data/apps');
    if (!response.ok) {
      console.error('Failed to load apps from blob:', response.statusText);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading apps from blob:', error);
    return [];
  }
}

/**
 * Vercel Blob Storage에서 콘텐츠 데이터 로드
 */
export async function loadContentsFromBlob(): Promise<ContentItem[]> {
  try {
    const response = await fetch('/api/data/contents');
    if (!response.ok) {
      console.error('Failed to load contents from blob:', response.statusText);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading contents from blob:', error);
    return [];
  }
}

/**
 * Vercel Blob Storage에 앱 데이터 저장
 */
export async function saveAppsToBlob(apps: AppItem[]): Promise<boolean> {
  try {
    const response = await fetch('/api/data/apps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apps),
    });
    
    if (!response.ok) {
      console.error('Failed to save apps to blob:', response.statusText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving apps to blob:', error);
    return false;
  }
}

/**
 * Vercel Blob Storage에 콘텐츠 데이터 저장
 */
export async function saveContentsToBlob(contents: ContentItem[]): Promise<boolean> {
  try {
    const response = await fetch('/api/data/contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contents),
    });
    
    if (!response.ok) {
      console.error('Failed to save contents to blob:', response.statusText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving contents to blob:', error);
    return false;
  }
}

/**
 * 타입별로 콘텐츠를 분리해서 저장
 */
export async function saveContentsByTypeToBlob(type: 'appstory' | 'news', contents: ContentItem[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/content/type?type=${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contents),
    });
    
    if (!response.ok) {
      console.error(`Failed to save ${type} contents to blob:`, response.statusText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error saving ${type} contents to blob:`, error);
    return false;
  }
}

/**
 * 타입별로 콘텐츠를 분리해서 로드
 */
export async function loadContentsByTypeFromBlob(type: 'appstory' | 'news'): Promise<ContentItem[]> {
  try {
    const response = await fetch(`/api/content/type?type=${type}`);
    if (!response.ok) {
      console.error(`Failed to load ${type} contents from blob:`, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data.contents || [];
  } catch (error) {
    console.error(`Error loading ${type} contents from blob:`, error);
    return [];
  }
}

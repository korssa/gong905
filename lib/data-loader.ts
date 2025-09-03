import { AppItem, ContentItem } from '@/types';

/**
 * Vercel Blob Storage에서 앱 데이터 로드
 */
export async function loadAppsFromBlob(): Promise<AppItem[]> {
  try {
    const response = await fetch('/api/data/apps');
    if (!response.ok) {
      // Failed to load apps from blob
      return [];
    }
    return await response.json();
  } catch (error) {
    // Error loading apps from blob
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
      // Failed to load contents from blob
      return [];
    }
    return await response.json();
  } catch (error) {
    // Error loading contents from blob
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
      // Failed to save apps to blob
      return false;
    }
    
    return true;
  } catch (error) {
    // Error saving apps to blob
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
      // Failed to save contents to blob
      return false;
    }
    
    return true;
  } catch (error) {
    // Error saving contents to blob
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
      // Failed to save type contents to blob
      return false;
    }
    
    return true;
  } catch (error) {
    // Error saving type contents to blob
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
      // Failed to load type contents from blob
      return [];
    }
    
    const data = await response.json();
    return data.contents || [];
  } catch (error) {
    // Error loading type contents from blob
    return [];
  }
}

/**
 * Featured/Events 앱 정보를 Blob에서 로드 (메모장 방식과 동일)
 */
export async function loadFeaturedAppsFromBlob(): Promise<{ featured: string[]; events: string[] }> {
  try {
    // 메모장과 동일하게 직접 Blob에서 로드
    const response = await fetch('/api/apps/featured', { 
      method: 'GET',
      cache: 'no-store' // 캐시 무시하고 최신 데이터
    });
    
    if (!response.ok) {
      // Failed to load featured apps from blob
      return { featured: [], events: [] };
    }
    
    const data = await response.json();
    if (data.success) {
      return {
        featured: data.featured || [],
        events: data.events || []
      };
    }
    
    return { featured: [], events: [] };
  } catch (error) {
    // Error loading featured apps from blob
    return { featured: [], events: [] };
  }
}

/**
 * Featured/Events 앱 정보를 Blob에 저장
 */
export async function saveFeaturedAppsToBlob(featured: string[], events: string[]): Promise<boolean> {
  try {
    const response = await fetch('/api/data/featured-apps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ featured, events }),
    });
    
    if (!response.ok) {
      // Failed to save featured apps to blob
      return false;
    }
    
    return true;
  } catch (error) {
    // Error saving featured apps to blob
    return false;
  }
}

/**
 * 특정 앱의 Featured/Events 상태를 토글
 */
export async function toggleFeaturedAppStatus(appId: string, type: 'featured' | 'events', action: 'add' | 'remove'): Promise<boolean> {
  try {
    const response = await fetch('/api/apps/featured', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appId, type, action }),
    });
    
    if (!response.ok) {
      // Failed to toggle type status for app
      return false;
    }
    
    return true;
  } catch (error) {
    // Error toggling type status for app
    return false;
  }
}

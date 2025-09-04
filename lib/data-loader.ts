import { AppItem, ContentItem } from '@/types';

/**
 * Vercel Blob Storage에서 앱 데이터 로드
 */
export async function loadAppsFromBlob(): Promise<AppItem[]> {
  try {
    console.log('🔄 [loadAppsFromBlob] 기존 Blob API 호출 시작...');
    const response = await fetch('/api/data/apps');
    if (!response.ok) {
      console.log('❌ [loadAppsFromBlob] 기존 Blob API 응답 실패:', response.status);
      // Failed to load apps from blob
      return [];
    }
    const data = await response.json();
    console.log('✅ [loadAppsFromBlob] 기존 Blob API에서 앱 로드 성공:', data.length, '개');
    return data;
  } catch (error) {
    console.error('❌ [loadAppsFromBlob] 기존 Blob API 오류:', error);
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
 * 타입별로 갤러리 앱을 분리해서 로드
 */
export async function loadAppsByTypeFromBlob(type: 'gallery'): Promise<AppItem[]> {
  try {
    // 타입별 API가 실패하면 기존 API로 폴백
    const response = await fetch(`/api/apps/type?type=${type}`);
    if (!response.ok) {
      // Failed to load type apps from blob, fallback to existing API
      console.log('⚠️ [loadAppsByTypeFromBlob] 타입별 API 실패, 기존 API로 폴백');
      return await loadAppsFromBlob();
    }
    
    const data = await response.json();
    const typeApps = data.apps || [];
    
    // 타입별 API에서 앱이 없으면 기존 API로 폴백
    if (typeApps.length === 0) {
      console.log('⚠️ [loadAppsByTypeFromBlob] 타입별 API에서 앱 없음, 기존 API로 폴백');
      return await loadAppsFromBlob();
    }
    
    console.log(`✅ [loadAppsByTypeFromBlob] ${type} 타입 앱 로드 성공:`, typeApps.length, '개');
    return typeApps;
  } catch (error) {
    // Error loading type apps from blob, fallback to existing API
    console.log('⚠️ [loadAppsByTypeFromBlob] 타입별 API 오류, 기존 API로 폴백');
    return await loadAppsFromBlob();
  }
}

/**
 * 타입별로 갤러리 앱을 분리해서 저장
 */
export async function saveAppsByTypeToBlob(type: 'gallery', apps: AppItem[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/apps/type?type=${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apps }),
    });
    
    if (!response.ok) {
      // Failed to save type apps to blob
      return false;
    }
    
    return true;
  } catch (error) {
    // Error saving type apps to blob
    return false;
  }
}

/**
 * Featured/Events 앱 정보를 Blob에서 로드 (메모장 방식과 동일)
 */
export async function loadFeaturedAppsFromBlob(): Promise<{ featured: string[]; events: string[] }> {
  try {
    // Vercel Blob에서 직접 로드
    const response = await fetch('/api/data/featured-apps', { 
      method: 'GET',
      cache: 'no-store' // 캐시 무시하고 최신 데이터
    });
    
    if (!response.ok) {
      console.error('❌ Featured/Events Blob 로드 실패:', response.status, response.statusText);
      return { featured: [], events: [] };
    }
    
    const data = await response.json();
    console.log('📊 Featured/Events Blob 응답:', data);
    
    // 응답 데이터 구조 확인 - boolean 체크 필드 추가
    if (data && typeof data === 'object') {
      return {
        featured: data.featured ? (Array.isArray(data.featured) ? data.featured : []) : [],
        events: data.events ? (Array.isArray(data.events) ? data.events : []) : [],
        hasFeatured: !!data.featured && data.featured.length > 0,
        hasEvents: !!data.events && data.events.length > 0
      };
    }
    
    console.warn('⚠️ Featured/Events Blob 응답 형식 오류:', data);
    return { featured: [], events: [] };
  } catch (error) {
    console.error('❌ Featured/Events Blob 로드 오류:', error);
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
      body: JSON.stringify({ 
        featured, 
        events,
        hasFeatured: featured.length > 0,
        hasEvents: events.length > 0
      }),
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

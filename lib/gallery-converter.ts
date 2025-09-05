import type { AppItem } from "@/types";
import type { GalleryItem } from "@/components/gallery-card";

// AppItem을 GalleryItem으로 변환하는 함수
export function convertAppToGallery(app: AppItem): GalleryItem {
  return {
    id: app.id,
    imageUrl: app.screenshotUrls?.[0] || app.iconUrl || '',
    title: app.name,
    author: app.developer,
    likes: app.likes || 0,
    views: app.views || 0,
    uploadDate: app.uploadDate,
    tags: app.tags || []
  };
}

// AppItem 배열을 GalleryItem 배열로 변환하는 함수
export function convertAppsToGallery(apps: AppItem[]): GalleryItem[] {
  return apps.map(convertAppToGallery);
}

// GalleryItem을 AppItem으로 변환하는 함수 (필요시)
export function convertGalleryToApp(gallery: GalleryItem): Partial<AppItem> {
  return {
    id: gallery.id,
    name: gallery.title,
    developer: gallery.author,
    screenshotUrls: [gallery.imageUrl],
    likes: gallery.likes,
    views: gallery.views,
    uploadDate: gallery.uploadDate,
    tags: gallery.tags
  };
}

// 갤러리 데이터를 Vercel Blob에 저장하는 함수
export async function saveGalleryToBlob(
  apps: AppItem[], 
  type: 'gallery' | 'featured' | 'events' = 'gallery'
): Promise<{ success: boolean; url?: string; count?: number }> {
  try {
    console.log(`📤 갤러리 데이터를 Blob에 저장: ${type}, ${apps.length}개 앱`);
    
    // AppItem을 GalleryItem으로 변환
    const galleryItems = convertAppsToGallery(apps);
    
    // 갤러리 API를 통해 저장
    const response = await fetch('/api/gallery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: galleryItems, type }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 갤러리 데이터 저장 완료: ${result.url}`);
      return { success: true, url: result.url, count: result.count };
    } else {
      console.error('❌ 갤러리 데이터 저장 실패:', result.error);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ 갤러리 데이터 저장 오류:', error);
    return { success: false };
  }
}

// Vercel Blob에서 갤러리 데이터를 로드하는 함수
export async function loadGalleryFromBlob(
  type: 'gallery' | 'featured' | 'events' = 'gallery'
): Promise<GalleryItem[]> {
  try {
    console.log(`📥 갤러리 데이터를 Blob에서 로드: ${type}`);
    
    const response = await fetch(`/api/gallery?type=${type}`);
    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      console.log(`✅ 갤러리 데이터 로드 완료: ${result.data.length}개 항목`);
      return result.data;
    } else {
      console.warn('⚠️ 갤러리 데이터 로드 실패 또는 빈 데이터:', result);
      return [];
    }
  } catch (error) {
    console.error('❌ 갤러리 데이터 로드 오류:', error);
    return [];
  }
}

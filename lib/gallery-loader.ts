import type { GalleryItem } from "@/components/gallery-card";

// Vercel Blob 폴더 초기화 결과 타입
interface BlobFolderResult {
  folder: string;
  success: boolean;
  url?: string;
  error?: string;
}

// 갤러리 타입 정의
type GalleryType = 'all' | 'gallery' | 'featured' | 'events';

// 갤러리 데이터 로드 함수
export async function loadGalleryData(type: GalleryType = 'all'): Promise<GalleryItem[]> {
  try {
    console.log(`📱 갤러리 데이터 로드 시작: ${type}`);
    
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

// 갤러리 데이터 저장 함수
export async function saveGalleryData(
  items: GalleryItem[], 
  type: Exclude<GalleryType, 'all'> = 'gallery'
): Promise<{ success: boolean; url?: string; count?: number }> {
  try {
    console.log(`📤 갤러리 데이터 저장 시작: ${type}, ${items.length}개 항목`);
    
    const response = await fetch('/api/gallery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items, type }),
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

// 갤러리 항목 삭제 함수
export async function deleteGalleryItem(
  id: string, 
  type: Exclude<GalleryType, 'all'> = 'gallery'
): Promise<{ success: boolean; url?: string; count?: number }> {
  try {
    console.log(`🗑️ 갤러리 항목 삭제 시작: ${id} (${type})`);
    
    const response = await fetch(`/api/gallery?id=${id}&type=${type}`, {
      method: 'DELETE',
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 갤러리 항목 삭제 완료: ${result.url}`);
      return { success: true, url: result.url, count: result.count };
    } else {
      console.error('❌ 갤러리 항목 삭제 실패:', result.error);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ 갤러리 항목 삭제 오류:', error);
    return { success: false };
  }
}

// Vercel Blob 폴더 구조 초기화 함수
export async function initializeBlobFolders(): Promise<{ success: boolean; results?: BlobFolderResult[] }> {
  try {
    console.log('📁 Vercel Blob 폴더 구조 초기화 시작...');
    
    const response = await fetch('/api/blob/setup-folders', {
      method: 'POST',
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Vercel Blob 폴더 구조 초기화 완료');
      return { success: true, results: result.results };
    } else {
      console.error('❌ Vercel Blob 폴더 구조 초기화 실패:', result.error);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Vercel Blob 폴더 구조 초기화 오류:', error);
    return { success: false };
  }
}

// 갤러리 데이터 동기화 함수 (로컬 스토어와 서버 동기화)
export async function syncGalleryData(
  localItems: GalleryItem[],
  type: Exclude<GalleryType, 'all'> = 'gallery'
): Promise<{ success: boolean; serverItems?: GalleryItem[] }> {
  try {
    console.log(`🔄 갤러리 데이터 동기화 시작: ${type}`);
    
    // 서버에서 최신 데이터 로드
    const serverItems = await loadGalleryData(type);
    
    // 로컬과 서버 데이터 비교
    const localIds = new Set(localItems.map(item => item.id));
    const serverIds = new Set(serverItems.map(item => item.id));
    
    const newLocalItems = localItems.filter(item => !serverIds.has(item.id));
    const newServerItems = serverItems.filter(item => !localIds.has(item.id));
    
    if (newLocalItems.length > 0) {
      console.log(`📤 로컬에서 서버로 ${newLocalItems.length}개 항목 동기화`);
      await saveGalleryData(newLocalItems, type);
    }
    
    if (newServerItems.length > 0) {
      console.log(`📥 서버에서 로컬로 ${newServerItems.length}개 항목 동기화`);
    }
    
    // 최종 병합된 데이터 반환
    const mergedItems = [...localItems, ...newServerItems];
    const uniqueItems = mergedItems.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );
    
    console.log(`✅ 갤러리 데이터 동기화 완료: ${uniqueItems.length}개 항목`);
    
    return { 
      success: true, 
      serverItems: uniqueItems 
    };
  } catch (error) {
    console.error('❌ 갤러리 데이터 동기화 오류:', error);
    return { success: false };
  }
}

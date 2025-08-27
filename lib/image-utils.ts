/**
 * 이미지 URL이 유효한지 확인하는 함수
 */
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  try {
  // console.log("🔍 이미지 URL 검증 시작:", url);
    
    // HTTPS/HTTP URL
    if (url.startsWith('https://') || url.startsWith('http://')) {
  // console.log("✅ HTTPS/HTTP URL 확인됨");
      return true;
    }
    
    // Vercel Blob Storage URL
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
  // console.log("✅ Vercel Blob Storage URL 확인됨");
      return true;
    }
    
    // 로컬 업로드 경로 (개발환경에서만)
    if (url.startsWith('/uploads/')) {
      const isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1');
      
      if (isDevelopment) {
  // console.log("✅ 로컬 업로드 경로 (개발환경)");
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      } else {
  // console.log("❌ 로컬 업로드 경로 (프로덕션에서는 무효)");
        return false;
      }
    }
    
    // Object URL (blob:)
    if (url.startsWith('blob:')) {
  // console.log("❌ Object URL (blob:) - 무효");
      return false;
    }
    
  // console.log("❌ 알 수 없는 URL 형식");
    return false;
  } catch {
    // console.error("❌ 이미지 URL 검증 에러");
    return false;
  }
};

/**
 * 이미지 URL을 검증하고 필요시 placeholder로 교체
 */
export const validateImageUrl = async (url: string, fallbackUrl?: string): Promise<string> => {
  // console.log("🔍 이미지 URL 검증 및 수정 시작:", url);
  
  const isValid = await isValidImageUrl(url);
  
  if (isValid) {
  // console.log("✅ 이미지 URL 유효함:", url);
    return url;
  }
  
  if (fallbackUrl) {
  // console.log("⚠️ fallback URL 사용:", fallbackUrl);
    return fallbackUrl;
  }
  
  // console.log("⚠️ placeholder 이미지 사용");
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA0MEw1MCA1NUw2NSA0MEg3NVY2MEg2NUw1MCA3NUwzNSA2MEgyNVY0MEgzNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
};

/**
 * 앱 객체의 모든 이미지 URL을 검증하고 수정
 */
export const validateAppImages = async <T extends { iconUrl: string; screenshotUrls: string[] }>(
  app: T
): Promise<T> => {
  const validatedIconUrl = await validateImageUrl(app.iconUrl);
  
  const validatedScreenshotUrls = await Promise.all(
    app.screenshotUrls.map((url, index) => {
      return validateImageUrl(url);
    })
  );
  
  const result = {
    ...app,
    iconUrl: validatedIconUrl,
    screenshotUrls: validatedScreenshotUrls
  };
  
  return result;
};

/**
 * 앱 배열의 모든 이미지 URL을 검증하고 수정
 */
export const validateAppsImages = async <T extends { iconUrl: string; screenshotUrls: string[] }>(
  apps: T[]
): Promise<T[]> => {
  const validatedApps = await Promise.all(
    apps.map(app => validateAppImages(app))
  );
  
  return validatedApps;
};

/**
 * 이미지 URL이 유효한지 확인하는 함수
 */
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  try {
    // 외부 URL (https://)는 항상 유효하다고 가정
    if (url.startsWith('https://') || url.startsWith('http://')) {
      return true;
    }
    
    // Vercel Blob URL은 항상 유효하다고 가정
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
      return true;
    }
    
    // 서버 업로드 파일 (/uploads/)는 존재 여부 확인
    if (url.startsWith('/uploads/')) {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    }
    
    // Object URL (blob:)는 페이지 로드시 무효
    if (url.startsWith('blob:')) {
      return false;
    }
    
    return false;
  } catch {
    return false;
  }
};

/**
 * 이미지 URL을 검증하고 필요시 placeholder로 교체
 */
export const validateImageUrl = async (url: string, fallbackUrl?: string): Promise<string> => {
  const isValid = await isValidImageUrl(url);
  
  if (isValid) {
    return url;
  }
  
          // 유효하지 않은 이미지 URL
  
  // 폴백 URL이 있으면 사용
  if (fallbackUrl) {
    return fallbackUrl;
  }
  
  // 기본 placeholder 이미지
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
    app.screenshotUrls.map(url => validateImageUrl(url))
  );
  
  return {
    ...app,
    iconUrl: validatedIconUrl,
    screenshotUrls: validatedScreenshotUrls
  };
};

/**
 * 앱 배열의 모든 이미지 URL을 검증하고 수정
 */
export const validateAppsImages = async <T extends { iconUrl: string; screenshotUrls: string[] }>(
  apps: T[]
): Promise<T[]> => {
  // 앱 이미지 URL 검증 시작
  
  const validatedApps = await Promise.all(
    apps.map(app => validateAppImages(app))
  );
  
  // 앱 이미지 URL 검증 완료
  return validatedApps;
};

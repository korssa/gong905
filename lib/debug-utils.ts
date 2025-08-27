/**
 * Vercel 배포 환경 진단 유틸리티
 */

/**
 * 현재 스토리지 설정 상태 확인
 */
export const checkStorageConfig = () => {
  const config = {
    storageType: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'not-set',
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    isVercel: typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'),
    isLocalhost: typeof window !== 'undefined' && window.location.hostname === 'localhost',
  };

  console.log('🔧 Storage Configuration Check:', config);
  
  if (config.storageType !== 'vercel-blob') {
    console.warn('⚠️ WARNING: STORAGE_TYPE is not set to "vercel-blob"');
    console.warn('💡 Solution: Set NEXT_PUBLIC_STORAGE_TYPE=vercel-blob in Vercel environment variables');
  }
  
  if (!config.hasBlobToken) {
    console.warn('⚠️ WARNING: BLOB_READ_WRITE_TOKEN is not set');
    console.warn('💡 Solution: Set BLOB_READ_WRITE_TOKEN in Vercel environment variables');
  }
  
  if (config.isVercel && config.storageType === 'local') {
    console.error('❌ ERROR: Using local storage on Vercel deployment');
    console.error('💡 Solution: Change STORAGE_TYPE to "vercel-blob" for production');
  }

  return config;
};

/**
 * 이미지 업로드 테스트
 */
export const testImageUpload = async (file: File) => {
  console.log('🧪 Testing image upload...');
  
  try {
    const { saveFileToLocal } = await import('./file-utils');
    const url = await saveFileToLocal(file, 'test');
    
    console.log('✅ Upload test successful:', url);
    
    // URL 유효성 검사
    if (url.includes('vercel-storage.com')) {
      console.log('✅ Vercel Blob Storage is working correctly');
    } else if (url.startsWith('/uploads/')) {
      console.log('⚠️ Using local storage - images may disappear after deployment');
    } else if (url.startsWith('blob:')) {
      console.log('❌ Using fallback Object URL - upload failed');
    }
    
    return url;
  } catch (error) {
    console.error('❌ Upload test failed:', error);
    throw error;
  }
};

/**
 * 환경 변수 상태 출력 (개발용)
 */
export const logEnvironmentStatus = () => {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 환경 변수 출력하지 않음
    return;
  }

  console.log('🌍 Environment Status:');
  console.log('- NEXT_PUBLIC_STORAGE_TYPE:', process.env.NEXT_PUBLIC_STORAGE_TYPE);
  console.log('- Has BLOB_READ_WRITE_TOKEN:', !!process.env.BLOB_READ_WRITE_TOKEN);
  console.log('- Hostname:', window.location.hostname);
  console.log('- Is Vercel:', window.location.hostname.includes('vercel.app'));
  console.log('- Is Localhost:', window.location.hostname === 'localhost');
};

/**
 * 이미지 URL 분석
 */
export const analyzeImageUrl = (url: string) => {
  const analysis = {
    url,
    type: 'unknown' as 'vercel-blob' | 'local' | 'external' | 'object' | 'unknown',
    isValid: false,
    reason: '',
  };

  if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
    analysis.type = 'vercel-blob';
    analysis.isValid = true;
    analysis.reason = 'Vercel Blob Storage URL - persistent';
  } else if (url.startsWith('/uploads/')) {
    analysis.type = 'local';
    analysis.isValid = true;
    analysis.reason = 'Local upload - may disappear after deployment';
  } else if (url.startsWith('https://') || url.startsWith('http://')) {
    analysis.type = 'external';
    analysis.isValid = true;
    analysis.reason = 'External URL - persistent';
  } else if (url.startsWith('blob:')) {
    analysis.type = 'object';
    analysis.isValid = false;
    analysis.reason = 'Object URL - temporary, invalid after page reload';
  } else {
    analysis.type = 'unknown';
    analysis.isValid = false;
    analysis.reason = 'Unknown URL format';
  }

  console.log('🔍 Image URL Analysis:', analysis);
  return analysis;
};

/**
 * 전체 시스템 진단
 */
export const runSystemDiagnostic = async () => {
  console.log('🔍 Running System Diagnostic...');
  
  // 1. 환경 설정 확인
  const config = checkStorageConfig();
  
  // 2. 환경 변수 상태 출력
  logEnvironmentStatus();
  
  // 3. localStorage 상태 확인
  if (typeof window !== 'undefined') {
    const savedApps = localStorage.getItem('gallery-apps');
    if (savedApps) {
      const apps = JSON.parse(savedApps);
      console.log('📱 Saved apps count:', apps.length);
      
      // 첫 번째 앱의 이미지 URL 분석
      if (apps.length > 0) {
        const firstApp = apps[0];
        console.log('🔍 Analyzing first app images:');
        analyzeImageUrl(firstApp.iconUrl);
        firstApp.screenshotUrls.forEach((url: string, index: number) => {
          console.log(`📸 Screenshot ${index + 1}:`);
          analyzeImageUrl(url);
        });
      }
    } else {
      console.log('📱 No saved apps found in localStorage');
    }
  }
  
  console.log('✅ System diagnostic completed');
  return config;
};

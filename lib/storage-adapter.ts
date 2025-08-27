import { put, del, head } from '@vercel/blob';

/**
 * Vercel Blob Storage 어댑터
 */

/**
 * Vercel Blob 환경 변수 확인
 */
const checkVercelBlobConfig = () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob Storage');
  }
  return token;
};

/**
 * 파일을 Vercel Blob에 업로드
 */
export const uploadToVercelBlob = async (file: File, prefix: string = ""): Promise<string> => {
  try {
    // 서버 측에서만 직접 Vercel Blob SDK를 사용하도록 토큰 존재 검사
    checkVercelBlobConfig();
    console.log("🚀 Vercel Blob 업로드 시작:", { fileName: file.name, size: file.size, prefix });

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${prefix}_${timestamp}_${randomId}.${fileExtension}`;
    
    console.log("📝 생성된 파일명:", fileName);

    console.log("📤 Vercel Blob put() 호출 시작...");
    const blob = await put(fileName, file, {
      access: 'public',
    });

    console.log("✅ Vercel Blob 업로드 완료:", blob.url);
    return blob.url;

  } catch (error) {
    console.error("❌ Vercel Blob 업로드 실패:", error);
    console.error("❌ 에러 타입:", typeof error);
    console.error("❌ 에러 메시지:", error instanceof Error ? error.message : String(error));
    throw new Error(`Vercel Blob upload failed: ${error}`);
  }
};

/**
 * Vercel Blob에서 파일 삭제
 */
export const deleteFromVercelBlob = async (url: string): Promise<boolean> => {
  try {
    checkVercelBlobConfig();

    const urlObj = new URL(url);
    const fileName = urlObj.pathname.split('/').pop();

    if (!fileName) {
      throw new Error('Invalid blob URL');
    }

    await del(url);

    return true;

  } catch (error) {
    return false;
  }
};

/**
 * Vercel Blob 파일 존재 확인
 */
export const checkVercelBlobExists = async (url: string): Promise<boolean> => {
  try {
    const response = await head(url);
    return !!response;
  } catch {
    return false;
  }
};

/**
 * 스토리지 타입에 따른 통합 업로드 함수
 */
export const uploadFile = async (file: File, prefix: string = ""): Promise<string> => {
  // 환경변수 우선순위: NEXT_PUBLIC_STORAGE_TYPE > STORAGE_TYPE > 기본값
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 
                     process.env.STORAGE_TYPE || 
                     'local';

  console.log("🔍 Storage adapter - Storage type:", storageType);

  // Vercel 환경에서 Vercel Blob Storage 사용
  const isVercelEnvironment = typeof window !== 'undefined' && 
    (window.location.hostname.includes('vercel.app') || 
     window.location.hostname.includes('vercel-storage.com'));

  const finalStorageType = isVercelEnvironment ? 'vercel-blob' : storageType;
  console.log("🔍 Storage adapter - Final storage type:", finalStorageType);

  if (finalStorageType === 'vercel-blob') {
    // 브라우저(클라이언트) 환경에서는 비밀 토큰을 노출하지 않도록
    // 서버 API에 파일을 전달하고 서버에서 Vercel Blob에 업로드하도록 위임합니다.
    if (typeof window !== 'undefined') {
      const formData = new FormData();
      formData.append('file', file as any);
      formData.append('prefix', prefix);

      const res = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Server upload failed: ${res.status} ${res.statusText} - ${text}`);
      }

      const json = await res.json();
      if (!json || !json.url) {
        throw new Error(json?.error || 'Server upload returned no URL');
      }

      return json.url;
    }

    // 서버(서버 컴퓨트) 환경이면 직접 SDK 사용
    return uploadToVercelBlob(file, prefix);
  } else {
    return uploadToLocal(file, prefix);
  }
};

/**
 * 스토리지 타입에 따른 통합 삭제 함수
 */
export const deleteFile = async (url: string): Promise<boolean> => {
  try {
    console.log("🗑️ 파일 삭제 시작:", url);
    
    // Vercel Blob Storage URL인 경우
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
      console.log("☁️ Vercel Blob Storage 삭제");
      return await deleteFromVercelBlob(url);
    }
    
    // 로컬 업로드 파일인 경우
    if (url.startsWith('/uploads/')) {
      console.log("📁 로컬 파일 삭제");
      return await deleteFromLocal(url);
    }
    
    // 외부 URL인 경우 (삭제 불가)
    console.log("ℹ️ 외부 URL - 삭제 불가능");
    return true; // 성공으로 처리
  } catch (error) {
    console.error("❌ 파일 삭제 실패:", error);
    return false;
  }
};

/**
 * 로컬 저장소 업로드
 */
const uploadToLocal = async (file: File, prefix: string = ""): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prefix', prefix);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Local upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Local upload failed');
  }

  return result.url;
};

/**
 * 로컬 저장소 삭제
 */
const deleteFromLocal = async (url: string): Promise<boolean> => {
  const response = await fetch('/api/delete-file', {
    method: 'DELETE',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' },
  });

  return response.ok;
};

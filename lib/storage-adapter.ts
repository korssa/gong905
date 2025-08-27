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
    console.error('❌ BLOB_READ_WRITE_TOKEN is not set');
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob Storage');
  }
  console.log('✅ Vercel Blob configuration verified');
  return token;
};

/**
 * 파일을 Vercel Blob에 업로드
 */
export const uploadToVercelBlob = async (file: File, prefix: string = ""): Promise<string> => {
  try {
    console.log('📤 Vercel Blob에 파일 업로드 시작:', { name: file.name, size: file.size, prefix });

    // 환경 변수 확인
    checkVercelBlobConfig();

    // 고유한 파일명 생성
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${prefix}_${timestamp}_${randomId}.${fileExtension}`;

    console.log('📝 Generated filename:', fileName);

    // Vercel Blob에 업로드
    const blob = await put(fileName, file, {
      access: 'public',
    });

    console.log('✅ Vercel Blob 업로드 완료:', { url: blob.url, fileName });
    return blob.url;

  } catch (error) {
    console.error('❌ Vercel Blob 업로드 실패:', error);
    throw new Error(`Vercel Blob upload failed: ${error}`);
  }
};

/**
 * Vercel Blob에서 파일 삭제
 */
export const deleteFromVercelBlob = async (url: string): Promise<boolean> => {
  try {
    console.log('🗑️ Vercel Blob에서 파일 삭제 시작:', url);

    // 환경 변수 확인
    checkVercelBlobConfig();

    // URL에서 파일명 추출
    const urlObj = new URL(url);
    const fileName = urlObj.pathname.split('/').pop();

    if (!fileName) {
      throw new Error('Invalid blob URL');
    }

    // Vercel Blob에서 삭제
    await del(url);

    console.log('✅ Vercel Blob 파일 삭제 완료:', fileName);
    return true;

  } catch (error) {
    console.error('❌ Vercel Blob 파일 삭제 실패:', error);
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
  const storageType = process.env.STORAGE_TYPE || process.env.NEXT_PUBLIC_STORAGE_TYPE || 'local';
  console.log('🔧 Storage adapter - Storage Type:', storageType);

  if (storageType === 'vercel-blob') {
    return uploadToVercelBlob(file, prefix);
  } else {
    // 로컬 저장소 폴백
    console.log('💾 Falling back to local storage');
    return uploadToLocal(file, prefix);
  }
};

/**
 * 스토리지 타입에 따른 통합 삭제 함수
 */
export const deleteFile = async (url: string): Promise<boolean> => {
  if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
    return deleteFromVercelBlob(url);
  } else if (url.startsWith('/uploads/')) {
    return deleteFromLocal(url);
  } else {
    console.log('⚠️ 외부 URL은 삭제할 수 없음:', url);
    return true; // 외부 URL은 성공으로 처리
  }
};

/**
 * 로컬 저장소 업로드 (폴백)
 */
const uploadToLocal = async (file: File, prefix: string = ""): Promise<string> => {
  console.log('💾 Local storage upload started');
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prefix', prefix);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    console.error('❌ Local upload failed:', response.statusText);
    throw new Error(`Local upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    console.error('❌ Local upload result error:', result.error);
    throw new Error(result.error || 'Local upload failed');
  }

  console.log('✅ Local upload completed:', result.url);
  return result.url;
};

/**
 * 로컬 저장소 삭제 (폴백)
 */
const deleteFromLocal = async (url: string): Promise<boolean> => {
  console.log('🗑️ Local file deletion started:', url);
  
  const response = await fetch('/api/delete-file', {
    method: 'DELETE',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' },
  });

  const success = response.ok;
  console.log('✅ Local file deletion result:', success);
  return success;
};

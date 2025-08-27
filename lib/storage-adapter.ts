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
    checkVercelBlobConfig();

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${prefix}_${timestamp}_${randomId}.${fileExtension}`;

    const blob = await put(fileName, file, {
      access: 'public',
    });

    return blob.url;

  } catch (error) {
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
  const storageType = process.env.STORAGE_TYPE || process.env.NEXT_PUBLIC_STORAGE_TYPE || 'local';

  if (storageType === 'vercel-blob') {
    return uploadToVercelBlob(file, prefix);
  } else {
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
    return true;
  }
};

/**
 * 로컬 저장소 업로드 (폴백)
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
 * 로컬 저장소 삭제 (폴백)
 */
const deleteFromLocal = async (url: string): Promise<boolean> => {
  const response = await fetch('/api/delete-file', {
    method: 'DELETE',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' },
  });

  return response.ok;
};

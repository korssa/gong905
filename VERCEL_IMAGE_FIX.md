# 🚨 Vercel 배포 후 이미지 업로드 문제 해결 가이드

## 🔍 **문제 현상**
- 관리자 모드로 갤러리 업로드 시 정상 작동
- 화면 새로고침 후 업로드한 이미지들이 사라짐
- Vercel Blob Storage에 제대로 저장되지 않거나 불러오지 못함

## 🎯 **원인 분석**
1. **환경 변수 설정 누락**: `STORAGE_TYPE`이 `vercel-blob`으로 설정되지 않음
2. **Vercel Blob 토큰 누락**: `BLOB_READ_WRITE_TOKEN`이 설정되지 않음
3. **로컬 스토리지 사용**: Vercel에서는 로컬 파일 시스템이 재배포 시 초기화됨

## ✅ **해결 방법**

### 1단계: Vercel Blob Storage 활성화
1. Vercel 대시보드 → 프로젝트 선택
2. `Storage` 탭 → `Create Database`
3. `Blob` 선택 → 데이터베이스 생성
4. 생성된 Blob에서 `BLOB_READ_WRITE_TOKEN` 복사

### 2단계: 환경 변수 설정
Vercel 대시보드 → Settings → Environment Variables에서 설정:

```bash
# 필수 설정
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxx
STORAGE_TYPE=vercel-blob
NEXT_PUBLIC_STORAGE_TYPE=vercel-blob

# 선택사항
NEXT_PUBLIC_VERCEL_URL=your-app.vercel.app
```

### 3단계: 재배포
1. 환경 변수 저장 후
2. Deployments → Redeploy 클릭
3. 배포 완료 대기

### 4단계: 테스트
1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭에서 다음 메시지 확인:
   ```
   🔧 Storage Type: vercel-blob
   ☁️ Using Vercel Blob Storage
   ✅ Vercel Blob upload completed: https://xxx.blob.vercel-storage.com/xxx
   ```

## 🔧 **진단 도구**

### 브라우저 콘솔에서 진단 실행:
```javascript
// 개발자 도구 콘솔에서 실행
import('./lib/debug-utils').then(({ runSystemDiagnostic }) => {
  runSystemDiagnostic();
});
```

### 수동 확인 사항:
1. **환경 변수 확인**:
   - `NEXT_PUBLIC_STORAGE_TYPE`이 `vercel-blob`인지 확인
   - `BLOB_READ_WRITE_TOKEN`이 설정되어 있는지 확인

2. **업로드 URL 확인**:
   - 성공적인 업로드 시 `https://xxx.blob.vercel-storage.com/xxx` 형태의 URL이 반환되는지 확인
   - `/uploads/` 형태의 로컬 URL이 반환되면 설정 문제

3. **Vercel Blob Storage 확인**:
   - Vercel 대시보드 → Storage → Blob에서 업로드된 파일들이 표시되는지 확인

## 🚨 **주의사항**

### 로컬 개발 환경:
```bash
# .env.local
STORAGE_TYPE=local
NEXT_PUBLIC_STORAGE_TYPE=local
```

### Vercel 배포 환경:
```bash
# Vercel Environment Variables
STORAGE_TYPE=vercel-blob
NEXT_PUBLIC_STORAGE_TYPE=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

## 📊 **스토리지 비교**

| 환경 | 권장 설정 | 이유 |
|------|-----------|------|
| 로컬 개발 | `local` | 빠른 개발 및 테스트 |
| Vercel 배포 | `vercel-blob` | 영구 저장 및 CDN |

## 🔄 **문제가 지속되는 경우**

### 1. 캐시 클리어
- 브라우저 캐시 및 localStorage 클리어
- Vercel 캐시 무효화 (재배포)

### 2. 환경 변수 재설정
- 모든 환경 변수 삭제 후 재설정
- 프로덕션/프리뷰 환경 모두 확인

### 3. Vercel Blob 재생성
- 기존 Blob Storage 삭제
- 새로운 Blob Storage 생성
- 새로운 토큰으로 환경 변수 업데이트

## 📞 **추가 지원**

문제가 해결되지 않으면:
1. 브라우저 개발자 도구의 Console 로그 확인
2. Vercel 배포 로그 확인
3. 환경 변수 설정 상태 재확인

---

**✅ 해결 완료 후**: 이미지가 Vercel Blob Storage에 영구 저장되어 새로고침 후에도 유지됩니다.

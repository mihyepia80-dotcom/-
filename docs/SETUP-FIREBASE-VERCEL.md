# Firebase · Vercel 배포 가이드

담당자 제출 → Firestore 저장 → 관리자 마스터 시트 통합 구조입니다.

---

## 1단계: Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com/) 접속 → **프로젝트 추가**
2. 프로젝트 이름 예: `midterm-2026-school`
3. Google Analytics는 선택 사항

### Firestore

1. **빌드 → Firestore Database → 데이터베이스 만들기**
2. **테스트 모드**로 시작 (아래 4단계에서 규칙 배포)
3. 리전: `asia-northeast3 (Seoul)` 권장

### Authentication (익명 로그인)

1. **빌드 → Authentication → 시작하기**
2. **로그인 방법 → 익명 → 사용 설정**

### 웹 앱 등록

1. **프로젝트 설정(⚙) → 일반 → 내 앱 → 웹(`</>`) 추가**
2. 앱 닉네임: `midterm-eval`
3. 표시되는 `firebaseConfig` 값을 `.env`에 복사:

```env
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc...
FIREBASE_COLLECTION_PREFIX=midterm2026
```

> `FIREBASE_COLLECTION_PREFIX`를 바꾸면 `firebase/firestore.rules`와 `firebase/firestore.indexes.json`의 `midterm2026`도 같은 이름으로 수정하세요.

### 서비스 계정 (Vercel API용)

1. **프로젝트 설정 → 서비스 계정 → Firebase Admin SDK → 새 비공개 키 생성**
2. 다운로드한 JSON 파일 내용 **전체**를 복사
3. Vercel 환경변수 `FIREBASE_SERVICE_ACCOUNT`에 **한 줄**로 붙여넣기 (아래 3단계)

---

## 2단계: 로컬 `.env` 설정

```bash
cp .env.example .env
# .env 편집 — Firebase 값 입력

node scripts/generate-admin-key.js
# 출력된 ADMIN_SYNC_KEY를 .env와 Vercel에 동일하게 설정

npm install
npm run build
npm run check-env
npm run dev
```

브라우저에서 `http://localhost:8080` → 헤더 **「클라우드: 연결됨」** 확인

---

## 3단계: Firestore 규칙·인덱스 배포

### Firebase CLI 설치 (최초 1회)

```bash
npm install -g firebase-tools
firebase login
```

### 프로젝트 연결

```bash
cp .firebaserc.example .firebaserc
# .firebaserc에서 YOUR_FIREBASE_PROJECT_ID를 실제 ID로 변경

firebase deploy --only firestore
```

또는:

```bash
npm run firebase:deploy
```

---

## 4단계: Vercel 배포

### A. GitHub 연동 (권장)

1. [Vercel](https://vercel.com) 로그인 → **Add New Project**
2. GitHub 저장소 `mihyepia80-dotcom/-` Import
3. Framework Preset: **Other**
4. Build Command: `npm install && npm run build`
5. Output Directory: `.` (루트)
6. **Environment Variables** 추가:

| 이름 | 값 | 환경 |
|------|-----|------|
| `FIREBASE_API_KEY` | Firebase 웹 설정 | Production, Preview |
| `FIREBASE_AUTH_DOMAIN` | ↑ | Production, Preview |
| `FIREBASE_PROJECT_ID` | ↑ | Production, Preview |
| `FIREBASE_STORAGE_BUCKET` | ↑ | Production, Preview |
| `FIREBASE_MESSAGING_SENDER_ID` | ↑ | Production, Preview |
| `FIREBASE_APP_ID` | ↑ | Production, Preview |
| `FIREBASE_COLLECTION_PREFIX` | `midterm2026` | Production, Preview |
| `ADMIN_SYNC_KEY` | `generate-admin-key.js` 출력값 | Production, Preview |
| `FIREBASE_SERVICE_ACCOUNT` | 서비스 계정 JSON 한 줄 | Production, Preview |

7. **Deploy** 클릭

### B. CLI 배포

```bash
npx vercel login
npx vercel
npx vercel --prod
```

환경변수는 Vercel 대시보드에서 동일하게 설정합니다.

---

## 5단계: 배포 후 확인

1. 배포 URL 접속 → **클라우드: 연결됨** 표시
2. 행사 마스터 → 담당자 필터 입력 → **클라우드 제출 (내 평가)**
3. Firebase Console → Firestore → `midterm2026_submissions` 컬렉션에 문서 생성 확인
4. 관리자: **제출물 새로고침** → 목록 표시
5. **행사평가 → 마스터 반영** → 로컬 마스터에 병합
6. **마스터 클라우드 저장** → `midterm2026_master/sheet` 문서 확인

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| 클라우드: 미연결 | `.env` 작성 후 `npm run build`, Vercel는 환경변수·재배포 |
| `Missing or insufficient permissions` | Firestore 규칙 배포, 익명 로그인 활성화 |
| `ADMIN_SYNC_KEY not configured` | Vercel에 `ADMIN_SYNC_KEY` 추가 |
| `FIREBASE_SERVICE_ACCOUNT not configured` | Vercel에 JSON 한 줄 추가 |
| 제출물 필터 오류 | `firebase deploy --only firestore:indexes` 실행 |
| index.html만 열면 Firebase 안 됨 | `npm run dev` 또는 Vercel URL 사용 |

---

## 데이터 구조 요약

```
midterm2026_submissions/{formType}__{formKey}__{담당자}
  formType, personName, data, updatedAt, submittedBy

midterm2026_master/sheet
  writer, date, rows[], updatedAt  ← 관리자 API만 쓰기
```

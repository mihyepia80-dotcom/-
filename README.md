# 2026-1학기 학교 중간평가 웹앱

부서별·학년별 중간평가 및 협의록 작성 웹 애플리케이션입니다.  
담당자는 각자 작성 후 **Firebase 클라우드에 제출**하고, 관리자는 **행사 마스터 시트**에서 제출물을 모아 관리합니다.

## 서식 구성

| 번호 | 서식명 | 설명 |
|------|--------|------|
| 1 | 행사 마스터 | 월별 행사 + 담당자 좋았던 점/보완점 |
| 2 | 학년 협의록 | 1~6학년 교육활동 평가 + 첨부 |
| 3 | 교과/비교과 | 과목·프로그램별 평가 |
| 4 | 부서 협의록 | 8개 부서 담당자 업무·추진결과 |

## 로컬 실행

```bash
cp .env.example .env
# .env에 Firebase 값 입력

npm install
npm run build    # js/env.js 생성 (.gitignore)
npm run dev      # http://localhost:8080
```

`index.html`만 열어도 동작하지만, Firebase 연동은 `npm run build` 후에 가능합니다.

## Firebase · Vercel 배포

**상세 가이드:** [docs/SETUP-FIREBASE-VERCEL.md](docs/SETUP-FIREBASE-VERCEL.md)

```bash
cp .env.example .env          # Firebase 값 입력
npm run admin-key             # ADMIN_SYNC_KEY 생성
npm install && npm run build
npm run check-env
firebase login && npm run firebase:deploy   # 규칙·인덱스
# Vercel: GitHub 연동 또는 npx vercel --prod
```

## Firebase · 환경변수

### 로컬 (`.env` — Git에 올리지 않음)

`.env.example`을 복사해 Firebase Console 값을 채웁니다.

| 변수 | 설명 |
|------|------|
| `FIREBASE_API_KEY` 등 | Firebase 웹 앱 설정 |
| `FIREBASE_COLLECTION_PREFIX` | Firestore 컬렉션 접두사 (예: `midterm2026`) |
| `ADMIN_SYNC_KEY` | 마스터 시트 API 동기화용 비밀키 (팀 내부 공유) |

### Vercel 배포

Vercel 프로젝트 **Environment Variables**에 위 변수와 함께:

| 변수 | 설명 |
|------|------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK 서비스 계정 JSON **전체를 한 줄 문자열**로 |

빌드 시 `npm run build`가 `js/env.js`를 생성합니다.  
`.env` / `js/env.js` / 서비스 계정 JSON은 **`.gitignore`에 포함**되어 있습니다.

### Firebase Console 설정

1. Firestore Database 생성
2. **Authentication → 익명 로그인** 활성화 (담당자 제출용)
3. `firebase/firestore.rules` 내용을 Firestore 규칙에 배포

## 클라우드 데이터 구조

```
{prefix}_submissions/{formType}__{formKey}__{담당자}
  → formType, personName, data, updatedAt

{prefix}_master/sheet
  → 행사 마스터 전체 (관리자 API로 저장)
```

### 담당자 흐름

1. 각 서식 작성 → **클라우드 제출**
2. 행사 마스터: 담당자 필터 입력 후 **좋았던 점/보완점** 제출 (`event-eval`)

### 관리자 흐름 (행사 마스터 탭)

1. **제출물 새로고침** — Firestore 제출 목록 확인
2. **행사평가 → 마스터 반영** — 제출된 평가를 마스터 행에 병합
3. **마스터 클라우드 저장/불러오기** — `ADMIN_SYNC_KEY` + Vercel API

## 파일 구조

```
index.html
.env.example          # 환경변수 템플릿 (Git 포함)
.gitignore            # .env, js/env.js 제외
vercel.json
scripts/generate-env.js
api/master.js         # 마스터 시트 서버 API (Vercel)
firebase/firestore.rules
js/
  env.js              # 빌드 생성 (Git 제외)
  firebase.js         # Firestore 클라이언트
  cloud-sync.js       # 제출·마스터 동기화 UI
  master.js           # 행사 마스터 (localStorage)
  form-grade.js, form4.js, form5.js, form6.js
```

## 기능

- 4개 메인 탭, 표별 저장·초기화
- localStorage 자동 저장 + Firebase 클라우드 제출
- Excel 업로드/다운로드
- 2분할 레이아웃 (좁은 행사 확인 + 넓은 작성란)

# 빌드 아키텍처 & 배포 가이드

> 최종 업데이트: 2026-06-16

---

## 프로젝트 구조

이 프로젝트는 **3개의 독립적인 빌드 단위**로 구성되어 있습니다.

```
gongsilnews/
├── src/app/                          ← ① Next.js 메인 앱
├── marketing/report/                 ← ② 보고서 편집기 (Vite 서브프로젝트)
├── marketing/ai-detail/              ← ③ AI 상세페이지 (Vite 서브프로젝트)
├── public/marketing/report/          ← ②의 빌드 결과물 (정적 파일)
├── public/marketing/ai-detail/       ← ③의 빌드 결과물 (정적 파일)
└── scripts/build-all.js              ← 전체 빌드 스크립트
```

---

## 빌드 시스템 요약

| # | 프로젝트 | 빌드 도구 | 소스 경로 | 출력 경로 | URL |
|---|---------|----------|----------|----------|-----|
| ① | 메인 앱 (뉴스/관리자/API) | Next.js | `src/app/` | `.next/` | `/*` |
| ② | 보고서 편집기 | **Vite** | `marketing/report/` | `public/marketing/report/` | `/marketing/report` |
| ③ | AI 상세페이지 | **Vite** | `marketing/ai-detail/` | `public/marketing/ai-detail/` | `/marketing/ai-detail` |

> **핵심 포인트**: ②와 ③은 Next.js와 **완전히 분리된 Vite 프로젝트**입니다.
> `public/` 폴더에 정적 HTML/JS로 빌드되어 Next.js가 정적 파일로 서빙합니다.

---

## 빌드 명령어

### 개별 빌드

```bash
# ① Next.js 메인 앱만 빌드
npm run build

# ② 보고서 편집기만 빌드
cd marketing/report && npm run build

# ③ AI 상세페이지만 빌드
cd marketing/ai-detail && npm run build
```

### 전체 빌드 (권장)

```bash
npm run build:all
```

`build:all`은 `scripts/build-all.js`를 실행하며, 아래 순서로 진행됩니다:

1. `marketing/ai-detail/` → `npm install` → `npm run build`
2. `marketing/report/` → `npm install` → `npm run build`
3. `npx next build` (Next.js 메인 앱)

---

## Vercel 배포

### 설정 (`vercel.json`)

```json
{
  "buildCommand": "npm run build:all"
}
```

Vercel은 git push 시 자동으로 `build:all`을 실행하여 **3개 프로젝트 모두 빌드 후 배포**합니다.

### 배포 워크플로우

```
코드 수정 → git push → Vercel 자동 실행:
  ┌─ 1. marketing/ai-detail 빌드 (Vite)
  ├─ 2. marketing/report 빌드 (Vite)
  └─ 3. Next.js 빌드
→ 배포 완료
```

> 로컬에서 서브프로젝트를 수동 빌드할 필요 **없습니다**.
> 소스 코드만 수정하고 git push하면 됩니다.

---

## Git 관리

### `.gitignore` 설정

서브프로젝트 빌드 결과물은 **git 추적에서 제외**됩니다:

```gitignore
# sub-project build outputs (Vercel builds these automatically via build:all)
/public/marketing/report/assets/
/public/marketing/ai-detail/assets/
```

### 추적되는 파일 vs 추적되지 않는 파일

| 파일 | Git 추적 | 설명 |
|------|---------|------|
| `marketing/report/*.tsx` | ✅ 추적 | 소스 코드 |
| `marketing/report/package.json` | ✅ 추적 | 의존성 정의 |
| `public/marketing/report/index.html` | ✅ 추적 | 진입점 HTML |
| `public/marketing/report/assets/*.js` | ❌ 제외 | Vite 빌드 결과물 (Vercel이 생성) |

---

## 주요 파일 맵 (보고서 편집기)

```
marketing/report/
├── App.tsx                           ← 메인 앱 컴포넌트, 상태 관리
├── types.ts                          ← 타입 정의
├── propertyTemplates.ts              ← 매물 유형별 템플릿 생성
├── vite.config.ts                    ← Vite 빌드 설정
├── package.json                      ← 서브프로젝트 의존성
└── components/
    ├── canvas/                       ← 각 페이지 컴포넌트
    │   ├── Page0Cover.tsx            ← 표지
    │   ├── Page1Overview.tsx         ← 물건개요
    │   ├── Page2StatusValuation.tsx   ← 매물설명 & 시세
    │   ├── Page3LeaseStatus.tsx       ← 임대현황
    │   ├── Page4Photos.tsx           ← 사진
    │   ├── Page5AreaAnalysis.tsx      ← 입지분석
    │   ├── Page6Roadmap.tsx          ← 로드맵
    │   └── Page7Ending.tsx           ← 연락처 (CONTACT)
    └── shared/                       ← 공통 컴포넌트
        ├── KakaoMap.tsx              ← 카카오맵
        ├── EditableText.tsx          ← 인라인 편집
        ├── EditableImage.tsx         ← 이미지 편집
        └── ReportPage.tsx            ← 페이지 레이아웃 (헤더/뱃지/푸터)
```

---

## 로컬 개발 시 참고사항

### 보고서 편집기 수정 후 로컬 확인

보고서 편집기는 Vite dev server로 **로컬 확인이 불가능**합니다 (Next.js API에 의존).
프로덕션 배포 후 확인하거나, `npm run build:all` 후 `npm start`로 확인하세요.

### 페이지 뱃지 (Page Badges)

각 페이지의 우측 상단 영문 뱃지는 **하드코딩**되어 있습니다:

| 페이지 | 뱃지 | 파일 |
|--------|------|------|
| Page 1 | `{카테고리} \| {거래유형}` | Page1Overview.tsx (동적) |
| Page 2 | `DETAILS` | Page2StatusValuation.tsx |
| Page 3 | `LEASING` | Page3LeaseStatus.tsx |
| Page 4 | `GALLERY` | Page4Photos.tsx |
| Page 5 | `LOCATION` | Page5AreaAnalysis.tsx |
| Page 6 | `ROADMAP` | Page6Roadmap.tsx |
| Page 7 | 없음 (엔딩 페이지) | Page7Ending.tsx |

---

## 트러블슈팅

### 문제: 코드 수정 후 프로덕션에 반영 안 됨

1. Vercel Deployments에서 최신 배포 상태 확인 (Ready/Error)
2. 배포 성공인데 안 보이면 → `Ctrl+Shift+R` 강력 새로고침
3. 빌드 에러면 → Vercel 로그에서 에러 내용 확인

### 문제: 로컬에서 보고서가 안 보임

보고서는 `public/` 정적 파일로 서빙됩니다. 로컬 dev server에서는:
- `npm run dev` 실행 중이어야 함
- `public/marketing/report/assets/` 에 빌드 파일이 있어야 함
- 없으면: `cd marketing/report && npm run build` 실행

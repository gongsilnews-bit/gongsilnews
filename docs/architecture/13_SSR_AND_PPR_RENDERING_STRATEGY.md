# 13. SSR / PPR 렌더링 전략

> 작성일: 2026-04-11  
> Next.js 버전: 16.2.3

---

## 1. 현재 적용 상태: SSR (Server-Side Rendering) ✅

### 적용 완료된 페이지

| 페이지 | 파일 | 방식 |
|--------|------|------|
| 전체뉴스 | `news_all/page.tsx` | 서버에서 `getArticles()` 호출 → props 전달 |
| 부동산·주식·재테크 | `news_finance/page.tsx` | 〃 |
| 정치·경제·사회 | `news_politics/page.tsx` | 〃 |
| 세무·법률 | `news_law/page.tsx` | 〃 |
| 여행·건강·생활 | `news_life/page.tsx` | 〃 |
| 기타 카테고리 | `news_etc/page.tsx` | 〃 |

### SSR 적용 방식

```
[서버 컴포넌트] page.tsx (async)
   ↓ await getArticles({ status: "APPROVED" })
   ↓ await getArticles({ limit: 50 })  ← 인기 뉴스
   ↓ Promise.all()로 두 쿼리 병렬 실행
   ↓
[클라이언트 컴포넌트] NewsListLayout.tsx
   ↓ props: initialArticles, initialPopular
   ↓ 즉시 렌더링 (로딩 없음!)
```

### 이전 방식 (CSR) vs 현재 방식 (SSR) 비교

```
❌ 이전 (CSR - Client Side Rendering):
   브라우저 → 빈 HTML 받음 → JS 다운로드 → 마운트
   → useEffect → 서버에 기사 요청 (왕복!) → 응답 → 렌더링
   ⏱️ 체감: 1~3초 (로딩 스피너 표시)

✅ 현재 (SSR - Server Side Rendering):
   Vercel 서버 → DB 조회 (서버↔DB 빠름) → HTML에 기사 포함 → 전송
   브라우저 → 기사가 이미 있는 HTML 수신 → 즉시 표시!
   ⏱️ 체감: 0.3~0.5초 (로딩 없음)
```

### 핵심 변경 사항

- `NewsListLayout.tsx`에서 `useEffect` 데이터 페칭 제거
- 각 page.tsx를 `async` 서버 컴포넌트로 변환
- `initialArticles`, `initialPopular`를 props로 전달
- `Promise.all()`로 기사 목록 + 인기 뉴스 병렬 조회

---

## 2. 추후 적용 예정: PPR (Partial Prerendering)

### PPR이란?

SSR은 **모든 데이터가 준비될 때까지** 페이지 전체를 기다려야 함.  
PPR은 **정적 부분을 먼저 보내고**, 동적 부분만 나중에 스트리밍.

```
SSR (현재):
┌────────────────────────────────┐
│  전부 완료될 때까지 기다림       │ → 350ms 후 한번에 표시
└────────────────────────────────┘

PPR (향후):
┌────────────────────────────────┐
│  헤더, 사이드바 틀, 레이아웃    │ → 0ms 즉시 표시 (정적 셸)
│  ┌─────────┐  ┌──────────┐    │
│  │ 기사 목록 │  │ 인기 뉴스 │    │ → 200ms 후 스트리밍 (동적)
│  └─────────┘  └──────────┘    │
└────────────────────────────────┘
```

### Next.js 16 PPR 활성화 방법

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,  // ← PPR 활성화 (Next.js 16 방식)
};
```

```tsx
// page.tsx 예시
import { Suspense } from "react";

export default function NewsAllPage() {
  return (
    <>
      <header>전체뉴스</header>         {/* 즉시 표시 (정적) */}
      <Suspense fallback={<Skeleton />}>
        <ArticleList />                {/* 나중에 스트리밍 (동적) */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <PopularNews />                {/* 별도로 스트리밍 (동적) */}
      </Suspense>
    </>
  );
}
```

### 지금 적용하지 않는 이유

1. **기사 수가 적음** — 현재 SSR로도 충분히 빠름 (0.3~0.5초)
2. **Next.js 16 PPR은 15와 완전히 다른 구조** — `cacheComponents` 기반으로 변경됨
3. **공식 문서에서 마이그레이션 가이드 숙지 권장** — 안정성 확보 후 적용
4. **Suspense 경계 설계 필요** — 컴포넌트 구조 리팩토링 선행 필요

### PPR 적용 시점 기준

| 조건 | 설명 |
|------|------|
| 기사 1,000건 이상 | DB 조회 시간 증가로 SSR 한계 체감 |
| 동시 접속 100명 이상 | 서버 부하 경감 (정적 셸 CDN 캐싱) |
| 사이드바/광고 영역 확장 | 독립 스트리밍으로 각 영역 최적화 |

---

## 3. 렌더링 방식 전체 비교표

| 방식 | 설명 | 데이터 시점 | 체감 속도 | 적합한 상황 |
|------|------|------------|----------|------------|
| CSR | 브라우저에서 데이터 요청 | 마운트 후 | ❌ 느림 | SPA, 대시보드 |
| SSR | 서버에서 데이터 포함 HTML 전송 | 요청 시 | ✅ 빠름 | **현재 적용** |
| SSG | 빌드 시 HTML 생성 | 빌드 시 | ⚡ 최고 | 변경 없는 콘텐츠 |
| ISR | SSG + 주기적 갱신 | 빌드 후 재검증 | ⚡ 빠름 | 블로그, 카탈로그 |
| PPR | 정적 셸 즉시 + 동적 스트리밍 | 요청 시 (분할) | ⚡⚡ 최적 | **추후 적용** |

---

## 4. 참고 파일

- `src/components/NewsListLayout.tsx` — 기사 리스트 클라이언트 컴포넌트 (props 기반)
- `src/app/(main)/news_all/page.tsx` — SSR 적용 예시 (서버 데이터 페칭)
- `src/app/actions/article.ts` — `getArticles()` 서버 액션
- `next.config.ts` — PPR 설정 추가 위치

# 05. 뉴스 카테고리 페이지 공통 컴포넌트 전략

## 핵심 결정

**뉴스 카테고리별 페이지(전체뉴스, 부동산·주식·재테크, 정치·경제·사회, 세무·법률, 여행·건강·생활, 기타)는 하나의 공통 컴포넌트를 공유하고, 카테고리 파라미터만 다르게 전달하여 데이터를 분기한다.**

---

## 대상 페이지 목록

| 라우트 | 카테고리 필터 | 페이지 타이틀 |
|--------|-------------|-------------|
| `/news_all` | 전체 (필터 없음) | 전체뉴스 |
| `/news_finance` | 부동산·주식·재테크 | 부동산·주식·재테크 |
| `/news_politics` | 정치·경제·사회 | 정치·경제·사회 |
| `/news_law` | 세무·법률 | 세무·법률 |
| `/news_life` | 여행·건강·생활 | 여행·건강·생활 |
| `/news_etc` | 기타 | 기타 |

---

## 파일 구조

```
src/
├── components/
│   ├── Header.tsx              ← 전 페이지 공통 헤더
│   ├── Footer.tsx              ← 전 페이지 공통 푸터
│   └── NewsListLayout.tsx      ← ★ 뉴스 리스트 공통 레이아웃
│
├── app/
│   ├── news_all/page.tsx       ← NewsListLayout(category="all")
│   ├── news_finance/page.tsx   ← NewsListLayout(category="부동산·주식·재테크")
│   ├── news_politics/page.tsx  ← NewsListLayout(category="정치·경제·사회")
│   ├── news_law/page.tsx       ← NewsListLayout(category="세무·법률")
│   ├── news_life/page.tsx      ← NewsListLayout(category="여행·건강·생활")
│   └── news_etc/page.tsx       ← NewsListLayout(category="기타")
```

---

## 공통 컴포넌트 설계

### NewsListLayout Props

```typescript
interface NewsListLayoutProps {
  category: string;    // Supabase 쿼리 시 section2 필터 값 ("all"이면 전체)
  title: string;       // 페이지 상단 타이틀 텍스트
}
```

### 공통 컴포넌트가 담당하는 영역

1. **좌측 뉴스 리스트 영역**
   - 타이틀 헤더 (아이콘 + 제목 + border-bottom)
   - 기사 카드 리스트 (썸네일 + 제목 + 설명 + 카테고리 뱃지 + 날짜 + 기자명)
   - 비디오 기사 재생 버튼 오버레이
   - 페이지네이션 (이전/다음)
   - 스켈레톤 로딩 UI

2. **우측 사이드바 영역**
   - 배너 광고 슬롯
   - 많이 본 뉴스 (Top 5)
   - 추천 공실 매물 리스트 (더보기 링크)

### 각 카테고리 페이지 파일 (3줄)

```tsx
// 예: src/app/news_finance/page.tsx
import NewsListLayout from "@/components/NewsListLayout";
export default function Page() {
  return <NewsListLayout category="부동산·주식·재테크" title="부동산·주식·재테크" />;
}
```

---

## 속도 최적화 근거

### 왜 공통 컴포넌트인가?

| 항목 | 페이지마다 복사 (❌) | 공통 컴포넌트 (✅) |
|------|------------------|----------------|
| JS 번들 크기 | 6개 × 동일 코드 중복 | 1개 공통 코드, 브라우저 캐시 재활용 |
| CSS 로딩 | 중복 로딩 위험 | globals.css에 이미 포함, 추가 로딩 0 |
| 페이지 이동 속도 | 매번 새 컴포넌트 파싱 | 이미 캐시된 컴포넌트 재사용 (SPA 전환) |
| 유지보수 | 디자인 수정 → 6곳 수정 | 디자인 수정 → 1곳만 수정 |
| 데이터 연동 | 6개 파일에 쿼리 로직 중복 | 1곳에서 category prop으로 분기 |

### Dynamic Route(`/news/[category]`) 대신 개별 폴더를 선택한 이유

- 원본 사이트 URL 구조(`news_finance.html`, `news_politics.html`)와 일치시켜 SEO 호환성 유지
- GNB 메뉴 링크가 이미 `/news_finance`, `/news_politics` 등으로 하드코딩됨
- 각 페이지별 메타데이터(title, description) 개별 설정 가능

---

## Supabase 연동 시 쿼리 분기 (향후)

```typescript
// NewsListLayout 내부에서
const query = supabase
  .from('articles')
  .select('*, article_media!fk_rep_media(url)')
  .eq('status', 'published')
  .order('created_at', { ascending: false });

// category가 "all"이 아니면 필터 추가
if (category !== "all") {
  query = query.eq('section2', category);
}

const { data } = await query.range(startIdx, endIdx);
```

---

## GNB 활성 메뉴 하이라이트

현재 페이지에 해당하는 GNB 메뉴에 `color: #508bf5` 스타일을 적용해야 함.
→ Header 컴포넌트에 `activeMenu` prop 추가하거나, `usePathname()` 훅으로 현재 경로 감지하여 자동 하이라이트.

```tsx
// Header.tsx 내부
const pathname = usePathname();
// "/news_finance" → "부동산·주식·재테크" 메뉴 하이라이트
```

---

## 작업 순서

1. ✅ `news_all/page.tsx` 디자인 완료 (현재 완료)
2. ⬜ `NewsListLayout.tsx` 공통 컴포넌트 추출
3. ⬜ 나머지 5개 카테고리 페이지 생성 (각 3줄)
4. ⬜ GNB 활성 메뉴 하이라이트 적용
5. ⬜ Supabase 데이터 연동 (프로그램 단계에서)

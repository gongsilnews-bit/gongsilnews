# 17. 관리자페이지 운영 — 모듈 분할 전략 (Admin Page Modularization)

## 1. 현황 분석

현재 `src/app/admin/page.tsx`는 **1,593줄 / 136KB** 단일 컴포넌트로 모든 관리 기능이 집중되어 있음.

### 구조적 문제점
| 문제 | 영향 |
|------|------|
| 모든 섹션 코드가 단일 번들에 포함 | 초기 JS 파싱 136KB 전체 로딩 |
| `useEffect`에서 4개 API 동시 호출 | 대시보드만 봐도 회원/기사/게시판/공실 전부 fetch |
| `useState` 30개 이상이 한 컴포넌트에 집중 | 유지보수·가독성 저하 |
| 기사 관리 섹션이 2개 중복 존재 | L577-728 + L1212-1348 |

### 현재 섹션별 규모

| 섹션 | 라인 범위 | 규모 | State 수 | API 호출 |
|------|-----------|------|----------|---------|
| SVG 아이콘 + 메뉴 데이터 | L16-81 | ~65줄 | - | - |
| 메인 셸 (사이드바+헤더) | L86-273 | ~190줄 | 30+ | getUser |
| 대시보드 | L276-380 | ~100줄 | 0 | 없음 (더미) |
| 공실 관리 | L381-575 | ~195줄 | 2 | getVacancies, updateVacancyStatus, deleteVacancy |
| 기사 관리 ① (레거시) | L577-728 | ~150줄 | 3 | getArticles, deleteArticle |
| 게시판 관리 | L730-816 | ~90줄 | 7 | getBoards, deleteBoard, saveBoard |
| 스터디 관리 | L818-926 | ~110줄 | 0 | 없음 (더미) |
| 매뉴얼 | L928-929 | 1줄 | 0 | 이미 분리됨 (`AdminManual.tsx`) |
| 회원 관리 | L930-1210 | ~280줄 | 4 | adminGetMembers, adminSoftDelete 등 |
| 기사 관리 ② (신규) | L1212-1348 | ~140줄 | 3 | (①과 중복) |
| 게시판 모달 | L1362-1548 | ~190줄 | - | saveBoard |
| 반려 모달 | L1549-1588 | ~40줄 | - | adminUpdateArticleStatus |

---

## 2. 분할 전략: `React.lazy()` + 섹션별 독립 컴포넌트

### 핵심 원칙
1. **탭 전환 시 해당 섹션만 lazy load** → 초기 번들 축소
2. **각 섹션이 자체 state + 자체 data fetching** → 불필요한 API 호출 제거
3. **공통 테마(darkMode 등)만 Props로 전달** → 결합도 최소화
4. **UI 변경 없음** → 사용자 경험 동일 유지

### 목표 파일 구조
```
src/app/admin/
├── page.tsx              ← ~150줄 (레이아웃 셸 + lazy import만)
├── actions.ts            ← 기존 유지
├── AdminManual.tsx       ← 기존 유지
├── sections/             ← [신규] 섹션별 분리
│   ├── AdminIcons.tsx       ← 공용 SVG 아이콘 (L16-33)
│   ├── types.ts             ← AdminTheme, AdminSectionProps 타입
│   ├── DashboardSection.tsx ← 대시보드 (~100줄)
│   ├── VacancySection.tsx   ← 공실관리 (~200줄)
│   ├── ArticleSection.tsx   ← 기사관리 - 중복 통합 (~250줄)
│   ├── StudySection.tsx     ← 스터디관리 (~110줄)
│   ├── BoardSection.tsx     ← 게시판관리 + 모달 (~280줄)
│   └── MemberSection.tsx    ← 회원관리 (~280줄)
```

### 메인 셸 (`page.tsx`) 핵심 구조
```tsx
const DashboardSection = lazy(() => import("./sections/DashboardSection"));
const VacancySection   = lazy(() => import("./sections/VacancySection"));
const ArticleSection   = lazy(() => import("./sections/ArticleSection"));
// ...

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const theme = computeTheme(darkMode); // bg, cardBg, textPrimary 등

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 사이드바 (기존 그대로) */}
      {/* 헤더 (기존 그대로) */}
      <Suspense fallback={<LoadingSpinner />}>
        {activeMenu === "dashboard" && <DashboardSection theme={theme} />}
        {activeMenu === "gongsil"   && <VacancySection theme={theme} adminUserId={adminUserId} />}
        {activeMenu === "article"   && <ArticleSection theme={theme} />}
        {/* ... */}
      </Suspense>
    </div>
  );
}
```

### 각 섹션 컴포넌트 공통 Props
```typescript
interface AdminTheme {
  bg: string;         // 배경색
  cardBg: string;     // 카드 배경
  textPrimary: string;
  textSecondary: string;
  border: string;
  darkMode: boolean;
}

interface AdminSectionProps {
  theme: AdminTheme;
}
```

---

## 3. 섹션별 분할 상세

### DashboardSection
- KPI 카드 4개, 최근 물건/회원, 바로가기, 최근 댓글
- 현재 더미 데이터 → 추후 실데이터 연동 시 자체 fetch 추가
- 자체 state: 없음

### VacancySection
- 공실 리스트 + 필터 + 등록/수정 폼 전환 (`VacancyRegisterForm` 포함)
- 자체 state: `dbVacancies`, `editingVacancy`, `showRegisterForm`
- 마운트 시에만 `getVacancies()` 호출

### ArticleSection ⚠️ 중복 통합
- 기존 2개 기사관리 UI(L577-728, L1212-1348)를 **1개로 통합**
- 필터 탭(전체/승인대기/발행됨/작성중/반려) + 일괄 승인/반려 + 반려 모달 함께 포함
- 자체 state: `dbArticles`, `articleFilter`, `checkedArticleIds`, `showRejectModal`, `rejectReason`

### StudySection  
- 현재 더미 데이터 그대로 이동
- 추후 실데이터 연동 대비 구조만 분리

### BoardSection
- 게시판 리스트 + 생성/수정 모달 함께 포함
- 자체 state: `dbBoards`, `showBoardModal`, `boardId`, `boardName`, `boardSubtitle`, `boardSkinType`, `boardCategories`, `perm*`

### MemberSection
- 회원목록 + 휴지통(dormant) 전환을 `activeSubmenu` prop으로 구분
- `MemberRegisterForm` 포함
- 자체 state: `dbMembers`, `checkedMemberIds`, `showMemberRegister`, `selectedMemberId`

---

## 4. 기대 효과

| 항목 | Before | After |
|------|--------|-------|
| page.tsx 크기 | 1,593줄 / 136KB | ~150줄 / ~12KB |
| 초기 JS 번들 | 136KB (전체) | ~15KB (셸만) |
| 탭 전환 시 | 이미 로드됨 (낭비) | 해당 섹션만 lazy load (~20-40KB) |
| 초기 API 호출 | 4개 동시 | 1개 (활성 탭만) |
| State 수 (page.tsx) | 30+ | 3개 (activeMenu, darkMode, adminUserId) |
| 새 기능 추가 | page.tsx 전체 수정 | 독립 파일 추가 |
| 기사관리 중복 | 2곳 존재 | 1곳으로 통합 |

---

## 5. 작업 순서

1. `sections/` 폴더 생성 + `types.ts`, `AdminIcons.tsx` 공통 인프라 작성
2. `DashboardSection.tsx` 분리 (가장 독립적)
3. `StudySection.tsx` 분리 (더미 데이터, 의존성 없음)
4. `BoardSection.tsx` 분리 (모달 포함)
5. `VacancySection.tsx` 분리 (`VacancyRegisterForm` 연동)
6. `ArticleSection.tsx` 분리 + 중복 통합
7. `MemberSection.tsx` 분리 (`MemberRegisterForm` 연동)
8. `page.tsx` 정리 → lazy import + Suspense 적용
9. 브라우저 동작 검증 + `npx next build` 빌드 확인

---

## 6. 참고: 기존 분리 완료 컴포넌트

이미 `src/components/admin/`에 분리되어 있는 컴포넌트:
- `AdminSidebar.tsx` (11KB) — 사이드바 (현재 미사용, page.tsx에 인라인)
- `MemberRegisterForm.tsx` (26KB) — 회원 등록/수정 폼
- `VacancyRegisterForm.tsx` (79KB) — 공실 등록/수정 폼
- `AdminManual.tsx` (47KB) — 매뉴얼 페이지

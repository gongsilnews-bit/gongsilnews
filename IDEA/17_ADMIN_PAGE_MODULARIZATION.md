# 17. 관리자페이지 운영 — 모듈 분할 전략 (Admin Page Modularization)

## 1. 배경 및 문제점

3개 관리자 페이지(`admin`, `realty_admin`, `user_admin`)가 각각 모놀리식 단일 파일로 구현되어 있었으며, SVG 아이콘·대시보드·공실관리 등 **80~90%**의 코드가 중복 복붙 상태였음.

| 파일 | Before | After |
|------|--------|-------|
| `admin/page.tsx` | 1,593줄 / 136KB | **130줄** |
| `realty_admin/page.tsx` | 523줄 / 44KB | **120줄** |
| `user_admin/page.tsx` | 487줄 / 41KB | **110줄** |
| **합계** | **2,603줄** | **360줄** + 공유 섹션 ~1,200줄 |

---

## 2. 채택된 전략: 방법 A (섹션 분리 + 공유)

### 핵심 원칙
- **3개 page.tsx는 각각 독립 유지** → 라우팅 구조 변경 없음, 향후 부동산관리자 전용 기능 확장 용이
- **공통 UI 섹션은 `components/admin/sections/`에 한 번만 작성** → 3곳에서 import하여 재사용
- **`React.lazy()` + `Suspense`** → 탭 전환 시 해당 섹션만 lazy load, 초기 번들 축소

### 방법 B(완전 통합) 기각 사유
하나의 파일에 `if (role === 'ADMIN') ... else if (role === 'REALTOR')` 분기가 쌓이면 코드가 꼬이며, 부동산관리자 전용 기능(직원관리, 홈페이지관리 등) 추가 시 다른 role에 영향을 줄 위험.

---

## 3. 구현 결과 — 파일 구조

```
src/components/admin/sections/      ← [신규] 공유 섹션
├── types.ts                 ← AdminTheme, AdminSectionProps, computeTheme
├── AdminIcons.tsx           ← 15개 공용 SVG 아이콘 (3곳 중복 제거)
├── DashboardSection.tsx     ← role별 KPI·배너 분기 (admin/realtor/user)
├── VacancySection.tsx       ← role별 상태 제어 (admin=전체조회, realtor=토글, user=읽기전용)
├── ArticleSection.tsx       ← 기사 필터탭 + 일괄 승인/반려 + 반려모달 (중복 통합)
├── StudySection.tsx         ← 스터디/강의 관리
├── BoardSection.tsx         ← 게시판 리스트 + 생성/수정 모달
└── MemberSection.tsx        ← 회원목록 + 휴지통 + 등록/수정 폼

src/components/admin/               ← 기존 유지
├── AdminSidebar.tsx         ← (미사용, 향후 활용 가능)
├── MemberRegisterForm.tsx   ← 회원 등록/수정 폼
└── VacancyRegisterForm.tsx  ← 공실 등록/수정 폼

src/app/admin/page.tsx               ← 최고관리자 셸 (~130줄)
src/app/realty_admin/page.tsx        ← 부동산관리자 셸 (~120줄)
src/app/user_admin/page.tsx          ← 일반관리자 셸 (~110줄)
```

---

## 4. 각 page.tsx의 역할

각 page.tsx는 **레이아웃 셸**만 담당:
- 사이드바 (메뉴 배열 + 테마 색상)
- 상단 헤더 (유저 정보 + 역할 뱃지)
- `React.lazy()` 동적 import + `<Suspense>` 렌더링

```tsx
// 예시: admin/page.tsx 핵심 구조
const DashboardSection = lazy(() => import("@/components/admin/sections/DashboardSection"));
const VacancySection = lazy(() => import("@/components/admin/sections/VacancySection"));

<Suspense fallback={<LoadingSpinner />}>
  {activeMenu === "dashboard" && <DashboardSection theme={theme} role="admin" />}
  {activeMenu === "gongsil" && <VacancySection theme={theme} role="admin" ownerId={adminUserId} />}
</Suspense>
```

---

## 5. 공유 섹션의 role 분기 방식

| 섹션 | admin | realtor | user |
|------|-------|---------|------|
| **Dashboard** | KPI 4개 (회원 포함), 최근 회원 리스트 | KPI 3개, 승인 상태 배너 | KPI 3개 |
| **Vacancy** | 전체 공실 조회, 상태 토글 | 본인 공실만, 상태 토글 | 본인 공실만, 상태 읽기전용 |
| **Article** | ✅ 전용 | 🚧 준비중 | 🚧 준비중 |
| **Board** | ✅ 전용 | 🚧 준비중 | 🚧 준비중 |
| **Member** | ✅ 전용 | ❌ | ❌ |
| **Study** | ✅ 전용 | 🚧 준비중 | 🚧 준비중 |

---

## 6. 성능 효과

| 항목 | Before | After |
|------|--------|-------|
| admin 초기 번들 | 136KB (전체) | ~15KB (셸만) |
| 탭 전환 시 | 이미 로드됨 (낭비) | 해당 섹션만 lazy load |
| 초기 API 호출 | 4개 동시 | 활성 탭만 |
| State 수 (page.tsx) | 30+ | 3개 |
| 코드 중복 | 80~90% | 0% |

---

## 7. 향후 확장 가이드

### 부동산관리자 전용 기능 추가 시
```
src/components/admin/sections/
├── StaffSection.tsx        ← 소속 직원 관리 🆕
├── HomepageSection.tsx     ← 자사 홈페이지 관리 🆕
```

`realty_admin/page.tsx`의 메뉴 배열에 추가하고 lazy import만 하면 됨.
`admin`이나 `user_admin`에는 **영향 0**.

### 새로운 공유 섹션 추가 시
1. `sections/` 폴더에 `XxxSection.tsx` 생성
2. `AdminSectionProps` 상속, `theme` prop 사용
3. 필요한 page.tsx에서 `lazy(() => import(...))` 추가

---

## 8. 빌드 검증

- `npx next build` → **Exit code 0** ✅
- TypeScript 에러 없음 ✅

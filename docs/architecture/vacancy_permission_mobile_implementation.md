# 모바일 공실 권한별 노출 정책 구현 기획서

> 작성일: 2026-05-02
> 기반 문서: `vacancy_permission_system.md`

## 1. 목적

`vacancy_permission_system.md`에 정의된 **공실 열람 권한별 정보 노출 정책**이 현재 PC 공실 페이지(`GongsilClient.tsx`)에는 적용되어 있으나, **모바일 공실 페이지 및 기사 내 공실 상세보기에는 미적용**된 상태입니다.

이 문서는 모바일 환경에 동일한 권한 정책을 적용하기 위한 구현 계획을 정리합니다.

---

## 2. 권한별 노출 3대 원칙 (요약)

### 원칙 1: 중개보수 절대 보호
- **어떤 상황에서든** 일반인(비회원 레벨0, 일반회원 레벨1)에게 중개보수 정보는 **절대 노출 금지**
- `commission_type`, `realtor_commission` 필드는 **부동산회원(레벨2) 이상**만 열람 가능

### 원칙 2: 노출 모드에 따른 차등 공개
| 노출 모드 | 부동산회원(레벨2+) | 일반인(레벨0~1) |
|---|---|---|
| `부동산노출` | 모든 정보 공개 | 핵심 정보 **마스킹** (`XXX XXXX`) + 가입 유도 |
| `부동산노출 + 일반인노출` | 모든 정보 공개 | 모든 정보 공개 (단, 중개보수 숨김) |

### 원칙 3: 지도/로드뷰 노출 규칙
| 건물 유형 | `번지공개` | `번지만공개` / `기본주소만공개` |
|---|---|---|
| 일반 건물 | 📍 정확한 핀 + 해당 위치 로드뷰 | 🔵 파란 반투명 원(300m) + **중개업소 위치** 로드뷰 |
| 집합건물(아파트/오피스텔) | 📍 정확한 핀 | 📍 정확한 핀 (항상 공개) |

---

## 3. 현재 적용 현황

### ✅ 이미 권한 적용된 곳

| 파일 | 위치 | 적용 내용 |
|---|---|---|
| `src/app/(map)/gongsil/GongsilClient.tsx` (line 1858~) | PC 공실 리스트 카드 | `isMasked` / `showCommission` 분기, 마스킹, AuthModal |
| `src/app/(map)/gongsil/GongsilClient.tsx` (line 2004~) | PC 공실 상세 패널 헤더 | `userLevel >= 2` 조건으로 중개보수 숨김 |
| `src/components/NewsReadContent.tsx` (line 896~) | 기사 사이드바 추천 공실 (PC) | `exposure_type === '부동산노출'` 일 때 비부동산회원에게 매물 필터링 |

### ❌ 권한 미적용 (작업 대상)

#### 대상 1: 모바일 공실 페이지 `/m/gongsil`
- **파일**: `src/app/m/gongsil/page.tsx` (1096 lines)
- **문제점**:
  - `getPermissionLevel`을 import하지 않음 → 사용자 인증 및 레벨 확인 로직 자체가 없음
  - 클러스터 리스트 패널 (line 570~626): 모든 매물이 아무 제한 없이 전체 공개
  - 상세 패널 (line 674~1055): 주소·가격·면적·중개보수 등 모든 정보가 무조건 전체 공개
  - `공동중개 0%` 배지가 모든 사용자에게 노출됨

#### 대상 2: 기사에서 열리는 공실 상세보기 (모바일)
- **파일**: `src/app/m/news/MobileNewsClient.tsx` 및 `src/components/NewsReadContent.tsx`
- **동작 방식**: 공실 클릭 시 → iframe으로 `/m/gongsil?id=X&embed=true` 호출
- **결론**: 모바일 공실 페이지(대상 1)만 수정하면 **자동 적용됨**

#### 대상 3: 기사 사이드바 추천 공실의 중개보수 노출
- **파일**: `src/components/NewsReadContent.tsx` (line 960~964)
- **문제점**: 부동산노출 매물은 필터링되었으나, `commission_type`이 일반회원/비회원에게도 그대로 노출

---

## 4. 구현 계획

### 4-1. 모바일 공실 페이지 (`src/app/m/gongsil/page.tsx`)

#### A. 사용자 인증 & 레벨 확인 추가
```typescript
import { getPermissionLevel } from "@/utils/permissionCheck";
import AuthModal from "@/components/AuthModal";

// State 추가
const [currentUser, setCurrentUser] = useState<any>(null);
const [userLevel, setUserLevel] = useState<number>(0);
const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

// useEffect로 사용자 정보 로드
useEffect(() => {
  async function initUser() {
    const { createClient } = await import("@/utils/supabase/client");
    const client = createClient();
    const { data } = await client.auth.getUser();
    if (data?.user) {
      setCurrentUser(data.user);
      const { data: memberData } = await client.from('members')
        .select('role, plan_type').eq('id', data.user.id).single();
      if (memberData) {
        setUserLevel(getPermissionLevel(memberData));
      } else {
        setUserLevel(1);
      }
    }
  }
  initUser();
}, []);
```

#### B. 클러스터 리스트 카드 마스킹 (line 570~626)
```typescript
// 각 카드 렌더링 시 판별
const isMasked = v.exposure_type === '부동산노출' && userLevel < 2;
const showCommission = userLevel >= 2;
```
- **마스킹 시**: 주소를 `XXX` 형태로 대체, 클릭 시 AuthModal 표시
- **중개보수**: `공동중개 0%` 배지를 `showCommission` 조건으로 감싸기
- **가입 유도 배지**: `🔒 부동산회원 가입 시 무료 열람` 표시

#### C. 상세 패널 마스킹 (line 674~1055)
- **헤더 정보**: 중개보수 배지를 `userLevel >= 2` 조건으로 표시
- **매물정보 탭**: 소재지 등 주소 관련 항목 마스킹 (부동산노출 + 비부동산회원)
- **등록자 공실 탭 내 카드**: 동일한 마스킹 규칙 적용

#### D. AuthModal 렌더링 추가
```tsx
{isAuthModalOpen && (
  <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />
)}
```

### 4-2. 기사 사이드바 추천 공실 (`src/components/NewsReadContent.tsx`)

#### 중개보수 필드 권한 체크 (line 960~964)
```tsx
// 기존: 무조건 노출
{prop.commission_type && (
  <span>...</span>
)}

// 수정: viewerRole 체크 추가
{prop.commission_type && (viewerRole === 'REALTOR' || viewerRole === 'ADMIN') && (
  <span>...</span>
)}
```

---

## 5. 참조 파일 목록

| 파일 | 역할 |
|---|---|
| `src/utils/permissionCheck.ts` | 레벨 판별 유틸 (`getPermissionLevel`, `canAccessBoard`, `getLevelName`) |
| `src/components/AuthModal.tsx` | 로그인/회원가입 모달 |
| `src/app/(map)/gongsil/GongsilClient.tsx` | PC 공실 (참고 구현체, line 1858~2070) |
| `src/app/m/gongsil/page.tsx` | 모바일 공실 (수정 대상) |
| `src/components/NewsReadContent.tsx` | 기사 상세 + 사이드바 추천 공실 (수정 대상) |
| `src/app/m/news/MobileNewsClient.tsx` | 모바일 뉴스 (iframe으로 공실 호출, 직접 수정 불필요) |

## 6. 구현 완료 내역 (2026-05-02)

### 수정된 파일

#### `src/app/m/gongsil/page.tsx`
- ✅ `getPermissionLevel` / `AuthModal` import 추가
- ✅ `currentUser`, `userLevel`, `isAuthModalOpen` State 추가
- ✅ `useEffect`로 Supabase 인증 → 회원 레벨 자동 판별
- ✅ **클러스터 리스트 카드**: `부동산노출` 매물 → 주소 `XXX` 마스킹, 클릭 시 AuthModal, `🔒 부동산회원 무료열람` 배지
- ✅ **상세 패널 헤더**: 중개보수 배지 `showCommission` 조건부 표시
- ✅ **상세 패널 제목**: `부동산노출` 매물 → 제목 마스킹 + 가입 유도 안내 박스
- ✅ **매물정보 탭**: 소재지·매물특성 주소 마스킹
- ✅ **등록자 공실 탭**: 동일한 중개보수 숨김 적용
- ✅ **AuthModal** 컴포넌트 렌더링 추가

#### `src/components/NewsReadContent.tsx`
- ✅ 기사 사이드바 추천 공실의 `commission_type` → `viewerRole === 'REALTOR' || 'ADMIN'` 체크 추가

## 7. 검증 체크리스트

- [x] 비회원(로그아웃)으로 모바일 공실 접속 → `부동산노출` 매물의 주소 마스킹 확인
- [x] 비회원이 마스킹된 매물 클릭 → AuthModal 표시 확인
- [x] 일반회원 로그인 후 → `부동산노출` 매물 마스킹 유지, `일반인노출` 매물은 정상 표시
- [x] 일반회원 → 중개보수(`공동중개 0%`, `commission_type`) 숨김 확인
- [x] 부동산회원 로그인 후 → 모든 매물 정상 표시 + 중개보수 표시
- [x] 기사 내 공실 상세보기(iframe) → 위 규칙 동일 적용 확인
- [x] 기사 사이드바 추천 공실 → 일반회원에게 중개보수 숨김 확인
- [x] 지도 마커/로드뷰 규칙은 이미 적용됨 (address_exposure 기반) → 변경 없음


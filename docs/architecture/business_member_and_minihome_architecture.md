# 비즈니스 회원 및 미니홈피 아키텍처 (Business Member & Mini-homepage Architecture)

## 1. 개요 (Overview)
본 문서는 공실뉴스 플랫폼에서 일반 회원을 대상으로 유료 비즈니스 기능을 제공하고, 유료 결제 회원(부동산 및 비즈니스)에게 '미니홈피' 기능을 부여하기 위한 구조 설계도입니다.

- **목표:** 일반회원을 '비즈니스회원'으로 승급(유료)시켜 업체 홍보 기회를 제공하고, 기존 유료 부동산회원과 동등한 혜택(미니홈피)을 부여하여 플랫폼 수익화(BM)를 강화합니다.

## 2. 회원 등급 (Role) 및 요금제 (Plan) 확장
기존의 회원 역할을 확장하여 **비즈니스회원(BIZ)** 역할을 신설합니다.

### 2.1 역할(Role) 정의
- `USER` (일반회원): 기본 회원. 추가 정보 없음.
- `REALTOR` (부동산회원): 중개업소. `agencies` 데이터와 연결. (중개업등록증 필수)
- `BIZ` (비즈니스회원) **[신설]**: 일반 업체. `business_profiles` 데이터와 연결. (사업자등록증 필수)
- `ADMIN` (최고관리자): 시스템 관리자.

### 2.2 요금제(Plan Type) 적용
미니홈피 접근 권한 및 유료 기능은 아래의 `plan_type`을 기준으로 제어됩니다.

- **부동산회원 (`REALTOR`)**
  - `free`: 무료부동산 (미니홈피 미제공)
  - `news_premium`: 공실뉴스부동산 (미니홈피 제공)
  - `vacancy_premium`: 공실등록부동산 (미니홈피 제공)
- **비즈니스회원 (`BIZ`)**
  - `biz_premium` **[신설]**: 유료 비즈니스회원 (미니홈피 제공)

## 3. 사용자 가입 및 승인 흐름 (User Flow)

1. **전환 신청:** 일반회원이 마이페이지 또는 회원정보 수정 화면에서 `[비즈니스회원 전환 신청]` 버튼 클릭.
2. **정보 입력:** '비즈니스정보' 탭이 활성화되며 필수 업체 정보 입력.
   - 필수 항목: 상호명, 대표자명, 연락처, 소재지, 사업자등록번호, 사업자등록증 사본, 업체 소개글.
   - *참고: 부동산회원과 달리 '중개사무소 등록번호' 및 '중개사무소 등록증'은 요구하지 않음.*
3. **승인 대기:** 정보를 제출하면 상태가 `PENDING`(승인대기)으로 변경.
4. **관리자 승인:** 관리자가 결제(입금) 내역 확인 후 상태를 `APPROVED`(정상승인)로 변경하고, `plan_type`을 `biz_premium`으로 설정.

## 4. 미니홈피 권한 제어 로직 (Feature Gating)

미니홈피(예: `/biz/[업체고유ID]`) 페이지 렌더링 시 서버/클라이언트 단에서 다음 조건을 검사합니다.

```typescript
// 미니홈피 접근 가능 여부 판별 로직 (예시)
const canAccessMiniHome = (userRole: string, planType: string, status: string) => {
  // 1. 업체/부동산 승인이 완료되었는가?
  if (status !== 'APPROVED') return false;

  // 2. 권한 및 요금제 검사
  if (userRole === 'REALTOR' && (planType === 'news_premium' || planType === 'vacancy_premium')) {
    return true; // 유료 부동산회원 허용
  }
  if (userRole === 'BIZ' && planType === 'biz_premium') {
    return true; // 유료 비즈니스회원 허용
  }

  return false; // 그 외 (무료회원 등) 차단
}
```

## 5. 데이터베이스(Supabase) 설계

비즈니스 회원들의 정보를 저장하기 위해 기존 `agencies` 테이블과 분리된 (혹은 통합된) 데이터 구조가 필요합니다. 

**신규 테이블 제안: `business_profiles`**
- `id` (uuid, PK)
- `user_id` (uuid, FK to users.id)
- `company_name` (text, 상호명)
- `ceo_name` (text, 대표자명)
- `business_type` (text, 업종/카테고리 - 예: 인테리어, 청소, 이사, 법무사 등)
- `contact_number` (text, 연락처)
- `address` (text, 주소)
- `biz_num` (text, 사업자등록번호)
- `biz_cert_url` (text, 사업자등록증 사본 URL)
- `description` (text, 소개글)
- `logo_url` (text, 로고 이미지)
- `status` (text, PENDING | APPROVED | REJECTED)
- `created_at` (timestamp)
- `updated_at` (timestamp)

*(대안: 기존 `agencies` 테이블에 `type: 'REALTOR' | 'BIZ'` 컬럼을 추가하고 중개업등록증 관련 필드를 nullable로 처리하여 함께 관리할 수도 있습니다.)*

## 6. 구현 단계 (Action Plan)

1. **[DB 작업]** ✅ 완료 - Supabase에 `business_profiles` 테이블 생성 (`sql/create_business_profiles.sql`).
2. **[API/Actions]** ✅ 완료 - `adminUpdateBusinessProfile`, `adminApproveBusinessApplication`, `adminRejectBusinessApplication` 함수 구현 (`src/app/admin/actions.ts`).
3. **[UI/컴포넌트]** ✅ 완료 - `MemberRegisterForm.tsx`에 `BIZ` 역할 선택, '비즈니스정보' 탭 폼, 요금제 표시 추가.
4. **[관리자 페이지]** ✅ 완료 - `MemberSection.tsx`에 비즈니스 회원 상태 계산, 필터, 승인/반려 버튼, 반려 모달 분기 처리 추가.
5. **[미니홈피 페이지]** ✅ 완료 - `/biz/[id]` 라우트, `BizPageClient.tsx` 미니홈피 UI, `businessProfile.ts` 공개 API 구현.

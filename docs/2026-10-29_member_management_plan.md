# 회원관리 정리 계획서 — 등급과 공실마케팅 이용권 나누기 (2026-10-29)

## 0. 결정 · 한 일 (2026-10-29, 사장님 "그렇게 작업해줘")

- 이용권 Pro · Studio 두 개 확정. 기존 유료 3명(김동현·금현민·문호준) → **Studio**, 남은 기간 그대로. Business = 비즈니스회원 + Studio 포함.
- Studio 1년 금액은 아직 없음. 스마트스토어 상품은 지금 것(1년 36만, GS-STUDY-1Y) = **Pro 1년**. Studio 상품은 사장님이 만든 뒤 연결.
- **새 칸을 만들지 않았다.** 아래 3-②의 `studio_plan` 대신 등급 값(plan_type)의 유료 자리 둘을 쓴다: `news_premium` = Pro, `study_premium` = Studio. 등급 정책(point_settings)·한도 함수(20261002)에 이미 두 벌(REALTOR_NEWS · REALTOR_STUDY)이 있어서 SQL 실행 없이 끝난다.
- 판단 한 곳: src/utils/permissionCheck.ts `studioPlan()` · `STUDIO_PLAN_TYPE` · `STUDIO_PLAN_LABEL`.
- 데이터 (운영 DB 바로 적용): 3명 plan_type → study_premium · 등급 정책 Studio 공실 한도 50 · 회원별 한도 안 쓰는 2명(김동현·문호준) max_vacancies 20 → 50. 금현민은 회원별 한도(50) 그대로.
- 회원관리: 회원수정에 이용권 종류(Pro / Studio) 고르기 · 목록 이용기간 칸에 "Studio ~날짜" · 등급 정책 표에 "공실뉴스부동산 + Pro" / "+ Studio" 두 줄 · 모바일 회원 화면.
- 스마트스토어: Studio 이용 중인 회원이 Pro 상품을 사면 자동으로 낮추지 않고 관리자 확인으로 넘긴다.
- 물건접수홈페이지 = 공실마케팅 Pro · Studio 이용 중인 회원만 (사장님 같은 날). 비즈니스회원(Studio 포함)·최고관리자는 그대로. 판단은 src/utils/planCheck.ts `canUseHomepage` (손님 페이지·미들웨어 같이). 무료 회원은 편집기에서 꾸밀 수는 있고 "Pro · Studio 회원 전용" 안내. 등급 정책 기본값 무료 홈페이지 0 (코드).
- **안 한 것:** 영상·이미지 편집을 Studio 전용으로 잠그기 — 유료·무료 기능 나누기는 아직 미정이라 지금은 두 이용권 모두 같은 기능, 차이는 공실 등록 한도(20 / 50)뿐.

## 1. 왜 정리하나

- 화면·코드에 **회원 등급**과 **돈 내고 쓰는 이용권**이 섞여 있다.
- 코드의 이용권은 "이용 기간 안이면 유료" **한 가지**뿐인데, 금액안내 화면(2026-10-28, 더미)은 **Free · Pro 월 3만 · Studio 월 5만 · Business 월 10만** 4단이다. Pro 와 Studio 를 구별할 칸이 데이터베이스에 없다.
- "비즈니스회원"은 등급(BIZ)인데, 금액안내의 Business 월 10만은 이용권처럼 보인다.
- 이름이 여러 번 바뀌었다 (무료부동산 → 공실뉴스부동산, 공실스튜디오 → 공실마케팅, Studio 마크). 코드 이름과 화면 이름이 섞여 있다.

## 2. 지금 상태 (2026-10-29 데이터베이스 확인, 총 18명)

| 저장된 값 (role + plan_type) | 화면 이름 | 인원 |
|---|---|---|
| USER + free | 일반회원 | 11 |
| REALTOR + free (서류 승인) | 공실뉴스부동산 | 2 |
| REALTOR + news_premium, studio_end_date 기간 안 | 공실뉴스부동산 + `Studio` 마크 | 3 |
| BIZ + biz_premium | 비즈니스회원 | 1 |
| ADMIN + free | 최고관리자 | 1 |

이미 된 것 (2026-10-26 계획서 docs/2026-10-26_studio_membership_plan.md):
- 승인된 중개사는 모두 무료 "공실뉴스부동산"으로 보인다 (src/utils/permissionCheck.ts `getPlanLabel`).
- 유료는 `members.studio_start_date` · `studio_end_date` 로 따로 저장 (supabase/migrations/20261026_studio_membership.sql). 유료 3명 기간 옮김.
- `isStudioMember` (permissionCheck.ts) · 이름표 옆 Studio 마크 (src/components/StudioMark.tsx).
- planCheck · extensionMember · lectureAccess · smartstoreSync · admin/actions 는 studio_end_date 를 읽는다. 옮기는 동안이라 news_premium 값도 같이 본다.

## 3. 권고안 — "누구인가"와 "무엇을 샀나"를 나눈다

### ① 등급 = 누구인가 (돈과 상관없음)

| 등급 | 조건 |
|---|---|
| 일반회원 | 가입만 |
| 공실뉴스부동산 | 중개사 서류 승인 · 무료 |
| 비즈니스회원 | 법인·기관 |
| 최고관리자 | 운영자 |

### ② 공실마케팅 이용권 = 무엇을 샀나 (기간 있음)

| 이용권 | 금액 | 내용 (금액안내 화면 기준) |
|---|---|---|
| 없음 (Free) | — | 기본 |
| Pro | 월 3만 | 공실 20건 |
| Studio | 월 5만 | 공실 50건 + 영상 편집·이미지 편집 |

- 데이터베이스: 지금의 이용 기간 칸 옆에 **`members.studio_plan` (pro / studio) 칸 하나만 더** 만든다.
- 판단은 한 곳에서: `isStudioMember(member)` (기간 안인가) + `studioPlan(member)` (pro / studio / null).

### ③ Business 월 10만

- 이용권 종류로 만들지 않고 **비즈니스회원 등급 + Studio 이용권 포함** 묶음으로 둔다. 이용권 종류는 두 개로 끝난다.

### ④ 회원별 개별설정은 지금 그대로 맨 위

- 회원수정 화면의 한도 직접 지정 · 블로그·SNS 월 횟수 · 물건접수홈페이지 권한 등은 등급·이용권 기본값보다 먼저다.
- 같은 화면에서 이용권 종류와 기간을 관리자가 직접 켜기·늘리기·끄기 (결제 없이).

## 4. 정할 것 (사장님)

| # | 정할 것 | 권고 |
|---|---|---|
| 1 | 이용권을 Pro · Studio 두 개로 확정하나 | 확정 |
| 2 | 기존 유료 3명은 어느 이용권으로 | Studio, 남은 기간 그대로 (먼저 낸 분들이라 기능을 줄이지 않음) |
| 3 | Business 를 "비즈니스회원 + Studio 포함" 묶음으로 하나 | 그렇게 |
| 4 | 스마트스토어 상품 | Pro 월·1년, Studio 월·1년 4개. Business 는 직접 계약 |
| 5 | 1년 금액 | 아직 없음 — 2026-10-26 에는 월 3만 · 1년 36만만 정함. Studio 1년 금액은 사장님이 정함 |

2026-10-26 계획서 4번의 아직 정할 것(서류 승인 유지, 체험 횟수, 영상뉴스 맛보기, 기사 월 건수, 서버 AI 사용량)도 그대로 남아 있다.

## 5. 고칠 곳 (정해진 뒤)

**데이터베이스 (마이그레이션 하나)**
- `members.studio_plan` 칸 추가
- 유료 3명에 정해진 이용권 값 넣기
- 등록 한도 함수: Pro 는 공실 20 · Studio 는 50 (관리자 등급 정책 화면의 숫자와 맞춤)

**코드**
- src/utils/permissionCheck.ts — `studioPlan()` 추가, 이름표 마크를 Pro / Studio 로
- src/utils/planCheck.ts · src/utils/extensionMember.ts · src/utils/studioUsage.ts — 영상·이미지 편집은 Studio 부터
- src/lib/smartstoreSync.ts — 상품별로 이용권 종류와 기간 늘리기, 취소되면 되돌리기
- 회원관리 (MemberSection · MemberRegisterForm · 모바일 회원 화면) — 이용권 종류 칸, 목록에 Pro / Studio 표시
- src/components/studio-site/StudioPriceTable.tsx — 더미를 실제 값으로
- 다 옮긴 뒤 news_premium 을 같이 보는 옛 판단 지우기

## 6. 순서

1. 4번 정하기 (사장님)
2. 데이터베이스 칸 추가 + 3명 값 넣기 (사장님 확인 뒤)
3. `studioPlan()` 한 곳 만들고 권한 판단 바꾸기
4. 회원관리 화면 · 이름표
5. 스마트스토어 상품 연동
6. 금액안내 화면 실제 값으로

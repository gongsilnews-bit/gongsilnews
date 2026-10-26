# 공실뉴스부동산 무료 · 공실스튜디오 멤버십(Studio 마크) 계획서 (2026-10-26)

## 1. 결정한 것 (사장님, 2026-10-26 전략회의)

- **공실뉴스부동산 = 무료.** 지금의 "무료부동산"(서류 승인된 중개사)이 이 이름이 된다.
  - 열람 무료 · 공실등록 3건 · 기사등록 월 4건 (내 지역/단지 정보)
  - 공실을 등록하면 체험: 블로그/SNS 자동발행 3건 · AI 매물보고서 3건
- **공실스튜디오 멤버십 = 월 3만원 · 1년 36만원.**
  - 공실등록 20건 · 공실스튜디오 모든 프로그램
  - 등급이 아니라 **이용권**이다. 이름표 옆에 **Studio 마크**가 붙는다 (예: 공실뉴스부동산 `Studio`)
  - 나중에 비즈니스회원도 이용권을 사면 Studio 마크가 붙는다
- 이용권은 회원 정보에 **"공실스튜디오 이용 기간" 칸을 새로 만들어** 등급과 따로 저장한다 (안 1)
- 부동산특강 = 포인트 결제
- 웹 관리 화면: 이용권 없으면 예전 아이콘 메뉴 + [공실스튜디오] 소개 칸, 이용권 있으면 바뀐 화면. 앱은 누구나 바뀐 화면
- 소개 페이지 gongsilnews.com/studio (첫 판 있음, 디자인 의뢰서 design/studio/brief.md)

## 2. 등급과 이용권

| 저장된 등급 (role + plan_type) | 지금 이름 | 바뀐 이름 |
|---|---|---|
| USER | 일반회원 | 일반회원 |
| REALTOR + free (서류 승인) | 무료부동산 | **공실뉴스부동산** |
| REALTOR + news_premium | 공실뉴스부동산(유료) | 공실뉴스부동산 + **Studio** |
| BIZ + biz_premium | 비즈니스회원 | 비즈니스회원 (이용권 사면 + Studio) |
| ADMIN | 최고관리자 | 최고관리자 |

- 새 칸: `members.studio_start_date`, `members.studio_end_date` (기간 안이면 이용 중)
- "이용 중" 판단은 한 곳에: `isStudioMember(member)` = studio_end_date 가 오늘 이후. 옮기는 동안은 예전 값(news_premium·study_premium 기간 안)도 이용 중으로 읽는다
- 유료 회원 3명(news_premium)은 plan_end_date 를 studio_end_date 로 옮긴다. 남은 기간 그대로

## 3. 고칠 곳

**데이터베이스 (마이그레이션 하나)**
- members 에 studio_start_date · studio_end_date 칸 추가
- 등록 한도 함수(20261002): news_premium 대신 "이용 중이면 realtor_news 한도"
- 중복 사무소 막기 트리거(20261004·20261013), 강의 등록 권한(20260928): 유료 판단에 이용 중 포함
- 유료 3명 기간 옮기기

**코드 — 유료 판단을 isStudioMember 로**
- src/utils/permissionCheck.ts (이름표·게시판 레벨·admin 버튼) — 이름표 + Studio 마크
- src/utils/planCheck.ts · src/utils/extensionMember.ts (크롬 확장 블로그·유튜브·리모델링)
- src/utils/lectureAccess.ts · src/utils/lectureQuota.ts (강의 무료·강의 올리기)
- src/utils/studioUsage.ts (블로그·SNS·AI 이미지 횟수, 무료 체험 3건)
- src/app/admin/actions.ts (등급별 기본 한도, 유료 사무소)
- src/app/realty_admin/page.tsx (paidOnWeb → 이용 중)
- src/lib/smartstoreSync.ts — 결제되면 등급이 아니라 studio_end_date 를 늘린다. 취소되면 되돌린다
- 회원관리(MemberRegisterForm·MemberSection·모바일 회원 화면) — "공실스튜디오 이용 기간" 칸, 목록에 Studio 표시
- 헤더 이름표 5곳(Header·StudyHeader·NewsrealtyHeader·MapTopAuthButtons·realty_admin) — Studio 마크
- 오른쪽 위 버튼: 일반회원 [공실뉴스부동산 가입 ›], 공실뉴스부동산 [공실스튜디오 ›]
- 공실뉴스부동산 페이지(/newsrealty) 문구: "내 지역/단지 공실을 뉴스로 전달하세요 · 1주일에 1번 영상뉴스로", 제작 기능 설명은 /studio 로

**회원별 개별설정은 지금과 같이 (사장님, 2026-10-26)**
- 회원수정 화면의 개별설정을 그대로 둔다: 공실·기사·강의 한도 직접 지정(등급 일괄 적용에서 빼기), 스튜디오 블로그·SNS 월 횟수, 물건접수홈페이지 권한 등
- 개별설정이 있으면 등급·이용권 기본값보다 **개별설정이 먼저**다 (지금 규칙 그대로)
- 여기에 "공실스튜디오 이용 기간"(시작·끝)을 같은 화면에서 회원마다 넣고 고칠 수 있게 더한다 — 결제 없이 관리자가 직접 켜 주기·늘려 주기·끄기

**관리자 화면에서 숫자만 바꾸면 되는 것** (코드 아님, 회원관리 → 등급 정책)
- 부동산회원(무료) 공실 3 · 기사 월 4, 공실뉴스부동산(유료) 칸 = 멤버십 공실 20

## 4. 아직 정할 것

1. 공실뉴스부동산이 되려면 중개사 서류 승인을 그대로 받나 (권고: 유지)
2. 체험 3건은 매월인가, 처음 한 번인가 (권고: 매월 — 지금 코드가 매월 3회로 셈)
3. 영상뉴스 1건 맛보기를 넣나 (권고: 넣기)
4. 멤버십 기사등록 월 몇 건 (지금 유료 기본값 월 4건 = 무료와 같음)
5. 멤버십 AI 사용량을 공실뉴스 키로 포함하나 (권고: 포함 + 월 한도) — "스튜디오는 서버 Gemini 안 씀" 결정을 바꾸는 일
6. 스마트스토어 상품: 월 3만원 · 1년 36만원 두 개 만들기 (사장님)

## 5. 순서

1. 데이터베이스 칸 추가 + 3명 기간 옮기기 (사장님 확인 뒤)
2. isStudioMember 한 곳 만들고 유료 판단을 모두 바꾸기
3. 이름표 · Studio 마크 · 오른쪽 위 버튼
4. 회원관리 화면 이용 기간 칸
5. 스마트스토어 연동
6. /newsrealty · /studio 문구

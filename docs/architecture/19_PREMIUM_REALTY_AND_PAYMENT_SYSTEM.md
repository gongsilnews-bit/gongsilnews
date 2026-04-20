# 19. 프리미엄 부동산 회원 및 자동 결제 시스템 아키텍처

## 1. 개요 (Overview)
기존 공실뉴스 시스템의 수익성 극대화 및 기업형(B2B) 부동산 서비스 강화를 위해 **유료 구독형 부동산 회원(Premium Realty)** 제도를 도입합니다. 새로운 권한(Role) 종류를 생성하지 않고, 기존 권한(`REALTY`) 내에서 구독 만료일(`premium_until`)을 통한 이용권 기반(Status-driven) 시스템을 구축하여 확장성과 유지보수성을 극대화합니다.

## 2. 유료 회원 주요 혜택 및 기능 요구사항
1. **공실 등록 무제한 자유화**: 무료 회원의 제한(예: 5개)을 해제하고 무제한 매물 등록 권한 부여.
2. **기사 작성 권한 (월 4건 제한)**: 당월 1일부터 조회 시점까지 작성된 기사 수를 동적으로 카운팅하여 제한.
3. **프리미엄 자료실(드론 영상 등) 전면 개방**: 드론 영상 게시판 내의 구글 드라이브 다운로드 버튼 활성화.
4. **부동산 전용 미니 홈페이지 제공 예정**: `gongsilnews.com/realty/[상호명]` 형식의 독립적인 홍보 채널 구축(추후 별도 작업).

## 3. 데이터베이스(Supabase) 설계

### 3.1. `members` (유저 테이블) 스키마 변경
- **추가 필드**: `premium_until` (TIMESTAMP / Date)
- **로직**: 유저 활동 제어 시, `members` 테이블을 조회하여 `curr_time <= premium_until` 일 경우 유료 회원(프리미엄)으로 간주합니다. 이 기간이 만료 시 시스템은 별도 처리 없이 즉시 사용자를 일반 무료 회원 규칙으로 취급하게 됩니다.

### 3.2. `payment_history` (결제 내역 테이블) 신설
- id (UUID, PK)
- user_id (UUID, FK -> members)
- amount (Integer, 결제 금액)
- payment_method (String, "CARD", "VBANK", "POINT")
- pg_transaction_id (String, PG사 승인 번호)
- status (String, "PENDING", "SUCCESS", "FAILED")
- created_at (TIMESTAMP)

## 4. 백엔드 결제 자동화 연동 아키텍처 (Toss Payments 등)
결제 대행사(PG사)의 Webhook 기능을 적극 활용한 100% 비동기 자동화 방식으로 구축합니다.

### 4.1. 카드 결제 플로우
1. 사용자가 클라이언트(Web)에서 PG사의 팝업창을 띄워 결제를 완료합니다.
2. PG사 측에서 공실뉴스 백엔드 서버(`/api/payments/webhook`)에 백그라운드로 성공 여부를 쏩니다.
3. 웹훅 서버(Server Action/Route Handler)가 호출되면 변조 방지 서명을 검증합니다.
4. 검증 완료 후 `members` 테이블에서 해당 유저의 `premium_until`을 업데이트하고 영수증을 발급합니다.
5. 유저는 클라이언트에서 새로고침 시 즉시 프리미엄 권한을 얻습니다.

### 4.2. 현금(가상계좌) 결제 플로우
1. 결제 시 유저 전용 익명 가상계좌 채번.
2. 유저가 무통장 입금 완료 시 은행 → PG사 → 공실뉴스 웹훅(`/api/payments/webhook`) 순으로 입금 확인 핑(Ping)이 전달됨.
3. 위 카드 결제 처리 프로세스(3, 4번)와 동일하게 가동되어 새벽 3시에 입금해도 즉시 자동 권한 부여됩니다.

## 5. 단계별 론칭 계획
- **Phase 1**: PG사 가입(사업자 명의) 심사 진행. 
- **Phase 2**: 클라이언트 결제 UI 개발 및 Supabase `payment_history`, `premium_until` 테이블 스키마 구성.
- **Phase 3**: 웹훅(Webhook) API 및 프리미엄 회원 전용 기능(무제한 등록, 기사 제한 쿼터 로직) 연동.
- **Phase 4**: 부동산 개인 홈페이지(Dedicated page) 라우팅 처리.

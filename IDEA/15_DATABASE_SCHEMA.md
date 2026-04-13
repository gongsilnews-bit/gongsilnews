# 📋 Supabase Database & Storage 정리 (MD 15)

지금까지 프로젝트에서 구성되고 사용된 주요 Supabase Data 구조 및 파일 스토리지 계층을 정리한 문서입니다.

---

## 🗄️ Database Tables

### 1. `members` (일반회원 및 관리자)
- `id` (uuid, PK) : Supabase Auth UID와 1:1 매핑
- `email` (text) : 이메일
- `name` (text) : 이름 또는 닉네임
- `role` (text) : 계정 권한 (`USER`, `REALTY`, `ADMIN` 등)
- `point_balance` (integer) : 💰 [포인트 제도] 보유 포인트 잔액 (기본 0)
- `is_deleted` (boolean) : 회원 기본 탈퇴 여부
- `created_at` / `updated_at` (timestamp)

### 2. `agencies` (중개업소 / 전문가 회원)
- `id` (uuid, PK)
- `owner_id` (uuid, FK) : `members.id` 참조
- `status` (text) : 비즈니스 승인 상태 (`PENDING`, `APPROVED`, `REJECTED`)
- `lat` / `lng` (float8) : 중개소 위도 및 경도 (DB와 상태 관리)
- `address` (text) : 주소
- `created_at` / `updated_at` (timestamp)

### 3. `articles` (뉴스 / 칼럼 포스트)
기사 생태계의 핵심으로 가장 많은 컬럼을 사용합니다.
- `id` (uuid, PK)
- `article_no` (integer/serial) : URL 표시용 고유 번호
- `author_id` (uuid, FK) : 작성자 (`members.id`)
- `author_name` / `author_email` (text) : 표시용 작성자 정보
- `status` (text) : 상태 (`DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `DELETED`)
- `form_type` (text) : 형식 정규화 (`NORMAL`, `CARD_NEWS`, `GALLERY`)
- `section1` / `section2` / `series` (text) : 카테고리
- `title` / `subtitle` (text) : 메인 제목 및 서브 박스 제목
- `content` (text) : 에디터 HTML 본문
- `youtube_url` (text) / `is_shorts` (boolean) : 유튜브 비디오 연동
- `lat` / `lng` / `location_name` (float8 / text) : "우리동네 뉴스" 지도 위치 연동 용도
- `view_count` (integer) : 사이트뷰 조회수 통계
- `published_at` (timestamp, nullable) : 배포시간 설정
- `reject_reason` (text, nullable) : 관리자 반송 사유 
- `created_at` / `updated_at` (timestamp)

### 4. `article_keywords` (기사 검색 및 분류용 해시태그)
- `id` (uuid, PK)
- `article_id` (uuid, FK) : `articles.id` 참조
- `keyword` (text)

### 5. `article_media` (기사에 귀속된 미디어 파일)
- `id` (uuid, PK)
- `article_id` (uuid, FK)
- `media_type` (text) : 이미지/비디오 형태
- `url` (text) : 외부 연결 파일 링크

### 6. `boards` / `board_posts` / `board_comments` / `board_attachments`
커뮤니티 및 게시판 인프라를 위한 시스템.
- `board_posts.price_points` (integer) : 💰 [포인트 제도] 다운로드/열람에 필요한 포인트 (기본 0)
- (각각 설정, 게시글 본문, 계층 댓글, 첨부파일 테이블 참조)

### 7. `point_transactions` (💰 포인트 거래 장부 - 신규 도입 예정)
포인트의 취득, 소비, 송금을 투명하게 추적하기 위한 원장(Ledger)입니다.
- `id` (uuid, PK)
- `member_id` (uuid, FK) : 내역 대상 회원 (`members.id`)
- `amount` (integer) : 금액 증감 (+/-)
- `transaction_type` (text) : 내역 분류 (`UPLOAD_REWARD`, `BUY_MATERIAL`, `SELL_MATERIAL`, `P2P_SEND`, `P2P_RECEIVE`, `ADMIN_ADJUST`)
- `description` (text) : 상세 기록 (예: "드론 영상 다운로드 결제")
- `related_entity_id` (uuid, nullable) : 게시물이나 특강 등의 ID 연결용
- `created_at` (timestamp)

### 8. `user_purchases` (💰 콘텐츠 구매 영수증 - 신규 도입 예정)
회원이 한 번 포인트를 주고 구매한 자료/특강을 중복 결제하지 않고 재열람할 수 있도록 증명하는 영수증 테이블입니다.
- `id` (uuid, PK)
- `buyer_id` (uuid, FK) : 결제한 회원 (`members.id`)
- `content_type` (text) : 콘텐츠 종류 (`BOARD_POST`, `STUDY_LECTURE`)
- `content_id` (uuid) : 콘텐츠 고유 ID
- `price_paid` (integer) : 소모한 포인트 양
- `created_at` (timestamp)

---

## ☁️ Storage Buckets (이미지폴더)

### 1. `agency_documents`
- **설명**: 회원가입 시 중개사명함 교부 및 증빙 서류 업로드 버킷
- **경로 예시**: `{memberId}/business_license.png`

### 2. `news_images` (또는 `article_media`)
- **설명**: 기사 텍스트 에디터에서 업로드되거나 삽입된 미디어 이미지 파일 버킷

> *💡 이 문서는 테이블 추적이 필요한 경우 신속한 참조용으로 작성되었습니다.*

---

## 🎯 [논의 필요] 포인트 경제 생태계 (Point Economy) 비즈니스 정책 주요 안건

시스템 코드 구현에 앞서 확정되어야 할 주요 정책(Business Rule)입니다.

### 1. 포인트 가격 결정 및 경제 통제 모델
- **자율제 (Free Market):** 자료를 업로드하는 회원이 `이 자료는 500P`라고 자유롭게 가격을 책정. 양질의 콘텐츠 생산을 독려할 수 있음.
- **고정제 (Fixed Rate):** 카테고리별로 일괄 고정 포인트(예: 자료실 다운로드는 무조건 100P)를 플랫폼에서 통제.
- **결정 필요 사항:** 업로드 시 가격 입력란 활성화 여부

### 2. 플랫폼 수수료 및 포인트 회수(소각) 정책
- 시중에 포인트가 무한정 생성 및 순환되는 것을 방지하기 위한 소각 모델 고려.
- **예시:** A회원이 B회원 자료를 1,000P로 구매했을 때, 플랫폼이 안전 거래 수수료로 10~20%를 공제하고 B회원에게 800~900P만 지급할 것인지?
- **결정 필요 사항:** 유저 간 거래 시 수수료 차감 비율 (%) 설정

### 3. 초기 포인트 수급 방식 및 어뷰징(Abuse) 차단 전략
- **초기 수급 기획:** 최초 가입 시 마중물 명목의 웰컴 포인트(예: 1,000P)를 지급할 것인가? 혹은 출석 체크 / 게시물 작성 등 활동 보상만으로 획득하게 할 것인가?
- **가짜 계정(다중 계정) 어뷰징 차단:** 
  - 웰컴 포인트를 노리고 무수히 많은 가계정을 만들어 본계정으로 `포인트 선물하기` 또는 `더미 자료 구매`를 통해 포인트를 세탁/몰아주는 행위 방지책 필요.
  - **차단 예시:** 
    1. '포인트 선물하기' 기능은 본인 인증(SMS 등)이 완료된 회원만 가능하도록 제한.
    2. 신규 가입자가 받은 웰컴 포인트는 자료 열람/구매용으로만 쓸 수 있고, 타인에게 송금 불가능하게 룰 적용.

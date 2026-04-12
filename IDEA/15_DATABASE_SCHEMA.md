# 📋 Supabase Database & Storage 정리 (MD 15)

지금까지 프로젝트에서 구성되고 사용된 주요 Supabase Data 구조 및 파일 스토리지 계층을 정리한 문서입니다.

---

## 🗄️ Database Tables

### 1. `members` (일반회원 및 관리자)
- `id` (uuid, PK) : Supabase Auth UID와 1:1 매핑
- `email` (text) : 이메일
- `name` (text) : 이름 또는 닉네임
- `role` (text) : 계정 권한 (`USER`, `REALTY`, `ADMIN` 등)
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
- (각각 설정, 게시글 본문, 계층 댓글, 첨부파일 테이블 참조)

---

## ☁️ Storage Buckets (이미지폴더)

### 1. `agency_documents`
- **설명**: 회원가입 시 중개사명함 교부 및 증빙 서류 업로드 버킷
- **경로 예시**: `{memberId}/business_license.png`

### 2. `news_images` (또는 `article_media`)
- **설명**: 기사 텍스트 에디터에서 업로드되거나 삽입된 미디어 이미지 파일 버킷

> *💡 이 문서는 테이블 추적이 필요한 경우 신속한 참조용으로 작성되었습니다.*

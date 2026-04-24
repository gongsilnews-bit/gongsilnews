# GongsilTalk V2 (공실Talk V2) 기획 및 아키텍처 문서

## 1. 개요 (Overview)
기존 기사/공실의 '댓글 관리' UI로 기획되었던 공실Talk을 **회원 간 실시간 다중/1:1 메신저(공동중개 및 네트워킹 전용 앱)**로 완전히 피벗(Pivot)합니다.

기존의 기사 및 공실에 달리는 일반 '댓글'은 전통적인 게시판 형태로 분리하며, 공실Talk은 카카오톡과 같은 독립적인 채팅 플랫폼 역할을 수행하게 됩니다. 이를 통해 지역/관심사별 오픈 채팅, 공동중개방, 회원 간 다이렉트 메시지(DM)를 지원하여 부동산 회원들의 락인(Lock-in) 효과를 극대화합니다.

## 2. 주요 기능 (Key Features)
1. **1:1 다이렉트 메시지 (DM)**
   - 회원과 회원(또는 관리자) 간의 독립적인 1:1 대화방 생성 지원.
2. **다중 참여 단체 톡방 (Group Chat)**
   - 3명 이상의 회원이 하나의 방에 모여 대화.
   - 예: '강남구 매물 공유방', '상가 전문 소장님 모임' 등.
3. **독립적인 메신저 UI 유지**
   - V1에서 구축한 카카오톡 스타일의 UI(우측 슬라이드 오버레이, 말풍선 사이드바 배치 등)를 재사용.
   - 방금 개발된 '말풍선 호버 시 [↪] 답글(인용) 기능'을 그룹 채팅에서 핵심 커뮤니케이션 도구로 활용.
4. **실시간 알림 (Real-time Notifications)**
   - Supabase Realtime을 활용한 0.1초 단위의 메시지 도착 동기화.

## 3. 데이터베이스 스키마 설계 (Database Schema)

공실Talk V2는 더 이상 `article_comments`와 `vacancy_comments`에 의존하지 않고, 메신저 전용 스키마를 가집니다.

### 1) 채팅방 테이블 (`talk_rooms`)
- `id` (UUID): 채팅방 고유 ID
- `type` (VARCHAR): `private` (1:1), `group` (다중)
- `title` (VARCHAR): 채팅방 이름 (그룹방의 경우)
- `created_at` (TIMESTAMP)

### 2) 채팅방 참여자 테이블 (`talk_participants`)
- `room_id` (UUID): 참조 `talk_rooms(id)`
- `member_id` (UUID): 참조 `members(id)`
- `joined_at` (TIMESTAMP)
- `last_read_at` (TIMESTAMP): 안 읽은 메시지 개수 계산용

### 3) 채팅 메시지 테이블 (`talk_messages`)
- `id` (UUID): 메시지 고유 ID
- `room_id` (UUID): 참조 `talk_rooms(id)`
- `author_id` (UUID): 참조 `members(id)`
- `content` (TEXT): 메시지 본문
- `parent_id` (UUID): 톡방 내 특정 메시지에 대한 답글(인용)일 경우 참조
- `created_at` (TIMESTAMP)

## 4. UI/UX 개편 방안
- 기존 `CommentSection.tsx`는 **`GongsilTalkSection.tsx`**로 명칭을 변경하거나 역할을 재정의합니다.
- 채팅방 목록(Left Panel)은 더 이상 기사/매물 목록이 아니라, **"내가 참여 중인 채팅방 목록"**으로 바뀝니다.
- 기사/매물의 원본 댓글란(홈페이지)은 기존 공실Talk을 연동하지 않고, 단순히 댓글이 달리면 일반 알림(Notification)으로만 통지되게 롤백합니다.

## 5. 기대 효과 (Impact)
1. **플랫폼 체류 시간 증대:** 중개사들이 네이버 밴드나 카카오톡 대신, 공실뉴스 어드민 내에 체류하며 중개망 네트워킹을 진행합니다.
2. **명확한 시스템 분리:** 공개적인 댓글/답글 시스템과 프라이빗한 채팅 시스템을 기능적으로 완벽하게 분리하여 사용자 혼란을 방지합니다.

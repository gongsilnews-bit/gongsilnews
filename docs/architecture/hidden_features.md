# 일시 숨김 처리된 기능 (Hidden Features)

본 문서는 현재 개발 속도 조절 및 운영 정책 등의 이유로 프론트엔드 UI 상에서 임시로 숨김(주석) 처리된 기능들의 목록과 관련된 파일, DB 테이블 정보를 추적하기 위해 작성되었습니다. 향후 해당 기능들을 다시 오픈할 때 이 문서를 참고하여 원복하시기 바랍니다.

---

## 1. 부동산 홈페이지 (미니 홈페이지)

부동산 회원이 자신의 매물과 소개를 담을 수 있는 개별 미니 홈페이지 기능입니다. 현재 PC 및 모바일 관리자 메뉴에서 진입할 수 없도록 메뉴 항목을 숨겨두었습니다.

### 📌 관련된 소스 코드 및 파일
*   **숨김 처리된 파일 (향후 주석 해제 필요):**
    *   `src/components/admin/AdminSidebar.tsx`: PC 좌측 사이드바의 `[부동산홈페이지]` 메뉴 아이템.
    *   `src/app/m/_components/header/GlobalDrawerMenu.tsx`: 모바일 우측 서랍(Drawer)의 `[🌐 홈페이지]` 메뉴 아이템.
*   **기능 동작 관련 주요 소스 (현재 유지되어 있음):**
    *   `src/components/admin/sections/HomepageSection.tsx`: 홈페이지 관리자 화면.
    *   `src/app/actions/homepage.ts`: 홈페이지 정보 로드, 저장, 이미지 업로드 등을 담당하는 서버 액션.

### 🗄️ 관련된 DB 테이블
*   `homepage_settings`: 미니 홈페이지의 기본 설정 값(상호명, 소개글, 노출 기사/매물 수, SNS 등) 저장.
*   `homepage_assets`: 홈페이지 운영에 사용되는 이미지(배너, 로고 등) 및 에셋 저장.

---

## 2. 공실Talk (채팅 / 1:1 대화 기능)

사용자와 부동산 간의 1:1 채팅을 지원하는 '공실Talk' 모듈입니다. UI 상에서 대화방으로 진입할 수 있는 버튼들을 모두 가려 기능 접근을 차단했습니다.

### 📌 관련된 소스 코드 및 파일
*   **숨김 처리된 파일 (향후 주석 해제 필요):**
    *   `src/app/(map)/gongsil/GongsilClient.tsx`: 지도 공실 매물 정보 영역 우측 상단의 `[💬 Talk]` (공실Talk) 버튼.
    *   `src/components/ProfileCardPopover.tsx`: 프로필 클릭 시 나타나는 팝업의 `[대화]` 액션 버튼.
*   **기능 동작 관련 주요 소스 (현재 유지되어 있음):**
    *   `src/components/GongsilTalkOverlay.tsx`: 화면에 플로팅 형태로 띄워지는 실제 채팅방 UI 컴포넌트 전체.
    *   `src/app/actions/talkActions.ts`: 채팅방 개설, 메시지 송수신, 친구 및 그룹/폴더 관리를 수행하는 서버 액션.
    *   `src/app/m/_components/MobileBottomNav.tsx`: 하단 네비게이션 마이페이지 아이콘에 표시되는 안읽은 메시지 수 뱃지 처리 (현재 채팅창 접근을 막아두었으므로 추가 뱃지 증가는 없으며 코드상 로직은 그대로 유지 중).

### 🗄️ 관련된 DB 테이블
*   `talk_rooms`: 생성된 각 채팅방(Room)의 기본 정보.
*   `talk_room_members`: 채팅방에 참여한 유저 매핑 데이터 및 안 읽은 메시지 수(unread_count) 관리.
*   `talk_messages`: 채팅방 내에서 주고받은 실제 대화(메시지) 내용.
*   `talk_friends`: 연락처/주소록 형태의 친구 추가 내역.
*   `talk_friend_folders`: 친구를 그룹화하기 위한 사용자 지정 폴더 정보.

# 통합 댓글 및 문의(Comment & Inquiry) 관리 시스템 기획 및 아키텍처

본 문서는 멀티 테넌트(SaaS) 기반 부동산 플랫폼에서 관리자가 '댓글 및 문의'를 한 곳에서 관리하기 위한 통합 대시보드의 데이터 구조와 UI 정책을 정의합니다.

## 1. 개요 및 목적
부동산 중개사는 다양한 채널을 통해 고객과 소통하게 됩니다. 이를 각각의 메뉴에서 개별적으로 확인하는 것은 불편하므로, 하나의 대시보드(통합 인박스) 형태로 제공하여 빠른 응대와 소통을 가능하게 하는 것이 핵심입니다.

### 통합되는 소통 채널
1. **공실 매물 댓글 (`vacancy`)**: 내가 등록한 공실 매물 상세페이지에 작성된 일반 유저의 댓글
2. **뉴스 기사 댓글 (`article`)**: 내가 작성한 부동산 전문 기사에 달린 유저 피드백 및 댓글
3. **홈페이지 1:1 문의 (`homepage`)**: 내 입주용 웹사이트(테넌트 홈페이지)의 전용 게시판이나 문의 폼으로 들어온 질문

---

## 2. 통합 대시보드 UI 연동 정책 (`CommentSection.tsx`)

대시보드 프론트엔드는 여러 개의 서로 다른 DB 테이블(기사 댓글, 매물 댓글, 게시판 문의 등)에서 데이터를 각각 불러온 후, 하나의 표준 **인터페이스(`InteractiveData`)** 로 통일 및 시간순 정렬하여 보여줍니다.

### 2.1. 프론트엔드 데이터 표준화 규격 (인터페이스)
```typescript
export interface InteractiveData {
  id: string;                               // 각 원본 테이블의 PK
  sourceType: "vacancy" | "article" | "homepage"; // 데이터 출처 분류
  sourceTitle: string;                      // 관련 글 제목 또는 상품명
  authorName: string;                       // 작성자 이름
  content: string;                          // 문의/댓글 내용
  isSecret: boolean;                        // ✨ 비밀글 여부 (중요)
  isRead: boolean;                          // 미확인 (수신 후 열람 여부)
  isReplied: boolean;                       // 답변 완료 여부
  createdAt: string;                        // 등록 시간
}
```

### 2.2. 상태 필터 및 편의 기능
- **상단 탭 분류**: `전체`, `공실 매물`, `뉴스 기사`, `홈페이지 문의`로 소스에 따라 모아보는 탭.
- **미확인 필터 토글**: 전체 목록 중 아직 열람하지 않은(isRead=false) 새 문의만 뽑아서 보여주는 `[☑️ 안 읽은 문의만 보기]` 기능 지원.
- **슬라이드-아웃 패널**: 항목 클릭 시 `CommentDetailPanel`이 우측에서 등장. 대화형 타임라인 UI 구현 및 **"🔒 비밀글로 답글 달기"** 옵션 제공.

---

## 3. 데이터베이스 (Supabase) 스키마 구성 방안

### 3.1. 기존 테이블 재사용 (기사/매물)
기존에 설계된 `article_comments` 와 `vacancy_comments`(추가예정) 를 사용하여 `GET` 요청 시 백엔드 단에서 통합(Union)합니다.

### 3.2. 홈페이지 1:1 문의 전용 테이블 구조 제안
테넌트 홈페이지의 "문의하기"를 처리하기 위해, CRM 고객(`crm_customers`)으로 등록되는 것과는 별개로 주고받을 수 있는 **전용 문의(QnA) 테이블**이 필요합니다.

```sql
-- 예시: 홈페이지 1:1 문의 테이블
CREATE TABLE tenant_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id), -- 해당 부동산 소유
  user_id UUID REFERENCES auth.users(id),          -- 작성 회원 (비회원 가능)
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT TRUE,                  -- 홈페이지 문의는 스팸/개인정보 보호를 위해 기본이 비밀글
  is_read BOOLEAN DEFAULT FALSE,                   -- 관리자 열람 여부
  parent_id UUID,                                  -- 답변인 경우 원본 글 ID (Self-reference)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3. 백엔드(Server Actions) 데이터 병합 계층
API는 각기 다른 테이블에서 해당 중개사(`agency_id` 또는 `author_id`) 소유의 데이터를 병렬로 Fetch 해온 뒤, `InteractiveData` 포맷으로 매핑하여 하나로 합치고 `created_at` 최신순으로 정렬(Sort)하여 프론트엔드로 반환하는 구조를 취합니다.

---

## 4. 추후 고도화 방안 (Next Steps)
- **알림 서버 연동**: [답변 등록] 버튼 클릭 시, 해당 유저의 이메일 계정 또는 카카오 알림톡 API를 호출하여 "부동산에서 답변이 등록되었습니다"를 전송하도록 확장.
- **CRM 연동 심화**: 1:1 문의를 주고받던 익명 유저가 거래 가능성이 높아질 경우 해당 문의 스레드 전체를 `crm_customers` 와 `crm_logs` 로 1-Click 이관하는 기능.

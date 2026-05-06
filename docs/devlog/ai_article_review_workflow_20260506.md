# AI 기사 자동 심사 워크플로우 안정화 및 전역 연동 (2026-05-06)

## 📌 배경 및 목표
기존 `adminUpdateArticleStatus` 서버 액션 내부에 존재했던 동기식(Synchronous) AI 심사 로직이 Vercel의 Serverless 함수 최대 실행 시간(15초)을 초과하여 타임아웃(504 Gateway Timeout) 에러를 발생시키는 치명적인 문제가 있었습니다.
이를 해결하고, 사용자(기자 및 최고관리자)가 어떤 환경에서든 직관적인 AI 심사 결과를 실시간으로 받아볼 수 있도록 워크플로우를 대대적으로 개편했습니다.

## 🛠️ 주요 변경 사항

### 1. AI 로직의 백그라운드 분리 (Decoupling)
- **API 라우트 신설**: `src/app/api/agents/article-review/route.ts`
- **로직 이동**: 기존 `article.ts` 파일의 `adminUpdateArticleStatus` 서버 액션에 묶여있던 `ArticleReviewAgent` 호출 로직을 전면 삭제하고, 독립된 전용 API 라우트로 분리했습니다.
- **타임아웃 방지**: 새 API 라우트에는 `export const maxDuration = 60;` (Vercel Pro 플랜 지원) 옵션을 적용하여 AI가 충분한 시간을 가지고 추론할 수 있도록 보장했습니다.

### 2. 전역 트리거(Trigger) 시스템 구축
기사가 "승인대기(PENDING)" 상태로 변경되는 모든 진입점에 비동기 API 호출(`fetch`) 트리거를 심어, 관리자 및 사용자의 대기 시간을 없앴습니다. (`fetch` 시 `await`를 생략하여 백그라운드에서 실행되도록 구성)
- **기자 대시보드 (`MemberArticleSection.tsx`)**: 선택한 기사를 "승인신청"할 때 트리거 (단, `Content-Type: application/json` 헤더 누락으로 발생했던 버그 수정 완료)
- **기사 작성 폼 (`NewsWriteForm.tsx`)**: 기사를 "승인신청" 상태로 저장 완료했을 때 즉시 트리거
- **최고관리자 PC 상세페이지 (`ArticleDetailPanel.tsx`)**: 관리자가 수동으로 기사 상태를 "승인대기"로 변경했을 때 트리거
- **최고관리자 모바일 앱 (`page.tsx`)**: 모바일에서 "승인신청"을 눌렀을 때 트리거

### 3. 직관적인 UI 피드백 노출 (UX 개선)
AI가 백그라운드에서 심사를 마치고 데이터베이스(DB)를 업데이트하면, 사용자는 화면을 새로고침할 필요 없이 즉시 결과를 확인할 수 있도록 `Supabase Realtime` 기능을 모든 대시보드 환경에 적용했습니다.
- **실시간 Toast 팝업 (1번 기능)**: `supabase.channel('public:articles')`를 통해 변경된 상태를 감지하여, "✅ AI 심사 완료(승인)" 또는 "🚫 AI 심사 반려" 팝업을 즉시 띄워줍니다.
  - 적용 위치: `MemberArticleSection.tsx`, `ArticleSection.tsx`, `ArticleDetailPanel.tsx`, `m/admin/article/page.tsx`
- **목록 내 피드백 직접 노출 (4번 기능)**: 팝업을 놓치더라도, 대시보드의 기사 목록과 상세페이지 상단에 AI가 작성한 상세 피드백(`reject_reason`)이 초록색(승인 시) 또는 빨간색(반려 시)으로 명확히 노출되도록 렌더링 코드를 추가했습니다.

## ⚠️ 트러블슈팅 기록

1. **Vercel 빌드 에러 (문법 오류)**:
   API 트리거 코드를 삽입하는 과정에서 `fetch(/api/agents/article-review)` 처럼 경로에 따옴표(`''`)를 누락하여 "Unknown regular expression flags" 에러가 발생. 따옴표를 추가하여 해결.
   
2. **트리거 무시 (헤더 누락 오류)**:
   기자 대시보드에서 60번 기사를 테스트할 때 AI 심사가 돌지 않던 현상 발생. `fetch` 호출 시 `headers: { 'Content-Type': 'application/json' }` 설정이 누락되어 Next.js의 `req.json()`이 데이터를 파싱하지 못하고 조기 종료(Abort)된 것이 원인. 해당 헤더를 추가하여 해결.

3. **Supabase Realtime 미작동**:
   코드는 완벽하나 팝업이 뜨지 않는 현상. Supabase 대시보드의 `Database > Publications` 메뉴에서 `supabase_realtime` 소스에 `articles` 테이블이 활성화되어 있지 않으면 신호가 오지 않으므로, 사용자에게 직접 설정 방법을 안내하여 해결.

## 🚀 향후 과제 및 제언
- 향후 카카오 알림톡이나 이메일 발송 기능을 추가하여 오프라인 상태인 작성자에게도 실시간으로 AI 반려 사유를 푸시 알림으로 쏴주는 기능(알림톡 연동)을 확장 구현하면 더욱 완벽한 서비스를 제공할 수 있습니다.

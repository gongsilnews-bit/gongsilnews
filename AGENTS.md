<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 공실뉴스 최고관리자 AI 기사 발행 및 자동 재발행 불변 원칙 (SuperAdmin AI Article Rules)

1. **즉시 승인 및 자동 발행(APPROVED) 기본 원칙**:
   - 최고관리자의 AI 에이전트(기사작성 에이전트, 크론 자동 작성 등)가 생성한 모든 기사는 즉시 `status: 'APPROVED'`(발행됨) 상태로 저장되고 `published_at`이 현재 시간으로 설정되어 메인 뉴스에 실시간 노출된다.
2. **반려 사유 기반 2대 AI 에이전트 백그라운드 자동 재작성 & 메인 자동 재발행**:
   - 최고관리자가 기사에서 `[반려]`를 누르고 반려 사유/피드백(글 수정 지시, 특정 이미지 요청, 합성 요청 등)을 입력하면,
   - 화면은 0.05초 만에 즉시 닫히며 기사는 일단 반려 처리되고,
   - 백그라운드에서 `NewsArticleAgent`(기사작성)와 `PhotoCurationAgent`(사진/동영상) 2대 에이전트가 동시에 출격하여 반려 사유를 100% 반영해 기사 본문과 사진을 실시간으로 재작성/생성한 후,
   - 수정 완료 즉시 `status: 'APPROVED'`로 메인 뉴스에 자동으로 다시 올려 정식 재발행한다.
3. **미디어 4단계 우선순위 & 본문 1:1 밀착 비주얼 묘사**:
   - 0순위: 관리자 특별 사진 요청 시 나노바나나 AI 실사 즉시 생성
   - 1순위: 회사/보도자료 실제 사진
   - 2순위: 유튜브 영상
   - 3순위: Unsplash 신선한 고화질 스톡 실사 (최근 200개 기사 중복 0% 차단)
   - 4순위: 나노바나나 AI 실사 생성 (기사 본문 내용 1:1 정밀 분석 영문 프롬프트 기반)



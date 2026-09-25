/* ══════════════════════════════════════════════════════════════
   공실뉴스 AI 기사작성기 — 공통 설정
   셀렉터와 저장 키를 여기 한 곳에만 둔다.
   화면이 바뀌어 깨질 때 고칠 곳이 여기 하나여야 한다.
   ══════════════════════════════════════════════════════════════ */

const GW = {
  VERSION: "2.1.1",

  /* 확장이 주고받는 데이터를 담아두는 자리 (chrome.storage.local) */
  KEY: {
    JOB: "gw_pending_job",      // 공실 → AI 탭으로 넘기는 프롬프트
    DRAFT: "gw_pending_draft",  // AI 탭 → 기사작성 페이지로 넘기는 기사
  },

  /* ── 공실뉴스 공실열람 상세 패널 ── */
  GONGSIL: {
    DETAIL: "#detail-scroll-container",
    /* 상세 패널이 프로퍼티를 정식으로 실어주는 자리 (있으면 DOM 긁기를 하지 않는다) */
    DATA_ATTR: "data-article-source",
    ID_ATTR: "data-vacancy-id",
  },

  /* ── 공실뉴스 기사작성 폼 ──
     전부 React 통제 입력이다. value 를 직접 넣으면 React 가 되돌린다.
     반드시 shared/ui.js 의 setReactValue() 로 넣을 것. */
  ADMIN: {
    TITLE: 'input[placeholder="제목을 입력하세요"]',
    SUBTITLE: 'textarea[placeholder^="부제목을 입력하세요"]',
    KEYWORD: 'input[placeholder^="키워드 입력 후 엔터"]',
    /* 본문은 contenteditable 이라 placeholder 가 없다. 툴바 아래 첫 편집영역을 찾는다. */
    BODY: 'div[contenteditable="true"]',
    /* 사진 — 숨은 파일 입력칸에 파일을 얹고 change 를 띄우면
       폼이 평소 업로드와 똑같은 길(WebP 압축·대표 지정)로 처리한다. */
    PHOTO_INPUT: '#photo-upload',
    PHOTO_CAPTION: 'input[placeholder="사진 설명(캡션) 입력"]',
  },

  /* ── ChatGPT ── */
  CHATGPT: {
    URL: "https://chatgpt.com/",
    /* 앞의 것이 기본 입력칸. ChatGPT 화면 구조가 바뀌어 id 가 없을 때를 위해 뒤에 예비 자리를 둔다. */
    INPUT: [
      "#prompt-textarea",
      'div.ProseMirror[contenteditable="true"]',
      'form [contenteditable="true"]',
      'main [contenteditable="true"]',
      'textarea[name="prompt-textarea"]',
    ],
    SEND: ['button[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'button[aria-label="프롬프트 보내기"]'],
    /* 응답 말풍선 — 마지막 것을 읽는다 */
    ANSWER: ['div[data-message-author-role="assistant"]', ".markdown.prose"],
    /* 생성된 그림 — 아바타·아이콘과 섞이지 않게 응답 안쪽만 본다 */
    IMAGE: [
      'div[data-message-author-role="assistant"] img',
      'article[data-testid^="conversation-turn"] img',
      'img[src*="oaiusercontent.com"]',
      'img[src*="/backend-api/files/"]',
    ],
  },

  /* ── Gemini ── */
  GEMINI: {
    URL: "https://gemini.google.com/app",
    INPUT: ["div.ql-editor[contenteditable='true']", "rich-textarea div[contenteditable='true']", "div[contenteditable='true']"],
    SEND: ['button[aria-label*="보내기"]', 'button[aria-label*="Send"]', "button.send-button"],
    ANSWER: ["message-content .markdown", "model-response message-content", ".model-response-text"],
    IMAGE: ["model-response img", "message-content img"],
    /* 긴 JSON 생성 중 잠깐 멈춘 것을 완료로 오인하지 않도록 Gemini 는 더 기다린다. */
    SETTLE_MS: 3000,
  },

  /* AI 응답이 멎었다고 보는 시간 (스트리밍이라 "끝" 신호가 없다) */
  SETTLE_MS: 1800,
};

/* 확장이 이 페이지에 붙었는지 눈으로 확인하는 자리.
   F12 → Console 에 이 줄이 안 보이면 확장이 이 페이지에 안 붙은 것이다. */
console.log(
  `%c 공실뉴스 AI 기사작성기 v${GW.VERSION} %c 붙었습니다 · ${location.host}${location.pathname} `,
  "background:#2563eb;color:#fff;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px",
  "background:#0f172a;color:#fff;border-radius:0 3px 3px 0;padding:2px 6px"
);

/* 이 확장이 붙어도 되는 공실뉴스 주소인지 */
GW.originOf = (url) => {
  try {
    const u = new URL(url);
    return u.origin;
  } catch (e) {
    return "";
  }
};


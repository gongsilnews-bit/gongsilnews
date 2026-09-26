/* 공실뉴스 AI 유튜브작성기 — 공통 설정 */
const GYW = {
  VERSION:
    (globalThis.chrome && chrome.runtime && chrome.runtime.getManifest && chrome.runtime.getManifest().version) || "",
  SITE_URL: "https://gongsilnews.com",
  KEY: {
    STATE: "gyw_project_state_v1",
  },
  GONGSIL: {
    DETAIL: "#detail-scroll-container",
    DATA_ATTR: "data-article-source",
    ID_ATTR: "data-vacancy-id",
  },
  CHATGPT: {
    URL: "https://chatgpt.com/",
    INPUT: [
      "#prompt-textarea",
      'div.ProseMirror[contenteditable="true"]',
      'form [contenteditable="true"]',
      'main [contenteditable="true"]',
      'textarea[name="prompt-textarea"]',
    ],
    SEND: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="프롬프트 보내기"]',
    ],
    ANSWER: ['div[data-message-author-role="assistant"]', ".markdown.prose"],
    IMAGE: [
      'div[data-message-author-role="assistant"] img',
      'article[data-testid^="conversation-turn"] img',
      'img[src*="oaiusercontent.com"]',
      'img[src*="/backend-api/files/"]',
    ],
    SETTLE_MS: 1800,
  },
  GEMINI: {
    URL: "https://gemini.google.com/app",
    INPUT: ["div.ql-editor[contenteditable='true']", "rich-textarea div[contenteditable='true']", "div[contenteditable='true']"],
    SEND: ['button[aria-label*="보내기"]', 'button[aria-label*="Send"]', "button.send-button"],
    ANSWER: ["message-content .markdown", "model-response message-content", ".model-response-text"],
    IMAGE: ["model-response img", "message-content img"],
    SETTLE_MS: 3000,
  },
};

GYW.aiConfig = (platform) => (platform === "gemini" ? GYW.GEMINI : GYW.CHATGPT);

console.log(
  `%c 공실뉴스 AI 유튜브작성기 v${GYW.VERSION} %c 붙었습니다 · ${location.host}${location.pathname} `,
  "background:#7c3aed;color:#fff;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px",
  "background:#111827;color:#fff;border-radius:0 3px 3px 0;padding:2px 6px"
);


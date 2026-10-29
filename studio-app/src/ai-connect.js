// 내 AI 연결: 회원이 스튜디오 전용 크롬에서 로그인한 ChatGPT·Claude·Gemini를 알아본다
// 로그인 여부만 확인하고 기록한다. 비밀번호나 로그인 토큰은 저장하지 않는다.
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const chrome = require("./studio-chrome");

const PROVIDERS = {
  chatgpt: {
    name: "ChatGPT",
    host: "chatgpt.com",
    url: "https://chatgpt.com/",
    ready: true,
    writer: true, // 글쓰기 AI (기본 AI 로 고를 수 있다)
    image: true, // 그림 AI (기본 이미지 생성 AI 로 고를 수 있다)
    // 로그인되어 있으면 세션 정보에 user 가 있다
    check: (page) =>
      page.evaluate(async () => {
        try {
          const r = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
          const j = await r.json();
          if (!j || !j.user) return { ok: false };
          return { ok: true, account: j.user.email || j.user.name || "", plan: (j.account && j.account.planType) || "" };
        } catch {
          return { ok: false };
        }
      }),
  },
  // Claude — 로그인돼 있으면 /api/organizations 가 조직 목록을 준다. 그림은 못 그린다 (글쓰기만)
  claude: {
    name: "Claude",
    host: "claude.ai",
    url: "https://claude.ai/new",
    ready: true,
    writer: true,
    noImage: true,
    check: (page) =>
      page.evaluate(async () => {
        try {
          const r = await fetch("/api/organizations", { credentials: "include", cache: "no-store" });
          if (!r.ok) return { ok: false };
          const orgs = await r.json();
          if (!Array.isArray(orgs) || !orgs.length) return { ok: false };
          const acct = await fetch("/api/account", { credentials: "include" }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
          return { ok: true, account: (acct && (acct.email_address || acct.full_name)) || "", plan: (orgs[0].capabilities || []).includes("claude_pro") ? "Pro" : "" };
        } catch {
          return { ok: false };
        }
      }),
  },
  // 네이버 블로그 (글 채우기용). 로그인 쿠키(NID_AUT)가 있으면 연결된 것으로 본다
  naver: {
    name: "네이버 블로그",
    host: "blog.naver.com",
    url: "https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fblog.naver.com%2F",
    checkUrl: "https://blog.naver.com/",
    anyHost: true,
    hidden: true, // [내 AI 연결] 창에는 보이지 않는다. 네이버 채우기 단계에서 필요할 때 로그인한다
    ready: true,
    check: async (page) => {
      const cookies = await page.context().cookies("https://www.naver.com");
      return { ok: cookies.some((c) => c.name === "NID_AUT" && c.value) };
    },
  },
  // Gemini — 로그인돼 있으면 오른쪽 위 구글 계정 단추(aria-label 에 메일)가 있다. 로그아웃 상태로도 쓸 수는 있어서 입력칸만으로는 보지 않는다
  gemini: {
    name: "Gemini",
    host: "gemini.google.com",
    url: "https://gemini.google.com/app",
    // 2026-10-15 글쓰기 시험: 공매 기사 33초, 같은 대화 수정 22초 (낮에는 Gemini 개편으로 먹통이었다)
    ready: true,
    writer: true,
    image: true,
    // 그림(나노바나나) 2026-10-15 시험: 글로만 26초, 방 사진 고쳐 그리기 33초 (1024px 안팎, 오른쪽 아래 Gemini 표시가 작게 들어간다)
    check: (page) =>
      page.evaluate(() => {
        if (/accounts\.google\.com/.test(location.href)) return { ok: false };
        const acct = document.querySelector('a[aria-label*="Google 계정"], a[aria-label*="Google Account"], [aria-label*="Google 계정:"], [aria-label*="Google Account:"]');
        if (!acct) return { ok: false };
        const m = (acct.getAttribute("aria-label") || "").match(/[\w.+-]+@[\w.-]+/);
        return { ok: true, account: m ? m[0] : "" };
      }),
  },
};

const statusFile = () => path.join(app.getPath("userData"), "ai-status.json");

function loadStatus() {
  try {
    return JSON.parse(fs.readFileSync(statusFile(), "utf8"));
  } catch {
    return {};
  }
}

function saveStatus(id, value) {
  const all = loadStatus();
  all[id] = { ...value, checkedAt: new Date().toISOString() };
  fs.writeFileSync(statusFile(), JSON.stringify(all, null, 2));
  return all[id];
}

/* AI 마다 쓰는 방법 — "account"(내 계정으로, 처음 값) | "api"(내 API 키로). 한 AI 에 한 가지만 (2026-10-18 회의) */
const API_IDS = ["chatgpt", "claude", "gemini"];
/* 쓰는 순서 (2026-10-23 사장님) — free: 내 계정(무료) 먼저, 막히면 API · paid: API 먼저, 막히면 내 계정 · freeOnly: 내 계정만 (API 는 안 씀)
   AI 마다 계정·키를 둘 다 연결해 둘 수 있다. getMode = 지금 먼저 쓸 방법 */
function getOrder() {
  const o = readSettings().order;
  return o === "free" || o === "paid" ? o : "freeOnly"; // 처음 값 = 내 계정만 — 2026-10-29 사장님 (전에는 API 먼저)
}
/* 내 계정 쓰는 방법 — manual(수동: 질문 복사 → 내 브라우저 → 답 복사, 처음 값) · auto(자동: 전용 크롬 조종, 계정이 막힐 수 있음) */
// 2026-10-29 사장님: 수동만 쓴다 — 자동(전용 크롬 조종)은 고르는 칸을 없앴고, 예전에 자동으로 해 둔 PC도 수동으로
const getMethod = () => "manual";
function setMethod() {
  writeSettings({ method: "manual" });
  return list();
}
function setOrder(o) {
  const order = o === "paid" || o === "freeOnly" ? o : "free";
  writeSettings({ order });
  log.info(`[AI 연결] 쓰는 순서: ${order === "paid" ? "유료 먼저" : order === "freeOnly" ? "무료만" : "무료 먼저"}`);
  return list();
}
const canAccount = (id) => Boolean((loadStatus()[id] || {}).ok);
const canApi = (id) => API_IDS.includes(id) && require("./ai/api").status(id).has;
function getMode(id) {
  if (!API_IDS.includes(id)) return "account";
  const o = getOrder();
  if (o === "freeOnly") return "account";
  if (o === "paid") return canApi(id) ? "api" : "account";
  return canAccount(id) || getMethod() === "manual" ? "account" : canApi(id) ? "api" : "account";
}
/** 무료 → 유료로 넘어갈 때 묻지 않기 (확인 창의 [다음부터 묻지 않고…]) */
const getPaidNoAsk = () => Boolean(readSettings().paidNoAsk);
const setPaidNoAsk = (v) => writeSettings({ paidNoAsk: Boolean(v) });
/** 막혔을 때 넘어갈 방법 — 없으면 "" (무료만이면 API 로 넘어가지 않는다) */
function fallbackMode(id, used) {
  if (!API_IDS.includes(id) || getOrder() === "freeOnly") return "";
  if (used === "account") return canApi(id) ? "api" : "";
  return canAccount(id) || getMethod() === "manual" ? "account" : "";
}
function setMode(id, mode) {
  if (!API_IDS.includes(id)) throw new Error("알 수 없는 AI입니다.");
  const modes = { ...(readSettings().modes || {}), [id]: mode === "api" ? "api" : "account" };
  writeSettings({ modes });
  log.info(`[AI 연결] ${PROVIDERS[id].name} 방법: ${modes[id] === "api" ? "API 키" : "내 계정"}`);
  return list();
}

/* ok = 지금 고른 방법으로 쓸 수 있나 (계정: 로그인 확인됨 · API: 키 있음). accountOk = 계정 로그인 여부 */
function list() {
  const saved = loadStatus();
  const w = getWriter();
  const api = require("./ai/api");
  return Object.entries(PROVIDERS)
    .filter(([, p]) => !p.hidden)
    .map(([id, p]) => {
      const st = saved[id] || { ok: false };
      const mode = getMode(id);
      const key = API_IDS.includes(id) ? api.status(id) : { has: false, masked: "" };
      return { id, name: p.name, ready: p.ready, canWrite: Boolean(p.writer), canImage: Boolean(p.image), imageReady: Boolean(p.image && p.ready && p.imageReady !== false), noImage: Boolean(p.noImage), isWriter: id === w, isImager: id === getImager(), ...st, accountOk: Boolean(st.ok), mode, keyHas: key.has, keyMasked: key.masked, keyModel: key.model || "", ok: Boolean(st.ok) || getMethod() === "manual" || (getOrder() !== "freeOnly" && key.has), method: getMethod() };
    });
}

/* 기본 글쓰기 AI (ChatGPT · Claude · Gemini) · 기본 이미지 생성 AI (ChatGPT · Gemini) — [내 AI 연결]에서 고른다. 처음엔 둘 다 ChatGPT */
const settingsFile = () => path.join(app.getPath("userData"), "ai-settings.json");
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf8")) || {};
  } catch {
    return {};
  }
}
function writeSettings(patch) {
  fs.writeFileSync(settingsFile(), JSON.stringify({ ...readSettings(), ...patch }, null, 2));
}
function getWriter() {
  const w = readSettings().writer;
  return PROVIDERS[w] && PROVIDERS[w].writer ? w : "chatgpt";
}
function setWriter(id) {
  if (!PROVIDERS[id] || !PROVIDERS[id].writer) throw new Error("글쓰기에 쓸 수 없는 AI입니다.");
  writeSettings({ writer: id });
  log.info(`[AI 연결] 기본 글쓰기 AI: ${PROVIDERS[id].name}`);
  return id;
}
function getImager() {
  const w = readSettings().imager;
  return PROVIDERS[w] && PROVIDERS[w].image ? w : "chatgpt";
}
function setImager(id) {
  if (!PROVIDERS[id] || !PROVIDERS[id].image) throw new Error("그림을 그릴 수 없는 AI입니다.");
  writeSettings({ imager: id });
  log.info(`[AI 연결] 기본 이미지 생성 AI: ${PROVIDERS[id].name}`);
  return id;
}

/** 화면 밖 전용 크롬으로 로그인 상태를 확인하고 기록한다 */
async function check(id) {
  const p = PROVIDERS[id];
  if (!p || !p.ready) throw new Error("준비 중인 AI입니다.");
  const r = await chrome.withHiddenPage(p.checkUrl || p.url, async (page) => {
    // 첫 화면이 뜨고 세션 정보를 읽을 수 있을 때까지 기다린다 — 처음 쓰는 PC는 사이트 보안 확인 화면이 먼저 떠서 느리다 (최대 45초)
    for (let i = 0; i < 30; i++) {
      if (p.anyHost || chrome.hostOf(page) === p.host) {
        const res = await p.check(page).catch(() => null);
        if (res && res.ok) return res;
      }
      await chrome.sleep(1500);
    }
    return { ok: false };
  });
  log.info(`[AI 연결] ${p.name} 확인: ${r.ok ? "연결됨" : "로그인 안 됨"}`);
  return saveStatus(id, r);
}

/**
 * [연결하기]: 조종을 끈 평범한 전용 크롬에서 그 AI 사이트를 연다.
 * 회원이 로그인하고 크롬 창을 닫으면, 화면 밖에서 로그인 상태를 확인한다.
 * onProgress(문구) 로 진행 상황을 알린다.
 */
async function connect(id, onProgress = () => {}) {
  const p = PROVIDERS[id];
  if (!p) throw new Error("알 수 없는 AI입니다.");
  if (!p.ready) throw new Error(`${p.name} 연결은 준비 중입니다.`);

  onProgress(`새로 뜬 "공실마케팅" 크롬 창에서 ${p.name}에 로그인한 뒤 [로그인 다 했어요]를 눌러 주세요. (평소 쓰시는 크롬 창이 아닙니다)`);
  await chrome.openPlain(p.url);
  onProgress(`${p.name} 로그인을 확인하는 중…`);
  await chrome.sleep(1500); // 크롬이 로그인 정보를 다 쓰고 닫힐 틈
  return check(id);
}

/** [창 열기] — 스튜디오 전용 크롬을 그 AI 사이트로 연다. 회원이 중간중간 대화 내용·로그인을 직접 확인하려고 */
function open(id) {
  const p = PROVIDERS[id];
  if (!p) throw new Error("알 수 없는 AI입니다.");
  chrome.openPlain(p.checkUrl || p.url).catch(() => {});
  return true;
}

/* 실제로 글·그림을 받아 왔으면 연결된 것이다 — 확인 기록을 "연결됨"으로 남긴다 (계정 이름은 이전 값 유지) */
function markConnected(id) {
  const prev = loadStatus()[id] || {};
  if (prev.ok) return;
  saveStatus(id, { ...prev, ok: true });
}

module.exports = { PROVIDERS, list, check, connect, open, markConnected, getWriter, setWriter, getImager, setImager, getMode, setMode, getOrder, setOrder, getMethod, setMethod, fallbackMode, getPaidNoAsk, setPaidNoAsk, finishLogin: () => chrome.closePlain() };

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
  claude: { name: "Claude", host: "claude.ai", url: "https://claude.ai/", ready: false },
  gemini: { name: "Gemini", host: "gemini.google.com", url: "https://gemini.google.com/", ready: false },
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

function list() {
  const saved = loadStatus();
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name, ready: p.ready, ...(saved[id] || { ok: false }) }));
}

/** 화면 밖 전용 크롬으로 로그인 상태를 확인하고 기록한다 */
async function check(id) {
  const p = PROVIDERS[id];
  if (!p || !p.ready) throw new Error("준비 중인 AI입니다.");
  const r = await chrome.withHiddenPage(p.url, async (page) => {
    // 첫 화면이 뜨고 세션 정보를 읽을 수 있을 때까지 잠깐 기다린다
    for (let i = 0; i < 10; i++) {
      if (chrome.hostOf(page) === p.host) {
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

  onProgress(`스튜디오 전용 크롬에서 ${p.name}를 열었습니다. 로그인을 마친 뒤 그 크롬 창을 닫아 주세요.`);
  await chrome.openPlain(p.url);
  onProgress(`${p.name} 로그인을 확인하는 중…`);
  return check(id);
}

module.exports = { PROVIDERS, list, check, connect };

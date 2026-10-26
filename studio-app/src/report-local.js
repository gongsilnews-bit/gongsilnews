// 공실 없이 만드는 AI 매물보고서 — PC 저장소 (2026-10-23 사장님 회의, docs/2026-10-23_report_without_vacancy_plan.md)
//   userData\local-reports\<id>.json 한 개 = 보고서 하나 { id, title, createdAt, updatedAt, vacancy, photos, state }
//   vacancy = 공실 정보와 같은 모양(붙여넣은 글을 AI가 정리) · photos = 처음 넣은 사진(그림 데이터) · state = 도구 편집 상태
//   공유 링크가 없어서 서버에 올리지 않는다. 공실스터디 멤버십(유료) 전용.
const fs = require("fs");
const path = require("path");
const { app, session } = require("electron");
const log = require("electron-log/main");
const ext = require("./ext");
const chatgpt = require("./ai");

const dir = () => path.join(app.getPath("userData"), "local-reports");
const isLocalReport = (id) => /^rpt-[\w-]+$/.test(String(id || ""));
const fileOf = (id) => {
  if (!isLocalReport(id)) throw new Error("잘못된 보고서입니다.");
  return path.join(dir(), `${id}.json`);
};
const read = (id) => {
  try {
    return JSON.parse(fs.readFileSync(fileOf(id), "utf8"));
  } catch {
    return null;
  }
};
const write = (d) => {
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(fileOf(d.id), JSON.stringify(d));
};

/** 공실스터디 멤버십(유료) 회원인지 — 서버가 정한다 (인테리어·리모델링 예측과 같은 기준) */
async function assertPaid(baseUrl) {
  const res = await session.defaultSession.fetch(`${baseUrl}/api/studio/usage`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!json || !json.success) throw new Error((json && json.error) || "회원 확인을 하지 못했습니다. 다시 로그인해 주세요.");
  if (json.simAllowed !== true) throw new Error("공실 없이 만드는 매물보고서는 공실뉴스부동산 전용입니다.");
}

/** 이름이 비면 매물 정보로 (예: 논현동 무지개빌라 전세) */
function titleOf(v = {}) {
  const t = [v.dong, v.building_name, v.trade_type].filter(Boolean).join(" ").trim();
  return t || "새 매물보고서";
}

async function create({ baseUrl, text, photos, title }, onProgress = () => {}) {
  await assertPaid(baseUrl);
  let vacancy = {};
  if (text && String(text).trim()) {
    const L = ext.run(["marketing/marketing-prompt.js"]);
    onProgress("붙여넣은 글을 AI가 정리하는 중…");
    const answer = await chatgpt.ask(L.gwBuildExtractPrompt(text), { onProgress, isComplete: (t) => L.gwParseExtract(t).ok });
    const parsed = L.gwParseExtract(answer);
    if (!parsed.ok) throw new Error(parsed.reason);
    vacancy = parsed.vacancy;
  }
  const now = new Date().toISOString();
  const d = {
    id: `rpt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title: String(title || "").trim().slice(0, 60) || titleOf(vacancy),
    createdAt: now,
    updatedAt: now,
    vacancy,
    photos: (Array.isArray(photos) ? photos : []).filter((p) => /^data:image\//.test(String(p))).slice(0, 7),
    state: null,
  };
  write(d);
  log.info(`[매물보고서] 공실 없이 새로 만듦 ${d.id} "${d.title}" 정보 ${Object.keys(vacancy).length}칸 사진 ${d.photos.length}장`);
  return d;
}

function get(id) {
  const d = read(id);
  if (!d) throw new Error("보고서를 찾지 못했습니다. 지워졌을 수 있어요.");
  return d;
}

/** 최근 것부터 — 목록에는 이름·날짜만 */
function list(limit = 30) {
  let names = [];
  try {
    names = fs.readdirSync(dir()).filter((f) => /^rpt-.*\.json$/.test(f));
  } catch {
    return [];
  }
  return names
    .map((f) => read(f.replace(/\.json$/, "")))
    .filter(Boolean)
    .map((d) => ({ id: d.id, title: d.title, createdAt: d.createdAt, updatedAt: d.updatedAt }))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit);
}

function save({ id, state, title }) {
  const d = get(id);
  if (state && typeof state === "object") d.state = state;
  if (typeof title === "string" && title.trim()) d.title = title.trim().slice(0, 60);
  d.updatedAt = new Date().toISOString();
  write(d);
  return { id: d.id, title: d.title, updatedAt: d.updatedAt };
}

function remove(id) {
  try {
    fs.unlinkSync(fileOf(id));
  } catch {}
  return true;
}

module.exports = { isLocalReport, assertPaid, create, get, list, save, remove };

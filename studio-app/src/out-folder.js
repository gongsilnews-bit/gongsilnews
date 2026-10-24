// 회원 결과물 저장 자리 — 전부 "문서\공실스튜디오" 안에, 종류 폴더 아래 작업마다 폴더 하나 (2026-10-15 회의 · 2026-10-23 저장 폴더 하나로)
//
//   문서\공실스튜디오\                (폴더 이름은 studio-root.js F)
//     01 뉴스SNS발행\<인스타그램|스레드|페이스북|유튜브>\20261023\<작업 이름>\   ← 채널 → 날짜 (2026-10-23 사장님)
//         작업 이름 = 논현동 빌라 연립_88633 (매물 이름+공실번호) · 뉴스칼럼_제목 · 인테리어_…_10월23일 9시48분
//     02 공실마케팅\<AI매물보고서|AI인테리어|AI리모델링|AI홍보지>\20261023\   ← 공실마케팅 결과 · 시뮬레이션 결과표 (아래 marketingFolder)
//
// 한 번 정한 폴더 이름은 기억해 둔다 (folders.json) — 매물 이름이 바뀌어도 같은 폴더에 계속 쌓인다.
const fs = require("fs");
const path = require("path");
const { app, shell } = require("electron");

const root = () => require("./studio-root").root();
const mapFile = () => path.join(app.getPath("userData"), "folders.json");
const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};
const isColumn = (id) => /^col-/.test(String(id));
const isSim = (id) => /^(int|rem)-/.test(String(id));
const stamp = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getMonth() + 1}월${d.getDate()}일 ${d.getHours()}시${String(d.getMinutes()).padStart(2, "0")}분`;
};

/* 공실: 앱이 분석해 둔 자료(analysis.json)에서 이름·공실번호 */
function vacancyName(vacancyId, hint = {}) {
  const dir = path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));
  const v = (readJson(path.join(dir, "analysis.json")) || {}).vacancy || {};
  const no = hint.no || ((v.fields || []).find((f) => f.label === "공실광고번호") || {}).value || "";
  const title = safeName(hint.title || v.title) || "공실";
  return no ? `${title}_${no}` : title;
}

/* 이 작업의 기본 폴더 이름 (처음 한 번만 정하고 기억) */
function baseName(id, hint) {
  // 공실 없이 만든 매물보고서 (2026-10-23) — "20261023 논현동 무지개빌라 전세"
  if (/^rpt-/.test(String(id))) {
    const d = require("./report-local").get(id);
    const t = new Date(d.createdAt || Date.now());
    const ymd = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
    return `${ymd} ${safeName(hint.title || d.title) || "매물보고서"}`;
  }
  if (isColumn(id)) {
    const blog = require("./blog-writer");
    const article = readJson(blog.docFile(id, "article"));
    // 기사 쓰기 전이면 소재(원문 뉴스 제목·주제)로
    const src = (readJson(path.join(app.getPath("userData"), "media", String(id).replace(/[^\w-]/g, ""), "source.json")) || {}).source || {};
    return `뉴스칼럼_${safeName((article && article.title) || hint.title || (src.news && src.news.title) || (src.topic && src.topic.subject)) || "칼럼"}`;
  }
  return vacancyName(id, hint);
}

function remember(id, hint = {}) {
  const map = readJson(mapFile()) || {};
  if (map[id]) return map[id];
  let name = baseName(id, hint);
  // 다른 작업이 이미 쓰는 이름이면 뒤에 번호
  const used = new Set(Object.values(map));
  for (let n = 2; used.has(name); n++) name = `${baseName(id, hint)}_${n}`;
  map[id] = name;
  fs.mkdirSync(path.dirname(mapFile()), { recursive: true });
  fs.writeFileSync(mapFile(), JSON.stringify(map, null, 2));
  return name;
}

/* 시뮬레이션 작업 이름 — "인테리어_논현동 빌라 연립_88633_10월23일 9시48분" · "리모델링_직접 올린 건물 사진_…" (처음 한 번 정하고 기억) */
function simName(id) {
  const sim = require("./sim-writer");
  const label = sim.kindOf(id) === "interior" ? "인테리어" : "리모델링";
  const map = readJson(mapFile()) || {};
  if (!map[id]) {
    // 결과표 전(사진만 올린 때)에도 이름을 짓는다 — 작업 파일 저장 (2026-10-24)
    let got;
    try { got = sim.resultOf(id); } catch { got = readJson(path.join(app.getPath("userData"), "media", String(id).replace(/[^\w-]/g, ""), "sim.json")) || {}; }
    const { result, vacancy, createdAt } = got;
    const when = stamp(createdAt || (result && result.createdAt));
    const vacId = vacancy && vacancy.vacancyId;
    map[id] = vacId ? `${label}_${remember(vacId)}_${when}` : `${label}_${safeName(result && result.title) || "직접 올린 사진"}_${when}`;
    fs.mkdirSync(path.dirname(mapFile()), { recursive: true });
    fs.writeFileSync(mapFile(), JSON.stringify(map, null, 2));
  }
  return map[id];
}
const ymdOf = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** 이 작업(공실·칼럼·시뮬레이션)의 저장 폴더 — 없으면 만든다 (2026-10-23 사장님: 채널 → 날짜)
 *   sub = 채널("인스타그램"·"스레드"·"페이스북"·"유튜브") → 01 뉴스SNS발행\<채널>\20261023\<작업 이름>\
 *   시뮬레이션 결과표·예측 이미지(sub 없음) → 02 공실마케팅\<AI인테리어|AI리모델링>\20261023\<작업 이름>\ */
function folderFor(id, sub = "", hint = {}) {
  const sr = require("./studio-root");
  let folder;
  if (isSim(id) && !sub) {
    const kind = require("./sim-writer").kindOf(id) === "interior" ? "AI인테리어" : "AI리모델링";
    folder = sr.dir("mkt", kind, ymdOf(), simName(id));
  } else {
    folder = sr.dir("sns", sub || "기타", ymdOf(), isSim(id) ? simName(id) : remember(id, hint));
  }
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

/* 공실마케팅에서 만든 결과 — 문서\공실스튜디오\02 공실마케팅\<AI매물보고서|AI인테리어|AI리모델링>\20261023\ (2026-10-23 사장님)
   매물·칼럼 폴더가 아니라 기능별 · 날짜별로 모은다 (sub = 도구가 보내는 이름) */
const MARKETING = { 매물보고서: "AI매물보고서", "인테리어 예측 보고서": "AI인테리어", "리모델링 예측 보고서": "AI리모델링", 홍보지: "AI홍보지" }; // 홍보지 = 공실등록 목록 [유리창홍보지]
function marketingFolder(sub) {
  const kind = MARKETING[sub];
  if (!kind) return "";
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const folder = require("./studio-root").dir("mkt", kind, ymd);
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

/** 그림·PDF 한 개를 저장하고 탐색기에서 그 파일을 보여 준다 */
function saveFile({ id, sub, fileName, dataUrl, hint, quiet }) {
  const m = /^data:[^,]*;base64,(.*)$/s.exec(String(dataUrl || ""));
  if (!m) throw new Error("저장할 파일이 비어 있습니다.");
  const folder = marketingFolder(sub) || folderFor(id, sub, hint);
  // 이름이 길어도 확장자(.pdf·.png)는 남긴다
  const ext = (/\.\w{2,4}$/.exec(String(fileName || "")) || [""])[0];
  // 파일 이름은 폴더 이름(40자)보다 길게 — 뒤의 쪽 번호(_12)가 잘려 서로 덮어쓰지 않게
  const stem = String(fileName || "").slice(0, String(fileName || "").length - ext.length).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  const file = path.join(folder, stem ? `${stem}${ext}` : `파일_${Date.now()}${ext}`);
  fs.writeFileSync(file, Buffer.from(m[1], "base64"));
  if (!quiet) shell.showItemInFolder(file); // quiet: 여러 장을 저장할 때 — 마지막에 한 번만 보여 준다
  return { file, folder };
}

/** [내 저장 폴더 열기] */
function openRoot() {
  fs.mkdirSync(root(), { recursive: true });
  return shell.openPath(root());
}

/** 작업 이름 — 매물 이름_공실번호 · 뉴스칼럼_제목 · 인테리어_…_날짜 (.gsn 파일 이름에) */
const workName = (id, hint = {}) => (isSim(id) ? simName(id) : remember(id, hint));

module.exports = { root, folderFor, saveFile, openRoot, safeName, stamp, workName };

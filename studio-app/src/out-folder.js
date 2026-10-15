// 회원 결과물 저장 자리 — 전부 "문서\공실뉴스 스튜디오" 안에 매물별 폴더 하나로 모은다 (2026-10-15 사장님 회의)
//
//   문서\공실뉴스 스튜디오\
//     논현동 빌라 연립_88633\          ← 매물 이름 + 공실번호
//       홍보지\  매물보고서\  인스타그램\  스레드\  페이스북\  유튜브\
//       인테리어 시뮬레이션_10월15일 18시42분\   (그 안에 인스타그램\ 유튜브\ …)
//     뉴스칼럼_부동산 시장 전망\         ← 매물 없는 글은 제목으로
//     인테리어_직접 올린 실내 사진_10월15일 18시42분\
//
// 한 번 정한 폴더 이름은 기억해 둔다 (folders.json) — 매물 이름이 바뀌어도 같은 폴더에 계속 쌓인다.
const fs = require("fs");
const path = require("path");
const { app, shell } = require("electron");

const root = () => path.join(app.getPath("documents"), "공실뉴스 스튜디오");
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
  if (isColumn(id)) {
    const blog = require("./blog-writer");
    const article = readJson(blog.docFile(id, "article"));
    return `뉴스칼럼_${safeName((article && article.title) || hint.title) || "칼럼"}`;
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

/* 시뮬레이션: 매물 사진으로 했으면 그 매물 폴더 안, 직접 올린 사진이면 따로 */
function simBase(id) {
  const sim = require("./sim-writer");
  const kind = sim.kindOf(id);
  const label = kind === "interior" ? "인테리어" : "리모델링";
  const { result, vacancy, createdAt } = sim.resultOf(id);
  const when = stamp(createdAt || (result && result.createdAt));
  const vacId = vacancy && vacancy.vacancyId;
  if (vacId) return path.join(remember(vacId), `${label} 시뮬레이션_${when}`);
  const map = readJson(mapFile()) || {};
  if (!map[id]) {
    map[id] = `${label}_${safeName(result && result.title) || "직접 올린 사진"}_${when}`;
    fs.mkdirSync(path.dirname(mapFile()), { recursive: true });
    fs.writeFileSync(mapFile(), JSON.stringify(map, null, 2));
  }
  return map[id];
}

/** 이 작업(공실·칼럼·시뮬레이션)의 저장 폴더 — 없으면 만든다. sub = "인스타그램" 같은 하위 폴더 */
function folderFor(id, sub = "", hint = {}) {
  const base = isSim(id) ? simBase(id) : remember(id, hint);
  const folder = path.join(root(), base, sub);
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

/** 그림·PDF 한 개를 저장하고 탐색기에서 그 파일을 보여 준다 */
function saveFile({ id, sub, fileName, dataUrl, hint }) {
  const m = /^data:[^,]*;base64,(.*)$/s.exec(String(dataUrl || ""));
  if (!m) throw new Error("저장할 파일이 비어 있습니다.");
  const folder = folderFor(id, sub, hint);
  const file = path.join(folder, safeName(fileName).replace(/ (?=\.\w+$)/, "") || `파일_${Date.now()}`);
  fs.writeFileSync(file, Buffer.from(m[1], "base64"));
  shell.showItemInFolder(file);
  return { file, folder };
}

/** [내 저장 폴더 열기] */
function openRoot() {
  fs.mkdirSync(root(), { recursive: true });
  return shell.openPath(root());
}

module.exports = { root, folderFor, saveFile, openRoot, safeName, stamp };

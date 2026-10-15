// 인테리어뉴스 · 리모델링뉴스 — 크롬 확장 interior10 · remodeling10 의 시뮬레이션을 앱으로 옮긴 것 (유료회원 전용)
//
// 사진(내 공실 등록 사진 또는 내 사진, 최대 3장) → 조건(인테리어: 공간·스타일·천장·바닥·벽·가구·조명 / 리모델링: 외장재·창호·색상…)
// → 공사비 기준(인테리어: 면적·천장 높이 / 리모델링: 가로·세로·층수·층고·고칠 면) → [시뮬레이션 시작]
//   ① 설계 지시서: 확장 rmBuildSpecPrompt → ChatGPT → rmParseSpec
//   ② 예측 이미지: 같은 대화에 rmBuildImagePrompt + 지금 모습 사진 첨부 → ChatGPT 가 그린 그림
//   ③ 결과표: 확장 sim.js buildResult 와 같은 모양 (공사비는 AI 가 아니라 확장 단가표 rmEstimateCost)
// 결과표가 기사·블로그·SNS·유튜브 대본의 원자료다. 번호는 "int-…"(인테리어) · "rem-…"(리모델링)이고,
// 채널 탭은 공실뉴스·뉴스칼럼과 같은 화면을 쓴다 (각 모듈이 isSim(번호)로 이 확장 프롬프트로 갈라진다).
// 확장 파일은 서버에서 받는다 (ext.js).
const { app, session, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const log = require("electron-log/main");
const ext = require("./ext");
const chatgpt = require("./ai"); // 고른 글쓰기 AI (ChatGPT · Gemini) — 그림은 ChatGPT
const { thumbOf, saveDataUrl } = require("./media-util");

const KINDS = {
  interior: {
    prefix: "int",
    label: "인테리어",
    files: ["interior-spec.js", "interior-cost.js", "prompt.js", "interior-prompt.js", "article-json.js", "blog-prompt.js", "naver-blog.js", "youtube-prompt.js", "youtube-json.js", "sns-prompt.js"],
    noPhotoTitle: "직접 올린 실내 사진",
    credit: "공실뉴스 인테리어 시뮬레이션 · gongsilnews.com",
  },
  remodel: {
    prefix: "rem",
    label: "리모델링",
    files: ["remodel-spec.js", "remodel-cost.js", "prompt.js", "remodel-prompt.js", "article-json.js", "blog-prompt.js", "naver-blog.js", "youtube-prompt.js", "youtube-json.js", "sns-prompt.js"],
    noPhotoTitle: "직접 올린 건물 사진",
    credit: "공실뉴스 리모델링 시뮬레이션 · gongsilnews.com",
  },
};
const MAX_PICK = 1; // 사진 한 장 = 공간 하나. 여러 장이면 다른 방이 섞인다
/* 한 방에 하나뿐인 조건은 하나만 (스타일을 섞으면 결과가 흐려진다). 가구·조명·외관 조건은 조합이 자연스러워 여러 개 */
const SINGLE = { interior: ["style", "ceiling", "floor", "wall"], remodel: [] };
const opt = (name) => `${name}: typeof ${name} !== "undefined" ? ${name} : null`; // 한쪽 확장에만 있는 것
const NAMES = [
  "RM_GROUPS", "RM_OPTIONS", "RM_RATIOS", "RM_SPEC_LABELS", "rmDefaultDesign", "rmDefaultCostBase", "rmEstimateCost", "rmNames", "rmWon",
  "rmBuildSpecPrompt", "rmBuildImagePrompt", "rmParseSpec",
  opt("RM_ROOMS"), opt("rmRoomName"), opt("rmRoomShort"), opt("RM_FACES"), opt("rmFloorsFromVacancy"),
  "gwBuildRemodelArticlePrompt", "RM_KIND", "GW_LENGTH", "gwBuildRevisePrompt", "gwBuildImagePrompt", "GW_IMAGE_STYLE",
  "gwBuildBlogPrompt", "gwBuildBlogRevisePrompt", "gwBlogStyles", "GW_BLOG_LENGTH",
  "GWArticleJson", "GWNaverBlog", "GWYoutubeJson",
  "GW_SNS_CHANNELS", "GW_SNS_SIM_NOTICE", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsAiLabelNote", "gwSnsNoun",
  "gwBuildYtScriptPrompt", "gwBuildYtRevisePrompt", "gwYtVideoTypes", "GW_YT_DURATION", "GW_YT_TONE", "gwYtSpeechSeconds", "gwYtCharCount",
];

const isSim = (id) => /^(int|rem)-[a-f0-9]+$/.test(String(id || ""));
const kindOf = (id) => (String(id).startsWith("int-") ? "interior" : "remodel");
/** 그 번호(또는 종류)의 확장 파일 묶음 — 기사·블로그·SNS·대본 모듈도 이것을 쓴다 */
const lib = (idOrKind) => {
  const kind = KINDS[idOrKind] ? idOrKind : kindOf(idOrKind);
  return ext.run(KINDS[kind].files.map((f) => `${kind}/${f}`), NAMES);
};
const mediaDir = (id) => path.join(app.getPath("userData"), "media", String(id).replace(/[^\w-]/g, ""));
const simFile = (id) => path.join(mediaDir(id), "sim.json");
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);
const newId = () => crypto.randomBytes(6).toString("hex");
const write = (d) => fs.writeFileSync(simFile(d.id), JSON.stringify(d, null, 2));

function read(id) {
  const d = isSim(id) ? readJson(simFile(id)) : null;
  if (!d) throw new Error("시뮬레이션을 찾지 못했습니다. 새로 시작해 주세요.");
  return d;
}

/* ── 화면에 줄 선택지 ── */
function options(kind) {
  const L = lib(kind);
  const ids = (list) => list.map((o) => ({ id: o.id, name: o.name }));
  const costFields =
    kind === "interior"
      ? [
          { key: "area", label: "공간 바닥 면적", unit: "m²", step: 1 },
          { key: "height", label: "천장 높이", unit: "m", step: 0.1 },
        ]
      : [
          { key: "width", label: "가로 (정면 폭)", unit: "m", step: 0.5 },
          { key: "depth", label: "세로 (측면 깊이)", unit: "m", step: 0.5 },
          { key: "floors", label: "층수", unit: "층", step: 1 },
          { key: "floorHeight", label: "층고", unit: "m", step: 0.1 },
          { key: "faces", label: "고칠 면", options: Object.entries(L.RM_FACES || {}).map(([id, f]) => ({ id: Number(id), name: f.label })) },
        ];
  return {
    kind,
    label: KINDS[kind].label,
    rooms: L.RM_ROOMS ? ids(L.RM_ROOMS) : null,
    groups: L.RM_GROUPS.map((g) => ({ key: g.key, label: g.label, single: SINGLE[kind].includes(g.key), options: ids(L.RM_OPTIONS[g.key] || []) })),
    ratios: ids(L.RM_RATIOS),
    costFields,
    defaults: { design: L.rmDefaultDesign(), costBase: L.rmDefaultCostBase(L.rmDefaultDesign().roomType) },
  };
}

function estimate(kind, costBase, design) {
  return lib(kind).rmEstimateCost(costBase, design);
}

function forWeb(d) {
  if (!d) return null;
  const L = lib(d.kind);
  const r = d.result;
  return {
    id: d.id,
    kind: d.kind,
    createdAt: d.createdAt,
    vacancyId: d.vacancyId || null,
    vacancyTitle: (d.vacancy && d.vacancy.title) || "",
    photos: d.photos.map((p) => ({ id: p.id, src: p.src, on: p.on, thumb: thumbOf(p.file, 360) })),
    design: d.design,
    costBase: d.costBase,
    cost: L.rmEstimateCost(d.costBase, d.design),
    result: r
      ? {
          title: r.title,
          location: r.location,
          dateText: r.dateText,
          roomName: r.roomName || "",
          before: r.beforeFile ? thumbOf(r.beforeFile, 900) : null,
          versions: r.versions.map((v) => ({ index: v.index, diffKo: v.diffKo, image: thumbOf(v.file, 900) })),
          design: r.design,
          designSpec: Object.entries(r.designSpec || {}).map(([k, v]) => ({ label: L.RM_SPEC_LABELS[k] || k, value: String(v || "") })).filter((x) => x.value),
          constraints: r.constraints,
          disclaimer: r.disclaimer,
          cost: r.cost,
        }
      : null,
    label: r ? `${r.title}${r.roomName ? ` · ${r.roomName}` : ""}` : (d.vacancy && d.vacancy.title) || `${KINDS[d.kind].label} 시뮬레이션`,
  };
}

/* ── 만들기 · 불러오기 ── */
function create(kind) {
  if (!KINDS[kind]) throw new Error("알 수 없는 시뮬레이션입니다.");
  const L = lib(kind);
  const design = L.rmDefaultDesign();
  const d = { id: `${KINDS[kind].prefix}-${Date.now().toString(16)}${crypto.randomBytes(3).toString("hex")}`, kind, createdAt: new Date().toISOString(), vacancyId: null, vacancy: null, photos: [], design, costBase: L.rmDefaultCostBase(design.roomType), spec: null, images: [], result: null };
  fs.mkdirSync(mediaDir(d.id), { recursive: true });
  write(d);
  log.info(`[시뮬레이션] 새로 ${d.id}`);
  return forWeb(d);
}

function get(id) {
  try {
    return forWeb(read(id));
  } catch {
    return null;
  }
}

function list(kind, limit = 8) {
  const root = path.join(app.getPath("userData"), "media");
  if (!fs.existsSync(root)) return [];
  const prefix = `${KINDS[kind].prefix}-`;
  return fs
    .readdirSync(root)
    .filter((n) => n.startsWith(prefix) && isSim(n))
    .map((id) => {
      try {
        const d = readJson(simFile(id));
        if (!d || (!d.result && !d.photos.length)) return null; // 사진도 없이 만들다 만 것은 보이지 않는다
        const r = d.result;
        return { id, createdAt: d.createdAt, done: Boolean(r), label: r ? `${r.title}${r.roomName ? ` · ${r.roomName}` : ""} · ${r.cost ? r.cost.rangeText : ""}` : (d.vacancy && d.vacancy.title) || "만드는 중" };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

/* ── 1단계 사진 ── */

/* 내 공실(또는 번호로 찾은 공실) — 공실 분석·캡처 결과가 있으면 그것을, 없으면 분석해서 등록 사진을 후보로 */
async function useVacancy({ id, vacancyId, baseUrl }, onProgress = () => {}) {
  const d = read(id);
  const dir = path.join(app.getPath("userData"), "media", String(vacancyId).replace(/[^\w-]/g, ""));
  let analysis = readJson(path.join(dir, "analysis.json"));
  if (!analysis) analysis = await require("./vacancy-capture").analyzeVacancy(baseUrl, vacancyId, onProgress);
  const photos = (analysis.media || []).filter((m) => m.kind === "photo" && m.file && fs.existsSync(m.file));
  if (!photos.length) throw new Error("이 공실에는 등록 사진이 없습니다. [내 사진 올리기]로 사진을 넣어 주세요.");
  d.vacancyId = vacancyId;
  d.vacancy = analysis.vacancy;
  d.photos = photos.map((m, i) => ({ id: newId(), file: m.file, src: "scan", on: i < 1 }));
  // 리모델링: 매물 정보의 층수를 공사비 기준 처음 값으로 (확장과 같다)
  const L = lib(d.kind);
  if (L.rmFloorsFromVacancy) {
    const floors = L.rmFloorsFromVacancy(d.vacancy);
    if (floors) d.costBase = { ...d.costBase, floors };
  }
  write(d);
  return forWeb(d);
}

async function addPhotos({ id, dataUrls }) {
  const d = read(id);
  if (d.vacancyId) {
    // 공실 사진에서 내 사진으로 바꾸면 매물과의 연결을 끊는다 (매물 금액을 쓰지 않게)
    d.vacancyId = null;
    d.vacancy = null;
    d.photos = d.photos.filter((p) => p.src === "upload");
  }
  for (const dataUrl of (dataUrls || []).slice(0, 10)) {
    const pid = newId();
    const file = await saveDataUrl(dataUrl, path.join(mediaDir(id), "photos"), `photo-${pid}`);
    d.photos.push({ id: pid, file, src: "upload", on: d.photos.filter((p) => p.on).length < 1 });
  }
  write(d);
  return forWeb(d);
}

/* 사진 고르기(1장) · 조건 · 공사비 기준 저장 */
function update({ id, pick, design, costBase }) {
  const d = read(id);
  if (Array.isArray(pick)) {
    const on = new Set(pick.slice(0, MAX_PICK));
    d.photos.forEach((p) => (p.on = on.has(p.id)));
  }
  if (design && typeof design === "object") d.design = { ...d.design, ...design };
  for (const k of SINGLE[d.kind] || []) if (Array.isArray(d.design[k])) d.design[k] = d.design[k].slice(0, 1);
  if (costBase && typeof costBase === "object") d.costBase = { ...d.costBase, ...costBase };
  write(d);
  return forWeb(d);
}

/* ── 이용 확인 (유료회원 전용, AI 이미지 하루 한도) ── */
async function useQuota(baseUrl, kind, id) {
  const res = await session.defaultSession.fetch(`${baseUrl}/api/studio/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, vacancyId: id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data || !data.success) throw new Error((data && data.error) || "이용 횟수를 확인하지 못했습니다.");
}

/* ── 시뮬레이션: 지시서 → 예측 이미지 → 결과표 ── */
async function run({ id, baseUrl }, onProgress = () => {}) {
  const d = read(id);
  const L = lib(d.kind);
  const picked = d.photos.filter((p) => p.on && fs.existsSync(p.file));
  if (!picked.length) throw new Error("사진을 1장 이상 골라 주세요.");
  onProgress("이용 권한을 확인하는 중…");
  await useQuota(baseUrl, "simulation", id); // 유료회원 확인 + AI 이미지 하루 한도

  // ① 설계 지시서
  onProgress("① 설계 지시서를 요청하는 중…");
  let chatUrl = "";
  // 예측 이미지는 지금 ChatGPT 만 그리므로 설계 지시서도 ChatGPT 에서 (같은 대화에 이어 그린다)
  const specText = await chatgpt.ask(L.rmBuildSpecPrompt(d.design), {
    provider: "chatgpt",
    onProgress,
    isComplete: (t) => L.rmParseSpec(t).ok,
    onChat: (u) => (chatUrl = u),
  });
  const parsed = L.rmParseSpec(specText);
  if (!parsed.ok) throw new Error(parsed.reason);
  d.spec = parsed.spec;
  d.chatUrl = chatUrl;
  write(d);

  // ② 예측 이미지 — 같은 대화에 지금 모습 사진을 붙여서 (버전 1장)
  onProgress("② 지금 모습 사진을 붙여 예측 이미지를 요청하는 중…");
  const dataUrl = await chatgpt.askImage(L.rmBuildImagePrompt(d.spec, 0, d.design.aspectRatio), {
    onProgress: (t) => onProgress(t.replace("그림을 그리는 중", "예측 이미지를 그리는 중")),
    chatUrl,
    files: picked.map((p) => p.file),
  });
  onProgress("③ 결과표를 만드는 중…");
  const file = await saveDataUrl(dataUrl, path.join(mediaDir(id), "result"), `after-1-${newId()}`);
  d.images = [{ version: 1, file }];
  d.result = buildResult(d, L, picked);
  // 다시 시뮬레이션하면 기사 사진을 새 결과로 (써 둔 글은 그대로 두고 사진만)
  write(d);
  log.info(`[시뮬레이션] ${id} 완료 ${d.result.cost.rangeText}`);
  return forWeb(d);
}

/* 확장 sim.js buildResult 와 같은 모양 (그림은 data URL 대신 파일 경로) */
function buildResult(d, L, picked) {
  const v = d.vacancy;
  const now = new Date();
  const location = v ? ((v.fields || []).find((f) => /소재지|주소|위치/.test(f.label)) || {}).value || v.location || "" : "";
  const interior = d.kind === "interior";
  const design = Object.fromEntries([
    ...(interior ? [["공간 유형", [L.rmRoomName(d.design.roomType)]]] : []),
    ...L.RM_GROUPS.map((g) => [g.label, L.rmNames(g.key, d.design[g.key])]),
  ]);
  return {
    title: (v && v.title) || KINDS[d.kind].noPhotoTitle,
    ...(interior ? { roomType: d.design.roomType, roomName: L.rmRoomShort(d.design.roomType) } : {}),
    location,
    vacancyId: d.vacancyId || null,
    saleKind: (v && v.saleKind) || null,
    vacancyUrl: (v && v.url) || "",
    dateText: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`,
    beforeFile: picked[0].file,
    versions: d.images.map((im) => ({ index: im.version, file: im.file, diffKo: (d.spec.versionDiffsKo || [])[im.version - 1] || "기본 디자인" })),
    design,
    aspectRatio: d.design.aspectRatio,
    designSpec: d.spec.designSpec || {},
    constraints: d.spec.constraints || "",
    disclaimer: d.spec.disclaimer || "",
    cost: L.rmEstimateCost(d.costBase, d.design),
    vacancyFacts: v ? (v.fields || []).slice(0, 20) : [],
    themes: v && Array.isArray(v.themes) ? v.themes : [],
    infra: v ? v.infra || "" : "",
    priceText: v ? v.priceText || "" : "",
  };
}

/* ── 다른 모듈이 쓰는 것 ── */

/** 기사·블로그·SNS·대본의 원자료 (결과표). 없으면 오류 */
function resultOf(id) {
  const d = read(id);
  if (!d.result) throw new Error("먼저 시뮬레이션을 해서 결과표를 만들어 주세요.");
  return { result: d.result, vacancy: d.vacancy || null, kind: d.kind, createdAt: d.createdAt };
}

/** 기사 첫 사진: 예측 이미지(대표) → 지금 모습 (확장 panel.js remodelMedia 와 같은 설명글) */
function resultMedia(id) {
  const { result: r, kind } = resultOf(id);
  const room = r.roomName || "실내";
  const media = r.versions.map((v, i) => ({
    id: newId(),
    kind: "ai",
    file: v.file,
    caption:
      kind === "interior"
        ? `${room} 인테리어 예측${r.versions.length > 1 ? ` (버전 ${v.index})` : ""} — 공실뉴스 인테리어 예측 시뮬레이션`
        : `리모델링 예측 외관${r.versions.length > 1 ? ` (버전 ${v.index})` : ""} — 공실뉴스 리모델링 예측 시뮬레이션`,
    isCover: i === 0,
  }));
  if (r.beforeFile) media.splice(1, 0, { id: newId(), kind: "upload", file: r.beforeFile, caption: kind === "interior" ? `현재 ${room} 모습` : "현재 외관", isCover: false });
  return media;
}

const creditOf = (id) => KINDS[kindOf(id)].credit;

/* ── 결과표 이미지 · 예측 이미지 저장 (확장 [📋 결과표 이미지 저장] [🖼 예측 이미지 저장]과 같다) ──
   문서\공실뉴스 스튜디오\<인테리어|리모델링>_<물건>_<번호>\ 에 저장하고 폴더를 연다 */
// 결과표 그림 코드는 조건표(이름·라벨)와 공사비 표기(rmWon)를 같이 쓴다
const SHEET = {
  interior: ["interior/interior-spec.js", "interior/interior-cost.js", "interior/interior-sheet.js"],
  remodel: ["remodel/remodel-spec.js", "remodel/remodel-cost.js", "remodel/remodel-sheet.js"],
};
const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
const fileToDataUrl = (file) => {
  const ext = path.extname(file).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
};

/* 매물 사진으로 했으면 그 매물 폴더 안 "인테리어 시뮬레이션_날짜", 직접 올린 사진이면 따로 (out-folder.js) */
const resultFolder = (d) => require("./out-folder").folderFor(d.id);

/* 확장 결과표 그림 코드(rmDrawSheet, canvas)를 안 보이는 창에서 그대로 돌려 PNG 를 받는다 */
async function drawSheet(d) {
  const r = d.result;
  const result = {
    ...r,
    beforeUrl: r.beforeFile && fs.existsSync(r.beforeFile) ? fileToDataUrl(r.beforeFile) : "",
    versions: r.versions.map((v) => ({ index: v.index, diffKo: v.diffKo, imageUrl: fs.existsSync(v.file) ? fileToDataUrl(v.file) : "" })),
  };
  const win = new BrowserWindow({ show: false, width: 1300, height: 900, webPreferences: { offscreen: true, sandbox: true } });
  try {
    await win.loadURL("data:text/html;charset=utf-8,<!doctype html><html><body></body></html>");
    const png = await win.webContents.executeJavaScript(`${SHEET[d.kind].map((f) => ext.text(f)).join(";\n")}
;rmDrawSheet(${JSON.stringify(result)})`, true);
    if (!/^data:image\/png;base64,/.test(String(png || ""))) throw new Error("결과표 그림을 만들지 못했습니다.");
    return png;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

async function exportResult({ id, what }) {
  const d = read(id);
  if (!d.result) throw new Error("먼저 시뮬레이션을 해서 결과표를 만들어 주세요.");
  const folder = resultFolder(d);
  const label = KINDS[d.kind].label;
  const day = d.result.dateText || "";
  const files = [];
  if (what === "sheet") {
    const png = await drawSheet(d);
    const file = path.join(folder, `공실뉴스_${label}_결과표_${day}.png`);
    fs.writeFileSync(file, Buffer.from(png.split(",")[1], "base64"));
    files.push(file);
  } else {
    const now = d.kind === "interior" ? `현재_${d.result.roomName || "실내"}` : "현재_외관";
    if (d.result.beforeFile && fs.existsSync(d.result.beforeFile)) {
      const file = path.join(folder, `${label}_${now}_${day}${path.extname(d.result.beforeFile)}`);
      fs.copyFileSync(d.result.beforeFile, file);
      files.push(file);
    }
    for (const v of d.result.versions) {
      if (!fs.existsSync(v.file)) continue;
      const file = path.join(folder, `${label}_예측_버전${v.index}_${day}${path.extname(v.file)}`);
      fs.copyFileSync(v.file, file);
      files.push(file);
    }
  }
  shell.openPath(folder);
  log.info(`[시뮬레이션] ${id} ${what} 저장 ${files.length}개`);
  return { folder, count: files.length };
}

module.exports = { isSim, kindOf, lib, options, estimate, create, get, list, useVacancy, addPhotos, update, run, resultOf, resultMedia, creditOf, exportResult };

// 영상 편집기 — 저장 폴더 설정 (처음 화면 [저장 폴더]). 비워 두면 기본 폴더.
//  projectDir: 새 프로젝트(.gss)를 만드는 곳   recordDir: 녹화 영상 저장   exportDir: 완성 영상(내보내기) — 기본은 .gss 파일 옆
// 이미 만든 프로젝트·녹화는 옮기지 않는다 (앞으로 새로 만드는 것부터).
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const file = () => path.join(app.getPath("userData"), "video-folders.json");
const sr = () => require("../studio-root");
const studioRoot = () => sr().root();
// 녹화 영상은 따로 [녹화영상] 폴더 (2026-10-20 사장님 — 예전 기본은 영상\녹화, 이미 녹화한 것은 그대로 두고 [녹화] 칩에서 같이 보인다)
// 강의녹화는 07 녹화파일\강의영상 에 날짜 폴더 없이 바로 (2026-10-24 사장님 — 유틸리티의 화면녹화·화면캡쳐와 나눔)
// 동영상제작\프로젝트 · 동영상제작\패키지 (2026-10-23 사장님 — 메뉴 이름대로, 프로젝트와 패키지를 나눠서)
const defaults = () => ({ projectDir: sr().dir("vid", "프로젝트"), recordDir: sr().dir("rec", "강의영상"), exportDir: "", aiAudioDir: sr().dir("ai", "AI보이스") }); // AI오디오 → AI보이스 (2026-10-23 사장님)
// 예전 녹화 자리 — 07 녹화파일\녹화영상\날짜 (10-24 전 기본) · 영상\녹화 (옛 기본) · 예전 이름 폴더(공실뉴스 스튜디오)의 녹화영상·영상\녹화
const OLD_RECORD = () => { const o = require("../studio-root").oldRoot(); return [sr().dir("rec", "녹화영상"), path.join(studioRoot(), "영상", "녹화"), path.join(o, "녹화영상"), path.join(o, "영상", "녹화")]; };
/** AI 목소리 저장 (AI 보이스 녹음 · 텍스트로 영상 › 목소리만) — 고른 곳, 아니면 공실마케팅\08 AI생성물\AI보이스\날짜 */
const aiAudioDir = () => read().aiAudioDir || defaults().aiAudioDir;
/** 공실마케팅 폴더 안에 강의영상·AI보이스 폴더를 미리 만들어 둔다 (PC 에서 바로 보이게) */
function ensure() {
  // 이름을 바꾸기 전에 잠깐 만들어진 빈 AI오디오 폴더는 지운다 (안에 파일이 있으면 그대로)
  try { fs.rmdirSync(path.join(studioRoot(), "AI오디오")); } catch {}
  for (const d of [recordDir(), aiAudioDir()]) { // 대본 폴더는 [텍스트로 내려받기] 할 때 생긴다 (미리 만들지 않음, 2026-10-23 사장님)
    try { fs.mkdirSync(d, { recursive: true }); } catch {}
  }
}

function read() {
  try {
    const v = JSON.parse(fs.readFileSync(file(), "utf8"));
    const ok = (x) => (typeof x === "string" && path.isAbsolute(x) ? x : "");
    return { projectDir: ok(v.projectDir), recordDir: ok(v.recordDir), exportDir: ok(v.exportDir), aiAudioDir: ok(v.aiAudioDir) };
  } catch {
    return { projectDir: "", recordDir: "", exportDir: "", aiAudioDir: "" };
  }
}
/** 고른 값(비면 "") + 기본 폴더 */
const get = () => ({ ...read(), defaults: defaults() });
/** 바꾸기 — "" 이면 기본으로 */
function set(patch = {}) {
  const cur = read();
  for (const k of ["projectDir", "recordDir", "exportDir", "aiAudioDir"]) {
    if (!(k in patch)) continue;
    const v = String(patch[k] || "");
    cur[k] = v && path.isAbsolute(v) ? v : "";
  }
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(cur, null, 1));
  return get();
}
/** 실제로 쓸 폴더 */
const projectDir = () => read().projectDir || defaults().projectDir;
const recordDir = () => read().recordDir || defaults().recordDir;
// 내보내기 — 고른 곳, 아니면 .gss 파일 옆 (예전 폴더 방식은 그 안의 output)
// 완성 영상 — 고른 곳, 아니면 공실마케팅\06 완성영상\오늘날짜 (2026-10-23 사장님: 공실마케팅 바로 아래, 날짜별)
const finishedRoot = () => sr().dir("done");
const exportDir = () => read().exportDir || dated(finishedRoot());

/* 완성영상은 안에서 날짜별로 — 06 완성영상\20261023\ (2026-10-23 사장님). 강의영상은 날짜 폴더 없이 바로 (2026-10-24 사장님).
   회원이 [저장 폴더]에서 직접 고른 폴더는 그대로 */
const same = (a, b) => path.resolve(String(a || "")).toLowerCase() === path.resolve(String(b || "")).toLowerCase();
function dated(dir) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const out = path.join(dir, ymd);
  fs.mkdirSync(out, { recursive: true });
  return out;
}
/** 완성영상 폴더면 오늘 날짜 폴더, 아니면 그대로 */
function byDate(dir) {
  // 프로젝트·강의영상은 날짜 폴더 없이 바로 (파일 이름 앞에 20261023 이 있으니까 — 2026-10-23·24 사장님)
  return dir && same(dir, finishedRoot()) ? dated(dir) : dir; // AI보이스도 날짜 폴더 없이 (2026-10-23 사장님)
}
/** 완성영상 폴더 안(어느 날짜든)인가 — 내보내기 창은 늘 오늘 날짜 폴더에서 연다 */
const inFinished = (dir) => (path.resolve(String(dir || "")).toLowerCase() + path.sep).startsWith(finishedRoot().toLowerCase() + path.sep);

/** [패키지] 기본 자리 — 그 .gss 가 있는 날짜 폴더 (프로젝트\20261023\). 패키지 안의 .gss 면 그 패키지 바깥 (패키지 안에 패키지가 생기지 않게) */
function packageDir(p) {
  let d = p && p.file ? path.dirname(p.file) : byDate(projectDir());
  if (/_패키지(_\d+)?$/.test(path.basename(d))) d = path.dirname(d);
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  return d;
}
/** 받은 자료 — 동영상제작\받은자료\<무료영상|무료사진|BGM|효과음> */
const received = (kind) => sr().dir("asset", kind); // 09 받은자료\<무료영상|무료사진|BGM|효과음>

module.exports = { get, set, projectDir, recordDir, exportDir, aiAudioDir, ensure, OLD_RECORD, byDate, packageDir, inFinished, received };

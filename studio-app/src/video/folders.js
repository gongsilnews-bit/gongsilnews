// 영상 편집기 — 저장 폴더 설정 (처음 화면 [저장 폴더]). 비워 두면 기본 폴더.
//  projectDir: 새 프로젝트(.gss)를 만드는 곳   recordDir: 녹화 영상 저장   exportDir: 완성 영상(내보내기) — 기본은 .gss 파일 옆
// 이미 만든 프로젝트·녹화는 옮기지 않는다 (앞으로 새로 만드는 것부터).
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const file = () => path.join(app.getPath("userData"), "video-folders.json");
const studioRoot = () => path.join(app.getPath("documents"), "공실뉴스 스튜디오");
// 녹화 영상은 따로 [녹화영상] 폴더 (2026-10-20 사장님 — 예전 기본은 영상\녹화, 이미 녹화한 것은 그대로 두고 [녹화] 칩에서 같이 보인다)
const defaults = () => ({ projectDir: path.join(studioRoot(), "영상"), recordDir: path.join(studioRoot(), "녹화영상"), exportDir: "", aiAudioDir: path.join(studioRoot(), "AI오디오") });
const OLD_RECORD = () => path.join(studioRoot(), "영상", "녹화");
/** AI 목소리 저장 (AI 보이스 녹음 · 텍스트로 영상 › 목소리만) — 고른 곳, 아니면 공실뉴스 스튜디오\AI오디오 */
const aiAudioDir = () => read().aiAudioDir || defaults().aiAudioDir;
/** 공실뉴스 스튜디오 폴더 안에 녹화영상·AI오디오 폴더를 미리 만들어 둔다 (PC 에서 바로 보이게) */
function ensure() {
  for (const d of [recordDir(), aiAudioDir(), path.join(studioRoot(), "대본")]) { // 대본 = 텍스트로 영상 [텍스트로 내려받기]
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
const exportDir = (p) => read().exportDir || (p.file ? path.dirname(p.file) : path.join(p.dir, "output"));

module.exports = { get, set, projectDir, recordDir, exportDir, aiAudioDir, ensure, OLD_RECORD };

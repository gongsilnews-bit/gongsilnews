// 영상 편집기 — 저장 폴더 설정 (처음 화면 [저장 폴더]). 비워 두면 기본 폴더.
//  projectDir: 새 프로젝트(.gss)를 만드는 곳   recordDir: 녹화 영상 저장   exportDir: 완성 영상(내보내기) — 기본은 .gss 파일 옆
// 이미 만든 프로젝트·녹화는 옮기지 않는다 (앞으로 새로 만드는 것부터).
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const file = () => path.join(app.getPath("userData"), "video-folders.json");
const studioRoot = () => path.join(app.getPath("documents"), "공실뉴스 스튜디오");
const defaults = () => ({ projectDir: path.join(studioRoot(), "영상"), recordDir: path.join(studioRoot(), "영상", "녹화"), exportDir: "" });

function read() {
  try {
    const v = JSON.parse(fs.readFileSync(file(), "utf8"));
    const ok = (x) => (typeof x === "string" && path.isAbsolute(x) ? x : "");
    return { projectDir: ok(v.projectDir), recordDir: ok(v.recordDir), exportDir: ok(v.exportDir) };
  } catch {
    return { projectDir: "", recordDir: "", exportDir: "" };
  }
}
/** 고른 값(비면 "") + 기본 폴더 */
const get = () => ({ ...read(), defaults: defaults() });
/** 바꾸기 — "" 이면 기본으로 */
function set(patch = {}) {
  const cur = read();
  for (const k of ["projectDir", "recordDir", "exportDir"]) {
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

module.exports = { get, set, projectDir, recordDir, exportDir };

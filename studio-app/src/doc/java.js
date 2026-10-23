// 문서편집 — 한글(.hwp) 변환기(hwplib)가 쓸 Java (2026-10-22 사장님: "자바 설치하게 해줘 앱에서")
//  PC 에 Java 를 설치하지 않고, 앱 폴더(사용자 데이터)에 Eclipse Temurin JRE 를 내려받아 이 앱만 쓴다 — 관리자 권한·시스템 설정 안 바뀜.
//  이미 PC 에 Java 17 이상이 있으면 그것을 쓴다. 지울 때는 [Java 지우기] (폴더만 지움).
//  Temurin = Eclipse 재단 공개 Java (GPLv2 + Classpath Exception — 재배포·상업 사용 가능)
const { app, session } = require("electron");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const VERSION = 21; // LTS
const dir = () => path.join(app.getPath("userData"), "jre");
const exeIn = (d) => path.join(d, "bin", process.platform === "win32" ? "java.exe" : "java");

/** 앱 폴더 안 Java (받은 것) — 압축을 풀면 jdk-21.x-jre 같은 폴더가 하나 생긴다 */
function bundled() {
  try {
    for (const n of fs.readdirSync(dir())) {
      const e = exeIn(path.join(dir(), n));
      if (fs.existsSync(e)) return e;
    }
  } catch {}
  return "";
}
/** java -version 의 큰 번호 (없으면 0) */
function versionOf(exe) {
  return new Promise((res) => {
    execFile(exe, ["-version"], { timeout: 8000, windowsHide: true }, (err, _o, se) => {
      if (err && !se) return res(0);
      const m = /version "(\d+)(?:\.(\d+))?/.exec(String(se || ""));
      if (!m) return res(0);
      const major = +m[1] === 1 ? +(m[2] || 0) : +m[1];
      res(major);
    });
  });
}
/** 쓸 Java — 앱 폴더 것 → JAVA_HOME → PATH 의 java (17 이상만) */
async function find() {
  const b = bundled();
  if (b && (await versionOf(b)) >= 17) return { exe: b, from: "app", version: await versionOf(b) };
  const cands = [];
  if (process.env.JAVA_HOME) cands.push(exeIn(process.env.JAVA_HOME));
  cands.push(process.platform === "win32" ? "java.exe" : "java");
  for (const c of cands) {
    const v = await versionOf(c);
    if (v >= 17) return { exe: c, from: "system", version: v };
  }
  return null;
}
async function status() {
  const f = await find();
  return f ? { ok: true, from: f.from, version: f.version } : { ok: false };
}

/** 내려받아 풀기 — onProgress(글, 0~1) */
async function install(onProgress = () => {}) {
  const have = await find();
  if (have) return { ok: true, from: have.from, version: have.version, already: true };
  if (process.platform !== "win32") throw new Error("지금은 윈도우에서만 자동 설치돼요.");
  const arch = process.arch === "arm64" ? "aarch64" : "x64";
  const url = `https://api.adoptium.net/v3/binary/latest/${VERSION}/ga/windows/${arch}/jre/hotspot/normal/eclipse?project=jdk`;
  onProgress("Java 를 내려받는 중… (약 45MB)", 0.02);
  const res = await session.defaultSession.fetch(url);
  if (!res.ok || !res.body) throw new Error(`Java 를 받지 못했어요 (${res.status}). 인터넷 연결을 확인해 주세요.`);
  const total = Number(res.headers.get("content-length")) || 47 * 1024 * 1024;
  fs.mkdirSync(dir(), { recursive: true });
  const zip = path.join(app.getPath("temp"), `gongsil-jre-${Date.now()}.zip`);
  const out = fs.createWriteStream(zip);
  const reader = res.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value.length;
    if (!out.write(Buffer.from(value))) await new Promise((r) => out.once("drain", r));
    onProgress(`Java 를 내려받는 중… ${Math.round(got / 1048576)} / ${Math.round(total / 1048576)}MB`, Math.min(0.85, (got / total) * 0.85));
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
  onProgress("압축을 푸는 중…", 0.9);
  // 윈도우 기본 PowerShell 로 풀기 (따로 도구 없이)
  await new Promise((r, j) => execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${dir().replace(/'/g, "''")}' -Force`],
    { timeout: 5 * 60 * 1000, windowsHide: true }, (e) => (e ? j(new Error("압축을 풀지 못했어요: " + e.message)) : r())));
  try { fs.unlinkSync(zip); } catch {}
  const f = await find();
  if (!f) throw new Error("Java 를 설치했지만 실행되지 않아요. 앱을 다시 켜 주세요.");
  onProgress("Java 준비 완료", 1);
  return { ok: true, from: f.from, version: f.version };
}
/** 앱 폴더 Java 지우기 (PC 에 원래 있던 Java 는 건드리지 않음) */
function remove() {
  try { fs.rmSync(dir(), { recursive: true, force: true }); } catch {}
  return true;
}

module.exports = { find, status, install, remove };

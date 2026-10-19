// 영상 편집기 — 공실뉴스 서버 부르기 (앱 창의 로그인 쿠키 + 스튜디오 표시). 성우·받아쓰기·무료 자료 검색
const { app, session } = require("electron");
const fs = require("fs");
const path = require("path");

let baseUrl = "";
const configure = (url) => (baseUrl = url);
const ua = () => `${app.userAgentFallback.replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ")} GongsilStudio/${app.getVersion()}`;

async function call(pathname, { method = "GET", body } = {}) {
  if (!baseUrl) throw new Error("공실뉴스 주소가 정해지지 않았습니다.");
  const res = await session.defaultSession.fetch(`${baseUrl}${pathname}`, {
    method,
    cache: "no-store",
    headers: { "User-Agent": ua(), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401) throw new Error("공실뉴스 로그인이 필요합니다. 위쪽 메뉴 [계정]에서 연결해 주세요.");
  if (!data) throw new Error(`공실뉴스 서버 응답을 읽지 못했습니다 (${res.status}).`);
  return data;
}

/** 주소의 파일을 dest 로 내려받는다 (성우 음성·무료 자료) */
async function download(url, dest) {
  const res = await session.defaultSession.fetch(url, { headers: { "User-Agent": ua() } });
  if (!res.ok) throw new Error(`파일을 받지 못했습니다 (${res.status}).`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // 임시 파일은 받을 때마다 다른 이름 — 같은 파일을 동시에 두 번 받으면 .part 를 함께 써서 이름 바꾸기가 막혔다 (EPERM, 2026-10-18)
  const tmp = `${dest}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  try {
    fs.renameSync(tmp, dest);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    if (!fs.existsSync(dest)) throw e; // 다른 받기가 먼저 끝냈으면 그 파일을 쓴다
  }
  return dest;
}

module.exports = { configure, call, download, base: () => baseUrl };

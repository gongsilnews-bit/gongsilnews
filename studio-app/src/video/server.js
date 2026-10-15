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
  const tmp = `${dest}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
  return dest;
}

module.exports = { configure, call, download };

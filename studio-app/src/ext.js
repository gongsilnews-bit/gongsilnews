// 크롬 확장의 프롬프트·해석·채우기 파일 — 설치 파일(EXE)에 넣지 않고 서버에서 받는다 (2026-10-15 보안 결정)
//
// - 앱을 켜고 로그인이 확인되면 /api/studio/prompts 에서 한 번 받아 **메모리에만** 둔다. PC 파일로 남기지 않는다.
// - 30분이 지나면 다음에 쓸 때 뒤에서 새로 받는다 (서버에서 프롬프트를 고치면 켜 둔 앱에도 반영). 실패하면 받아 둔 것을 쓴다.
// - 파일 이름: "gongsil/…"(기사작성기 gongsilwriter30) · "newsmaker/…"(뉴스메이커 newsmaker10)
//             "interior/…"(인테리어 interior10) · "remodel/…"(리모델링 remodeling10)
// - 각 파일은 브라우저용이라 vm 실행 공간에서 돌린다. module.exports 가 있으면 그것을, 없으면 이름을 골라 꺼낸다.
// - 다른 모듈은 lazyModule() 이 돌려주는 대역을 평소 require 결과처럼 쓴다 (속성을 읽는 순간 실행).
//   그래서 파일을 쓰는 IPC 는 먼저 ensure() 를 기다린다 (main.js withExt).
//
// 개발·자동 시험: STUDIO_EXT_DIR=<저장소>/chrome-extension 이면 (설치판이 아닐 때만) 서버 대신 확장 폴더에서 읽는다.
const { app, session } = require("electron");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const log = require("electron-log/main");

const REFRESH_MS = 30 * 60 * 1000;
let baseUrl = "";
let files = null; // { "gongsil/prompt.js": "…" }
let version = "";
let loadedAt = 0;
let loading = null;
const cache = new Map(); // 실행해 둔 모듈 (버전이 바뀌면 비운다)

function configure(url) {
  baseUrl = url;
}

/* 개발용: 확장 폴더에서 바로 읽기 */
const LOCAL = {
  gongsil: path.join("gongsilwriter30", "shared"),
  newsmaker: path.join("newsmaker10", "shared"),
  interior: path.join("interior10", "shared"),
  remodel: path.join("remodeling10", "shared"),
  marketing: path.join("..", "marketing", "shared"),
  ai: path.join("gongsilwriter30", "shared"), // AI 사이트 넣기·보내기·읽기 (기사작성기와 같은 코드)
};
function localFile(name) {
  const [group, file] = name.split("/");
  const dir = process.env.STUDIO_EXT_DIR;
  const p = file === "content-naver.js" ? path.join(dir, "gongsilwriter30", file) : path.join(dir, LOCAL[group], file);
  return fs.readFileSync(p, "utf8");
}
const useLocal = () => Boolean(process.env.STUDIO_EXT_DIR) && !app.isPackaged;

async function fetchBundle() {
  if (!baseUrl) throw new Error("공실뉴스 주소가 정해지지 않았습니다.");
  // 서버는 스튜디오 앱 표시(GongsilStudio/)가 있는 요청에만 준다 (main.js 가 userAgentFallback 에 붙인다)
  const res = await session.defaultSession.fetch(`${baseUrl}/api/studio/prompts`, {
    cache: "no-store",
    // 머리글에는 한글을 넣을 수 없다 (앱 이름이 한글이라 영문만 남긴다)
    headers: { "User-Agent": `${app.userAgentFallback.replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ")} GongsilStudio/${app.getVersion()}` },
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401) throw new Error("공실뉴스 로그인이 필요합니다. 위쪽 메뉴 [계정]에서 연결해 주세요.");
  if (!data || !data.success || !data.files) throw new Error((data && data.error) || "글쓰기 설정을 받지 못했습니다. 인터넷 연결을 확인해 주세요.");
  return data;
}

/** 파일을 받아 둔다 (이미 있으면 바로 끝, 30분 지났으면 새로 받기) */
function ensure() {
  if (useLocal()) {
    if (!files) {
      files = new Proxy({}, { get: (_t, name) => localFile(String(name)) });
      version = "local";
    }
    return Promise.resolve();
  }
  const stale = files && Date.now() - loadedAt > REFRESH_MS;
  if (files && !stale) return Promise.resolve();
  if (!loading) {
    loading = fetchBundle()
      .then((data) => {
        if (data.version !== version) cache.clear();
        files = data.files;
        version = data.version;
        loadedAt = Date.now();
        log.info(`[글쓰기 설정] 받음 ${Object.keys(files).length}개 · ${version}`);
      })
      .catch((e) => {
        if (files) {
          log.warn(`[글쓰기 설정] 새로 받기 실패, 받아 둔 것 사용: ${e.message}`);
          loadedAt = Date.now() - REFRESH_MS + 60 * 1000; // 1분 뒤 다시 시도
          return;
        }
        throw e;
      })
      .finally(() => (loading = null));
  }
  return stale ? Promise.resolve() : loading; // 받아 둔 게 있으면 기다리지 않는다
}

function text(name) {
  if (!files) throw new Error("글쓰기 설정을 아직 받지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
  const src = files[name];
  if (typeof src !== "string") throw new Error(`글쓰기 설정에 ${name} 이 없습니다.`);
  return src;
}

/** 파일들을 한 실행 공간에서 차례로 돌려 결과를 꺼낸다. names 가 없으면 마지막 파일의 module.exports */
function run(fileNames, names) {
  const key = `${version}|${fileNames.join(",")}|${(names || []).join(",")}`;
  if (cache.has(key)) return cache.get(key);
  const ctx = vm.createContext({ console, module: { exports: {} } });
  for (const f of fileNames) vm.runInContext(text(f), ctx, { filename: f });
  const out = names ? vm.runInContext(`({ ${names.join(", ")} })`, ctx) : ctx.module.exports;
  cache.set(key, out);
  return out;
}

/** require 결과처럼 쓰는 대역 — 속성을 읽을 때 factory() 를 실행한다 */
function lazyModule(factory) {
  return new Proxy(
    {},
    {
      get: (_t, prop) => factory()[prop],
      has: (_t, prop) => prop in factory(),
      ownKeys: () => Reflect.ownKeys(factory()),
      getOwnPropertyDescriptor: (_t, prop) => ({ ...Object.getOwnPropertyDescriptor(factory(), prop), configurable: true }),
    }
  );
}

module.exports = { configure, ensure, text, run, lazyModule, version: () => version };

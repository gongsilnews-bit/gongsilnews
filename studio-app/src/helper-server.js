// 공실마케팅 도우미(크롬 확장)와 이야기하는 PC 안 창구 (2026-10-23 사장님 회의)
//  전용 크롬 대신 회원이 평소 쓰는 크롬에서 채운다:
//   앱이 채울 글·사진을 "일감"으로 올려 두고 평소 크롬에 네이버 글쓰기·인스타그램 등을 연다 →
//   그 화면의 도우미 확장이 일감을 받아 가서(claim) 채우고 → 결과를 알려 준다(done).
//  - 127.0.0.1 에서만 듣는다 (인터넷에서 들어올 수 없다). 크롬 확장(chrome-extension://)만 받는다 — 웹페이지는 못 부른다
//  - 일감은 한 번 받아 가면 끝, 5분이 지나면 버린다. [발행]·[공유하기]는 확장도 누르지 않는다
const http = require("http");
const crypto = require("crypto");
const log = require("electron-log/main");

const PORTS = [47615, 47616, 47617, 47618, 47619]; // 확장도 같은 목록을 차례로 두드린다
const TTL = 5 * 60 * 1000;
const jobs = new Map(); // id → { id, target, payload, at, taken, done, waiters }
// 홍보현황 (2026-10-27): 채운 글이 어느 공실·채널인지 — 회원이 [발행]하면 도우미가 글 주소를 보내 온다(published)
const PUB_TTL = 3 * 60 * 60 * 1000;
const pubs = new Map(); // id → { meta: { vacancyId, channel }, at } — 앱을 껐다 켜도 남게 PC 파일에도 둔다
const pubFile = () => require("path").join(require("electron").app.getPath("userData"), "helper-pubs.json");
const savePubs = () => {
  try { require("fs").writeFileSync(pubFile(), JSON.stringify([...pubs])); } catch {}
};
const loadPubs = () => {
  try { for (const [id, p] of JSON.parse(require("fs").readFileSync(pubFile(), "utf8"))) if (Date.now() - p.at < PUB_TTL) pubs.set(id, p); } catch {}
};
const pubListeners = [];
// 도우미가 받아 갈 파일 (영상·썸네일, 2026-10-28) — token → { file, type, at }. 30분 지나면 버린다
const FILE_TTL = 30 * 60 * 1000;
const files = new Map();
let server = null;
let port = 0;

const sweep = () => {
  for (const [id, j] of jobs) if (Date.now() - j.at > TTL) jobs.delete(id);
  for (const [id, p] of pubs) if (Date.now() - p.at > PUB_TTL) pubs.delete(id);
  for (const [t, f] of files) if (Date.now() - f.at > FILE_TTL) files.delete(t);
};

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function handle(req, res) {
  const origin = String(req.headers.origin || "");
  // 크롬 확장만 — 웹페이지(https://…)가 PC 안 창구를 부르지 못하게.
  //  확장은 출처(Origin)를 안 붙이기도 해서, 확장만 붙일 수 있는 머리표 X-GS-Helper 로 가린다
  //  (웹페이지가 이 머리표를 붙이면 브라우저가 먼저 허락을 묻는데 — OPTIONS — 여기서 허락하지 않는다)
  const fromExt = origin.startsWith("chrome-extension://");
  if (fromExt) {
    // 크롬이 먼저 묻는 것(OPTIONS — 머리표·사설망 허락)에 확장이면 허락한다
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "X-GS-Helper, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Private-Network", "true");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  }
  // 확장이 보낸 것: 우리 머리표가 있거나, 크롬이 붙이는 Sec-Fetch-Site 가 "none"(웹페이지는 이렇게 못 보낸다)
  const site = String(req.headers["sec-fetch-site"] || "");
  const okFrom = req.headers["x-gs-helper"] === "1" || site === "none";
  if (!okFrom || (origin && !fromExt)) {
    log.warn(`[도우미] 거절 ${req.method} ${req.url} 출처=${origin || "(없음)"} 표시=${req.headers["x-gs-helper"] || "(없음)"} site=${site || "(없음)"} mode=${req.headers["sec-fetch-mode"] || "(없음)"}`);
    return send(res, 403, { ok: false });
  }
  const url = new URL(req.url, "http://127.0.0.1");
  sweep();
  if (url.pathname === "/gs-helper/ping") return send(res, 200, { ok: true, app: "공실마케팅" });
  // 영상·썸네일 파일 — 앱이 addFile 로 내준 것만 (번호표 모르면 못 받는다)
  if (url.pathname === "/gs-helper/file") {
    const f = files.get(url.searchParams.get("token") || "");
    const fs = require("fs");
    if (!f || !fs.existsSync(f.file)) return send(res, 404, { ok: false });
    const size = fs.statSync(f.file).size;
    res.writeHead(200, { "Content-Type": f.type, "Content-Length": size, "Cache-Control": "no-store" });
    fs.createReadStream(f.file).pipe(res);
    log.info(`[도우미] 파일 넘김 ${require("path").basename(f.file)} ${Math.round(size / 1048576)}MB`);
    return;
  }
  if (url.pathname === "/gs-helper/claim") {
    const target = url.searchParams.get("target") || "";
    // 가장 최근에 올린, 아직 안 받아 간 일감
    const j = [...jobs.values()].filter((x) => x.target === target && !x.taken).sort((a, b) => b.at - a.at)[0];
    if (!j) return send(res, 200, { ok: true, job: null });
    j.taken = Date.now();
    j.waiters.forEach((w) => w("taken"));
    log.info(`[도우미] ${target} 일감 넘김 ${j.id}`);
    return send(res, 200, { ok: true, job: { id: j.id, target, ...j.payload } });
  }
  if (url.pathname === "/gs-helper/done" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      let r = {};
      try { r = JSON.parse(body || "{}"); } catch {}
      const j = jobs.get(r.id);
      if (j) {
        j.done = r.result || { ok: false };
        j.waiters.forEach((w) => w("done"));
        log.info(`[도우미] ${j.target} 끝 ${j.id} ${JSON.stringify(j.done).slice(0, 200)}`);
      }
      send(res, 200, { ok: true });
    });
    return;
  }
  // 확장이 남기는 진행 기록 (발행 주소 잡기가 어디서 멈추는지 보려고, 2026-10-27)
  if (url.pathname === "/gs-helper/log" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e4) req.destroy(); });
    req.on("end", () => {
      let r = {};
      try { r = JSON.parse(body || "{}"); } catch {}
      log.info(`[도우미 확장] ${String(r.text || "").slice(0, 500)}`);
      send(res, 200, { ok: true });
    });
    return;
  }
  if (url.pathname === "/gs-helper/published" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => {
      let r = {};
      try { r = JSON.parse(body || "{}"); } catch {}
      const p = pubs.get(r.id);
      const ok = Boolean(p && /^https:\/\//.test(String(r.url || "")));
      if (ok) {
        pubs.delete(r.id);
        savePubs();
        // 유튜브도 바로 — 공개·비공개·예약 상관없이 영상 주소가 생기면 ✓ (2026-10-28 사장님). 잘못 붙으면 회원이 [연결 끊기]
        log.info(`[도우미] 발행 ${p.meta.channel} ${p.meta.vacancyId || `기사 ${p.meta.articleNo}`} ${r.url}`);
        for (const fn of pubListeners) Promise.resolve(fn({ ...p.meta, url: String(r.url) })).catch((e) => log.warn(`[도우미] 발행 기록 못함: ${e.message}`));
      }
      send(res, 200, { ok });
    });
    return;
  }
  // 지운 인스타·페북 글 확인 (2026-10-29) — 확장이 확인할 링크를 묻고, 지운 글이면 알린다. 서버와 이야기는 main.js 가 (setVerifier)
  // 확장이 1분마다 묻는다 — 회원이 [링크 수정]을 눌렀으면 지금 확인 (한 번 대답하면 내린다)
  if (url.pathname === "/gs-helper/verify-wanted") {
    const urls = verifyWanted;
    verifyWanted = [];
    return send(res, 200, { ok: true, want: urls.length > 0, urls });
  }
  if (url.pathname === "/gs-helper/verify-list") {
    Promise.resolve(verifier ? verifier.list() : [])
      .then((urls) => send(res, 200, { ok: true, urls: Array.isArray(urls) ? urls : [] }))
      .catch(() => send(res, 200, { ok: true, urls: [] }));
    return;
  }
  if (url.pathname === "/gs-helper/gone" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e4) req.destroy(); });
    req.on("end", () => {
      let r = {};
      try { r = JSON.parse(body || "{}"); } catch {}
      const u = String(r.url || "");
      if (!verifier || !/^https:\/\/www\.(instagram|facebook|threads)\.(com|net)\//.test(u)) return send(res, 200, { ok: false });
      log.info(`[홍보현황] 도우미가 지운 글로 봄 ${u}`);
      Promise.resolve(verifier.gone(u)).then(() => send(res, 200, { ok: true })).catch(() => send(res, 200, { ok: false }));
    });
    return;
  }
  send(res, 404, { ok: false });
}

let verifier = null;
let verifyWanted = [];
/** 회원이 [링크 수정]을 눌렀다 — 그 공실·기사의 인스타·페북 링크만, 확장이 다음에 물을 때(1분 안) 확인 */
const requestVerify = (urls) => {
  const ok = (Array.isArray(urls) ? urls : []).map(String).filter((u) => /^https:\/\/www\.(instagram|facebook|threads)\.(com|net)\//.test(u));
  verifyWanted = [...new Set([...verifyWanted, ...ok])].slice(0, 20);
};
/** main.js 가 넣는다 — { list: () => Promise<string[]>, gone: (url) => Promise } */
const setVerifier = (v) => { verifier = v; };

/** 앱이 켜질 때 — 비어 있는 첫 번호에서 듣는다 */
function start() {
  if (server) return;
  loadPubs();
  const tryPort = (i) => {
    if (i >= PORTS.length) return log.warn("[도우미] 창구를 열 번호가 없음");
    const s = http.createServer(handle);
    s.once("error", () => tryPort(i + 1));
    s.listen(PORTS[i], "127.0.0.1", () => {
      server = s;
      port = PORTS[i];
      log.info(`[도우미] PC 안 창구 127.0.0.1:${port}`);
    });
  };
  tryPort(0);
}

/** 유튜브 영상이 공개(일부 공개 포함)됐는지 — oEmbed 는 비공개·임시 저장이면 401/403/404 (2026-10-28) */
async function isPublicYoutube(url) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    return r.ok;
  } catch { return false; }
}
/** 올린 영상 — 회원이 [게시]해서 공개된 걸 볼 때까지 10초마다, 30분까지 (도우미는 주소가 보이면 바로 보낸다) */
async function whenPublic(meta, url) {
  log.info(`[홍보현황] 유튜브 공개 기다림 ${url}`);
  for (let i = 0; i < 180; i++) {
    if (await isPublicYoutube(url)) return published(meta, url);
    await new Promise((r) => setTimeout(r, 10000));
  }
  log.info(`[홍보현황] 유튜브가 공개되지 않아 연결 안 함 ${url}`);
}

/** 파일 내주기 — 돌려줌: { token, name, type } (도우미가 /gs-helper/file?token= 으로 받아 간다) */
function addFile(file, type) {
  const token = crypto.randomBytes(12).toString("hex");
  files.set(token, { file, type, at: Date.now() });
  return { token, name: require("path").basename(file), type };
}

/** 일감 올리기 — 돌려줌: id. meta = { vacancyId, channel } 또는 { articleNo, channel }(내 기사) 이면 발행 뒤 글 주소를 받는다 */
function addJob(target, payload, meta) {
  // 같은 곳에 남은 옛 일감은 버린다 (마지막 것만)
  for (const [id, j] of jobs) if (j.target === target && !j.taken) jobs.delete(id);
  const id = crypto.randomBytes(8).toString("hex");
  jobs.set(id, { id, target, payload, at: Date.now(), taken: 0, done: null, waiters: [] });
  if (meta && (meta.vacancyId || meta.articleNo)) { pubs.set(id, { meta, at: Date.now() }); savePubs(); }
  return id;
}

/** 기다리기 — what: "taken"(확장이 받아 감) · "done"(채우기 끝). 시간 안에 안 되면 false */
function wait(id, what, ms) {
  const j = jobs.get(id);
  if (!j) return Promise.resolve(false);
  if ((what === "taken" && j.taken) || (what === "done" && j.done)) return Promise.resolve(what === "done" ? j.done : true);
  return new Promise((resolve) => {
    const t = setTimeout(() => { j.waiters = j.waiters.filter((w) => w !== fn); resolve(false); }, ms);
    const fn = (ev) => {
      if (ev !== what && !(what === "taken" && ev === "done")) return;
      clearTimeout(t);
      j.waiters = j.waiters.filter((w) => w !== fn);
      resolve(what === "done" ? j.done : true);
    };
    j.waiters.push(fn);
  });
}

const cancel = (id) => jobs.delete(id);

/** 회원이 발행한 글 주소가 오면 — fn({ vacancyId | articleNo, channel, url }) */
const onPublished = (fn) => pubListeners.push(fn);
/** 도우미가 아닌 곳에서 잡은 발행 주소 (동영상제작 › 유튜브 올리기, 2026-10-28) — meta = { vacancyId | articleNo, channel } */
const published = (meta, url) => {
  log.info(`[홍보현황] 발행 ${meta.channel} ${meta.vacancyId || `기사 ${meta.articleNo}`} ${url}`);
  for (const fn of pubListeners) Promise.resolve(fn({ ...meta, url: String(url) })).catch((e) => log.warn(`[홍보현황] 발행 기록 못함: ${e.message}`));
};

module.exports = { start, addJob, addFile, wait, cancel, onPublished, published, setVerifier, requestVerify, port: () => port };

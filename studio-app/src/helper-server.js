// 공실스튜디오 도우미(크롬 확장)와 이야기하는 PC 안 창구 (2026-10-23 사장님 회의)
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
let server = null;
let port = 0;

const sweep = () => {
  for (const [id, j] of jobs) if (Date.now() - j.at > TTL) jobs.delete(id);
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
  if (url.pathname === "/gs-helper/ping") return send(res, 200, { ok: true, app: "공실스튜디오" });
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
  send(res, 404, { ok: false });
}

/** 앱이 켜질 때 — 비어 있는 첫 번호에서 듣는다 */
function start() {
  if (server) return;
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

/** 일감 올리기 — 돌려줌: id */
function addJob(target, payload) {
  // 같은 곳에 남은 옛 일감은 버린다 (마지막 것만)
  for (const [id, j] of jobs) if (j.target === target && !j.taken) jobs.delete(id);
  const id = crypto.randomBytes(8).toString("hex");
  jobs.set(id, { id, target, payload, at: Date.now(), taken: 0, done: null, waiters: [] });
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

module.exports = { start, addJob, wait, cancel, port: () => port };

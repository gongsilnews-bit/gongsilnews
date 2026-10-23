// 영상 편집기 — PC 파일을 편집 화면에서 바로 재생하는 주소 studio-media://f/<경로 base64url>
// 올리지 않고 PC에서 바로 (사장님 원칙). 영상 앞뒤로 넘기기(구간 요청 Range)를 지원한다.
// 아무 파일이나 열지 못하게, 편집기가 등록한 파일(라이브러리·프로젝트)과 스튜디오 폴더 안만 연다.
const { protocol, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const SCHEME = "studio-media";
const allowedFiles = new Set();
const allowedRoots = [];

const norm = (p) => path.resolve(p).toLowerCase();
const allow = (file) => file && allowedFiles.add(norm(file));
const allowRoot = (dir) => dir && allowedRoots.push(norm(dir) + path.sep);
const isAllowed = (file) => {
  const n = norm(file);
  return allowedFiles.has(n) || allowedRoots.some((r) => n.startsWith(r));
};

const urlOf = (file) => (file ? `${SCHEME}://f/${Buffer.from(path.resolve(file), "utf8").toString("base64url")}` : "");
const fileOf = (url) => {
  const m = /^studio-media:\/\/f\/([A-Za-z0-9_-]+)/.exec(String(url || ""));
  return m ? Buffer.from(m[1], "base64url").toString("utf8") : "";
};

const TYPES = { ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg" };

/** app ready 전에 불러야 한다 */
function registerScheme() {
  protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true } }]);
}

function handle() {
  protocol.handle(SCHEME, (req) => {
    const file = fileOf(req.url);
    if (!file || !isAllowed(file) || !fs.existsSync(file)) return new Response("not found", { status: 404 });
    const size = fs.statSync(file).size;
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
    const headers = { "Content-Type": type, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" };
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
        status: 206,
        headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` },
      });
    }
    return new Response(Readable.toWeb(fs.createReadStream(file)), { status: 200, headers: { ...headers, "Content-Length": String(size) } });
  });
  // 앱이 만든 것은 늘 열 수 있다
  allowRoot(app.getPath("userData"));
  allowRoot(require("../studio-root").root());
  allowRoot(require("../studio-root").oldRoot()); // 예전 이름 폴더의 자료도 그대로 쓴다
}

module.exports = { registerScheme, handle, allow, allowRoot, urlOf, fileOf, isAllowed, SCHEME };

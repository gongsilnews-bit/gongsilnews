// 공실뉴스 자료 (드론 영상 등, 2026-10-28 사장님) — PC에 받지 않고 쓸 때마다 불러온다
//  자료 경로는 "gsremote:drone/<id>" — 파일이 아니라 표시. 미리보기(studio-media)·굽기(ffmpeg) 때 서버에 물어
//  잠깐만 열리는 주소(서명 주소)를 받아 그 주소에서 필요한 부분만 읽는다. 받은 주소는 몇 시간 기억해 다시 쓴다
const server = require("./server");

const PREFIX = "gsremote:";
const isRemote = (p) => typeof p === "string" && p.startsWith(PREFIX);
const keyOf = (p) => String(p).slice(PREFIX.length); // "drone/<id>"
const pathOf = (kind, id) => `${PREFIX}${kind}/${String(id).replace(/[^\w-]/g, "")}`;

const cache = new Map(); // key → { url, until }
const pending = new Map();
const LIFE = 4 * 3600 * 1000; // 서버 주소는 6시간 — 넉넉히 4시간만 쓴다

/** 서명 주소 받기 (서버가 회원·권한을 확인한다) */
async function urlFor(p) {
  const key = keyOf(p);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.url;
  if (!pending.has(key)) {
    const [kind, id] = key.split("/");
    pending.set(key, server.call(`/api/studio/video/stock?type=${encodeURIComponent(kind)}-url&id=${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r || !r.success || !r.url) throw new Error((r && r.error) || "공실뉴스 자료를 불러오지 못했어요.");
        cache.set(key, { url: r.url, until: Date.now() + LIFE });
        return r.url;
      })
      .finally(() => pending.delete(key)));
  }
  return pending.get(key);
}
/** 굽기 전에 한꺼번에 받아 둔다 — 그 뒤로는 urlSync 로 */
async function prefetch(paths) {
  await Promise.all([...new Set((paths || []).filter(isRemote))].map((p) => urlFor(p)));
}
const urlSync = (p) => {
  const hit = cache.get(keyOf(p));
  return hit ? hit.url : "";
};

module.exports = { PREFIX, isRemote, pathOf, urlFor, prefetch, urlSync };

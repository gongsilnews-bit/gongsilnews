/* 파일 다리 (2026-10-28 사장님: 전용 크롬 싫어 — 영상 올리기도 평소 크롬 + 도우미)
   유튜브 화면의 content script 는 https 페이지 안이라 PC 안 창구(http://127.0.0.1)에서 큰 파일을 못 받는다.
   확장 페이지(이 창)는 받을 수 있어서, 받은 파일을 부모 창(유튜브)에 postMessage 로 그대로 넘긴다 (수백 MB도 복사 없이).
   주소: file-bridge.html?token=…&name=…&type=…  → 부모에 { gsFile: token, file } 또는 { gsFile: token, error } */
const PORTS = [47615, 47616, 47617, 47618, 47619]; // bg.js · 앱 helper-server.js 와 같은 번호
const q = new URLSearchParams(location.search);
const token = q.get("token") || "";
const name = q.get("name") || "video.mp4";
const type = q.get("type") || "application/octet-stream";
// 넘겨 줄 부모 창 — 우리 도우미가 영상을 넣는 곳만
const ALLOWED = ["https://studio.youtube.com", "https://www.instagram.com", "https://www.threads.com", "https://www.threads.net", "https://www.facebook.com"];
const PARENT = ALLOWED.includes(q.get("origin") || "") ? q.get("origin") : ALLOWED[0];

(async () => {
  for (const p of PORTS) {
    try {
      const r = await fetch(`http://127.0.0.1:${p}/gs-helper/file?token=${encodeURIComponent(token)}`, { cache: "no-store", headers: { "X-GS-Helper": "1" } });
      if (!r.ok) continue;
      const blob = await r.blob();
      parent.postMessage({ gsFile: token, file: new File([blob], name, { type }) }, PARENT);
      return;
    } catch (_) {
      /* 이 번호엔 앱이 없다 — 다음 번호 */
    }
  }
  parent.postMessage({ gsFile: token, error: "공실마케팅 앱에서 파일을 받지 못했어요. 앱이 켜져 있는지 확인해 주세요." }, PARENT);
})();

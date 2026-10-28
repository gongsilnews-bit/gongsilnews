// 모션그래픽 틀 공통 (2026-10-28) — 크기·글꼴·색·사진 준비, 움직임 계산
//  틀은 window.__setup(data) → Promise, window.__seek(t), window.__SFX = [{ t, name, vol }] (효과음, studio-app/src/video/sfx)
(function () {
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const M = {
    D: {},
    W: 1080,
    H: 1920,
    u: 10.8,
    vertical: true,
    $: (id) => document.getElementById(id),
    clamp,
    seg: (t, a, b) => clamp((t - a) / (b - a)),
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    lerp: (a, b, x) => a + (b - a) * x,
    /** 크기·글꼴·색 — 모든 틀이 같은 규칙 */
    setup(data) {
      const D = (M.D = data || {});
      M.W = D.w || 1080;
      M.H = D.h || 1920;
      M.vertical = M.H > M.W;
      M.u = (M.vertical ? M.W : M.H * 0.95) / 100;
      const st = M.$("stage");
      st.style.width = M.W + "px";
      st.style.height = M.H + "px";
      st.style.setProperty("--u", M.u + "px");
      st.style.setProperty("--pad", M.u * 6 + "px");
      st.style.setProperty("--accent", D.accent || "#E8590C");
      if (D.fontUrl) {
        const f = document.createElement("style");
        f.textContent = `@font-face { font-family: "GsFont"; src: url("${D.fontUrl}"); font-weight: 100 900; }`;
        document.head.appendChild(f);
      }
      const img = new Promise((res) => { if (!D.photo) return res(); const im = new Image(); im.onload = im.onerror = res; im.src = D.photo; });
      return img;
    },
    /** 배경 — 사진 또는 영상 (영상은 장면마다 그 시각으로 맞춰 찍는다) */
    bg(el) {
      const D = M.D;
      if (D.overlay) return Promise.resolve(); // 투명 겹치기 — 배경은 편집기의 원본 영상
      if (D.video) {
        const v = document.createElement("video");
        v.muted = true;
        v.playsInline = true;
        v.preload = "auto";
        v.src = D.video;
        Object.assign(v.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" });
        el.appendChild(v);
        M.vid = v;
        return new Promise((res) => { v.onloadeddata = v.onerror = () => res(); });
      }
      el.style.backgroundImage = D.photo ? `url("${D.photo}")` : "linear-gradient(135deg,#1a3a6b,#0b1220)";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      return Promise.resolve();
    },
    bgSeek(t) {
      const v = M.vid;
      if (!v) return Promise.resolve();
      const dur = v.duration || 0;
      const want = dur ? ((M.D.videoStart || 0) + t) % dur : 0;
      if (Math.abs(v.currentTime - want) < 0.001) return Promise.resolve();
      return new Promise((res) => { const done = () => { v.removeEventListener("seeked", done); res(); }; v.addEventListener("seeked", done); v.currentTime = want; setTimeout(done, 1500); });
    },
    /** 글을 넣고, 비면 그 칸을 숨긴다 */
    text(id, v) { const el = M.$(id); if (!el) return; el.textContent = v || ""; el.style.display = v ? "" : "none"; },
    /** "20억" → { n: 20, unit: "억" } — 숫자 올라가기용 (단순한 값만) */
    count(price) {
      const m = /^(\d+(?:\.\d+)?)\s*(억|만원|만)$/.exec(String(price || "").replace(/,/g, "").trim());
      return m ? { n: Number(m[1]), unit: m[2], dec: (m[1].split(".")[1] || "").length } : null;
    },
  };
  window.M = M;
})();

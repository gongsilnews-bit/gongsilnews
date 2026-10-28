// 장면 틀 공통 (2026-10-28) — 범용 장면들이 같이 쓰는 준비·타임라인 규칙 (Anime.js)
//  data: { title 짧은 문구, sub 둘째 줄, highlight 강조 낱말, num·unit·label 숫자, items[] 목록, seconds 길이 }
(function () {
  const S = {
    tl: null,
    /** 기본 준비 — 배경·글꼴·크기, 그리고 배경 천천히 확대 */
    async start(data) {
      const p = M.setup(data);
      await M.bg(M.$("bg"));
      await p;
      S.tl = anime.createTimeline({ autoplay: false, defaults: { ease: "outExpo" } });
      S.tl.add(M.$("bg"), { scale: [1.1, 1.02], duration: (M.D.seconds || 3) * 1000, ease: "linear" }, 0);
      // 타임라인은 then 이 있어 await 하면 끝날 때까지 기다린다 — 돌려주지 않고 S.tl 로 쓴다
    },
    /** 나올 차례 전에는 숨김 */
    hide(...els) { anime.utils.set(els.flat().filter(Boolean), { opacity: 0 }); },
    /** 글자를 한 자씩 span 으로 */
    chars(el, text) { el.textContent = ""; for (const c of String(text || "")) { const s = document.createElement("span"); s.style.display = "inline-block"; s.textContent = c === " " ? " " : c; el.appendChild(s); } return [...el.children]; },
    /** 낱말을 span 으로 (강조 낱말은 hl) */
    words(el, text, hl) { el.textContent = ""; return String(text || "").split(/\s+/).filter(Boolean).map((w) => { const s = document.createElement("span"); s.style.display = "inline-block"; s.style.marginRight = ".28em"; s.textContent = w; if (hl && w.includes(hl)) s.className = "hl"; el.appendChild(s); return s; }); },
  };
  window.S = S;
  window.__seek = async (t) => { await M.bgSeek(t); if (S.tl) S.tl.seek(Math.min(t * 1000, S.tl.duration)); };
})();

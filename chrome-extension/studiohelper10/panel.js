/* 공실스튜디오 도우미 상자 — SNS 글쓰기 화면 오른쪽 아래에 뜬다 (사이트 모양과 섞이지 않게 shadow DOM)
   자동으로 못 한 단계는 이 상자의 단추로 회원이 이어서 한다: [글 넣기] [글 복사] [사진 넣기] [다시 채우기] */
(() => {
  "use strict";
  if (self.GSPanel) return;

  const CSS = `
  :host { all: initial; }
  .box { position: fixed; left: 18px; bottom: 18px; width: 340px; max-height: 76vh; overflow: auto; z-index: 2147483647;
    background: #fff; color: #111827; border: 1px solid #d1d5db; border-radius: 14px; box-shadow: 0 18px 48px rgba(0,0,0,.28);
    font: 13px/1.55 "Malgun Gothic","Apple SD Gothic Neo",sans-serif; }
  .hd { display: flex; align-items: center; gap: 8px; padding: 11px 14px; background: #1a3a6b; color: #fff; border-radius: 14px 14px 0 0; position: sticky; top: 0; cursor: move; user-select: none; }
  .box.mini .bd { display: none; }
  .box.mini .hd { border-radius: 14px; }
  .hd b { flex: 1; font-size: 13.5px; }
  .x { background: transparent; border: 0; color: #fff; font-size: 18px; cursor: pointer; line-height: 1; }
  .bd { padding: 12px 14px 14px; }
  .st { padding: 9px 11px; border-radius: 9px; background: #eff6ff; color: #1e3a8a; font-weight: 700; margin-bottom: 10px; white-space: pre-line; }
  .st.ok { background: #ecfdf5; color: #065f46; }
  .st.warn { background: #fff7ed; color: #9a3412; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0; }
  button.b { padding: 7px 11px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; color: #111827; font: inherit; font-weight: 700; cursor: pointer; }
  button.b.p { background: #16a34a; border-color: #16a34a; color: #fff; }
  .tx { width: 100%; box-sizing: border-box; min-height: 90px; max-height: 160px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; font: inherit; resize: vertical; color: #111827; background: #f9fafb; }
  .lab { font-weight: 800; margin-top: 10px; display: flex; align-items: center; justify-content: space-between; }
  .ph { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 4px; }
  .ph img { width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; flex: 0 0 auto; }
  .note { font-size: 11.5px; color: #6b7280; margin-top: 8px; }`;

  /** opts: { label, texts: string[], photos: dataUrl[], actions: { fillText(i), copy(i), addPhotos(), retry() } } */
  function open(opts) {
    document.getElementById("gs-studio-helper")?.remove();
    const host = document.createElement("div");
    host.id = "gs-studio-helper";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style><div class="box"><div class="hd" title="끌어서 옮기기"><b></b><button class="x mn" title="접기·펴기">–</button><button class="x cl" title="닫기">×</button></div><div class="bd">
      <div class="st"></div><div class="texts"></div>
      <div class="lab"><span class="pl"></span><button class="b ap">사진 넣기</button></div><div class="ph"></div>
      <div class="row"><button class="b re">처음부터 다시 채우기</button></div>
      <div class="note">[공유하기]·[게시]는 도우미가 누르지 않아요. 확인하고 직접 눌러 주세요.</div></div></div>`;
    root.querySelector(".hd b").textContent = `공실스튜디오 도우미 · ${opts.label} · v${chrome.runtime.getManifest().version}`; // 판 번호 — ↻로 새 판이 들어갔는지 보이게
    root.querySelector(".cl").onclick = () => host.remove();
    // 끌어서 옮기기 · 접기 — 자리는 이 사이트에 기억 (2026-10-23 사장님)
    const box = root.querySelector(".box");
    const POS = "gs-helper-pos";
    const place = (x, y) => {
      const w = box.offsetWidth || 340, h = box.offsetHeight || 60;
      x = Math.min(Math.max(0, x), innerWidth - Math.min(w, 120));
      y = Math.min(Math.max(0, y), innerHeight - 44);
      Object.assign(box.style, { left: x + "px", top: y + "px", bottom: "auto", right: "auto" });
    };
    try { const s = JSON.parse(localStorage.getItem(POS) || "null"); if (s) requestAnimationFrame(() => place(s.x, s.y)); if (s && s.mini) box.classList.add("mini"); } catch (_) {}
    const keep = () => { try { const r = box.getBoundingClientRect(); localStorage.setItem(POS, JSON.stringify({ x: r.left, y: r.top, mini: box.classList.contains("mini") })); } catch (_) {} };
    root.querySelector(".mn").onclick = (e) => { e.stopPropagation(); box.classList.toggle("mini"); e.target.textContent = box.classList.contains("mini") ? "+" : "–"; keep(); };
    if (box.classList.contains("mini")) root.querySelector(".mn").textContent = "+";
    root.querySelector(".hd").addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      const r = box.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      const move = (ev) => place(ev.clientX - dx, ev.clientY - dy);
      const up = () => { removeEventListener("pointermove", move, true); removeEventListener("pointerup", up, true); keep(); };
      addEventListener("pointermove", move, true);
      addEventListener("pointerup", up, true);
      e.preventDefault();
    });
    const texts = root.querySelector(".texts");
    opts.texts.forEach((t, i) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `<div class="lab"><span></span><span class="row" style="margin:0"><button class="b p fi">글 넣기</button><button class="b cp">복사</button></span></div><textarea class="tx" readonly></textarea>`;
      wrap.querySelector(".lab span").textContent = opts.texts.length > 1 ? (i === 0 ? "첫 글" : `이어 쓰기 ${i}`) : "글";
      wrap.querySelector("textarea").value = t;
      wrap.querySelector(".fi").onclick = () => opts.actions.fillText(i);
      wrap.querySelector(".cp").onclick = async (e) => {
        try { await navigator.clipboard.writeText(t); e.target.textContent = "복사됨 ✓"; setTimeout(() => (e.target.textContent = "복사"), 1500); } catch (_) { e.target.textContent = "복사 안 됨"; }
      };
      texts.appendChild(wrap);
    });
    root.querySelector(".pl").textContent = `사진 ${opts.photos.length}장`;
    const ph = root.querySelector(".ph");
    for (const u of opts.photos) { const im = document.createElement("img"); im.src = u; ph.appendChild(im); }
    if (!opts.photos.length) root.querySelector(".ap").style.display = "none";
    root.querySelector(".ap").onclick = () => opts.actions.addPhotos();
    root.querySelector(".re").onclick = () => opts.actions.retry();
    document.documentElement.appendChild(host);
    const st = root.querySelector(".st");
    return {
      status(text, kind = "") { st.textContent = text; st.className = "st" + (kind ? " " + kind : ""); },
      close() { host.remove(); },
    };
  }

  self.GSPanel = { open };
})();

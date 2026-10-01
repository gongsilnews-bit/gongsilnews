/* ══════════════════════════════════════════════════════════════
   하단 바 접기 · 글 도착 알림

   1) [🎨 AI 이미지 만들기 ▾] — 스타일·설명 칸을 평소엔 접어 두고 누를 때만 펼친다
      (하단 바가 글 보는 칸을 가리지 않게).
   2) GWArrival.notify(doc, view) — 새 초안이 들어오면 글 칸에 파란 테두리를 반짝이고
      "🖱️ 마우스 휠을 아래로 내려서 글을 확인하세요" 안내를 띄운다. 끝까지 내리면 사라진다.
   ══════════════════════════════════════════════════════════════ */
(function () {
  document.querySelectorAll(".image-opts-toggle").forEach((btn) => {
    const box = document.getElementById(btn.dataset.target);
    if (!box) return;
    const label = btn.textContent.replace(/\s*[▾▴]\s*$/, "");
    btn.addEventListener("click", () => {
      const open = box.classList.toggle("hidden") === false;
      btn.setAttribute("aria-expanded", String(open));
      btn.classList.toggle("open", open);
      btn.textContent = `${label} ${open ? "▴" : "▾"}`;
    });
  });

  const scroller = document.querySelector(".scroll-area");
  if (!scroller) return;

  /* 높이 0 짜리 sticky 받침 — 글 칸 맨 아래에 붙어 있고 자리를 차지하지 않는다 */
  const dock = document.createElement("div");
  dock.className = "arrival-dock";
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "arrival-pill hidden";
  pill.textContent = "🖱️ 마우스 휠을 아래로 내려서 글을 확인하세요";
  dock.appendChild(pill);
  scroller.appendChild(dock);

  let watchView = null;

  const nearBottom = () => scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 48;
  const hide = () => { pill.classList.add("hidden"); watchView = null; };
  const update = () => {
    if (!watchView) return;
    if (!watchView.classList.contains("active")) { pill.classList.add("hidden"); return; }
    if (nearBottom()) { hide(); return; }
    pill.classList.remove("hidden");
  };

  scroller.addEventListener("scroll", update, { passive: true });
  pill.addEventListener("click", () => {
    scroller.scrollBy({ top: Math.round(scroller.clientHeight * 0.8), behavior: "smooth" });
  });
  /* 다른 탭으로 갔다가 돌아오면 다시 판단한다 (탭 화면의 class 만 본다 — 안내 자체의 변화는 보지 않게) */
  const viewObserver = new MutationObserver(() => requestAnimationFrame(update));
  document.querySelectorAll(".view").forEach((v) => viewObserver.observe(v, { attributes: true, attributeFilter: ["class"] }));

  window.GWArrival = {
    notify(doc, view) {
      if (doc) {
        doc.classList.remove("arrived");
        void doc.offsetWidth; // 애니메이션을 처음부터 다시
        doc.classList.add("arrived");
      }
      watchView = view || null;
      if (view && view.classList.contains("active")) scroller.scrollTop = 0;
      requestAnimationFrame(update);
    },
  };
})();

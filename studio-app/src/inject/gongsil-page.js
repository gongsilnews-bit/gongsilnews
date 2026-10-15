/* ══════════════════════════════════════════════════════════════
   공실열람 상세 화면에서 매물 읽기·캡처 준비 (앱의 안 보이는 창에 넣어 실행)

   크롬 확장 gongsilwriter30/content-gongsil.js 를 그대로 옮겼다.
   확장의 메시지 대신 window.__gongsilStudio 로 부른다.
   공실열람 화면이 바뀌면 확장과 이 파일을 함께 고친다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";
  if (window.__gongsilStudio) return;

  const DETAIL = "#detail-scroll-container";
  const DATA_ATTR = "data-article-source";
  const ID_ATTR = "data-vacancy-id";

  function cleanValue(raw) {
    if (!raw) return "";
    let t = String(raw).replace(/ /g, " ");
    const notice = t.search(/💡|위치\s*정보\s*안내/);
    if (notice > 0) t = t.slice(0, notice);
    return t.replace(/\s+/g, " ").replace(/\s*-\s*$/, "").trim();
  }

  /* 상세 표: 매물 종류마다 항목이 달라 라벨을 찍어 찾지 않고 칸을 순서대로 짝지어 전부 읽는다 */
  function collectFields(detail) {
    const grids = Array.from(detail.querySelectorAll("div")).filter((d) => {
      const s = d.style;
      return s && s.display === "grid" && (s.gridTemplateColumns || "").includes("110px");
    });
    const seen = new Set();
    const fields = [];
    for (const grid of grids) {
      const cells = Array.from(grid.children);
      for (let i = 0; i + 1 < cells.length; i += 2) {
        const label = (cells[i].innerText || cells[i].textContent || "").trim();
        const value = cleanValue(cells[i + 1].innerText || cells[i + 1].textContent || "");
        if (!label || label.length > 20 || !value || value === "-") continue;
        if (seen.has(label)) continue;
        seen.add(label);
        fields.push({ label, value });
      }
    }
    return fields;
  }

  function collectInfra(detail) {
    const heading = Array.from(detail.querySelectorAll("div")).find((d) => (d.textContent || "").trim() === "주변환경");
    if (!heading || !heading.nextElementSibling) return "";
    const parts = [];
    for (const row of Array.from(heading.nextElementSibling.children)) {
      const cat = (row.firstElementChild?.innerText || "").trim();
      const places = Array.from(row.querySelectorAll("div"))
        .filter((c) => c.children.length === 0)
        .map((c) => (c.innerText || "").trim())
        .filter(Boolean);
      if (cat && places.length) parts.push(`${cat}: ${places.join(", ")}`);
    }
    return parts.join(" / ");
  }

  /* 매물 등록 사진은 data-images 로만 읽는다 (지도 타일·아이콘이 섞이지 않게) */
  function collectImages(detail) {
    const raw = detail.getAttribute("data-images");
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(Boolean).map((u) => (String(u).startsWith("/") ? location.origin + u : String(u)));
    } catch {
      return [];
    }
  }

  function collectFromDom(detail) {
    const h2 = detail.querySelector("h2");
    const h1 = detail.querySelector("h1");
    const themes = Array.from(detail.querySelectorAll("span"))
      .map((s) => (s.textContent || "").trim())
      .filter((t) => t.startsWith("#") && t.length > 1 && t.length < 25);
    return {
      vacancyId: detail.getAttribute(ID_ATTR) || "",
      title: h2 ? cleanValue(h2.innerText) : "",
      priceText: h1 ? cleanValue(h1.innerText) : "",
      fields: collectFields(detail),
      themes: Array.from(new Set(themes)),
      infra: collectInfra(detail),
      images: collectImages(detail),
      url: location.href,
    };
  }

  function collectVacancy() {
    const detail = document.querySelector(DETAIL);
    if (!detail) return { ok: false, reason: "공실 상세 화면이 열리지 않았습니다." };
    const raw = detail.getAttribute(DATA_ATTR);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return { ok: true, vacancy: Object.assign({ url: location.href }, parsed, { vacancyId: parsed.vacancyId || detail.getAttribute(ID_ATTR) || "" }) };
      } catch {}
    }
    const vacancy = collectFromDom(detail);
    if (!vacancy.vacancyId && !vacancy.fields.length) return { ok: false, reason: "공실 상세를 읽지 못했습니다." };
    return { ok: true, vacancy };
  }

  /* ── 캡처 준비: 찍을 요소를 가운데로 굴려 놓고 화면 좌표를 돌려준다 ── */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function findLeafByText(root, text) {
    return Array.from(root.querySelectorAll("div")).find((elm) => elm.children.length === 0 && (elm.textContent || "").trim() === text);
  }

  function findSectionMedia(detail, label) {
    const heading = findLeafByText(detail, label);
    if (!heading || !heading.parentElement) return null;
    let sibling = heading.nextElementSibling;
    while (sibling) {
      const r = sibling.getBoundingClientRect();
      if (r.width > 100 && r.height > 120) return sibling.firstElementChild || sibling;
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  function findShotTarget(target) {
    const detail = document.querySelector(DETAIL);
    if (!detail) return null;
    if (target === "proof") return detail;
    if (target === "map") return detail.querySelector("#gongsil-detail-map") || findSectionMedia(detail, "위치정보");
    if (target === "roadview") return detail.querySelector("#gongsil-detail-roadview") || findSectionMedia(detail, "로드뷰");
    return null;
  }

  async function ensureMediaTab(target) {
    if (target === "proof" || findShotTarget(target)) return;
    const detail = document.querySelector(DETAIL);
    if (!detail) return;
    const tab = findLeafByText(detail, "공실광고정보") || findLeafByText(detail, "세부정보");
    if (!tab) return;
    tab.click();
    for (let i = 0; i < 12 && !findShotTarget(target); i += 1) await wait(150);
  }

  function centerInsideDetail(detail, elm) {
    if (elm === detail) {
      detail.scrollTop = 0;
      return;
    }
    const detailRect = detail.getBoundingClientRect();
    const elmRect = elm.getBoundingClientRect();
    const centeredTop = detail.scrollTop + (elmRect.top - detailRect.top) - Math.max(0, (detail.clientHeight - elmRect.height) / 2);
    detail.scrollTop = Math.max(0, centeredTop);
  }

  async function prepareShot(target) {
    await ensureMediaTab(target);
    const detail = document.querySelector(DETAIL);
    const elm = findShotTarget(target);
    if (!elm) return { ok: false, reason: `${target} 요소를 찾지 못했습니다.` };
    centerInsideDetail(detail, elm);
    /* 지도·로드뷰는 굴린 뒤 타일이 다시 그려질 시간이 필요하다 */
    await wait(target === "proof" ? 380 : 1500);

    const r = elm.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) return { ok: false, reason: `${target} 이(가) 화면에 보이지 않습니다.` };

    let rect;
    if (target === "proof") {
      /* 왼쪽 목록부터 상세 패널까지 가로로 넉넉하게, 16:9 */
      const left = Math.max(0, r.left > 200 ? 0 : r.left);
      const right = Math.min(window.innerWidth, Math.max(r.right, left + 640));
      const width = Math.max(480, right - left);
      rect = {
        x: Math.round(left),
        y: Math.max(0, Math.round(r.top)),
        width: Math.round(Math.min(width, window.innerWidth - left)),
        height: Math.round(Math.min((width * 9) / 16, window.innerHeight - Math.max(0, r.top))),
      };
    } else {
      rect = { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)), width: Math.round(r.width), height: Math.round(r.height) };
    }
    return { ok: true, rect };
  }

  function restoreScroll() {
    const detail = document.querySelector(DETAIL);
    if (detail) detail.scrollTop = 0;
    return { ok: true };
  }

  function isReady() {
    const detail = document.querySelector(DETAIL);
    return Boolean(detail && (detail.getAttribute(ID_ATTR) || detail.querySelector("h2")));
  }

  window.__gongsilStudio = { isReady, collectVacancy, prepareShot, restoreScroll };
})();

/* ══════════════════════════════════════════════════════════════
   공실열람 페이지 — 작업창이 시키는 일만 한다

   버튼도 모달도 심지 않는다. 그건 작업창(panel.js)의 몫이다.
   여기는 "펼쳐 놓은 매물 내놔" 한 가지에만 답한다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  /* ══════════════════════════════════════════════════════════════
     값 다듬기

     소재지 칸에는 주소 밑에 "💡 위치 정보 안내" 박스가 같이 들어 있다.
     그 부분만 떼어내고 나머지는 살린다 (상세설명처럼 긴 값이 잘리면 안 된다).
     ══════════════════════════════════════════════════════════════ */
  function cleanValue(raw) {
    if (!raw) return "";
    let t = String(raw).replace(/ /g, " ");
    const notice = t.search(/💡|위치\s*정보\s*안내/);
    if (notice > 0) t = t.slice(0, notice);
    return t.replace(/\s+/g, " ").replace(/\s*-\s*$/, "").trim();
  }

  /* ══════════════════════════════════════════════════════════════
     상세 표를 통째로 읽는다

     이 표는 매물 종류마다 항목이 달라지는 동적 표다(라벨이 마흔 가지가 넘는다).
     그래서 라벨 이름을 찍어 찾지 않는다. 표의 칸을 순서대로 짝지어 전부 가져온다.
     화면에 보이는 항목은 전부 기사에 쓸 수 있어야 한다.
     ══════════════════════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════════════════════
     주변환경

     제목 아래에 [카테고리] + [장소 칩 여러 개] 줄이 이어진다.
     표가 아니라 따로 읽는다.
     ══════════════════════════════════════════════════════════════ */
  function collectInfra(detail) {
    const heading = Array.from(detail.querySelectorAll("div")).find(
      (d) => (d.textContent || "").trim() === "주변환경"
    );
    if (!heading || !heading.nextElementSibling) return "";

    const parts = [];
    for (const row of Array.from(heading.nextElementSibling.children)) {
      const cat = (row.firstElementChild?.innerText || "").trim();
      /* 칩은 자식이 없는 잎 노드다 */
      const places = Array.from(row.querySelectorAll("div"))
        .filter((c) => c.children.length === 0)
        .map((c) => (c.innerText || "").trim())
        .filter(Boolean);
      if (cat && places.length) parts.push(`${cat}: ${places.join(", ")}`);
    }
    return parts.join(" / ");
  }

  /* ── 매물 등록 사진 ──
     상세 패널이 data-images 로 실어준다. 지도 타일이나 아이콘이 섞이지 않는
     유일하게 확실한 통로다. 화면의 <img> 를 긁지 않는다. */
  function collectImages(detail) {
    const raw = detail.getAttribute("data-images");
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(Boolean)
        .map((u) => (String(u).startsWith("/") ? location.origin + u : String(u)));
    } catch (e) {
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
      vacancyId: detail.getAttribute(GW.GONGSIL.ID_ATTR) || "",
      title: h2 ? cleanValue(h2.innerText) : "",
      priceText: h1 ? cleanValue(h1.innerText) : "",
      fields: collectFields(detail),
      themes: Array.from(new Set(themes)),
      infra: collectInfra(detail),
      images: collectImages(detail),
      url: location.href,
    };
  }

  /* ══════════════════════════════════════════════════════════════
     캡쳐 준비

     작업창은 화면을 직접 볼 수 없다. 그래서 여기서
     ① 찍을 요소를 화면 가운데로 굴려 놓고
     ② 그 요소가 지금 화면 어디에 있는지 좌표를 돌려준다.
     작업창이 그 좌표로 화면을 찍어 잘라낸다.
     ══════════════════════════════════════════════════════════════ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function findLeafByText(root, text) {
    return Array.from(root.querySelectorAll("div")).find(
      (elm) => elm.children.length === 0 && (elm.textContent || "").trim() === text
    );
  }

  /*
     일반 공실은 고정 ID가 있지만 경·공매 화면은 같은 지도·로드뷰에 ID가 없다.
     ID가 없을 때는 섹션 제목 뒤의 실제 미디어 상자를 찾는다. 페이지 전체의
     div[id*='map'] 를 집으면 우측 대형 지도를 잘못 찍을 수 있으므로 상세 패널
     밖은 절대 검색하지 않는다.
  */
  function findSectionMedia(detail, label) {
    const heading = findLeafByText(detail, label);
    if (!heading || !heading.parentElement) return null;

    let sibling = heading.nextElementSibling;
    while (sibling) {
      const r = sibling.getBoundingClientRect();
      if (r.width > 100 && r.height > 120) {
        return sibling.firstElementChild || sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  function findShotTarget(target) {
    const detail = document.querySelector(GW.GONGSIL.DETAIL);
    if (!detail) return null;
    if (target === "proof") return detail;

    if (target === "map") {
      return detail.querySelector("#gongsil-detail-map") || findSectionMedia(detail, "위치정보");
    }

    if (target === "roadview") {
      return detail.querySelector("#gongsil-detail-roadview") || findSectionMedia(detail, "로드뷰");
    }

    return null;
  }

  async function ensureMediaTab(target) {
    if (target === "proof" || findShotTarget(target)) return;

    const detail = document.querySelector(GW.GONGSIL.DETAIL);
    if (!detail) return;

    /* 일반 공실은 공실광고정보, 경·공매는 세부정보 탭에 미디어가 있다. */
    const tab = findLeafByText(detail, "공실광고정보") || findLeafByText(detail, "세부정보");
    if (!tab) return;

    tab.click();

    /* React 재렌더와 카카오 지도 초기화를 기다린다. */
    for (let i = 0; i < 12 && !findShotTarget(target); i += 1) {
      await wait(150);
    }
  }

  function centerInsideDetail(detail, elm) {
    if (elm === detail) {
      detail.scrollTop = 0;
      return;
    }

    const detailRect = detail.getBoundingClientRect();
    const elmRect = elm.getBoundingClientRect();
    const centeredTop =
      detail.scrollTop +
      (elmRect.top - detailRect.top) -
      Math.max(0, (detail.clientHeight - elmRect.height) / 2);
    detail.scrollTop = Math.max(0, centeredTop);
  }

  async function prepareShot(target) {
    if (!["proof", "map", "roadview"].includes(target)) {
      return { ok: false, reason: "모르는 캡쳐 대상: " + target };
    }

    await ensureMediaTab(target);

    const detail = document.querySelector(GW.GONGSIL.DETAIL);
    const elm = findShotTarget(target);
    if (!elm) return { ok: false, reason: `${target} 요소를 찾지 못했습니다.` };

    if (target === "proof") {
      /* 검증 캡쳐는 매물 맨 위에서 찍는다 */
      centerInsideDetail(detail, elm);
    } else {
      centerInsideDetail(detail, elm);
    }

    /* 지도·로드뷰는 굴린 뒤 타일이 다시 그려질 시간이 필요하다 */
    await wait(target === "proof" ? 380 : 900);

    const r = elm.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) {
      return { ok: false, reason: `${target} 이(가) 화면에 보이지 않습니다.` };
    }

    let rect;
    if (target === "proof") {
      /* 왼쪽 목록부터 상세 패널까지 가로로 넉넉하게 — 16:9 는 작업창이 맞춘다 */
      const left = Math.max(0, r.left > 200 ? 0 : r.left);
      const right = Math.min(window.innerWidth, Math.max(r.right, left + 640));
      const width = Math.max(480, right - left);
      rect = {
        left: Math.round(left),
        top: Math.max(0, Math.round(r.top)),
        width: Math.round(Math.min(width, window.innerWidth - left)),
        height: Math.round(Math.min(width * 9 / 16, window.innerHeight - Math.max(0, r.top))),
      };
    } else {
      rect = {
        left: Math.max(0, Math.round(r.left)),
        top: Math.max(0, Math.round(r.top)),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    }

    return {
      ok: true,
      rect,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      },
    };
  }

  /* 캡쳐가 끝나면 매물 맨 위로 되돌려 놓는다 */
  function restoreScroll() {
    const detail = document.querySelector(GW.GONGSIL.DETAIL);
    if (detail) detail.scrollTop = 0;
    return { ok: true };
  }

  /* ══════════════════════════════════════════════════════════════
     펼쳐 놓은 매물 하나를 내놓는다
     ══════════════════════════════════════════════════════════════ */
  function collectVacancy() {
    const detail = document.querySelector(GW.GONGSIL.DETAIL);
    if (!detail) {
      return { ok: false, reason: "펼쳐 놓은 매물이 없습니다. 공실열람에서 매물을 하나 열어 주세요." };
    }

    /* 0순위 — 페이지가 정식으로 실어준 값이 있으면 그것만 쓴다 */
    const raw = detail.getAttribute(GW.GONGSIL.DATA_ATTR);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ok: true,
          vacancy: Object.assign({ url: location.href }, parsed, {
            vacancyId: parsed.vacancyId || detail.getAttribute(GW.GONGSIL.ID_ATTR) || "",
          }),
        };
      } catch (e) {
        console.warn("[공실뉴스] data-article-source 를 읽지 못해 화면에서 읽습니다.", e);
      }
    }

    const vacancy = collectFromDom(detail);

    if (!vacancy.fields.length) {
      return {
        ok: false,
        reason: "매물 상세 표를 읽지 못했습니다. 매물이 다 펼쳐진 뒤에 다시 눌러 주세요.",
      };
    }

    return { ok: true, vacancy };
  }

  /* ══════════════════════════════════════════════════════════════
     작업창의 요청 받기
     ══════════════════════════════════════════════════════════════ */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GW_GET_VACANCY") {
      try {
        sendResponse(collectVacancy());
      } catch (e) {
        sendResponse({ ok: false, reason: "매물을 읽는 중 오류: " + e.message });
      }
      return true;
    }

    if (msg.type === "GW_PREPARE_SHOT") {
      prepareShot(msg.target)
        .then(sendResponse)
        .catch((e) => sendResponse({ ok: false, reason: e.message }));
      return true;
    }

    if (msg.type === "GW_RESTORE_SCROLL") {
      sendResponse(restoreScroll());
      return true;
    }

    return false;
  });
})();

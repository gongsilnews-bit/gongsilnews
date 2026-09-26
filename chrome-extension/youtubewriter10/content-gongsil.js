/* 열린 공실 상세 패널에서 확인된 매물 자료를 읽는다. */
(() => {
  "use strict";

  function clean(value) {
    return String(value || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  }

  function imagesFrom(detail, fallback = []) {
    const raw = detail.getAttribute("data-images");
    let values = fallback;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) values = parsed;
      } catch (_error) {
        /* 정식 속성이 깨졌으면 fallback을 쓴다. */
      }
    }
    if (!Array.isArray(values) || !values.length) {
      values = Array.from(detail.querySelectorAll("img"))
        .filter((image) => (image.naturalWidth || image.width || 0) >= 240 && (image.naturalHeight || image.height || 0) >= 150)
        .map((image) => image.currentSrc || image.src)
        .filter(Boolean);
    }
    return Array.from(new Set((values || []).filter(Boolean).map((url) => {
      const value = String(url);
      return value.startsWith("/") ? location.origin + value : value;
    })));
  }

  function fieldsFrom(detail) {
    const result = [];
    const seen = new Set();
    const grids = Array.from(detail.querySelectorAll("div")).filter((node) =>
      (node.style?.display === "grid") && String(node.style?.gridTemplateColumns || "").includes("110px")
    );
    for (const grid of grids) {
      const children = Array.from(grid.children);
      for (let index = 0; index + 1 < children.length; index += 2) {
        const label = clean(children[index].textContent);
        const value = clean(children[index + 1].textContent);
        if (!label || !value || value === "-" || label.length > 25 || seen.has(label)) continue;
        seen.add(label);
        result.push({ label, value });
      }
    }
    return result;
  }

  function collect() {
    const detail = document.querySelector(GYW.GONGSIL.DETAIL);
    if (!detail) return { ok: false, reason: "공실열람에서 매물을 하나 펼쳐 주세요." };

    const raw = detail.getAttribute(GYW.GONGSIL.DATA_ATTR);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ok: true,
          source: {
            ...parsed,
            type: "vacancy",
            vacancyId: parsed.vacancyId || detail.getAttribute(GYW.GONGSIL.ID_ATTR) || "",
            images: imagesFrom(detail, parsed.images),
            url: location.href,
          },
        };
      } catch (_error) {
        /* DOM fallback */
      }
    }

    const title = clean(detail.querySelector("h2")?.textContent || detail.querySelector("h1")?.textContent);
    const priceText = clean(detail.querySelector("h1")?.textContent);
    const themes = Array.from(detail.querySelectorAll("span"))
      .map((node) => clean(node.textContent))
      .filter((value) => value.startsWith("#") && value.length < 30);
    return {
      ok: true,
      source: {
        type: "vacancy",
        vacancyId: detail.getAttribute(GYW.GONGSIL.ID_ATTR) || "",
        title,
        priceText,
        fields: fieldsFrom(detail),
        themes: Array.from(new Set(themes)),
        images: imagesFrom(detail),
        url: location.href,
      },
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "GYW_GET_VACANCY") return false;
    try {
      sendResponse(collect());
    } catch (error) {
      sendResponse({ ok: false, reason: error.message || String(error) });
    }
    return true;
  });
})();

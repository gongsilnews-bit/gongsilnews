/* 열린 공실뉴스 기사 페이지에서 보이는 기사와 실제 사진을 읽는다. */
(() => {
  "use strict";

  function text(node) {
    return String(node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function meta(property, name) {
    return document.querySelector(`meta[property="${property}"]`)?.content ||
      document.querySelector(`meta[name="${name || property}"]`)?.content || "";
  }

  function bestRoot() {
    const candidates = [
      document.querySelector("article"),
      document.querySelector('[class*="articleContent"]'),
      document.querySelector('[class*="article-content"]'),
      document.querySelector("main"),
    ].filter(Boolean);
    return candidates.sort((a, b) => text(b).length - text(a).length)[0] || document.body;
  }

  function collect() {
    if (/\/gongsil(?:[/?#]|$)/.test(location.pathname)) {
      return { ok: false, reason: "현재 화면은 공실열람입니다. 자료 종류에서 공실 매물을 선택해 주세요." };
    }
    const root = bestRoot();
    const title = text(root.querySelector("h1")) || meta("og:title") || document.title;
    const paragraphs = Array.from(root.querySelectorAll("p"))
      .map(text)
      .filter((value) => value.length >= 12);
    const body = paragraphs.join("\n\n") || text(root);
    if (!title || body.length < 30) return { ok: false, reason: "현재 페이지에서 기사 본문을 찾지 못했습니다." };

    const images = [];
    const seen = new Set();
    const add = (url) => {
      if (!url) return;
      try {
        const absolute = new URL(url, location.href).href;
        if (!seen.has(absolute)) {
          seen.add(absolute);
          images.push(absolute);
        }
      } catch (_error) {}
    };
    add(meta("og:image"));
    for (const image of root.querySelectorAll("img")) {
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      if (width >= 240 && height >= 150) add(image.currentSrc || image.src);
    }

    const subtitle = text(root.querySelector('[class*="subtitle"]'));
    return {
      ok: true,
      source: {
        type: "article",
        title: title.replace(/\s*[|｜].*$/, "").trim(),
        subtitles: subtitle ? [subtitle] : [],
        body,
        images,
        url: location.href,
      },
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "GYW_GET_ARTICLE") return false;
    try {
      sendResponse(collect());
    } catch (error) {
      sendResponse({ ok: false, reason: error.message || String(error) });
    }
    return true;
  });
})();


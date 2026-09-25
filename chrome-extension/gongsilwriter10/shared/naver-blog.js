/* 네이버 블로그 탭과 글쓰기 탭을 구분하는 공통 규칙 */
(function initNaverBlog(global) {
  "use strict";

  const HOME_URL = "https://blog.naver.com/";
  const WRITE_URL = "https://blog.naver.com/GoBlogWrite.naver";

  function isNaverBlogUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      return url.protocol === "https:" && (
        url.hostname === "blog.naver.com" ||
        url.hostname === "blog.editor.naver.com"
      );
    } catch (_) {
      return false;
    }
  }

  function isLikelyWriteUrl(rawUrl) {
    if (!isNaverBlogUrl(rawUrl)) return false;
    const value = String(rawUrl).toLowerCase();
    return (
      value.includes("goblogwrite") ||
      value.includes("postwrite") ||
      value.includes("postwriteform") ||
      value.includes("redirect=write") ||
      value.includes("blog.editor.naver.com")
    );
  }

  function selectLikelyWriteTab(tabs) {
    return (Array.isArray(tabs) ? tabs : [])
      .filter((tab) => tab && tab.id && isLikelyWriteUrl(tab.url))
      .sort((a, b) => {
        if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
        return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      })[0] || null;
  }

  function splitParagraphs(body) {
    return String(body || "")
      .split(/\n{2,}|\n/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  /* 대표가 아닌 사진을 문단 사이 칸(0 = 첫 문단 앞, n = n번째 문단 뒤)에 배치한다.
     insertAfterParagraph가 있으면 그 칸, 없으면 두 문단마다 한 장씩, 남으면 글 끝. */
  function layoutMediaSlots(paragraphCount, media) {
    const slots = Array.from({ length: paragraphCount + 1 }, () => []);
    const automatic = [];

    (Array.isArray(media) ? media : []).forEach((item, index) => {
      if (!item || item.isCover) return;
      if (Number.isInteger(item.insertAfterParagraph)) {
        const slot = Math.max(0, Math.min(item.insertAfterParagraph, paragraphCount));
        slots[slot].push({ media: item, index });
      } else {
        automatic.push({ media: item, index });
      }
    });

    let autoIndex = 0;
    for (let slot = 2; slot < paragraphCount && autoIndex < automatic.length; slot += 2) {
      slots[slot].push(automatic[autoIndex]);
      autoIndex += 1;
    }
    while (autoIndex < automatic.length) {
      slots[paragraphCount].push(automatic[autoIndex]);
      autoIndex += 1;
    }
    return slots;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
  }

  /* 네이버 편집기에 차례로 붙여넣을 조각을 만든다.
     글 조각은 HTML(■ 소제목은 굵게), 사진은 media 배열의 위치만 담는다.
     글 조각이 연달아 오면 편집기가 앞 문단에 이어 붙이므로, 사진이 끼어들 때만 글을 끊는다. */
  function buildNaverBlocks(body, media) {
    const list = Array.isArray(media) ? media : [];
    const paragraphs = splitParagraphs(body);
    const slots = layoutMediaSlots(paragraphs.length, list);
    const blocks = [];
    let buffer = [];

    const flush = () => {
      if (!buffer.length) return;
      blocks.push({ type: "html", html: buffer.join("") });
      buffer = [];
    };
    const addImages = (indexes) => {
      if (!indexes.length) return;
      flush();
      indexes.forEach((index) => blocks.push({ type: "image", mediaIndex: index }));
    };

    const coverIndex = list.findIndex((item) => item && item.isCover);
    if (coverIndex >= 0) addImages([coverIndex]);
    addImages(slots[0].map((item) => item.index));
    paragraphs.forEach((paragraph, index) => {
      const text = escapeHtml(paragraph);
      buffer.push(paragraph.startsWith("■") ? `<p><b>${text}</b></p>` : `<p>${text}</p>`);
      addImages(slots[index + 1].map((item) => item.index));
    });
    flush();
    return blocks;
  }

  /* 발행 창 태그 칸용: # 제거, 중복 제거, 네이버 최대 30개 */
  function normalizeTags(keywords) {
    const seen = new Set();
    return (Array.isArray(keywords) ? keywords : [])
      .map((keyword) => String(keyword || "").replace(/^#+/, "").replace(/\s+/g, "").trim())
      .filter((keyword) => keyword && !seen.has(keyword) && seen.add(keyword))
      .slice(0, 30);
  }

  const api = {
    HOME_URL, WRITE_URL, isNaverBlogUrl, isLikelyWriteUrl, selectLikelyWriteTab,
    splitParagraphs, layoutMediaSlots, buildNaverBlocks, normalizeTags,
  };
  global.GWNaverBlog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);

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

  /* ── 블로그 디자인 ──
     네이버 편집기가 붙여넣기로 받아들이는 요소만 쓴다 (2026-09-25 실제 화면에서 확인):
     <blockquote> → 인용구(따옴표형), <hr> → 구분선, <table> → 표, 문단 정렬·글자색·크기·링크.
     굵게(<b>·<strong>·font-weight)는 붙여넣기로 적용되지 않으므로 소제목은 크기와 색으로 강조한다.
     붙여넣기 조각을 빈 문단으로 끝내지 않으면 다음 조각이 마지막 문단에 이어 붙고 글자색·크기도 번진다.
     문단 순서는 모든 디자인이 같다. 그래서 사진 위치(문단 사이 칸)가 미리보기와 어긋나지 않는다. */
  const DESIGNS = {
    basic: { label: "기본형", hint: "요약 인용구 · 매물표 · 큰 소제목. 어떤 매물에나 무난합니다." },
    magazine: { label: "매거진형", hint: "가운데 정렬 · 번호 소제목 · 핵심 문장 강조. 고급·신축 매물에 어울립니다." },
    qna: { label: "Q&A형", hint: "소제목을 질문으로, 본문을 답변으로. 질문형 검색에 유리합니다." },
    news: { label: "뉴스기사형", hint: "큰 리드문 · 기사체 · 공실뉴스 서명. 언론사 느낌을 살립니다." },
  };
  const ACCENT = "#2563eb";
  const MUTED = "#888888";
  const BLANK = "<p><br></p>";
  const CLOSING_TEXT = "매물 상세 정보와 문의는 공실뉴스에서 확인하실 수 있습니다.";
  const FACT_LABEL = /면적|층|방|욕실|입주|주차|방향|준공|관리비|보증금|월세|매매|전세|용도|종류|구조/;

  function isHeading(paragraph) {
    return String(paragraph).startsWith("■");
  }

  function stripHeading(paragraph) {
    return String(paragraph).replace(/^■\s*/, "");
  }

  /* 매물 핵심 정보 표: 금액 + 자주 보는 항목만 최대 8줄 */
  function factRows(vacancy) {
    if (!vacancy || typeof vacancy !== "object") return [];
    const rows = [];
    const seen = new Set();
    const push = (label, value) => {
      const text = value == null ? "" : String(value).trim();
      if (!label || !text || text === "-" || seen.has(label)) return;
      seen.add(label);
      rows.push([label, text]);
    };
    push("금액", vacancy.priceText);
    (Array.isArray(vacancy.fields) ? vacancy.fields : [])
      .filter((field) => field && FACT_LABEL.test(field.label || ""))
      .forEach((field) => push(field.label, field.value));
    return rows.slice(0, 8);
  }

  function listingUrl(vacancy) {
    const url = String(vacancy?.url || "");
    return /^https:\/\/([a-z0-9-]+\.)?gongsilnews\.com\//i.test(url) ? url : "";
  }

  function paragraphHtml(text, { align, size, color, bold } = {}) {
    let inner = escapeHtml(text);
    const styles = [
      size ? `font-size:${size}px` : "",
      color ? `color:${color}` : "",
      bold ? "font-weight:700" : "",
    ].filter(Boolean).join(";");
    if (styles) inner = `<span style="${styles}">${inner}</span>`;
    return align ? `<p style="text-align:${align}">${inner}</p>` : `<p>${inner}</p>`;
  }

  function quoteHtml(text) {
    return `<blockquote><p>${escapeHtml(text)}</p></blockquote>`;
  }

  function tableHtml(rows) {
    if (!rows.length) return "";
    const body = rows
      .map(([label, value]) => `<tr><td><b>${escapeHtml(label)}</b></td><td>${escapeHtml(value)}</td></tr>`)
      .join("");
    return `<table><tbody>${body}</tbody></table>`;
  }

  function linkHtml(url, text, align) {
    if (!url) return "";
    const style = align ? ` style="text-align:${align}"` : "";
    return `<p${style}><a href="${escapeHtml(url)}">${escapeHtml(text)}</a></p>`;
  }

  function firstSentence(text) {
    const match = /^(.+?[.!?])(\s|$)/.exec(String(text || "").trim());
    return match ? match[1] : String(text || "").trim();
  }

  /* 네이버 편집기에 차례로 붙여넣을 조각을 만든다.
     글 조각은 HTML, 사진은 media 배열의 위치만 담는다.
     글 조각은 사진이 끼어들 때만 끊고, 문단 뒤와 조각 끝에는 빈 문단을 둔다. */
  function buildNaverBlocks(body, media, options = {}) {
    const design = DESIGNS[options.design] ? options.design : "basic";
    const list = Array.isArray(media) ? media : [];
    const paragraphs = splitParagraphs(body);
    const slots = layoutMediaSlots(paragraphs.length, list);
    const rows = factRows(options.vacancy);
    const url = listingUrl(options.vacancy);
    const blocks = [];
    let buffer = [];

    const flush = () => {
      if (!buffer.length) return;
      if (buffer[buffer.length - 1] !== BLANK) buffer.push(BLANK);
      blocks.push({ type: "html", html: buffer.join("") });
      buffer = [];
    };
    // 문단 뒤에는 빈 문단 한 칸 (tight: 번호처럼 바로 아래 줄과 붙어야 하는 문단)
    const html = (value, { tight = false } = {}) => {
      if (!value) return;
      buffer.push(value);
      if (!tight && value.startsWith("<p")) buffer.push(BLANK);
    };
    const addImages = (indexes) => {
      if (!indexes.length) return;
      flush();
      indexes.forEach((index) => blocks.push({ type: "image", mediaIndex: index }));
    };

    const leadIndex = paragraphs.length && !isHeading(paragraphs[0]) ? 0 : -1;
    const firstHeadingIndex = paragraphs.findIndex(isHeading);
    let headingNumber = 0;
    let answerPending = false;
    let pullQuote = "";
    let pullQuoteDone = false;

    // 대표 사진 (뉴스기사형은 사진 설명을 작게 붙인다)
    const coverIndex = list.findIndex((item) => item && item.isCover);
    if (coverIndex >= 0) {
      addImages([coverIndex]);
      const caption = String(list[coverIndex].caption || "").trim();
      if (design === "news" && caption) html(paragraphHtml(caption, { align: "center", size: 13, color: MUTED }));
    }
    if (design === "magazine" && options.title) {
      html(paragraphHtml(options.title, { align: "center", size: 24, bold: true }));
    }
    addImages(slots[0].map((item) => item.index));

    // 도입부가 끝나고 첫 소제목이 오기 전에 넣는 장식
    const afterIntro = () => {
      if (design === "basic") {
        html(tableHtml(rows));
        html("<hr>");
      } else if (design === "magazine") {
        html("<hr>");
      }
    };

    let carried = [];
    paragraphs.forEach((paragraph, index) => {
      if (index === firstHeadingIndex) afterIntro();

      if (index === leadIndex) {
        if (design === "basic" || design === "qna") html(quoteHtml(paragraph));
        else if (design === "magazine") html(paragraphHtml(paragraph, { align: "center", color: MUTED }));
        else html(paragraphHtml(paragraph, { size: 17, bold: true }));
        if (design === "qna") html(tableHtml(rows));
      } else if (isHeading(paragraph)) {
        const text = stripHeading(paragraph);
        headingNumber += 1;
        if (design === "magazine" && headingNumber === 2 && pullQuote) {
          html(quoteHtml(pullQuote));
          pullQuoteDone = true;
        }
        if (design === "basic") {
          html(paragraphHtml(`■ ${text}`, { size: 19, bold: true }), { tight: true });
        } else if (design === "magazine") {
          html(paragraphHtml(String(headingNumber).padStart(2, "0"), { align: "center", color: ACCENT, bold: true }), { tight: true });
          html(paragraphHtml(text, { align: "center", size: 24, bold: true }), { tight: true });
        } else if (design === "qna") {
          html(paragraphHtml(/^Q[.\s]/.test(text) ? text : `Q. ${text}`, { size: 19, color: ACCENT, bold: true }), { tight: true });
          answerPending = true;
        } else {
          html(paragraphHtml(text, { size: 19, bold: true }), { tight: true });
        }
      } else if (design === "qna" && answerPending) {
        html(`<p><span style="color:${ACCENT}">A.</span> ${escapeHtml(paragraph)}</p>`);
        answerPending = false;
      } else {
        if (design === "magazine" && headingNumber === 1 && !pullQuote) pullQuote = firstSentence(paragraph);
        html(paragraphHtml(paragraph, design === "magazine" ? { align: "center" } : {}));
      }

      // 소제목과 첫 문단 사이에는 사진을 두지 않는다 — 다음 문단 뒤로 넘긴다
      const images = [...carried, ...slots[index + 1].map((item) => item.index)];
      if (isHeading(paragraph) && index < paragraphs.length - 1) {
        carried = images;
      } else {
        carried = [];
        addImages(images);
      }
    });
    addImages(carried);

    if (firstHeadingIndex < 0) afterIntro();

    // 글 끝
    if (design === "basic") {
      html("<hr>");
      html(paragraphHtml(CLOSING_TEXT, { align: "center" }));
      html(linkHtml(url, "▶ 공실뉴스에서 매물 보기", "center"));
    } else if (design === "magazine") {
      if (pullQuote && !pullQuoteDone) html(quoteHtml(pullQuote));
      html("<hr>");
      html(tableHtml(rows));
      html(paragraphHtml(CLOSING_TEXT, { align: "center", color: MUTED }));
      html(linkHtml(url, "공실뉴스에서 매물 보기", "center"));
    } else if (design === "qna") {
      if (leadIndex < 0) html(tableHtml(rows));
      html("<hr>");
      html(paragraphHtml(CLOSING_TEXT, { align: "center" }));
      html(linkHtml(url, "▶ 공실뉴스에서 매물 보기", "center"));
    } else {
      if (rows.length) {
        html(paragraphHtml("[매물 정보]", { bold: true }));
        html(tableHtml(rows));
      }
      html("<hr>");
      html(paragraphHtml("공실뉴스 · gongsilnews.com", { size: 13, color: MUTED }));
      html(linkHtml(url, "매물 상세 보기"));
    }
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
    DESIGNS, factRows,
  };
  global.GWNaverBlog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);

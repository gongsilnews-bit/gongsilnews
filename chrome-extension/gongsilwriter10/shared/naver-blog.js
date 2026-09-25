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
  const SKY = "#dbeafe"; // 매거진형 소제목 하늘색 배경(형광펜)
  const BLANK = "<p><br></p>";
  const SITE_URL = "https://www.gongsilnews.com"; // gongsilnews.com은 www로 넘어간다. 로그인 쿠키도 www에 있다

  /* 매물표 항목: 부동산 인터넷 표시·광고 필수 항목 순서.
     소재지·매물종류·거래형태는 출처 API(listing), 나머지는 공실광고정보 탭 항목(vacancy.fields)에서 찾는다. */
  const FACT_ORDER = [
    /^(금액)$/,
    /관리비/,
    /면적/,
    /해당층|총층|건물규모/,
    /방\/욕실|방수|욕실/,
    /방향/,
    /준공|사용승인/,
    /주차/,
    /입주가능|사용 가능일/,
  ];

  function isHeading(paragraph) {
    return String(paragraph).startsWith("■");
  }

  function stripHeading(paragraph) {
    return String(paragraph).replace(/^■\s*/, "");
  }

  /* 매물표: 표시·광고 필수 항목을 정해진 순서로 (개수 제한 없음) */
  function factRows(vacancy, listing) {
    const rows = [];
    const seen = new Set();
    const push = (label, value) => {
      const text = value == null ? "" : String(value).trim();
      if (!label || !text || text === "-" || seen.has(label)) return;
      seen.add(label);
      rows.push([label, text]);
    };
    const fields = (Array.isArray(vacancy?.fields) ? vacancy.fields : []).filter((field) => field && field.label);

    push("소재지", listing?.location);
    push("매물종류", listing?.propertyType);
    push("거래형태", listing?.tradeType || fields.find((field) => /거래구분/.test(field.label))?.value);
    FACT_ORDER.forEach((pattern) => {
      fields.filter((field) => pattern.test(field.label)).forEach((field) => push(field.label, field.value));
    });
    if (!seen.has("금액")) push("금액", vacancy?.priceText);
    return rows;
  }

  /* 링크: 매물 고정 상세 주소 → 없으면 처음 매물을 본 공실뉴스 주소 */
  function listingUrl(vacancy, listing) {
    if (listing?.detailUrl) return listing.detailUrl;
    const url = String(vacancy?.url || "");
    return /^https:\/\/([a-z0-9-]+\.)?gongsilnews\.com\//i.test(url) ? url : "";
  }

  function formatDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
  }

  /* 전송 전 검사: 표시·광고 필수 정보가 빠졌으면 이유를 돌려준다 */
  function listingProblems(listing) {
    if (!listing) return ["매물 출처 정보(중개사무소)"];
    const owner = listing.owner || {};
    if (owner.type !== "agency") return owner.name ? [] : ["등록자 이름"];
    return [
      ["중개사무소 명칭", owner.name],
      ["대표자", owner.ceo],
      ["등록번호", owner.regNo],
      ["소재지", owner.address],
      ["연락처", owner.phone],
    ].filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
  }

  /* 글 끝 "매물 정보 출처" — 모든 디자인 공통. 문의처가 아니라 출처로 표현한다. */
  function sourceBlockLines(listing, url) {
    const owner = listing?.owner || {};
    const lines = [`공실뉴스 매물 등록 정보 (${formatDate(listing?.capturedAt)} 기준)`];
    if (owner.type === "agency") {
      lines.push(`등록 중개사무소: ${owner.name}${owner.ceo ? ` | 대표 ${owner.ceo}` : ""}`);
      lines.push(`등록번호 ${owner.regNo} | ${owner.address}`);
      lines.push(`전화 ${owner.phone}`);
    } else if (owner.name) {
      lines.push(`등록자: ${owner.name} (일반회원 등록 매물)`);
    }
    lines.push("※ 매물 조건은 등록 시점 기준이며 실제와 다를 수 있습니다.");
    return { lines, url };
  }

  function paragraphHtml(text, { align, size, color, background, bold } = {}) {
    let inner = escapeHtml(text);
    const styles = [
      size ? `font-size:${size}px` : "",
      color ? `color:${color}` : "",
      background ? `background-color:${background}` : "",
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
    const rows = factRows(options.vacancy, options.listing);
    const url = listingUrl(options.vacancy, options.listing);
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
          html(paragraphHtml(text, { align: "center", size: 19, background: SKY, bold: true }), { tight: true });
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

    // 글 끝: 디자인별 마무리
    if (design === "magazine") {
      if (pullQuote && !pullQuoteDone) html(quoteHtml(pullQuote));
      html("<hr>");
      html(tableHtml(rows));
    } else if (design === "qna") {
      if (leadIndex < 0) html(tableHtml(rows));
    } else if (design === "news") {
      if (rows.length) {
        html(paragraphHtml("[매물 정보]", { size: 17, bold: true }), { tight: true });
        html(tableHtml(rows));
      }
    }

    // 모든 디자인 공통: 매물 정보 출처 (표시·광고 필수 정보) + 고정 상세 링크 + 공실뉴스 서명
    const source = sourceBlockLines(options.listing, url);
    html("<hr>");
    html(paragraphHtml("[매물 정보 출처]", { size: 13, color: MUTED, bold: true }), { tight: true });
    source.lines.forEach((line) => html(paragraphHtml(line, { size: 13, color: MUTED }), { tight: true }));
    html(BLANK, { tight: true });
    html(linkHtml(source.url, "▶ 공실뉴스 매물 상세 보기"));
    html(paragraphHtml("공실뉴스 · gongsilnews.com", { size: 13, color: MUTED }));
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
    DESIGNS, factRows, listingProblems, SITE_URL,
  };
  global.GWNaverBlog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);

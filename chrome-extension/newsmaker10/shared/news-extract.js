/* ══════════════════════════════════════════════════════════════
   뉴스 기사 페이지에서 제목·언론사·날짜·본문 읽기

   두 곳에서 쓴다.
   1) 지금 보고 있는 탭 — 작업창이 이 파일을 그 탭에 넣고(scripting) gwNewsExtract(document) 를 부른다
   2) 주소 붙여넣기 — 작업창이 페이지를 받아 DOMParser 로 만든 문서를 넘긴다

   그래서 이 파일은 바깥 것(작업창 상태·chrome API)을 전혀 쓰지 않는다.
   광고·기자 이메일·저작권 문구 같은 부속 글은 빼고 본문 문단만 남긴다.
   ══════════════════════════════════════════════════════════════ */
(function initNewsExtract(global) {
  "use strict";

  const MAX_BODY = 8000; // AI 에 보내는 원문 길이 한도 — 이보다 길면 앞부분만 쓴다
  const MIN_BODY = 60;   // 정해진 본문 자리에서 이만큼은 읽혀야 본문으로 본다 (짧은 속보도 받는다)
  const MIN_GUESS = 200; // 자리를 몰라 짐작할 때는 더 길어야 믿는다

  /* 본문이 들어 있는 자리 — 많이 쓰이는 언론사 화면부터 */
  const BODY_SELECTORS = [
    "#dic_area",                      // 네이버 뉴스
    "#newsct_article",
    "#articleBodyContents",
    "#articeBody",
    ".article_view",                  // 다음 뉴스
    "[itemprop='articleBody']",
    "#article-view-content-div",      // 지역·전문지 공통 CMS
    "#articleBody", "#article_body", "#articletxt", "#newsContent", "#news_body_area",
    ".article_body", ".article-body", ".article_txt", ".art_txt", ".news_body", ".news_text",
    ".view_con", ".story-news", ".article-view-content", ".article_content", ".news-article-body",
    "article",
  ];

  /* 본문 안에서 뺄 것 */
  const JUNK_SELECTORS = [
    "script", "style", "noscript", "iframe", "figure", "figcaption", "aside", "table", "form", "button",
    ".reporter", ".byline", ".copyright", ".article_copy", ".related", ".relation", ".ad", ".ads",
    "[class*='banner']", "[class*='promotion']", "[class*='subscribe']", "[class*='share']",
    ".img_desc", ".photo_desc", ".end_photo_org", ".vod_player_wrap",
  ];

  /* 본문 줄 가운데 부속 글로 보고 버리는 것 */
  const JUNK_LINE = [
    /무단\s*(전재|복제)|재배포\s*금지|Copyright|ⓒ|©|All rights reserved/i,
    /^\s*[▶▷☞■◆●※]\s*.{0,60}$/,         // 짧은 관련기사·바로가기 줄
    /^[\w.+-]+@[\w-]+\.[\w.]+$/,           // 기자 이메일만 있는 줄
    /기자\s*[\w.+-]+@[\w-]+\.[\w.]+/,      // "홍길동 기자 abc@..." 서명
    /^\s*(사진|그래픽|영상)\s*[=:]/,
    /구독(하기)?|좋아요|댓글|공유하기|제보하기/,
  ];

  const BLOCK_TAGS = new Set([
    "P", "DIV", "SECTION", "ARTICLE", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6",
    "BLOCKQUOTE", "HEADER", "FOOTER", "TR",
  ]);

  const clean = (text) => String(text || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();

  function meta(doc, ...names) {
    for (const name of names) {
      const node = doc.querySelector(`meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`);
      const value = clean(node && node.getAttribute("content"));
      if (value) return value;
    }
    return "";
  }

  /* 화면에 그려지지 않은 문서(DOMParser)에서도 문단이 나뉘도록 직접 글을 모은다 */
  function blockText(root) {
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === 3) {
        parts.push(node.nodeValue);
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.tagName === "BR") {
        parts.push("\n");
        return;
      }
      const block = BLOCK_TAGS.has(node.tagName);
      if (block) parts.push("\n\n");
      node.childNodes.forEach(walk);
      if (block) parts.push("\n\n");
    };
    walk(root);
    return parts.join("");
  }

  function paragraphsOf(node) {
    const copy = node.cloneNode(true);
    JUNK_SELECTORS.forEach((selector) => {
      try {
        copy.querySelectorAll(selector).forEach((junk) => junk.remove());
      } catch (_) {
        /* 이 브라우저가 모르는 셀렉터는 건너뛴다 */
      }
    });
    return blockText(copy)
      .split(/\n+/)
      .map(clean)
      .filter((line) => line.length >= 2 && !JUNK_LINE.some((rule) => rule.test(line)));
  }

  const textSize = (lines) => lines.reduce((sum, line) => sum + line.length, 0);

  /* 정해진 자리에 본문이 없으면, 긴 문단을 가장 많이 품은 칸을 본문으로 본다 */
  function guessBodyNode(doc) {
    let best = null;
    let bestScore = 0;
    doc.querySelectorAll("div, section, article, main").forEach((node) => {
      const score = Array.from(node.children)
        .filter((child) => child.tagName === "P")
        .reduce((sum, p) => {
          const size = clean(p.textContent).length;
          return size >= 40 ? sum + size : sum;
        }, 0);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    });
    return bestScore >= MIN_GUESS ? best : null;
  }

  function findBody(doc) {
    for (const selector of BODY_SELECTORS) {
      const node = doc.querySelector(selector);
      if (!node) continue;
      const lines = paragraphsOf(node);
      if (textSize(lines) >= MIN_BODY) return lines;
    }
    const guessed = guessBodyNode(doc);
    return guessed ? paragraphsOf(guessed) : [];
  }

  /* 네이버·다음은 og:site_name 이 포털 이름이라 기사 작성자(언론사) 칸을 먼저 본다 */
  function findPublisher(doc, url) {
    const author = meta(doc, "og:article:author", "article:author").split("|")[0].trim();
    const logo = doc.querySelector(".media_end_head_top_logo img[alt], .press_logo img[alt], .media_end_head_top_logo_img[alt]");
    const candidates = [
      author && !/^https?:/i.test(author) ? author : "",
      clean(logo && logo.getAttribute("alt")),
      meta(doc, "og:site_name", "twitter:site", "application-name"),
    ];
    const found = candidates.find((name) => name && !/^(네이버|NAVER|다음|Daum)(\s*뉴스)?$/i.test(name));
    if (found) return found.replace(/^@/, "");
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  }

  function findDate(doc) {
    const stamp = doc.querySelector("[data-date-time], time[datetime]");
    return (
      meta(doc, "article:published_time", "og:regDate", "pubdate", "publish-date", "datePublished", "date") ||
      clean(stamp && (stamp.getAttribute("data-date-time") || stamp.getAttribute("datetime")))
    );
  }

  function findTitle(doc) {
    const h1 = doc.querySelector("h2.media_end_head_headline, h1, h2#title_area");
    return (
      meta(doc, "og:title", "twitter:title") ||
      clean(h1 && h1.textContent) ||
      clean(doc.title)
    ).replace(/\s*[|:\-–]\s*(네이버|다음)?\s*뉴스\s*$/, "");
  }

  /* 제목 끝의 " - 언론사" · " | 언론사" 꼬리를 뗀다 */
  function stripPublisherTail(title, publisher) {
    if (!publisher) return title;
    const escaped = publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return title.replace(new RegExp(`\\s*[-|:–]\\s*${escaped}\\s*$`), "").trim() || title;
  }

  /* 첫 줄의 "(서울=연합뉴스) 홍길동 기자 =" 같은 발신 머리를 뗀다 */
  const DATELINE = /^\s*[(\[][^()[\]]{1,20}=[^()[\]]{1,20}[)\]]\s*([^=]{1,25}(기자|특파원|통신원)\s*=\s*)?/;

  function gwNewsExtract(doc, href) {
    try {
      const url = String(href || (doc.location && doc.location.href) || "");
      const publisher = findPublisher(doc, url);
      const title = stripPublisherTail(findTitle(doc), publisher);
      const lines = findBody(doc);
      if (lines.length) lines[0] = lines[0].replace(DATELINE, "").trim() || lines[0];
      let body = lines.join("\n\n");
      const truncated = body.length > MAX_BODY;
      if (truncated) body = body.slice(0, MAX_BODY).replace(/\s+\S*$/, "") + " …";

      if (!title || body.length < MIN_BODY) {
        return {
          ok: false,
          reason: "이 페이지에서 뉴스 본문을 찾지 못했습니다. 뉴스 기사 한 건이 열린 화면에서 다시 눌러 주세요. " +
            "안 되면 [주제 입력]으로 바꿔 기사 내용을 직접 붙여넣어 주세요.",
        };
      }
      return {
        ok: true,
        news: {
          title,
          publisher,
          publishedAt: findDate(doc),
          url,
          body,
          truncated,
        },
      };
    } catch (e) {
      return { ok: false, reason: "뉴스 페이지를 읽다가 오류가 났습니다: " + (e && e.message ? e.message : String(e)) };
    }
  }

  /* 받은 HTML 바이트를 글로 바꾼다 — EUC-KR 로 된 언론사 페이지가 아직 많다 */
  function decodeHtml(buffer, contentType) {
    const bytes = new Uint8Array(buffer);
    const pick = (text) => {
      const hit = /charset\s*=\s*["']?\s*([\w-]+)/i.exec(text || "");
      return hit ? hit[1].toLowerCase() : "";
    };
    let charset = pick(contentType);
    if (!charset) {
      const head = new TextDecoder("ascii").decode(bytes.slice(0, 4096));
      charset = pick(head);
    }
    if (/^(ks_c_5601-1987|euc-kr|cp949|x-windows-949)$/.test(charset)) charset = "euc-kr";
    try {
      return new TextDecoder(charset || "utf-8").decode(bytes);
    } catch (_) {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }

  const api = { gwNewsExtract, decodeHtml, MAX_BODY };
  global.GWNewsExtract = api;
  global.gwNewsExtract = gwNewsExtract;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);

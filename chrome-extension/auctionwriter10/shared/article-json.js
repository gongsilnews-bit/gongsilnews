/* ══════════════════════════════════════════════════════════════
   AI 기사 JSON 읽기

   새 형식은 body 를 문단 배열로 받는다. 긴 본문을 JSON 문자열 하나에 넣을 때
   생기는 줄바꿈·괄호 오류를 피하기 위해서다. 예전 문자열 형식도 계속 받으며,
   AI 가 흔히 만드는 원시 줄바꿈·후행 쉼표·body 닫기 괄호 오류는 안전하게
   복구한다. eval 은 사용하지 않는다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  function extractCandidate(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return "";

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) return fenced[1].trim();

    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    return first !== -1 && last > first ? text.slice(first, last + 1).trim() : "";
  }

  function hasCompleteObject(rawText) {
    const text = String(rawText || "");
    const first = text.indexOf("{");
    if (first < 0) return false;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = first; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') inString = true;
      else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) return true;
      }
    }

    return false;
  }

  function escapeRawControlsInStrings(input) {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];

      if (inString) {
        if (escaped) {
          out += ch;
          escaped = false;
        } else if (ch === "\\") {
          out += ch;
          escaped = true;
        } else if (ch === '"') {
          out += ch;
          inString = false;
        } else if (ch === "\n") {
          out += "\\n";
        } else if (ch === "\r") {
          if (input[i + 1] === "\n") i += 1;
          out += "\\n";
        } else if (ch === "\t") {
          out += "\\t";
        } else {
          out += ch;
        }
      } else {
        out += ch;
        if (ch === '"') inString = true;
      }
    }

    return out;
  }

  function stripTrailingCommas(input) {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (inString) {
        out += ch;
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        out += ch;
        continue;
      }

      if (ch === ",") {
        let next = i + 1;
        while (next < input.length && /\s/.test(input[next])) next += 1;
        if (input[next] === "}" || input[next] === "]") continue;
      }

      out += ch;
    }

    return out;
  }

  function repairCommonJson(candidate) {
    return stripTrailingCommas(escapeRawControlsInStrings(candidate));
  }

  function keyMatch(input, key, fromIndex = 0) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`"${escapedKey}"\\s*:`, "g");
    regex.lastIndex = fromIndex;
    return regex.exec(input);
  }

  function extractSection(input, key, nextKeys) {
    const current = keyMatch(input, key);
    if (!current) return "";

    const start = current.index + current[0].length;
    let end = input.length;
    for (const nextKey of nextKeys || []) {
      const next = keyMatch(input, nextKey, start);
      if (next && next.index < end) end = next.index;
    }

    let section = input.slice(start, end).trim();
    section = section.replace(/,\s*$/, "").trim();
    return section;
  }

  function manualUnquote(value) {
    let text = String(value || "").trim();
    while (text.startsWith('"') && /[}\]]$/.test(text)) {
      text = text.slice(0, -1).trim();
    }
    if (text.startsWith('"')) text = text.slice(1);
    if (text.endsWith('"')) text = text.slice(0, -1);

    return text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim();
  }

  function parseLooseValue(section) {
    let value = String(section || "").trim().replace(/,\s*$/, "").trim();
    if (!value) return "";

    /* 스크린샷처럼 문자열 body 뒤에 잘못 붙은 ] 를 제거한다. */
    if (value.startsWith('"')) {
      while (value.endsWith("]")) value = value.slice(0, -1).trim();
    }

    const attempts = [value, repairCommonJson(value)];
    if (value.startsWith("[") && !value.endsWith("]")) {
      attempts.push(repairCommonJson(value + "]"));
    }

    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch (_error) {
        /* 다음 안전한 복구를 시도한다. */
      }
    }

    if (value.startsWith("[")) {
      const strings = [];
      const regex = /"((?:\\.|[^"\\])*)"/g;
      let match;
      while ((match = regex.exec(value))) strings.push(manualUnquote(`"${match[1]}"`));
      if (strings.length) return strings;
    }

    return manualUnquote(value);
  }

  function normalizeBody(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            return String(item.text || item.content || item.paragraph || "").trim();
          }
          return "";
        })
        .filter(Boolean)
        .join("\n\n");
    }

    if (value && typeof value === "object") {
      return normalizeBody(value.paragraphs || value.body || value.content || value.text || "");
    }

    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeArticle(data) {
    if (!data || typeof data !== "object") return null;

    const title = String(data.title || "").trim();
    const subtitleValues = Array.isArray(data.subtitles)
      ? data.subtitles
      : [data.subtitle1, data.subtitle2, data.subtitle3];
    const subtitles = subtitleValues
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    const body = normalizeBody(data.body || data.paragraphs || data.content || "");
    const rawKeywords = Array.isArray(data.keywords)
      ? data.keywords
      : String(data.keywords || "").split(/[,\n]/);
    const keywords = rawKeywords
      .map((keyword) => String(keyword || "").replace(/^#/, "").trim())
      .filter(Boolean);

    if (!title || !body) return null;
    return { title, subtitles, body, keywords };
  }

  function parseLooseArticle(candidate) {
    const title = parseLooseValue(extractSection(candidate, "title", ["subtitle1", "subtitles", "body"]));
    const subtitlesValue = parseLooseValue(extractSection(candidate, "subtitles", ["body"]));
    const subtitle1 = parseLooseValue(extractSection(candidate, "subtitle1", ["subtitle2", "subtitle3", "body"]));
    const subtitle2 = parseLooseValue(extractSection(candidate, "subtitle2", ["subtitle3", "body"]));
    const subtitle3 = parseLooseValue(extractSection(candidate, "subtitle3", ["body"]));
    const body = parseLooseValue(extractSection(candidate, "body", ["keywords"]));

    let keywordsSection = extractSection(candidate, "keywords", []);
    while (keywordsSection.endsWith("}")) keywordsSection = keywordsSection.slice(0, -1).trim();
    const keywords = parseLooseValue(keywordsSection);

    return {
      title,
      subtitles: Array.isArray(subtitlesValue)
        ? subtitlesValue
        : [subtitle1, subtitle2, subtitle3].filter(Boolean),
      body,
      keywords: Array.isArray(keywords) ? keywords : [],
    };
  }

  function parse(rawText) {
    if (!rawText || !String(rawText).trim()) {
      return { ok: false, reason: "AI 응답이 비어 있습니다." };
    }

    const candidate = extractCandidate(rawText);
    if (!candidate) return { ok: false, reason: "AI 응답에서 JSON 을 찾지 못했습니다." };

    let data = null;
    let repaired = false;

    try {
      data = JSON.parse(candidate);
    } catch (_strictError) {
      try {
        data = JSON.parse(repairCommonJson(candidate));
        repaired = true;
      } catch (_repairError) {
        data = parseLooseArticle(candidate);
        repaired = true;
      }
    }

    const article = normalizeArticle(data);
    if (!article) {
      return { ok: false, reason: "AI 응답에 제목 또는 본문이 없거나 복구할 수 없는 JSON 입니다." };
    }

    return { ok: true, article, repaired };
  }

  const api = { parse, hasCompleteObject, extractCandidate, repairCommonJson, normalizeBody };
  globalThis.GWArticleJson = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();

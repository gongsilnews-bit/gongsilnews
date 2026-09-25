/* 블로그 초안의 복사 형식과 게시 전 내부 품질 점검. */
(function initBlogDraft(global) {
  "use strict";

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalized(value) {
    return clean(value)
      .toLowerCase()
      .replace(/[\[\]{}()<>■#.,!?·'"“”‘’:;~`_|/\\-]/g, "")
      .replace(/\s+/g, "");
  }

  function signature(article) {
    if (!article) return "";
    const text = [article.title, article.body, ...(article.keywords || [])].join("|");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function meaningfulLines(value) {
    return String(value || "")
      .split(/\n+|(?<=[.!?])\s+/)
      .map(clean)
      .filter((line) => normalized(line).length >= 20);
  }

  function exactOverlap(sourceBody, blogBody) {
    const source = new Set(meaningfulLines(sourceBody).map(normalized));
    const blog = meaningfulLines(blogBody).map(normalized);
    if (!blog.length) return 1;
    return blog.filter((line) => source.has(line)).length / blog.length;
  }

  function uniqueKeywords(keywords) {
    const seen = new Set();
    return (Array.isArray(keywords) ? keywords : [])
      .map((keyword) => clean(keyword).replace(/^#+/, ""))
      .filter((keyword) => {
        const key = normalized(keyword);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function hasHeavyKeywordRepeat(draft) {
    const body = normalized([draft.title, draft.body].join(" "));
    return uniqueKeywords(draft.keywords).some((keyword) => {
      const key = normalized(keyword);
      if (key.length < 2) return false;
      return body.split(key).length - 1 > 7;
    });
  }

  function evaluate(source, draft, perspective, sourceSignature) {
    const safeSource = source || {};
    const safeDraft = draft || {};
    const body = String(safeDraft.body || "");
    const keywords = Array.isArray(safeDraft.keywords) ? safeDraft.keywords : [];
    const deduped = uniqueKeywords(keywords);
    const overlap = exactOverlap(safeSource.body, body);
    const hype = /(무조건|확실한|반드시|보장|대박|놓치면\s*후회|100\s*%)/i.test(
      [safeDraft.title, body].join(" ")
    );

    return [
      {
        id: "fresh",
        ok: Boolean(sourceSignature) && sourceSignature === signature(safeSource),
        label: "현재 기사 초안을 기준으로 생성",
        detail: "기사를 고친 뒤에는 블로그 초안을 다시 만들어 주세요.",
      },
      {
        id: "title",
        ok: Boolean(clean(safeDraft.title)) && normalized(safeDraft.title) !== normalized(safeSource.title),
        label: "뉴스와 다른 블로그 제목",
        detail: "기사 제목을 그대로 복사하지 않고 검색 의도를 자연스럽게 반영합니다.",
      },
      {
        id: "rewrite",
        ok: Boolean(clean(body)) && overlap < 0.35,
        label: "뉴스 원문 반복 최소화",
        detail: `같은 문장 비율 내부 점검 ${Math.round(overlap * 100)}%`,
      },
      {
        id: "perspective",
        ok: clean(perspective).length >= 10,
        label: "작성자의 실제 경험·관점 제공",
        detail: "현장에서 본 점이나 중개 의견을 직접 입력하는 것이 좋습니다.",
      },
      {
        id: "notice",
        ok: /확인/.test(body) && /(변동|달라질|기준일)/.test(body),
        label: "확인사항과 정보 변동 안내",
        detail: "가격·입주일 등은 게시 전 다시 확인하도록 안내합니다.",
      },
      {
        id: "hype",
        ok: !hype,
        label: "과장·보장 표현 없음",
        detail: "무조건·확실·보장과 같은 단정적인 광고 표현을 피합니다.",
      },
      {
        id: "keywords",
        ok: keywords.length >= 3 && keywords.length <= 10 && keywords.length === deduped.length && !hasHeavyKeywordRepeat(safeDraft),
        label: "해시태그 중복·과다 반복 없음",
        detail: "본문과 직접 관련된 태그만 사용합니다.",
      },
    ];
  }

  function hashtags(draft) {
    return uniqueKeywords(draft && draft.keywords)
      .map((keyword) => `#${keyword.replace(/\s+/g, "")}`)
      .join(" ");
  }

  function bodyWithTags(draft) {
    const body = String((draft && draft.body) || "").trim();
    const tags = hashtags(draft);
    return [body, tags].filter(Boolean).join("\n\n");
  }

  const api = { signature, exactOverlap, uniqueKeywords, evaluate, hashtags, bodyWithTags };
  global.GWBlogDraft = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);

// 영상 편집기 — 회원 AI(기본 글쓰기 AI)로 대본 쓰기 · 문장별 화면 검색어 · 숏폼 구간 고르기 · AI 그림
// 지시문은 서버 묶음(video/video-script.js)에서 받는다 (설치 파일에 넣지 않음).
const ext = require("../ext");
const ai = require("../ai");
const tl = require("./timeline");

const lib = ext.lazyModule(() => ext.run(["video/video-script.js"], ["gwVideoFacts", "gwVideoScriptPrompt", "gwVideoScenePrompt", "gwShortsPrompt", "gwVideoParse"]));

/** 대본 — { topic, style, request, chars, vacancy, source } → { title, scenes:[{title, lines:[{text, desc, keywords, kind}]}], chatUrl } */
async function script(opts, onProgress = () => {}) {
  let chatUrl = "";
  const text = await ai.ask(lib.gwVideoScriptPrompt(opts), {
    onProgress,
    isComplete: (t) => {
      const j = lib.gwVideoParse(t);
      return Boolean(j && Array.isArray(j.scenes) && j.scenes.length);
    },
    onChat: (u) => (chatUrl = u),
  });
  const j = lib.gwVideoParse(text);
  if (!j || !Array.isArray(j.scenes)) throw new Error("AI 대본을 읽지 못했습니다. 다시 눌러 주세요.");
  j.scenes = j.scenes
    .map((s) => ({ title: String(s.title || ""), lines: (s.lines || []).map((l) => ({ text: String(l.text || "").trim(), desc: String(l.desc || ""), keywords: String(l.keywords || ""), kind: l.kind === "image" ? "image" : "video" })).filter((l) => l.text) }))
    .filter((s) => s.lines.length);
  return { ...j, chatUrl };
}

/** 이미 있는 문장들에 화면 검색어 붙이기 → [{desc, keywords, kind}] */
async function scenesFor(lines, onProgress = () => {}) {
  if (!lines.length) return [];
  const text = await ai.ask(lib.gwVideoScenePrompt(lines), {
    onProgress,
    isComplete: (t) => {
      const j = lib.gwVideoParse(t);
      return Boolean(j && Array.isArray(j.lines));
    },
  });
  const j = lib.gwVideoParse(text) || { lines: [] };
  return lines.map((_, i) => {
    const l = (j.lines || []).find((x) => Number(x.n) === i + 1) || (j.lines || [])[i] || {};
    return { desc: String(l.desc || ""), keywords: String(l.keywords || ""), kind: l.kind === "image" ? "image" : "video" };
  });
}

/** 숏폼 구간 — 받아쓴 클립들 → [{title, start, end, reason}] */
async function shorts(clips, { count = 3, maxSec = 60, request = "" } = {}, onProgress = () => {}) {
  const transcript = clips
    .filter((c) => c.type === "source" && c.text)
    .map((c) => `[${c.src.s.toFixed(1)}-${c.src.e.toFixed(1)}] ${c.text}`)
    .join("\n")
    .slice(0, 60000);
  const text = await ai.ask(lib.gwShortsPrompt(transcript, { count, maxSec, request }), {
    onProgress,
    isComplete: (t) => {
      const j = lib.gwVideoParse(t);
      return Boolean(j && Array.isArray(j.shorts));
    },
  });
  const j = lib.gwVideoParse(text);
  if (!j || !Array.isArray(j.shorts)) throw new Error("AI 답을 읽지 못했습니다. 다시 눌러 주세요.");
  return j.shorts
    .map((s) => ({ title: String(s.title || "숏폼"), start: Number(s.start) || 0, end: Number(s.end) || 0, reason: String(s.reason || "") }))
    .filter((s) => s.end > s.start);
}

/** AI 그림 (기본 이미지 생성 AI) → data URL */
function image(prompt, onProgress) {
  return ai.askImage(prompt, { onProgress });
}

module.exports = { script, scenesFor, shorts, image, facts: (v) => lib.gwVideoFacts(v), tl };

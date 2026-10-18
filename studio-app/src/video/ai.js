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

/* ── 대본 + 내 영상 → 문장마다 어울리는 장면 (회의 3-19) ──
   영상마다 장면 모음 그림 한 장(칸마다 "V2 12s")을 PC 에서 만들어(ffmpeg, 무료) 회원 AI 에 대본과 함께 보낸다.
   원본 영상은 보내지 않는다. 사진은 그 자체를 작게 ("P3"). */
const fs = require("fs");
const os = require("os");
const path = require("path");
const ff = require("./ff");

/** items: [{ path, kind: "video"|"image", duration }] → [{ file, label }] (임시 폴더에 jpg) */
async function footageSheets(items, onProgress = () => {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gsv-sheet-"));
  // 칸 글자용 글꼴 — 경로에 한글·공백이 없게 작업 폴더로 복사
  const font = path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "arialbd.ttf");
  if (fs.existsSync(font)) fs.copyFileSync(font, path.join(tmp, "f.ttf"));
  const label = (txt) => (fs.existsSync(path.join(tmp, "f.ttf")) ? `,drawtext=fontfile=f.ttf:text='${txt}':x=6:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=4` : "");
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const n = i + 1;
    const file = path.join(tmp, `sheet${n}.jpg`);
    onProgress(`장면 모음을 만드는 중… (${n}/${items.length})`);
    if (it.kind === "image") {
      await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", it.path, "-vf", `scale=640:-2${label(`P${n}`)}`, "-frames:v", "1", file], { cwd: tmp });
      out.push({ file, label: `P${n}` });
      continue;
    }
    // 길이에 맞춰 칸 간격 — 최대 24칸 (6×4), 2초보다 촘촘하게는 안 함
    const dur = Math.max(1, Number(it.duration) || 0);
    const step = Math.max(2, Math.ceil(dur / 24));
    const cells = Math.min(24, Math.ceil(dur / step));
    const cols = cells <= 4 ? cells : cells <= 9 ? 3 : cells <= 16 ? 4 : 6;
    const rows = Math.ceil(cells / cols);
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", it.path, "-vf", `fps=1/${step},scale=320:-2${label(`V${n} %{eif\\:t\\:d}s`)},tile=${cols}x${rows}:padding=4:color=white`, "-frames:v", "1", file], { cwd: tmp });
    out.push({ file, label: `V${n}` });
  }
  return { sheets: out, dir: tmp };
}

/** 대본 문장들 + 내 영상·사진 → [{ v: 자료 번호(0부터) | -1, t: 시작 초 }] */
async function matchFootage(lines, items, onProgress = () => {}) {
  if (!lines.length || !items.length) return [];
  const { sheets, dir } = await footageSheets(items, onProgress);
  try {
    const list = items.map((it, i) => (it.kind === "image" ? `P${i + 1}: 사진` : `V${i + 1}: 영상 ${Math.round(Number(it.duration) || 0)}초`)).join("\n");
    const prompt = [
      "부동산 영상을 편집하고 있어요. 첨부한 그림은 제가 찍은 영상·사진의 장면 모음입니다.",
      "영상 모음은 칸마다 왼쪽 위에 'V번호 초'가 적혀 있어요 (그 영상의 그 시각 장면). 사진은 'P번호'예요.",
      "",
      "[자료]",
      list,
      "",
      "[대본 — 문장마다 한 클립]",
      lines.map((t, i) => `${i + 1}. ${t}`).join("\n"),
      "",
      "문장마다 내용에 가장 어울리는 장면을 골라 주세요. 같은 장면을 되도록 겹치지 않게, 이야기 흐름(외관 → 실내 → 주변 등)도 생각해 주세요.",
      "어울리는 것이 없으면 src 를 \"\" 로 두세요.",
      '답은 JSON 만: {"lines":[{"n":1,"src":"V2","t":12},{"n":2,"src":"P1","t":0}]}  (t: 그 영상에서 시작할 초, 사진은 0)',
    ].join("\n");
    const parse = (t) => {
      const m = /\{[\s\S]*\}/.exec(String(t || ""));
      try {
        return m ? JSON.parse(m[0]) : null;
      } catch {
        return null;
      }
    };
    onProgress("AI가 문장마다 어울리는 장면을 고르는 중… (1~2분)");
    const text = await ai.ask(prompt, { onProgress, files: sheets.map((x) => x.file), busyLabel: "장면을 고르고 있습니다", isComplete: (t) => Boolean(parse(t) && Array.isArray(parse(t).lines)) });
    const j = parse(text) || { lines: [] };
    return lines.map((_, i) => {
      const l = (j.lines || []).find((x) => Number(x.n) === i + 1) || {};
      const m = /^([VP])(\d+)$/i.exec(String(l.src || "").trim());
      const v = m ? Number(m[2]) - 1 : -1;
      if (v < 0 || v >= items.length) return { v: -1, t: 0 };
      const dur = Number(items[v].duration) || 0;
      return { v, t: items[v].kind === "image" ? 0 : Math.max(0, Math.min(Number(l.t) || 0, Math.max(0, dur - 1))) };
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * [AI 편집] — 글 AI(기본 글쓰기 AI)가 클립 글 + (내 영상 장면 모음)을 보고 편집 계획을 세운다 (회의 3-21)
 *  화면(그대로·내 영상·AI 그림·무료 자료) · 화면 글자 · 자막 강조 · 화면전환 · 배경음악 분위기
 *  opts: { aiMax, moods: string[] }
 *  돌려줌: { clips: [{ act, v, t, keywords, desc, title, emph, trans }], music }
 */
async function aiEdit(lines, items, opts = {}, onProgress = () => {}) {
  if (!lines.length) return { clips: [], music: "" };
  const useFoot = items.length > 0;
  const made = useFoot ? await footageSheets(items, onProgress) : { sheets: [], dir: "" };
  try {
    const aiMax = Number(opts.aiMax) || 8;
    const list = items.map((it, i) => (it.kind === "image" ? `P${i + 1}: 사진` : `V${i + 1}: 영상 ${Math.round(Number(it.duration) || 0)}초`)).join("\n");
    const prompt = [
      "부동산 중개사가 만든 영상(강의·매물 소개)을 편집해 주세요. 아래는 클립마다 말한 내용(자막)이에요.",
      useFoot ? "첨부한 그림은 제가 찍어 둔 영상·사진의 장면 모음이에요 (칸마다 왼쪽 위 'V번호 초' = 그 영상의 그 시각, 'P번호' = 사진)." : "",
      useFoot ? `\n[내 자료]\n${list}` : "",
      "",
      "[클립]",
      lines.map((t, i) => `${i + 1}. ${t}`).join("\n"),
      "",
      "클립마다 정해 주세요:",
      "1) act — 화면: \"keep\"(원래 화면 그대로 — 화면을 설명하는 말 '여기를 누르면'·인사·말하는 얼굴이 중요한 곳)" +
        (useFoot ? ', "foot"(내 자료 — src 와 t(시작 초))' : "") +
        `, "ai"(AI 그림 — desc 에 그릴 장면을 한국어로 구체적으로, 전체 ${aiMax}개까지), "stock"(무료 사진·영상 — keywords 에 한국어 검색어 2~3낱말).` +
        " 매물·동네·건물·방·생활 이야기는 바꾸고, 내 자료에 맞는 장면이 있으면 그것을 먼저 쓰세요." +
        " 문장마다 화면을 바꾸면 정신없으니, 같은 이야기가 이어지는 2~3개 클립은 같은 화면을 이어 쓰세요 (뒤 클립을 \"same\" 으로 — 앞 클립 화면을 그대로).",
      "2) title — 화면에 크게 띄울 핵심 글 (숫자·가격·면적·위치 등 꼭 기억할 것, 10자 안팎). 없으면 \"\". 전체의 1/4 안팎만.",
      "3) emph — 자막을 강조할 중요한 문장이면 true.",
      "4) trans — 이야기 주제가 바뀌어 화면전환을 넣을 클립이면 true (첫 클립 제외, 가끔만).",
      `그리고 영상 전체 배경음악 분위기 music 을 하나: ${(opts.moods || []).join(", ")}.`,
      'JSON 만: {"music":"잔잔한","clips":[{"n":1,"act":"keep","title":"","emph":false,"trans":false},{"n":2,"act":"ai","desc":"햇살 드는 넓은 거실","title":"전세 5억","emph":true,"trans":false}]}',
    ].filter((x) => x !== "").join("\n");
    const parse = (t) => {
      const m = /\{[\s\S]*\}/.exec(String(t || ""));
      try {
        return m ? JSON.parse(m[0]) : null;
      } catch {
        return null;
      }
    };
    onProgress("글 AI가 편집 계획을 세우는 중… (1~2분)");
    const text = await ai.ask(prompt, { onProgress, files: made.sheets.map((x) => x.file), busyLabel: "영상 편집 계획을 세우고 있습니다", isComplete: (t) => Boolean(parse(t) && Array.isArray(parse(t).clips)) });
    const j = parse(text) || { clips: [] };
    let aiLeft = aiMax;
    const clips = lines.map((_, i) => {
      const l = (j.clips || []).find((x) => Number(x.n) === i + 1) || {};
      const extra = { title: String(l.title || "").trim().slice(0, 24), emph: Boolean(l.emph), trans: i > 0 && Boolean(l.trans) };
      const act = String(l.act || "keep");
      if (act === "same" && i > 0) return { act: "same", ...extra };
      if (act === "foot" && useFoot) {
        const m = /^([VP])(\d+)$/i.exec(String(l.src || "").trim());
        const v = m ? Number(m[2]) - 1 : -1;
        if (v >= 0 && v < items.length) {
          const dur = Number(items[v].duration) || 0;
          return { act, v, t: items[v].kind === "image" ? 0 : Math.max(0, Math.min(Number(l.t) || 0, Math.max(0, dur - 1))), ...extra };
        }
      }
      if (act === "ai" && aiLeft > 0 && l.desc) {
        aiLeft--;
        return { act, desc: String(l.desc), ...extra };
      }
      if ((act === "stock" || act === "ai") && (l.keywords || l.desc)) return { act: "stock", keywords: String(l.keywords || l.desc).slice(0, 40), ...extra };
      return { act: "keep", ...extra };
    });
    return { clips, music: String(j.music || "") };
  } finally {
    if (made.dir) fs.rmSync(made.dir, { recursive: true, force: true });
  }
}

/* ── [씬 정리] (회의 3-22) — 클립 글을 읽고 이야기 묶음(씬)으로 나누고 이름 붙이기 ──
   lines: 클립 글 (순서대로) → [{ title, from }] (from = 그 씬이 시작하는 클립 번호, 1부터) */
async function groupScenes(lines, onProgress = () => {}) {
  const n = lines.length;
  if (n < 2) return [{ title: "", from: 1 }];
  const want = n <= 6 ? "1~2개" : n <= 15 ? "2~4개" : n <= 40 ? "3~6개" : "5~10개";
  const prompt = [
    "아래는 부동산 영상의 클립(문장) 목록입니다. 이야기 흐름에 따라 씬(이야기 묶음)으로 나누고 씬마다 짧은 이름을 붙여 주세요.",
    `- 씬은 ${want}. 순서는 그대로, 이어지는 클립끼리만 묶기. 한 씬에 클립 한 개만 있는 씬은 되도록 만들지 마세요.`,
    "- 씬 이름은 목차처럼 짧게 (예: 도입, 위치·교통, 가격·조건, 내부 구조, 마무리) — 8자 안팎.",
    '- JSON 만: {"scenes":[{"from":1,"title":"도입"},{"from":4,"title":"위치·교통"}]} — from 은 그 씬이 시작하는 클립 번호.',
    "",
    lines.map((t, i) => `${i + 1}. ${String(t || "").replace(/\s+/g, " ").slice(0, 200) || "(쉼)"}`).join("\n"),
  ].join("\n");
  const parse = (t) => {
    const m = /\{[\s\S]*\}/.exec(String(t || ""));
    try {
      const j = m ? JSON.parse(m[0]) : null;
      return j && Array.isArray(j.scenes) ? j : null;
    } catch {
      return null;
    }
  };
  onProgress("글 AI가 씬을 나누는 중… (1분 안팎)");
  const text = await ai.ask(prompt, { onProgress, busyLabel: "영상 씬을 정리하고 있습니다", isComplete: (t) => Boolean(parse(t)) });
  const j = parse(text);
  if (!j) throw new Error("AI 답을 읽지 못했습니다. 다시 눌러 주세요.");
  const seen = new Set();
  const out = j.scenes
    .map((s) => ({ title: String(s.title || "").trim().slice(0, 20), from: Math.round(Number(s.from)) }))
    .filter((s) => s.from >= 1 && s.from <= n && !seen.has(s.from) && seen.add(s.from))
    .sort((a, b) => a.from - b.from);
  if (!out.length || out[0].from !== 1) out.unshift({ title: "", from: 1 });
  return out;
}

module.exports = { script, scenesFor, shorts, image, matchFootage, footageSheets, aiEdit, groupScenes, facts: (v) => lib.gwVideoFacts(v), tl };

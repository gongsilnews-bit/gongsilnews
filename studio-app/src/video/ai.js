// 영상 편집기 — 회원 AI(기본 글쓰기 AI)로 대본 쓰기 · 문장별 화면 검색어 · 숏폼 구간 고르기 · AI 그림
// 지시문은 서버 묶음(video/video-script.js)에서 받는다 (설치 파일에 넣지 않음).
const ext = require("../ext");
const ai = require("../ai");
const tl = require("./timeline");

const lib = ext.lazyModule(() => ext.run(["video/video-script.js"], ["gwVideoFacts", "gwVideoScriptPrompt", "gwVideoScenePrompt", "gwShortsPrompt", "gwVideoParse"]));

/** 문장 끝 부호를 확실히 (2026-10-20 사장님: 마침표가 없으면 성우가 끝을 흐린다) — 말줄임·쉼표·물결은 마침표로 */
const endMark = (t) => (!t || /[.?!]["'」』)]*$/.test(t) ? t : t.replace(/[\s,~…·]+$/, "") + ".");

/** 대본 — { topic, style, request, chars, vacancy, source } → { title, scenes:[{title, lines:[{text, desc, keywords, kind}]}], chatUrl } */
const pickOf = (o) => (o && o.ai && o.ai.provider ? { provider: o.ai.provider, mode: o.ai.mode === "api" ? "api" : "account" } : {}); // 대본 쓰기에서 고른 AI 를 꾸미기 단계에도 (2026-10-23 사장님: Gemini 골랐는데 ChatGPT)
async function script(opts, onProgress = () => {}) {
  let chatUrl = "";
  const pick = opts.ai && opts.ai.provider ? { provider: opts.ai.provider, mode: opts.ai.mode === "api" ? "api" : "account" } : {}; // 쓸 AI 를 골랐으면 그것으로
  const text = await ai.ask(lib.gwVideoScriptPrompt(opts), {
    ...pick,
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
    .map((s) => ({ title: String(s.title || ""), lines: (s.lines || []).map((l) => ({ text: endMark(String(l.text || "").trim()), desc: String(l.desc || ""), keywords: String(l.keywords || ""), kind: l.kind === "image" ? "image" : "video" })).filter((l) => l.text) }))
    .filter((s) => s.lines.length);
  return { ...j, chatUrl };
}

/** 이미 있는 문장들에 화면 검색어 붙이기 → [{desc, keywords, kind}] */
async function scenesFor(lines, onProgress = () => {}, opts = {}) {
  if (!lines.length) return [];
  const text = await ai.ask(lib.gwVideoScenePrompt(lines), {
    ...pickOf(opts),
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

/** AI 그림 (기본 이미지 생성 AI) → data URL. opts.ratio — 영상 비율 (API 키면 그 비율로, 계정이면 글로 부탁) */
function image(prompt, onProgress, opts = {}) {
  const ratio = String(opts.ratio || "");
  const word = { "16:9": "wide 16:9 landscape", "9:16": "tall 9:16 vertical", "1:1": "square 1:1", "4:5": "vertical 4:5", "4:3": "4:3 landscape" }[ratio];
  // files: 캐릭터 시트 등 참고 사진 (2026-10-21 사장님: 캐릭터 일관성) — 있는 파일만
  const files = (opts.files || []).filter((x) => x && require("fs").existsSync(x)).slice(0, 3);
  // 쓸 AI — 그림을 그릴 수 있는 AI(ChatGPT·Gemini)를 골랐으면 그것으로, Claude 면 기본 이미지 생성 AI (2026-10-21 사장님: Gemini 골랐는데 ChatGPT 가 그렸다)
  const pick = opts.ai && opts.ai.provider && opts.ai.provider !== "claude" ? { provider: opts.ai.provider, mode: opts.ai.mode === "api" ? "api" : "account" } : {};
  return ai.askImage(word ? `${prompt} Image aspect ratio: ${word}.` : prompt, { ...pick, onProgress, ratio, files });
}

/* ── 클립별 AI 그림 — 대본 → 영어 장면 설명 (2026-10-19 사장님, 공실뉴스 AI 스튜디오 앱 방식) ──
   lines: 클립 글 · opts: { kinds?: ("auto"|"background"|"character"|"graph")[], style?: 스타일 이름, character?: 그 스타일 주인공 설명,
                          modify?: { current, request } (한 줄 고치기) }
   → 영어 설명 문자열 배열 (같은 순서) */
const VISUAL_RULES = [
  "VISUAL RULES:",
  "1. NO TEXT in the image. ABSOLUTELY NO KOREAN (Hangul) letters — image AIs render them as broken artifacts.",
  "2. Do NOT use currency symbols ($, ₩) unless the segment is about physical cash or a close-up financial chart (then ₩ for Korean news).",
  "3. The setting is modern South Korea unless the script says otherwise.",
].join("\n");
const KIND_FOCUS = {
  background: "Focus EXCLUSIVELY on places: buildings, rooms, streets, skylines, architectural details. No people in focus. Static and atmospheric.",
  character: "Focus on PEOPLE: Korean office workers, real estate agents, tenants or citizens in a modern setting, with expressions that fit the script. Mid-shot or close-up.",
  graph: "Focus on an INFOGRAPHIC: clean 3D visualization, abstract bar charts, rising/falling arrows or pictograms for the data. Minimalist corporate look. NO TEXT, NO NUMBERS.",
  auto: "Focus on architectural details, urban scenes, interiors, or a clear visual metaphor for the real estate topic.",
};
async function imagePrompts(lines, opts = {}, onProgress = () => {}) {
  const list = (lines || []).map((t) => String(t || "").replace(/\s+/g, " ").trim());
  if (!list.length) return [];
  const kinds = list.map((_, i) => (opts.kinds && KIND_FOCUS[opts.kinds[i]] ? opts.kinds[i] : "auto"));
  const hero = opts.character ? `\nEvery scene stars this character (describe what the character is doing in the scene): ${opts.character}` : "";
  const parse = (t) => {
    const m = /\[[\s\S]*\]/.exec(String(t || ""));
    try {
      const a = m ? JSON.parse(m[0]) : null;
      return Array.isArray(a) ? a.map((x) => String(typeof x === "string" ? x : (x && (x.prompt || x.visualPrompt)) || "").trim()) : null;
    } catch {
      return null;
    }
  };
  let prompt;
  if (opts.modify && list.length === 1) {
    prompt = [
      "You are an expert prompt engineer for AI image generation.",
      `Current prompt: "${String(opts.modify.current || "")}"`,
      `User request (Korean): "${String(opts.modify.request || "")}"`,
      `Script of this scene (Korean): "${list[0]}"`,
      "Rewrite the prompt in English to include the user's request, keeping it professional and cinematic." + hero,
      VISUAL_RULES,
      'Answer JSON only: ["new English prompt"]',
      "Do NOT generate or draw any image. Reply with text only.",
    ].join("\n");
  } else {
    prompt = [
      'You are a professional storyboard artist for "Gongsil News" (Korean real estate news & listings).',
      "Below are the video clips in order (Korean narration). For EACH clip write one highly descriptive English prompt for an AI image generator.",
      "Keep continuity: the same property / neighborhood / character should look consistent across clips." + hero,
      opts.style ? `The final art style will be added separately (${opts.style}) — describe the scene content, composition, lighting and camera, not the art style.` : "",
      VISUAL_RULES,
      "",
      "[Clips]",
      list.map((t, i) => `${i + 1}. (${kinds[i]}: ${KIND_FOCUS[kinds[i]]}) ${t}`).join("\n"),
      "",
      `Answer JSON only: an array of exactly ${list.length} English prompt strings in the same order.`,
      "Do NOT generate or draw any image yourself — reply with the JSON text only.",
    ].filter((x) => x !== "").join("\n");
  }
  onProgress("글 AI가 클립마다 장면 설명을 쓰는 중…");
  const pick = opts.ai && opts.ai.provider ? { provider: opts.ai.provider, mode: opts.ai.mode === "api" ? "api" : "account" } : {}; // 쓸 AI 를 골랐으면 그것으로 (2026-10-21: 프롬프트·그림에도)
  // 클립 하나일 때 — 수동(내 계정)에서 AI 가 그림을 바로 그려 복사했으면 그 그림을 그대로 (data URL 을 돌려준다, 2026-10-31)
  const text = await ai.ask(prompt, { ...pick, onProgress, busyLabel: "그림 장면 설명을 쓰고 있습니다", isComplete: (t) => Boolean(parse(t)), allowImage: list.length === 1 });
  if (/^data:image\//.test(String(text || ""))) return [String(text)];
  const out = parse(text) || [];
  return list.map((_, i) => out[i] || "");
}

/* ── 클립마다 이미지 프롬프트 + 동영상(움직임) 프롬프트를 한 번에 (2026-10-21 사장님: [프롬프트 만들기] 한 번에 다)
   lines·opts 는 imagePrompts 와 같다 (+ opts.extra: 내 맞춤 프롬프트) → [{ image, motion }] (같은 순서)
   opts.styles: [{ id, label, desc, character? }] — 그림 스타일 [자동]: AI 가 대본을 읽고 하나를 골라 모든 클립에 → { style, clips } (2026-10-21 사장님) */
async function clipPrompts(lines, opts = {}, onProgress = () => {}) {
  const list = (lines || []).map((t) => String(t || "").replace(/\s+/g, " ").trim());
  if (!list.length) return [];
  const kinds = list.map((_, i) => (opts.kinds && KIND_FOCUS[opts.kinds[i]] ? opts.kinds[i] : "auto"));
  const hero = opts.character ? `\nEvery scene stars this character (describe what the character is doing in the scene): ${opts.character}` : "";
  const pick = Array.isArray(opts.styles) && opts.styles.length ? opts.styles : null;
  let chosen = "";
  const parse = (t) => {
    const txt = String(t || "");
    try {
      let a = null;
      if (pick) {
        const o = /\{[\s\S]*\}/.exec(txt);
        const j = o ? JSON.parse(o[0]) : null;
        if (!j || !Array.isArray(j.clips)) return null;
        chosen = String(j.style || "");
        a = j.clips;
      } else {
        const m = /\[[\s\S]*\]/.exec(txt);
        a = m ? JSON.parse(m[0]) : null;
      }
      return Array.isArray(a) ? a.map((x) => ({ image: String((x && (x.image || x.prompt)) || "").trim(), motion: String((x && (x.motion || x.video)) || "").trim() })) : null;
    } catch {
      return null;
    }
  };
  const styleLine = pick
    ? [
        "FIRST choose ONE art style for the WHOLE video from this list (it must fit the script, the audience and the topic; every clip uses the same style):",
        ...pick.map((x) => `- ${x.id}: ${x.label} — ${x.desc || ""}${x.character ? ` (main character: ${x.character})` : ""}`),
        "If the chosen style has a main character, every scene stars that character. The art style itself will be added separately — describe the scene content, composition, lighting and camera.",
      ].join("\n")
    : opts.style
      ? `The final art style will be added separately (${opts.style}) — describe the scene content, composition, lighting and camera, not the art style.`
      : "";
  const prompt = [
    'You are a professional storyboard artist and video director for "Gongsil News" (Korean real estate news & listings).',
    "Below are the video clips in order (Korean narration). For EACH clip write TWO English prompts:",
    '  "image": one highly descriptive prompt for an AI image generator (the still frame of this clip).',
    '  "motion": one short prompt for an image-to-video AI that animates THAT still frame — camera movement (push-in, pan, drone rise, orbit, static…) and subject motion that fit the narration. Keep the scene identical to the still frame; 1-2 sentences.',
    "Keep continuity: the same property / neighborhood / character should look consistent across clips. Vary the camera motions so the video does not feel repetitive." + hero,
    styleLine,
    opts.extra ? `The user also wants (apply to every clip): ${opts.extra}` : "",
    VISUAL_RULES,
    "",
    "[Clips]",
    list.map((t, i) => `${i + 1}. (${kinds[i]}: ${KIND_FOCUS[kinds[i]]}) ${t}`).join("\n"),
    "",
    pick
      ? `Answer JSON only: {"style": "<style id from the list>", "clips": [exactly ${list.length} objects {"image": "...", "motion": "..."} in the same order]}`
      : `Answer JSON only: an array of exactly ${list.length} objects {"image": "...", "motion": "..."} in the same order.`,
  ].filter((x) => x !== "").join("\n");
  onProgress("글 AI가 클립마다 이미지·동영상 프롬프트를 쓰는 중…");
  const aiPick = opts.ai && opts.ai.provider ? { provider: opts.ai.provider, mode: opts.ai.mode === "api" ? "api" : "account" } : {}; // 쓸 AI 를 골랐으면 그것으로 (2026-10-21: 프롬프트·그림에도)
  const text = await ai.ask(prompt, { ...aiPick, onProgress, busyLabel: "이미지·동영상 프롬프트를 쓰고 있습니다", isComplete: (t) => Boolean(parse(t)) });
  const out = parse(text) || [];
  const clips = list.map((_, i) => out[i] || { image: "", motion: "" });
  if (pick) return { style: pick.some((x) => x.id === chosen) ? chosen : pick[0].id, clips };
  return clips;
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
async function matchFootage(lines, items, onProgress = () => {}, opts = {}) {
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
      ...(opts.hints
        ? [
            // 화면 구성까지 한 번에 — 고른 장면이 없는 문장은 무료 영상·사진에서 찾을 화면 (scenesFor 와 같은 칸)
            "src 가 \"\" 인 문장은 무료 영상·사진에서 찾을 화면도 정해 주세요: desc(한국어 화면 설명), keywords(무료 영상 사이트 영어 검색어 2~4단어), kind(video 또는 image).",
            '답은 JSON 만: {"lines":[{"n":1,"src":"V2","t":12},{"n":2,"src":"","t":0,"desc":"화면 설명","keywords":"english keywords","kind":"video"}]}  (t: 그 영상에서 시작할 초, 사진은 0)',
          ]
        : ['답은 JSON 만: {"lines":[{"n":1,"src":"V2","t":12},{"n":2,"src":"P1","t":0}]}  (t: 그 영상에서 시작할 초, 사진은 0)']),
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
    const text = await ai.ask(prompt, { ...pickOf(opts), onProgress, files: sheets.map((x) => x.file), busyLabel: "장면을 고르고 있습니다", isComplete: (t) => Boolean(parse(t) && Array.isArray(parse(t).lines)) });
    const j = parse(text) || { lines: [] };
    return lines.map((_, i) => {
      const l = (j.lines || []).find((x) => Number(x.n) === i + 1) || {};
      const m = /^([VP])(\d+)$/i.exec(String(l.src || "").trim());
      const v = m ? Number(m[2]) - 1 : -1;
      // 화면 구성 (opts.hints) — 장면을 못 고른 문장의 무료 자료 검색어
      const hint = opts.hints && l.keywords ? { desc: String(l.desc || ""), keywords: String(l.keywords || ""), kind: l.kind === "image" ? "image" : "video" } : undefined;
      if (v < 0 || v >= items.length) return { v: -1, t: 0, hint };
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
 *  opts: { aiMax, moods: string[], screen?: false(화면은 그대로), catalog?: 자막 스타일·효과·스티커·효과음 목록 (있으면 그것까지 — 2026-10-19 사장님) }
 *  돌려줌: { clips: [{ act, v, t, keywords, desc, title, emph, trans, sticker?, sfx? }], music, look? }
 *  AI 는 우리가 보낸 목록 안에서만 고른다 (없는 이름은 버림) → 미리보기 = 완성 영상
 */
async function aiEdit(lines, items, opts = {}, onProgress = () => {}) {
  if (!lines.length) return { clips: [], music: "" };
  const useFoot = items.length > 0;
  const made = useFoot ? await footageSheets(items, onProgress) : { sheets: [], dir: "" };
  try {
    const aiMax = opts.aiMax === 0 ? 0 : Number(opts.aiMax) || 8;
    const screen = opts.screen !== false;
    const cat = opts.catalog || null;
    // AI 편집 창 (2026-10-20 사장님) — 영상 종류 · 회원 요청 · 이미 화면이 있는 클립 · 무료 자료 쓸지 · 그래픽·효과음 양 · 쓸 AI
    const KIND = { vacancy: "부동산 매물 소개 영상 (방·주방·욕실·건물·동네를 보여 주는 화면이 좋아요)", news: "부동산 뉴스·보도자료 해설 영상 (차분하고 믿음직하게, 자료·도시·건물 화면)", topic: "부동산 정보·자유 주제 영상" };
    const kindLine = KIND[opts.kind] ? `영상 종류: ${KIND[opts.kind]}` : "";
    const request = String(opts.request || "").trim().slice(0, 500);
    const locked = new Set((Array.isArray(opts.locked) ? opts.locked : []).map(Number)); // 1부터 — 회원이 이미 화면을 넣은 클립
    const useStock = opts.stock !== false;
    const many = opts.graphics === "many";
    const sfxMany = opts.sfx === "many";
    const ids = (l) => (Array.isArray(l) ? l.map((x) => String(x.id)) : []);
    const show = (l) => l.map((x) => `${x.id}(${x.label})`).join(", ");
    const lookAsk = cat
      ? [
          "",
          "[영상 전체 자막 모양 — look] 영상 분위기(뉴스·해설은 차분·신뢰, 매물 소개·쇼츠는 밝고 눈에 띄게)에 맞게 아래 목록에서만 고르세요:",
          `- preset (자막 스타일): ${show(cat.presets || [])}`,
          `- in (나타나기): ${show(cat.ins || [])} · out (사라지기): fade 또는 ""`,
          `- emph (계속 움직임, 보통 ""): ${show(cat.emphs || [])}`,
          `- wshow (단어·줄 효과 — 쇼츠·빠른 영상이면 "word", 강의·해설은 보통 ""): word(한 단어씩), line(한 줄씩), ""`,
          `- whl (말하는 단어 강조, wshow 를 쓸 때만): ${show(cat.whl || [])}, "" · wcolor: 강조색 #RRGGBB`,
          `- lines (자막 한 화면 최대 줄 수): ${opts.ratio === "9:16" ? "1 (세로 영상)" : "2 또는 1"}`,
        ]
      : [];
    const stkAsk = cat && (cat.stickers || []).length
      ? [
          `5) sticker — 강조할 클립에만 스티커 (전체의 ${many ? "1/3" : "1/5"} 안팎, 이어지는 클립에 연달아 넣지 말기). 없으면 null.`,
          `   {"text":"짧은 글 2~8자, 말한 내용에서 (예: 역 1분!, 남향, 전세 5억, 풀옵션, 초품아)","style":"모양"} — style: ${show(cat.stickers)}`,
          `   예시: ${(cat.examples || []).slice(0, 24).join(" / ")}`,
          `6) sfx — 스티커 없이 소리만 넣을 강조 순간이면 효과음 이름 (${sfxMany ? "가끔" : "드물게"}), 아니면 "": ${show(cat.sfx || [])}`,
        ]
      : [];
    const list = items.map((it, i) => (it.kind === "image" ? `P${i + 1}: 사진` : `V${i + 1}: 영상 ${Math.round(Number(it.duration) || 0)}초`)).join("\n");
    const prompt = [
      "부동산 중개사가 만든 영상(강의·매물 소개)을 편집해 주세요. 아래는 클립마다 말한 내용(자막)이에요.",
      kindLine,
      request ? `[회원 요청 — 꼭 따르기] ${request}` : "",
      locked.size ? `이미 화면을 넣은 클립 (화면은 반드시 "keep"): ${[...locked].sort((a, b) => a - b).join(", ")}` : "",
      useFoot ? "첨부한 그림은 제가 찍어 둔 영상·사진의 장면 모음이에요 (칸마다 왼쪽 위 'V번호 초' = 그 영상의 그 시각, 'P번호' = 사진)." : "",
      useFoot ? `\n[내 자료]\n${list}` : "",
      "",
      "[클립]",
      lines.map((t, i) => `${i + 1}. ${t}`).join("\n"),
      "",
      "클립마다 정해 주세요:",
      screen ? "" : '1) act — 화면은 모두 "keep" (화면은 바꾸지 않기).',
      !screen ? "" : "1) act — 화면: \"keep\"(원래 화면 그대로 — 화면을 설명하는 말 '여기를 누르면'·인사·말하는 얼굴이 중요한 곳)" +
        (useFoot ? ', "foot"(내 자료 — src 와 t(시작 초))' : "") +
        (aiMax > 0 ? `, "ai"(AI 그림 — desc 에 그릴 장면을 한국어로 구체적으로, 전체 ${aiMax}개까지)` : "") +
        (useStock ? ', "stock"(무료 사진·영상 — keywords 에 한국어 검색어 2~3낱말).' : ".") +
        " 매물·동네·건물·방·생활 이야기는 바꾸고, 내 자료에 맞는 장면이 있으면 그것을 먼저 쓰세요." +
        " 문장마다 화면을 바꾸면 정신없으니, 같은 이야기가 이어지는 2~3개 클립은 같은 화면을 이어 쓰세요 (뒤 클립을 \"same\" 으로 — 앞 클립 화면을 그대로).",
      "2) title — 화면에 크게 띄울 핵심 글 (가격·면적처럼 꼭 기억할 숫자만, 8자 안팎). 없으면 \"\". 아주 드물게 — 전체의 1/6 안팎, 자막과 거의 같은 말이면 넣지 않기.",
      "3) emph — 자막을 강조할 중요한 문장이면 true.",
      "4) trans — 이야기 주제가 바뀌어 화면전환을 넣을 클립이면 true (첫 클립 제외, 가끔만).",
      ...stkAsk,
      `그리고 영상 전체 배경음악 분위기 music 을 하나: ${(opts.moods || []).join(", ")}.`,
      // 스타일 팩 — [자동]이면 대본을 읽고 영상 전체 디자인 한 벌을 고른다 (2026-10-20 사장님)
      Array.isArray(opts.packs) && opts.packs.length
        ? `그리고 영상 전체 디자인(스타일 팩) pack 을 하나 — 대본 내용·분위기에 가장 어울리는 것: ${opts.packs.map((x) => `${x.id}(${x.label} — ${x.desc})`).join(", ")}`
        : "",
      ...lookAsk,
      cat
        ? 'JSON 만: {"music":"잔잔한","pack":"modern","look":{"preset":"plain","in":"pop","out":"fade","emph":"","wshow":"","whl":"","wcolor":"#FFE000","lines":2},"clips":[{"n":1,"act":"keep","title":"","emph":false,"trans":false,"sticker":null,"sfx":""},{"n":2,"act":"ai","desc":"햇살 드는 넓은 거실","title":"전세 5억","emph":true,"trans":false,"sticker":{"text":"남향!","style":"burst"},"sfx":""}]}'
        : 'JSON 만: {"music":"잔잔한","pack":"modern","clips":[{"n":1,"act":"keep","title":"","emph":false,"trans":false},{"n":2,"act":"ai","desc":"햇살 드는 넓은 거실","title":"전세 5억","emph":true,"trans":false}]}',
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
    const pick = opts.ai && opts.ai.provider ? { provider: opts.ai.provider, mode: opts.ai.mode === "api" ? "api" : "account" } : {}; // 쓸 AI 를 골랐으면 그것으로
    const text = await ai.ask(prompt, { ...pick, onProgress, files: made.sheets.map((x) => x.file), busyLabel: "영상 편집 계획을 세우고 있습니다", isComplete: (t) => Boolean(parse(t) && Array.isArray(parse(t).clips)) });
    const j = parse(text) || { clips: [] };
    let aiLeft = aiMax;
    const clips = lines.map((_, i) => {
      const l = (j.clips || []).find((x) => Number(x.n) === i + 1) || {};
      const extra = { title: String(l.title || "").trim().slice(0, 24), emph: Boolean(l.emph), trans: i > 0 && Boolean(l.trans) };
      // 스티커·효과음 — 보낸 목록에 있는 것만
      if (cat && l.sticker && typeof l.sticker === "object" && ids(cat.stickers).includes(String(l.sticker.style)) && String(l.sticker.text || "").trim())
        extra.sticker = { text: String(l.sticker.text).trim().slice(0, 12), style: String(l.sticker.style) };
      if (cat && !extra.sticker && ids(cat.sfx).includes(String(l.sfx || ""))) extra.sfx = String(l.sfx);
      if (!screen || locked.has(i + 1)) return { act: "keep", ...extra };
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
      if (useStock && (act === "stock" || act === "ai") && (l.keywords || l.desc)) return { act: "stock", keywords: String(l.keywords || l.desc).slice(0, 40), ...extra };
      return { act: "keep", ...extra };
    });
    // 영상 전체 자막 모양 — 목록에 없는 이름은 버린다
    let look = null;
    if (cat && j.look && typeof j.look === "object") {
      const lk = j.look;
      const pick = (v, l) => (ids(l).includes(String(v || "")) ? String(v) : "");
      look = {
        preset: pick(lk.preset, cat.presets),
        in: pick(lk.in, cat.ins),
        out: String(lk.out || "") === "fade" ? "fade" : "",
        emph: pick(lk.emph, cat.emphs),
        wshow: ["word", "line"].includes(String(lk.wshow || "")) ? String(lk.wshow) : "",
        whl: pick(lk.whl, cat.whl),
        wcolor: /^#[0-9a-f]{6}$/i.test(String(lk.wcolor || "")) ? String(lk.wcolor) : "",
        lines: [1, 2, 3].includes(Number(lk.lines)) ? Number(lk.lines) : 0,
      };
    }
    const pack = Array.isArray(opts.packs) && opts.packs.some((x) => x.id === String(j.pack || "")) ? String(j.pack) : "";
    return { clips, music: String(j.music || ""), look, pack };
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

module.exports = { imagePrompts, clipPrompts, script, scenesFor, shorts, image, matchFootage, footageSheets, aiEdit, groupScenes, facts: (v) => lib.gwVideoFacts(v), tl };

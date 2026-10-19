// 영상 편집기 — PC에서 굽기 (앱에 넣은 FFmpeg)
//  1) 클립마다 조각 영상: 화면(영상·사진·검정) → 비율에 맞춰 채우기/맞추기/흐린 배경 → 자막(ASS) → 소리(성우·원본·무음)
//  2) 조각 잇기 (같은 규격이라 다시 굽지 않고 붙인다)
//  3) 배경 음악 섞기 (말할 때 음악 소리를 자동으로 줄인다)
// 모든 자료는 PC 파일(편집용 사본)이라 인터넷을 기다리지 않는다 (사장님: 렌더링 시간 단축).
const fs = require("fs");
const path = require("path");
const os = require("os");
const log = require("electron-log/main");
const ff = require("./ff");
const tl = require("./timeline");
const { RATIOS } = require("./project");
const fonts = require("./fonts");

const FPS = 30;

/* ── 자막 (ASS) ── */
const assColor = (hex, alpha = 0) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "#FFFFFF") || [0, "FFFFFF"];
  const r = m[1].slice(0, 2), g = m[1].slice(2, 4), b = m[1].slice(4, 6);
  return `&H${alpha.toString(16).padStart(2, "0").toUpperCase()}${b}${g}${r}`.toUpperCase();
};
const assTime = (t) => {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
const assEsc = (t) => String(t).replace(/\\/g, "＼").replace(/\{/g, "(").replace(/\}/g, ")").replace(/\r?\n/g, "\\N");

/** 자막 줄 나누기 — 한 줄 최대 글자 수 (비율에 따라) */
/** 줄 나누기 — 직접 넣은 줄바꿈(엔터)은 그대로 두고, 긴 줄만 글자 수로 나눈다 (timeline.ts wrap 과 같음) */
function wrap(text, max) {
  const fits = typeof max === "number" ? (l) => l.length <= max : max; // 글자 수, 또는 "이 줄이 들어가나" 판정
  const lines = [];
  for (const part of String(text).split(/\r?\n/)) {
    const words = part.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      if (cur && !fits(cur + " " + w)) {
        lines.push(cur);
        cur = w;
      } else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

const assHead = (W, H) =>
  `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n` +
  `[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;
const assEvents = "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";

/* ── 글자 애니메이션 (화면 글자·메인자막) — 미리보기 timeline.animAt 과 같은 계산을 칸(1/30초)마다 자막 엔진 표시로 ──
   덩어리 가운데를 축으로 키우기(\fscx\fscy)·돌리기(\frz \org)·옮기기(\pos)·흐리기(\1a\3a\4a). 같은 모양이 이어지면 한 줄로 묶는다 (2026-10-19) */
const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0").toUpperCase();
/**
 * o: { layer, style, lines(줄 글자), bc{x,y}(덩어리 가운데), lh(줄 높이), an, a, b(애니메이션 구간, 클립 시각), s0, s1(보이는 구간), end(마지막 줄 끝 시각),
 *      W, H, base{a1,a3,a4}(원래 투명도 0=불투명~255), extra(덧붙일 표시, 예: \blur),
 *      words(단어별 효과 — { fx, list[{w,s,e}], color(원래 글자색) }) }
 */
function animTextEvents(o) {
  const out = [];
  const n = o.lines.length;
  // 단어별 효과 — 줄(조각)마다 그 줄 단어들
  const partWords = [];
  if (o.words) {
    let k = 0;
    for (const txt of o.lines) {
      const c = String(txt).split(/\s+/).filter(Boolean).length;
      partWords.push(o.words.list.slice(k, k + c));
      k += c;
    }
  }
  const bgr = (hex) => assColor(hex).slice(4);
  /** 단어마다 그 시각 모습 (보이는 정도 · 지금 단어 색/크기) — 단어 뒤에는 줄 모양으로 되돌린다 */
  const wordText = (txt, i, t, r, common) => {
    const ws = partWords[i] || [];
    const fx = o.words.fx;
    let wi = 0;
    const al = (base, wa) => hex2(255 - (255 - base) * Math.max(0, Math.min(1, r.op)) * wa);
    return String(txt).split(/(\s+)/).map((part) => {
      if (!part.trim()) return assEsc(part);
      const w = ws[wi++];
      if (!w) return assEsc(part);
      const st = tl.wordState(fx, w, t);
      let tags = "";
      if (st.a < 1) tags += `\\1a&H${al(o.base.a1, st.a)}&\\3a&H${al(o.base.a3, st.a)}&\\4a&H${al(o.base.a4, st.a)}&`;
      if (st.cur && fx.hl !== "big") tags += `\\1c&H${bgr(fx.color)}&`;
      if (st.cur && fx.hl !== "color") tags += `\\fscx${(118 * r.sc * r.sx).toFixed(1)}\\fscy${(118 * r.sc).toFixed(1)}`;
      if (!tags) return assEsc(part);
      return `{${tags}}${assEsc(part)}{${common}\\1c&H${bgr(o.words.color)}&}`;
    }).join("");
  };
  const N = Math.max(1, Math.round((o.s1 - o.s0) * FPS));
  let prevKey = null;
  let prevTags = null;
  let from = o.s0;
  const flush = (to) => {
    if (prevTags && to > from + 0.004) for (const tx of prevTags) out.push(`Dialogue: ${o.layer},${assTime(from)},${assTime(to)},${o.style},,0,0,0,,${tx}`);
  };
  for (let k = 0; k <= N; k++) {
    const t = Math.min(o.s1, o.s0 + k / FPS);
    let tags = null;
    let key = "END";
    if (k < N) {
      const r = tl.animAt(o.an, t, o.a, o.b);
      if (r.op > 0.004 && r.sc > 0.004 && Math.abs(r.sx) > 0.004 && o.lineIn) {
        // 한 줄씩 + [인] 효과 — 줄마다 그 줄이 나오는 때에 따로 들어온다 (덩어리 효과[아웃·반복]와 겹쳐서)
        const an = o.align === "left" ? 4 : o.align === "right" ? 6 : 5;
        tags = o.lines.map((txt, i) => {
          const q = tl.animAt(o.lineIn, t, o.lineAt[i] ?? o.a, 1e6);
          const rr = { op: r.op * q.op, sc: r.sc * q.sc, sx: r.sx * q.sx, rot: r.rot + q.rot, dx: r.dx + q.dx, dy: r.dy + q.dy };
          if (!(rr.op > 0.004 && rr.sc > 0.004 && Math.abs(rr.sx) > 0.004)) return null;
          const cx = o.bc.x + rr.dx * o.W, cy = o.bc.y + (i - (n - 1) / 2) * o.lh * r.sc + rr.dy * o.H;
          const al = (base) => hex2(255 - (255 - base) * Math.max(0, Math.min(1, rr.op)));
          const common = `\\org(${cx.toFixed(1)},${cy.toFixed(1)})\\frz${(-(rr.rot + (o.rot0 || 0))).toFixed(2)}\\fscx${(100 * rr.sc * rr.sx).toFixed(1)}\\fscy${(100 * rr.sc).toFixed(1)}\\1a&H${al(o.base.a1)}&\\3a&H${al(o.base.a3)}&\\4a&H${al(o.base.a4)}&${o.extra || ""}`;
          const ax = o.align === "left" ? cx - (o.halfW || 0) * rr.sc * rr.sx : o.align === "right" ? cx + (o.halfW || 0) * rr.sc * rr.sx : cx;
          return `{\\an${an}\\pos(${ax.toFixed(1)},${cy.toFixed(1)})${common}}${o.words ? wordText(txt, i, t, rr, common) : assEsc(txt)}`;
        }).filter(Boolean);
        key = tags.length ? tags.join("|") : "HIDE";
        if (!tags.length) tags = null;
      } else if (r.op > 0.004 && r.sc > 0.004 && Math.abs(r.sx) > 0.004) {
        const cx = o.bc.x + r.dx * o.W, cy = o.bc.y + r.dy * o.H;
        const al = (base) => hex2(255 - (255 - base) * Math.max(0, Math.min(1, r.op)));
        const common = `\\org(${cx.toFixed(1)},${cy.toFixed(1)})\\frz${(-(r.rot + (o.rot0 || 0))).toFixed(2)}\\fscx${(100 * r.sc * r.sx).toFixed(1)}\\fscy${(100 * r.sc).toFixed(1)}\\1a&H${al(o.base.a1)}&\\3a&H${al(o.base.a3)}&\\4a&H${al(o.base.a4)}&${o.extra || ""}`;
        // 정렬 — 왼쪽/오른쪽이면 덩어리 가장자리에 붙인다 (halfW = 덩어리 반 너비)
        const an = o.align === "left" ? 4 : o.align === "right" ? 6 : 5;
        const ax = o.align === "left" ? cx - (o.halfW || 0) * r.sc * r.sx : o.align === "right" ? cx + (o.halfW || 0) * r.sc * r.sx : cx;
        tags = o.lines.map((txt, i) => `{\\an${an}\\pos(${ax.toFixed(1)},${(cy + (i - (n - 1) / 2) * o.lh * r.sc).toFixed(1)})${common}}${o.words ? wordText(txt, i, t, r, common) : assEsc(txt)}`);
        key = tags.join("|");
      } else key = "HIDE";
    }
    if (key !== prevKey) {
      flush(k === N ? o.end : t);
      prevKey = key;
      prevTags = tags;
      from = t;
    }
  }
  return out;
}

/** 대소문자 (TT·tt·Tt) — 미리보기 CSS text-transform 과 같게 (2026-10-19) */
const caseOf = (t, c) => (c === "upper" ? String(t).toUpperCase() : c === "lower" ? String(t).toLowerCase() : c === "title" ? String(t).replace(/(^|[\s(["'])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : String(t));
/** 정렬 → 자막 엔진 자리 번호 (row: top|middle|bottom) */
const alignNo = (row, align) => (row === "top" ? 7 : row === "middle" ? 4 : 1) + (align === "left" ? 0 : align === "right" ? 2 : 1);

/** 화면 글자 애셋 스타일 (미리보기 Player.tsx 와 같은 크기·자리) */
function textLayerStyle(name, W, H, l) {
  const size = Math.round(Math.min(W, H) * 0.08 * ((Number(l.size) || 100) / 100));
  const pos = l.pos || "top";
  const align = alignNo(pos === "top" ? "top" : pos === "middle" ? "middle" : "bottom", l.align);
  const marginV = pos === "top" ? Math.round(H * 0.06) : pos === "middle" ? 0 : Math.round(H * 0.07);
  // 상자(BorderStyle 3)는 libass 가 테두리 색(OutlineColour)으로 칠한다
  const boxCol = assColor(l.boxColor || "#000000", Math.round((1 - Math.max(0, Math.min(1, l.boxOpacity ?? 0.62))) * 255));
  // 테두리·그림자·빛·자간·굵게 — 메인자막과 같은 규칙 (없으면 예전대로 테두리 4, 검정/흰색 자동) · 미리보기 Player.tsx textEl
  const glow = !l.box && l.glow ? l.glow : "";
  const ow = Number(l.outlineWidth ?? 4);
  const gs = Math.max(0.3, Math.min(3, Number(l.glowSize ?? 1)));
  const outCol = l.box ? boxCol : glow ? assColor(glow, Math.round(Math.max(0, Math.min(1, Number(l.glowAlpha) || 0)) * 255)) : assColor(l.outline || (String(l.color).toUpperCase() === "#111111" ? "#FFFFFF" : "#000000"), Math.round(Math.max(0, Math.min(1, Number(l.outlineAlpha) || 0)) * 255));
  const outW = l.box ? Math.round(size * 0.25 * Math.max(0.3, Math.min(2.5, Number(l.bgPad ?? 1)))) : glow ? Math.max(ow, Math.round(size * 0.11 * gs)) : ow;
  const shadow = l.box ? 0 : Math.round(size * Math.max(0, Math.min(0.2, Number(l.shadow) || 0)));
  const back = shadow ? assColor(l.shadowColor || "#000000", Math.round(Math.max(0, Math.min(1, Number(l.shadowAlpha) || 0)) * 255)) : assColor("#000000", 0xff);
  const spacing = (tl.effSpacing(l) * size).toFixed(1); // 문자 간격 — 없으면 자동
  return `Style: ${name},${l.font || fonts.DEFAULT_FAMILY},${size},${assColor(l.color || "#FFFFFF", Math.round(Math.max(0, Math.min(1, Number(l.textAlpha) || 0)) * 255))},${assColor(l.color || "#FFFFFF")},${outCol},${back},${fonts.assBold(l.font, l.bold !== false) ? -1 : 0},${l.italic ? -1 : 0},${l.underline ? -1 : 0},0,100,100,${spacing},0,${l.box ? 3 : 1},${outW},${shadow},${align},${Math.round(W * 0.05)},${Math.round(W * 0.05)},${marginV},1`;
}
/** 화면 글자 빛(글로우) — 테두리를 흐리게 번지게 */
const textLayerBlur = (W, H, l) => (!l.box && l.glow ? `\\blur${Math.max(2, Math.round(Math.min(W, H) * 0.08 * ((Number(l.size) || 100) / 100) * 0.2 * Math.max(0.3, Math.min(3, Number(l.glowSize ?? 1)))))}` : "");

/** 자막만 따로 쓴 글 — 글자 수만큼 시간을 나눠 차례로 (timeline.ts evenLines 와 같음) */
function evenLines(text, dur, max, perChunk) {
  const lines = wrap(text, max);
  const chunks = [];
  for (let i = 0; i < lines.length; i += perChunk) chunks.push(lines.slice(i, i + perChunk).join("\n"));
  const total = chunks.reduce((a, c) => a + c.length, 0) || 1;
  let t = 0;
  return chunks.map((c, i) => {
    const d = i === chunks.length - 1 ? dur - t : (c.length / total) * dur;
    const r = { s: t, e: t + d, text: c };
    t += d;
    return r;
  });
}

function subtitleStyle(W, H, st) {
  const base = Math.min(W, H) * 0.062 * ((Number(st.size) || 100) / 100);
  const size = Math.round(base);
  const pos = st.position || "bottom";
  const align = alignNo(pos === "top" || pos === "middle-high" ? "top" : pos === "middle" ? "middle" : "bottom", st.align);
  const marginV = pos === "top" ? Math.round(H * 0.08) : pos === "middle-high" || pos === "middle-low" ? Math.round(H * 0.24) : pos === "middle" ? 0 : Math.round(H * 0.07);
  // 줄 너비 칸 (미리보기 subW = 화면 88% × 줄 너비) — 왼쪽·오른쪽 정렬은 이 칸 가장자리에
  const halfW = (W * 0.88 * Math.max(0.3, Math.min(1, Number(st.wrap ?? 1)))) / 2;
  const margin = Math.round(W / 2 - halfW);
  const borderStyle = st.bg ? 3 : 1; // 3 = 글자 뒤 상자
  // 상자(BorderStyle 3)는 libass 가 테두리 색(OutlineColour)으로 칠한다
  const boxCol = assColor(st.bgColor || "#000000", Math.round((1 - Math.max(0, Math.min(1, st.bgOpacity ?? 0.62))) * 255));
  // 그림자 (상자가 아닐 때) — 글자 크기에 대한 비율 · 미리보기 SubPresets.subLookCss 와 같은 값
  const shadow = st.bg ? 0 : Math.round(size * Math.max(0, Math.min(0.2, Number(st.shadow) || 0)));
  const back = shadow ? assColor(st.shadowColor || "#000000", Math.round(Math.max(0, Math.min(1, Number(st.shadowAlpha) || 0)) * 255)) : assColor("#000000", 0xff);
  // 네온 빛 — 테두리를 빛 색으로 굵게 하고 흐리게 번지게 ({\blur}) · 두께(glowSize)·투명도(glowAlpha)
  const glow = !st.bg && st.glow ? st.glow : "";
  const gs = Math.max(0.3, Math.min(3, Number(st.glowSize ?? 1)));
  // 빛은 fancySub 가 아래 층에 따로 그린다 (테두리는 또렷하게 그대로 — 미리보기처럼, 2026-10-19 예능 자막)
  void glow; void gs;
  const outCol = st.bg ? boxCol : assColor(st.outline || "#000000", Math.round(Math.max(0, Math.min(1, Number(st.outlineAlpha) || 0)) * 255));
  const outW = st.bg ? Math.round(size * 0.25 * Math.max(0.3, Math.min(2.5, Number(st.bgPad ?? 1)))) : Number(st.outlineWidth ?? 3);
  return {
    size,
    halfW,
    tag: "",
    style:
      `Style: S,${st.font || "Malgun Gothic"},${size},${assColor(st.color, Math.round(Math.max(0, Math.min(1, Number(st.textAlpha) || 0)) * 255))},${assColor(st.color)},${outCol},${back},${fonts.assBold(st.font, st.bold) ? -1 : 0},${st.italic ? -1 : 0},${st.underline ? -1 : 0},0,100,100,${(tl.effSpacing(st) * size).toFixed(1)},0,${borderStyle},${outW},${shadow},${align},${margin},${margin},${marginV},1`,
  };
}

/**
 * 예능 자막 (2026-10-19 사장님) — 이중 테두리·그라데이션 글자. 미리보기 Player.tsx 와 같은 모양
 *  이중 테두리: 아래 층(Layer 0)에 바깥 색으로 (안쪽+바깥) 두께 테두리 + 그림자, 위 층(Layer 1)에 원래 글자(안쪽 테두리, 그림자 없음)
 *  그라데이션: 위 층을 띠·고리로 잘라(\clip) 띠마다 사이 색·투명도 — 선형·방사형·반사형·각도 (gradBands) (단어 강조 색이 있는 줄은 단색)
 */
function fancySub(events, st, size, W, H) {
  const o2 = !st.bg && Number(st.outline2Width) > 0 ? Number(st.outline2Width) : 0;
  const grad = !st.bg && st.gradTo ? st.gradTo : "";
  const glow = !st.bg && st.glow ? st.glow : "";
  if (!o2 && !grad && !glow) return events;
  const ow = Number(st.outlineWidth ?? 3);
  // 빛 — 맨 아래 층: 글자 속은 비우고 굵은 테두리를 빛 색으로 흐리게 번지게
  const gsz = Math.max(0.3, Math.min(3, Number(st.glowSize ?? 1)));
  const glowTag = glow ? `{\\bord${Math.max(ow + o2 + 2, Math.round(size * 0.11 * gsz))}\\3c&H${assColor(glow).slice(4)}&\\3a&H${Math.round(Math.max(0, Math.min(1, Number(st.glowAlpha) || 0)) * 255).toString(16).padStart(2, "0").toUpperCase()}&\\1a&HFF&\\shad0\\blur${Math.max(2, Math.round(size * 0.2 * gsz))}}` : "";
  const base = glow ? 1 : 0; // 빛이 있으면 테두리·글자 층을 한 칸씩 위로
  const bgr = (hex) => assColor(hex).slice(4);
  const gs = { type: st.gradType || "linear", angle: st.gradAngle ?? 180, from: st.color || "#FFFFFF", to: grad, a: Number(st.gradA) || 0, b: Number(st.gradB) || 0 };
  const pos = st.position || "bottom";
  const marginV = pos === "top" ? Math.round(H * 0.08) : pos === "middle-high" || pos === "middle-low" ? Math.round(H * 0.24) : pos === "middle" ? 0 : Math.round(H * 0.07);
  const styleRow = pos === "top" || pos === "middle-high" ? "top" : pos === "middle" ? "middle" : "bottom";
  const out = [];
  for (const ev of events) {
    const parts = String(ev).split(",");
    const head = parts.slice(1, 9).join(","); // 시작,끝,스타일,이름,여백…,효과
    let text = parts.slice(9).join(",");
    // 자리를 정해 두지 않은 자막은 겹치면 자막 엔진이 위로 밀어 올린다 → 스타일 자리를 \pos 로 박아 둔다
    if (!/\\pos\(/.test(text)) {
      const halfW = (W * 0.88 * Math.max(0.3, Math.min(1, Number(st.wrap ?? 1)))) / 2;
      const x = st.align === "left" ? W / 2 - halfW : st.align === "right" ? W / 2 + halfW : W / 2;
      const y = styleRow === "bottom" ? H - marginV : styleRow === "top" ? marginV : H / 2;
      text = `{\\an${alignNo(styleRow, st.align)}\\pos(${Math.round(x)},${Math.round(y)})}${text}`;
    }
    // 아래 층은 테두리만 (글자 속은 비움 — 그라데이션을 투명하게 해도 속에 색이 비치지 않게)
    const hollow = text.replace(/\\1a&H[0-9A-F]{2}&/gi, "\\1a&HFF&");
    if (glow) out.push(`Dialogue: 0,${head},${glowTag}${hollow.replace(/\\3a&H[0-9A-F]{2}&/gi, "")}`);
    if (o2) out.push(`Dialogue: ${base},${head},{\\bord${ow + o2}\\3c&H${bgr(st.outline2 || "#FFFFFF")}&\\1a&HFF&}${hollow}`);
    const top = o2 ? `{\\shad0}${text}` : text;
    const layer = base + (o2 ? 1 : 0);
    if (!grad || /\\1c/.test(text)) {
      out.push(`Dialogue: ${layer},${head},${top}`);
      continue;
    }
    // 글자 칸 높이 — \pos·\an 이 있으면 그 자리, 없으면 스타일 자리
    const an = Number((/\\an(\d)/.exec(text) || [])[1]) || 0;
    const pm = /\\pos\(([-\d.]+),([-\d.]+)\)/.exec(text);
    const sc = Number((/\\fscy([\d.]+)/.exec(text) || [])[1] || 100) / 100;
    const h = size * 1.2 * sc;
    const row = an ? (an <= 3 ? "bottom" : an <= 6 ? "middle" : "top") : styleRow;
    const y = pm ? Number(pm[2]) : row === "bottom" ? H - marginV : row === "top" ? marginV : H / 2;
    const y0 = row === "bottom" ? y - h : row === "middle" ? y - h / 2 : y;
    const g0 = y0 + h * 0.12, g1 = y0 + h * 0.9;
    // 글자 칸 너비 (어림) — 한글·넓은 글자 0.95, 영문·숫자 0.58, 띄어쓰기 0.3 (글자 크기 배수)
    const plain = text.replace(/\{[^}]*\}/g, "").replace(/\\N/g, "");
    const scx = Number((/\\fscx([-\d.]+)/.exec(text) || [])[1] || 100) / 100;
    const bw = [...plain].reduce((s, ch) => s + (ch === " " ? 0.3 : /[ᄀ-￿]/.test(ch) ? 0.95 : 0.58), 0) * size * Math.abs(scx);
    const px = pm ? Number(pm[1]) : W / 2;
    const col = an ? (an - 1) % 3 : st.align === "left" ? 0 : st.align === "right" ? 2 : 1;
    const box = { cx: col === 0 ? px + bw / 2 : col === 2 ? px - bw / 2 : px, cy: (g0 + g1) / 2, w: Math.max(1, bw), h: Math.max(1, g1 - g0) };
    for (const b of gradBands(gs, box, W, H)) {
      out.push(`Dialogue: ${layer},${head},{\\clip(${b.clip})\\1c&H${bgr(b.color)}&\\1a&H${b.alpha}&}${top}`);
    }
  }
  return out;
}

/**
 * 그라데이션 띠 — 포토샵처럼 선형·방사형·반사형, 각도, 시작·끝 투명도 (미리보기 CSS linear/radial-gradient 와 같은 계산)
 *  선형·반사형: 각도(CSS 와 같게 0 = 아래→위, 180 = 위→아래) 방향으로 띠, 방사형: 글자 칸 가운데서 타원 고리
 *  돌려줌: [{ clip: 자막 엔진 그림 틀, color, alpha(16진 2자리) }]
 */
function gradBands(g, box, W, H) {
  const rgb = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || "#FFFFFF") || [0, "FFFFFF"]; return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); };
  const at = (u) => {
    const a = rgb(g.from), b = rgb(g.to);
    const c = "#" + a.map((v, i) => Math.round(v + (b[i] - v) * u).toString(16).padStart(2, "0")).join("");
    const al = g.a + (g.b - g.a) * u; // 투명도 0~1
    return { color: c, alpha: Math.round(Math.max(0, Math.min(1, al)) * 255).toString(16).padStart(2, "0").toUpperCase() };
  };
  const E = (W + H) * 2;
  const pt = (x, y) => `${Math.round(x)} ${Math.round(y)}`;
  const out = [];
  if (g.type === "radial") {
    // 타원 고리 — 바깥 고리(시계 방향) + 안쪽 고리(반대 방향) = 가운데가 빈 고리
    const rx = (box.w / 2) * Math.SQRT2, ry = (box.h / 2) * Math.SQRT2;
    const N = 12, K = 36;
    const ring = (r, rev) => {
      const ps = [];
      for (let i = 0; i < K; i++) {
        const t = ((rev ? K - i : i) / K) * Math.PI * 2;
        ps.push(pt(box.cx + Math.cos(t) * rx * r, box.cy + Math.sin(t) * ry * r));
      }
      return `m ${ps[0]} l ${ps.slice(1).join(" ")}`;
    };
    for (let j = 0; j < N; j++) {
      const outer = j === N - 1 ? `m ${pt(-E, -E)} l ${pt(E, -E)} ${pt(E, E)} ${pt(-E, E)}` : ring((j + 1) / N, false);
      const inner = j === 0 ? "" : ` ${ring(j / N, true)}`;
      out.push({ clip: outer + inner, ...at((j + 0.5) / N) });
    }
    return out;
  }
  // 선형·반사형 — 각도 방향 d, 띠는 d 에 수직
  const th = ((Number.isFinite(Number(g.angle)) ? Number(g.angle) : 180) * Math.PI) / 180;
  const d = { x: Math.sin(th), y: -Math.cos(th) };
  const e = { x: -d.y, y: d.x };
  const L = Math.abs(box.w * d.x) + Math.abs(box.h * d.y) || 1;
  const N = g.type === "reflect" ? 16 : 12;
  for (let j = 0; j < N; j++) {
    const s0 = j === 0 ? -E : (j / N - 0.5) * L;
    const s1 = j === N - 1 ? E : ((j + 1) / N - 0.5) * L;
    const P = (s, k) => pt(box.cx + d.x * s + e.x * k, box.cy + d.y * s + e.y * k);
    const t = (j + 0.5) / N;
    out.push({ clip: `m ${P(s0, -E)} l ${P(s1, -E)} ${P(s1, E)} ${P(s0, E)}`, ...at(g.type === "reflect" ? Math.abs(2 * t - 1) : t) });
  }
  return out;
}

/** 클립 하나의 자막 줄들 [{s, e, text}] (클립 시작 = 0) */
/** 한 화면 최대 줄 수 — 고른 값(1·2·3), 없으면 예전 길게(제한 없음)·짧게(1줄) (timeline.ts maxLinesOf 와 같음) */
const maxLinesOf = (st) => Number(st.maxLines) || (st.length === "short" ? 1 : 999);

function subtitleLines(clip, dur, settings, W, H = Math.round((W * 9) / 16)) {
  const st = tl.subStyleOf(settings, clip);
  const custom = typeof clip.subText === "string";
  const text = tl.subtitleText(clip).trim();
  if (!st.on || !text || (clip.type === "silence" && !custom) || clip.sub === false) return [];
  // 한 줄 — 실제 글자 폭(글꼴마다)으로 줄 너비에 들어가는 만큼 (timeline.ts 와 같은 계산)
  const cap = tl.capEm(st, W, H);
  const fit = (k = 1) => (s) => tl.textEm(s, st) <= cap * k;
  // 직접 쓴 자막에 줄바꿈(엔터)을 넣었으면 — 엔터 친 그대로 줄을 나눠 한 화면에 다 (글자 수로 다시 나누지도, 시간 따라 넘기지도 않음 — 2026-10-19 사장님)
  if (custom && text.includes("\n")) return [{ s: 0, e: dur, text: text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join("\n") }];
  // 한 화면 최대 줄 수 (1·2·3줄, 2026-10-19 사장님). 없으면 예전 프로젝트 — 길게: 한 화면에 다, 짧게: 짧은 한 줄씩
  const per = maxLinesOf(st);
  if (custom) return evenLines(text, dur, !st.maxLines && st.length === "short" ? fit(0.7) : fit(), per);
  if (st.maxLines || st.length !== "short") {
    const lines = wrap(text, fit());
    // 최대 줄 수 안이면 한 화면에 다 — 넘을 때만 그 줄 수씩 말하는 때에 맞춰 넘긴다
    if (lines.length <= per) return [{ s: 0, e: dur, text: lines.join("\n") }];
    const chunks = [];
    for (let i = 0; i < lines.length; i += per) chunks.push(lines.slice(i, i + per).join("\n"));
    if (chunks.length === 1) return [{ s: 0, e: dur, text: chunks[0] }];
    const words = tl.wordTimes(clip, settings);
    let wi = 0;
    return chunks.map((ch, k) => {
      const n = ch.split(/\s+/).length;
      const s = k === 0 ? 0 : (words[wi] ? words[wi].s : (dur * k) / chunks.length);
      wi += n;
      const e = k === chunks.length - 1 ? dur : (words[wi] ? words[wi].s : (dur * (k + 1)) / chunks.length);
      return { s, e, text: ch };
    });
  }
  // 짧게: 한 줄 짧은 덩어리를 말하는 때에 맞춰
  const words = tl.wordTimes(clip, settings);
  const out = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ s: cur[0].s, e: cur[cur.length - 1].e, text: cur.map((w) => w.w).join(" ") });
    cur = [];
  };
  for (const w of words) {
    if (cur.length && !fit(0.7)(cur.map((x) => x.w).join(" ") + " " + w.w)) flush();
    cur.push(w);
  }
  flush();
  out.forEach((l, i) => {
    l.e = i < out.length - 1 ? out[i + 1].s : dur;
    if (i === 0) l.s = 0;
  });
  return out;
}

/* ── 화면 맞추기 ── */
function fitFilter(inLabel, W, H, fill, outLabel) {
  if (fill === "contain") return `[${inLabel}]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[${outLabel}]`;
  if (fill === "blur") {
    return (
      `[${inLabel}]split=2[bgsrc][fgsrc];` +
      `[bgsrc]scale=${Math.round(W / 4)}:${Math.round(H / 4)}:force_original_aspect_ratio=increase,crop=${Math.round(W / 4)}:${Math.round(H / 4)},gblur=sigma=8,scale=${W}:${H},colorchannelmixer=rr=0.8:gg=0.8:bb=0.8[bg];` +
      `[fgsrc]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[${outLabel}]`
    );
  }
  return `[${inLabel}]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[${outLabel}]`;
}

/** 반전 — 좌우(hflip)·상하(vflip). 없으면 빈 문자열 */
const flipChain = (o) => [o && o.flipX ? "hflip" : "", o && o.flipY ? "vflip" : ""].filter(Boolean).join(",");

const assetFile = (a) => (a.edit && fs.existsSync(a.edit) ? a.edit : a.path);

/* 소리 이음매 — 실제로 잘라 낸 곳만 아주 짧게 줄였다 키운다 ("뚝" 소리 막기, 귀로는 안 들림) */
const EDGE = 0.008;
/** 남길 구간 i 의 소리 자르기 — 구간 사이(지운 단어 자리)에만 줄였다 키우기 */
const SR = 48000;
const smp = (t) => Math.round(t * SR); // 시각 → 샘플 번호 (0.001초 반올림으로 자르면 이음매마다 틈·겹침이 쌓인다)
const rangeAudio = (k, r, i, n) => {
  const len = (smp(r.e) - smp(r.s)) / SR;
  const f = len > EDGE * 3;
  return `[${k}:a]aresample=${SR},atrim=start_sample=${smp(r.s)}:end_sample=${smp(r.e)},asetpts=PTS-STARTPTS${f && i > 0 ? `,afade=t=in:st=0:d=${EDGE}` : ""}${f && i < n - 1 ? `,afade=t=out:st=${(len - EDGE).toFixed(4)}:d=${EDGE}` : ""}[a${i}]`;
};

/**
 * 클립 하나 → 화면 조각(seg.mp4, 소리 없음) + 소리 조각(seg.wav, 압축 안 한 원음)
 *  소리는 원음으로 이어 붙여 맨 마지막에 한 번만 압축한다 — 조각마다 AAC 로 압축해 이으면 이음매마다 "뚝" (2026-10-18)
 *  frames: 화면 칸 수 (앞에서부터 누적으로 맞춰 소리와 어긋나지 않게)  edge: { in, out } 앞·뒤가 원본에서 이어지지 않으면 true
 */
async function renderClip(p, clip, dur, idx, tmp, enc, layers = [], frames = 0, edge = { in: true, out: true }, ctx = null) {
  const [W, H] = RATIOS[p.ratio] || RATIOS["16:9"];
  const st = p.settings || {};
  const fill = clip.fill || st.fill || "cover";
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  const filters = [];
  let aIn = null;
  let visIn = -1; // 배경 영상 입력 번호 (목소리 클립 화면 영상 소리 섞기)
  let n = 0;

  // 화면 — 글 클립: 화면 자료 / 촬영 클립: 그 영상 (화면만 바꾼 경우 바꾼 자료, 소리는 원본)
  const srcAsset = clip.src ? p.assets[clip.src.asset] : null;
  const offs = st.off || {}; // 꺼 둔 레이어 (화면·원본 소리·AI 목소리)
  const visual = offs.visual ? null : clip.visual && p.assets[clip.visual.asset] ? p.assets[clip.visual.asset] : clip.type === "voice" ? null : srcAsset;
  const ranges = clip.type === "voice" ? null : tl.keepRanges(clip);
  const sameAsSource = ranges && visual && srcAsset && visual === srcAsset;
  const ok = (a) => a && !a.missing && fs.existsSync(assetFile(a));
  if (sameAsSource && ok(visual) && visual.kind === "video") {
    // 촬영 영상: 남길 구간들을 잘라 잇는다 (지운 단어 빠짐)
    args.push("-i", assetFile(visual));
    const k = n++;
    ranges.forEach((r, i) => {
      filters.push(`[${k}:v]trim=start=${r.s.toFixed(3)}:end=${r.e.toFixed(3)},setpts=PTS-STARTPTS,fps=${FPS}[v${i}]`);
      if (visual.hasAudio) filters.push(rangeAudio(k, r, i, ranges.length));
    });
    if (visual.hasAudio) {
      filters.push(`${ranges.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${ranges.length}:v=1:a=1[vraw][araw]`);
      aIn = "araw";
    } else filters.push(`${ranges.map((_, i) => `[v${i}]`).join("")}concat=n=${ranges.length}:v=1:a=0[vraw]`);
  } else {
    if (ok(visual) && visual.kind === "image") {
      args.push("-loop", "1", "-framerate", String(FPS), "-t", dur.toFixed(3), "-i", assetFile(visual));
      filters.push(`[${n++}:v]format=yuv420p[vraw]`);
    } else if (ok(visual) && visual.kind === "video") {
      // 배경 영상: 시작점부터 길이만큼 — 클립보다 짧으면 처음부터 다시 (반복, 미리보기와 같게. 2026-10-18 사장님)
      const vs = Number(clip.visual && clip.visual.s) || 0;
      const short = visual.duration ? dur - (visual.duration - vs) : 0;
      if (short > 0) args.push("-stream_loop", "-1");
      args.push("-ss", vs.toFixed(3), "-t", dur.toFixed(3), "-i", assetFile(visual));
      visIn = n;
      filters.push(`[${n++}:v]fps=${FPS},setpts=PTS-STARTPTS,trim=duration=${dur.toFixed(3)}[vraw]`);
    } else {
      args.push("-f", "lavfi", "-t", dur.toFixed(3), "-i", `color=c=black:s=${W}x${H}:r=${FPS}`);
      filters.push(`[${n++}:v]null[vraw]`);
    }
    // 화면만 바꾼 촬영 클립: 소리는 원본 구간에서
    if (ranges && ok(srcAsset) && srcAsset.hasAudio) {
      args.push("-i", assetFile(srcAsset));
      const k = n++;
      ranges.forEach((r, i) => filters.push(rangeAudio(k, r, i, ranges.length)));
      filters.push(`${ranges.map((_, i) => `[a${i}]`).join("")}concat=n=${ranges.length}:v=0:a=1[araw]`);
      aIn = "araw";
    }
  }
  // 촬영 클립 빠르기 — 영상(setpts)·소리(atempo) 같이
  const ssp = tl.srcSpeed(clip);
  let vIn = "vraw";
  if (ssp !== 1 && ranges) {
    if (sameAsSource && ok(visual) && visual.kind === "video") {
      filters.push(`[vraw]setpts=PTS/${ssp.toFixed(4)}[vspd]`);
      vIn = "vspd";
    }
    if (aIn) {
      const tempo = [];
      let s = ssp;
      while (s < 0.5) { tempo.push("atempo=0.5"); s /= 0.5; }
      tempo.push(`atempo=${s.toFixed(4)}`);
      filters.push(`[${aIn}]${tempo.join(",")}[aspd]`);
      aIn = "aspd";
    }
  }
  const cflip = flipChain(clip);
  if (cflip) filters.push(`[${vIn}]${cflip}[vflip]`);
  const vb = clip.box && ok(visual) ? clip.box : null;
  if (vb) {
    // 직접 크기 — 검은 바탕 위 그 자리에 (미리보기 Player.tsx 와 같은 계산)
    const ar = visual.width && visual.height ? visual.width / visual.height : W / H;
    const pw = Math.max(2, Math.round((W * Number(vb.w)) / 2) * 2);
    const ph = Math.max(2, Math.round(pw / ar / 2) * 2);
    const x0 = Math.round(W * Number(vb.x) - pw / 2);
    const y0 = Math.round(H * Number(vb.y) - ph / 2);
    filters.push(`[${cflip ? "vflip" : vIn}]scale=${pw}:${ph},setsar=1[vbx]`);
    filters.push(`color=c=black:s=${W}x${H}:r=${FPS}:d=${dur.toFixed(3)}[vbg]`);
    filters.push(`[vbg][vbx]overlay=x=${x0}:y=${y0}:eof_action=pass,setsar=1[vfit]`);
  } else filters.push(fitFilter(cflip ? "vflip" : vIn, W, H, fill, "vfit"));
  let vOut = "vfit";
  // 사진 움직임 (브루처럼 줌인·좌우·상하) — 미리보기 Player.tsx 와 같은 계산 (timeline.motionAt, 처음→끝 고르게)
  const mo = !vb && ok(visual) && visual.kind === "image" ? tl.motionOf(p, clip) : null;
  if (mo) {
    const a0 = tl.motionAt(mo, 0);
    const a1 = tl.motionAt(mo, 1);
    const N1 = Math.max(1, Math.round(dur * FPS) - 1);
    const U = `min(1,on/${N1})`;
    const lin = (v0, v1) => `(${v0.toFixed(5)}+(${(v1 - v0).toFixed(5)})*${U})`;
    const Z = lin(a0.z, a1.z);
    // 보이는 창의 왼쪽 위 = (0.5 - 옮김/확대 - 0.5/확대) × 입력 크기
    const X = `(0.5-${lin(a0.x, a1.x)}/${Z}-0.5/${Z})*iw`;
    const Y = `(0.5-${lin(a0.y, a1.y)}/${Z}-0.5/${Z})*ih`;
    filters.push(`[vfit]scale=${W * 2}:${H * 2}:flags=bicubic,zoompan=z='${Z}':x='${X}':y='${Y}':d=1:s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p[vmo]`);
    vOut = "vmo";
  }

  // 단어 구간 레이어 — 그 단어를 말하는 동안만 (ffmpeg enable / 자막 시각)
  const winOf = (l) => tl.layerWindow(l, clip, st);
  const en = (l) => {
    const w = winOf(l);
    return w ? `:enable='between(t,${w.s.toFixed(3)},${w.e.toFixed(3)})'` : "";
  };
  // 사진 올리기·스티커 애셋 하나 얹기 — 아래 겹치는 순서 루프에서 부른다
  const overlayImage = (l, j) => {
    // 애니메이션 — 편집 화면이 미리보기와 같은 계산으로 칸마다 그려 둔 그림(투명 PNG)을 그대로 얹는다 (2026-10-19, Stickers·사진 올리기)
    const bk = l.bake && l.bake[clip.id];
    if (bk && bk.dir && fs.existsSync(path.join(bk.dir, "00000.png"))) {
      args.push("-itsoffset", Math.max(0, Number(bk.s0) || 0).toFixed(3), "-framerate", String(FPS), "-start_number", "0", "-i", path.join(bk.dir, "%05d.png"));
      const k = n++;
      filters.push(`[${k}:v]format=rgba,setsar=1[ov${j}]`);
      filters.push(`[${vOut}][ov${j}]overlay=x=${Math.round(bk.x)}:y=${Math.round(bk.y)}:eof_action=pass[vo${j}]`);
      vOut = `vo${j}`;
      return;
    }
    const a = l.asset && p.assets[l.asset];
    if (!ok(a) || a.kind !== "image") return;
    args.push("-loop", "1", "-framerate", String(FPS), "-t", dur.toFixed(3), "-i", assetFile(a));
    const k = n++;
    const op0 = Math.max(0.05, Math.min(1, Number(l.opacity ?? 1)));
    const lflip = flipChain(l);
    // 채우기 — 화면 전체에 (잘라서 / 비율 유지하며 가운데)
    if (l.fit === "cover" || l.fit === "contain") {
      const sc = l.fit === "cover" ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}` : `scale=${W}:${H}:force_original_aspect_ratio=decrease`;
      filters.push(`[${k}:v]${sc},${lflip ? lflip + "," : ""}setsar=1,format=rgba,colorchannelmixer=aa=${op0.toFixed(3)}[ov${j}]`);
      filters.push(`[${vOut}][ov${j}]overlay=x=(W-w)/2:y=(H-h)/2:eof_action=pass${en(l)}[vo${j}]`);
      vOut = `vo${j}`;
      return;
    }
    const pw = Math.max(8, Math.round((W * Math.max(0.03, Math.min(1, Number(l.w ?? 0.35)))) / 2) * 2);
    const op = Math.max(0.05, Math.min(1, Number(l.opacity ?? 1)));
    const ph = a.width && a.height ? Math.round((pw * a.height) / a.width) : pw;
    // 화면 밖으로 나가지 않게 (미리보기 Player.tsx 와 같은 계산)
    const x0 = Math.round(Math.max(0, Math.min(W - pw, W * Number(l.x ?? 0.5) - pw / 2)));
    const y0 = Math.round(Math.max(0, Math.min(H - ph, H * Number(l.y ?? 0.5) - ph / 2)));
    const rot = (Number(l.rot) || 0) * Math.PI / 180;
    if (Math.abs(rot) > 0.0001) {
      const cx = x0 + pw / 2, cy = y0 + ph / 2;
      filters.push(`[${k}:v]scale=${pw}:-2,${lflip ? lflip + "," : ""}format=rgba,colorchannelmixer=aa=${op.toFixed(3)},rotate=${rot.toFixed(5)}:c=none:ow=rotw(${rot.toFixed(5)}):oh=roth(${rot.toFixed(5)})[ov${j}]`);
      filters.push(`[${vOut}][ov${j}]overlay=x=${cx.toFixed(1)}-w/2:y=${cy.toFixed(1)}-h/2:eof_action=pass${en(l)}[vo${j}]`);
    } else {
      filters.push(`[${k}:v]scale=${pw}:-2,${lflip ? lflip + "," : ""}format=rgba,colorchannelmixer=aa=${op.toFixed(3)}[ov${j}]`);
      filters.push(`[${vOut}][ov${j}]overlay=x=${x0}:y=${y0}:eof_action=pass${en(l)}[vo${j}]`);
    }
    vOut = `vo${j}`;
  };

  // 겹치는 것 — 뒤 → 앞 (회의 3-26): 사진·스티커는 하나씩 얹고, 이어진 화면 글자는 묶어서 자막 엔진으로 한 번에
  const isImg = (l) => l.type === "image";
  const isText = (l) => l.type === "text" && String(l.text || "").trim();
  const zs = tl.zLayers(p, layers).filter((l) => isImg(l) || isText(l));
  let tg = 0;
  for (let zi = 0; zi < zs.length; ) {
    if (isImg(zs[zi])) {
      overlayImage(zs[zi], zi);
      zi++;
      continue;
    }
    const run = [];
    while (zi < zs.length && isText(zs[zi])) run.push(zs[zi++]);
    const ass =
      assHead(W, H) +
      run.map((l, j) => textLayerStyle(`T${j}`, W, H, l)).join("\n") +
      "\n" +
      assEvents +
      run.flatMap((l, j) => {
        // 애니메이션 — 미리보기와 같은 움직임을 칸마다 (2026-10-19)
        const an = ctx ? tl.animOf(p, l) : null;
        const sp = an ? tl.layerSpan(p, l, ctx.items, clip.id, st, ctx.order) : null;
        if (an && sp) {
          const size = Math.round(Math.min(W, H) * 0.08 * ((Number(l.size) || 100) / 100));
          const lines = caseOf(String(l.text).trim(), l.textCase).split(/\r?\n/);
          const lh = size * 1.25;
          const pos = l.pos || "top";
          const free = typeof l.x === "number" && typeof l.y === "number";
          const bc = free ? { x: l.x * W, y: l.y * H } : { x: W / 2, y: pos === "top" ? H * 0.06 + (lines.length * lh) / 2 : pos === "middle" ? H / 2 : H - H * 0.07 - (lines.length * lh) / 2 };
          const s0 = Math.max(0, sp.a), s1 = Math.min(dur, sp.b);
          if (s1 <= s0) return [];
          return animTextEvents({ layer: 1, style: `T${j}`, rot0: Number(l.rot) || 0, lines, bc, lh, an, a: sp.a, b: sp.b, s0, s1, end: sp.b >= dur - 0.001 ? dur + 0.05 : s1, W, H, align: free ? undefined : l.align, halfW: W * 0.45,
            base: { a1: Math.round(Math.max(0, Math.min(1, Number(l.textAlpha) || 0)) * 255), a3: l.box ? Math.round((1 - Math.max(0, Math.min(1, l.boxOpacity ?? 0.62))) * 255) : l.glow ? Math.round(Math.max(0, Math.min(1, Number(l.glowAlpha) || 0)) * 255) : Math.round(Math.max(0, Math.min(1, Number(l.outlineAlpha) || 0)) * 255), a4: !l.box && Number(l.shadow) > 0 ? Math.round(Math.max(0, Math.min(1, Number(l.shadowAlpha) || 0)) * 255) : 255 }, extra: textLayerBlur(W, H, l) });
        }
        // 미리보기에서 끌어 옮긴 글자는 그 자리(가운데 기준)에
        const blur = textLayerBlur(W, H, l);
        return [`Dialogue: 1,${assTime(winOf(l) ? winOf(l).s : 0)},${assTime(winOf(l) ? winOf(l).e : dur + 0.05)},T${j},,0,0,0,,${typeof l.x === "number" && typeof l.y === "number" ? `{\\an5\\pos(${Math.round(l.x * W)},${Math.round(l.y * H)})${Number(l.rot) ? `\\frz${(-Number(l.rot)).toFixed(2)}` : ""}}` : ""}${blur ? `{${blur}}` : ""}${assEsc(caseOf(String(l.text).trim(), l.textCase))}`];
      }).join("\n") +
      "\n";
    fs.writeFileSync(path.join(tmp, `t${idx}_${tg}.ass`), ass, "utf8");
    filters.push(`[${vOut}]subtitles=t${idx}_${tg}.ass:fontsdir=fonts[vt${tg}]`);
    vOut = `vt${tg}`;
    tg++;
  }

  // 메인자막 — 늘 맨 위
  const lines = subtitleLines(clip, dur, st, W, H);
  // 미리보기에서 끌어 옮긴 자막은 그 자리(가운데 기준)에
  const sst = tl.subStyleOf(st, clip);
  const subHalf = (W * 0.88 * Math.max(0.3, Math.min(1, Number(sst.wrap ?? 1)))) / 2;
  const ax = (cx) => (sst.align === "left" ? cx - subHalf : sst.align === "right" ? cx + subHalf : cx); // 정렬 — 줄 너비 칸 가장자리
  const anRow = (row) => alignNo(row, sst.align);
  const subPos = typeof sst.x === "number" && typeof sst.y === "number" ? `{\\an${anRow("middle")}\\pos(${Math.round(ax(sst.x * W))},${Math.round(sst.y * H)})}` : "";
  for (const l of lines) l.text = caseOf(l.text, sst.textCase);
  if (lines.length) {
    const sub = subtitleStyle(W, H, sst);
    const styles = [sub.style];
    // 행간을 바꿨으면 줄마다 자리를 계산해 따로 놓는다 (자막 엔진에 행간 설정이 없어서). 미리보기 Player.tsx 와 같은 줄 높이
    const lead = tl.effLeading(sst); // 줄 간격 — 없으면 자동 (미리보기 lineHeight 와 같게 줄마다 자리)
    const subEvents = (l) => {
      const parts = String(l.text).split(/\r?\n/);
      if (!lead || parts.length < 2) return [`Dialogue: 0,${assTime(l.s)},${assTime(l.e)},S,,0,0,0,,${subPos}${sub.tag}${assEsc(l.text)}`];
      const lh = sub.size * lead;
      const n = parts.length;
      const pos = sst.position || "bottom";
      const free = typeof sst.x === "number" && typeof sst.y === "number";
      return parts.map((t, i) => {
        let tag;
        if (free || pos === "middle") {
          const cx = free ? sst.x * W : W / 2;
          const cy = free ? sst.y * H : H / 2;
          tag = `{\\an${anRow("middle")}\\pos(${Math.round(ax(cx))},${Math.round(cy + (i - (n - 1) / 2) * lh)})}`;
        } else if (pos === "top" || pos === "middle-high") tag = `{\\an${anRow("top")}\\pos(${Math.round(ax(W / 2))},${Math.round(H * (pos === "top" ? 0.08 : 0.24) + i * lh)})}`;
        else {
          const bottom = H - (pos === "middle-low" ? H * 0.24 : H * 0.07);
          tag = `{\\an${anRow("bottom")}\\pos(${Math.round(ax(W / 2))},${Math.round(bottom - (n - 1 - i) * lh)})}`;
        }
        return `Dialogue: 0,${assTime(l.s)},${assTime(l.e)},S,,0,0,0,,${tag}${sub.tag}${assEsc(t)}`;
      });
    };
    // 메인자막 애니메이션 — 자막 한 조각(줄 묶음)마다 나타나고 사라진다 (미리보기 Player.tsx 와 같은 계산)
    const sa = tl.subAnimOf(p, clip);
    // 단어별 효과 (쇼츠식) — 줄마다 단어 시각
    const wfx = tl.subWordOf(p, clip);
    const lws = wfx ? tl.lineWords(clip, lines, st, wfx) : null;
    const lineMode = Boolean(wfx && wfx.show === "line" && sa && sa.in); // 한 줄씩 + [인] = 줄마다 들어오기
    const subAnim = (l, li) => {
      const parts = String(l.text).split(/\r?\n/);
      const n = parts.length;
      const lh = sub.size * (lead || 1.25);
      const pos = sst.position || "bottom";
      const free = typeof sst.x === "number" && typeof sst.y === "number";
      const bc = free
        ? { x: sst.x * W, y: sst.y * H }
        : { x: W / 2, y: pos === "top" ? H * 0.08 + (n * lh) / 2 : pos === "middle-high" ? H * 0.24 + (n * lh) / 2 : pos === "middle" ? H / 2 : H - (pos === "middle-low" ? H * 0.24 : H * 0.07) - (n * lh) / 2 };
      const shadowOn = !sst.bg && Number(sst.shadow) > 0;
      // 줄마다 나오는 때 (그 줄 첫 단어)
      const lineAt = [];
      if (lineMode) {
        let k = 0;
        for (const ptxt of parts) {
          const c = String(ptxt).split(/\s+/).filter(Boolean).length;
          const w0 = (lws[li] || [])[k];
          lineAt.push(w0 ? (w0.ls ?? w0.s) : l.s);
          k += c;
        }
      }
      return animTextEvents({ layer: 0, style: "S", rot0: Number(sst.rot) || 0, lines: parts, bc, lh, an: lineMode ? { ...sa, in: undefined } : sa || { dur: 0.5 }, a: l.s, b: l.e,
        lineIn: lineMode ? { in: sa.in, dur: sa.dur } : null, lineAt,
        words: wfx ? { fx: wfx, list: lws[li] || [], color: sst.color || "#FFFFFF" } : null, s0: l.s, s1: l.e, end: l.e, W, H, align: sst.align, halfW: sub.halfW,
        base: { a1: Math.round(Math.max(0, Math.min(1, Number(sst.textAlpha) || 0)) * 255), a3: sst.bg ? Math.round((1 - Math.max(0, Math.min(1, sst.bgOpacity ?? 0.62))) * 255) : Math.round(Math.max(0, Math.min(1, Number(sst.outlineAlpha) || 0)) * 255), a4: shadowOn ? Math.round(Math.max(0, Math.min(1, Number(sst.shadowAlpha) || 0)) * 255) : 255 },
        extra: sub.tag ? sub.tag.replace(/^\{|\}$/g, "") : "" });
    };
    const events = fancySub(sa || wfx || Number(sst.rot) ? lines.flatMap((l, li) => subAnim(l, li)) : lines.flatMap(subEvents), sst, sub.size, W, H);
    const ass = assHead(W, H) + styles.join("\n") + "\n" + assEvents + events.join("\n") + "\n";
    fs.writeFileSync(path.join(tmp, `s${idx}.ass`), ass, "utf8");
    filters.push(`[${vOut}]subtitles=s${idx}.ass:fontsdir=fonts[vsub]`);
    vOut = "vsub";
  }
  // 화면은 칸 수(frames)로 끊는다 — 모자라면 마지막 장면을 늘려 채운다
  filters.push(frames ? `[${vOut}]format=yuv420p,tpad=stop_mode=clone:stop_duration=0.2[vout]` : `[${vOut}]format=yuv420p,trim=duration=${dur.toFixed(3)}[vout]`);

  // 소리
  const vol = (x) => Math.max(0, Math.min(3, Number(x ?? 1)));
  // 첨부한 화면 영상의 소리 (올렸을 때만) — 원본 메인 소리와 섞는다
  // 넣은 영상 소리 — [원본 소리] 칩·썸네일 메뉴의 값만 (목소리 칩 볼륨과는 따로, 미리보기 Player.tsx 와 같게)
  const vv = visIn >= 0 && visual && visual.hasAudio ? Math.max(0, Math.min(2, Number(clip.visualVolume) || 0)) : 0;
  if (vv > 0) filters.push(`[${visIn}:a]volume=${vv.toFixed(3)},aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${dur.toFixed(3)}[avis]`);
  if (clip.type === "voice" && !clip.muted && !offs.voice && clip.voice && clip.voice.file && fs.existsSync(clip.voice.file)) {
    args.push("-i", clip.voice.file);
    const k = n++;
    const sp = tl.speedOf(clip, st);
    const tempo = [];
    let s = sp;
    while (s > 2) { tempo.push("atempo=2"); s /= 2; }
    while (s < 0.5) { tempo.push("atempo=0.5"); s /= 0.5; }
    if (Math.abs(s - 1) > 0.001) tempo.push(`atempo=${s.toFixed(3)}`);
    filters.push(`[${k}:a]${tempo.length ? tempo.join(",") + "," : ""}volume=${(vol(st.voice && st.voice.volume) * vol(clip.volume)).toFixed(3)},aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${dur.toFixed(3)}[${vv > 0 ? "avo" : "aout"}]`);
    if (vv > 0) filters.push(`[avo][avis]amix=inputs=2:duration=first:normalize=0[aout]`);
  } else if (vv > 0) {
    filters.push(`[avis]anull[aout]`);
  } else if (aIn && !clip.muted && !offs.source) {
    filters.push(`[${aIn}]volume=${vol(st.sourceVolume) * vol(clip.volume)},aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${(dur + 0.01).toFixed(3)}[${vv > 0 ? "aso" : "aout"}]`);
    if (vv > 0) filters.push(`[aso][avis]amix=inputs=2:duration=first:normalize=0[aout]`);
  } else {
    args.push("-f", "lavfi", "-t", dur.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo");
    filters.push(`[${n++}:a]anull[aout]`);
  }

  // 클립 앞뒤 — 원본에서 이어지지 않는 쪽만 줄였다 키우기 (이어진 클립은 원본 소리 그대로)
  const ef = [edge.in && dur > EDGE * 3 ? `afade=t=in:st=0:d=${EDGE}` : "", edge.out && dur > EDGE * 3 ? `afade=t=out:st=${(dur - EDGE).toFixed(4)}:d=${EDGE}` : ""].filter(Boolean);
  // 소리 길이는 샘플 수로 딱 맞춘다 — 원본에서 이어진 클립끼리는 샘플 하나 틈 없이 붙는다
  const nSmp = ranges && tl.srcSpeed(clip) === 1 && clip.type !== "voice" ? ranges.reduce((a, r) => a + smp(r.e) - smp(r.s), 0) : smp(dur);
  filters.push(`[aout]${ef.length ? ef.join(",") + "," : ""}apad,atrim=end_sample=${nSmp}[afin]`);

  const base = path.join(tmp, `seg${String(idx).padStart(4, "0")}`);
  const out = { video: `${base}.mp4`, audio: `${base}.wav` };
  const vt = frames ? ["-frames:v", String(frames)] : ["-t", dur.toFixed(3)];
  const tail = (encArgs) => ["-filter_complex", filters.join(";"), "-map", "[vout]", ...encArgs, "-r", String(FPS), "-an", ...vt, out.video, "-map", "[afin]", "-c:a", "pcm_s16le", "-ar", String(SR), "-ac", "2", out.audio];
  try {
    await ff.run(ff.ff(), [...args, ...tail(enc.args("final"))], { cwd: tmp });
  } catch (e) {
    // 그래픽카드 인코더가 실패하면 일반 인코더로 다시
    log.warn(`[굽기] 조각 ${idx} ${enc.name} 실패 → 일반 인코더: ${e.message}`);
    await ff.run(ff.ff(), [...args, ...tail(ff.fallbackEncoder().args("final"))], { cwd: tmp });
  }
  return out;
}

/** 두 클립 소리가 원본에서 바로 이어지는지 — 그러면 이음매에서 소리를 건드리지 않는다 */
function continuous(a, b) {
  if (!a || !b || a.type === "voice" || b.type === "voice" || !a.src || !b.src || a.src.asset !== b.src.asset) return false;
  if (a.visual || b.visual || a.muted !== b.muted || Number(a.volume ?? 1) !== Number(b.volume ?? 1)) return false;
  if (tl.srcSpeed(a) !== 1 || tl.srcSpeed(b) !== 1) return false;
  const ra = tl.keepRanges(a);
  const rb = tl.keepRanges(b);
  return Boolean(ra.length && rb.length && Math.abs(ra[ra.length - 1].e - rb[0].s) < 0.002);
}

/* ── 화면전환 (transitions.ts 와 같은 규칙) ──
   뒤 클립의 clip.trans = { type, a, b }: 앞 클립 끝 a초 + 뒤 클립 시작 b초 동안 화면만 섞는다.
   앞 조각 끝에 b초(마지막 장면 멈춤), 뒤 조각 앞에 a초(첫 장면 멈춤)를 붙이고 a+b초 겹쳐 xfade —
   그래서 전체 길이·소리·자막 시각은 그대로다. 효과 id = ffmpeg xfade 이름 */
const TRANS_FF = new Set(["fade", "fadeblack", "fadewhite", "slideleft", "slideright", "slideup", "slidedown", "coverleft", "wiperight", "circleopen", "zoomin", "hblur"]);
function transOf(prev, cur) {
  const t = cur.clip.trans;
  if (!prev || !t) return null;
  const a = Math.max(0, Math.min(Number(t.a) || 0, prev.dur * 0.45));
  const b = Math.max(0, Math.min(Number(t.b) || 0, cur.dur * 0.45));
  if (a + b < 0.05) return null;
  return { type: TRANS_FF.has(t.type) ? t.type : "fade", a, b };
}
async function joinWithTransitions(segs, trs, out, tmp, enc) {
  const lens = [];
  for (const s of segs) lens.push((await ff.probe(s)).duration || 0);
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  segs.forEach((s) => args.push("-i", path.basename(s)));
  const f = [];
  segs.forEach((_, k) => {
    const a = trs[k] ? trs[k].a : 0; // 이 조각 앞에 붙일 첫 장면 멈춤
    const b = trs[k + 1] ? trs[k + 1].b : 0; // 이 조각 끝에 붙일 마지막 장면 멈춤
    const pad = [a > 0 ? `tpad=start_mode=clone:start_duration=${a.toFixed(3)}` : "", b > 0 ? `tpad=stop_mode=clone:stop_duration=${b.toFixed(3)}` : ""].filter(Boolean);
    // 시간 단위(settb)는 맨 끝에 — fps 가 1/30 으로 바꿔 놓으면 xfade 가 "timebase 다름"으로 실패한다
    f.push(`[${k}:v]fps=${FPS},format=yuv420p${pad.length ? "," + pad.join(",") : ""},settb=AVTB[p${k}]`);
  });
  let cur = "p0";
  let len = lens[0] + (trs[1] ? trs[1].b : 0);
  for (let k = 1; k < segs.length; k++) {
    const tr = trs[k];
    const segLen = lens[k] + (tr ? tr.a : 0) + (trs[k + 1] ? trs[k + 1].b : 0);
    const nx = `x${k}`;
    if (tr) {
      const d = tr.a + tr.b;
      f.push(`[${cur}][p${k}]xfade=transition=${tr.type}:duration=${d.toFixed(3)}:offset=${Math.max(0, len - d).toFixed(3)}[${nx}]`);
      len += segLen - d;
    } else {
      f.push(`[${cur}][p${k}]concat=n=2:v=1:a=0[${nx}]`);
      len += segLen;
    }
    cur = nx;
  }
  // 소리는 따로 원음으로 이어 붙인다 (전환해도 말·자막 시각이 움직이지 않게) — 여기선 화면만
  const tail = ["-filter_complex", f.join(";"), "-map", `[${cur}]`, "-r", String(FPS), "-an", out];
  try {
    await ff.run(ff.ff(), [...args, ...enc.args("final"), ...tail], { cwd: tmp });
  } catch (e) {
    log.warn(`[굽기] 화면전환 ${enc.name} 실패 → 일반 인코더: ${e.message}`);
    const fb = ff.fallbackEncoder();
    await ff.run(ff.ff(), [...args, ...fb.args("final"), ...tail], { cwd: tmp });
  }
}

/**
 * 굽기 — onProgress(문구, 0~1). 결과 파일 경로를 돌려준다.
 *  opts: { scope: all|scene|selected, sceneId, clipIds, height(해상도 세로, 기본 원본) }
 */
async function render(p, opts = {}, onProgress = () => {}, isCancelled = () => false) {
  const [W0, H0] = RATIOS[p.ratio] || RATIOS["16:9"];
  const scale = opts.height && opts.height < Math.min(W0, H0) ? opts.height / Math.min(W0, H0) : 1;
  const proj = scale === 1 ? p : { ...p, ratio: p.ratio };
  let { items, total } = tl.flatten(p);
  const order = tl.clipOrder(p);
  if (opts.scope === "scene" && opts.sceneId) {
    const sc = (p.scenes || []).find((s) => s.id === opts.sceneId);
    const ids = new Set((sc ? sc.clips : []).map((c) => c.id));
    items = items.filter((x) => ids.has(x.clip.id));
  } else if (opts.scope === "selected" && opts.clipIds && opts.clipIds.length) {
    const ids = new Set(opts.clipIds);
    items = items.filter((x) => ids.has(x.clip.id));
  }
  if (!items.length) throw new Error("내보낼 클립이 없습니다.");
  // 고른 클립만 굽을 때도 시각을 0부터 다시 센다 (음악 자리 계산)
  let acc = 0;
  items = items.map((x) => {
    const y = { ...x, start: acc };
    acc += x.dur;
    return y;
  });
  total = acc;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gsv-"));
  // 자막 글꼴 — 윈도우 맑은 고딕을 작업 폴더로 (경로에 한글·공백이 없게)
  fs.mkdirSync(path.join(tmp, "fonts"), { recursive: true });
  for (const f of ["malgun.ttf", "malgunbd.ttf"]) {
    const src = path.join(process.env.WINDIR || "C:\\Windows", "Fonts", f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, "fonts", f));
  }
  // 자막·화면 글자에 쓴 글꼴 (처음이면 받는다)
  const clipFonts = (p.scenes || []).flatMap((sc) => (sc.clips || []).map((c) => c.subStyle && c.subStyle.font)).filter(Boolean);
  await fonts.copyTo([p.settings && p.settings.subtitle && p.settings.subtitle.font, ...clipFonts, ...(p.layers || []).filter((l) => l.type === "text").map((l) => l.font)], path.join(tmp, "fonts"));
  const enc = await ff.encoder();
  const t0 = Date.now();
  try {
    const segs = [];
    const auds = [];
    let done = 0;
    for (let i = 0; i < items.length; i++) {
      if (isCancelled()) throw new Error("내보내기를 멈췄습니다.");
      onProgress(`클립 ${i + 1} / ${items.length} 만드는 중…`, (done / total) * 0.9);
      const over = tl.layersAt(p, items[i].clip.id, order).filter((l) => l.type !== "music" && !l.off);
      // 화면 칸 수 — 앞에서부터 누적으로 (조각마다 반올림하면 뒤로 갈수록 입 모양이 소리와 어긋난다)
      const frames = Math.max(1, Math.round((items[i].start + items[i].dur) * FPS) - Math.round(items[i].start * FPS));
      const edge = { in: !continuous(items[i - 1] && items[i - 1].clip, items[i].clip), out: !continuous(items[i].clip, items[i + 1] && items[i + 1].clip) };
      const seg = await renderClip(proj, items[i].clip, items[i].dur, i, tmp, enc, over, frames, edge, { items, order });
      segs.push(seg.video);
      auds.push(seg.audio);
      done += items[i].dur;
    }
    onProgress("클립을 잇는 중…", 0.92);
    const joined = path.join(tmp, "joined.mp4");
    const trs = items.map((x, i) => (i ? transOf(items[i - 1], x) : null));
    if (trs.some(Boolean)) {
      onProgress("화면전환을 넣는 중…", 0.92);
      await joinWithTransitions(segs, trs, joined, tmp, enc);
    } else {
      fs.writeFileSync(path.join(tmp, "list.txt"), segs.map((s) => `file '${path.basename(s)}'`).join("\n"));
      await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", joined], { cwd: tmp });
    }
    // 소리 — 원음 조각을 빈틈 없이 이어 한 줄로 (압축은 맨 마지막 한 번)
    const joinedWav = path.join(tmp, "joined.wav");
    fs.writeFileSync(path.join(tmp, "alist.txt"), auds.map((s) => `file '${path.basename(s)}'`).join("\n"));
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "alist.txt", "-c", "copy", joinedWav], { cwd: tmp });

    // 저장할 곳 — [내보내기] 창에서 고른 파일 (없으면 저장 폴더 설정, 기본: .gss 파일 옆)
    let outFile;
    if (opts.outFile) {
      outFile = String(opts.outFile);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
    } else {
      const outDir = require("./folders").exportDir(p);
      fs.mkdirSync(outDir, { recursive: true });
      outFile = path.join(outDir, `${p.name}_${p.ratio.replace(":", "x")}.mp4`);
      for (let n = 2; fs.existsSync(outFile); n++) outFile = path.join(outDir, `${p.name}_${p.ratio.replace(":", "x")}_${n}.mp4`);
    }

    // 음악 애셋: 덮는 클립 구간에만, 페이드·시작 지점·반복. 말할 때는 음악을 저절로 줄인다
    const musics = tl
      .musicLayers(p, items)
      .map((l) => {
        const cov = tl.layerItems(p, l, items, order);
        if (!cov.length || !l.file || !fs.existsSync(l.file)) return null;
        const s = cov[0].start;
        const e = cov[cov.length - 1].start + cov[cov.length - 1].dur;
        return { l, s, len: e - s };
      })
      .filter((x) => x && x.len > 0.05);
    // 애니메이션 효과음 (사진·글자 나타날 때, 메인자막) — 파일은 앱 안 src/video/sfx
    const sfxs = tl.sfxEvents(p, items, order).filter((e) => /^[a-z0-9-]+$/.test(e.name) && fs.existsSync(path.join(__dirname, "sfx", `${e.name}.mp3`)));
    const resize = scale !== 1 ? ["-vf", `scale=-2:${Math.round(H0 * scale / 2) * 2}`] : null;
    {
      onProgress(musics.length ? "배경 음악을 섞는 중…" : sfxs.length ? "효과음을 섞는 중…" : "마무리하는 중…", 0.95);
      const a = ["-y", "-hide_banner", "-loglevel", "error", "-i", joined, "-i", joinedWav];
      if (musics.length || sfxs.length) {
        const fl = [];
        musics.forEach(({ l, s, len }, i) => {
          if (l.loop !== false) a.push("-stream_loop", "-1");
          if (Number(l.offset) > 0) a.push("-ss", Number(l.offset).toFixed(3));
          a.push("-i", l.file);
          const mv = Math.max(0, Math.min(1, Number(l.volume ?? 0.15)));
          const fi = Math.min(len / 2, Math.max(0, Number(l.fadeIn) || 0));
          const fo = Math.min(len / 2, Math.max(0, Number(l.fadeOut) || 0));
          const ms = Math.round(s * 1000);
          fl.push(
            `[${i + 2}:a]volume=${mv},aresample=48000,aformat=channel_layouts=stereo,atrim=duration=${len.toFixed(3)},asetpts=PTS-STARTPTS` +
              (fi > 0 ? `,afade=t=in:st=0:d=${fi.toFixed(2)}` : "") +
              (fo > 0 ? `,afade=t=out:st=${(len - fo).toFixed(3)}:d=${fo.toFixed(2)}` : "") +
              (ms > 0 ? `,adelay=${ms}|${ms}` : "") +
              `[m${i}]`
          );
        });
        const mix = []; // 말소리에 더할 것 — 줄인 음악, 효과음들
        let voice = "[1:a]";
        if (musics.length) {
          fl.push(musics.length > 1 ? `${musics.map((_, i) => `[m${i}]`).join("")}amix=inputs=${musics.length}:duration=longest:normalize=0[mm]` : `[m0]anull[mm]`);
          fl.push(`[mm]apad,atrim=duration=${total.toFixed(3)}[mt]`);
          fl.push(`[1:a]asplit=2[v1][v2]`);
          fl.push(`[mt][v1]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=400[md]`);
          voice = "[v2]";
          mix.push("[md]");
        }
        sfxs.forEach((e, i) => {
          a.push("-i", path.join(__dirname, "sfx", `${e.name}.mp3`));
          const ms = Math.max(0, Math.round(e.t * 1000));
          fl.push(`[${musics.length + 2 + i}:a]volume=${e.vol.toFixed(2)},aresample=48000,aformat=channel_layouts=stereo${ms > 0 ? `,adelay=${ms}|${ms}` : ""}[x${i}]`);
          mix.push(`[x${i}]`);
        });
        fl.push(`${voice}${mix.join("")}amix=inputs=${mix.length + 1}:duration=first:normalize=0[a]`);
        a.push("-filter_complex", fl.join(";"), "-map", "0:v", "-map", "[a]");
      } else a.push("-map", "0:v", "-map", "1:a");
      a.push("-c:a", "aac", "-b:a", "192k"); // 소리 압축은 여기서 한 번만
      if (resize) a.push(...resize, ...enc.args("final"));
      else a.push("-c:v", "copy");
      a.push("-movflags", "+faststart", outFile);
      await ff.run(ff.ff(), a, { cwd: tmp });
    }
    log.info(`[굽기] ${outFile} ${total.toFixed(1)}초 영상, ${((Date.now() - t0) / 1000).toFixed(1)}초 걸림 (${enc.name})`);
    onProgress("완성했어요", 1);
    return { file: outFile, seconds: total, took: (Date.now() - t0) / 1000, encoder: enc.name };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** 소리만 내보내기 (mp3·wav) — 영상 굽기 뒤 소리만 뽑는다 */
/** 소리만 내보내기 — 작은 화면(480p)으로 빨리 구운 뒤 소리만 꺼낸다. opts 는 render 와 같음 (내보낼 클립 범위) */
async function exportAudio(p, kind = "mp3", onProgress, opts = {}, isCancelled) {
  // 고른 파일이 있으면 그 옆에 잠깐 영상을 굽고 소리만 꺼낸다
  const want = opts.outFile ? String(opts.outFile) : "";
  const r = await render(p, { ...opts, height: 480, outFile: want ? want.replace(/\.[^.\\/]+$/, "") + `_tmp_${Date.now()}.mp4` : undefined }, onProgress, isCancelled);
  const out = want || r.file.replace(/\.mp4$/, `.${kind}`);
  onProgress && onProgress("소리만 꺼내는 중…", 0.99);
  await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", r.file, "-vn", ...(kind === "mp3" ? ["-b:a", "192k"] : []), out]);
  fs.rmSync(r.file, { force: true });
  return { file: out, seconds: r.seconds, took: r.took };
}

/** 지금 화면 한 장 (png) */
async function snapshot(p, assetFilePath, at, dest) {
  await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(at || 0), "-i", assetFilePath, "-frames:v", "1", dest]);
  return dest;
}

module.exports = { render, joinWithTransitions, exportAudio, snapshot, subtitleLines, wrap };

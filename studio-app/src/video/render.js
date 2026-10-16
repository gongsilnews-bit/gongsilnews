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
  const lines = [];
  for (const part of String(text).split(/\r?\n/)) {
    const words = part.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > max) {
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

/** 화면 글자 애셋 스타일 (미리보기 Player.tsx 와 같은 크기·자리) */
function textLayerStyle(name, W, H, l) {
  const size = Math.round(Math.min(W, H) * 0.08 * ((Number(l.size) || 100) / 100));
  const pos = l.pos || "top";
  const align = pos === "top" ? 8 : pos === "middle" ? 5 : 2;
  const marginV = pos === "top" ? Math.round(H * 0.06) : pos === "middle" ? 0 : Math.round(H * 0.07);
  // 상자(BorderStyle 3)는 libass 가 테두리 색(OutlineColour)으로 칠한다
  const boxCol = assColor(l.boxColor || "#000000", Math.round((1 - Math.max(0, Math.min(1, l.boxOpacity ?? 0.62))) * 255));
  const back = assColor("#000000", 0xff);
  return `Style: ${name},${l.font || fonts.DEFAULT_FAMILY},${size},${assColor(l.color || "#FFFFFF")},${assColor(l.color || "#FFFFFF")},${l.box ? boxCol : assColor(String(l.color).toUpperCase() === "#111111" ? "#FFFFFF" : "#000000")},${back},${fonts.assBold(l.font, true) ? -1 : 0},0,0,0,100,100,0,0,${l.box ? 3 : 1},${l.box ? Math.round(size * 0.25) : 4},0,${align},${Math.round(W * 0.05)},${Math.round(W * 0.05)},${marginV},1`;
}

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
  const align = pos === "top" ? 8 : pos === "middle" ? 5 : 2;
  const marginV = pos === "top" ? Math.round(H * 0.08) : pos === "middle-low" ? Math.round(H * 0.24) : pos === "middle" ? 0 : Math.round(H * 0.07);
  const borderStyle = st.bg ? 3 : 1; // 3 = 글자 뒤 상자
  // 상자(BorderStyle 3)는 libass 가 테두리 색(OutlineColour)으로 칠한다
  const boxCol = assColor(st.bgColor || "#000000", Math.round((1 - Math.max(0, Math.min(1, st.bgOpacity ?? 0.62))) * 255));
  const back = assColor("#000000", 0xff);
  return {
    size,
    style:
      `Style: S,${st.font || "Malgun Gothic"},${size},${assColor(st.color)},${assColor(st.color)},${st.bg ? boxCol : assColor(st.outline || "#000000")},${back},${fonts.assBold(st.font, st.bold) ? -1 : 0},0,0,0,100,100,${(Math.max(-0.1, Math.min(0.5, Number(st.spacing) || 0)) * size).toFixed(1)},0,${borderStyle},${st.bg ? Math.round(size * 0.25) : Number(st.outlineWidth ?? 3)},0,${align},${Math.round(W * 0.06)},${Math.round(W * 0.06)},${marginV},1`,
  };
}

/** 클립 하나의 자막 줄들 [{s, e, text}] (클립 시작 = 0) */
function subtitleLines(clip, dur, settings, W) {
  const st = tl.subStyleOf(settings, clip);
  const custom = typeof clip.subText === "string";
  const text = tl.subtitleText(clip).trim();
  if (!st.on || !text || (clip.type === "silence" && !custom) || clip.sub === false) return [];
  // 한 줄 글자 수 — 줄 너비만큼, 글자가 작으면 더 많이 (timeline.ts 와 같은 계산)
  const max = Math.max(4, Math.round(((W >= 1400 ? 26 : W >= 1080 ? 18 : 16) * Math.max(0.3, Math.min(1, Number(st.wrap ?? 1))) * 100) / Math.max(40, Number(st.size) || 100) / (1 + Math.max(-0.1, Math.min(0.5, Number(st.spacing) || 0)))));
  if (custom) return evenLines(text, dur, st.length === "short" ? Math.round(max * 0.7) : max, st.length === "short" ? 1 : 2);
  if (st.length !== "short") {
    const lines = wrap(text, max);
    // 두 줄이 넘으면 두 줄씩 나눠 차례로
    const chunks = [];
    for (let i = 0; i < lines.length; i += 2) chunks.push(lines.slice(i, i + 2).join("\n"));
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
    if (cur.length && (cur.map((x) => x.w).join(" ") + " " + w.w).length > Math.round(max * 0.7)) flush();
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

/** 클립 하나 → 조각 영상 (seg.mp4) */
async function renderClip(p, clip, dur, idx, tmp, enc, layers = []) {
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
      if (visual.hasAudio) filters.push(`[${k}:a]atrim=start=${r.s.toFixed(3)}:end=${r.e.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
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
      // 배경 영상: 시작점부터 길이만큼 (클립보다 짧으면 마지막 장면에서 멈춰 채운다 — 처음부터 반복하지 않음)
      const vs = Number(clip.visual && clip.visual.s) || 0;
      const short = visual.duration ? dur - (visual.duration - vs) : 0;
      args.push("-ss", vs.toFixed(3), "-t", dur.toFixed(3), "-i", assetFile(visual));
      visIn = n;
      filters.push(`[${n++}:v]fps=${FPS},setpts=PTS-STARTPTS${short > 0 ? `,tpad=stop_mode=clone:stop_duration=${(short + 0.5).toFixed(3)},trim=duration=${dur.toFixed(3)}` : ""}[vraw]`);
    } else {
      args.push("-f", "lavfi", "-t", dur.toFixed(3), "-i", `color=c=black:s=${W}x${H}:r=${FPS}`);
      filters.push(`[${n++}:v]null[vraw]`);
    }
    // 화면만 바꾼 촬영 클립: 소리는 원본 구간에서
    if (ranges && ok(srcAsset) && srcAsset.hasAudio) {
      args.push("-i", assetFile(srcAsset));
      const k = n++;
      ranges.forEach((r, i) => filters.push(`[${k}:a]atrim=start=${r.s.toFixed(3)}:end=${r.e.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`));
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

  // 사진 올리기 애셋 (자막·화면 글자 아래)
  layers.filter((l) => l.type === "image").forEach((l, j) => {
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
      filters.push(`[${vOut}][ov${j}]overlay=x=(W-w)/2:y=(H-h)/2:eof_action=pass[vo${j}]`);
      vOut = `vo${j}`;
      return;
    }
    const pw = Math.max(8, Math.round((W * Math.max(0.03, Math.min(1, Number(l.w ?? 0.35)))) / 2) * 2);
    const op = Math.max(0.05, Math.min(1, Number(l.opacity ?? 1)));
    const ph = a.width && a.height ? Math.round((pw * a.height) / a.width) : pw;
    // 화면 밖으로 나가지 않게 (미리보기 Player.tsx 와 같은 계산)
    const x0 = Math.round(Math.max(0, Math.min(W - pw, W * Number(l.x ?? 0.5) - pw / 2)));
    const y0 = Math.round(Math.max(0, Math.min(H - ph, H * Number(l.y ?? 0.5) - ph / 2)));
    filters.push(`[${k}:v]scale=${pw}:-2,${lflip ? lflip + "," : ""}format=rgba,colorchannelmixer=aa=${op.toFixed(3)}[ov${j}]`);
    filters.push(`[${vOut}][ov${j}]overlay=x=${x0}:y=${y0}:eof_action=pass[vo${j}]`);
    vOut = `vo${j}`;
  });

  // 자막 + 화면 글자 애셋
  const lines = subtitleLines(clip, dur, st, W);
  // 미리보기에서 끌어 옮긴 자막은 그 자리(가운데 기준)에
  const sst = tl.subStyleOf(st, clip);
  const subPos = typeof sst.x === "number" && typeof sst.y === "number" ? `{\\an5\\pos(${Math.round(sst.x * W)},${Math.round(sst.y * H)})}` : "";
  const texts = layers.filter((l) => l.type === "text" && String(l.text || "").trim());
  if (lines.length || texts.length) {
    const sub = subtitleStyle(W, H, sst);
    const styles = [sub.style, ...texts.map((l, j) => textLayerStyle(`T${j}`, W, H, l))];
    // 행간을 바꿨으면 줄마다 자리를 계산해 따로 놓는다 (자막 엔진에 행간 설정이 없어서). 미리보기 Player.tsx 와 같은 줄 높이
    const lead = typeof sst.leading === "number" ? Math.max(0.9, Math.min(2.5, sst.leading)) : 0;
    const subEvents = (l) => {
      const parts = String(l.text).split(/\r?\n/);
      if (!lead || parts.length < 2) return [`Dialogue: 0,${assTime(l.s)},${assTime(l.e)},S,,0,0,0,,${subPos}${assEsc(l.text)}`];
      const lh = sub.size * lead;
      const n = parts.length;
      const pos = sst.position || "bottom";
      const free = typeof sst.x === "number" && typeof sst.y === "number";
      return parts.map((t, i) => {
        let tag;
        if (free || pos === "middle") {
          const cx = free ? sst.x * W : W / 2;
          const cy = free ? sst.y * H : H / 2;
          tag = `{\\an5\\pos(${Math.round(cx)},${Math.round(cy + (i - (n - 1) / 2) * lh)})}`;
        } else if (pos === "top") tag = `{\\an8\\pos(${Math.round(W / 2)},${Math.round(H * 0.08 + i * lh)})}`;
        else {
          const bottom = H - (pos === "middle-low" ? H * 0.24 : H * 0.07);
          tag = `{\\an2\\pos(${Math.round(W / 2)},${Math.round(bottom - (n - 1 - i) * lh)})}`;
        }
        return `Dialogue: 0,${assTime(l.s)},${assTime(l.e)},S,,0,0,0,,${tag}${assEsc(t)}`;
      });
    };
    const events = [
      ...lines.flatMap(subEvents),
      // 미리보기에서 끌어 옮긴 글자는 그 자리(가운데 기준)에
      ...texts.map((l, j) => `Dialogue: 1,${assTime(0)},${assTime(dur + 0.05)},T${j},,0,0,0,,${typeof l.x === "number" && typeof l.y === "number" ? `{\\an5\\pos(${Math.round(l.x * W)},${Math.round(l.y * H)})}` : ""}${assEsc(String(l.text).trim())}`),
    ];
    const ass = assHead(W, H) + styles.join("\n") + "\n" + assEvents + events.join("\n") + "\n";
    fs.writeFileSync(path.join(tmp, `s${idx}.ass`), ass, "utf8");
    filters.push(`[${vOut}]subtitles=s${idx}.ass:fontsdir=fonts[vsub]`);
    vOut = "vsub";
  }
  filters.push(`[${vOut}]format=yuv420p,trim=duration=${dur.toFixed(3)}[vout]`);

  // 소리
  const vol = (x) => Math.max(0, Math.min(3, Number(x ?? 1)));
  // 첨부한 화면 영상의 소리 (올렸을 때만) — 원본 메인 소리와 섞는다
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
    filters.push(`[${aIn}]volume=${vol(st.sourceVolume) * vol(clip.volume)},aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${dur.toFixed(3)}[${vv > 0 ? "aso" : "aout"}]`);
    if (vv > 0) filters.push(`[aso][avis]amix=inputs=2:duration=first:normalize=0[aout]`);
  } else {
    args.push("-f", "lavfi", "-t", dur.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo");
    filters.push(`[${n++}:a]anull[aout]`);
  }

  const out = path.join(tmp, `seg${String(idx).padStart(4, "0")}.mp4`);
  const tail = ["-filter_complex", filters.join(";"), "-map", "[vout]", "-map", "[aout]", "-r", String(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", dur.toFixed(3), out];
  try {
    await ff.run(ff.ff(), [...args, ...enc.args("final"), ...tail], { cwd: tmp });
  } catch (e) {
    // 그래픽카드 인코더가 실패하면 일반 인코더로 다시
    log.warn(`[굽기] 조각 ${idx} ${enc.name} 실패 → 일반 인코더: ${e.message}`);
    const fb = ff.fallbackEncoder();
    await ff.run(ff.ff(), [...args, ...fb.args("final"), ...tail], { cwd: tmp });
  }
  return out;
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
    f.push(`[${k}:v]settb=AVTB,fps=${FPS},format=yuv420p${pad.length ? "," + pad.join(",") : ""}[p${k}]`);
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
  // 소리는 그대로 이어 붙인다 (전환해도 말·자막 시각이 움직이지 않게)
  f.push(`${segs.map((_, k) => `[${k}:a]`).join("")}concat=n=${segs.length}:v=0:a=1[aout]`);
  const tail = ["-filter_complex", f.join(";"), "-map", `[${cur}]`, "-map", "[aout]", "-r", String(FPS), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out];
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
    let done = 0;
    for (let i = 0; i < items.length; i++) {
      if (isCancelled()) throw new Error("내보내기를 멈췄습니다.");
      onProgress(`클립 ${i + 1} / ${items.length} 만드는 중…`, (done / total) * 0.9);
      const over = tl.layersAt(p, items[i].clip.id, order).filter((l) => l.type !== "music" && !l.off);
      segs.push(await renderClip(proj, items[i].clip, items[i].dur, i, tmp, enc, over));
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
      await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", joined], { cwd: tmp });
    }

    const outDir = require("./folders").exportDir(p); // 처음 화면 [저장 폴더] (기본: .gss 파일 옆)
    fs.mkdirSync(outDir, { recursive: true });
    let outFile = path.join(outDir, `${p.name}_${p.ratio.replace(":", "x")}.mp4`);
    for (let n = 2; fs.existsSync(outFile); n++) outFile = path.join(outDir, `${p.name}_${p.ratio.replace(":", "x")}_${n}.mp4`);

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
    const resize = scale !== 1 ? ["-vf", `scale=-2:${Math.round(H0 * scale / 2) * 2}`] : null;
    if (musics.length || resize) {
      onProgress(musics.length ? "배경 음악을 섞는 중…" : "해상도를 맞추는 중…", 0.95);
      const a = ["-y", "-hide_banner", "-loglevel", "error", "-i", joined];
      if (musics.length) {
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
            `[${i + 1}:a]volume=${mv},aresample=48000,aformat=channel_layouts=stereo,atrim=duration=${len.toFixed(3)},asetpts=PTS-STARTPTS` +
              (fi > 0 ? `,afade=t=in:st=0:d=${fi.toFixed(2)}` : "") +
              (fo > 0 ? `,afade=t=out:st=${(len - fo).toFixed(3)}:d=${fo.toFixed(2)}` : "") +
              (ms > 0 ? `,adelay=${ms}|${ms}` : "") +
              `[m${i}]`
          );
        });
        fl.push(musics.length > 1 ? `${musics.map((_, i) => `[m${i}]`).join("")}amix=inputs=${musics.length}:duration=longest:normalize=0[mm]` : `[m0]anull[mm]`);
        fl.push(`[mm]apad,atrim=duration=${total.toFixed(3)}[mt]`);
        fl.push(`[0:a]asplit=2[v1][v2]`);
        fl.push(`[mt][v1]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=400[md]`);
        fl.push(`[v2][md]amix=inputs=2:duration=first:normalize=0[a]`);
        a.push("-filter_complex", fl.join(";"), "-map", "0:v", "-map", "[a]", "-c:a", "aac", "-b:a", "192k");
      } else a.push("-map", "0:v", "-map", "0:a", "-c:a", "copy");
      if (resize) a.push(...resize, ...enc.args("final"));
      else a.push("-c:v", "copy");
      a.push("-movflags", "+faststart", outFile);
      await ff.run(ff.ff(), a, { cwd: tmp });
    } else fs.copyFileSync(joined, outFile);
    log.info(`[굽기] ${outFile} ${total.toFixed(1)}초 영상, ${((Date.now() - t0) / 1000).toFixed(1)}초 걸림 (${enc.name})`);
    onProgress("완성했어요", 1);
    return { file: outFile, seconds: total, took: (Date.now() - t0) / 1000, encoder: enc.name };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** 소리만 내보내기 (mp3·wav) — 영상 굽기 뒤 소리만 뽑는다 */
async function exportAudio(p, kind = "mp3", onProgress) {
  const r = await render(p, {}, onProgress);
  const out = r.file.replace(/\.mp4$/, `.${kind}`);
  await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", r.file, "-vn", ...(kind === "mp3" ? ["-b:a", "192k"] : []), out]);
  fs.rmSync(r.file, { force: true });
  return out;
}

/** 지금 화면 한 장 (png) */
async function snapshot(p, assetFilePath, at, dest) {
  await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(at || 0), "-i", assetFilePath, "-frames:v", "1", dest]);
  return dest;
}

module.exports = { render, joinWithTransitions, exportAudio, snapshot, subtitleLines, wrap };

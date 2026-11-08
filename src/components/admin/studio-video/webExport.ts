"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 웹 동영상studio 내보내기 — 회원 PC 브라우저에서 mp4 굽기 (2026-11-05 사장님: 웹 체험판 · 1분 내외 · 서버 비용 0)
 *  장면마다 그림판(canvas)에 미리보기와 같은 계산으로 그린다 (timeline.ts 의 시간표·사진 움직임·자막 줄·레이어 범위 그대로)
 *  → 크롬 영상 압축(WebCodecs VideoEncoder H.264) · 소리(OfflineAudioContext 로 섞어 AudioEncoder AAC) → mp4-muxer 로 묶기
 *  웹에서 담는 것: 사진·영상 화면(채우기·사진 움직임), 메인자막, 화면 글자, 사진 레이어, 배경음악·효과음, 클립 목소리(AI·녹음)
 *  그래픽·화면 글자 움직임 (animAt) · 화면전환 (mixTrans) · 한 단어씩 자막 (wordState). 아직 앱에서만: 키프레임
 */
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import type { Clip, Layer, Project } from "./types";
import { RATIO_SIZE } from "./types";
import { animAt, animOf, clipOrder, effLeading, effSpacing, flatten, imgRect, layerItems, layerSpan, layerWindow, layersAt, lineWords, motionAt, motionOf, sourceTimeAt, subStyleOf, subWordOf, subtitleLines, wordState, zLayers, type FlatItem } from "./timeline";
import { transAt, transOf } from "./transitions";
import { advLook, isAdv } from "./transAdv";
import { fontCss, fontWeight } from "@/lib/studio-video/fonts";

const FPS = 30;
const SR = 48000;
// 길이 제한 없음 — 60초 넘어도 내보내기 (2026-11-07 사장님: "60초 쇼츠 제한 걸어놨네 · 그러지 마 · 제한 풀어줘")

type Progress = (text: string, frac: number) => void;

const loadImage = (url: string) => new Promise<HTMLImageElement | null>((res) => {
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.onload = () => res(im);
  im.onerror = () => res(null);
  im.src = url;
});
const loadVideo1 = (url: string) => new Promise<HTMLVideoElement | null>((res) => {
  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true;
  v.preload = "auto";
  v.playsInline = true;
  const t = setTimeout(() => { console.warn("[웹 굽기] 영상 불러오기 20초 넘음", url.slice(0, 80)); res(null); }, 20000);
  v.onloadeddata = () => { clearTimeout(t); res(v); };
  v.onerror = () => { clearTimeout(t); console.warn("[웹 굽기] 영상 불러오기 실패", v.error?.code, url.slice(0, 80)); res(null); };
  v.src = url;
});
/**
 * 영상 — 바깥 주소(드론 등)는 새로 받아 메모리(blob)에 담아 쓴다 (2026-11-05)
 *  미리보기가 먼저 불러 둔 저장본(캐시)에는 "다른 사이트 읽기 허용" 표시가 없어 굽기(그림판에 그리기)가 막히던 것
 */
const loadVideo = async (url: string) => {
  if (/^https?:/.test(url)) {
    const blob = await fetch(url, { mode: "cors", cache: "no-store" }).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    if (blob) {
      const v = await loadVideo1(URL.createObjectURL(blob));
      if (v) return v;
    }
  }
  return (await loadVideo1(url)) || (await loadVideo1(url));
};
const seek = (v: HTMLVideoElement, t: number) => new Promise<void>((res) => {
  const tt = Math.max(0, Math.min((v.duration || 0) - 0.05, t));
  if (Math.abs(v.currentTime - tt) < 0.01) return res();
  const done = () => { v.removeEventListener("seeked", done); res(); };
  v.addEventListener("seeked", done);
  v.currentTime = tt;
  setTimeout(done, 1500);
});

/** 화면(사진·영상)을 채우기대로 + 사진 움직임 */
function drawVisual(ctx: CanvasRenderingContext2D, el: CanvasImageSource, iw: number, ih: number, W: number, H: number, fill: string, mo: { z: number; x: number; y: number } | null) {
  const ar = iw / ih;
  const coverK = Math.max(W / iw, H / ih), containK = Math.min(W / iw, H / ih);
  ctx.save();
  if (mo) {
    ctx.translate(W / 2 + mo.x * W, H / 2 + mo.y * H);
    ctx.scale(mo.z, mo.z);
    ctx.translate(-W / 2, -H / 2);
  }
  if (fill === "contain" || fill === "blur") {
    if (fill === "blur") {
      // 흐린 바탕 — 꽉 채워 흐리게
      ctx.save();
      ctx.filter = "blur(40px) brightness(0.7)";
      const w = iw * coverK, h = ih * coverK;
      ctx.drawImage(el, (W - w) / 2, (H - h) / 2, w, h);
      ctx.restore();
    }
    const w = iw * containK, h = ih * containK;
    ctx.drawImage(el, (W - w) / 2, (H - h) / 2, w, h);
  } else {
    const w = iw * coverK, h = ih * coverK;
    ctx.drawImage(el, (W - w) / 2, (H - h) / 2, w, h);
  }
  void ar;
  ctx.restore();
}

function rgba(hex: string, a: number) {
  const h = (hex || "#000000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** 글자 여러 줄 — 테두리·상자·그림자 (미리보기 subLookCss 와 같은 두께: 테두리 = outlineWidth × 2) */
function drawLines(ctx: CanvasRenderingContext2D, lines: string[], o: {
  px: number; font?: string; bold?: boolean; color?: string; align?: "left" | "center" | "right"; leading: number; spacing: number;
  outline?: string; outlineWidth?: number; box?: boolean; boxColor?: string; boxOpacity?: number; bgPad?: number; shadow?: number; shadowColor?: string;
  x: number; y: number; w: number; anchor: "top" | "middle" | "bottom";
  /** 한 단어씩 (쇼츠식) — 줄마다 단어 모습. hl: 지금 단어 색·크게 */
  words?: { a: number; cur: boolean }[][]; hl?: "color" | "big" | "both"; hlColor?: string;
}) {
  const { px } = o;
  ctx.save();
  ctx.font = `${fontWeight(o.font, o.bold !== false)} ${px}px ${fontCss(o.font)}`;
  try { (ctx as any).letterSpacing = `${o.spacing * px}px`; } catch { /* 옛 크롬 */ }
  ctx.textBaseline = "middle";
  const lh = px * o.leading;
  const total = lh * lines.length;
  let top = o.anchor === "top" ? o.y : o.anchor === "middle" ? o.y - total / 2 : o.y - total;
  const align = o.align || "center";
  ctx.textAlign = align;
  const ax = align === "left" ? o.x : align === "right" ? o.x + o.w : o.x + o.w / 2;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const cy = top + lh / 2;
    const tw = ctx.measureText(line).width;
    const ws = o.words?.[li];
    if (o.box) {
      const pad = (o.bgPad ?? 1);
      const bw = tw + px * 0.6 * pad, bh = px * (1 + 0.24 * pad);
      const bx = align === "left" ? ax - px * 0.3 * pad : align === "right" ? ax - tw - px * 0.3 * pad : ax - bw / 2;
      ctx.fillStyle = rgba(o.boxColor || "#000000", o.boxOpacity ?? 0.62);
      ctx.fillRect(bx, cy - bh / 2, bw, bh);
    }
    if (!o.box && Number(o.shadow) > 0) {
      ctx.fillStyle = rgba(o.shadowColor || "#000000", 0.6);
      ctx.fillText(line, ax + px * Number(o.shadow), cy + px * Number(o.shadow));
    }
    const ow = Number(o.outlineWidth ?? 0);
    if (ws && ws.length) {
      // 한 단어씩 — 나타나는 정도(a)·지금 말하는 단어는 강조색·조금 크게 (미리보기 wordState 와 같은 계산)
      const toks = line.split(/\s+/).filter(Boolean);
      const sp = ctx.measureText(" ").width;
      const wds = toks.map((w) => ctx.measureText(w).width);
      const full = wds.reduce((t, w) => t + w, 0) + sp * Math.max(0, toks.length - 1);
      let x = align === "left" ? ax : align === "right" ? ax - full : ax - full / 2;
      ctx.textAlign = "left";
      toks.forEach((w, i) => {
        const st = ws[i] || { a: 1, cur: false };
        if (st.a > 0.001) {
          ctx.save();
          ctx.globalAlpha *= st.a;
          const big = st.cur && (o.hl === "big" || o.hl === "both") ? 1.15 : 1;
          ctx.translate(x + wds[i] / 2, cy);
          ctx.scale(big, big);
          if (!o.box && ow > 0) { ctx.lineJoin = "round"; ctx.lineWidth = Math.max(1, ow * 2); ctx.strokeStyle = o.outline || "#000000"; ctx.strokeText(w, -wds[i] / 2, 0); }
          ctx.fillStyle = st.cur && (o.hl === "color" || o.hl === "both") ? o.hlColor || "#FFE000" : o.color || "#FFFFFF";
          ctx.fillText(w, -wds[i] / 2, 0);
          ctx.restore();
        }
        x += wds[i] + sp;
      });
      ctx.textAlign = align;
      top += lh;
      continue;
    }
    if (!o.box && ow > 0) {
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(1, ow * 2);
      ctx.strokeStyle = o.outline || "#000000";
      ctx.strokeText(line, ax, cy);
    }
    ctx.fillStyle = o.color || "#FFFFFF";
    ctx.fillText(line, ax, cy);
    top += lh;
  }
  ctx.restore();
}

/**
 * 말 빠르기 — 음 높이는 그대로 두고 속도만 (WSOLA). playbackRate 로 빠르게 하면 목소리가 높아진다 (2026-11-05 사장님: "내보내기 할 때 목소리가 이상해")
 *  미리보기(브라우저 audio.preservesPitch)와 같은 소리가 나게
 */
function stretch(ctx: BaseAudioContext, buf: AudioBuffer, rate: number): AudioBuffer {
  if (Math.abs(rate - 1) < 0.01) return buf;
  const N = 2048, Hs = N / 2, Ha = Hs * rate, tol = 512, step = 4;
  const inLen = buf.length, outLen = Math.max(1, Math.ceil(inLen / rate));
  const chs = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const mono = new Float32Array(inLen);
  for (const ch of chs) for (let i = 0; i < inLen; i++) mono[i] += ch[i] / chs.length;
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const out = ctx.createBuffer(chs.length, outLen, buf.sampleRate);
  const outs = Array.from({ length: chs.length }, (_, c) => out.getChannelData(c));
  const norm = new Float32Array(outLen);
  let prev = 0; // 앞 조각을 가져온 입력 자리
  for (let k = 0; k * Hs < outLen; k++) {
    const nominal = Math.round(k * Ha);
    let pos = nominal;
    if (k > 0) {
      // 앞 조각이 자연스럽게 이어질 자리(prev + Hs)와 가장 닮은 곳을 nominal 둘레에서 찾는다
      const nat = prev + Hs;
      let best = -Infinity;
      for (let d = -tol; d <= tol; d += step) {
        const c = nominal + d;
        if (c < 0 || c + Hs >= inLen) continue;
        let sum = 0;
        for (let i = 0; i < Hs; i += step) { const a = nat + i < inLen ? mono[nat + i] : 0; sum += a * mono[c + i]; }
        if (sum > best) { best = sum; pos = c; }
      }
    }
    pos = Math.max(0, Math.min(inLen - 1, pos));
    const o0 = k * Hs;
    for (let i = 0; i < N; i++) {
      const oi = o0 + i, ii = pos + i;
      if (oi >= outLen) break;
      const w = win[i];
      norm[oi] += w;
      if (ii < inLen) for (let c = 0; c < chs.length; c++) outs[c][oi] += chs[c][ii] * w;
    }
    prev = pos;
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) for (let c = 0; c < outs.length; c++) outs[c][i] /= norm[i];
  return out;
}

/** 소리 — 배경음악·효과음을 영상 길이로 섞는다 */
async function mixAudio(p: Project, items: ReturnType<typeof flatten>["items"], total: number): Promise<AudioBuffer | null> {
  const layers = (p.layers || []).filter((l) => !l.off && (l.type === "music" || l.type === "sfx") && (l.url || l.sfx));
  const voices = p.settings.off?.voice ? [] : items.filter((it) => it.clip.type === "voice" && it.clip.voice?.url && !it.clip.muted);
  if (!layers.length && !voices.length) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * SR), SR);
  const order = clipOrder(p);
  const cache = new Map<string, AudioBuffer | null>();
  const decode = async (url: string) => {
    if (cache.has(url)) return cache.get(url)!;
    const buf = await fetch(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null);
    cache.set(url, buf);
    return buf;
  };
  // 목소리 나오는 구간 — 음악을 저절로 줄인다 (덕킹, 2026-11-05: 요즘 쇼츠처럼 말할 때는 음악을 낮게, 쉬는 틈엔 다시)
  const vSpeed = (it: (typeof voices)[number]) => Number(it.clip.speed || p.settings.voice?.speed || 1) || 1;
  const vSegs: [number, number][] = [];
  for (const it of voices) {
    const st = it.start + Math.max(0, Number(it.clip.voice!.o) || 0);
    const d = (Number(it.clip.voice!.duration) || it.dur) / vSpeed(it);
    vSegs.push([st, Math.min(total, st + d)]);
  }
  for (const l of layers) {
    const its = layerItems(p, l, items, order);
    if (!its.length) continue;
    const firstW = layerWindow(l, its[0].clip, p.settings);
    const lastW = layerWindow(l, its[its.length - 1].clip, p.settings);
    const a = its[0].start + (firstW?.s ?? 0);
    const b = its[its.length - 1].start + (lastW ? lastW.e : its[its.length - 1].dur);
    const url = l.type === "sfx" && !l.url ? `/studio-sfx/${l.sfx}.mp3` : String(l.url);
    const buf = await decode(url);
    if (!buf || b <= a) continue;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const vol = l.volume ?? (l.type === "music" ? 0.15 : 1);
    const len = l.type === "sfx" ? Math.min(buf.duration, b - a) : b - a;
    g.gain.setValueAtTime(l.fadeIn ? 0 : vol, a);
    if (l.fadeIn) g.gain.linearRampToValueAtTime(vol, a + Math.min(l.fadeIn, len / 2));
    if (l.fadeOut && len > l.fadeOut) { g.gain.setValueAtTime(vol, a + len - l.fadeOut); g.gain.linearRampToValueAtTime(0, a + len); }
    if (l.type === "music") {
      src.loop = l.loop !== false;
      if (l.duck !== "off" && vSegs.length) {
        const low = typeof l.duckVol === "number" ? Math.max(0, l.duckVol) : vol * (l.duck === "high" ? 0.2 : l.duck === "low" ? 0.55 : 0.35);
        for (const [vs, ve] of vSegs) {
          if (ve < a || vs > a + len) continue;
          const s0 = Math.max(a + 0.01, vs - 0.15), s1 = Math.min(a + len - 0.01, ve + 0.25);
          g.gain.setValueAtTime(vol, s0);
          g.gain.linearRampToValueAtTime(low, Math.min(s1, s0 + 0.15));
          g.gain.setValueAtTime(low, Math.max(s0 + 0.15, s1 - 0.25));
          g.gain.linearRampToValueAtTime(vol, s1);
        }
      }
    }
    src.connect(g).connect(ctx.destination);
    src.start(a, Math.max(0, l.offset || 0) % Math.max(0.01, buf.duration));
    src.stop(a + len);
  }
  // 클립 목소리 (AI 목소리·내 목소리 녹음) — 클립 시작에 (말 빠르기·크기는 전체 설정)
  const vol = p.settings.voice?.volume ?? 1;
  for (const it of voices) {
    const v = it.clip.voice!;
    const buf = await decode(String(v.url));
    if (!buf) continue;
    const src = ctx.createBufferSource();
    const speed = Number(it.clip.speed || p.settings.voice?.speed || 1) || 1;
    src.buffer = stretch(ctx, buf, speed); // 음 높이 그대로, 속도만
    const g = ctx.createGain();
    g.gain.value = vol * (it.clip.volume ?? 1);
    src.connect(g).connect(ctx.destination);
    src.start(it.start + Math.max(0, Number(v.o) || 0));
  }
  // 화면전환 효과음 (clip.trans.sfx) — 전환이 시작될 때 (앞 클립 끝 a초 앞, 미리보기와 같은 때)
  for (let i = 1; i < items.length; i++) {
    const sfx = items[i].clip.trans?.sfx;
    const tr = sfx ? transOf(items[i - 1], items[i]) : null;
    if (!sfx || !tr) continue;
    const buf = await decode(`/studio-sfx/${sfx}.mp3`);
    if (!buf) continue;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g).connect(ctx.destination);
    src.start(Math.max(0, items[i].start - tr.a));
  }
  return ctx.startRendering();
}

/**
 * 화면전환 — 앞(A)·뒤(B) 화면을 섞는다 (2026-11-05 사장님: 테마의 전환이 완성 영상에도). transitions.transStyle 과 같은 모양
 *  고급 전환은 움직임·투명도·원/닦기 가림·흰 번쩍까지 (번짐·색 갈라짐은 빼고)
 */
function mixTrans(ctx: CanvasRenderingContext2D, A: HTMLCanvasElement, B: HTMLCanvasElement, type: string, p: number, W: number, H: number) {
  const q = Math.max(0, Math.min(1, p));
  const e = q * q * (3 - 2 * q); // 부드럽게
  const put = (img: HTMLCanvasElement, o: { x?: number; y?: number; s?: number; sx?: number; sy?: number; r?: number; alpha?: number; clip?: (g: CanvasRenderingContext2D) => void; blur?: number }) => {
    ctx.save();
    if (o.clip) o.clip(ctx);
    ctx.globalAlpha = Math.max(0, Math.min(1, o.alpha ?? 1));
    if (o.blur) ctx.filter = `blur(${o.blur}px)`;
    ctx.translate(W / 2 + (o.x || 0) * W, H / 2 + (o.y || 0) * H);
    if (o.r) ctx.rotate((o.r * Math.PI) / 180);
    ctx.scale((o.s ?? 1) * (o.sx ?? 1), (o.s ?? 1) * (o.sy ?? 1));
    ctx.drawImage(img, -W / 2, -H / 2, W, H);
    ctx.restore();
  };
  if (isAdv(type)) {
    const L = advLook(type, q, W / H);
    const side = (img: HTMLCanvasElement, sd: ReturnType<typeof advLook>["from"]) => put(img, {
      x: sd.x, y: sd.y, s: sd.s, sx: sd.sx, sy: sd.sy, r: sd.r, alpha: sd.o,
      clip: sd.mask ? (g) => {
        const m = sd.mask as { kind: string; r?: number; pos?: number };
        g.beginPath();
        if (m.kind === "circle") g.arc(W / 2, H / 2, Math.max(0, Number(m.r) || 0) * Math.hypot(W, H) / 2, 0, Math.PI * 2);
        else if (m.kind === "wipe") g.rect(0, 0, W * Math.max(0, Math.min(1, Number(m.pos) || 0)), H);
        else g.rect(0, 0, W, H * Math.max(0, Math.min(1, Number(m.pos) || 0)));
        g.clip();
      } : undefined,
    });
    if (L.top === "to") { side(A, L.from); side(B, L.to); } else { side(B, L.to); side(A, L.from); }
    for (const ov of L.over || []) {
      if (ov.kind === "flash" && ov.o > 0.001) { ctx.save(); ctx.globalAlpha = ov.o; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    return;
  }
  switch (type) {
    case "fadeblack":
    case "fadewhite":
      put(q < 0.5 ? A : B, {});
      ctx.save(); ctx.globalAlpha = q < 0.5 ? q * 2 : (1 - q) * 2; ctx.fillStyle = type === "fadeblack" ? "#000" : "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore();
      return;
    case "slideleft": put(A, { x: -e }); put(B, { x: 1 - e }); return;
    case "slideright": put(A, { x: e }); put(B, { x: -(1 - e) }); return;
    case "slideup": put(A, { y: -e }); put(B, { y: 1 - e }); return;
    case "slidedown": put(A, { y: e }); put(B, { y: -(1 - e) }); return;
    case "coverleft": put(A, {}); put(B, { x: 1 - e }); return;
    case "wiperight": put(A, {}); put(B, { clip: (g) => { g.beginPath(); g.rect(0, 0, W * e, H); g.clip(); } }); return;
    case "circleopen": put(A, {}); put(B, { clip: (g) => { g.beginPath(); g.arc(W / 2, H / 2, e * 0.75 * Math.hypot(W, H), 0, Math.PI * 2); g.clip(); } }); return;
    case "zoomin": put(A, { s: 1 + e * 0.6, alpha: 1 - e }); put(B, { alpha: e }); return;
    case "hblur": put(A, { alpha: 1 - e, blur: e * 18 }); put(B, { alpha: e, blur: (1 - e) * 18 }); return;
    default: put(A, {}); put(B, { alpha: e }); return;
  }
}

/** 프로젝트 → mp4 (Blob) */
export async function renderWebMp4(p: Project, onProgress: Progress, cancelled: () => boolean): Promise<{ blob: Blob; seconds: number }> {
  if (typeof (window as any).VideoEncoder === "undefined") throw new Error("이 브라우저는 영상 만들기를 지원하지 않아요. 크롬·엣지·웨일 최신판에서 해 주세요.");
  const [W, H] = RATIO_SIZE[p.ratio] || [1080, 1920];
  const { items, total } = flatten(p);
  if (!items.length || total <= 0) throw new Error("영상에 클립이 없어요.");
  const order = clipOrder(p);

  // 글꼴·화면 미리 받기
  onProgress("사진·영상을 불러오는 중…", 0.01);
  const fonts = new Set<string>([p.settings.subtitle.font, ...(p.layers || []).filter((l) => l.type === "text").map((l) => l.font || ""), ...items.map((x) => x.clip.subStyle?.font || "")].filter(Boolean) as string[]);
  await Promise.all([...fonts].map((f) => (document as any).fonts?.load?.(`700 40px ${fontCss(f)}`).catch(() => {})));
  const imgs = new Map<string, HTMLImageElement>();
  const vids = new Map<string, HTMLVideoElement>();
  const assetIds = new Set<string>();
  for (const it of items) { const id = it.clip.visual?.asset || (it.clip.type !== "voice" ? it.clip.src?.asset : undefined); if (id) assetIds.add(id); }
  for (const l of p.layers || []) if (l.type === "image" && l.asset) assetIds.add(l.asset);
  for (const id of assetIds) {
    const a = p.assets[id];
    if (!a?.url) continue;
    if (a.kind === "image") { const im = await loadImage(a.url); if (im) imgs.set(id, im); }
    else if (a.kind === "video") { const v = await loadVideo(a.url); if (v) vids.set(id, v); }
  }

  // 그림판 · 영상 압축
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: false })!;
  const audio = await mixAudio(p, items, total).catch(() => null);
  const audioOk = Boolean(audio) && typeof (window as any).AudioEncoder !== "undefined" &&
    (await (window as any).AudioEncoder.isConfigSupported({ codec: "mp4a.40.2", sampleRate: SR, numberOfChannels: 2, bitrate: 128000 }).then((r: any) => r.supported).catch(() => false));
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: W, height: H, frameRate: FPS },
    ...(audioOk ? { audio: { codec: "aac" as const, sampleRate: SR, numberOfChannels: 2 } } : {}),
    fastStart: "in-memory",
  });
  let encErr: unknown = null;
  const VE = (window as any).VideoEncoder;
  const venc = new VE({ output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta), error: (e: unknown) => { encErr = e; } });
  const candidates = ["avc1.640028", "avc1.4D0028", "avc1.42E028", "avc1.640033"];
  let codec = "";
  for (const c of candidates) {
    const ok = await VE.isConfigSupported({ codec: c, width: W, height: H, bitrate: 8_000_000, framerate: FPS }).then((r: any) => r.supported).catch(() => false);
    if (ok) { codec = c; break; }
  }
  if (!codec) throw new Error("이 PC에서는 H.264 영상 압축을 쓸 수 없어요. 크롬 최신판에서 다시 해 주세요.");
  venc.configure({ codec, width: W, height: H, bitrate: 8_000_000, framerate: FPS, avc: { format: "avc" } });

  // 클립 화면 한 장 (사진·영상, 채우기·사진 움직임)
  const drawClipAt = async (g: CanvasRenderingContext2D, item: FlatItem, lt: number) => {
    const cc: Clip = item.clip;
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    const vid = cc.visual?.asset || (cc.type !== "voice" ? cc.src?.asset : undefined);
    const a = vid ? p.assets[vid] : undefined;
    if (!a || !vid) return;
    const fill = cc.fill || p.settings.fill || "cover";
    if (a.kind === "image" && imgs.get(vid)) {
      const im = imgs.get(vid)!;
      const mo = motionOf(p, cc);
      drawVisual(g, im, im.naturalWidth, im.naturalHeight, W, H, fill, mo ? motionAt(mo, lt / Math.max(0.01, item.dur)) : null);
    } else if (a.kind === "video" && vids.get(vid)) {
      const v = vids.get(vid)!;
      const st = cc.visual ? (cc.visual.s || 0) + lt : sourceTimeAt(cc, lt);
      await seek(v, st);
      drawVisual(g, v, v.videoWidth || W, v.videoHeight || H, W, H, fill, null);
    }
  };
  const cvA = document.createElement("canvas"), cvB = document.createElement("canvas");
  cvA.width = cvB.width = W; cvA.height = cvB.height = H;
  const gA = cvA.getContext("2d")!, gB = cvB.getContext("2d")!;

  const frames = Math.ceil(total * FPS);
  let ii = 0;
  for (let f = 0; f < frames; f++) {
    if (cancelled()) { try { venc.close(); } catch { /* */ } throw new Error("멈췄어요."); }
    if (encErr) throw encErr;
    const t = f / FPS;
    while (ii < items.length - 1 && t >= items[ii].start + items[ii].dur) ii++;
    const it = items[ii];
    const c: Clip = it.clip;
    const local = t - it.start;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    // 화면 — 화면전환 안이면 앞·뒤 클립을 섞는다 (상대 클립은 첫/마지막 장면에서 멈춘 채로, 미리보기 transAt 과 같은 시각)
    const tr = transAt(items, t);
    if (tr) {
      await drawClipAt(gA, tr.from, Math.min(tr.from.dur - 0.001, t - tr.from.start));
      await drawClipAt(gB, tr.to, Math.max(0, t - tr.to.start));
      mixTrans(ctx, cvA, cvB, tr.type, tr.p, W, H);
    } else {
      await drawClipAt(ctx, it, local);
    }
    // 겹치는 것 — 사진 레이어·화면 글자 (쌓는 순서대로)
    const over = zLayers(p, layersAt(p, c.id, order).filter((l) => {
      if (l.off || (l.type !== "text" && l.type !== "image")) return false;
      const w = layerWindow(l, c, p.settings);
      return !w || (local >= w.s && local < w.e + 0.001);
    })) as Layer[];
    for (const l of over) {
      // 나타나기·강조 움직임 — 미리보기와 같은 계산 (timeline.animAt, 2026-11-05 사장님: "그래픽이 어색해짐")
      const span = layerSpan(p, l, items, c.id, p.settings, order);
      const look = span ? animAt(animOf(p, l), local, span.a, span.b) : null;
      const moved = (cx: number, cy: number, draw: () => void) => {
        ctx.save();
        if (look) {
          ctx.globalAlpha *= Math.max(0, Math.min(1, look.op));
          ctx.translate(cx + look.dx * W, cy + look.dy * H);
          ctx.rotate((look.rot * Math.PI) / 180);
          ctx.scale(look.sc * look.sx, look.sc);
          ctx.translate(-cx, -cy);
        }
        draw();
        ctx.restore();
      };
      if (l.type === "image" && l.asset && imgs.get(l.asset)) {
        const im = imgs.get(l.asset)!;
        const r = imgRect(l, p.assets[l.asset], W, H);
        ctx.save();
        ctx.globalAlpha = l.opacity ?? 1;
        moved(r.left + r.width / 2, r.top + r.height / 2, () => ctx.drawImage(im, r.left, r.top, r.width, r.height));
        ctx.restore();
      } else if (l.type === "text" && l.text) {
        const px = Math.min(W, H) * 0.08 * ((l.size || 100) / 100);
        const free = typeof l.x === "number" && typeof l.y === "number";
        const pos = l.pos || "top";
        const anchor = free ? "middle" : pos === "top" ? "top" : pos === "middle" ? "middle" : "bottom";
        const y = free ? (l.y as number) * H : pos === "top" ? H * 0.06 : pos === "middle" ? H / 2 : H - H * 0.07;
        const x = free ? (l.x as number) * W - W * 0.45 : W * 0.05;
        moved(x + W * 0.45, y, () => drawLines(ctx, String(l.text).split(/\r?\n/), {
          px, font: l.font, bold: l.bold, color: l.color, align: l.align, leading: 1.25, spacing: effSpacing(l as any),
          outline: l.outline || (String(l.color).toUpperCase() === "#111111" ? "#fff" : "#000"), outlineWidth: l.outlineWidth ?? 4,
          box: l.box, boxColor: l.boxColor, boxOpacity: l.boxOpacity, bgPad: l.bgPad, shadow: l.shadow, shadowColor: l.shadowColor,
          x, y, w: W * 0.9, anchor,
        }));
      }
    }
    // 메인자막
    const lines = subtitleLines(c, it.dur, p.settings, W, H);
    const li = lines.findIndex((x) => local >= x.s && local < x.e + 0.001);
    const line = li >= 0 ? lines[li] : null;
    const wfx = line ? subWordOf(p, c) : null;
    const wordsNow = wfx && line ? [lineWords(c, lines, p.settings, wfx)[li].map((w) => wordState(wfx, w, local))] : undefined;
    if (line) {
      const st = subStyleOf(p.settings, c);
      const px = Math.min(W, H) * 0.062 * ((st.size || 100) / 100);
      const subW = W * 0.88 * Math.max(0.3, Math.min(1, st.wrap ?? 1));
      const free = typeof st.x === "number" && typeof st.y === "number";
      const pos = st.position;
      const anchor = free ? "middle" : pos === "top" || pos === "middle-high" ? "top" : pos === "middle" ? "middle" : "bottom";
      const y = free ? (st.y as number) * H : pos === "top" ? H * 0.08 : pos === "middle-high" ? H * 0.24 : pos === "middle" ? H / 2 : pos === "middle-low" ? H - H * 0.24 : H - H * 0.07;
      drawLines(ctx, line.text.split("\n"), {
        px, font: st.font, bold: st.bold, color: st.color, align: st.align, leading: effLeading(st), spacing: effSpacing(st),
        outline: st.outline, outlineWidth: st.outlineWidth ?? 3, box: st.bg, boxColor: st.bgColor, boxOpacity: st.bgOpacity, bgPad: st.bgPad, shadow: st.shadow, shadowColor: st.shadowColor,
        x: free ? (st.x as number) * W - subW / 2 : (W - subW) / 2, y, w: subW, anchor,
        ...(wordsNow && !line.text.includes("\n") ? { words: wordsNow, hl: wfx!.hl, hlColor: wfx!.color } : {}),
      });
    }
    // 압축에 넘기기 (밀리면 잠깐 기다린다)
    const VF = (window as any).VideoFrame;
    const frame = new VF(cv, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 4));
    if (f % 6 === 0) {
      onProgress(`영상을 만드는 중… ${Math.round((f / frames) * 100)}%`, 0.05 + (f / frames) * 0.85);
      await new Promise((r) => setTimeout(r, 0)); // 화면이 멈추지 않게
    }
  }
  await venc.flush();
  venc.close();
  if (encErr) throw encErr;

  // 소리
  if (audio && audioOk) {
    onProgress("소리를 넣는 중…", 0.93);
    const AE = (window as any).AudioEncoder, AD = (window as any).AudioData;
    const aenc = new AE({ output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta), error: (e: unknown) => { encErr = e; } });
    aenc.configure({ codec: "mp4a.40.2", sampleRate: SR, numberOfChannels: 2, bitrate: 128000 });
    const L = audio.getChannelData(0), R = audio.numberOfChannels > 1 ? audio.getChannelData(1) : L;
    const N = 1024 * 8;
    for (let s = 0; s < audio.length; s += N) {
      const n = Math.min(N, audio.length - s);
      const data = new Float32Array(n * 2);
      data.set(L.subarray(s, s + n), 0);
      data.set(R.subarray(s, s + n), n);
      const ad = new AD({ format: "f32-planar", sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((s / SR) * 1e6), data });
      aenc.encode(ad);
      ad.close();
    }
    await aenc.flush();
    aenc.close();
  }
  muxer.finalize();
  onProgress("마무리하는 중…", 0.99);
  const buf = (muxer.target as ArrayBufferTarget).buffer;
  return { blob: new Blob([buf], { type: "video/mp4" }), seconds: Math.round(total * 10) / 10 };
}


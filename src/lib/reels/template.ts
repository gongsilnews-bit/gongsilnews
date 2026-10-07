// 릴스 HyperFrames 구성(HTML) 생성 — 시안 2탄 디자인 (2026-10-06 확정).
// 같은 함수가 편집 화면 미리보기(브라우저)와 MP4 렌더(Vercel Sandbox) 양쪽에서 쓰여 결과가 같다.
//   꽉 찬 사진 + 카메라 이동, 휙 넘기기(방향 흐림)·펀치·플래시 전환, 단어별 자막(노란 강조),
//   장면별 스티커, 가격 카운트업 + 역 이름표, 매물번호 타이핑, 표시·광고 카드, 반 박자에 맞춘 컷.
// 순수 함수: 서버 전용 모듈을 가져오지 않는다 (클라이언트에서도 import).
import { disclosureLines } from "./ad-text";
import type { ReelAgency, ReelFacts, ReelSettings, SceneFx, SceneKind } from "./types";

export interface TemplateScene {
  id: string;
  kind: SceneKind;
  photo: string | null;   // 원본 URL (사진 크기 조회 키)
  words: string[];        // 화면 자막 단어 (성우 대사와 같은 개수)
  spoken: string[];       // 성우 대사 단어 (글자 수로 타이밍 계산)
  highlight: number[];    // 노란 강조할 단어 번호
  sticker: string | null;
  audioSrc: string;
  duration: number;       // 성우 길이(초)
  fx?: SceneFx;           // 클립별 효과 (없으면 자동)
  video?: TemplateVideo | null; // 있으면 사진 대신 영상
}

export interface TemplateVideo {
  src: string;            // 렌더: media/v0.mp4, 미리보기: 서명 주소
  poster: string | null;  // 썸네일 (전체 보이기의 흐린 배경)
  dur: number;            // 변환본 길이(초)
  from: number;
  to: number;
  speed: "auto" | number;
  sound: "off" | "low" | "on";
  fit: "cover" | "contain";
  hasAudio: boolean;
}

/** 영상 클립의 실제 재생 값: 자동 맞춤이면 고른 구간이 클립 길이에 딱 맞는 속도 */
export function videoTiming(v: TemplateVideo, len: number) {
  const span = Math.max(0.3, v.to - v.from);
  const rate = v.speed === "auto" ? Math.min(8, Math.max(0.5, span / len)) : v.speed;
  let mediaStart = v.from;
  // 원본 끝을 넘으면 그만큼 앞에서 시작
  if (mediaStart + len * rate > v.dur) mediaStart = Math.max(0, v.dur - len * rate);
  const playLen = Math.min(len, (v.dur - mediaStart) / rate);
  return { rate: Math.round(rate * 100) / 100, mediaStart: Math.round(mediaStart * 100) / 100, playLen: Math.max(0.1, Math.round(playLen * 1000) / 1000) };
}

export interface TemplateInput {
  facts: ReelFacts;
  agency: ReelAgency | null;
  scenes: TemplateScene[];
  photoSize: Record<string, { w: number; h: number }>;
  photoSrc: (url: string) => string;   // 렌더: media/p0.jpg, 미리보기: 원본 URL
  assetBase: string;                   // 렌더: "assets/", 미리보기: "/reels-assets/"
  bgmSrc: string | null;
  bgmStart?: number;                   // 미리보기에서만: 배경음악 시작 지점(초). 렌더는 미리 잘라 둔 bed.wav
  previewRuntimeSrc?: string;          // 미리보기에서만: HyperFrames 런타임 스크립트
  settings?: ReelSettings;
}

export interface Plan {
  total: number;
  end: number;
  scenes: (TemplateScene & { cut: number; vo: number; wordTimes: number[] })[];
}

// 배경음악(upbeat 123 BPM) 반 박자 격자 — 컷을 박자에 맞춘다
const BEAT0 = 0.02;
const HALF_BEAT = 60 / 123 / 2;
// TAIL: 마지막 클립 뒤 여운 (예전 표시·광고 끝 화면 2.6초 대신, 2026-10-06)
const LEAD = 0.3, GAP = 0.18, PRE = 0.12, WHIP = 0.32, TAIL = 0.6;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const snapUp = (t: number) => BEAT0 + Math.ceil((t - BEAT0) / HALF_BEAT - 1e-6) * HALF_BEAT;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 단어별 시작 시각(대사 안 상대초). 받아쓰기 없이 글자 수로 나누고 문장부호 뒤에 쉼을 준다. */
export function estimateWordTimes(spoken: string[], duration: number): number[] {
  const weight = (w: string) => {
    const hangul = (w.match(/[가-힣]/g) || []).length;
    const other = w.replace(/[가-힣\s]/g, "").replace(/[.,!?~]/g, "").length;
    return Math.max(1, hangul + other * 0.6);
  };
  const pause = (w: string): number => (/[,]$/.test(w) ? 1.6 : /[.!?~]$/.test(w) ? 2.2 : 0);
  const units = spoken.map((w) => weight(w));
  const pauses = spoken.map(pause);
  const total = units.reduce((a, b) => a + b, 0) + pauses.reduce((a, b) => a + b, 0);
  const speak = duration * 0.94;
  const times: number[] = [];
  let acc = 0;
  spoken.forEach((_, i) => {
    times.push(r3((acc / total) * speak));
    acc += units[i] + pauses[i];
  });
  return times;
}

export function planReel(scenes: TemplateScene[]): Plan {
  let t = LEAD;
  const planned = scenes.map((s, i) => {
    const cut = i === 0 ? 0 : r3(snapUp(t - PRE));
    const vo = i === 0 ? LEAD : r3(cut + PRE);
    t = vo + s.duration + GAP + (s.fx?.hold || 0);
    return { ...s, cut, vo, wordTimes: estimateWordTimes(s.spoken, s.duration) };
  });
  const end = r3(snapUp(t));
  return { total: r3(end + TAIL), end, scenes: planned };
}

type Transition = "flash" | "punch" | "whip-left" | "whip-right" | "fade" | "cut";
const overlaps = (t: Transition) => t.startsWith("whip") || t === "fade";

// 카메라 직접 지정: [시작 위치, 끝 위치(사진 폭 비율), 시작 배율, 끝 배율]
const CAMERA: Record<string, number[]> = { "pan-lr": [0.25, 0.75, 1.03, 1.03], "pan-rl": [0.75, 0.25, 1.03, 1.03], "zoom-in": [0.5, 0.5, 1, 1.2], "zoom-out": [0.5, 0.5, 1.22, 1], still: [0.5, 0.5, 1.02, 1.02] };
const STICKER_TOP: Record<string, number> = { top: 300, middle: 700, bottom: 1030 };
const CAPTION_TOP: Record<string, number> = { top: 330, middle: 800, bottom: 1260 };
const CAPTION_SIZE: Record<string, number> = { s: 72, m: 92, l: 112 };
export const CAPTION_COLOR: Record<string, [string, string]> = { yellow: ["#ffd23f", "#111"], orange: ["#ff8a1f", "#111"], blue: ["#2f7bff", "#fff"] };
const MUSIC_LEVEL: Record<string, number> = { low: 0.09, mid: 0.16, high: 0.25 };

export function buildReel(input: TemplateInput): { html: string; plan: Plan } {
  const plan = planReel(input.scenes);
  const { facts, agency, assetBase: A } = input;
  const html: string[] = [];
  const motion: string[] = [];
  const filters: string[] = [];
  const sfx: [number, string, number][] = [];
  const m = (x: string) => motion.push(x);
  const S = plan.scenes;

  // 스타일: 신나게(기본) / 차분하게(부드러운 전환·작은 스티커·효과음 줄임) / 깔끔하게(컷 전환·스티커·효과음 없음)
  const look = input.settings?.style || "lively";
  // 장면 사이 전환: 같은 사진이면 펀치, 가격 장면 진입은 플래시, 나머지는 좌우 번갈아 휙
  let whipFlip = false;
  const into: Transition[] = S.map((s, i) => {
    if (i > 0 && s.fx?.transition && s.fx.transition !== "auto") return s.fx.transition;
    if (look === "calm") return i === 0 ? "cut" : "fade";
    if (look === "clean") return "cut";
    if (i === 0) return "flash";
    if (s.kind === "price") return "flash";
    if (s.photo && s.photo === S[i - 1].photo) return "punch";
    whipFlip = !whipFlip;
    return whipFlip ? "whip-left" : "whip-right";
  });
  let photoMove = 0;
  // 영상 클립은 영상이 시간 지정된 상자 안에 들어갈 수 없어(HyperFrames 규칙) 장면 밖 별도 층(-vwrap)에 둔다.
  // 전환 움직임은 장면 상자와 영상 층에 같이 준다.
  const W = (sid: string) => (S.find((x) => x.id === sid)?.video ? `["#${sid}-wrap", "#${sid}-vwrap"]` : `"#${sid}-wrap"`);

  S.forEach((s, i) => {
    const { id, cut, vo } = s;
    const next = i + 1 < S.length ? S[i + 1].cut : plan.total; // 마지막 클립은 여운까지
    const whipIn = i > 0 && into[i].startsWith("whip");
    const overIn = i > 0 && overlaps(into[i]);
    const overOut = i + 1 < S.length && overlaps(into[i + 1]);
    const start = overIn ? r3(cut - WHIP / 2) : cut;
    const end = overOut ? r3(next + WHIP / 2) : next;
    // 효과음: 전체 설정과 이 클립 설정이 모두 켜져 있을 때만
    const sceneSfx = input.settings?.sfx !== false && s.fx?.sfxOn !== false;
    const push = (at: number, name: string, vol: number) => {
      if (sceneSfx) sfx.push([at, name, vol]);
    };
    // 이 클립으로 들어올 때 나는 소리 (자동이면 전환 종류에 맞춘 기본값)
    const tSound = s.fx?.transitionSound || "auto";
    const pushTransition = (at: number, vol: number) => {
      if (tSound === "none" || (tSound === "auto" && look !== "lively")) return;
      if (tSound === "sparkle") push(at, "sparkle", 0.55);
      else push(at, "whoosh", vol);
    };
    const len = r3(end - start);
    const wt = (k: number) => r3(vo + (s.wordTimes[Math.max(0, Math.min(k, s.wordTimes.length - 1))] || 0));
    const inner: string[] = [];

    // ── 배경 사진 + 카메라 ──
    const photoUrl = s.photo || S.find((x) => x.photo)?.photo || null;
    if (s.video) {
      // ── 영상: 구간·속도·소리 ──
      const v = s.video;
      const { rate, mediaStart, playLen } = videoTiming(v, len);
      const sound = rate > 2 || !v.hasAudio ? "off" : v.sound;
      const audio = sound === "off" ? "muted" : `data-has-audio="true" data-volume="${sound === "low" ? 0.3 : 1}"`;
      html.push(
        `<div class="vlayer" id="${id}-vwrap">` +
          (v.fit === "contain" && v.poster ? `<img class="vbg" src="${esc(v.poster)}" alt="" />` : "") +
          `<video id="${id}-vid" class="${v.fit}" src="${esc(v.src)}" data-start="${start}" data-duration="${playLen}" data-media-start="${mediaStart}" data-playback-rate="${rate}" data-track-index="0" playsinline ${audio}></video></div>`,
      );
      // 영상 층은 시간 지정이 없어서 이 클립 동안만 보이게 직접 켜고 끈다
      // (첫 클립은 0초에 '숨김'과 '보임'이 겹쳐 숨김으로 남은 적이 있어, 0초 시작이면 보임만 건다)
      if (start > 0) m(`tl.set("#${id}-vwrap", { autoAlpha: 0 }, 0);`);
      m(`tl.set("#${id}-vwrap", { autoAlpha: 1 }, ${start});`);
      m(`tl.set("#${id}-vwrap", { autoAlpha: 0 }, ${r3(start + len)});`);
      inner.push('<div class="shade"></div>');
    } else if (photoUrl) {
      const size = input.photoSize[photoUrl] || { w: 1600, h: 900 };
      const wide = size.w / size.h > 1080 / 1920;
      const W = wide ? Math.round((1920 * size.w) / size.h) : 1080;
      const H = wide ? 1920 : Math.round((1080 * size.h) / size.w);
      const dark = s.kind === "price";
      inner.push(`<div class="cam" id="${id}-cam"><img id="${id}-img" class="${dark ? "bg-dark" : ""}" src="${esc(input.photoSrc(photoUrl))}" style="width:${W}px;height:${H}px" alt="" /></div>`);
      if (!dark) {
        inner.push('<div class="shade"></div>');
        // 장면마다 다른 카메라: 훑기(좌→우, 우→좌), 밀어 들어가기, 빠지기. 사진 가장자리는 벽인 경우가 많아 가운데 30~70% 안에서만 움직인다
        const punchIn = s.kind === "hook" && look === "lively";
        const moves = s.kind === "hook" ? [punchIn ? [0.5, 0.5, 1.35, 1.05] : [0.5, 0.5, 1.12, 1.02]] : [[0.3, 0.72, 1, 1.04], [0.66, 0.38, 1, 1.14], [0.35, 0.62, 1.06, 1.06], [0.58, 0.42, 1.2, 1.06]];
        const manual = s.fx?.camera && s.fx.camera !== "auto" ? CAMERA[s.fx.camera] : null;
        const [f0, f1, z0, z1] = manual || (s.kind === "cta" ? [0.5, 0.5, 1.22, 1] : moves[s.kind === "hook" ? 0 : photoMove++ % moves.length]);
        const axis = wide ? "x" : "y";
        const span = wide ? W - 1080 : H - 1920;
        m(`tl.fromTo("#${id}-img", { ${axis}: ${Math.round(-f0 * span)} }, { ${axis}: ${Math.round(-f1 * span)}, duration: ${len}, ease: "sine.inOut" }, ${start});`);
        if (punchIn && !manual) {
          m(`tl.fromTo("#${id}-cam", { scale: ${z0} }, { scale: 1.1, duration: 0.6, ease: "expo.out" }, ${start});`);
          m(`tl.to("#${id}-cam", { scale: ${z1}, duration: ${r3(Math.max(0.1, len - 0.6))}, ease: "none" }, ${r3(start + 0.6)});`);
        } else {
          m(`tl.fromTo("#${id}-cam", { scale: ${z0} }, { scale: ${z1}, duration: ${len}, ease: "sine.inOut" }, ${start});`);
        }
      }
    }

    // ── 장면 종류별 그래픽 ──
    if (s.kind === "price") {
      const rows: { k: string; v: number; hero: boolean; key: string }[] = [];
      if (facts.trade === "월세") {
        rows.push({ k: "보증금", v: facts.deposit, hero: false, key: "보증금" }, { k: "월세", v: facts.monthlyRent, hero: true, key: "월세" });
      } else {
        rows.push({ k: facts.trade || "가격", v: facts.deposit, hero: true, key: facts.trade || "" });
      }
      if (facts.maintenanceFee > 0) rows.push({ k: "관리비", v: facts.maintenanceFee, hero: false, key: "관리비" });
      inner.push(
        '<div class="price">' +
          rows.map((r, n) => `<div class="prow${r.hero ? " hero" : ""}" id="${id}-r${n}"><span>${esc(r.k)}</span><b><em id="${id}-v${n}">0</em>만</b></div>`).join("") +
          "</div>",
      );
      let lastAt = vo;
      rows.forEach((r, n) => {
        const k = s.spoken.findIndex((w) => r.key && w.includes(r.key));
        const at = k >= 0 ? r3(wt(k) - 0.05) : r3(lastAt + 0.7);
        lastAt = at;
        const man = Math.round(r.v / 10000);
        m(`tl.fromTo("#${id}-r${n}", { autoAlpha: 0, x: -120 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: "back.out(1.7)" }, ${at});`);
        m(`(function(){ const p = { v: 0 }; const el = document.getElementById("${id}-v${n}"); tl.fromTo(p, { v: 0 }, { v: ${man}, duration: 0.6, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(p.v).toLocaleString("ko-KR"); } }, ${r3(at + 0.1)}); })();`);
        push(at + 0.1, "click-soft", 1);
        if (r.hero) m(`tl.fromTo("#${id}-r${n}", { scale: 1 }, { scale: 1.08, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 }, ${r3(at + 0.75)});`);
      });
      if (facts.transit.length) {
        const station = facts.transit[0].split(" ")[0];
        const lines = facts.transit.map((t) => t.replace(station, "").trim() || t).slice(0, 3);
        inner.push(`<div class="transit"><span id="${id}-st"><i></i>${esc(station)}</span>` + lines.map((l, n) => `<b id="${id}-l${n}" class="c${n}">${esc(l)}</b>`).join("") + "</div>");
        const k = s.spoken.findIndex((w) => w.includes(station.replace(/역$/, "")));
        const tat = k >= 0 ? r3(wt(k) - 0.05) : r3(lastAt + 0.8);
        m(`tl.fromTo("#${id}-st", { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2.2)" }, ${tat});`);
        lines.forEach((_, n) => {
          m(`tl.fromTo("#${id}-l${n}", { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: "back.out(2)" }, ${r3(tat + 0.35 + n * 0.18)});`);
          push(tat + 0.35 + n * 0.18, "click-soft", 0.9);
        });
      }
    }

    if (s.kind === "cta") {
      const digits = String(facts.vacancyNo);
      const at = r3(vo + 0.2);
      const typeAt = wt(Math.max(0, s.words.findIndex((w) => /\d/.test(w))));
      inner.push(`<div class="search" id="${id}-box"><div class="sb-top">공실뉴스 매물번호 검색</div><div class="sb-field">` + [...digits].map((d, k) => `<span id="${id}-d${k}">${d}</span>`).join("") + `<i id="${id}-caret"></i></div></div>`);
      inner.push(`<div class="stkrow" style="top:920px;justify-content:flex-end"><div class="hand" id="${id}-hand">놓치기 전에!</div></div>`);
      m(`tl.fromTo("#${id}-box", { autoAlpha: 0, y: 80, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.8)" }, ${at});`);
      [...digits].forEach((_, k) => {
        const dt = r3(typeAt + k * 0.1);
        m(`tl.fromTo("#${id}-d${k}", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: "none" }, ${dt});`);
        push(dt, "click-soft", 0.8);
      });
      m(`tl.fromTo("#${id}-caret", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, ease: "none", repeat: 9, yoyo: true }, ${at});`);
      const hat = r3(typeAt + digits.length * 0.1 + 0.4);
      m(`tl.fromTo("#${id}-hand", { autoAlpha: 0, scale: 0.6, rotation: -14 }, { autoAlpha: 1, scale: 1, rotation: -6, duration: 0.35, ease: "back.out(2)" }, ${hat});`);
      push(hat + 0.05, "sparkle", 0.5);
    }

    // ── 스티커: 모양·등장 방식·효과음을 각각 고를 수 있다 (기본: 첫 장면은 쾅, 사진 장면은 알약·도장·별을 돌아가며) ──
    // 깔끔하게는 스티커를 기본으로 숨긴다 (클립에서 직접 켜면 보임)
    if (s.sticker && (look === "clean" ? s.fx?.stickerOn === true : s.fx?.stickerOn !== false)) {
      const autoStyle = look !== "lively" ? "pill" : s.kind === "hook" ? "slam" : (["pill", "stamp", "burst"] as const)[(photoMove + 2) % 3];
      const style = s.fx?.stickerStyle && s.fx.stickerStyle !== "auto" ? s.fx.stickerStyle : autoStyle;
      const when = s.fx?.stickerAt;
      const at = r3(vo + (when === "start" ? 0.15 : when === "middle" ? s.duration * 0.4 : when === "end" ? s.duration * 0.75 : Math.min(1, s.duration * 0.3)));
      // 위치: 지정하지 않으면 모양별 기본 자리
      const DEF: Record<string, [number, string]> = { slam: [470, "center"], pill: [380, "right"], stamp: [360, "left"], burst: [300, "right"], hand: [920, "right"] };
      const top = s.fx?.stickerPos ? STICKER_TOP[s.fx.stickerPos] : DEF[style][0];
      const xy = s.fx?.stickerXY;
      const side = xy ? (xy[0] < 400 ? "left" : xy[0] > 680 ? "right" : "center") : s.fx?.stickerSide || DEF[style][1];
      const sc = s.fx?.stickerScale ?? 1;
      const justify = side === "left" ? "flex-start" : side === "right" ? "flex-end" : "center";
      const sid = `#${id}-stk`;
      // 모양별 기본 등장 방식·효과음
      const DEF_ANIM: Record<string, string> = { slam: "slam", pill: "spin", stamp: "slam", burst: "pop", hand: "pop" };
      const DEF_SOUND: Record<string, string> = { slam: "impact", pill: "sparkle", stamp: "pop", burst: "impact", hand: "sparkle" };
      const anim = s.fx?.stickerAnim && s.fx.stickerAnim !== "auto" ? s.fx.stickerAnim : look === "lively" ? DEF_ANIM[style] : "fade";
      const sound = s.fx?.stickerSound && s.fx.stickerSound !== "auto" ? s.fx.stickerSound : look === "lively" ? DEF_SOUND[style] : "none";
      const tilt = style === "stamp" ? -12 : style === "slam" ? -8 : style === "burst" ? 0 : 6;
      const ENTER: Record<string, [string, string, number]> = {
        slam: [`{ autoAlpha: 0, scale: 2.6, rotation: ${tilt - 14} }`, `{ autoAlpha: 1, scale: 1, rotation: ${tilt}, duration: 0.22, ease: "power4.out" }`, 0.22],
        pop: [`{ autoAlpha: 0, scale: 0.2, rotation: ${tilt} }`, `{ autoAlpha: 1, scale: 1, rotation: ${tilt}, duration: 0.35, ease: "back.out(2.6)" }`, 0.12],
        spin: [`{ autoAlpha: 0, scale: 0.3, rotation: ${tilt - 200} }`, `{ autoAlpha: 1, scale: 1, rotation: ${tilt}, duration: 0.5, ease: "back.out(1.6)" }`, 0.3],
        drop: [`{ autoAlpha: 0, y: -260, rotation: ${tilt} }`, `{ autoAlpha: 1, y: 0, rotation: ${tilt}, duration: 0.45, ease: "bounce.out" }`, 0.25],
        slide: [`{ autoAlpha: 0, x: ${side === "left" ? -700 : 700}, rotation: ${tilt} }`, `{ autoAlpha: 1, x: 0, rotation: ${tilt}, duration: 0.4, ease: "power3.out" }`, 0.3],
        fade: [`{ autoAlpha: 0, rotation: ${tilt} }`, `{ autoAlpha: 1, rotation: ${tilt}, duration: 0.5, ease: "sine.out" }`, 0.1],
      };
      const [from, to, landed] = ENTER[anim] || ENTER.pop;
      const SOUND: Record<string, [string, number] | null> = { impact: ["impact-bass-1", 0.6], pop: ["pop", 0.6], sparkle: ["sparkle", 0.6], click: ["click-soft", 1], none: null };

      // 편집기가 위치·크기를 재고 끌 수 있도록 움직이지 않는 상자(stkbox)로 한 번 감싼다
      if (xy) inner.push(`<div class="stkbox" id="${id}-stkbox" style="position:absolute;left:${xy[0]}px;top:${xy[1]}px;width:max-content;max-width:980px;transform:translate(-50%,-50%) scale(${sc})">`);
      else inner.push(`<div class="stkrow" style="top:${top}px;justify-content:${justify}"><div class="stkbox" id="${id}-stkbox" style="transform:scale(${sc});transform-origin:${side === "left" ? "left" : side === "right" ? "right" : "center"} top">`);
      if (style === "slam") {
        inner.push(`<div class="slam" id="${id}-stk" style="text-align:${side}">${esc(s.sticker)}</div>`);
      } else if (style === "pill") {
        inner.push(`<div class="pill" id="${id}-stk"><svg viewBox="0 0 40 40"><path d="M20 3 L24 15 L37 15 L27 23 L31 36 L20 28 L9 36 L13 23 L3 15 L16 15 Z"/></svg>${esc(s.sticker)}</div>`);
        m(`tl.to("${sid} svg", { rotation: 72, duration: 2, ease: "none" }, ${at});`);
      } else if (style === "hand") {
        inner.push(`<div class="hand" id="${id}-stk">${esc(s.sticker)}</div>`);
      } else if (style === "stamp") {
        inner.push(`<div class="stamp" id="${id}-stk"><svg viewBox="0 0 60 60"><path id="${id}-chk" d="M 14 31 L 26 43 L 47 18"/></svg><span>${esc(s.sticker)}</span></div>`);
        m(`tl.fromTo("#${id}-chk", { strokeDasharray: 60, strokeDashoffset: 60 }, { strokeDashoffset: 0, duration: 0.25, ease: "power2.out" }, ${r3(at + landed)});`);
      } else {
        const pts = Array.from({ length: 24 }, (_, k) => {
          const rr = k % 2 === 0 ? 92 : 70;
          return `${(100 + rr * Math.cos((Math.PI * k) / 12)).toFixed(1)},${(100 + rr * Math.sin((Math.PI * k) / 12)).toFixed(1)}`;
        }).join(" ");
        inner.push(`<div class="burst" id="${id}-stk"><svg viewBox="0 0 200 200"><polygon points="${pts}"/></svg><span>${esc(s.sticker)}</span></div>`);
        m(`tl.to("${sid} svg", { rotation: 30, duration: 1.5, ease: "none" }, ${at});`);
      }
      inner.push(xy ? "</div>" : "</div></div>");
      m(`tl.fromTo("${sid}", ${from}, ${to}, ${at});`);
      // 쾅 떨어지기는 화면이 살짝 흔들린다
      if (anim === "slam" && style === "slam") [14, -10, 6, 0].forEach((dx, k) => m(`tl.to("#${id}-${s.video ? "vwrap" : "cam"}", { x: ${dx}, duration: 0.033, ease: "none" }, ${r3(at + 0.22 + k * 0.033)});`));
      const snd = SOUND[sound];
      if (snd) push(r3(at + landed), snd[0], snd[1]);
    }

    // ── 단어별 자막: 3단어·12자 안팎으로 묶어 하나씩 튀어나오게 ──
    const capOn = s.fx?.captionOn !== false;
    const capScale = s.fx?.captionScale ?? 1;
    const capSize = Math.round(CAPTION_SIZE[s.fx?.captionSize || "m"] * capScale);
    const [hlBg, hlInk] = CAPTION_COLOR[s.fx?.captionColor || "yellow"];
    const capMax = Math.round((12 * 92) / capSize); // 글자가 크면 한 묶음에 덜 넣는다
    const groups: number[][] = [];
    let cur: number[] = [];
    s.words.forEach((w, k) => {
      const chars = cur.reduce((n, j) => n + s.words[j].length, 0) + w.length;
      if (cur.length && (cur.length >= 3 || chars > capMax)) {
        groups.push(cur);
        cur = [];
      }
      cur.push(k);
      if (/[,.!?~]$/.test(s.spoken[k] || w)) {
        groups.push(cur);
        cur = [];
      }
    });
    if (cur.length) groups.push(cur);
    const caps = (capOn ? groups : []).map((g, gi) => {
      const gStart = r3(wt(g[0]) - 0.06);
      const gEnd = gi + 1 < groups.length ? r3(wt(groups[gi + 1][0]) - 0.08) : r3(Math.min(vo + s.duration + 0.35, end - 0.02));
      m(`tl.set("#${id}-g${gi}", { autoAlpha: 0 }, 0);`);
      m(`tl.set("#${id}-g${gi}", { autoAlpha: 1 }, ${gStart});`);
      m(`tl.set("#${id}-g${gi}", { autoAlpha: 0 }, ${gEnd});`);
      return (
        `<div class="cap" id="${id}-g${gi}">` +
        g
          .map((k) => {
            const hl = s.highlight.includes(k);
            const at = r3(wt(k) - 0.04);
            m(`tl.fromTo("#${id}-w${k}", { autoAlpha: 0, y: 26, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.16, ease: "back.out(2.4)" }, ${at});`);
            if (hl) m(`tl.fromTo("#${id}-w${k} i", { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: "power3.out" }, ${r3(at + 0.04)});`);
            return `<span class="w${hl ? " hl" : ""}" id="${id}-w${k}"><i></i><em>${esc(s.words[k])}</em></span>`;
          })
          .join("") +
        "</div>"
      );
    });
    const capTop = s.fx?.captionY ?? CAPTION_TOP[s.fx?.captionPos || "bottom"];
    if (capOn) inner.push(`<div class="caps" id="${id}-caps" style="top:${capTop}px;height:${Math.round(300 * capScale)}px;--cap-size:${capSize}px;--hl:${hlBg};--hl-ink:${hlInk}">${caps.join("")}</div>`);

    // ── 컷 전환 ──
    if (whipIn) {
      const dir = into[i] === "whip-left" ? -1 : 1;
      const prev = S[i - 1].id;
      const fid = `wb${i}`;
      filters.push(`<filter id="${fid}" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur id="${fid}-g" stdDeviation="0 0"/></filter>`);
      const a = r3(cut - WHIP / 2);
      m(`tl.fromTo(${W(prev)}, { x: 0 }, { x: ${dir * 1080}, duration: ${WHIP}, ease: "power3.in", immediateRender: false }, ${a});`);
      m(`tl.fromTo(${W(id)}, { x: ${-dir * 1080} }, { x: 0, duration: ${WHIP}, ease: "power3.out" }, ${a});`);
      m(`(function(){ const p = { b: 0 }; const g = document.getElementById("${fid}-g"); const set = () => g.setAttribute("stdDeviation", p.b.toFixed(1) + " 0"); tl.fromTo(p, { b: 0 }, { b: 40, duration: ${WHIP / 2}, ease: "power2.in", onUpdate: set, immediateRender: false }, ${a}); tl.to(p, { b: 0, duration: ${WHIP / 2}, ease: "power2.out", onUpdate: set }, ${r3(a + WHIP / 2)}); })();`);
      m(`tl.set(["#${prev}-wrap", "#${id}-wrap"], { filter: "url(#${fid})" }, ${a});`);
      m(`tl.set(["#${prev}-wrap", "#${id}-wrap"], { filter: "none" }, ${r3(a + WHIP)});`);
      pushTransition(cut, 0.3);
    } else if (into[i] === "punch") {
      m(`tl.fromTo(${W(id)}, { scale: 1.18 }, { scale: 1, duration: 0.3, ease: "expo.out" }, ${cut});`);
      pushTransition(cut, 0.3);
    } else if (into[i] === "fade" && i > 0) {
      m(`tl.fromTo(${W(id)}, { opacity: 0 }, { opacity: 1, duration: ${WHIP}, ease: "sine.inOut" }, ${r3(cut - WHIP / 2)});`);
      if (tSound !== "auto") pushTransition(cut, 0.25);
    } else if (into[i] === "flash" && i > 0) {
      pushTransition(cut, 0.25);
    } else if (into[i] === "cut" && i > 0 && tSound !== "auto") {
      pushTransition(cut, 0.25);
    }

    html.push(`<div id="${id}" class="scene clip${s.video ? " vscene" : ""}" data-start="${start}" data-duration="${len}" data-track-index="${1 + (i % 2)}"><div class="wrap" id="${id}-wrap">${inner.join("")}</div></div>`);
  });

  // ── 플래시: 시작, 가격 진입 ──
  const flashes = [0, ...S.filter((_, i) => i > 0 && into[i] === "flash").map((s) => s.cut)];
  flashes.forEach((at, k) => {
    const st = Math.max(0, r3(at - 0.08));
    html.push(`<div id="flash${k}" class="flash clip" data-start="${st}" data-duration="0.5" data-track-index="5"><div class="fl" id="flash${k}-in"></div></div>`);
    m(`tl.fromTo("#flash${k}-in", { opacity: ${at === 0 ? 1 : 0} }, { opacity: 1, duration: 0.08, ease: "none" }, ${st});`);
    m(`tl.to("#flash${k}-in", { opacity: 0, duration: 0.38, ease: "power2.out" }, ${r3(at)});`);
  });

  // ── 표시·광고 (공인중개사법 제18조의2): 끝 화면 대신 영상 내내 아래쪽 얇은 정보 띠 (전체 설정에서 끌 수 있음) ──
  if (input.settings?.disclosure !== false) {
    const lines = disclosureLines(facts, agency);
    html.push(`<div id="adband" class="clip" data-start="0" data-duration="${plan.total}" data-track-index="6"><div class="adband">${lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div></div>`);
  }

  // ── 소리 ──
  const PEAK: Record<string, number> = { whoosh: 0.16, pop: 0.12, "click-soft": 0.07, chime: 0.42, sparkle: 0.03, "impact-bass-1": 0.05 };
  const LEN: Record<string, number> = { whoosh: 0.58, pop: 0.72, "click-soft": 0.37, chime: 2.5, sparkle: 1.8, "impact-bass-1": 2.12 };
  const audio = [
    ...S.filter((s) => s.audioSrc).map((s) => `<audio id="vo-${s.id}" src="${esc(s.audioSrc)}" data-start="${s.vo}" data-duration="${r3(s.duration)}" data-track-index="10" data-volume="1"></audio>`),
    ...sfx.map(([at, name, vol], k) => `<audio id="fx${k}" src="${A}sfx/${name}.mp3" data-start="${Math.max(0, r3(at - PEAK[name]))}" data-duration="${LEN[name]}" data-track-index="11" data-volume="${(vol * 0.6).toFixed(2)}"></audio>`),
    input.bgmSrc ? `<audio id="bgm" src="${esc(input.bgmSrc)}" data-start="0" data-duration="${plan.total}"${input.bgmStart ? ` data-media-start="${input.bgmStart}"` : ""} data-track-index="12" data-volume="${MUSIC_LEVEL[input.settings?.musicLevel || "mid"]}"></audio>` : "",
  ];

  const page = `<!doctype html>
<html lang="ko"><head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="${A}js/gsap.min.js"></script>${input.previewRuntimeSrc ? `<script src="${input.previewRuntimeSrc}"></script>` : ""}<style>${css(A)}</style></head>
<body><div id="main" data-composition-id="main" data-start="0" data-duration="${plan.total}" data-fps="30" data-width="1080" data-height="1920">
<svg width="0" height="0" style="position:absolute">${filters.join("")}</svg>
${html.join("\n")}
${input.settings?.badge === false ? "" : `<div id="badgeclip" class="clip" data-start="0" data-duration="${plan.total}" data-track-index="4"><div id="badge"><i></i>공실뉴스 · ${facts.vacancyNo}</div></div>`}
${audio.join("\n")}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${input.settings?.badge === false ? "" : `tl.fromTo("#badge", { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out" }, 0.4);`}
${motion.join("\n")}
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>`;
  return { html: page, plan };
}

function css(A: string) {
  return `@font-face { font-family: "Pretendard"; src: url("${A}fonts/Pretendard-Bold.woff2") format("woff2"); font-weight: 700; }
@font-face { font-family: "NanumPen"; src: url("${A}fonts/NanumPenScript-Regular.ttf") format("truetype"); }
:root { --navy: #0a1c3a; --yellow: #ffd23f; --orange: #ff8a1f; --blue: #2f7bff; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: #000; }
#main { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Pretendard", sans-serif; font-weight: 700; color: #fff; }
.scene { position: absolute; inset: 0; overflow: hidden; background: #000; }
.adband { position: absolute; left: 36px; right: 36px; bottom: 262px; padding: 12px 22px; border-radius: 16px; background: rgba(0, 0, 0, 0.52); color: rgba(255, 255, 255, 0.92); font-size: 24px; line-height: 1.38; }
.adband p { margin: 0; word-break: keep-all; }
.scene.vscene { background: transparent; }
.vlayer { position: absolute; inset: 0; overflow: hidden; background: #000; }
.vlayer video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vlayer video.contain { object-fit: contain; }
.vlayer .vbg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(40px) brightness(0.45); transform: scale(1.15); }
.wrap, .cam { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
.cam img { position: absolute; top: 0; left: 0; max-width: none; }
.cam img.bg-dark { filter: blur(30px) brightness(0.35); transform: scale(1.1); }
.shade { position: absolute; left: 0; right: 0; bottom: 0; height: 900px; background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.62)); }
.caps { position: absolute; left: 40px; right: 40px; top: 1260px; height: 300px; }
.cap { position: absolute; inset: 0; display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; gap: 10px 18px; }
.w { position: relative; display: inline-block; padding: 4px 14px 10px; font-size: var(--cap-size, 92px); line-height: 1.12; letter-spacing: -0.02em; }
.w em { position: relative; font-style: normal; color: #fff; paint-order: stroke fill; -webkit-text-stroke: 16px #000; text-shadow: 0 8px 22px rgba(0,0,0,0.5); }
.w i { position: absolute; left: 0; right: 0; top: 6px; bottom: 4px; background: var(--hl, #ffd23f); border-radius: 14px; transform: scaleX(0); transform-origin: left center; }
.w.hl em { color: var(--hl-ink, #111); -webkit-text-stroke: 0; text-shadow: none; }
#badge { position: absolute; left: 44px; top: 132px; display: flex; align-items: center; gap: 12px; padding: 10px 22px; border-radius: 999px; background: rgba(0,0,0,0.45); font-size: 32px; }
#badge i { width: 16px; height: 16px; border-radius: 50%; background: var(--orange); }
.stkrow { position: absolute; left: 50px; right: 50px; display: flex; align-items: flex-start; pointer-events: none; }
.stkbox { pointer-events: none; }
.slam { position: relative; width: 100%; text-align: center; font-size: 190px; line-height: 1; color: var(--yellow); paint-order: stroke fill; -webkit-text-stroke: 26px #111; text-shadow: 0 16px 0 rgba(0,0,0,0.35); }
.pill { position: relative; display: flex; align-items: center; gap: 14px; padding: 18px 38px 18px 26px; border-radius: 999px; background: #fff; color: #111; font-size: 68px; box-shadow: 0 14px 0 rgba(0,0,0,0.25); }
.pill svg { width: 70px; height: 70px; } .pill svg path { fill: var(--orange); }
.stamp { position: relative; flex: 0 0 300px; width: 300px; height: 300px; border-radius: 50%; border: 12px solid #e8312f; color: #e8312f; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.9); text-align: center; }
.stamp svg { width: 130px; height: 130px; }
.stamp svg path { fill: none; stroke: #e8312f; stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; }
.stamp span { font-size: 46px; margin-top: -6px; padding: 0 20px; line-height: 1.1; }
.burst { position: relative; flex: 0 0 380px; width: 380px; height: 380px; display: flex; align-items: center; justify-content: center; }
.burst svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.burst polygon { fill: var(--yellow); stroke: #111; stroke-width: 6; }
.burst span { position: relative; width: 250px; text-align: center; font-size: 64px; line-height: 1.05; color: #111; transform: rotate(-8deg); }
.price { position: absolute; left: 70px; right: 70px; top: 330px; display: flex; flex-direction: column; gap: 22px; }
.prow { display: flex; align-items: baseline; justify-content: space-between; padding: 18px 40px; border-radius: 28px; background: rgba(255,255,255,0.1); border: 3px solid rgba(255,255,255,0.25); font-size: 54px; color: #d5dbe6; }
.prow b { font-size: 110px; color: #fff; font-weight: 700; } .prow b em { font-style: normal; }
.prow.hero { background: var(--yellow); border-color: var(--yellow); color: #111; transform-origin: 50% 50%; }
.prow.hero b { font-size: 150px; color: #111; }
.transit { position: absolute; left: 40px; right: 40px; top: 1110px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 14px; }
.transit span { display: flex; align-items: center; gap: 10px; padding: 12px 26px; border-radius: 999px; background: #fff; color: var(--navy); border: 6px solid var(--blue); font-size: 46px; }
.transit span i { width: 20px; height: 20px; border-radius: 50%; background: var(--blue); }
.transit b { padding: 12px 24px; border-radius: 14px; font-size: 46px; color: #fff; }
.transit .c0 { background: #3a6ee8; } .transit .c1 { background: #ef7c1c; color: #111; } .transit .c2 { background: #e0b400; color: #111; }
.search { position: absolute; left: 70px; right: 70px; top: 520px; padding: 36px 40px; border-radius: 34px; background: #fff; color: #111; box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
.sb-top { font-size: 42px; color: #555; }
.sb-field { display: flex; align-items: center; margin-top: 18px; padding: 18px 28px; border-radius: 20px; border: 5px solid var(--orange); font-size: 130px; letter-spacing: 0.04em; min-height: 180px; }
.sb-field i { width: 8px; height: 120px; margin-left: 8px; background: var(--orange); }
.hand { position: relative; font-family: "NanumPen", sans-serif; font-weight: 400; font-size: 130px; color: var(--yellow); text-shadow: 0 6px 14px rgba(0,0,0,0.6); }
.flash { position: absolute; inset: 0; pointer-events: none; } .fl { position: absolute; inset: 0; background: #fff; opacity: 0; }`;
}

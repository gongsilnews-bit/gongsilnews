// 고급 화면전환 (2026-10-20 사장님: "기본 · 고급") — studio-app/src/video/transAdv.js 와 같은 계산 (advLook). 둘을 같이 고친다.
//  미리보기는 이 값을 CSS(transform·SVG 번짐·brightness·mask·blend)로 그리고, 굽기는 transAdv.js bakeFrame 이 칸마다 같은 값으로 그린다.
export type AdvMask = { kind: "circle"; r: number; f: number } | { kind: "wipe"; ang: number; pos: number; f: number } | { kind: "blinds"; n: number; pos: number; f: number };
export type AdvSide = { x: number; y: number; s: number; sx: number; sy: number; r: number; o: number; bx: number; by: number; rgb: number; br: number; mask: AdvMask | null };
export type AdvOver =
  | { kind: "flash"; o: number }
  | { kind: "glow"; o: number; cx: number; cy: number; r: number; c1: string; c2: string }
  | { kind: "rays"; o: number; cx: number; cy: number; rot: number; n: number; r: number; c: string }
  | { kind: "vig"; o: number };
export type AdvLook = { from: AdvSide; to: AdvSide; top: "to" | "from"; over?: AdvOver[] };

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, p: number) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const eIn = (t: number) => t * t * t;
const eOut = (t: number) => 1 - Math.pow(1 - t, 3);
const eInOut5 = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
const eInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const side = (o: Partial<AdvSide> = {}): AdvSide => ({ x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, o: 1, bx: 0, by: 0, rgb: 0, br: 1, mask: null, ...o });
/** 돌려도 빈 곳이 안 보이는 크기 (ar = 너비/높이) */
const cover = (deg: number, ar: number) => { const R = Math.max(ar, 1 / ar), a = (Math.abs(deg) * Math.PI) / 180; return Math.abs(Math.cos(a)) + R * Math.abs(Math.sin(a)); };

export const ADV: { id: string; label: string; group: string; sfx?: string }[] = [
  { id: "x_whipl", label: "휙 넘기기 ←", group: "움직임", sfx: "whoosh-short" },
  { id: "x_whipr", label: "휙 넘기기 →", group: "움직임", sfx: "whoosh-short" },
  { id: "x_whipu", label: "휙 넘기기 ↑", group: "움직임", sfx: "whoosh-short" },
  { id: "x_whipd", label: "휙 넘기기 ↓", group: "움직임", sfx: "whoosh-short" },
  { id: "x_zoomin", label: "줌 인", group: "움직임", sfx: "whoosh" },
  { id: "x_zoomout", label: "줌 아웃", group: "움직임", sfx: "whoosh" },
  { id: "x_spin", label: "회전", group: "움직임", sfx: "whoosh" },
  { id: "x_shake", label: "흔들며", group: "움직임" },
  { id: "x_bounce", label: "튕기며 들어오기", group: "움직임", sfx: "pop" },
  { id: "x_stretch", label: "늘이며", group: "움직임", sfx: "whoosh-short" },
  { id: "x_roll", label: "구르며", group: "움직임", sfx: "whoosh" },
  { id: "x_punch", label: "펀치 줌", group: "움직임", sfx: "impact-bass-1" },
  { id: "x_focus", label: "초점 흐림", group: "흐림" },
  { id: "x_dirblur", label: "방향 흐림", group: "흐림", sfx: "whoosh-short" },
  { id: "x_chblur", label: "채널 흐림", group: "흐림" },
  { id: "x_bokeh", label: "보케 흐림", group: "흐림", sfx: "sparkle" },
  { id: "x_leak", label: "빛 번짐", group: "빛·필름" },
  { id: "x_flash", label: "번쩍", group: "빛·필름", sfx: "impact-bass-1" },
  { id: "x_burn", label: "필름 타는", group: "빛·필름" },
  { id: "x_dip", label: "부드럽게 검은 화면", group: "빛·필름" },
  { id: "x_burnwhite", label: "하얗게 타며", group: "빛·필름", sfx: "sparkle" },
  { id: "x_glow", label: "글로우", group: "빛·필름", sfx: "sparkle" },
  { id: "x_rays", label: "빛줄기", group: "빛·필름", sfx: "chime" },
  { id: "x_chroma", label: "컬러 빛 번짐", group: "빛·필름" },
  { id: "x_vig", label: "비네팅 어둡게", group: "빛·필름" },
  { id: "x_glitch", label: "글리치", group: "디지털" },
  { id: "x_rgb", label: "RGB 갈라짐", group: "디지털" },
  { id: "x_flicker", label: "깜빡이며", group: "디지털" },
  { id: "x_circle", label: "원 (부드럽게)", group: "모양" },
  { id: "x_wipe", label: "비스듬히 닦기", group: "모양" },
  { id: "x_blinds", label: "블라인드", group: "모양" },
];
export const isAdv = (t?: string) => ADV.some((x) => x.id === t);

export function advLook(type: string, p: number, ar = 16 / 9): AdvLook {
  p = clamp(p);
  const env = Math.sin(Math.PI * p); // 가운데에서 가장 세게
  const cf = (a = 0.42, b = 0.58) => smooth(a, b, p); // 가운데서 살짝 섞어 바꾸기
  switch (type) {
    case "x_whipl": case "x_whipr": case "x_whipu": case "x_whipd": {
      const e = eInOut5(p), b = 0.06 * env * env;
      const h = type === "x_whipl" || type === "x_whipr";
      const dir = type === "x_whipl" || type === "x_whipu" ? -1 : 1;
      const mv = (v: number) => (h ? { x: v } : { y: v });
      const bl = h ? { bx: b } : { by: b };
      return { from: side({ ...mv(dir * e), ...bl }), to: side({ ...mv(dir * (e - 1)), ...bl }), top: "to" };
    }
    case "x_zoomin": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      return { from: side({ s: 1 + eIn(u), bx: 0.025 * eIn(u), by: 0.025 * eIn(u), o: 1 }), to: side({ s: 2 - eOut(v), bx: 0.025 * (1 - eOut(v)), by: 0.025 * (1 - eOut(v)), o: cf() }), top: "to" };
    }
    case "x_zoomout": {
      const b1 = 0.02 * eIn(p), b2 = 0.02 * (1 - eOut(p));
      return { from: side({ s: 1 - 0.6 * eIn(p), o: 1 - smooth(0.5, 0.85, p), bx: b1, by: b1 }), to: side({ s: 1.6 - 0.6 * eOut(p), bx: b2, by: b2 }), top: "from" };
    }
    case "x_spin": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      const r1 = eIn(u) * 28, r2 = -(1 - eOut(v)) * 28;
      const b1 = 0.02 * eIn(u), b2 = 0.02 * (1 - eOut(v));
      return { from: side({ r: r1, s: cover(r1, ar) * (1 + 0.25 * eIn(u)), bx: b1, by: b1 }), to: side({ r: r2, s: cover(r2, ar) * (1 + 0.25 * (1 - eOut(v))), bx: b2, by: b2, o: cf() }), top: "to" };
    }
    case "x_shake": {
      const jx = 0.035 * env * Math.sin(p * Math.PI * 2 * 7), jy = 0.025 * env * Math.sin(p * Math.PI * 2 * 9 + 1);
      const b = 0.006 * env, s = 1.08 + 0.1 * env;
      return { from: side({ x: jx, y: jy, s, bx: b, by: b }), to: side({ x: jx, y: jy, s, bx: b, by: b, o: cf(0.4, 0.6) }), top: "to" };
    }
    case "x_bounce": {
      const b = 0.02 * (1 - smooth(0, 0.7, p));
      return { from: side({ s: 1 + 0.06 * eOut(p) }), to: side({ x: 1 - backOut(p), bx: b }), top: "to" };
    }
    case "x_leak":
      return { from: side({ s: 1 + 0.04 * p }), to: side({ s: 1.04 - 0.04 * p, o: smooth(0.3, 0.7, p) }), top: "to", over: [{ kind: "glow", o: 0.95 * Math.pow(env, 1.5), cx: -0.2 + 1.4 * p, cy: 0.4, r: 0.9, c1: "#FFE3A3", c2: "#FF7A3D" }] };
    case "x_flash":
      return { from: side({ s: 1 + 0.08 * env }), to: side({ s: 1 + 0.08 * env, o: p < 0.5 ? 0 : 1 }), top: "to", over: [{ kind: "flash", o: Math.pow(clamp(1 - Math.abs(p - 0.5) / 0.5), 2) }] };
    case "x_burn":
      return { from: side(), to: side({ o: smooth(0.35, 0.65, p) }), top: "to", over: [{ kind: "glow", o: env, cx: 0.08, cy: 0.92, r: 0.3 + 1.3 * p, c1: "#FFF1C2", c2: "#FF4D00" }] };
    case "x_dip":
      return { from: side({ o: 1 - smooth(0, 0.5, p) }), to: side({ o: smooth(0.5, 1, p) }), top: "to" };
    case "x_glitch": {
      const e2 = clamp(1 - Math.abs(p - 0.5) * 2);
      const jx = 0.025 * e2 * (Math.sin(p * 97) > 0 ? 1 : -1);
      return { from: side({ x: jx, rgb: 0.022 * e2 }), to: side({ x: jx, rgb: 0.022 * e2, o: p < 0.5 ? 0 : 1 }), top: "to" };
    }
    case "x_rgb":
      return { from: side({ s: 1 + 0.06 * env, rgb: 0.025 * env }), to: side({ s: 1 + 0.06 * env, rgb: 0.025 * env, o: smooth(0.35, 0.65, p) }), top: "to" };
    case "x_flicker": {
      const k = Math.floor(p * 12); // 칸 12개 — 가운데 6칸에서 번갈아
      const on = p >= 0.75 || (p >= 0.25 && k % 2 === 1);
      return { from: side({ rgb: 0.01 * env }), to: side({ rgb: 0.01 * env, o: on ? 1 : 0 }), top: "to" };
    }
    case "x_stretch": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      return { from: side({ sx: 1 + 3 * eIn(u), bx: 0.05 * eIn(u), br: 1 + 0.3 * eIn(u) }), to: side({ sx: 4 - 3 * eOut(v), bx: 0.05 * (1 - eOut(v)), br: 1 + 0.3 * (1 - eOut(v)), o: cf() }), top: "to" };
    }
    case "x_roll": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      const r1 = eIn(u) * 90, r2 = -(1 - eOut(v)) * 90, b1 = 0.035 * eIn(u), b2 = 0.035 * (1 - eOut(v));
      return { from: side({ r: r1, s: cover(r1, ar), bx: b1, by: b1 }), to: side({ r: r2, s: cover(r2, ar), bx: b2, by: b2, o: cf(0.45, 0.55) }), top: "to" };
    }
    case "x_punch": {
      const u = clamp(p * 2), v = clamp(p * 2 - 1);
      const jx = 0.02 * env * Math.sin(p * Math.PI * 2 * 9);
      return { from: side({ s: 1 + 0.6 * eIn(u), x: jx, bx: 0.02 * eIn(u), by: 0.02 * eIn(u) }), to: side({ s: 1.6 - 0.6 * eOut(v), x: jx, bx: 0.02 * (1 - eOut(v)), by: 0.02 * (1 - eOut(v)), o: p < 0.5 ? 0 : 1 }), top: "to", over: [{ kind: "flash", o: 0.85 * Math.pow(clamp(1 - Math.abs(p - 0.5) / 0.18), 2) }] };
    }
    case "x_focus": {
      const b1 = 0.03 * smooth(0, 0.55, p), b2 = 0.03 * (1 - smooth(0.45, 1, p));
      return { from: side({ bx: b1, by: b1, s: 1 + 0.03 * p }), to: side({ bx: b2, by: b2, s: 1.03 - 0.03 * p, o: cf(0.35, 0.65) }), top: "to" };
    }
    case "x_dirblur": {
      const b1 = 0.07 * smooth(0, 0.55, p), b2 = 0.07 * (1 - smooth(0.45, 1, p));
      return { from: side({ bx: b1, x: -0.04 * eIn(p) }), to: side({ bx: b2, x: 0.04 * (1 - eOut(p)), o: cf(0.4, 0.6) }), top: "to" };
    }
    case "x_chblur": {
      const k = env;
      return { from: side({ rgb: 0.03 * k, bx: 0.012 * k, by: 0.012 * k, s: 1 + 0.05 * k }), to: side({ rgb: 0.03 * k, bx: 0.012 * k, by: 0.012 * k, s: 1 + 0.05 * k, o: cf(0.4, 0.6) }), top: "to" };
    }
    case "x_bokeh": {
      const b = 0.045 * env, l = 1 + 0.45 * env;
      return { from: side({ bx: b, by: b, br: l }), to: side({ bx: b, by: b, br: l, o: cf(0.35, 0.65) }), top: "to", over: [{ kind: "glow", o: 0.35 * env, cx: 0.5, cy: 0.45, r: 0.8, c1: "#FFF4D6", c2: "#FFB15C" }] };
    }
    case "x_burnwhite": {
      const l = 1 + 3.2 * Math.pow(env, 1.6), b = 0.01 * env;
      return { from: side({ br: l, bx: b, by: b }), to: side({ br: l, bx: b, by: b, o: cf(0.45, 0.55) }), top: "to" };
    }
    case "x_glow": {
      const l = 1 + 1.3 * env, b = 0.02 * env;
      return { from: side({ br: l, bx: b, by: b }), to: side({ br: l, bx: b, by: b, o: cf(0.4, 0.6) }), top: "to", over: [{ kind: "glow", o: 0.55 * env, cx: 0.5, cy: 0.5, r: 1.0, c1: "#FFFFFF", c2: "#FFE7B0" }] };
    }
    case "x_rays":
      return { from: side({ s: 1 + 0.04 * p, br: 1 + 0.25 * env }), to: side({ s: 1.04 - 0.04 * p, br: 1 + 0.25 * env, o: smooth(0.35, 0.65, p) }), top: "to",
        over: [{ kind: "rays", o: env, cx: 0.5, cy: -0.1, rot: -30 + 60 * p, n: 16, r: 1.4, c: "#FFF2C8" }, { kind: "glow", o: 0.6 * env, cx: 0.5, cy: 0, r: 0.7, c1: "#FFFFFF", c2: "#FFD27A" }] };
    case "x_chroma":
      return { from: side(), to: side({ o: smooth(0.3, 0.7, p) }), top: "to",
        over: [{ kind: "glow", o: 0.9 * env, cx: -0.15 + 1.2 * p, cy: 0.3, r: 0.75, c1: "#FFB3F0", c2: "#E0219B" }, { kind: "glow", o: 0.9 * env, cx: 1.15 - 1.2 * p, cy: 0.72, r: 0.75, c1: "#B5F5FF", c2: "#1FA2E0" }] };
    case "x_vig":
      return { from: side(), to: side({ o: cf(0.4, 0.6) }), top: "to", over: [{ kind: "vig", o: Math.min(1, 1.3 * env) }] };
    case "x_circle":
      return { from: side({ s: 1 + 0.05 * p }), to: side({ mask: { kind: "circle", r: eInOut(p) * 1.15, f: 0.15 } }), top: "to" };
    case "x_wipe":
      return { from: side(), to: side({ mask: { kind: "wipe", ang: 120, pos: eInOut(p), f: 0.18 } }), top: "to" };
    case "x_blinds":
      return { from: side(), to: side({ mask: { kind: "blinds", n: 8, pos: eInOut(p), f: 0.12 } }), top: "to" };
    default:
      return { from: side(), to: side({ o: p }), top: "to" };
  }
}


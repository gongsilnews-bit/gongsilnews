"use client";

// 미리보기 — 굽기(render.js)와 같은 규칙으로 화면·성우·원본 소리·음악·자막을 맞춰 보여 준다 (PC 파일을 바로 재생)
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import type { Clip, Layer, Project } from "./types";
import { RATIO_SIZE, rgba } from "./types";
import { fontCss, fontWeight } from "@/lib/studio-video/fonts";
import { useFonts } from "./Pickers";
import { clipOrder, clipText, flatten, layerItems, layersAt, musicLayers, sourceTimeAt, speedOf, srcSpeed, subtitleLines } from "./timeline";
import { C, Icon } from "./ui";

export type PlayerHandle = { play: () => void; pause: () => void; toggle: () => void; seek: (t: number) => void; time: () => number; playing: () => boolean };

type Props = {
  project: Project;
  width: number;
  onTime?: (t: number) => void;
  onPlaying?: (p: boolean) => void;
  previewRate?: number;
  /** 미리보기 위 화면 글자·사진을 끌어 옮기기 / 모서리로 크기 (first = 한 번 끄는 동안 처음 바뀔 때) */
  selLayer?: string;
  onLayerPick?: (id: string) => void;
  onLayerMove?: (id: string, patch: Partial<Layer>, first: boolean) => void;
  /** 화면에서 바로 글 고치기 (두 번 누르기) — 화면 글자 / 자막 */
  onLayerText?: (id: string, text: string) => void;
  onSubText?: (clipId: string, text: string) => void;
  /** 미리보기에서 클립 화면을 끌어 옮기기·크기 / 자막을 끌어 옮기기·줄 너비 */
  onVisualMove?: (clipId: string, box: { x: number; y: number; w: number }, first: boolean) => void;
  onSubMove?: (patch: { x?: number; y?: number; wrap?: number; size?: number }, first: boolean) => void;
  /** 클립 화면·자막을 눌러 고르면 (오른쪽 속성 칸 열기) */
  onBoxPick?: (kind: "visual" | "sub", clipId: string) => void;
};

/** 브라우저가 낼 수 있는 재생 빠르기 (0.0625~16배) — 20배는 미리보기에서 16배로 */
const rateOk = (r: number) => Math.max(0.0625, Math.min(16, r));

/** 화면 위 글자를 그 자리에서 고치는 칸 — 엔터: 저장, Shift+엔터: 줄바꿈, Esc: 취소 */
function InlineEdit({ text, style, onDone }: { text: string; style: React.CSSProperties; onDone: (t: string | null) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }, []);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  return (
    <span ref={ref} contentEditable suppressContentEditableWarning
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finish(ref.current?.innerText ?? null);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          finish(null);
        }
      }}
      onBlur={() => finish(ref.current?.innerText ?? null)}
      style={{ ...style, outline: "2px solid #3b82f6", outlineOffset: 2, cursor: "text", pointerEvents: "auto", userSelect: "text", WebkitUserSelect: "text" }}>
      {text}
    </span>
  );
}

const Player = forwardRef<PlayerHandle, Props>(function Player({ project, width, onTime, onPlaying, previewRate = 1, selLayer = "", onLayerPick, onLayerMove, onLayerText, onSubText, onVisualMove, onSubMove, onBoxPick }, ref) {
  const [editing, setEditing] = useState(""); // 고치는 중: 애셋 id 또는 "sub:클립id"
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, H] = RATIO_SIZE[project.ratio] || RATIO_SIZE["16:9"];
  const boxW = width;
  const boxH = Math.round((width * H) / W);
  const k = boxW / W;
  const flat = useMemo(() => flatten(project), [project]);
  const order = useMemo(() => clipOrder(project), [project]);
  // 음악 애셋마다 [시작, 끝] (굽기 render.js 와 같은 계산)
  const musics = useMemo(
    () =>
      musicLayers(project, flat.items)
        .map((l) => {
          const cov = layerItems(project, l, flat.items, order);
          return cov.length ? { l, s: cov[0].start, e: cov[cov.length - 1].start + cov[cov.length - 1].dur } : null;
        })
        .filter(Boolean) as { l: Layer; s: number; e: number }[],
    [project, flat, order]
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLVideoElement>(null);
  const voiceRef = useRef<HTMLAudioElement>(null);
  const musicEls = useRef<Record<string, HTMLAudioElement | null>>({});
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(0);
  const playRef = useRef(false);
  const clock = useRef({ t0: 0, base: 0 });
  const curClip = useRef<string>("");
  const lastReport = useRef(0);

  const itemAt = (time: number) => flat.items.find((x) => time >= x.start && time < x.start + x.dur) || flat.items[flat.items.length - 1];
  const item = itemAt(t);
  const clip = item?.clip;
  const local = item ? Math.max(0, t - item.start) : 0;

  const visualOf = (c?: Clip) => {
    if (!c) return null;
    if (c.visual && project.assets[c.visual.asset]) return project.assets[c.visual.asset];
    if (c.type !== "voice" && c.src) return project.assets[c.src.asset] || null;
    return null;
  };
  const visual = visualOf(clip);
  const fill = clip?.fill || project.settings.fill;

  /** 화면·소리를 지금 시각에 맞춘다 (force: 클립이 바뀌었거나 찾아가기) */
  const sync = (time: number, force: boolean) => {
    const it = itemAt(time);
    if (!it) return;
    const c = it.clip;
    const loc = Math.max(0, time - it.start);
    const v = videoRef.current;
    const vis = visualOf(c);
    const sameSource = c.type !== "voice" && vis && c.src && vis.id === c.src.asset;
    if (v && vis && vis.kind === "video") {
      let target: number;
      if (sameSource) target = sourceTimeAt(c, loc);
      else {
        const s = Number(c.visual?.s) || 0;
        target = vis.duration ? (s + loc) % Math.max(0.1, vis.duration) : s + loc;
      }
      if (force || Math.abs(v.currentTime - target) > 0.3) {
        try {
          v.currentTime = target;
        } catch {}
      }
      const st = project.settings;
      v.muted = !sameSource || Boolean(c.muted);
      v.volume = Math.max(0, Math.min(1, (st.sourceVolume ?? 1) * (c.volume ?? 1)));
      v.playbackRate = rateOk(previewRate * (sameSource ? srcSpeed(c) : 1));
      if (bgRef.current && fill === "blur") {
        try {
          if (force || Math.abs(bgRef.current.currentTime - target) > 0.5) bgRef.current.currentTime = target;
        } catch {}
      }
      if (playRef.current) {
        if (v.paused) v.play().catch(() => {});
        if (bgRef.current && fill === "blur" && bgRef.current.paused) bgRef.current.play().catch(() => {});
      } else {
        v.pause();
        bgRef.current?.pause();
      }
    }
    // 화면만 바꾼 촬영 클립: 원본 소리를 따로
    const a = voiceRef.current;
    if (a) {
      if (c.type === "voice" && c.voice?.url) {
        const sp = speedOf(c, project.settings);
        const target = loc * sp;
        a.playbackRate = rateOk(sp * previewRate);
        a.volume = Math.max(0, Math.min(1, project.settings.voice?.volume ?? 1));
        if (force || Math.abs(a.currentTime - target) > 0.3) {
          try {
            a.currentTime = Math.min(target, Math.max(0, (c.voice.duration || 0) - 0.01));
          } catch {}
        }
        if (playRef.current && target < (c.voice.duration || 0)) {
          if (a.paused) a.play().catch(() => {});
        } else a.pause();
      } else if (c.type !== "voice" && c.src && !sameSource && project.assets[c.src.asset]?.hasAudio && !c.muted) {
        a.volume = Math.max(0, Math.min(1, (project.settings.sourceVolume ?? 1) * (c.volume ?? 1)));
        a.playbackRate = rateOk(previewRate * srcSpeed(c));
        const target = sourceTimeAt(c, loc);
        if (force || Math.abs(a.currentTime - target) > 0.3) {
          try {
            a.currentTime = target;
          } catch {}
        }
        if (playRef.current && a.paused) a.play().catch(() => {});
        if (!playRef.current) a.pause();
      } else a.pause();
    }
  };

  // 클립이 바뀌면 소리·영상 주소를 바꾸고 맞춘다
  useEffect(() => {
    const a = voiceRef.current;
    if (!a || !clip) return;
    const want = clip.type === "voice" ? clip.voice?.url || "" : clip.src && visual && visual.id !== clip.src.asset ? project.assets[clip.src.asset]?.url || "" : "";
    if (a.getAttribute("src") !== want) {
      if (want) a.setAttribute("src", want);
      else a.removeAttribute("src");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.id, clip?.voice?.url, visual?.id]);

  /** 음악 애셋 — 구간 안에서만, 시작 지점·반복·페이드 (force: 찾아가기) */
  const syncMusic = (time: number, force: boolean) => {
    for (const { l, s, e } of musics) {
      const a = musicEls.current[l.id];
      if (!a) continue;
      const inside = time >= s && time < e;
      if (!inside || !playRef.current) {
        if (!a.paused) a.pause();
        continue;
      }
      const loc = time - s;
      const len = e - s;
      const dur = a.duration && isFinite(a.duration) ? a.duration : 0;
      let target = (Number(l.offset) || 0) + loc;
      if (dur) {
        if (l.loop !== false) target = target % dur;
        else if (target >= dur) {
          a.pause();
          continue;
        }
      }
      const fi = Math.min(len / 2, Number(l.fadeIn) || 0);
      const fo = Math.min(len / 2, Number(l.fadeOut) || 0);
      let g = 1;
      if (fi > 0 && loc < fi) g = Math.min(g, loc / fi);
      if (fo > 0 && len - loc < fo) g = Math.min(g, (len - loc) / fo);
      a.volume = Math.max(0, Math.min(1, (l.volume ?? 0.15) * g));
      a.playbackRate = previewRate;
      if (force || Math.abs(a.currentTime - target) > 0.4) {
        try {
          a.currentTime = target;
        } catch {}
      }
      if (a.paused) a.play().catch(() => {});
    }
  };

  const tick = () => {
    if (!playRef.current) return;
    const now = performance.now();
    let time = clock.current.base + ((now - clock.current.t0) / 1000) * previewRate;
    if (time >= flat.total) {
      time = flat.total;
      stop();
    }
    tRef.current = time;
    const it = itemAt(time);
    const changed = it && it.clip.id !== curClip.current;
    if (it) curClip.current = it.clip.id;
    sync(time, Boolean(changed));
    syncMusic(time, false);
    if (now - lastReport.current > 90 || changed) {
      lastReport.current = now;
      setT(time);
      onTime?.(time);
    }
    if (playRef.current) requestAnimationFrame(tick);
  };

  const start = () => {
    if (!flat.items.length) return;
    if (tRef.current >= flat.total - 0.05) tRef.current = 0;
    clock.current = { t0: performance.now(), base: tRef.current };
    playRef.current = true;
    setPlaying(true);
    onPlaying?.(true);
    const it = itemAt(tRef.current);
    curClip.current = it?.clip.id || "";
    setTimeout(() => {
      sync(tRef.current, true);
      syncMusic(tRef.current, true);
    }, 0);
    requestAnimationFrame(tick);
  };
  const stop = () => {
    playRef.current = false;
    setPlaying(false);
    onPlaying?.(false);
    videoRef.current?.pause();
    bgRef.current?.pause();
    voiceRef.current?.pause();
    Object.values(musicEls.current).forEach((a) => a?.pause());
  };
  const seek = (time: number) => {
    const v = Math.max(0, Math.min(flat.total, time));
    tRef.current = v;
    clock.current = { t0: performance.now(), base: v };
    setT(v);
    onTime?.(v);
    const it = itemAt(v);
    curClip.current = it?.clip.id || "";
    setTimeout(() => {
      sync(v, true);
      syncMusic(v, true);
    }, 0);
  };

  useImperativeHandle(ref, () => ({
    play: start,
    pause: stop,
    toggle: () => (playRef.current ? stop() : start()),
    seek,
    time: () => tRef.current,
    playing: () => playRef.current,
  }));

  // 프로젝트가 바뀌면 (편집) 지금 화면을 다시 맞춘다
  useEffect(() => {
    if (tRef.current > flat.total) seek(flat.total);
    else setTimeout(() => sync(tRef.current, true), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat]);

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // 자막
  const st = project.settings.subtitle;
  const lines = clip && item ? subtitleLines(clip, item.dur, project.settings, W) : [];
  const line = lines.find((l) => local >= l.s && local < l.e + 0.001) || null;
  const fontPx = Math.min(W, H) * 0.062 * ((st.size || 100) / 100) * k;
  const posStyle: React.CSSProperties =
    st.position === "top" ? { top: H * 0.08 * k } : st.position === "middle" ? { top: "50%", transform: "translateY(-50%)" } : st.position === "middle-low" ? { bottom: H * 0.24 * k } : { bottom: H * 0.07 * k };

  // 쓰인 글꼴을 받아 둔다 (처음 한 번)
  useFonts([project.settings.subtitle.font, ...(project.layers || []).filter((l) => l.type === "text").map((l) => l.font)]);
  // 지금 클립에 걸린 사진·화면 글자 애셋 (굽기와 같은 자리·크기)
  const over = clip ? layersAt(project, clip.id, order) : [];
  const overImages = over.filter((l) => l.type === "image" && l.asset && project.assets[l.asset]?.kind === "image");
  const overTexts = over.filter((l) => l.type === "text" && String(l.text || "").trim());

  /**
   * 끌기 — move: 자리 / 모서리(nw·ne·sw·se): 크기. 크기는 잡은 모서리의 반대쪽 모서리를 고정하고
   * 가로·세로를 같은 비율로 바꾼다 (인디자인처럼). 거의 안 움직이면 고르기만
   */
  type Corner = "nw" | "ne" | "sw" | "se";
  const startDrag = (l: Layer, mode: "move" | Corner, e: React.PointerEvent) => {
    if (!onLayerMove) return;
    e.preventDefault();
    e.stopPropagation();
    onLayerPick?.(l.id);
    const box = boxRef.current?.getBoundingClientRect();
    const el = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-layer]")?.getBoundingClientRect();
    if (!box || !el) return;
    const sx = e.clientX;
    const sy = e.clientY;
    // 지금 보이는 가운데 자리에서 시작 (글자가 상단·가운데·하단 자리였어도)
    const cx = (el.left + el.width / 2 - box.left) / box.width;
    const cy = (el.top + el.height / 2 - box.top) / box.height;
    const w0 = l.w ?? 0.35;
    const s0 = l.size ?? 100;
    // 고정 모서리와 커지는 방향
    const right = mode === "ne" || mode === "se";
    const down = mode === "sw" || mode === "se";
    const fx = right ? el.left : el.right;
    const fy = down ? el.top : el.bottom;
    let first = true;
    const move = (ev: PointerEvent) => {
      if (first && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 3) return;
      const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
      let patch: Partial<Layer>;
      if (mode === "move") {
        patch = { x: +clamp(cx + (ev.clientX - sx) / box.width, 0, 1).toFixed(4), y: +clamp(cy + (ev.clientY - sy) / box.height, 0, 1).toFixed(4) };
      } else {
        // 고정 모서리에서 손가락까지 거리로 비율을 정한다 (가로·세로 중 더 많이 끈 쪽)
        const kx = (right ? ev.clientX - fx : fx - ev.clientX) / Math.max(1, el.width);
        const ky = (down ? ev.clientY - fy : fy - ev.clientY) / Math.max(1, el.height);
        let k = Math.max(kx, ky);
        k = l.type === "image" ? clamp(k, 0.05 / w0, 1 / w0) : clamp(k, 30 / s0, 400 / s0);
        const nw = el.width * k;
        const nh = el.height * k;
        const ncx = (fx + (right ? nw / 2 : -nw / 2) - box.left) / box.width;
        const ncy = (fy + (down ? nh / 2 : -nh / 2) - box.top) / box.height;
        const pos = { x: +ncx.toFixed(4), y: +ncy.toFixed(4) };
        patch = l.type === "image" ? { ...pos, w: +(w0 * k).toFixed(3) } : { ...pos, size: Math.round(s0 * k) };
      }
      onLayerMove(l.id, patch, first);
      first = false;
    };
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };
  /* ── 클립 화면·자막 고르기 (화면 글자·사진 올리기와 같은 손잡이) ── */
  const [pick, setPick] = useState<"" | "visual" | "sub">("");
  useEffect(() => setPick(""), [clip?.id]);
  useEffect(() => { if (selLayer) setPick(""); }, [selLayer]);
  const startBox = (kind: "visual" | "sub", mode: "move" | Corner | "e" | "w", e: React.PointerEvent) => {
    const can = kind === "visual" ? onVisualMove && clip : onSubMove;
    if (!can) return;
    e.preventDefault();
    e.stopPropagation();
    setPick(kind);
    if (clip) onBoxPick?.(kind, clip.id);
    const box = boxRef.current?.getBoundingClientRect();
    const el = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-layer]")?.getBoundingClientRect();
    if (!box || !el) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const cx = (el.left + el.width / 2 - box.left) / box.width;
    const cy = (el.top + el.height / 2 - box.top) / box.height;
    const w0 = el.width / box.width;
    const right = mode === "ne" || mode === "se";
    const down = mode === "sw" || mode === "se";
    const fx = right ? el.left : el.right;
    const fy = down ? el.top : el.bottom;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    let first = true;
    const move = (ev: PointerEvent) => {
      if (first && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 3) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (kind === "sub") {
        if (mode !== "move" && mode !== "e" && mode !== "w") {
          const ccx = el.left + el.width / 2;
          const ccy = el.top + el.height / 2;
          const k0x = Math.abs(sx - ccx) / Math.max(1, el.width / 2);
          const k0y = Math.abs(sy - ccy) / Math.max(1, el.height / 2);
          const kx = Math.abs(ev.clientX - ccx) / Math.max(1, el.width / 2) / Math.max(0.01, k0x);
          const ky = Math.abs(ev.clientY - ccy) / Math.max(1, el.height / 2) / Math.max(0.01, k0y);
          const s0 = st.size || 100;
          onSubMove!({ size: Math.round(clamp(s0 * Math.max(kx, ky), 40, 260)) }, first);
        } else if (mode === "e" || mode === "w") {
          const nw = el.width + (mode === "e" ? dx : -dx) * 2; // 가운데는 그대로, 양쪽으로
          onSubMove!({ wrap: +clamp(nw / (box.width * 0.88), 0.3, 1).toFixed(3) }, first);
        } else onSubMove!({ x: +clamp(cx + dx / box.width, 0.05, 0.95).toFixed(4), y: +clamp(cy + dy / box.height, 0.05, 0.95).toFixed(4) }, first);
      } else if (mode === "move") {
        onVisualMove!(clip!.id, { x: +clamp(cx + dx / box.width, 0, 1).toFixed(4), y: +clamp(cy + dy / box.height, 0, 1).toFixed(4), w: +w0.toFixed(4) }, first);
      } else {
        const kx = (right ? ev.clientX - fx : fx - ev.clientX) / Math.max(1, el.width);
        const ky = (down ? ev.clientY - fy : fy - ev.clientY) / Math.max(1, el.height);
        const kk = clamp(Math.max(kx, ky), 0.1 / w0, 4 / w0);
        const nw = el.width * kk;
        const nh = el.height * kk;
        const ncx = (fx + (right ? nw / 2 : -nw / 2) - box.left) / box.width;
        const ncy = (fy + (down ? nh / 2 : -nh / 2) - box.top) / box.height;
        onVisualMove!(clip!.id, { x: +ncx.toFixed(4), y: +ncy.toFixed(4), w: +(w0 * kk).toFixed(4) }, first);
      }
      first = false;
    };
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };
  const boxFrame = (kind: "visual" | "sub") =>
    pick === kind ? (
      <>
        <span style={{ position: "absolute", inset: -3, border: "1.5px dashed #fff", outline: "1px dashed #000", pointerEvents: "none" }} />
        {kind === "visual"
          ? (["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
              <span key={c} onPointerDown={(e) => startBox("visual", c, e)} title="끌어서 크기 바꾸기 (반대쪽 모서리는 그대로)"
                style={{ position: "absolute", [c[0] === "n" ? "top" : "bottom"]: -8, [c[1] === "w" ? "left" : "right"]: -8, width: 12, height: 12, background: "#fff", border: "1.5px solid #000", cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize", touchAction: "none", pointerEvents: "auto" }} />
            ))
          : (
            <>
              {(["w", "e"] as const).map((sd) => (
                <span key={sd} onPointerDown={(e) => startBox("sub", sd, e)} title="끌어서 줄 너비 바꾸기"
                  style={{ position: "absolute", top: "50%", [sd === "w" ? "left" : "right"]: -9, width: 10, height: 26, marginTop: -13, background: "#fff", border: "1.5px solid #000", borderRadius: 3, cursor: "ew-resize", touchAction: "none", pointerEvents: "auto" }} />
              ))}
              {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
                <span key={c} onPointerDown={(e) => startBox("sub", c, e)} title="끌어서 글자 크기 바꾸기"
                  style={{ position: "absolute", [c[0] === "n" ? "top" : "bottom"]: -8, [c[1] === "w" ? "left" : "right"]: -8, width: 12, height: 12, background: "#fff", border: "1.5px solid #000", cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize", touchAction: "none", pointerEvents: "auto" }} />
              ))}
              {onSubText && clip && (
                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setEditing(`sub:${clip.id}`); }} title="메인자막 글 고치기 (두 번 눌러도 돼요)"
                  style={{ position: "absolute", right: -8, top: -38, height: 26, padding: "0 8px", display: "flex", alignItems: "center", gap: 4, borderRadius: 5, border: "1.5px solid #000", background: "#fff", color: "#111", fontSize: 12, fontWeight: 800, cursor: "pointer", pointerEvents: "auto", whiteSpace: "nowrap" }}>
                  <Icon name="pen" size={13} />글 고치기
                </button>
              )}
            </>
          )}
      </>
    ) : null;

  /** 고른 애셋 테두리 + 네 모서리 크기 손잡이 */
  const frame = (l: Layer) =>
    l.id === selLayer && onLayerMove ? (
      <>
        <span style={{ position: "absolute", inset: -3, border: "1.5px dashed #fff", outline: "1px dashed #000", pointerEvents: "none" }} />
        {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
          <span key={c} onPointerDown={(e) => startDrag(l, c, e)} title="끌어서 크기 바꾸기 (반대쪽 모서리는 그대로)"
            style={{ position: "absolute", [c[0] === "n" ? "top" : "bottom"]: -8, [c[1] === "w" ? "left" : "right"]: -8, width: 12, height: 12, background: "#fff", border: "1.5px solid #000", cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize", touchAction: "none" }} />
        ))}
      </>
    ) : null;
  const dragStyle = (l: Layer): React.CSSProperties => (onLayerMove ? { pointerEvents: "auto", cursor: "move", touchAction: "none", userSelect: "none" } : { pointerEvents: "none" });

  const flipOf = (o?: { flipX?: boolean; flipY?: boolean }) => (o?.flipX || o?.flipY ? `scale(${o.flipX ? -1 : 1}, ${o.flipY ? -1 : 1})` : undefined);
  // 클립 화면이 보이는 네모 — 직접 크기(box)면 그 자리, 아니면 채우기대로 (굽기 render.js 와 같은 계산)
  const vAr = visual && visual.width && visual.height ? visual.width / visual.height : boxW / boxH;
  const vbox = clip?.box;
  const vRect = (() => {
    if (vbox) {
      const w = vbox.w * boxW;
      const h = w / vAr;
      return { left: vbox.x * boxW - w / 2, top: vbox.y * boxH - h / 2, width: w, height: h };
    }
    let w: number;
    let h: number;
    if (vAr > boxW / boxH !== (fill === "cover")) {
      w = boxW;
      h = boxW / vAr;
    } else {
      h = boxH;
      w = boxH * vAr;
    }
    return { left: (boxW - w) / 2, top: (boxH - h) / 2, width: w, height: h };
  })();
  const mediaStyle: React.CSSProperties = vbox
    ? { position: "absolute", ...vRect, objectFit: "fill", transform: flipOf(clip || undefined) }
    : { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fill === "cover" ? "cover" : "contain", transform: flipOf(clip || undefined) };
  const blurT = `scale(${clip?.flipX ? -1.15 : 1.15}, ${clip?.flipY ? -1.15 : 1.15})`;
  const vUrl = visual?.url || "";

  return (
    <div ref={boxRef} style={{ position: "relative", width: boxW, height: boxH, background: "#000", overflow: "hidden", borderRadius: 4 }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) setPick(""); }}>
      {visual && fill === "blur" && !vbox && (visual.kind === "image" ? (
        <img src={vUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(0.8)", transform: blurT }} />
      ) : (
        <video ref={bgRef} src={vUrl} muted playsInline preload="auto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(0.8)", transform: blurT }} />
      ))}
      {visual?.kind === "image" && <img src={vUrl} alt="" style={mediaStyle} />}
      <video ref={videoRef} src={visual?.kind === "video" ? vUrl : undefined} playsInline preload="auto" style={{ ...mediaStyle, display: visual?.kind === "video" ? "block" : "none" }}
        onLoadedData={() => sync(tRef.current, true)} />
      {visual?.missing && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 14 }}>원본 파일을 찾지 못했어요</div>}
      {/* 클립 화면 고르기 — 누르면 테두리, 끌면 옮기기, 모서리로 크기 */}
      {visual && !visual.missing && onVisualMove && clip && (
        <div data-layer="__visual" onPointerDown={(e) => startBox("visual", "move", e)} title="끌어서 화면 옮기기 · 모서리로 크기"
          style={{ position: "absolute", ...vRect, cursor: "move", touchAction: "none", userSelect: "none" }}>
          {boxFrame("visual")}
        </div>
      )}
      {overImages.map((l) => {
        const a = project.assets[l.asset!];
        const op = Math.max(0.05, Math.min(1, l.opacity ?? 1));
        // 채우기 — 화면 전체에 (잘라서 / 비율 유지하며). 끌어 옮기기·크기 손잡이는 없다
        if (l.fit === "cover" || l.fit === "contain")
          return (
            <div key={l.id} data-layer={l.id} onPointerDown={(e) => { if (onLayerMove) { e.stopPropagation(); onLayerPick?.(l.id); } }} title="채우기 중 — [직접 크기]로 바꾸면 끌어 옮길 수 있어요"
              style={{ position: "absolute", inset: 0, ...(onLayerMove ? { pointerEvents: "auto" } : { pointerEvents: "none" }) }}>
              <img src={a.url} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", objectFit: l.fit, opacity: op, transform: flipOf(l), pointerEvents: "none" }} />
              {l.id === selLayer && onLayerMove && <span style={{ position: "absolute", inset: 1, border: "1.5px dashed #fff", outline: "1px dashed #000", pointerEvents: "none" }} />}
            </div>
          );
        const pw = Math.max(0.03, Math.min(1, l.w ?? 0.35)) * boxW;
        const ph = a.width && a.height ? (pw * a.height) / a.width : pw;
        // 화면 밖으로 나가지 않게 (굽기 render.js 와 같은 계산)
        const left = Math.max(0, Math.min(boxW - pw, (l.x ?? 0.5) * boxW - pw / 2));
        const top = Math.max(0, Math.min(boxH - ph, (l.y ?? 0.5) * boxH - ph / 2));
        return (
          <div key={l.id} data-layer={l.id} onPointerDown={(e) => startDrag(l, "move", e)} title="끌어서 옮기기"
            style={{ position: "absolute", left, top, width: pw, height: ph, ...dragStyle(l) }}>
            <img src={a.url} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", opacity: op, transform: flipOf(l), pointerEvents: "none" }} />
            {frame(l)}
          </div>
        );
      })}
      {overTexts.map((l) => {
        const px = Math.min(W, H) * 0.08 * ((l.size || 100) / 100) * k;
        const pos = l.pos || "top";
        const free = typeof l.x === "number" && typeof l.y === "number"; // 끌어서 옮긴 글자
        const ps: React.CSSProperties = free
          ? { left: (l.x as number) * boxW, top: (l.y as number) * boxH, transform: "translate(-50%, -50%)" }
          : { left: W * 0.05 * k, right: W * 0.05 * k, ...(pos === "top" ? { top: H * 0.06 * k } : pos === "middle" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: H * 0.07 * k }) };
        return (
          <div key={l.id} style={{ position: "absolute", textAlign: "center", ...ps, pointerEvents: "none" }}>
            {(() => {
              const look: React.CSSProperties = {
                position: "relative", display: "inline-block",
                whiteSpace: "pre", fontFamily: fontCss(l.font), fontWeight: fontWeight(l.font), fontSize: px, lineHeight: 1.25, color: l.color || "#fff",
                WebkitTextStroke: l.box ? undefined : `${Math.max(1, 4 * k * 2)}px ${String(l.color).toUpperCase() === "#111111" ? "#fff" : "#000"}`, paintOrder: "stroke fill",
                background: l.box ? rgba(l.boxColor || "#000000", l.boxOpacity ?? 0.62) : undefined, padding: l.box ? `${px * 0.12}px ${px * 0.3}px` : undefined, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
              };
              if (editing === l.id && onLayerText)
                return <InlineEdit text={String(l.text).trim()} style={look} onDone={(t) => { setEditing(""); if (t !== null && t.trim() && t.trim() !== String(l.text).trim()) onLayerText(l.id, t.trim()); }} />;
              return (
                <span data-layer={l.id} onPointerDown={(e) => startDrag(l, "move", e)} onDoubleClick={() => onLayerText && setEditing(l.id)}
                  title={onLayerText ? "끌어서 옮기기 · 두 번 누르면 글 고치기" : undefined} style={{ ...look, ...dragStyle(l) }}>
                  {String(l.text).trim()}{frame(l)}
                </span>
              );
            })()}
          </div>
        );
      })}
      {(line || (clip && editing === `sub:${clip.id}`)) && (() => {
        const look: React.CSSProperties = {
          display: "inline", whiteSpace: "pre-wrap", fontFamily: fontCss(st.font), fontWeight: fontWeight(st.font, st.bold !== false),
          fontSize: fontPx, lineHeight: 1.25, color: st.color || "#fff", WebkitTextStroke: st.bg ? undefined : `${Math.max(1, (st.outlineWidth ?? 3) * k * 2)}px ${st.outline || "#000"}`,
          paintOrder: "stroke fill", background: st.bg ? rgba(st.bgColor || "#000000", st.bgOpacity ?? 0.62) : undefined, padding: st.bg ? `${fontPx * 0.12}px ${fontPx * 0.3}px` : undefined, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
        };
        const full = clip ? (typeof clip.subText === "string" ? clip.subText : clipText(clip)) : "";
        // 줄 너비·옮긴 자리 (굽기와 같은 계산)
        const subW = boxW * 0.88 * Math.max(0.3, Math.min(1, st.wrap ?? 1));
        const free = typeof st.x === "number" && typeof st.y === "number";
        const at: React.CSSProperties = free
          ? { left: (st.x as number) * boxW, top: (st.y as number) * boxH, transform: "translate(-50%, -50%)" }
          : { left: (boxW - subW) / 2, ...posStyle };
        return (
          <div data-layer="__sub" onPointerDown={onSubMove && !(clip && editing === `sub:${clip.id}`) ? (e) => startBox("sub", "move", e) : undefined}
            style={{ position: "absolute", width: subW, textAlign: "center", ...at, pointerEvents: onSubMove ? "auto" : "none", cursor: onSubMove ? "move" : undefined, touchAction: "none" }}>
            {boxFrame("sub")}
            {clip && editing === `sub:${clip.id}` && onSubText ? (
              <InlineEdit text={full} style={look} onDone={(t) => { setEditing(""); if (t !== null && t.replace(/\s+/g, " ").trim() !== full.trim()) onSubText(clip.id, t); }} />
            ) : (
              <span onDoubleClick={() => clip && onSubText && setEditing(`sub:${clip.id}`)} title={onSubText ? "두 번 누르면 자막 고치기 (목소리는 그대로)" : undefined}
                style={{ ...look, pointerEvents: onSubText ? "auto" : "none", cursor: onSubText ? "text" : undefined }}>{line?.text}</span>
            )}
          </div>
        );
      })()}
      <audio ref={voiceRef} preload="auto" />
      {musics.map(({ l }) => <audio key={l.id} ref={(el) => { musicEls.current[l.id] = el; }} src={l.url} preload="auto" />)}
      {playing ? null : null}
    </div>
  );
});

export default Player;

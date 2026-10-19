"use client";

// 미리보기 — 굽기(render.js)와 같은 규칙으로 화면·성우·원본 소리·음악·자막을 맞춰 보여 준다 (PC 파일을 바로 재생)
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import type { Clip, Layer, Project } from "./types";
import { RATIO_SIZE, rgba } from "./types";
import { fontCss, fontWeight } from "@/lib/studio-video/fonts";
import { useFonts } from "./Pickers";
import { effLeading, effSpacing, zLayers, sfxEvents, animAt, animCss, animOf, subAnimOf, layerSpan, clipOrder, clipText, flatten, motionCss, motionOf, layerItems, layersAt, layerWindow, musicLayers, sourceTimeAt, speedOf, srcSpeed, subStyleOf, subtitleLines, subWordOf, lineWords, wordState } from "./timeline";
import { C, Icon } from "./ui";
import { transAt, transStyle } from "./transitions";
import { gradCss, patternCss, subLookCss, withAlpha } from "./SubPresets";
import { TplMotion, isMotionStyle } from "./Templates";

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
  onSubMove?: (patch: { x?: number; y?: number; wrap?: number; size?: number; rot?: number }, first: boolean) => void;
  /** 클립 화면·자막을 눌러 고르면 (오른쪽 속성 칸 열기) */
  onBoxPick?: (kind: "visual" | "sub", clipId: string) => void;
};

/** 브라우저가 낼 수 있는 재생 빠르기 (0.0625~16배) — 20배는 미리보기에서 16배로 */
const rateOk = (r: number) => Math.max(0.0625, Math.min(16, r));

/** 화면 위 글자를 그 자리에서 고치는 칸 — 엔터: 줄바꿈, Ctrl+엔터·바깥 누르기: 저장, Esc: 취소 */
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
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          finish(ref.current?.innerText ?? null);
        } else if (e.key === "Enter") {
          e.preventDefault();
          document.execCommand("insertLineBreak");
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
  const otherRef = useRef<HTMLVideoElement>(null); // 화면전환 상대 클립의 멈춘 장면
  const voiceRef = useRef<HTMLAudioElement>(null);
  // 클립 경계 검은 화면 막기 (2026-10-18) — 화면 파일이 바뀌는 순간 앞 장면을 그림으로 떠서 덮어 두고, 새 화면이 뜨면 걷는다
  const imgRef = useRef<HTMLImageElement>(null);
  const holdRef = useRef<HTMLCanvasElement>(null);
  const [hold, setHold] = useState<React.CSSProperties | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHold(null);
  };
  const musicEls = useRef<Record<string, HTMLAudioElement | null>>({});
  const [t, setT] = useState(0);
  const lastFrame = useRef(0);
  const sfxPrev = useRef(-1); // 효과음 — 지난번 확인한 시각 (그 사이에 있는 소리를 낸다)
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(0);
  const playRef = useRef(false);
  const clock = useRef({ t0: 0, base: 0 });
  const curClip = useRef<string>("");
  const lastReport = useRef(0);

  const sfxList = useMemo(() => sfxEvents(project, flat.items), [project, flat]); // 애니메이션 효과음 (굽기와 같은 목록)
  const itemAt = (time: number) => flat.items.find((x) => time >= x.start && time < x.start + x.dur) || flat.items[flat.items.length - 1];
  const item = itemAt(t);
  const clip = item?.clip;
  const local = item ? Math.max(0, t - item.start) : 0;

  const visualOf = (c?: Clip) => {
    if (!c) return null;
    if (project.settings.off?.visual) return null; // 화면 레이어 끔
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
        // 클립보다 짧으면 처음부터 다시 (반복) — 마지막 장면에 멈추면 끝에서 튕겨 보였다 (2026-10-18 사장님)
        target = vis.duration && s + loc >= vis.duration - 0.05 ? (s + loc) % Math.max(0.1, vis.duration - 0.05) : s + loc;
      }
      // 클립이 바뀌어도 원본에서 바로 이어지면(지금 위치 ≈ 갈 위치) 다시 찾아가지 않는다 — 찾아가면 소리가 잠깐 끊겨 "씹힌다" (2026-10-18)
      if (Math.abs(v.currentTime - target) > (force ? 0.12 : 0.3)) {
        try {
          v.currentTime = target;
        } catch {}
      }
      const st = project.settings;
      // 원래 촬영 화면이면 원본 소리, 첨부한 영상이면 그 영상 소리를 올렸을 때만 (기본 무음)
      // 넣은 영상 소리 — [원본 소리] 칩·썸네일 메뉴의 값만 (목소리 칩 볼륨과는 따로)
      const vv = Math.max(0, Math.min(2, c.visualVolume || 0));
      v.muted = sameSource ? Boolean(c.muted) || Boolean(project.settings.off?.source) : vv <= 0;
      v.volume = sameSource ? Math.max(0, Math.min(1, (st.sourceVolume ?? 1) * (c.volume ?? 1))) : Math.min(1, vv);
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
      if (c.type === "voice" && c.voice?.url && !c.muted && !project.settings.off?.voice) {
        const sp = speedOf(c, project.settings);
        const target = loc * sp;
        a.playbackRate = rateOk(sp * previewRate);
        a.volume = Math.max(0, Math.min(1, (project.settings.voice?.volume ?? 1) * (c.volume ?? 1)));
        if (force || Math.abs(a.currentTime - target) > 0.3) {
          try {
            a.currentTime = Math.min(target, Math.max(0, (c.voice.duration || 0) - 0.01));
          } catch {}
        }
        if (playRef.current && target < (c.voice.duration || 0)) {
          if (a.paused) a.play().catch(() => {});
        } else a.pause();
      } else if (c.type !== "voice" && c.src && !sameSource && project.assets[c.src.asset]?.hasAudio && !c.muted && !project.settings.off?.source) {
        a.volume = Math.max(0, Math.min(1, (project.settings.sourceVolume ?? 1) * (c.volume ?? 1)));
        a.playbackRate = rateOk(previewRate * srcSpeed(c));
        const target = sourceTimeAt(c, loc);
        if (Math.abs(a.currentTime - target) > (force ? 0.12 : 0.3)) {
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

  /** 지금 보이는 화면을 그림으로 떠서 덮기 — 새 화면이 뜨면(seeked·playing·load) 걷는다. 늦어도 1.2초 뒤엔 걷는다 */
  const grabFrame = (el: HTMLVideoElement | HTMLImageElement | null) => {
    const cv = holdRef.current;
    if (!el || !cv) return;
    const w = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
    const h = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
    if (!w || !h) return;
    try {
      cv.width = w;
      cv.height = h;
      cv.getContext("2d")!.drawImage(el, 0, 0, w, h);
    } catch {
      return;
    }
    // 원래 화면과 같은 자리·크기·채우기로 덮는다
    const cs = getComputedStyle(el);
    setHold({ position: "absolute", left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight, objectFit: cs.objectFit as React.CSSProperties["objectFit"], transform: cs.transform !== "none" ? cs.transform : undefined });
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setHold(null), 1200);
  };

  const tick = () => {
    if (!playRef.current) return;
    const now = performance.now();
    let time = clock.current.base + ((now - clock.current.t0) / 1000) * previewRate;
    if (time >= flat.total) {
      time = flat.total;
      stop();
    }
    // 효과음 — 지난 프레임과 지금 사이에 있는 것 (멀리 건너뛰면 내지 않는다)
    if (sfxPrev.current >= 0 && time - sfxPrev.current < 0.5)
      for (const e of sfxList) if (e.t > sfxPrev.current - 0.001 && e.t <= time) {
        try {
          const au = new Audio(`/studio-sfx/${e.name}.mp3`);
          au.volume = Math.min(1, e.vol);
          void au.play().catch(() => {});
        } catch {}
      }
    sfxPrev.current = time;
    tRef.current = time;
    const it = itemAt(time);
    const changed = it && it.clip.id !== curClip.current;
    if (changed && it) {
      const prev = flat.items.find((x) => x.clip.id === curClip.current);
      const a = prev ? visualOf(prev.clip) : null;
      const bVis = visualOf(it.clip);
      if (a && bVis && a.id !== bVis.id) grabFrame(a.kind === "video" ? videoRef.current : imgRef.current);
    }
    if (it) curClip.current = it.clip.id;
    sync(time, Boolean(changed));
    syncMusic(time, false);
    // 화면은 1초에 30번쯤 (애니메이션·사진 움직임이 부드럽게), 편집기에 알리기는 지금처럼 띄엄띄엄
    if (now - lastFrame.current > 30 || changed) {
      lastFrame.current = now;
      setT(time);
    }
    if (now - lastReport.current > 90 || changed) {
      lastReport.current = now;
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
    sfxPrev.current = v - 0.02; // 옮긴 자리 바로 그 시각의 효과음도 (효과 미리 보기)
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
  const st = subStyleOf(project.settings, clip);
  const lines = clip && item ? subtitleLines(clip, item.dur, project.settings, W, H) : [];
  const line = lines.find((l) => local >= l.s && local < l.e + 0.001) || null;
  const fontPx = Math.min(W, H) * 0.062 * ((st.size || 100) / 100) * k;
  const posStyle: React.CSSProperties =
    st.position === "top" ? { top: H * 0.08 * k } : st.position === "middle-high" ? { top: H * 0.24 * k } : st.position === "middle" ? { top: "50%", transform: "translateY(-50%)" } : st.position === "middle-low" ? { bottom: H * 0.24 * k } : { bottom: H * 0.07 * k };

  // 쓰인 글꼴을 받아 둔다 (처음 한 번)
  useFonts([project.settings.subtitle.font, ...project.scenes.flatMap((sc) => sc.clips.map((c) => c.subStyle?.font)), ...(project.layers || []).filter((l) => l.type === "text").map((l) => l.font)]);
  // 지금 클립에 걸린 사진·화면 글자 애셋 (굽기와 같은 자리·크기)
  // 단어 구간 레이어는 그 단어를 말하는 동안만
  const over = clip ? layersAt(project, clip.id, order).filter((l) => {
    if (l.off) return false;
    const w = layerWindow(l, clip, project.settings);
    return !w || (local >= w.s && local < w.e + 0.001);
  }) : [];
  // 애니메이션 (등장·퇴장·강조·확대) — 굽기와 같은 계산 (timeline.animAt)
  const lookOf = (l: Layer): React.CSSProperties | undefined => {
    const a0 = animOf(project, l);
    if (!a0 || !clip) return undefined;
    // 멈춰 있을 때는 다 나온 모습 — 클립을 누르면 그 클립 처음(등장 직전)으로 가서 스티커·사진이 안 보이던 것 (2026-10-19)
    const an = playing ? a0 : { ...a0, in: undefined, out: undefined };
    const sp = layerSpan(project, l, flat.items, clip.id, project.settings, order);
    return sp ? animCss(animAt(an, local, sp.a, sp.b), boxW, boxH) : undefined;
  };
  const overImages = over.filter((l) => l.type === "image" && l.asset && project.assets[l.asset]?.kind === "image");
  const overTexts = over.filter((l) => l.type === "text" && String(l.text || "").trim());
  // 겹치는 순서 (뒤 → 앞) — 스티커·사진·화면 글자 함께. 굽기와 같다 (timeline.zLayers)
  const overZ = zLayers(project, over).filter((l) => overImages.includes(l) || overTexts.includes(l));

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
    // 클립 화면 — 아직 직접 크기가 없으면 채우기대로 보이는 실제 그림 자리에서 시작 (잘라서 채우기면 화면보다 큰 그림)
    //  (2026-10-19 사장님: 잘라서 채우기 하고 끌면 그림이 줄어 한쪽이 검게 비었다)
    const r0 = kind === "visual" && !clip?.box ? vRect : null;
    const cx = r0 ? (r0.left + r0.width / 2) / boxW : (el.left + el.width / 2 - box.left) / box.width;
    const cy = r0 ? (r0.top + r0.height / 2) / boxH : (el.top + el.height / 2 - box.top) / box.height;
    const w0 = r0 ? r0.width / boxW : el.width / box.width;
    // 화면을 다 덮는 그림이면 옮겨도 빈 곳이 생기지 않게 (가장자리가 화면 밖에 머물도록) — 작은 그림은 자유롭게
    const h0 = (w0 * boxW) / vAr / boxH;
    const panX = (x: number) => (w0 >= 0.999 ? clamp(x, 1 - w0 / 2, w0 / 2) : clamp(x, 0, 1));
    const panY = (y: number) => (h0 >= 0.999 ? clamp(y, 1 - h0 / 2, h0 / 2) : clamp(y, 0, 1));
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
        onVisualMove!(clip!.id, { x: +panX(cx + dx / box.width).toFixed(4), y: +panY(cy + dy / box.height).toFixed(4), w: +w0.toFixed(4) }, first);
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
  /**
   * 회전 손잡이 (포토샵처럼 위 가운데 동그라미) — 끌어서 돌리기, Shift = 15도씩, 0·90·180·270 근처는 딱 붙는다
   *  돌리면 자리를 가운데 기준(x·y)으로 바꿔 둔다 (굽기와 같은 축으로 돌게)
   */
  const startRotate = (e: React.PointerEvent, rot0: number, apply: (patch: { rot: number; x?: number; y?: number }, first: boolean) => void, needXY: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-rot]")?.getBoundingClientRect();
    const box = boxRef.current?.getBoundingClientRect();
    if (!el || !box) return;
    const cx = el.left + el.width / 2, cy = el.top + el.height / 2;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
    const xy = needXY ? { x: +((cx - box.left) / box.width).toFixed(4), y: +((cy - box.top) / box.height).toFixed(4) } : {};
    let first = true;
    const move = (ev: PointerEvent) => {
      let r = rot0 + ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180) / Math.PI;
      r = ((r % 360) + 540) % 360 - 180; // -180 ~ 180
      if (ev.shiftKey) r = Math.round(r / 15) * 15;
      else { const k = Math.round(r / 90) * 90; if (Math.abs(r - k) < 3) r = k; }
      apply({ rot: +r.toFixed(1), ...xy }, first);
      first = false;
    };
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };
  // 회전 손잡이 — 오른쪽 아래 바깥에 파란 동그라미 + 돌리는 화살표 (2026-10-19 사장님: 위가 아니라 오른쪽 아래)
  const rotHandle = (onDown: (e: React.PointerEvent) => void) => (
    <span onPointerDown={onDown} title="끌어서 돌리기 (Shift = 15도씩)"
      style={{ position: "absolute", right: -34, bottom: -34, width: 24, height: 24, borderRadius: "50%", background: "#2563EB", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.5)", cursor: "grab", touchAction: "none", pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
        <path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v5h-5" />
      </svg>
    </span>
  );
  const boxFrame = (kind: "visual" | "sub") =>
    pick === kind ? (
      <>
        <span style={{ position: "absolute", inset: -3, border: "1.5px dashed #fff", outline: "1px dashed #000", pointerEvents: "none" }} />
        {kind === "sub" && onSubMove && rotHandle((e) => startRotate(e, Number(st.rot) || 0, (pt, first) => onSubMove(pt, first), !(typeof st.x === "number" && typeof st.y === "number")))}
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
              {/* [글 고치기] 단추는 없앰 (사장님 2026-10-17) — 자막을 두 번 누르면 고친다 */}
            </>
          )}
      </>
    ) : null;

  /** 고른 애셋 테두리 + 네 모서리 크기 손잡이 */
  const frame = (l: Layer) =>
    l.id === selLayer && onLayerMove ? (
      <>
        <span style={{ position: "absolute", inset: -3, border: "1.5px dashed #fff", outline: "1px dashed #000", pointerEvents: "none" }} />
        {rotHandle((e) => startRotate(e, Number(l.rot) || 0, (pt, first) => onLayerMove!(l.id, pt, first), l.type === "text" && !(typeof l.x === "number" && typeof l.y === "number")))}
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

  // 화면전환 — 지금 클립 화면(main)과 상대 클립의 멈춘 장면(other)을 효과대로 섞는다 (굽기 render.js 와 같은 규칙)
  const tr = transAt(flat.items, t);
  const trLook = tr ? transStyle(tr.type, tr.p) : null;
  const other = tr ? (tr.live === "from" ? tr.to : tr.from) : null;
  const otherVis = other ? visualOf(other.clip) : null;
  const otherT = (() => {
    if (!other || !otherVis || otherVis.kind !== "video") return 0;
    const c = other.clip;
    const loc = tr!.live === "from" ? 0 : Math.max(0, other.dur - 0.04); // 뒤 클립은 첫 장면, 앞 클립은 마지막 장면
    if (c.type !== "voice" && c.src && otherVis.id === c.src.asset) return sourceTimeAt(c, loc);
    const s = Number(c.visual?.s) || 0;
    return otherVis.duration ? Math.min(s + loc, Math.max(0, otherVis.duration - 0.05)) : s + loc;
  })();
  useEffect(() => {
    const v = otherRef.current;
    if (!v || !otherVis || otherVis.kind !== "video") return;
    try {
      if (Math.abs(v.currentTime - otherT) > 0.05) v.currentTime = otherT;
    } catch {}
  }, [otherVis?.url, otherT]); // eslint-disable-line react-hooks/exhaustive-deps
  const mainZ = trLook ? (tr!.live === "to" ? 2 : 1) : undefined;
  const otherFit = other ? other.clip.fill || project.settings.fill : "contain";
  const otherMedia: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: otherFit === "cover" ? "cover" : "contain", transform: flipOf(other?.clip) };

  /** 화면 글자 하나 그리기 — 겹치는 순서대로 사진·스티커 사이에 끼워 그린다 (회의 3-26) */
  const textEl = (l: Layer) => {
    const px = Math.min(W, H) * 0.08 * ((l.size || 100) / 100) * k;
    const pos = l.pos || "top";
    const free = typeof l.x === "number" && typeof l.y === "number"; // 끌어서 옮긴 글자
    const ps: React.CSSProperties = free
      ? { left: (l.x as number) * boxW, top: (l.y as number) * boxH, transform: `translate(-50%, -50%)${l.rot ? ` rotate(${l.rot}deg)` : ""}` }
      : { left: W * 0.05 * k, right: W * 0.05 * k, ...(pos === "top" ? { top: H * 0.06 * k } : pos === "middle" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: H * 0.07 * k }) };
    return (
      <div key={l.id} style={{ position: "absolute", textAlign: l.align || "center", ...ps, pointerEvents: "none" }}>
        {(() => {
          const look: React.CSSProperties = {
            position: "relative", display: "inline-block",
            whiteSpace: "pre", fontFamily: fontCss(l.font), fontWeight: fontWeight(l.font, l.bold !== false), fontSize: px, lineHeight: 1.25, color: withAlpha(l.color || "#FFFFFF", l.textAlpha ?? 0),
            ...patternCss(l),
            letterSpacing: `${effSpacing(l) * px}px`,
            // 테두리·그림자·빛 — 메인자막과 같은 규칙 (없으면 예전대로 테두리 4, 검정/흰색 자동)
            ...subLookCss({ bg: l.box, outline: l.outline || (String(l.color).toUpperCase() === "#111111" ? "#fff" : "#000"), outlineWidth: l.outlineWidth ?? 4, shadow: l.shadow, shadowColor: l.shadowColor, glow: l.glow }, px, k), paintOrder: "stroke fill",
            background: l.box ? rgba(l.boxColor || "#000000", l.boxOpacity ?? 0.62) : undefined, padding: l.box ? `${px * 0.12 * (l.bgPad ?? 1)}px ${px * 0.3 * (l.bgPad ?? 1)}px` : undefined, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
          };
          if (editing === l.id && onLayerText)
            return <InlineEdit text={String(l.text).trim()} style={look} onDone={(t) => { setEditing(""); if (t !== null && t.trim() && t.trim() !== String(l.text).trim()) onLayerText(l.id, t.trim()); }} />;
          return (
            <span style={{ display: "inline-block", ...lookOf(l) }}>
              <span data-layer={l.id} data-rot="" onPointerDown={(e) => startDrag(l, "move", e)} onDoubleClick={() => onLayerText && setEditing(l.id)}
                title={onLayerText ? "끌어서 옮기기 · 두 번 누르면 글 고치기" : undefined} style={{ ...look, ...dragStyle(l) }}>
                {String(l.text).trim()}{frame(l)}
              </span>
            </span>
          );
        })()}
      </div>
    );
  };
  return (
    <div ref={boxRef} style={{ position: "relative", width: boxW, height: boxH, background: "#000", overflow: "hidden", borderRadius: 4 }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) setPick(""); }}>
      {/* 지금 클립 화면 — 화면전환 중이면 효과대로 움직인다 */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: mainZ, ...(trLook ? (tr!.live === "from" ? trLook.from : trLook.to) : {}) }}>
        {visual?.kind === "image" ? (
          // 사진 움직임 — 채운 화면 통째로 (굽기 render.js zoompan 과 같은 계산)
          <div style={{ position: "absolute", inset: 0, transform: motionCss(clip ? motionOf(project, clip) : null, item ? (t - item.start) / Math.max(0.01, item.dur) : 0), transformOrigin: "50% 50%" }}>
            {fill === "blur" && !vbox && <img src={vUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(0.8)", transform: blurT }} />}
            <img ref={imgRef} src={vUrl} alt="" style={mediaStyle} onLoad={releaseHold} />
          </div>
        ) : visual && fill === "blur" && !vbox && (
          <video ref={bgRef} src={vUrl} muted playsInline preload="auto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(0.8)", transform: blurT }} />
        )}
        <video ref={videoRef} src={visual?.kind === "video" ? vUrl : undefined} playsInline preload="auto" style={{ ...mediaStyle, display: visual?.kind === "video" ? "block" : "none" }}
          onLoadedData={() => sync(tRef.current, true)} onSeeked={() => hold && releaseHold()} onPlaying={() => hold && releaseHold()} />
        {/* 앞 장면 붙잡기 — 새 화면 파일이 뜰 때까지 (검은 화면 대신) */}
        <canvas ref={holdRef} style={{ ...(hold || {}), display: hold ? "block" : "none", pointerEvents: "none" }} />
      </div>
      {/* 다음 클립 화면·목소리 미리 열기 — 경계에서 바로 뜨게 (보이지 않음) */}
      {(() => {
        const i = item ? flat.items.indexOf(item) : -1;
        const nx = i >= 0 ? flat.items[i + 1] : undefined;
        if (!nx) return null;
        const nv = visualOf(nx.clip);
        const voiceUrl = nx.clip.type === "voice" ? nx.clip.voice?.url : "";
        return (
          <div style={{ display: "none" }} aria-hidden>
            {nv && nv.id !== visual?.id && (nv.kind === "video" ? <video src={nv.url} preload="auto" muted /> : <img src={nv.url} alt="" />)}
            {voiceUrl && <audio src={voiceUrl} preload="auto" />}
          </div>
        );
      })()}
      {/* 화면전환 상대 — 뒤 클립 첫 장면 / 앞 클립 마지막 장면 (멈춘 채) */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: trLook ? (mainZ === 2 ? 1 : 2) : undefined, pointerEvents: "none", display: trLook && otherVis ? "block" : "none", background: "#000", ...(trLook ? (tr!.live === "from" ? trLook.to : trLook.from) : {}) }}>
        {otherVis?.kind === "image" && (
          <div style={{ position: "absolute", inset: 0, transform: motionCss(other ? motionOf(project, other.clip) : null, tr?.live === "from" ? 0 : 1), transformOrigin: "50% 50%" }}>
            <img src={otherVis.url} alt="" style={otherMedia} />
          </div>
        )}
        <video ref={otherRef} src={otherVis?.kind === "video" ? otherVis.url : undefined} muted playsInline preload="auto" style={{ ...otherMedia, display: otherVis?.kind === "video" ? "block" : "none" }} />
      </div>
      {trLook?.veil && <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", ...trLook.veil }} />}
      {visual?.missing && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 14 }}>원본 파일을 찾지 못했어요</div>}
      {/* 클립 화면 고르기 — 누르면 테두리, 끌면 옮기기, 모서리로 크기 */}
      {visual && !visual.missing && onVisualMove && clip && (
        <div data-layer="__visual" onPointerDown={(e) => startBox("visual", "move", e)} title="끌어서 화면 옮기기 · 모서리로 크기"
          style={{ position: "absolute", ...vRect, cursor: "move", touchAction: "none", userSelect: "none" }}>
          {boxFrame("visual")}
        </div>
      )}
      {overZ.map((l) => {
        if (l.type === "text") return textEl(l);
        const a = project.assets[l.asset!];
        const op = Math.max(0.05, Math.min(1, l.opacity ?? 1));
        // 채우기 — 화면 전체에 (잘라서 / 비율 유지하며). 끌어 옮기기·크기 손잡이는 없다
        if (l.fit === "cover" || l.fit === "contain")
          return (
            <div key={l.id} data-layer={l.id} onPointerDown={(e) => { if (onLayerMove) { e.stopPropagation(); onLayerPick?.(l.id); } }} title="채우기 중 — [직접 크기]로 바꾸면 끌어 옮길 수 있어요"
              style={{ position: "absolute", inset: 0, ...(onLayerMove ? { pointerEvents: "auto" } : { pointerEvents: "none" }) }}>
              <div style={{ width: "100%", height: "100%", ...lookOf(l) }}>
                <img src={a.url} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", objectFit: l.fit, opacity: op, transform: flipOf(l), pointerEvents: "none" }} />
              </div>
              {l.id === selLayer && onLayerMove && <span style={{ position: "absolute", inset: 1, border: "1.5px dashed #fff", outline: "1px dashed #000", pointerEvents: "none" }} />}
            </div>
          );
        const pw = Math.max(0.03, Math.min(1, l.w ?? 0.35)) * boxW;
        const ph = a.width && a.height ? (pw * a.height) / a.width : pw;
        // 화면 밖으로 나가지 않게 (굽기 render.js 와 같은 계산)
        const left = Math.max(0, Math.min(boxW - pw, (l.x ?? 0.5) * boxW - pw / 2));
        const top = Math.max(0, Math.min(boxH - ph, (l.y ?? 0.5) * boxH - ph / 2));
        return (
          <div key={l.id} data-layer={l.id} data-rot="" onPointerDown={(e) => startDrag(l, "move", e)} title="끌어서 옮기기"
            style={{ position: "absolute", left, top, width: pw, height: ph, ...dragStyle(l), transform: l.rot ? `rotate(${l.rot}deg)` : undefined }}>
            <div style={{ width: "100%", height: "100%", ...lookOf(l) }}>
              {l.stk && isMotionStyle(l.stk.style) ? (() => {
                // 움직이는 템플릿 — 나타난 뒤 지난 시간으로 칸마다 그린다 (굽기 AnimBake 와 같은 그림)
                const sp = clip ? layerSpan(project, l, flat.items, clip.id, project.settings, order) : null;
                return <TplMotion style={l.stk!.style} text={l.stk!.text} color={l.stk!.color} t={Math.max(0, local - (sp?.a ?? 0))} opacity={op} flip={flipOf(l)} />;
              })() : <img src={a.url} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", opacity: op, transform: flipOf(l), pointerEvents: "none" }} />}
            </div>
            {frame(l)}
          </div>
        );
      })}
      {(line || (clip && editing === `sub:${clip.id}`)) && (() => {
        const look: React.CSSProperties = {
          // 직접 쓴 자막에 엔터를 넣었으면 그 줄 그대로 (글자 수로 다시 나누지 않음 — 굽기와 같게)
          // 줄은 편집기가 나눈 그대로 — 미리보기가 따로 접지 않는다 (굽기와 같게, 2026-10-19)
          display: "inline", whiteSpace: "pre", fontFamily: fontCss(st.font), fontWeight: fontWeight(st.font, st.bold !== false),
          fontSize: fontPx, lineHeight: effLeading(st), letterSpacing: `${effSpacing(st) * fontPx}px`, color: withAlpha(st.color || "#FFFFFF", st.textAlpha ?? 0), ...subLookCss(st, fontPx, k), ...patternCss(st),
          paintOrder: "stroke fill", background: st.bg ? rgba(st.bgColor || "#000000", st.bgOpacity ?? 0.62) : undefined, padding: st.bg ? `${fontPx * 0.12 * (st.bgPad ?? 1)}px ${fontPx * 0.3 * (st.bgPad ?? 1)}px` : undefined, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
        };
        // 예능 자막 — 이중 테두리·그라데이션 (굽기 render.js fancySub 와 같은 모양)
        const o2 = !st.bg && Number(st.outline2Width) > 0 ? Number(st.outline2Width) : 0;
        const grad = !st.bg && st.gradTo ? st.gradTo : "";
        const fancy = Boolean(o2 || grad);
        const ow0 = Number(st.outlineWidth ?? 3);
        const lc = subLookCss(st, fontPx, k);
        // 아래 층들: [바깥 테두리(안쪽+바깥 두께) + 그림자·빛] → [안쪽 테두리] · 맨 위: 글자만 (테두리 없음 — 자막 엔진처럼 테두리는 글자 바깥으로만)
        const oc = withAlpha(st.outline || "#000000", st.outlineAlpha ?? 0);
        const unders: React.CSSProperties[] = !fancy ? [] : [
          ...(o2 ? [{ color: "transparent", WebkitTextStroke: `${Math.max(1, (ow0 + o2) * k * 2)}px ${st.outline2 || "#FFFFFF"}`, textShadow: lc.textShadow } as React.CSSProperties] : []),
          { color: "transparent", WebkitTextStroke: ow0 > 0 ? `${Math.max(1, ow0 * k * 2)}px ${oc}` : undefined, textShadow: o2 ? undefined : lc.textShadow },
        ];
        const mainCss: React.CSSProperties = fancy ? { textShadow: undefined, WebkitTextStroke: undefined, ...(grad ? { color: "transparent", backgroundImage: gradCss({ ...st, gradTo: grad }), WebkitBackgroundClip: "text", backgroundClip: "text" } : {}) } : {};
        const full = clip ? (typeof clip.subText === "string" ? clip.subText : clipText(clip)) : "";
        // 줄 너비·옮긴 자리 (굽기와 같은 계산)
        const subW = boxW * 0.88 * Math.max(0.3, Math.min(1, st.wrap ?? 1));
        const free = typeof st.x === "number" && typeof st.y === "number";
        const at: React.CSSProperties = free
          ? { left: (st.x as number) * boxW, top: (st.y as number) * boxH, transform: `translate(-50%, -50%)${st.rot ? ` rotate(${st.rot}deg)` : ""}` }
          : { left: (boxW - subW) / 2, ...posStyle };
        return (
          <div data-layer="__sub" data-rot="" onPointerDown={onSubMove && !(clip && editing === `sub:${clip.id}`) ? (e) => startBox("sub", "move", e) : undefined}
            // 글자 크기·줄 간격을 바깥 칸에도 — 안 그러면 바깥 기본 줄 높이(작은 글자 1.5배)가 줄 간격을 막아 좁혀도 안 좁아진다 (2026-10-19)
            style={{ position: "absolute", width: subW, textAlign: st.align || "center", fontSize: fontPx, lineHeight: effLeading(st), ...at, pointerEvents: onSubMove ? "auto" : "none", cursor: onSubMove ? "move" : undefined, touchAction: "none" }}>
            {boxFrame("sub")}
            {clip && editing === `sub:${clip.id}` && onSubText ? (
              <InlineEdit text={full} style={look} onDone={(t) => { setEditing(""); const tidy = (x: string) => x.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n"); if (t !== null && tidy(t) !== tidy(full)) onSubText(clip.id, t); }} />
            ) : ((() => { const body = (under: React.CSSProperties | null) => (
              <span style={(() => {
                // 메인자막 애니메이션 — 지금 보이는 자막 조각(line.s~line.e)마다 나타나고 사라진다
                const sa0 = clip && line ? subAnimOf(project, clip) : null;
                const wf0 = clip && line ? subWordOf(project, clip) : null;
                // 한 줄씩 + [인] — 인 효과는 줄마다 (아래), 덩어리에는 아웃·반복만
                const sa = sa0 && wf0?.show === "line" && sa0.in ? { ...sa0, in: undefined } : sa0;
                const lk = sa && line ? animCss(animAt(playing ? sa : { ...sa, in: undefined, out: undefined }, local, line.s, line.e), boxW, boxH) : undefined;
                return lk ? { display: "inline-block", ...lk } : undefined;
              })()}>
              <span onDoubleClick={under ? undefined : () => clip && onSubText && setEditing(`sub:${clip.id}`)} title={onSubText && !under ? "두 번 누르면 자막 고치기 — 엔터: 줄바꿈, Ctrl+엔터·바깥 누르기: 저장 (목소리는 그대로)" : undefined}
                style={{ ...look, ...(under || mainCss), pointerEvents: onSubText && !under ? "auto" : "none", cursor: onSubText ? "text" : undefined }}>{(() => {
                  // 단어별 효과 (쇼츠식) — 말하는 때에 맞춰 한 단어씩 · 지금 단어 강조 (굽기 render.js 와 같은 계산)
                  const wfx = clip && line ? subWordOf(project, clip) : null;
                  if (!wfx || !clip || !line) return line?.text;
                  const ws = lineWords(clip, lines, project.settings, wfx)[lines.indexOf(line)] || [];
                  const sa0 = subAnimOf(project, clip);
                  const lineIn = wfx.show === "line" && sa0?.in ? { in: sa0.in, dur: sa0.dur } : null;
                  let wi = 0;
                  // 줄마다 (한 줄씩 + [인] 이면 그 줄이 나오는 때에 따로 들어온다)
                  return line.text.split("\n").map((ln, li) => {
                    const first = ws[wi];
                    const words = ln.split(/(\s+)/).map((part, j) => {
                      if (!part.trim()) return part;
                      const w = ws[wi++];
                      if (!w) return part;
                      const stt = wordState(wfx, w, local);
                      const col = stt.cur && wfx.hl !== "big", big = stt.cur && wfx.hl !== "color";
                      // 멈춰 있을 때는 모두 보이게 (지금 단어 강조만)
                      return <span key={j} style={{ opacity: playing ? stt.a : 1, color: col ? wfx.color : undefined, fontSize: big ? "1.18em" : undefined }}>{part}</span>;
                    });
                    const lk2 = lineIn && playing && first ? animCss(animAt(lineIn as Parameters<typeof animAt>[0], local, first.ls ?? first.s, 1e6), boxW, boxH) : undefined;
                    return (
                      <React.Fragment key={li}>
                        {li > 0 && "\n"}
                        {lk2 ? <span style={{ display: "inline-block", ...lk2 }}>{words}</span> : words}
                      </React.Fragment>
                    );
                  });
                })()}</span>
              </span>
            );
            // 예능 자막이면 아래 한 벌(바깥 테두리·그림자·빛) 위에 글자 한 벌을 겹친다
            return fancy ? (
              <>
                {unders.map((u, i) => <div key={i} aria-hidden style={{ position: "absolute", left: 0, top: 0, width: "100%", pointerEvents: "none" }}>{body(u)}</div>)}
                <span style={{ position: "relative" }}>{body(null)}</span>
              </>
            ) : body(null);
            })())}
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

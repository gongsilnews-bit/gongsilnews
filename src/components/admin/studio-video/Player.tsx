"use client";

// 미리보기 — 굽기(render.js)와 같은 규칙으로 화면·성우·원본 소리·음악·자막을 맞춰 보여 준다 (PC 파일을 바로 재생)
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import type { Clip, Project } from "./types";
import { RATIO_SIZE } from "./types";
import { flatten, sourceTimeAt, speedOf, subtitleLines } from "./timeline";
import { C } from "./ui";

export type PlayerHandle = { play: () => void; pause: () => void; toggle: () => void; seek: (t: number) => void; time: () => number; playing: () => boolean };

type Props = { project: Project; width: number; onTime?: (t: number) => void; onPlaying?: (p: boolean) => void; previewRate?: number };

const Player = forwardRef<PlayerHandle, Props>(function Player({ project, width, onTime, onPlaying, previewRate = 1 }, ref) {
  const [W, H] = RATIO_SIZE[project.ratio] || RATIO_SIZE["16:9"];
  const boxW = width;
  const boxH = Math.round((width * H) / W);
  const k = boxW / W;
  const flat = useMemo(() => flatten(project), [project]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLVideoElement>(null);
  const voiceRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
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
      v.playbackRate = previewRate;
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
        a.playbackRate = sp * previewRate;
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

  // 음악
  useEffect(() => {
    const m = musicRef.current;
    if (!m) return;
    const mu = project.settings.music;
    m.volume = Math.max(0, Math.min(1, mu?.volume ?? 0.15));
    if (!mu?.on || !mu.url) m.pause();
  }, [project.settings.music]);

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
    const m = musicRef.current;
    const mu = project.settings.music;
    if (m && mu?.on && mu.url) {
      try {
        m.currentTime = tRef.current % Math.max(1, m.duration || 1e9);
      } catch {}
      m.play().catch(() => {});
    }
    setTimeout(() => sync(tRef.current, true), 0);
    requestAnimationFrame(tick);
  };
  const stop = () => {
    playRef.current = false;
    setPlaying(false);
    onPlaying?.(false);
    videoRef.current?.pause();
    bgRef.current?.pause();
    voiceRef.current?.pause();
    musicRef.current?.pause();
  };
  const seek = (time: number) => {
    const v = Math.max(0, Math.min(flat.total, time));
    tRef.current = v;
    clock.current = { t0: performance.now(), base: v };
    setT(v);
    onTime?.(v);
    const it = itemAt(v);
    curClip.current = it?.clip.id || "";
    setTimeout(() => sync(v, true), 0);
    const m = musicRef.current;
    if (m && playRef.current) {
      try {
        m.currentTime = v % Math.max(1, m.duration || 1e9);
      } catch {}
    }
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

  const mediaStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fill === "cover" ? "cover" : "contain" };
  const vUrl = visual?.url || "";

  return (
    <div style={{ position: "relative", width: boxW, height: boxH, background: "#000", overflow: "hidden", borderRadius: 4 }}>
      {visual && fill === "blur" && (visual.kind === "image" ? (
        <img src={vUrl} alt="" style={{ ...mediaStyle, objectFit: "cover", filter: "blur(18px) brightness(0.8)", transform: "scale(1.15)" }} />
      ) : (
        <video ref={bgRef} src={vUrl} muted playsInline preload="auto" style={{ ...mediaStyle, objectFit: "cover", filter: "blur(18px) brightness(0.8)", transform: "scale(1.15)" }} />
      ))}
      {visual?.kind === "image" && <img src={vUrl} alt="" style={mediaStyle} />}
      <video ref={videoRef} src={visual?.kind === "video" ? vUrl : undefined} playsInline preload="auto" style={{ ...mediaStyle, display: visual?.kind === "video" ? "block" : "none" }}
        onLoadedData={() => sync(tRef.current, true)} />
      {visual?.missing && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 14 }}>원본 파일을 찾지 못했어요</div>}
      {line && (
        <div style={{ position: "absolute", left: W * 0.06 * k, right: W * 0.06 * k, textAlign: "center", ...posStyle, pointerEvents: "none" }}>
          <span style={{
            display: "inline", whiteSpace: "pre-wrap", fontFamily: `'${st.font || "Malgun Gothic"}', 'Malgun Gothic', sans-serif`, fontWeight: st.bold === false ? 400 : 700,
            fontSize: fontPx, lineHeight: 1.25, color: st.color || "#fff", WebkitTextStroke: st.bg ? undefined : `${Math.max(1, (st.outlineWidth ?? 3) * k * 2)}px ${st.outline || "#000"}`,
            paintOrder: "stroke fill", background: st.bg ? "rgba(0,0,0,0.62)" : undefined, padding: st.bg ? `${fontPx * 0.12}px ${fontPx * 0.3}px` : undefined, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
          }}>{line.text}</span>
        </div>
      )}
      <audio ref={voiceRef} preload="auto" />
      <audio ref={musicRef} src={project.settings.music?.on ? project.settings.music.url : undefined} loop preload="auto" />
      {playing ? null : null}
    </div>
  );
});

export default Player;

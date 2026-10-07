"use client";

// 영상 구간 정하기 창 (브루 "비디오 시작점 변경"과 같은 방식):
// 큰 화면 + 아래 필름 띠, 구간 상자를 끌어 옮기고 양 끝을 당겨 길이를 바꾼다. ▶ 는 고른 구간을 실제 속도로 재생.
import { useCallback, useEffect, useRef, useState } from "react";
import { videoTiming } from "@/lib/reels/template";
import type { SceneVideo } from "@/lib/reels/types";
import st from "./reels.module.css";

const FRAMES = 24;
const MIN = 0.3;
const t2 = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// 필름 띠: 숨은 영상으로 일정 간격 장면을 캡처 (저장소가 교차 출처 허용이라 canvas 로 그릴 수 있다)
function useFilmstrip(url: string, dur: number) {
  const [frames, setFrames] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.preload = "auto";
    v.src = url;
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 90;
    const g = c.getContext("2d");
    const seek = (t: number) => new Promise<void>((res) => {
      const done = () => { v.removeEventListener("seeked", done); res(); };
      v.addEventListener("seeked", done);
      v.currentTime = t;
    });
    v.addEventListener("loadeddata", async () => {
      const out: string[] = [];
      for (let k = 0; k < FRAMES && alive; k++) {
        await seek(Math.min(dur - 0.05, ((k + 0.5) * dur) / FRAMES));
        try {
          const r = Math.max(v.videoWidth / 160, v.videoHeight / 90);
          const w = v.videoWidth / r, h = v.videoHeight / r;
          g?.clearRect(0, 0, 160, 90);
          g?.drawImage(v, (160 - w) / 2, (90 - h) / 2, w, h);
          out.push(c.toDataURL("image/jpeg", 0.6));
        } catch {
          return; // 캡처가 막히면 필름 띠 없이 쓴다
        }
        if (alive) setFrames([...out]);
      }
    }, { once: true });
    return () => {
      alive = false;
      v.removeAttribute("src");
      v.load();
    };
  }, [url, dur]);
  return frames;
}

export default function VideoTrimmer({ url, poster, dur, video, clipSec, onApply, onClose }: {
  url: string;
  poster: string | null;
  dur: number;
  video: SceneVideo;
  clipSec: number;      // 이 클립이 화면에 나오는 길이
  onApply: (v: SceneVideo) => void;
  onClose: () => void;
}) {
  const [initial] = useState(() => ({ from: Math.min(video.from, dur), to: Math.min(Math.max(video.to, video.from + MIN), dur) }));
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [cur, setCur] = useState(initial.from);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const frames = useFilmstrip(url, dur);
  const timing = videoTiming({ src: "", poster: null, dur, from, to, speed: video.speed ?? "auto", sound: "off", fit: "cover", hasAudio: false }, Math.max(0.5, clipSec));
  const shownSrc = Math.min(to - from, clipSec * timing.rate); // 실제로 화면에 쓰이는 원본 길이

  const seek = useCallback((t: number) => {
    const v = player.current;
    if (v) v.currentTime = Math.max(0, Math.min(dur, t));
    setCur(t);
  }, [dur]);

  // 재생: 고른 구간만, 완성 영상과 같은 속도로
  const toggle = () => {
    const v = player.current;
    if (!v) return;
    if (playing) return v.pause();
    if (v.currentTime < from || v.currentTime >= from + shownSrc - 0.05) v.currentTime = from;
    v.playbackRate = Math.min(4, timing.rate); // 브라우저는 4배 넘게는 소리 없이도 끊겨서 미리보기는 4배까지
    v.play().catch(() => {});
  };
  useEffect(() => {
    const v = player.current;
    if (!v) return;
    const tick = () => {
      setCur(v.currentTime);
      if (v.currentTime >= from + shownSrc) {
        v.pause();
        v.currentTime = from;
      }
    };
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    v.addEventListener("timeupdate", tick);
    v.addEventListener("play", on);
    v.addEventListener("pause", off);
    return () => {
      v.removeEventListener("timeupdate", tick);
      v.removeEventListener("play", on);
      v.removeEventListener("pause", off);
    };
  }, [from, shownSrc]);

  // 필름 띠 끌기: 상자 가운데 = 옮기기, 양 끝 = 길이 바꾸기, 빈 곳 클릭 = 그 자리 보기
  const drag = (mode: "move" | "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    player.current?.pause();
    const r = strip.current!.getBoundingClientRect();
    const x0 = e.clientX;
    const f0 = from, t0 = to;
    const onMove = (ev: PointerEvent) => {
      const d = ((ev.clientX - x0) / r.width) * dur;
      if (mode === "move") {
        const len = t0 - f0;
        const nf = Math.max(0, Math.min(dur - len, f0 + d));
        setFrom(nf);
        setTo(nf + len);
        seek(nf);
      } else if (mode === "start") {
        const nf = Math.max(0, Math.min(t0 - MIN, f0 + d));
        setFrom(nf);
        seek(nf);
      } else {
        const nt = Math.min(dur, Math.max(f0 + MIN, t0 + d));
        setTo(nt);
        seek(nt);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const clickStrip = (e: React.MouseEvent) => {
    const r = strip.current!.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * dur);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const pct = (x: number) => `${(x / dur) * 100}%`;
  const r1 = (x: number) => Math.round(x * 10) / 10;

  return (
    <div className={st.trimBack} onClick={onClose}>
      <div className={st.trim} onClick={(e) => e.stopPropagation()}>
        <div className={st.trimHead}>
          <b>영상 구간 정하기</b>
          <button className={st.trimX} onClick={onClose} title="닫기 (Esc)">✕</button>
        </div>
        <div className={st.trimView}>
          <video ref={player} src={url} poster={poster || undefined} playsInline preload="auto" onLoadedMetadata={() => seek(from)} />
        </div>

        <div className={st.trimStrip} ref={strip} onClick={clickStrip}>
          <div className={st.trimFrames}>
            {(frames.length ? frames : Array.from({ length: FRAMES }, () => poster || "")).map((f, k) => (
              <span key={k} style={f ? { backgroundImage: `url(${f})` } : undefined} />
            ))}
          </div>
          <i className={st.trimShade} style={{ left: 0, width: pct(from) }} />
          <i className={st.trimShade} style={{ left: pct(to), right: 0 }} />
          <div className={st.trimBox} style={{ left: pct(from), width: pct(to - from) }} onPointerDown={drag("move")} onClick={(e) => e.stopPropagation()}>
            <em>{r1(to - from)}초</em>
            {shownSrc < to - from - 0.05 && <i className={st.trimUsed} style={{ width: `${(shownSrc / (to - from)) * 100}%` }} />}
            <b className={st.trimEdgeL} onPointerDown={drag("start")} />
            <b className={st.trimEdgeR} onPointerDown={drag("end")} />
          </div>
          <i className={st.trimHeadline} style={{ left: pct(cur) }} />
          <small className={st.trimLabel} style={{ left: pct(from) }}>{t2(from)}</small>
          <small className={st.trimLabel} style={{ left: pct(to) }}>{t2(to)}</small>
        </div>

        <div className={st.trimInfo}>
          <span className={st.trimTime}>{t2(cur)} / {t2(dur)}</span>
          <span>
            구간 {r1(to - from)}초 → 화면에 {r1(clipSec)}초 · 속도 {timing.rate}배{video.speed === "auto" || !video.speed ? " (자동 맞춤)" : ""}
            {shownSrc < to - from - 0.05 && <b> · ⚠ 앞 {r1(shownSrc)}초만 나와요 (진한 부분)</b>}
          </span>
        </div>

        <div className={st.trimFoot}>
          <span className={st.small}>상자를 끌어 옮기고, 양 끝을 당겨 길이를 바꿔요. 빈 곳을 누르면 그 장면을 봅니다.</span>
          <button className={st.trimPlay} onClick={toggle} title="고른 구간 재생">{playing ? "⏸" : "▶"}</button>
          <div className={st.trimBtns}>
            <button className={st.btn} onClick={() => { setFrom(initial.from); setTo(initial.to); seek(initial.from); }}>↺ 되돌리기</button>
            <button className={`${st.btn} ${st.primary}`} onClick={() => { onApply({ ...video, from: r1(from), to: r1(to) }); onClose(); }}>✓ 적용</button>
          </div>
        </div>
      </div>
    </div>
  );
}

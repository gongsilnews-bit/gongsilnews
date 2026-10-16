"use client";

// 비디오 시작점 변경 — 브루처럼 필름 띠 위의 파란 창(클립 길이만큼)을 끌어 영상의 어느 부분을 쓸지 고른다.
// 고르지 않으면 처음(0초)부터 나간다
import React from "react";
import type { Asset } from "./types";
import { fmtTime } from "./types";
import { Btn, C, Icon, Modal } from "./ui";

const FRAMES = 10;

export default function VideoStart({ asset, dur, start, onApply, onClose }: { asset: Asset; dur: number; start: number; onApply: (s: number) => void; onClose: () => void }) {
  const D = Math.max(0.1, asset.duration || 0);
  const span = Math.min(dur, D); // 파란 창 길이
  const maxS = Math.max(0, D - span);
  const clampS = (v: number) => Math.max(0, Math.min(maxS, v));
  const [s, setS] = React.useState(clampS(start || 0));
  const [playing, setPlaying] = React.useState(false);
  const [head, setHead] = React.useState(s); // 재생 위치
  const mainRef = React.useRef<HTMLVideoElement>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);
  const canvases = React.useRef<(HTMLCanvasElement | null)[]>([]);

  // 필름 띠 — 숨은 영상으로 차례로 찾아가 그린다
  React.useEffect(() => {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.src = asset.url;
    let i = 0;
    let dead = false;
    const next = () => {
      if (dead || i >= FRAMES) return;
      v.currentTime = Math.min(D - 0.05, ((i + 0.5) * D) / FRAMES);
    };
    const onSeek = () => {
      const cv = canvases.current[i];
      if (cv) {
        const ctx = cv.getContext("2d");
        try {
          ctx?.drawImage(v, 0, 0, cv.width, cv.height);
        } catch {}
      }
      i++;
      next();
    };
    v.addEventListener("seeked", onSeek);
    v.addEventListener("loadeddata", next, { once: true });
    return () => {
      dead = true;
      v.removeEventListener("seeked", onSeek);
      v.src = "";
    };
  }, [asset.url, D]);

  // 큰 화면은 고른 시작점에
  const seekMain = (t: number) => {
    const v = mainRef.current;
    if (v) {
      try {
        v.currentTime = t;
      } catch {}
    }
    setHead(t);
  };
  React.useEffect(() => {
    if (!playing) seekMain(s);
  }, [s, playing]);

  // 재생 — 고른 구간만 듣고 보기
  React.useEffect(() => {
    const v = mainRef.current;
    if (!v || !playing) return;
    let raf = 0;
    v.currentTime = s;
    v.play().catch(() => setPlaying(false));
    const tick = () => {
      setHead(v.currentTime);
      if (v.currentTime >= s + span - 0.03 || v.ended) {
        v.pause();
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      v.pause();
    };
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // 파란 창 끌기 · 띠의 다른 곳을 누르면 거기로
  const drag = (e: React.PointerEvent, inside: boolean) => {
    const box = stripRef.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    setPlaying(false);
    const x0 = e.clientX;
    const s0 = inside ? s : clampS(((e.clientX - box.left) / box.width) * D - span / 2);
    if (!inside) setS(s0);
    const move = (ev: PointerEvent) => setS(clampS(s0 + ((ev.clientX - x0) / box.width) * D));
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const pct = (t: number) => `${(t / D) * 100}%`;
  return (
    <Modal title="비디오 시작점 변경" onClose={onClose} width={1000}
      footer={
        <>
          <span style={{ flex: 1, fontSize: 13, color: C.dim }}>{D < dur ? "영상이 클립보다 짧아서 끝나면 처음부터 다시 나와요." : "파란 창을 끌어 쓸 부분을 고르세요. 고르지 않으면 처음부터 나가요."}</span>
          <Btn onClick={() => setS(0)} disabled={s === 0}><Icon name="undo" size={16} />되돌리기</Btn>
          <Btn primary onClick={() => { onApply(+s.toFixed(2)); onClose(); }}><Icon name="check" size={16} />적용</Btn>
        </>
      }>
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{ width: "100%", aspectRatio: "16 / 8", background: "#000", borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
          <video ref={mainRef} src={asset.url} muted={false} playsInline preload="auto" onLoadedData={() => seekMain(s)}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        </div>

        {/* 필름 띠 */}
        <div ref={stripRef} onPointerDown={(e) => drag(e, false)}
          style={{ position: "relative", height: 76, borderRadius: 8, overflow: "hidden", background: "#111", display: "flex", cursor: "pointer", userSelect: "none", touchAction: "none" }}>
          {Array.from({ length: FRAMES }, (_, i) => (
            <canvas key={i} ref={(el) => { canvases.current[i] = el; }} width={160} height={90} style={{ flex: 1, minWidth: 0, height: "100%", objectFit: "cover", display: "block", opacity: 0.55 }} />
          ))}
          {/* 고른 구간 */}
          <div onPointerDown={(e) => { e.stopPropagation(); drag(e, true); }} title="끌어서 시작점 바꾸기"
            style={{ position: "absolute", top: 0, bottom: 0, left: pct(s), width: pct(span), border: `3px solid ${C.accent}`, borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)", cursor: "grab", boxSizing: "border-box" }}>
            <span style={{ position: "absolute", right: 4, top: 4, padding: "1px 6px", borderRadius: 4, background: C.accent, color: "#fff", fontSize: 11.5, fontWeight: 800 }}>{fmtTime(span, false)}</span>
          </div>
          {/* 재생 위치 */}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: pct(head), width: 3, marginLeft: -1, background: "#f97316", pointerEvents: "none" }} />
        </div>
        <div style={{ position: "relative", height: 20, fontSize: 12.5, color: C.accent, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ position: "absolute", left: pct(s), top: 4 }}>{fmtTime(s, false)}</span>
          <span style={{ position: "absolute", left: pct(s + span), top: 4, transform: "translateX(-100%)" }}>{fmtTime(s + span, false)}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 }}>
          <button type="button" onClick={() => setPlaying((v) => !v)} title={playing ? "멈추기" : "고른 부분 재생"}
            style={{ width: 46, height: 46, borderRadius: "50%", border: 0, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name={playing ? "pause" : "play"} size={22} />
          </button>
          <span style={{ padding: "4px 10px", borderRadius: 5, background: C.card, fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>{fmtTime(head, false)} / {fmtTime(D, false)}</span>
        </div>
      </div>
    </Modal>
  );
}

"use client";

// 비디오 시작점 변경 — 브루처럼 필름 띠 위의 파란 창(클립 길이만큼)을 끌어 영상의 어느 부분을 쓸지 고른다.
// 고르지 않으면 처음(0초)부터 나간다
import React from "react";
import type { Asset } from "./types";
import { fmtTime } from "./types";
import { Btn, C, Icon, Modal } from "./ui";

const FRAMES = 10;
const BARS = 320; // 소리 파형 막대 수

// trim(녹화·촬영 영상 클립): 프리미어·캡컷처럼 파란 창 양쪽 끝을 끌어 앞뒤를 자른다 (end = 끝 시각). 가운데를 끌면 통째로 옮긴다
const MIN = 0.3; // 가장 짧은 길이
export default function VideoStart({ asset, dur, start, end, trim, onApply, onClose }: { asset: Asset; dur: number; start: number; end?: number; trim?: boolean; onApply: (s: number, e: number) => void; onClose: () => void }) {
  const D = Math.max(0.1, asset.duration || 0);
  const [s, setS] = React.useState(() => Math.max(0, Math.min(D - MIN, start || 0)));
  const [e, setE] = React.useState(() => Math.max(s + MIN, Math.min(D, end ?? (start || 0) + Math.min(dur, D))));
  const span = trim ? e - s : Math.min(dur, D); // 파란 창 길이
  const maxS = Math.max(0, D - span);
  const clampS = (v: number) => Math.max(0, Math.min(maxS, v));
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

  // 소리 파형 — 영상 소리를 읽어 막대 BARS 개의 크기(0~1)로. 재생 중 레벨 막대도 이 값으로
  const [peaks, setPeaks] = React.useState<number[] | null>(null);
  const [waveMsg, setWaveMsg] = React.useState("소리를 읽는 중…");
  const waveRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (asset.hasAudio === false) return setWaveMsg("소리 없는 영상이에요");
    if (D > 20 * 60) return setWaveMsg("영상이 길어서 소리 파형은 생략했어요");
    let dead = false;
    (async () => {
      try {
        const buf = await (await fetch(asset.url)).arrayBuffer();
        const audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(buf);
        const chs = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
        const per = Math.max(1, Math.floor(audio.length / BARS));
        const out: number[] = [];
        for (let b = 0; b < BARS; b++) {
          let m = 0;
          for (const ch of chs) for (let i = b * per, end = Math.min(ch.length, i + per); i < end; i += 4) m = Math.max(m, Math.abs(ch[i]));
          out.push(Math.min(1, m));
        }
        if (!dead) setPeaks(out);
      } catch {
        if (!dead) setWaveMsg("소리 파형을 읽지 못했어요");
      }
    })();
    return () => {
      dead = true;
    };
  }, [asset.url, asset.hasAudio, D]);
  React.useEffect(() => {
    const cv = waveRef.current;
    const g = cv?.getContext("2d");
    if (!cv || !g || !peaks) return;
    g.clearRect(0, 0, cv.width, cv.height);
    const w = cv.width / peaks.length;
    peaks.forEach((p, i) => {
      const h = Math.max(1, p * (cv.height - 4));
      g.fillStyle = p > 0.9 ? "#ef4444" : p > 0.7 ? "#facc15" : "#22c55e";
      g.fillRect(i * w + 0.5, (cv.height - h) / 2, Math.max(1, w - 1), h);
    });
  }, [peaks]);
  const level = playing && peaks ? peaks[Math.min(peaks.length - 1, Math.max(0, Math.floor((head / D) * peaks.length)))] : 0;

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

  // 시작점을 옮기면 (trim 은 길이 그대로) 끝도 같이
  const moveTo = (ns: number) => {
    setS(ns);
    if (trim) setE(ns + span);
  };
  // 파란 창 끌기 · 띠의 다른 곳을 누르면 거기로 · (trim) 양쪽 끝 손잡이로 앞뒤 자르기
  const drag = (ev0: React.PointerEvent, inside: boolean | "left" | "right") => {
    const box = stripRef.current?.getBoundingClientRect();
    if (!box) return;
    ev0.preventDefault();
    setPlaying(false);
    const x0 = ev0.clientX;
    const dt = (ev: PointerEvent) => ((ev.clientX - x0) / box.width) * D;
    if (inside === "left" || inside === "right") {
      const s0 = s, e0 = e;
      const move = (ev: PointerEvent) => {
        if (inside === "left") setS(Math.max(0, Math.min(e0 - MIN, s0 + dt(ev))));
        else setE(Math.min(D, Math.max(s0 + MIN, e0 + dt(ev))));
      };
      const up = () => window.removeEventListener("pointermove", move);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
      return;
    }
    const s0 = inside ? s : clampS(((ev0.clientX - box.left) / box.width) * D - span / 2);
    if (!inside) moveTo(s0);
    const move = (ev: PointerEvent) => moveTo(clampS(s0 + dt(ev)));
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const pct = (t: number) => `${(t / D) * 100}%`;
  const s1 = Math.max(0, Math.min(D - MIN, start || 0));
  const e1 = Math.max(s1 + MIN, Math.min(D, end ?? s1 + Math.min(dur, D)));
  const changed = trim ? Math.abs(s - s1) > 0.005 || Math.abs(e - e1) > 0.005 : s !== 0;
  const grip = (side: "left" | "right"): React.CSSProperties => ({ position: "absolute", top: 0, bottom: 0, [side]: -3, width: 14, background: C.accent, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: side === "left" ? "8px 0 0 8px" : "0 8px 8px 0" });
  return (
    <Modal title={trim ? "시작·끝 자르기" : "비디오 시작점 변경"} onClose={onClose} width={1000}
      footer={
        <>
          <span style={{ flex: 1, fontSize: 13, color: C.dim }}>{trim ? "파란 창 양쪽 끝을 끌어 앞뒤를 잘라요. 가운데를 끌면 구간이 통째로 옮겨져요." : D < dur ? `영상이 클립보다 ${fmtTime(dur - D, false)} 짧아요. 남는 시간은 마지막 장면으로 채워요.` : "파란 창을 끌어 쓸 부분을 고르세요. 고르지 않으면 처음부터 나가요."}</span>
          <Btn onClick={() => { if (trim) { setS(s1); setE(e1); } else setS(0); }} disabled={!changed}><Icon name="undo" size={16} />되돌리기</Btn>
          <Btn primary onClick={() => { onApply(+s.toFixed(2), +(trim ? e : s + span).toFixed(2)); onClose(); }}><Icon name="check" size={16} />적용</Btn>
        </>
      }>
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{ width: "100%", aspectRatio: "16 / 8", background: "#000", borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
          <video ref={mainRef} src={asset.url} muted={false} playsInline preload="auto" onLoadedData={() => seekMain(s)}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        </div>

        {/* 필름 띠 */}
        <div ref={stripRef} onPointerDown={(e) => drag(e, false)}
          style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#111", cursor: "pointer", userSelect: "none", touchAction: "none" }}>
          <div style={{ height: 76, display: "flex" }}>
            {Array.from({ length: FRAMES }, (_, i) => (
              <canvas key={i} ref={(el) => { canvases.current[i] = el; }} width={160} height={90} style={{ flex: 1, minWidth: 0, height: "100%", objectFit: "cover", display: "block", opacity: 0.55 }} />
            ))}
          </div>
          {/* 소리 파형 — 말소리가 있는 곳을 보고 앞뒤를 자를 수 있게 */}
          <div style={{ height: 46, borderTop: "1px solid #222", background: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {peaks ? <canvas ref={waveRef} width={1200} height={46} style={{ width: "100%", height: "100%", display: "block" }} /> : <span style={{ fontSize: 12.5, color: C.dim }}>{waveMsg}</span>}
          </div>
          {/* 고른 구간 */}
          <div onPointerDown={(ev) => { ev.stopPropagation(); drag(ev, true); }} title={trim ? "끌어서 구간 옮기기" : "끌어서 시작점 바꾸기"}
            style={{ position: "absolute", top: 0, bottom: 0, left: pct(s), width: pct(span), border: `3px solid ${C.accent}`, borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)", cursor: "grab", boxSizing: "border-box" }}>
            <span style={{ position: "absolute", right: trim ? 16 : 4, top: 4, padding: "1px 6px", borderRadius: 4, background: C.accent, color: "#fff", fontSize: 11.5, fontWeight: 800 }}>{fmtTime(span, false)}</span>
            {trim && (["left", "right"] as const).map((side) => (
              <div key={side} onPointerDown={(ev) => { ev.stopPropagation(); drag(ev, side); }} title={side === "left" ? "끌어서 앞 자르기" : "끌어서 뒤 자르기"} style={grip(side)}>
                <span style={{ width: 2, height: 22, borderRadius: 1, background: "#fff" }} />
              </div>
            ))}
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
          {peaks && (
            <span title="소리 크기 (재생할 때 움직여요)" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.sub }}>
              <Icon name="volume" size={16} />
              <span style={{ position: "relative", width: 140, height: 8, borderRadius: 4, background: C.card, overflow: "hidden" }}>
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(level * 100)}%`, background: level > 0.9 ? "#ef4444" : level > 0.7 ? "#facc15" : "#22c55e", transition: "width 80ms linear" }} />
              </span>
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}

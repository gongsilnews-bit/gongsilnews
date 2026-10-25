"use client";

// 비디오 시작점 변경 — 브루처럼 필름 띠 위의 파란 창(클립 길이만큼)을 끌어 영상의 어느 부분을 쓸지 고른다.
// 고르지 않으면 처음(0초)부터 나간다
import React from "react";
import type { Asset } from "./types";
import { DRAG_MEDIA, fmtTime } from "./types";
import { Btn, C, Icon, Modal } from "./ui";

const FRAMES = 10;

/**
 * 끌어서 클립에 넣기 (2026-10-25 사장님) — 끄는 동안 창을 비켜(투명·통과) 뒤 클립 목록에 놓을 수 있게.
 * 놓으면(받은 곳이 있으면) 창을 닫는다
 */
function dragOutProps(data: () => string, onDone: () => void) {
  let undo: (() => void) | null = null;
  return {
    draggable: true,
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), // 파란 창 옮기기·창 옮기기와 겹치지 않게
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      e.stopPropagation();
      e.dataTransfer.setData(DRAG_MEDIA, data());
      e.dataTransfer.effectAllowed = "copy";
      const box = e.currentTarget.closest("[data-gsv-modal]") as HTMLElement | null;
      const back = box?.parentElement || null;
      // 끌기가 시작된 뒤에 비킨다 (바로 바꾸면 끌기가 취소된다)
      window.setTimeout(() => {
        if (!box || !back) return;
        const was = { bp: back.style.pointerEvents, bg: back.style.background, xp: box.style.pointerEvents, xo: box.style.opacity };
        back.style.pointerEvents = "none";
        back.style.background = "transparent";
        box.style.pointerEvents = "none";
        box.style.opacity = "0.2";
        undo = () => { back.style.pointerEvents = was.bp; back.style.background = was.bg; box.style.pointerEvents = was.xp; box.style.opacity = was.xo; };
      }, 0);
    },
    onDragEnd: (e: React.DragEvent<HTMLElement>) => {
      undo?.();
      undo = null;
      if (e.dataTransfer.dropEffect !== "none") onDone();
    },
  };
}
const BARS = 320; // 소리 파형 막대 수

// trim(녹화·촬영 영상 클립): 프리미어·캡컷처럼 파란 창 양쪽 끝을 끌어 앞뒤를 자른다 (end = 끝 시각). 가운데를 끌면 통째로 옮긴다
const MIN = 0.3; // 가장 짧은 길이
const chip = (on: boolean): React.CSSProperties => ({ height: 28, padding: "0 10px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : "transparent", color: on ? "#fff" : C.sub, fontSize: 12.5, fontWeight: 700, cursor: "pointer" });
export default function VideoStart({ asset, dur, start, end, trim, need, chain, lead, place, onApply, onClose }: { asset: Asset; dur: number; start: number; end?: number; trim?: boolean; /** 채워야 할 길이(문장 길이) — 있으면 쓰는 길이와 견줘 알려 준다 (목소리 클립에 넣은 영상, 2026-10-21) */ need?: number;
  /** 이어 붙이기 (2026-10-21 사장님) — 이 영상을 뒤 클립들에 쭉 이어서. next: 바로 뒤 클립들(길이), count: 지금 이어진 수 */
  chain?: { self: string; next: { id: string; label: string; dur: number }[]; count: number; /** 앞쪽 빈칸 클립 — 가까운 것부터 (2026-10-21 사장님: 앞 빈칸도 함께) */ prev?: { id: string; label: string; dur: number }[] };
  /** 앞 클립 영상이 모자라 끝이 멈추는 길이 — 켜면 이 영상을 그만큼 앞당겨 앞 클립 끝을 채운다 (컷편집처럼, 2026-10-21 사장님) */
  lead?: { label: string; gap: number; on: boolean };
  /** 자료 고르기에서 두 번 눌러 연 것 (2026-10-25 사장님) — [적용] 대신 고른 구간을 클립으로 넣는 단추. 소리 파일은 [음악 넣기] 하나 */
  place?: { canReplace: boolean; onPlace: (s: number, e: number, action: "replace" | "insert") => void; /** 끌어서 클립에 놓을 때 실어 보낼 것 (고른 구간) — 없으면 끌기 없음 */ drag?: (s: number, e: number) => string };
  onApply: (s: number, e: number, chainN?: number, prevN?: number, lead?: number) => void; onClose: () => void }) {
  const D = Math.max(0.1, asset.duration || 0);
  const audioOnly = asset.kind === "audio"; // 음악 — 화면 자리에 이름, 소리 파형을 크게
  const still = asset.kind === "image"; // 사진 — 같은 창에서 0초부터 끝 손잡이로 보여 줄 시간만 (2026-10-25 사장님)
  const [s, setS] = React.useState(() => Math.max(0, Math.min(D - MIN, start || 0)));
  const [e, setE] = React.useState(() => Math.max(s + MIN, Math.min(D, end ?? (start || 0) + Math.min(dur, D))));
  const [n, setN] = React.useState(chain?.count || 0); // 뒤 클립 몇 개까지 이어 붙일지
  const [m, setM] = React.useState(0); // 앞쪽 빈칸 클립 몇 개부터 함께
  const [useLead, setUseLead] = React.useState(Boolean(lead && (lead.on || lead.gap > 0.05))); // 앞 클립 모자란 끝 채우기 (있으면 기본 켬)
  const L0 = useLead && lead ? lead.gap : 0;
  const before = (chain?.prev || []).slice(0, m).reverse(); // 앞 → 뒤 차례
  const segLabels = chain ? [...(L0 ? [lead!.label] : []), ...before.map((x) => x.label), chain.self, ...chain.next.slice(0, n).map((x) => x.label)] : [];
  const segs = (n > 0 || m > 0 || L0 > 0) && chain ? [...(L0 ? [L0] : []), ...before.map((x) => x.dur), need ?? dur, ...chain.next.slice(0, n).map((x) => x.dur)] : []; // 클립마다 길이
  const total = segs.reduce((t, x) => t + x, 0);
  const span = n > 0 ? Math.min(total, D) : trim ? e - s : Math.min(dur, D); // 파란 창 길이 (이어 붙이면 클립 합계)
  const chained = n > 0 || m > 0 || L0 > 0;
  const maxS = Math.max(0, D - span);
  const clampS = (v: number) => Math.max(0, Math.min(maxS, v));
  const [playing, setPlaying] = React.useState(false);
  const [head, setHead] = React.useState(s); // 재생 위치
  const mainRef = React.useRef<HTMLVideoElement>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);
  const canvases = React.useRef<(HTMLCanvasElement | null)[]>([]);
  // 확대 (2026-10-25 사장님) — 긴 영상도 1~2초 단위로 맞추게. 띠를 늘려 옆으로 넘겨 본다 (Ctrl+휠 · −/+)
  const [zoom, setZoom] = React.useState(1);
  const zoomRef = React.useRef(1);
  zoomRef.current = zoom;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const maxZoom = Math.max(1, Math.min(60, D / 5)); // 화면에 5초까지
  const zoomAt = (nz: number, clientX?: number) => {
    const sc = scrollRef.current;
    const z0 = zoomRef.current;
    const z = Math.max(1, Math.min(maxZoom, nz));
    if (!sc || z === z0) return setZoom(z);
    const box = sc.getBoundingClientRect();
    const x = clientX !== undefined ? clientX - box.left : box.width / 2;
    const frac = (sc.scrollLeft + x) / (box.width * z0); // 마우스(없으면 가운데) 밑 시각을 그 자리에
    setZoom(z);
    requestAnimationFrame(() => { sc.scrollLeft = frac * box.width * z - x; });
  };
  React.useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const wheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      zoomAt(zoomRef.current * (ev.deltaY < 0 ? 1.25 : 0.8), ev.clientX);
    };
    sc.addEventListener("wheel", wheel, { passive: false });
    return () => sc.removeEventListener("wheel", wheel);
  }); // 매번 다시 건다 (zoomAt 이 새로 만들어지므로)

  // 붙여 띄운 창은 Esc 로 닫는다 (글 쓰는 칸에 있을 때는 그대로)
  React.useEffect(() => {
    if (!place) return;
    const k = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (ev.key === "Escape" && !t?.closest?.("input, textarea, [contenteditable]")) onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [place, onClose]);

  // 필름 띠 — 숨은 영상으로 차례로 찾아가 그린다
  React.useEffect(() => {
    if (audioOnly) return;
    if (still) {
      const im = new Image();
      im.onload = () => canvases.current.forEach((cv) => { try { cv?.getContext("2d")?.drawImage(im, 0, 0, cv.width, cv.height); } catch {} });
      im.src = asset.url;
      return;
    }
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
  }, [asset.url, D, audioOnly, still]);

  // 소리 파형 — 영상 소리를 읽어 막대 BARS 개의 크기(0~1)로. 재생 중 레벨 막대도 이 값으로
  const [peaks, setPeaks] = React.useState<number[] | null>(null);
  const [waveMsg, setWaveMsg] = React.useState("소리를 읽는 중…");
  const waveRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (still) return;
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
  // 확대해서 재생하면 빨간 선이 화면 밖으로 나가지 않게 따라 넘긴다
  React.useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || zoom === 1 || !playing) return;
    const x = (head / D) * sc.scrollWidth;
    if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 20) sc.scrollLeft = x - sc.clientWidth * 0.1;
  }, [head, playing, zoom, D]);
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
    if (still && playing) {
      let raf = 0;
      const h0 = head >= s && head < s + span - 0.1 ? head : s;
      const t0 = performance.now();
      const tick = () => {
        const t = h0 + (performance.now() - t0) / 1000;
        setHead(Math.min(t, s + span));
        if (t >= s + span) return setPlaying(false);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    const v = mainRef.current;
    if (!v || !playing) return;
    let raf = 0;
    v.currentTime = head >= s && head < s + span - 0.1 ? head : s;
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
        else {
          const ne = Math.min(D, Math.max(s0 + MIN, e0 + dt(ev)));
          setE(ne);
          seekMain(Math.max(0, ne - 0.04)); // 끝 손잡이 — 큰 화면은 끝 장면
        }
      };
      const up = () => window.removeEventListener("pointermove", move);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
      return;
    }
    // 자르기 — 파란 창 밖 띠를 누르면 그 자리로 재생 위치만 옮긴다 (구간은 그대로)
    if ((trim && !chained && !inside) || still) return scrub(ev0);
    const s0 = inside ? s : clampS(((ev0.clientX - box.left) / box.width) * D - span / 2);
    if (!inside) moveTo(s0);
    const move = (ev: PointerEvent) => moveTo(clampS(s0 + dt(ev)));
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  /** 재생 위치 옮기기 — 눈금 막대(또는 띠)를 누르고 끌면, 큰 화면이 그 장면으로 */
  function scrub(ev0: React.PointerEvent) {
    const box = stripRef.current?.getBoundingClientRect();
    if (!box) return;
    ev0.preventDefault();
    setPlaying(false);
    const at = (x: number) => seekMain(Math.max(0, Math.min(D - 0.04, ((x - box.left) / box.width) * D)));
    at(ev0.clientX);
    const move = (ev: PointerEvent) => at(ev.clientX);
    const up = () => window.removeEventListener("pointermove", move);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }
  // 눈금 간격 — 영상 길이에 맞게 (10칸 안팎)
  const tick = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600].find((x) => D / zoom / x <= 12) || 600; // 확대하면 보이는 길이에 맞게
  const pct = (t: number) => `${(t / D) * 100}%`;
  const s1 = Math.max(0, Math.min(D - MIN, start || 0));
  const e1 = Math.max(s1 + MIN, Math.min(D, end ?? s1 + Math.min(dur, D)));
  const changed = trim ? Math.abs(s - s1) > 0.005 || Math.abs(e - e1) > 0.005 : s !== 0;
  const grip = (side: "left" | "right"): React.CSSProperties => ({ position: "absolute", top: 0, bottom: 0, [side]: -3, width: 14, background: C.accent, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: side === "left" ? "8px 0 0 8px" : "0 8px 8px 0" });
  return (
    <Modal title={place ? `${still ? "사진 보여 줄 시간" : audioOnly ? "음악 쓸 부분 고르기" : "영상 쓸 부분 고르기"} · ${asset.name}` : trim ? "시작·끝 자르기" : "비디오 시작점 변경"} onClose={onClose} width={place ? 640 : 1000} dock={place ? { right: 60, top: 190 } : undefined}
      footer={
        <>
          <span style={{ flex: 1, fontSize: 13, ...(place ? { display: "none" } : {}), color: chained ? (total > D + 0.05 ? "#facc15" : C.dim) : trim && need && Math.abs(e - s - need) > 0.05 ? "#facc15" : C.dim }}>{chained ? `영상 하나를 ${n + m + 1}개 클립에 쭉 이어서 · 클립 합계 ${total.toFixed(1)}초${total > D + 0.05 ? ` — 영상이 ${(total - D).toFixed(1)}초 모자라요, 마지막은 끝 장면에서 멈춰요` : " · 파란 창을 끌어 시작점을 골라요"}` : trim && need ? `쓰는 길이 ${(e - s).toFixed(1)}초 · 문장 ${need.toFixed(1)}초 — ${e - s < need - 0.05 ? `남는 ${(need - (e - s)).toFixed(1)}초는 끝 장면에서 멈춰요` : e - s > need + 0.05 ? "문장 길이까지만 나가요" : "딱 맞아요"}` : trim ? "파란 창 양쪽 끝을 끌어 앞뒤를 잘라요. 가운데를 끌면 구간이 통째로 옮겨져요. 위 눈금을 누르면 그 장면을 봐요." : D < dur ? `영상이 클립보다 ${fmtTime(dur - D, false)} 짧아요. 남는 시간은 마지막 장면으로 채워요.` : "파란 창을 끌어 쓸 부분을 고르세요. 고르지 않으면 처음부터 나가요."}</span>
          {/* 문장 길이에 맞추기 (2026-10-21 사장님) — 창 길이를 문장(말소리) 길이로. 영상 끝을 넘으면 시작을 당긴다 */}
          {trim && need && !chained && Math.abs(e - s - need) > 0.05 && <Btn onClick={() => { const L = Math.min(need, D); const ns = Math.min(s, Math.max(0, D - L)); setS(ns); setE(ns + L); seekMain(ns); }}><Icon name="fit" size={16} />문장 길이에 맞추기</Btn>}
          <Btn onClick={() => { if (trim) { setS(s1); setE(e1); } else setS(0); }} disabled={!changed}><Icon name="undo" size={16} />되돌리기</Btn>
          {place ? (
            <>
              {place.canReplace && !audioOnly && <Btn onClick={() => { place.onPlace(+s.toFixed(2), +e.toFixed(2), "replace"); onClose(); }} title="고른 클립의 화면을 이 구간으로 바꿔요"><Icon name="image" size={16} />고른 클립 화면 바꾸기</Btn>}
              <Btn primary onClick={() => { place.onPlace(+s.toFixed(2), +e.toFixed(2), "insert"); onClose(); }} title={audioOnly ? "고른 구간만 배경 음악으로 깔아요" : place.canReplace ? "고른 클립 뒤에 이 구간만 새 클립으로 넣어요" : "맨 끝에 이 구간만 새 클립으로 넣어요"}>
                <Icon name="plus" size={16} />{audioOnly ? "음악 넣기" : place.canReplace ? "고른 클립 뒤에 넣기" : "끝에 넣기"}
              </Btn>
            </>
          ) : (
            <Btn primary onClick={() => { onApply(+s.toFixed(2), +(trim && !chained ? e : s + span).toFixed(2), n, m, L0); onClose(); }}><Icon name="check" size={16} />적용</Btn>
          )}
        </>
      }>
      <div style={{ padding: place ? "12px 16px 14px" : "16px 20px 20px" }}>
        {/* 화면을 그대로 끌어 클립 목록에 놓으면 고른 부분만 들어간다 (2026-10-25 사장님) */}
        <div {...(place?.drag ? dragOutProps(() => place.drag!(+s.toFixed(2), +e.toFixed(2)), onClose) : {})} title={place?.drag ? "끌어서 왼쪽 클립 목록(클립 앞·뒤·화면)에 놓으면 고른 부분만 들어가요" : undefined}
          style={{ cursor: place?.drag ? "grab" : undefined, width: "100%", aspectRatio: place ? "16 / 9" : "16 / 7", background: "#000", borderRadius: 6, overflow: "hidden", marginBottom: place ? 8 : 12, ...(audioOnly ? { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20, boxSizing: "border-box" } : {}) }}>
          {audioOnly && (
            <>
              <span style={{ width: 72, height: 72, borderRadius: 36, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", color: playing ? C.accent : C.sub }}><Icon name="music" size={34} /></span>
              <span style={{ maxWidth: "100%", fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</span>
              <span style={{ fontSize: 13, color: C.dim }}>전체 {fmtTime(D, false)}</span>
            </>
          )}
          {still && <img src={asset.url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />}
          {!still && <video ref={mainRef} src={asset.url} muted={false} playsInline preload="auto" onLoadedData={() => seekMain(s)}
            style={audioOnly ? { display: "none" } : { width: "100%", height: "100%", objectFit: "contain", display: "block" }} />}
        </div>

        {/* 확대 — 긴 영상은 늘려서 1~2초 단위로 맞춘다 (Ctrl+휠도 돼요) */}
        {maxZoom > 1.2 && (
          <div title="Ctrl+휠로도 확대해요" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 6, fontSize: 12.5, color: C.sub }}>
            {place?.drag && <span style={{ marginRight: "auto", color: C.dim }}>화면을 끌어 클립에 놓으면 고른 부분만 들어가요</span>}
            {!place && <span style={{ color: C.dim }}>Ctrl+휠로도 확대해요</span>}
            {<>
            <button type="button" onClick={() => zoomAt(zoom / 1.5)} disabled={zoom <= 1} title="줄이기" style={{ ...chip(false), width: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="minus" size={14} /></button>
            <span style={{ minWidth: 46, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{zoom < 1.05 ? "전체" : `${zoom.toFixed(zoom < 10 ? 1 : 0)}배`}</span>
            <button type="button" onClick={() => zoomAt(zoom * 1.5)} disabled={zoom >= maxZoom} title="확대" style={{ ...chip(false), width: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={14} /></button>
            {zoom > 1 && <button type="button" onClick={() => setZoom(1)} style={chip(false)}>전체 보기</button>}
            {trim && !chained && <button type="button" onClick={() => { const z = Math.max(1, Math.min(maxZoom, (D / Math.max(MIN, e - s)) * 0.8)); setZoom(z); requestAnimationFrame(() => { const sc = scrollRef.current; if (sc) sc.scrollLeft = (s / D) * sc.scrollWidth - sc.clientWidth * 0.1; }); }} style={chip(false)}>고른 부분 크게</button>}
            </>}
          </div>
        )}
        <div ref={scrollRef} style={{ overflowX: zoom > 1 ? "auto" : "hidden", overflowY: "hidden" }}>
        <div style={{ width: `${zoom * 100}%` }}>

        {/* 눈금 막대 — 누르고 끌면 재생 위치(빨간 선)가 옮겨지고 위 화면이 그 장면으로 (2026-10-19 사장님) */}
        <div onPointerDown={scrub} title="누르고 끌면 그 장면을 위 화면에서 봐요"
          style={{ position: "relative", height: 26, marginBottom: 4, borderRadius: 5, background: "#1a1b1f", cursor: "ew-resize", userSelect: "none", touchAction: "none" }}>
          {Array.from({ length: Math.floor(D / tick) + 1 }, (_, i) => i * tick).map((t) => (
            <span key={t} style={{ position: "absolute", left: pct(t), bottom: 0, height: 8, width: 1, background: "#555" }}>
              <span style={{ position: "absolute", left: 3, bottom: 5, fontSize: 10.5, color: C.dim, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtTime(t, false)}</span>
            </span>
          ))}
          {/* 재생 위치 손잡이 + 시각 */}
          <span style={{ position: "absolute", left: pct(head), top: 0, bottom: 0, width: 0, pointerEvents: "none" }}>
            <span style={{ position: "absolute", left: -1.5, top: 0, bottom: 0, width: 3, background: "#ef4444" }} />
            <span style={{ position: "absolute", left: "50%", top: 2, transform: "translateX(-50%)", padding: "1px 6px", borderRadius: 4, background: "#ef4444", color: "#fff", fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtTime(head, false)}</span>
          </span>
        </div>

        {/* 필름 띠 */}
        <div ref={stripRef} onPointerDown={(e) => drag(e, false)}
          style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#111", cursor: trim ? "ew-resize" : "pointer", userSelect: "none", touchAction: "none" }}>
          {!audioOnly && <div style={{ height: 76, display: "flex" }}>
            {Array.from({ length: FRAMES }, (_, i) => (
              <canvas key={i} ref={(el) => { canvases.current[i] = el; }} width={160} height={90} style={{ flex: 1, minWidth: 0, height: "100%", objectFit: "cover", display: "block", opacity: 0.55 }} />
            ))}
          </div>}
          {/* 소리 파형 — 말소리가 있는 곳을 보고 앞뒤를 자를 수 있게 */}
          {!still && <div style={{ height: audioOnly ? 76 : 46, borderTop: "1px solid #222", background: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {peaks ? <canvas ref={waveRef} width={1200} height={audioOnly ? 76 : 46} style={{ width: "100%", height: "100%", display: "block" }} /> : <span style={{ fontSize: 12.5, color: C.dim }}>{waveMsg}</span>}
          </div>}
          {/* 고른 구간 */}
          <div onPointerDown={(ev) => { ev.stopPropagation(); drag(ev, true); }} title={trim ? "끌어서 구간 옮기기" : "끌어서 시작점 바꾸기"}
            style={{ position: "absolute", top: 0, bottom: 0, left: pct(s), width: pct(span), border: `3px solid ${C.accent}`, borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)", cursor: "grab", boxSizing: "border-box" }}>
            {/* 이어 붙인 클립 경계 — 클립마다 어느 부분이 가는지 */}
            {chained && segs.slice(0, -1).map((_, k) => {
              const at = segs.slice(0, k + 1).reduce((t, x) => t + x, 0);
              return at < span ? <span key={k} style={{ position: "absolute", top: 0, bottom: 0, left: `${(at / span) * 100}%`, width: 0, borderLeft: "2px dashed #fff", pointerEvents: "none" }} /> : null;
            })}
            {chained && segs.map((d, k) => {
              const at = segs.slice(0, k).reduce((t, x) => t + x, 0);
              return at < span ? <span key={"l" + k} style={{ position: "absolute", left: `calc(${(at / span) * 100}% + 4px)`, bottom: 4, padding: "0 5px", borderRadius: 3, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 11, fontWeight: 800, pointerEvents: "none", whiteSpace: "nowrap" }}>{segLabels[k]}</span> : null;
            })}
            {place?.drag ? (
              <span {...dragOutProps(() => place.drag!(+s.toFixed(2), +e.toFixed(2)), onClose)} title="끌어서 클립 목록에 놓으면 이 부분만 들어가요"
                style={{ position: "absolute", right: 16, top: 4, padding: "1px 6px", borderRadius: 4, background: C.accent, color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "grab", boxShadow: "0 0 0 1px #fff" }}>⠿ {fmtTime(span, false)}</span>
            ) : (
              <span style={{ position: "absolute", right: trim && !chained ? 16 : 4, top: 4, padding: "1px 6px", borderRadius: 4, background: C.accent, color: "#fff", fontSize: 11.5, fontWeight: 800 }}>{fmtTime(span, false)}</span>
            )}
            {trim && !chained && (still ? (["right"] as const) : (["left", "right"] as const)).map((side) => (
              <div key={side} onPointerDown={(ev) => { ev.stopPropagation(); drag(ev, side); }} title={side === "left" ? "끌어서 앞 자르기" : "끌어서 뒤 자르기"} style={grip(side)}>
                <span style={{ width: 2, height: 22, borderRadius: 1, background: "#fff" }} />
              </div>
            ))}
          </div>
          {/* 재생 위치 */}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: pct(head), width: 3, marginLeft: -1, background: "#ef4444", boxShadow: "0 0 0 1px rgba(0,0,0,0.5)", pointerEvents: "none" }} />
        </div>
        <div style={{ position: "relative", height: 22, fontSize: 12.5, color: C.accent, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ position: "absolute", left: pct(s), top: 4, fontWeight: 800 }}>시작 {fmtTime(s, false)}</span>
          <span style={{ position: "absolute", left: pct(s + span), top: 4, transform: "translateX(-100%)", fontWeight: 800 }}>끝 {fmtTime(s + span, false)}</span>
        </div>
        </div>
        </div>
        {chain && (chain.next.length > 0 || (chain.prev?.length ?? 0) > 0 || Boolean(lead)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "6px 0 4px" }}>
            <span style={{ fontSize: 13, fontWeight: 800, marginRight: 4 }}>이어 붙이기</span>
            {/* 앞 클립 영상이 모자란 끝 — 이 영상으로 앞당겨 채우기 */}
            {lead && <button type="button" onClick={() => setUseLead(!useLead)} title={`${lead.label} ${lead.gap.toFixed(1)}초가 멈춘 화면이에요 — 이 영상을 그만큼 먼저 시작해 채워요`} style={{ ...chip(useLead), ...(useLead ? {} : { borderColor: "#facc15", color: "#facc15" }) }}>{useLead ? "✓ " : ""}{lead.label} 모자란 {lead.gap.toFixed(1)}초 채우기</button>}
            {lead && <span style={{ color: C.dim, margin: "0 2px" }}>│</span>}
            {/* 앞 빈칸부터 — 먼 것이 왼쪽 */}
            {[...(chain.prev || [])].map((x, k) => ({ x, k })).reverse().map(({ x, k }) => <button key={x.id} type="button" onClick={() => setM(m === k + 1 ? 0 : k + 1)} title={`${x.label}~${chain.self}: 앞의 빈칸 클립부터 이 영상을 이어서`} style={chip(m === k + 1)}>{x.label}부터</button>)}
            {(chain.prev?.length ?? 0) > 0 && <span style={{ color: C.dim, margin: "0 2px" }}>│</span>}
            <button type="button" onClick={() => { setN(0); setM(0); }} style={chip(n === 0 && m === 0)}>이 클립만</button>
            {chain.next.map((x, k) => <button key={x.id} type="button" onClick={() => setN(k + 1)} title={`${chain.self}~${x.label} 클립에 이 영상을 쭉 이어서`} style={chip(n === k + 1)}>~{x.label}까지</button>)}
          </div>
        )}
        {trim && !place && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 4 }}>
            <Btn small onClick={() => { setPlaying(false); seekMain(s); }}>시작 장면 보기</Btn>
            <Btn small onClick={() => { setPlaying(false); seekMain(s + span / 2); }}>가운데 장면 보기</Btn>
            <Btn small onClick={() => { setPlaying(false); seekMain(Math.max(0, s + span - 0.04)); }}>끝 장면 보기</Btn>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: place ? 8 : 14, marginTop: place ? 6 : 10 }}>
          <button type="button" onClick={() => setPlaying((v) => !v)} title={playing ? "멈추기" : "재생 위치(빨간 선)부터 고른 부분 재생"}
            style={{ width: 46, height: 46, borderRadius: "50%", border: 0, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name={playing ? "pause" : "play"} size={22} />
          </button>
          <span style={{ padding: "4px 10px", borderRadius: 5, background: C.card, fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>{fmtTime(head, false)} / {fmtTime(D, false)}</span>
          {place && (
            <>
              <Btn small onClick={() => { setPlaying(false); seekMain(s); }} title="시작 장면 보기">시작</Btn>
              <Btn small onClick={() => { setPlaying(false); seekMain(s + span / 2); }} title="가운데 장면 보기">가운데</Btn>
              <Btn small onClick={() => { setPlaying(false); seekMain(Math.max(0, s + span - 0.04)); }} title="끝 장면 보기">끝</Btn>
            </>
          )}
          {peaks && !place && (
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


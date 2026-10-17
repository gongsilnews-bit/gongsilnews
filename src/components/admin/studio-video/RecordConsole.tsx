"use client";

// 영상 녹화 조정실 — OBS 스튜디오 모드처럼: 위 = 녹화 방식, 왼쪽 = 레이아웃, 가운데 = 프리뷰(다음 화면), 오른쪽 = 지금 녹화되는 화면, 아래 = 작은 단추.
// 앱(0.1.8부터)에서는 따로 뜨는 창(항상 위·녹화에 안 찍힘·옮기기·투명도), 옛 앱에서는 스튜디오 안의 창으로.
// 녹화는 늘 1920×1080 화판에 그려서 한다 — 녹화를 멈추지 않고 [전환]으로 화면을 바꾼다.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LibItem } from "./types";
import { errText, fmtTime, videoBridge } from "./types";
import { Btn, C, FONT, Icon, Modal, Toggle, VolumeControl, Working, input, label } from "./ui";
import type { CamBox, Prompter, Rect } from "./Flows";
import { CAM_COLORS, CAM_DEFAULT, MicMeter, PrompterPanel, SettingsBtn, SettingsNote, camPath, clampCps, clampSize, fitCamBox, loadPrompter, savePrompter, splitRects } from "./Flows";

type Mode = "screen" | "camera" | "both";
type Lay = "br" | "bl" | "lr" | "tb"; // 원(사각형) 오른쪽 아래 · 왼쪽 아래 · 좌우 반반 · 상하 반반
type Shot = { mode: Mode; lay: Lay };
const LAYS: { id: Lay; name: string }[] = [
  { id: "br", name: "작은 카메라 · 오른쪽 아래" },
  { id: "bl", name: "작은 카메라 · 왼쪽 아래" },
  { id: "lr", name: "좌우 반반" },
  { id: "tb", name: "상하 반반" },
];
const MODES: { id: Mode; name: string; icon: string }[] = [
  { id: "screen", name: "화면", icon: "screen" },
  { id: "camera", name: "카메라", icon: "camera" },
  { id: "both", name: "화면 + 카메라", icon: "layers" },
];
const sameShot = (a: Shot, b: Shot) => a.mode === b.mode && (a.mode !== "both" || a.lay === b.lay);
const shotName = (s: Shot) => (s.mode === "both" ? `화면 + 카메라 · ${LAYS.find((l) => l.id === s.lay)!.name}` : s.mode === "screen" ? "화면" : "카메라");

/** 레이아웃 → 카메라 자리 (크기·모양·테두리·자리 바꾸기는 style 그대로) */
function boxOf(style: CamBox, lay: Lay): CamBox {
  if (lay === "lr" || lay === "tb") return { ...style, layout: lay };
  const m = 48;
  return { ...style, layout: "pip", cx: lay === "bl" ? style.r + m : 1920 - style.r - m, cy: 1080 - style.r - m };
}

/** 한 장면을 화판에 그린다 (W = 화판 너비, 1920 기준으로 그려서 줄인다). 아직 안 열린 것만 있으면 그리지 않는다 (바로 앞 화면 그대로) */
function drawShot(g: CanvasRenderingContext2D, W: number, shot: Shot, style: CamBox, sv: HTMLVideoElement, cv: HTMLVideoElement, sOk: boolean, cOk: boolean): boolean {
  const m = shot.mode;
  if (m === "camera" ? !cOk : m === "screen" ? !sOk : !sOk && !cOk) return false;
  const k = W / 1920;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.fillStyle = "#000";
  g.fillRect(0, 0, 1920, 1080);
  const fit = (v: HTMLVideoElement, [X, Y, w, h]: Rect, cover: boolean) => {
    const vw = v.videoWidth || 1920, vh = v.videoHeight || 1080;
    const s = cover ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh);
    g.save();
    g.beginPath();
    g.rect(X, Y, w, h);
    g.clip();
    g.drawImage(v, X + (w - vw * s) / 2, Y + (h - vh * s) / 2, vw * s, vh * s);
    g.restore();
  };
  const FULL: Rect = [0, 0, 1920, 1080];
  if (m === "camera" || (m === "both" && !sOk)) fit(cv, FULL, true);
  else if (m === "screen" || !cOk) fit(sv, FULL, false);
  else {
    const cb = boxOf(style, shot.lay);
    const sp = splitRects(cb);
    if (sp) {
      fit(sv, sp.scr, false);
      fit(cv, sp.cam, true);
      if (cb.line > 0) {
        g.fillStyle = cb.color;
        if (cb.layout === "lr") g.fillRect(960 - cb.line / 2, 0, cb.line, 1080);
        else g.fillRect(0, 540 - cb.line / 2, 1920, cb.line);
      }
    } else {
      fit(sv, FULL, false);
      g.save();
      camPath(g, cb, 0);
      g.clip();
      const cw = cv.videoWidth || 1280, ch = cv.videoHeight || 720;
      const kk = Math.max((cb.r * 2) / cw, (cb.r * 2) / ch);
      g.drawImage(cv, cb.cx - (cw * kk) / 2, cb.cy - (ch * kk) / 2, cw * kk, ch * kk);
      g.restore();
      if (cb.line > 0) {
        g.lineWidth = cb.line;
        g.strokeStyle = cb.color;
        camPath(g, cb, cb.line / 2);
        g.stroke();
      }
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}

/** 레이아웃 작은 그림 — 회색: 화면, 파랑: 카메라 */
function LayIcon({ shot, on }: { shot: Shot; on: boolean }) {
  const scr = on ? "#9ca3af" : "#6b7280", cam = on ? C.accent : "#9ca3af";
  const box = (s: React.CSSProperties): React.CSSProperties => ({ position: "absolute", borderRadius: 2, ...s });
  return (
    <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16 / 9", background: "#0b0c0f", borderRadius: 3 }}>
      {shot.mode === "screen" && <span style={box({ inset: 3, background: scr })} />}
      {shot.mode === "camera" && <span style={box({ inset: 3, background: cam })} />}
      {shot.mode === "both" && (shot.lay === "br" || shot.lay === "bl") && <><span style={box({ inset: 3, background: scr })} /><span style={box({ [shot.lay === "br" ? "right" : "left"]: 6, bottom: 6, width: "24%", aspectRatio: "1", borderRadius: "50%", background: cam })} /></>}
      {shot.mode === "both" && shot.lay === "lr" && <><span style={box({ left: 3, top: 3, bottom: 3, width: "calc(50% - 4px)", background: scr })} /><span style={box({ right: 3, top: 3, bottom: 3, width: "calc(50% - 4px)", background: cam })} /></>}
      {shot.mode === "both" && shot.lay === "tb" && <><span style={box({ left: 3, right: 3, top: 3, height: "calc(50% - 4px)", background: scr })} /><span style={box({ left: 3, right: 3, bottom: 3, height: "calc(50% - 4px)", background: cam })} /></>}
    </span>
  );
}

const loadJSON = <T,>(k: string, d: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "null");
    return v ?? d;
  } catch {
    return d;
  }
};
const saveJSON = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const okShot = (s: unknown): s is Shot => Boolean(s && ["screen", "camera", "both"].includes((s as Shot).mode) && ["br", "bl", "lr", "tb"].includes((s as Shot).lay));

export function RecordConsole({ onCancel, onRecorded }: { onCancel: () => void; onRecorded: (item: LibItem, script?: string) => void }) {
  const b = videoBridge()!;
  const canPop = Boolean(b.record.console); // 앱 0.1.8부터 — 따로 뜨는 창

  /* ── 장면: 프리뷰(다음) · 프로그램(지금 녹화) ── */
  const [pv, setPvState] = useState<Shot>(() => {
    const v = loadJSON<unknown>("gsv:recShot", null);
    return okShot(v) ? v : { mode: "screen", lay: "br" };
  });
  const [pg, setPgState] = useState<Shot>(pv);
  const pvRef = useRef(pv);
  const pgRef = useRef(pg);
  const setPv = (s: Shot) => {
    pvRef.current = s;
    setPvState(s);
  };
  const setPg = (s: Shot) => {
    pgRef.current = s;
    setPgState(s);
    saveJSON("gsv:recShot", s);
  };
  const cut = () => setPg(pvRef.current); // [▶ 전환]
  // 카메라 모양·크기·테두리 (레이아웃과 따로, 다음 녹화 때도 그대로)
  const [style, setStyleState] = useState<CamBox>(() => {
    const v = loadJSON<CamBox | null>("gsv:camBox", null);
    return v && typeof v.r === "number" ? fitCamBox({ ...CAM_DEFAULT, ...v }) : CAM_DEFAULT;
  });
  const styleRef = useRef(style);
  const setStyle = (v: CamBox) => {
    const n = fitCamBox(v);
    styleRef.current = n;
    setStyleState(n);
    saveJSON("gsv:camBox", n);
  };

  /* ── 장치 ── */
  const [sources, setSources] = useState<{ id: string; name: string; thumb: string }[]>([]);
  const [source, setSource] = useState("");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cam, setCam] = useState("");
  const [mic, setMic] = useState("");
  const [picked, setPicked] = useState(false); // 쓸 카메라를 정한 뒤에 연다
  const [camErr, setCamErr] = useState("");
  const [micErr, setMicErr] = useState("");
  const [setOpened, setSetOpened] = useState<"" | "camera" | "microphone">("");
  const [micMuted, setMicMuted] = useState(false);
  const [micVol, setMicVol] = useState(1);
  const [micAuto, setMicAuto] = useState(true);
  const [pcMuted, setPcMuted] = useState(false);
  const [pcVol, setPcVol] = useState(1);
  const camScore = (v: MediaDeviceInfo) => (/\bIR\b|infrared|적외선/i.test(v.label) ? 2 : /virtual|가상|\bOBS\b|snap camera|xsplit|manycam|vcam|e2esoft|nvidia broadcast/i.test(v.label) ? 1 : 0);
  const pickCam = (vids: MediaDeviceInfo[]) => [...vids].sort((x, y) => camScore(x) - camScore(y))[0]?.deviceId || "";
  const errOf = (e: unknown) => {
    const n = (e as DOMException)?.name || "";
    return /NotAllowed|Security|PermissionDenied/.test(n) ? "denied" : /NotReadable|TrackStart|Abort/.test(n) ? "busy" : /NotFound|DevicesNotFound|Overconstrained/.test(n) ? "none" : `other:${n}`;
  };
  // 장치 목록 — 이름을 모르면(처음 쓰는 PC) 한 번 열어 권한을 받는다
  const probe = async () => {
    let d = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
    if (!d.some((x) => x.kind === "videoinput" && x.label)) {
      try {
        (await navigator.mediaDevices.getUserMedia({ video: true })).getTracks().forEach((t) => t.stop());
      } catch (e) {
        setCamErr(errOf(e));
      }
    }
    if (!d.some((x) => x.kind === "audioinput" && x.label)) {
      try {
        (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop());
        setMicErr("");
      } catch (e) {
        setMicErr(errOf(e));
      }
    }
    d = await navigator.mediaDevices.enumerateDevices().catch(() => d);
    const vids = d.filter((x) => x.kind === "videoinput");
    const auds = d.filter((x) => x.kind === "audioinput");
    setCams(vids);
    setMics(auds);
    setCam((c) => (c && vids.some((v) => v.deviceId === c) ? c : pickCam(vids)));
    if (!vids.length) setCamErr("none");
    if (!auds.length) setMicErr("none");
    setPicked(true);
  };
  const probeRef = useRef(probe);
  probeRef.current = probe;
  useEffect(() => {
    b.record.sources().then((s) => {
      setSources(s);
      setSource((x) => x || s[0]?.id || "");
    }).catch(() => {});
    void probeRef.current();
    const again = () => void probeRef.current();
    navigator.mediaDevices.addEventListener?.("devicechange", again);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", again);
  }, [b]);

  /* ── 화판 엔진 — 화면·카메라를 필요할 때만 열고, 프로그램(녹화)·프리뷰를 계속 그린다 ── */
  const [media] = useState(() => {
    const sv = document.createElement("video");
    const cv = document.createElement("video");
    sv.muted = cv.muted = true;
    sv.playsInline = cv.playsInline = true;
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    return { sv, cv, canvas, g: canvas.getContext("2d")!, stream: null as MediaStream | null };
  });
  const st = useRef<{ screen: MediaStream | null; screenSrc: string; camera: MediaStream | null; camId: string; q: Promise<void> }>({ screen: null, screenSrc: "", camera: null, camId: "", q: Promise.resolve() });
  const needScreen = pg.mode !== "camera" || pv.mode !== "camera";
  const needCam = pg.mode !== "screen" || pv.mode !== "screen";
  const [camOn, setCamOn] = useState(false);
  const [retry, setRetry] = useState(0); // 카메라를 못 열었으면 다시 열어 보기
  const [scrOn, setScrOn] = useState(false);
  useEffect(() => {
    const s = st.current;
    s.q = s.q.then(async () => {
      // 화면
      if (needScreen && source && (!s.screen || s.screenSrc !== source)) {
        try {
          await b.record.choose(source);
          const ns = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
          s.screen?.getTracks().forEach((t) => t.stop());
          s.screen = ns;
          s.screenSrc = source;
          media.sv.srcObject = ns;
          await media.sv.play().catch(() => {});
          setScrOn(true);
        } catch (e) {
          setErr(`화면을 열지 못했어요: ${errText(e)}`);
        }
      } else if (!needScreen && s.screen) {
        s.screen.getTracks().forEach((t) => t.stop());
        s.screen = null;
        s.screenSrc = "";
        media.sv.srcObject = null;
        setScrOn(false);
      }
      // 카메라 — 카메라가 들어가는 장면이 없으면 끈다 (카메라 불)
      if (needCam && picked && (!s.camera || s.camId !== cam)) {
        s.camera?.getTracks().forEach((t) => t.stop());
        s.camera = null;
        try {
          const nc = await navigator.mediaDevices.getUserMedia({ video: cam ? { deviceId: { exact: cam }, width: 1280, height: 720 } : { width: 1280, height: 720 }, audio: false });
          s.camera = nc;
          s.camId = cam;
          media.cv.srcObject = nc;
          await media.cv.play().catch(() => {});
          setCamErr("");
          setCamOn(true);
        } catch (e) {
          setCamErr(errOf(e));
          setCamOn(false);
        }
      } else if (!needCam && s.camera) {
        s.camera.getTracks().forEach((t) => t.stop());
        s.camera = null;
        s.camId = "";
        media.cv.srcObject = null;
        setCamOn(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needScreen, needCam, source, cam, picked, retry]);
  // 카메라를 못 열었으면 3초마다 다시 (고치면 저절로)
  useEffect(() => {
    if (!camErr || !needCam) return;
    const t = setInterval(() => {
      void probeRef.current();
      setRetry((x) => x + 1);
    }, 3000);
    return () => clearInterval(t);
  }, [camErr, needCam]);
  const pvCanvas = useRef<HTMLCanvasElement | null>(null);
  const pgVid = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    media.stream = media.canvas.captureStream(30);
    if (pgVid.current) {
      pgVid.current.srcObject = media.stream;
      pgVid.current.play().catch(() => {});
    }
    let n = 0;
    const tick = () => {
      const s = st.current;
      const sOk = Boolean(s.screen) && media.sv.readyState >= 2;
      const cOk = Boolean(s.camera) && media.cv.readyState >= 2;
      drawShot(media.g, 1920, pgRef.current, styleRef.current, media.sv, media.cv, sOk, cOk);
      const pc = pvCanvas.current;
      if (pc && n++ % 2 === 0) {
        const g = pc.getContext("2d");
        if (g && !drawShot(g, pc.width, pvRef.current, styleRef.current, media.sv, media.cv, sOk, cOk)) {
          g.fillStyle = "#000";
          g.fillRect(0, 0, pc.width, pc.height);
        }
      }
    };
    // 그리기 신호(requestAnimationFrame)는 창을 내리면 멈춘다 — 시계로 그린다
    const t = window.setInterval(tick, 1000 / 30);
    const s = st.current;
    return () => {
      clearInterval(t);
      media.stream?.getTracks().forEach((x) => x.stop());
      s.screen?.getTracks().forEach((x) => x.stop());
      s.camera?.getTracks().forEach((x) => x.stop());
      s.screen = s.camera = null;
    };
  }, [media]);

  /* ── 프롬프터 ── */
  const [pr, setPr] = useState<Prompter>(() => loadPrompter());
  const [prOpen, setPrOpen] = useState(false);
  const prUse = pr.on && Boolean(pr.text.trim()) && Boolean(b.record.prompterOpen);
  const openPrompter = (startAt: number, rehearse = false) => {
    if (!b.record.prompterOpen) return;
    setPrOpen(true);
    b.record.prompterOpen({ text: pr.text.trim(), cps: pr.cps, size: pr.size, mine: pr.mine, startAt, rehearse }).catch(() => setPrOpen(false));
  };
  const closePrompter = () => {
    setPrOpen(false);
    b.record.prompterClose?.().catch(() => {});
  };
  useEffect(() => b.record.onPrompterClosed?.(() => setPrOpen(false)), [b]);
  useEffect(() => b.record.onPrompterPrefs?.((o) => setPr((p) => {
    const n = { ...p, cps: clampCps(o.cps), size: clampSize(o.size), mine: o.mine ? { cps: clampCps(o.mine.cps), size: clampSize(o.mine.size) } : p.mine };
    savePrompter(n);
    return n;
  })), [b]);
  useEffect(() => () => void b.record.prompterClose?.().catch(() => {}), [b]);

  /* ── 저장 폴더 ── */
  const [saveDir, setSaveDirState] = useState("");
  const [defaultDir, setDefaultDir] = useState("");
  const [fileName, setFileName] = useState("");
  useEffect(() => {
    if (b.project.folders) b.project.folders().then((f) => {
      setDefaultDir(f.defaults.recordDir);
      setSaveDirState(f.recordDir);
    }).catch(() => {});
    else b.record.defaultDir?.().then(setDefaultDir).catch(() => {});
  }, [b]);
  const setSaveDir = (d: string) => {
    setSaveDirState(d);
    b.project.setFolders?.({ recordDir: d }).catch(() => {});
  };
  const dirShown = saveDir || defaultDir;

  /* ── 녹화 ── */
  const [phase, setPhase] = useState<"setup" | "count" | "rec" | "saving">("setup");
  const [count, setCount] = useState(3);
  const [sec, setSec] = useState(0);
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const token = useRef("");
  const audio = useRef<{ ctx: AudioContext; mic: GainNode | null; pc: GainNode | null; streams: MediaStream[] } | null>(null);
  useEffect(() => {
    const a = audio.current;
    if (a?.mic) a.mic.gain.value = micMuted ? 0 : micVol;
    if (a?.pc) a.pc.gain.value = pcMuted ? 0 : pcVol;
  }, [micMuted, micVol, pcMuted, pcVol]);
  const stopAudio = () => {
    const a = audio.current;
    audio.current = null;
    a?.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    a?.ctx.close().catch(() => {});
  };
  useEffect(() => () => stopAudio(), []);
  // 소리 — 마이크·PC 소리는 늘 받아 두고 크기(0 = 끔)만 바꾼다 → 녹화 중에도 켜고 끌 수 있다
  const buildAudio = async (): Promise<MediaStreamTrack[]> => {
    const streams: MediaStream[] = [];
    let pcTracks: MediaStreamTrack[] = [];
    try {
      await b.record.choose(source || sources[0]?.id || "");
      const d = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      d.getVideoTracks().forEach((t) => t.stop());
      streams.push(d);
      pcTracks = d.getAudioTracks();
    } catch {}
    let micSt: MediaStream | null = null;
    try {
      const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: micAuto };
      micSt = await navigator.mediaDevices.getUserMedia({ audio: mic ? { ...base, deviceId: { exact: mic } } : base, video: false });
      streams.push(micSt);
    } catch (e) {
      setMicErr(errOf(e));
    }
    if (source) await b.record.choose(source).catch(() => {}); // 작은 막대·프롬프터는 녹화하는 모니터에
    if (!micSt && !pcTracks.length) return [];
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    let mg: GainNode | null = null, pgn: GainNode | null = null;
    if (micSt) {
      mg = ctx.createGain();
      mg.gain.value = micMuted ? 0 : micVol;
      ctx.createMediaStreamSource(micSt).connect(mg).connect(dest);
    }
    if (pcTracks.length) {
      pgn = ctx.createGain();
      pgn.gain.value = pcMuted ? 0 : pcVol;
      ctx.createMediaStreamSource(new MediaStream(pcTracks)).connect(pgn).connect(dest);
    }
    audio.current = { ctx, mic: mg, pc: pgn, streams };
    return dest.stream.getAudioTracks();
  };
  const start = async () => {
    setErr("");
    setPanel("");
    try {
      const tracks = await buildAudio();
      const out = new MediaStream([...media.stream!.getVideoTracks(), ...tracks]);
      if (prUse) openPrompter(Date.now() + 3000);
      popRef.current = openPop();
      if (popRef.current) b.record.minimize?.().catch(() => {}); // 화면 녹화에 스튜디오 창이 안 찍히게
      setPhase("count");
      for (let i = 3; i > 0; i--) {
        setCount(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      token.current = await b.record.start(pgRef.current.mode === "camera" ? "카메라 녹화" : "화면 녹화", { dir: saveDir || undefined, fileName: fileName.trim() || undefined });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const r = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      // 조각은 받은 순서대로 하나씩 쓴다 (느린 PC에서 순서가 뒤바뀌면 파일이 깨진다)
      writes.current = Promise.resolve();
      const tk = token.current;
      r.ondataavailable = (e) => {
        if (!e.data.size) return;
        const blob = e.data;
        writes.current = writes.current.then(async () => {
          await b.record.chunk(tk, await blob.arrayBuffer());
        }).catch(() => {});
      };
      r.start(1000);
      rec.current = r;
      setSec(0);
      setPhase("rec");
      await b.record.live?.(true, Date.now(), { console: popRef.current }).catch(() => {});
    } catch (e) {
      setErr(`녹화를 시작하지 못했어요: ${errText(e)}`);
      closePrompter();
      stopAudio();
      // 내려 둔 스튜디오 창을 다시 올린다
      if (popRef.current) void b.record.live?.(true, Date.now(), { console: true }).then(() => b.record.live?.(false)).catch(() => {});
      setPhase("setup");
    }
  };
  useEffect(() => {
    if (phase !== "rec") return;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  const stop = async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    b.record.live?.(false).catch(() => {}); // 스튜디오 창 다시
    closePrompter();
    setPhase("saving");
    await new Promise<void>((res) => {
      r.onstop = () => res();
      r.stop();
    });
    await new Promise((res) => setTimeout(res, 100));
    await writes.current;
    stopAudio();
    try {
      const item = await b.record.stop(token.current);
      onRecorded(item, prUse ? pr.text.trim() : "");
    } catch (e) {
      setErr(errText(e));
      setPhase("setup");
    }
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => b.record.onMiniStop?.(() => stopRef.current()), [b]);
  useEffect(() => () => void b.record.live?.(false).catch(() => {}), [b]);

  /* ── 따로 뜨는 창 ── */
  const [pop, setPop] = useState<{ w: Window; root: HTMLElement } | null>(null);
  const popRef = useRef(false); // 녹화 시작 때 바로 쓰려고 (상태는 한 박자 늦다)
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const popOff = useRef<(() => void) | null>(null);
  /** [녹화 시작] 때 — 조정실을 따로 뜨는 창으로 옮긴다 (스튜디오 창은 내려간다). 못 열면 스튜디오 안에서 그대로 */
  const openPop = (): boolean => {
    if (!canPop) return false;
    // 열 때마다 새 이름 — 닫히는 중인 창을 다시 잡지 않게
    const w = window.open("about:blank", `gsv-console-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    if (!w) return false;
    const d = w.document;
    d.title = "영상 녹화하기";
    // 글꼴·기본 스타일을 그대로
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
      const c = n.cloneNode(true) as HTMLElement;
      if (n instanceof HTMLLinkElement) (c as HTMLLinkElement).href = n.href;
      d.head.appendChild(c);
    });
    d.body.style.cssText = `margin:0;background:${C.bg};color:${C.text};font-family:${FONT};overflow:hidden;`;
    const root = d.createElement("div");
    root.style.cssText = "height:100vh;display:flex;flex-direction:column;";
    d.body.appendChild(root);
    let mine = true;
    // 창을 윈도우에서 닫으면 (Alt+F4 등) — 녹화 중이면 녹화를 끝내 저장
    const gone = () => {
      if (!mine) return;
      mine = false;
      if (phaseRef.current === "rec" || phaseRef.current === "count") void stopRef.current();
    };
    w.addEventListener("pagehide", gone);
    w.addEventListener("beforeunload", gone);
    popOff.current = () => {
      mine = false;
      w.removeEventListener("pagehide", gone);
      w.removeEventListener("beforeunload", gone);
      w.close();
      popOff.current = null;
      setPop(null);
    };
    setPop({ w, root });
    const op = Number(loadJSON("gsv:consoleOpacity", 1)) || 1;
    if (op < 1) setTimeout(() => b.record.console?.("opacity", op).catch(() => {}), 300);
    return true;
  };
  useEffect(() => () => popOff.current?.(), []);
  useEffect(() => {
    if (phase === "saving" || phase === "setup") popOff.current?.();
  }, [phase]);
  const [opacity, setOpacityState] = useState(() => Number(loadJSON("gsv:consoleOpacity", 1)) || 1);
  const setOpacity = (v: number) => {
    setOpacityState(v);
    saveJSON("gsv:consoleOpacity", v);
    b.record.console?.("opacity", v).catch(() => {});
  };
  const [big, setBig] = useState(false);
  const dragTitle = (e: React.PointerEvent<HTMLDivElement>) => {
    if (big || e.button !== 0 || (e.target as HTMLElement).closest("button, input, select")) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.screenX, sy = e.screenY;
    b.record.console?.("drag-start").catch(() => {});
    const mv = (ev: PointerEvent) => void b.record.console?.("drag", ev.screenX - sx, ev.screenY - sy).catch(() => {});
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
  };
  const toggleBig = async () => setBig(Boolean(await b.record.console?.("max").catch(() => false)));

  /* ── 화면 ── */
  const [panel, setPanel] = useState<"" | "settings" | "prompter">("");
  const bindPg = (el: HTMLVideoElement | null) => {
    pgVid.current = el;
    if (el && media.stream && el.srcObject !== media.stream) {
      el.srcObject = media.stream;
      el.play().catch(() => {});
    }
  };
  const recOn = phase === "rec";
  const shots: Shot[] = pv.mode === "both" ? LAYS.map((l) => ({ mode: "both", lay: l.id })) : [{ mode: pv.mode, lay: pv.lay }];
  const tile = (s: Shot) => {
    const onPv = sameShot(s, pv), onPg = sameShot(s, pg);
    return (
      <button key={s.mode + s.lay} type="button" onClick={() => setPv(s)} onDoubleClick={() => (setPv(s), setPg(s))} title="누르면 프리뷰에 · 두 번 누르면 바로 녹화 화면으로"
        style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 6, border: `2px solid ${onPv ? C.accent : C.line2}`, background: onPv ? "rgba(59,130,246,0.12)" : C.card, color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}>
        <LayIcon shot={s} on={onPv} />
        <span>{s.mode === "both" ? LAYS.find((l) => l.id === s.lay)!.name : s.mode === "screen" ? "화면 가득" : "카메라 가득"}</span>
        {onPg && <span title="지금 녹화 화면" style={{ position: "absolute", right: 8, top: 8, width: 12, height: 12, borderRadius: 6, background: C.danger }} />}
      </button>
    );
  };
  const devErr = (what: "camera" | "microphone", e: string) => (
    <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 6, background: "rgba(239,68,68,0.10)", border: `1px solid ${C.danger}`, fontSize: 13.5, lineHeight: 1.6 }}>
      {what === "camera"
        ? e === "denied" ? <>윈도우에서 <b>카메라 사용이 꺼져 있어요.</b> [설정] → [개인 정보 및 보안] → [카메라]에서 켜 주세요.</>
          : e === "busy" ? <><b>카메라를 열 수 없어요.</b> 다른 프로그램(줌·카카오톡 영상통화 등)이 쓰고 있거나, 카메라 끄기 키·렌즈 가림막을 확인해 주세요.</>
            : e === "none" ? <><b>카메라를 찾지 못했어요.</b> 외장 카메라면 다시 꽂아 주세요.</> : <>카메라를 열지 못했어요 ({e.replace("other:", "") || "알 수 없음"}).</>
        : e === "denied" ? <>윈도우에서 <b>마이크 사용이 꺼져 있어요.</b> [설정] → [개인 정보 및 보안] → [마이크]에서 켜 주세요.</>
          : e === "busy" ? <><b>마이크를 열 수 없어요.</b> 다른 프로그램이 쓰고 있을 수 있어요.</>
            : e === "none" ? <><b>마이크를 찾지 못했어요.</b> 이어폰·헤드셋이면 다시 꽂아 주세요.</> : <>마이크를 열지 못했어요 ({e.replace("other:", "") || "알 수 없음"}).</>}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {e !== "busy" && b.openSettings && <Btn small primary={e === "denied"} onClick={() => b.openSettings!(what)}>윈도우 {what === "camera" ? "카메라" : "마이크"} 설정 열기</Btn>}
        <Btn small onClick={() => void probe()}>다시 찾기</Btn>
      </div>
    </div>
  );
  const small: React.CSSProperties = { height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", flexShrink: 0 };
  const settings = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ ...label, marginBottom: 8 }}>카메라</div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={cam} onChange={(e) => setCam(e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }}>
            {!cams.length && <option value="">기본 카메라</option>}
            {cams.map((c) => <option key={c.deviceId} value={c.deviceId}>{(c.label || "카메라") + (camScore(c) === 1 ? " (가상 카메라)" : camScore(c) === 2 ? " (얼굴 인식용)" : "")}</option>)}
          </select>
          <SettingsBtn what="camera" onOpen={setSetOpened} />
        </div>
        {setOpened === "camera" && <SettingsNote what="camera" />}
        {camErr && needCam && devErr("camera", camErr)}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span style={{ ...label, flex: 1 }}>카메라 모양</span>
          <button type="button" onClick={() => setStyle(CAM_DEFAULT)} style={small}>처음대로</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, color: C.sub, width: 64 }}>모양</span>
            {([["circle", "원"], ["square", "사각형"]] as const).map(([v, t]) => (
              <button key={v} type="button" onClick={() => setStyle({ ...style, shape: v })} style={{ ...small, color: style.shape === v ? "#fff" : C.sub, background: style.shape === v ? C.accent : "transparent", borderColor: style.shape === v ? C.accent : C.line2, fontWeight: 700 }}>{t}</button>
            ))}
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => setStyle({ ...style, swap: !style.swap })} style={small} title="반반 배치에서 화면·카메라 자리 바꾸기">⇄ 반반 자리 바꾸기</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, color: C.sub, width: 64 }}>크기</span>
            <input type="range" min={80} max={400} value={style.r} onChange={(e) => setStyle({ ...style, r: Number(e.target.value) })} style={{ flex: 1, accentColor: C.accent }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, color: C.sub, width: 64 }}>테두리</span>
            <input type="range" min={0} max={30} value={style.line} onChange={(e) => setStyle({ ...style, line: Number(e.target.value) })} style={{ flex: 1, accentColor: C.accent }} />
            <span style={{ fontSize: 12.5, color: C.sub, width: 30, textAlign: "right" }}>{style.line || "없음"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, color: C.sub, width: 64 }}>테두리 색</span>
            {CAM_COLORS.map((c) => (
              <button key={c} type="button" title={c} onClick={() => setStyle({ ...style, color: c })} style={{ width: 22, height: 22, padding: 0, borderRadius: 11, background: c, border: `2px solid ${style.color.toLowerCase() === c ? C.accent : C.line2}`, cursor: "pointer" }} />
            ))}
          </div>
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span style={{ ...label, flex: 1 }}>마이크</span>
          <span style={{ fontSize: 13, color: C.sub, marginRight: 6 }}>자동 조절</span>
          <Toggle on={micAuto} onChange={setMicAuto} disabled={phase !== "setup"} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={mic} onChange={(e) => setMic(e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }} disabled={phase !== "setup"}>
            <option value="">기본 마이크</option>
            {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || "마이크"}</option>)}
          </select>
          <SettingsBtn what="microphone" onOpen={setSetOpened} />
        </div>
        {setOpened === "microphone" && <SettingsNote what="microphone" />}
        <VolumeControl muted={micMuted} value={micVol} onMute={setMicMuted} onVolume={(v) => { setMicVol(v); if (v > 0) setMicMuted(false); }} />
        {!micMuted && phase === "setup" && <MicMeter deviceId={mic} gain={micVol} auto={micAuto} />}
        {micErr && !micMuted && devErr("microphone", micErr)}
      </div>
      <div>
        <div style={{ ...label, marginBottom: 8 }}>PC 소리 <span style={{ color: C.dim, fontWeight: 600 }}>· 컴퓨터에서 나는 소리</span></div>
        <VolumeControl muted={pcMuted} value={pcVol} onMute={setPcMuted} onVolume={(v) => { setPcVol(v); if (v > 0) setPcMuted(false); }} />
      </div>
      <div>
        <div style={{ ...label, marginBottom: 8 }}>저장</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span title={dirShown} style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dirShown || "…"}</span>
          {b.record.pickDir && <button type="button" disabled={phase !== "setup"} onClick={async () => { const d = await b.record.pickDir?.(dirShown); if (d) setSaveDir(d === defaultDir ? "" : d); }} style={small}>바꾸기</button>}
          <button type="button" onClick={() => dirShown && b.openPath(dirShown)} style={small}>폴더 열기</button>
        </div>
        <input value={fileName} onChange={(e) => setFileName(e.target.value)} disabled={phase !== "setup"} placeholder="파일 이름 (비우면 자동: 화면 녹화_날짜·시각)" style={{ ...input, height: 36, fontSize: 13.5 }} />
      </div>
    </div>
  );

  const roundBtn = (on: boolean, danger = false): React.CSSProperties => ({ height: 44, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 6, border: `1px solid ${danger ? C.danger : on ? C.accent : C.line2}`, background: danger ? "rgba(239,68,68,0.14)" : on ? C.accentDim : C.card, color: danger ? C.danger : C.text, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });
  const winBtn = (icon: string, tip: string, onClick: () => void, close = false) => (
    <button type="button" onClick={onClick} title={tip} style={{ width: 46, height: 40, border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = close ? C.danger : C.line2; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.sub; }}>
      <Icon name={icon} size={19} />
    </button>
  );
  const close = () => {
    if (phase === "rec" || phase === "count") return;
    onCancel();
  };

  const body = (
    <>
      {pop && (
        // 위 줄 — 끌어 옮기기(✥), 투명도, 작게·크게·닫기
        <div onPointerDown={dragTitle} onDoubleClick={(e) => !(e.target as HTMLElement).closest("button, input") && void toggleBig()}
          style={{ display: "flex", alignItems: "center", gap: 12, height: 40, paddingLeft: 14, borderBottom: `1px solid ${C.line}`, background: "#0b0c0f", cursor: big ? "default" : "move", userSelect: "none", flexShrink: 0 }}>
          <span style={{ fontSize: 17, color: C.sub }}>✥</span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>영상 녹화하기</span>
          {recOn && <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.danger, fontWeight: 800, fontSize: 14 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: C.danger }} />녹화 중 {fmtTime(sec, false)}</span>}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: C.sub }}>투명도</span>
          <input type="range" min={0.3} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} title="창을 비치게 (녹화에는 안 찍혀요)" style={{ width: 110, accentColor: C.accent }} />
          <span style={{ width: 4 }} />
          {winBtn("winMin", "작게 (작업 표시줄로)", () => void b.record.console?.("min"))}
          {winBtn(big ? "winRestore" : "winMax", big ? "원래 크기로" : "크게 (화면 가득)", () => void toggleBig())}
          {phase !== "rec" && phase !== "count" && winBtn("close", "닫기", close, true)}
        </div>
      )}
      {/* 위 — 녹화 방식 (프리뷰에 넣을 화면) + 모니터 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.line}`, flexShrink: 0, flexWrap: "wrap" }}>
        {MODES.map((m) => (
          <button key={m.id} type="button" onClick={() => setPv({ mode: m.id, lay: pv.lay })} onDoubleClick={() => { const s = { mode: m.id, lay: pv.lay }; setPv(s); setPg(s); }}
            style={{ ...roundBtn(pv.mode === m.id), minWidth: 120, justifyContent: "center", position: "relative" }}>
            <Icon name={m.icon} size={18} />{m.name}
            {pg.mode === m.id && <span title="지금 녹화 화면" style={{ position: "absolute", right: 6, top: 6, width: 9, height: 9, borderRadius: 5, background: C.danger }} />}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {needScreen && sources.length > 1 && (
          <>
            <span style={{ fontSize: 14, color: C.sub }}>녹화할 모니터</span>
            {sources.map((s) => <button key={s.id} type="button" onClick={() => setSource(s.id)} style={{ ...roundBtn(source === s.id), height: 36, fontSize: 13.5 }}>{s.name}</button>)}
          </>
        )}
      </div>
      {/* 가운데 — 레이아웃 · 프리뷰 · 녹화 화면 */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", gap: 14, padding: 14 }}>
        <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.sub }}>레이아웃</div>
          {shots.map(tile)}
          {pv.mode !== "both" && <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>[화면 + 카메라]를 누르면 배치를 고를 수 있어요.</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>프리뷰</span>
            <span style={{ fontSize: 13, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shotName(pv)}</span>
          </div>
          <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#000", border: `2px solid #22c55e`, borderRadius: 4, overflow: "hidden" }}>
            <canvas ref={pvCanvas} width={960} height={540} style={{ width: "100%", height: "100%", display: "block" }} />
            {((pv.mode !== "camera" && !scrOn) || (pv.mode !== "screen" && !camOn)) && <span style={{ position: "absolute", left: 10, bottom: 8, fontSize: 12.5, color: C.sub }}>{pv.mode !== "screen" && !camOn && camErr ? "카메라를 못 열었어요 (⚙ 설정)" : "여는 중…"}</span>}
          </div>
          <button type="button" onClick={cut} disabled={sameShot(pv, pg)} title="프리뷰를 녹화 화면으로 (레이아웃을 두 번 눌러도 돼요)"
            style={{ height: 52, borderRadius: 6, border: 0, background: sameShot(pv, pg) ? C.line2 : C.accent, color: sameShot(pv, pg) ? C.sub : "#fff", fontSize: 17, fontWeight: 800, fontFamily: FONT, cursor: sameShot(pv, pg) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="play" size={18} />전환{sameShot(pv, pg) ? " (같은 화면)" : ""}
          </button>
        </div>
        <div style={{ flex: 1.45, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: recOn ? C.danger : C.text }}><span style={{ width: 10, height: 10, borderRadius: 5, background: recOn ? C.danger : C.dim }} />{recOn ? "지금 녹화되는 화면" : "녹화될 화면"}</span>
            <span style={{ fontSize: 13, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shotName(pg)}</span>
          </div>
          <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#000", border: `2px solid ${recOn ? C.danger : C.line2}`, borderRadius: 4, overflow: "hidden" }}>
            <video ref={bindPg} muted playsInline autoPlay style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
            {phase === "count" && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.45)" }}>{count}</span>}
          </div>
          {err && <div style={{ color: C.danger, fontSize: 14, lineHeight: 1.5 }}>{err}</div>}
        </div>
        {/* 설정·프롬프터 칸 — 오른쪽에 겹쳐 연다 */}
        {panel && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, background: C.panel, borderLeft: `1px solid ${C.line2}`, boxShadow: "-12px 0 30px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", zIndex: 5 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>{panel === "settings" ? "설정" : "프롬프터"}</span>
              <button type="button" onClick={() => setPanel("")} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex" }}><Icon name="close" size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              {panel === "settings" ? settings : <PrompterPanel value={pr} onChange={setPr} disabled={false} rehearsing={prOpen} onRehearse={() => (prOpen ? closePrompter() : openPrompter(Date.now() + 3000, true))} />}
            </div>
          </div>
        )}
      </div>
      {/* 아래 — 작은 단추 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: `1px solid ${C.line}`, background: "#0b0c0f", flexShrink: 0, flexWrap: "wrap" }}>
        {phase === "setup" && <button type="button" onClick={start} style={{ ...roundBtn(false), background: C.danger, borderColor: C.danger, color: "#fff" }}><Icon name="record" size={18} />녹화 시작</button>}
        {phase === "count" && <span style={{ ...roundBtn(false), cursor: "default" }}>{count}초 뒤 녹화…</span>}
        {recOn && <button type="button" onClick={stop} style={{ ...roundBtn(false), background: C.danger, borderColor: C.danger, color: "#fff" }}><Icon name="pause" size={18} />녹화 끝내기 · {fmtTime(sec, false)}</button>}
        <span style={{ width: 8 }} />
        <button type="button" onClick={() => setMicMuted(!micMuted)} title="마이크 켜기·끄기 (녹화 중에도)" style={roundBtn(false, micMuted)}><Icon name={micMuted ? "mute" : "mic"} size={18} />{micMuted ? "마이크 꺼짐" : "마이크"}</button>
        <button type="button" onClick={() => setPcMuted(!pcMuted)} title="PC 소리 켜기·끄기 (녹화 중에도)" style={roundBtn(false, pcMuted)}><Icon name={pcMuted ? "mute" : "volume"} size={18} />{pcMuted ? "PC 소리 꺼짐" : "PC 소리"}</button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => (prOpen && b.record.prompterShow ? void b.record.prompterShow() : setPanel(panel === "prompter" ? "" : "prompter"))} style={roundBtn(panel === "prompter" || prOpen)}><Icon name="text" size={18} />프롬프터{pr.on && pr.text.trim() ? " ●" : ""}</button>
        <button type="button" onClick={() => setPanel(panel === "settings" ? "" : "settings")} style={roundBtn(panel === "settings")}><Icon name="gear" size={18} />설정</button>
      </div>
    </>
  );

  if (phase === "saving") return <Modal title=""><Working title="녹화 파일을 저장하는 중…" detail={dirShown ? `${dirShown} 폴더에 저장하고 바로 편집 화면으로 가요` : "PC에 저장하고 바로 편집 화면으로 가요"} /></Modal>;
  if (pop)
    return (
      <>
        {createPortal(body, pop.root)}
        {/* 스튜디오 창을 다시 올렸을 때 — 녹화 창을 가리키는 안내 */}
        <Modal title="녹화 중" width={520}
          footer={<><Btn primary onClick={() => void b.record.console?.("show")}>녹화 창 앞으로</Btn><Btn onClick={stop} style={{ color: C.danger }}>녹화 끝내기</Btn></>}>
          <div style={{ padding: 20, fontSize: 15, lineHeight: 1.7 }}>
            지금 <b>녹화 창</b>에서 녹화하고 있어요 <span style={{ color: C.danger, fontWeight: 800 }}>● {fmtTime(sec, false)}</span>
            <div style={{ fontSize: 13.5, color: C.sub, marginTop: 6 }}>녹화 창은 녹화에 찍히지 않아요. 화면을 녹화한다면 이 스튜디오 창은 내려 두세요.</div>
          </div>
        </Modal>
      </>
    );
  return (
    <Modal title="영상 녹화하기" onClose={phase === "setup" ? close : undefined} width={1180} controls>
      <div style={{ height: "78vh", display: "flex", flexDirection: "column" }}>{body}</div>
    </Modal>
  );
}

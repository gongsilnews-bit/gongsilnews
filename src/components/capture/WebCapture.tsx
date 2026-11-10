"use client";

/**
 * 웹 화면캡처 막대 · 판서 (2026-11-05 사장님: "우리 사이트 내에서만 일단 가능하게", "판서 앱 판서와 캡쳐 디자인과 똑같이 해줘")
 *  앱(studio-app/src/snap/bar.html · select.html · toast.html, video/ink.html · ink-bar.html)과 같은 모양·같은 동작.
 *  - 오른쪽 세로 막대: 캡처 [영역] [전체] · 녹화 [전체] [영역] [마이크] · [판서] [폴더] · [닫기] (스크롤은 웹에선 아직)
 *  - 녹화 (2026-11-05 사장님: "화면 일부 녹화 전체 녹화 이건 왜 없어?") — 이 탭 화면 + 탭 소리(+ 마이크) → mp4(안 되면 webm), 녹화 중엔 빨간 [녹화 끝]과 시간
 *  - 판서: 아래 가운데 가로 막대 — 마우스 · 펜 · 형광펜 · 글자 · 체크 · 네모/동그라미 · 화살표 · 지우개 · 색 6 · 흰/검은 칠판 · 되돌리기 · 전체 지우기 · 판서 끝/시작(F9)
 *  - 찍기: 크롬 탭 공유(getDisplayMedia, 이 탭 먼저) — 막대가 열려 있는 동안 공유를 이어서 다시 묻지 않는다. 막대·알림은 찍히지 않고 판서는 찍힌다
 *  - 찍은 그림: 클립보드 + 저장 폴더(공실뉴스\07 화면캡쳐\날짜) 또는 다운로드 폴더 · 오른쪽 아래 알림
 *  우리 사이트 안에서만 (다른 사이트는 나중에 도우미 확장으로)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { allowFolder, folderState, pickFolder, saveToFolder } from "@/components/admin/studio-web/folder";

const FONT = '"Pretendard", "Malgun Gothic", sans-serif';
const BAR_BG = "rgba(17, 20, 28, 0.95)";
const BORDER = "1px solid rgba(255,255,255,0.14)";
const SHADOW = "0 8px 24px rgba(0,0,0,0.45)";

/* ── 아이콘 (앱 bar.html · ink-bar.html 그대로) ── */
const I: Record<string, string> = {
  area: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  full: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
  ink: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  recFull: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><circle cx="12" cy="10.5" r="3" fill="currentColor"/><path d="M8 21h8"/>',
  recArea: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>',

  mouse: '<path d="M5 3l14 7-6 2-3 7z"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>',
  hl: '<path d="M9 15l-4 4h5l2-2"/><path d="M8 13l7-7 4 4-7 7z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  arrow: '<path d="M5 19L19 5"/><path d="M10 5h9v9"/>',
  rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  text: '<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
  erase: '<path d="M7 20h11"/><path d="M5 15l9-9 5 5-8 8H8z"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
};
const Svg = ({ k, size = 20 }: { k: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} dangerouslySetInnerHTML={{ __html: I[k] }} />
);

/* ── 판서 (앱 ink.html 그대로) ── */
type Tool = "pen" | "hl" | "text" | "check" | "rect" | "circle" | "arrow" | "erase";
type Stroke = { t: Tool; color: string; p?: number[][]; b?: number[]; x?: number; y?: number; k?: number; lines?: string[] };
const TOOLS: [Tool | "shape", string][] = [["pen", "펜"], ["hl", "형광펜"], ["text", "글자 — 누른 자리에 쓰기 (Enter 끝 · Shift+Enter 줄바꿈)"], ["check", "체크"], ["shape", ""], ["arrow", "화살표"], ["erase", "지우개"]];
const SHAPES: [Tool, string][] = [["rect", "네모"], ["circle", "동그라미"]];
const COLORS = ["#ef4444", "#facc15", "#3b82f6", "#22c55e", "#111827", "#ffffff"];
const TXT_FONT = `800 34px ${FONT}`, TXT_LH = 34 * 1.25;
function shapeOf(s: Stroke, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
  if ((s.t === "pen" || s.t === "hl") && s.p) {
    ctx.lineWidth = s.t === "hl" ? 26 : 5;
    if (s.t === "hl") ctx.globalAlpha = 0.35;
    ctx.beginPath();
    s.p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    if (s.p.length === 1) ctx.lineTo(s.p[0][0] + 0.1, s.p[0][1]);
    ctx.stroke();
  } else if (s.t === "text" && s.lines) {
    ctx.font = TXT_FONT; ctx.textBaseline = "top";
    s.lines.forEach((l, i) => ctx.fillText(l, s.x!, s.y! + i * TXT_LH));
  } else if (s.t === "check") {
    const k = s.k || 1, x = s.x!, y = s.y!; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x - 26 * k, y - 2 * k); ctx.lineTo(x - 8 * k, y + 18 * k); ctx.lineTo(x + 30 * k, y - 26 * k); ctx.stroke();
  } else if (s.b) {
    ctx.lineWidth = 5;
    const [x0, y0, x1, y1] = s.b;
    ctx.beginPath();
    if (s.t === "circle") ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2 || 1, Math.abs(y1 - y0) / 2 || 1, 0, 0, Math.PI * 2);
    else if (s.t === "rect") ctx.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    else if (s.t === "arrow") {
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      const a = Math.atan2(y1 - y0, x1 - x0), L = 22;
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - L * Math.cos(a - 0.45), y1 - L * Math.sin(a - 0.45));
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - L * Math.cos(a + 0.45), y1 - L * Math.sin(a + 0.45));
    }
    ctx.stroke();
  }
  ctx.restore();
}

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; };
const today = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; };
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** 바깥(공실뉴스 첫 화면 빠른메뉴 [화면캡쳐])에서 막대를 여는 신호 (2026-11-10 사장님) */
export const OPEN_WEB_CAPTURE = "gs:open-web-capture";

export default function WebCapture({ launcherStyle, noLauncher }: { launcherStyle?: React.CSSProperties; noLauncher?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const on = () => setOpen(true); window.addEventListener(OPEN_WEB_CAPTURE, on); return () => window.removeEventListener(OPEN_WEB_CAPTURE, on); }, []);
  const [hide, setHide] = useState(false); // 찍는 순간 막대·알림을 숨긴다
  const [area, setArea] = useState(false);
  const [inkOn, setInkOn] = useState(false); // 판서 막대가 보이나
  const [ink, setInkState] = useState<{ drawing: boolean; tool: Tool; color: string; board: "" | "white" | "black" }>({ drawing: false, tool: "pen", color: "#ef4444", board: "" });
  const [shape, setShape] = useState<Tool>("rect");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState<{ url: string; name: string; size: string; folder: boolean; copied: boolean; blob: Blob; video?: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [barPos, setBarPos] = useState<{ right: number; top: number } | null>(null);
  const [selFor, setSelFor] = useState<"shot" | "rec">("shot"); // 영역 고르기 — 찍기 / 녹화
  const [rec, setRec] = useState<{ at: number; area: { x: number; y: number; w: number; h: number } | null } | null>(null);
  const [mic, setMic] = useState(false);
  const [tick, setTick] = useState(0);
  const recRef = useRef<{ mr: MediaRecorder; stop: () => void } | null>(null);
  useEffect(() => { if (!rec) return; const t = setInterval(() => setTick((x) => x + 1), 500); return () => clearInterval(t); }, [rec]);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const D = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<{ screen: Stroke[]; board: Stroke[] }>({ screen: [], board: [] });
  const now = useRef<Stroke | null>(null);
  const down = useRef(false);
  const inkRef = useRef(ink); inkRef.current = ink;
  const list = () => strokes.current[inkRef.current.board ? "board" : "screen"];
  const [txt, setTxt] = useState<{ x: number; y: number; color: string } | null>(null);
  const txtRef = useRef<HTMLTextAreaElement | null>(null);
  const S = useRef<HTMLCanvasElement | null>(null); // 영역 고르기
  const sel = useRef<{ a: { x: number; y: number } | null; b: { x: number; y: number } | null }>({ a: null, b: null });

  /* ── 판서 판 그리기 ── */
  const draw = useCallback(() => {
    const c = D.current; if (!c) return;
    const g = c.getContext("2d")!, W = window.innerWidth, H = window.innerHeight;
    g.clearRect(0, 0, W, H);
    const st = inkRef.current;
    if (st.board) { g.fillStyle = st.board === "black" ? "#1f2a24" : "#ffffff"; g.fillRect(0, 0, W, H); }
    for (const s of strokes.current[st.board ? "board" : "screen"]) shapeOf(s, g);
    if (now.current) shapeOf(now.current, g);
  }, []);
  const fit = useCallback(() => {
    const R = window.devicePixelRatio || 1;
    for (const c of [D.current, S.current]) {
      if (!c) continue;
      c.width = Math.round(window.innerWidth * R); c.height = Math.round(window.innerHeight * R);
      c.getContext("2d")!.setTransform(R, 0, 0, R, 0, 0);
    }
    draw(); drawSel();
  }, [draw]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) return; fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, [open, fit, area]);
  useEffect(() => { draw(); }, [ink, draw]);
  const setInk = (p: Partial<typeof ink>) => setInkState((s) => ({ ...s, ...p }));

  /* ── 글자 칸 ── */
  const commitTxt = useCallback(() => {
    setTxt((t) => {
      const v = (txtRef.current?.value || "").replace(/\s+$/, "");
      if (t && v) list().push({ t: "text", x: t.x, y: t.y, color: t.color, lines: v.split("\n") });
      return null;
    });
    setTimeout(draw, 0);
  }, [draw]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (txt && (!ink.drawing || ink.tool !== "text")) commitTxt(); }, [ink.drawing, ink.tool]); // eslint-disable-line react-hooks/exhaustive-deps
  const fitTxt = () => { const T = txtRef.current; if (!T) return; T.style.height = "0px"; T.style.width = "0px"; T.style.height = T.scrollHeight + "px"; T.style.width = T.scrollWidth + 8 + "px"; };
  useEffect(() => { if (txt) { fitTxt(); setTimeout(() => txtRef.current?.focus(), 0); } }, [txt]);

  /* ── 판서 마우스 ── */
  const erase = (x: number, y: number) => {
    const g = D.current!.getContext("2d")!;
    const near = (s: Stroke) => {
      const r = 16;
      if (s.p) return s.p.some((q) => Math.hypot(q[0] - x, q[1] - y) < r + (s.t === "hl" ? 12 : 0));
      if (s.t === "check") return Math.hypot(s.x! - x, s.y! - y) < 36;
      if (s.t === "text") { g.font = TXT_FONT; const w = Math.max(...s.lines!.map((l) => g.measureText(l).width)); return x >= s.x! - 6 && x <= s.x! + w + 6 && y >= s.y! - 6 && y <= s.y! + s.lines!.length * TXT_LH + 6; }
      const [x0, y0, x1, y1] = s.b!;
      return x >= Math.min(x0, x1) - r && x <= Math.max(x0, x1) + r && y >= Math.min(y0, y1) - r && y <= Math.max(y0, y1) + r;
    };
    const l = list(), i = l.findIndex(near);
    if (i >= 0) { l.splice(i, 1); draw(); }
  };
  const onDown = (e: React.PointerEvent) => {
    const st = inkRef.current;
    if (!st.drawing) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    down.current = true;
    const x = e.clientX, y = e.clientY, t = st.tool;
    if (txt) { commitTxt(); down.current = false; if (t === "text") return; }
    if (t === "text") { down.current = false; e.preventDefault(); setTxt({ x, y, color: st.color }); return; }
    if (t === "erase") return erase(x, y);
    if (t === "check") { list().push({ t, x, y, color: st.color, k: 1 }); draw(); down.current = false; return; }
    now.current = t === "pen" || t === "hl" ? { t, color: st.color, p: [[x, y]] } : { t, color: st.color, b: [x, y, x, y] };
    draw();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!down.current) return;
    const x = e.clientX, y = e.clientY;
    if (inkRef.current.tool === "erase") return erase(x, y);
    const n = now.current; if (!n) return;
    if (n.p) n.p.push([x, y]); else if (n.b) { n.b[2] = x; n.b[3] = y; }
    draw();
  };
  const onUp = () => { down.current = false; if (now.current) { list().push(now.current); now.current = null; draw(); } };

  /* ── 키 — F9 판서 켜고 끄기 · Esc · Ctrl+Z ── */
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "4" || e.key === "$" || e.key === "5" || e.key === "%")) { e.preventDefault(); if (recRef.current) recRef.current.stop(); return; }
      if (e.key === "F9") { e.preventDefault(); setInkOn(true); setInkState((s) => ({ ...s, drawing: !s.drawing })); return; }
      if (e.key === "Escape") { if (area) { setArea(false); sel.current = { a: null, b: null }; } else if (inkRef.current.drawing) setInk({ drawing: false }); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && inkRef.current.drawing) { list().pop(); draw(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, area, draw]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 찍기 ── */
  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  useEffect(() => () => stopStream(), []);
  const ensureStream = async () => {
    if (streamRef.current && streamRef.current.getVideoTracks()[0]?.readyState === "live") return true;
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", frameRate: 30 }, audio: true, // 탭 소리 — 녹화에 쓴다 (찍기는 그림만)
        preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude",
      } as DisplayMediaStreamOptions);
      s.getVideoTracks()[0].addEventListener("ended", () => { streamRef.current = null; recRef.current?.stop(); });
      streamRef.current = s;
      const v = videoRef.current || document.createElement("video");
      videoRef.current = v; v.muted = true; v.playsInline = true; v.srcObject = s;
      await v.play();
      await new Promise((r) => setTimeout(r, 300));
      return true;
    } catch {
      setErr("화면 공유를 허락해야 찍을 수 있어요. 크롬이 물으면 [이 탭]을 고르고 [공유]를 눌러 주세요.");
      return false;
    }
  };
  /* ── 녹화 ── */
  const startRec = async (area: { x: number; y: number; w: number; h: number } | null) => {
    if (!(await ensureStream())) return;
    const src = streamRef.current!, v = videoRef.current!;
    let videoTrack: MediaStreamTrack, stopDraw = () => {};
    if (area) {
      // 고른 곳만 — 캔버스에 잘라 그려서 그 캔버스를 녹화
      const sx = v.videoWidth / window.innerWidth, sy = v.videoHeight / window.innerHeight;
      const c = document.createElement("canvas");
      c.width = Math.round(area.w * sx / 2) * 2; c.height = Math.round(area.h * sy / 2) * 2;
      const g = c.getContext("2d")!;
      const t = setInterval(() => g.drawImage(v, area.x * sx, area.y * sy, area.w * sx, area.h * sy, 0, 0, c.width, c.height), 1000 / 30);
      stopDraw = () => clearInterval(t);
      videoTrack = c.captureStream(30).getVideoTracks()[0];
    } else videoTrack = src.getVideoTracks()[0];
    // 소리 — 탭 소리 + (켰으면) 마이크
    const ac = new AudioContext(), dst = ac.createMediaStreamDestination();
    let micStream: MediaStream | null = null;
    if (src.getAudioTracks().length) ac.createMediaStreamSource(new MediaStream(src.getAudioTracks())).connect(dst);
    if (mic) { try { micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); ac.createMediaStreamSource(micStream).connect(dst); } catch { setErr("마이크를 쓰지 못했어요 — 화면 소리만 녹화해요."); } }
    const tracks = [videoTrack, ...(src.getAudioTracks().length || micStream ? dst.stream.getAudioTracks() : [])];
    const type = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
    const mr = new MediaRecorder(new MediaStream(tracks), { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stopDraw(); micStream?.getTracks().forEach((t) => t.stop()); void ac.close();
      if (area) videoTrack.stop();
      const mp4 = (mr.mimeType || type).includes("mp4");
      const blob = new Blob(chunks, { type: mp4 ? "video/mp4" : "video/webm" });
      const name = `화면녹화_${stamp()}.${mp4 ? "mp4" : "webm"}`;
      let folder = false;
      try { folder = await saveToFolder("capture", [today()], name, blob); } catch { /* 폴더 없음 */ }
      if (!folder) download(name, blob);
      const sec = Math.round((Date.now() - (recStart.current || Date.now())) / 1000);
      setToast((old) => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(blob), name, size: `${Math.floor(sec / 60)}분 ${sec % 60}초`, folder, copied: false, blob, video: true }; });
      setRec(null); recRef.current = null;
    };
    mr.start(1000);
    recStart.current = Date.now();
    recRef.current = { mr, stop: () => { if (mr.state !== "inactive") mr.stop(); } };
    setRec({ at: Date.now(), area });
    setErr("");
  };
  const recStart = useRef(0);
  // 녹화 중 — 막대·판서 도구·알림을 숨긴다 (녹화에 안 찍히게). 오른쪽 끝(막대)·아래 끝(판서 도구)에 마우스를 대면 그동안만 보인다
  const [peek, setPeek] = useState<"" | "bar" | "ink">("");
  const peekT = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!rec) { setPeek(""); return; }
    const mv = (e: MouseEvent) => {
      const edge = e.clientX > window.innerWidth - 24 ? "bar" : e.clientY > window.innerHeight - 24 && inkOn ? "ink" : "";
      if (edge) { if (peekT.current) clearTimeout(peekT.current); setPeek(edge); }
    };
    window.addEventListener("mousemove", mv);
    return () => window.removeEventListener("mousemove", mv);
  }, [rec, inkOn]);
  const unpeekLater = (which: "bar" | "ink") => { if (peekT.current) clearTimeout(peekT.current); peekT.current = setTimeout(() => setPeek((p) => (p === which ? "" : p)), 700); }; // 그 막대가 보이는 중일 때만 숨긴다
  const keepPeek = () => { if (peekT.current) clearTimeout(peekT.current); };
  // 녹화 중에도 막대는 계속 보인다 (2026-11-05 사장님: "그냥 아까와 같이 계속 나타나게") — 숨기기는 쓰지 않음
  const barHidden = hide;
  const inkBarHidden = hide;
  const [ui, setUi] = useState(false);
  useEffect(() => { setUi(true); }, []);
  const stopRec = () => recRef.current?.stop();

  const grab = async (rect?: { x: number; y: number; w: number; h: number }) => {
    if (!(await ensureStream())) return;
    if (txt) commitTxt();
    setHide(true);
    await nextFrame(); await new Promise((r) => setTimeout(r, 200)); // 막대·알림이 사라진 화면이 공유에 들어올 때까지
    const v = videoRef.current!, vw = v.videoWidth, vh = v.videoHeight;
    if (!vw || !vh) { setHide(false); setErr("화면을 읽지 못했어요. 다시 눌러 주세요."); return; }
    const sx = vw / window.innerWidth, sy = vh / window.innerHeight;
    const r = rect || { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(r.w * sx)); c.height = Math.max(1, Math.round(r.h * sy));
    c.getContext("2d")!.drawImage(v, r.x * sx, r.y * sy, r.w * sx, r.h * sy, 0, 0, c.width, c.height);
    setHide(false);
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
    const name = `화면캡쳐_${stamp()}.png`;
    let copied = false, folder = false;
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); copied = true; } catch { /* 클립보드 막힘 */ }
    try { folder = await saveToFolder("capture", [today()], name, blob); } catch { /* 폴더 없음 */ }
    if (!folder) download(name, blob);
    setToast((old) => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(blob), name, size: `${c.width}×${c.height}`, folder, copied, blob }; });
    setErr("");
  };
  const download = (name: string, blob: Blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  // 알림은 8초 뒤 저절로 (마우스를 올리면 그대로)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const later = () => { if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 8000); };
  useEffect(() => { if (toast) later(); }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 영역 고르기 (앱 select.html 그대로) ── */
  const drawSel = () => {
    const c = S.current; if (!c) return;
    const g = c.getContext("2d")!, W = window.innerWidth, H = window.innerHeight, R = window.devicePixelRatio || 1;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(0,0,0,0.38)";
    const { a, b } = sel.current;
    const r = a && b ? { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) } : null;
    if (!r) { g.fillRect(0, 0, W, H); return; }
    g.fillRect(0, 0, W, r.y); g.fillRect(0, r.y + r.h, W, H - r.y - r.h); g.fillRect(0, r.y, r.x, r.h); g.fillRect(r.x + r.w, r.y, W - r.x - r.w, r.h);
    g.strokeStyle = "#3b82f6"; g.lineWidth = 2; g.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
    const t = `${Math.round(r.w * R)} × ${Math.round(r.h * R)}`;
    g.font = `700 13px ${FONT}`;
    const tw = g.measureText(t).width + 14, ty = r.y > 30 ? r.y - 28 : r.y + r.h + 6;
    g.fillStyle = "rgba(17,20,28,0.9)"; g.fillRect(r.x, ty, tw, 22);
    g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(t, r.x + 7, ty + 11);
  };
  useEffect(() => { if (area) { sel.current = { a: null, b: null }; fit(); } }, [area, fit]);
  const selDown = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); sel.current = { a: { x: e.clientX, y: e.clientY }, b: { x: e.clientX, y: e.clientY } }; drawSel(); };
  const selMove = (e: React.PointerEvent) => { if (sel.current.a) { sel.current.b = { x: e.clientX, y: e.clientY }; drawSel(); } };
  const selUp = () => {
    const { a, b } = sel.current;
    sel.current = { a: null, b: null };
    const r = a && b ? { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) } : null;
    if (r && r.w >= 8 && r.h >= 8) { setArea(false); if (selFor === "rec") void startRec(r); else void grab(r); } else drawSel();
  };

  const close = () => { if (rec) return; stopStream(); setOpen(false); setInkOn(false); setInk({ drawing: false, board: "" }); setArea(false); strokes.current = { screen: [], board: [] }; setTxt(null); setErr(""); setToast(null); };
  const pickSaveFolder = async () => {
    const st = await folderState().catch(() => null);
    if (st?.set && !st.granted) { if (await allowFolder()) setErr(""); return; }
    try { await pickFolder(); setErr(""); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  /* ── 막대 끌어 옮기기 (• • •) ── */
  const dragBar = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
    const box = (el.parentElement as HTMLElement).getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, r0 = window.innerWidth - box.right, t0 = box.top;
    el.onpointermove = (m) => setBarPos({ right: Math.max(0, r0 - (m.clientX - sx)), top: Math.max(0, t0 + (m.clientY - sy)) });
    el.onpointerup = () => { el.onpointermove = null; };
  };

  /* ── 모양 (앱 css 그대로) ── */
  const vBtn = (k: string, name: string, title: string, fn: () => void, cls: "" | "small" | "on" = "", off = false) => (
    <button type="button" title={title} disabled={off} onClick={fn} className="gwc-b"
      style={{ height: cls === "small" ? 34 : 52, border: "1px solid transparent", borderRadius: 9, background: cls === "on" ? "#2563eb" : "transparent", color: cls === "on" ? "#fff" : "#e5e7eb", fontFamily: FONT, fontSize: cls === "small" ? 11 : 11.5, fontWeight: 700, cursor: off ? "default" : "pointer", display: "flex", flexDirection: cls === "small" ? "row" : "column", alignItems: "center", justifyContent: "center", gap: cls === "small" ? 4 : 3, padding: 0, opacity: off ? 0.35 : 1 }}>
      <Svg k={k} /><span>{name}</span>
    </button>
  );
  const hBtn = (inner: React.ReactNode, on: boolean, title: string, fn: () => void, extra: React.CSSProperties = {}) => (
    <button type="button" title={title} onClick={() => { setMenu(false); fn(); }} className="gwc-b"
      style={{ height: 36, minWidth: 36, padding: "0 8px", border: "1px solid transparent", borderRadius: 8, background: on ? (ink.drawing ? "#2563eb" : "rgba(255,255,255,0.14)") : "transparent", color: on && ink.drawing ? "#fff" : "#e5e7eb", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, ...extra }}>
      {inner}
    </button>
  );
  const sepH = <span style={{ width: 1, height: 26, background: "rgba(255,255,255,0.16)", margin: "0 4px" }} />;
  const sepV = <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "4px 2px" }} />;
  const lab = (t: string) => <div style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.45)", textAlign: "center", margin: "4px 0 1px" }}>{t}</div>;
  const pickTool = (t: Tool) => setInk({ tool: t, drawing: true });
  const shapeName = SHAPES.find(([s]) => s === shape)![1];
  const longT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longHit = useRef(false);

  return (
    <>
      <style>{`.gwc-b:hover{background:rgba(255,255,255,0.10)!important}.gwc-stop:hover{background:#b91c1c!important}.gwc-dot{animation:gwcBlink 1s infinite}@keyframes gwcBlink{50%{opacity:.25}}`}</style>
      {!open && !noLauncher && (
        <button type="button" data-gs-cap-launcher onClick={() => setOpen(true)} title="화면캡처 · 판서 — 지금 보이는 화면을 찍어 클립보드·폴더에"
          style={{ position: "fixed", right: 16, top: 232, zIndex: 900, height: 38, padding: "0 13px", borderRadius: 19, border: BORDER, background: BAR_BG, color: "#e5e7eb", fontSize: 13, fontWeight: 800, fontFamily: FONT, cursor: "pointer", boxShadow: SHADOW, display: "flex", alignItems: "center", gap: 6, ...launcherStyle }}>
          <Svg k="area" size={17} />화면캡처
        </button>
      )}

      {/* 판서 판 — 그린 것은 판서가 꺼져도 남는다 (찍힌다). 판서 중일 때만 마우스를 받는다 */}
      {open && (
        <canvas ref={D} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 9990, pointerEvents: ink.drawing ? "auto" : "none", cursor: ink.tool === "erase" ? "cell" : ink.tool === "text" ? "text" : "crosshair" }} />
      )}
      {open && txt && (
        <textarea ref={txtRef} rows={1} spellCheck={false} onInput={fitTxt}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); commitTxt(); } else if (e.key === "Escape") setTxt(null); }}
          style={{ position: "fixed", zIndex: 9991, left: txt.x - 6, top: txt.y - 4, margin: 0, padding: "2px 4px", border: "2px dashed rgba(37,99,235,.9)", borderRadius: 4, background: "transparent", outline: "none", resize: "none", overflow: "hidden", whiteSpace: "pre", font: `800 34px/1.25 ${FONT}`, minWidth: 40, color: txt.color }} />
      )}

      {ui && open && rec?.area && createPortal(
        <div style={{ position: "fixed", left: rec.area.x - 3, top: rec.area.y - 3, width: rec.area.w + 6, height: rec.area.h + 6, zIndex: 9989, border: "3px solid #ef4444", borderRadius: 2, pointerEvents: "none", boxSizing: "border-box" }} />
      , document.documentElement)}

      {/* 영역 고르기 */}
      {open && area && !hide && (
        <>
          <canvas ref={S} onPointerDown={selDown} onPointerMove={selMove} onPointerUp={selUp} onContextMenu={(e) => { e.preventDefault(); setArea(false); }}
            style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 9995, cursor: "crosshair" }} />
          <div style={{ position: "fixed", left: "50%", top: 28, transform: "translateX(-50%)", zIndex: 9996, padding: "10px 18px", borderRadius: 10, background: "rgba(17,20,28,0.88)", color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: FONT, pointerEvents: "none", whiteSpace: "nowrap" }}>
            {selFor === "rec" ? "녹화할 곳을 마우스로 끌어 고르세요 · Esc 취소" : "찍을 곳을 마우스로 끌어 고르세요 · Esc 취소"}
          </div>
        </>
      )}

      {/* 막대·알림 — 녹화 중엔 숨는다 (2026-11-05 사장님: "녹화되는 화면에 캡쳐와 판서가 안 되게") · 오른쪽·아래 끝에 마우스를 대면 잠깐 */}
      {ui && createPortal(<>
      {/* 오른쪽 세로 막대 (앱 bar.html) */}
      {open && !barHidden && (
        <div onMouseEnter={keepPeek} onMouseLeave={() => { if (rec) unpeekLater("bar"); }} style={{ position: "fixed", right: barPos?.right ?? 14, top: barPos?.top ?? "50%", transform: barPos ? undefined : "translateY(-50%)", zIndex: 9999, width: 76, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 3, padding: "6px 6px 8px", borderRadius: 14, background: BAR_BG, border: BORDER, boxShadow: SHADOW, color: "#e5e7eb", fontFamily: FONT, userSelect: "none", boxSizing: "border-box" }}>
          <div onPointerDown={dragBar} title="끌어서 옮기기" style={{ height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", color: "rgba(255,255,255,0.35)", fontSize: 12, letterSpacing: 2 }}>• • •</div>
          {lab("캡처")}
          {vBtn("area", "영역", "마우스로 끌어 고른 곳만 찍기", () => { setInk({ drawing: false }); setSelFor("shot"); setArea(true); }, area && selFor === "shot" ? "on" : "", Boolean(rec))}
          {vBtn("full", "전체", "지금 보이는 화면 전체 찍기", () => { setArea(false); void grab(); }, "", Boolean(rec))}
          {sepV}
          {lab("녹화")}
          {rec ? (<>
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 800, color: "#fca5a5", fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 26 }}>
              <span className="gwc-dot" style={{ width: 9, height: 9, borderRadius: 5, background: "#ef4444" }} />
              {(() => { void tick; const sec = Math.max(0, Math.floor((Date.now() - rec.at) / 1000)); return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`; })()}
            </div>
            <button type="button" title="녹화 끝내기 (Ctrl+Shift+4)" onPointerDown={stopRec} className="gwc-stop"
              style={{ height: 60, border: "1px solid transparent", borderRadius: 9, background: "#dc2626", color: "#fff", fontFamily: FONT, fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 0 }}>
              <Svg k="stop" /><span>녹화 끝</span>
            </button>
          </>) : (<>
            {vBtn("recFull", "전체", "이 화면 전체 녹화 — 화면 소리도 (마이크를 켜면 내 목소리도)", () => { setArea(false); void startRec(null); })}
            {vBtn("recArea", "영역", "마우스로 고른 곳만 녹화", () => { setInk({ drawing: false }); setSelFor("rec"); setArea(true); }, area && selFor === "rec" ? "on" : "")}
            {vBtn("mic", mic ? "마이크 켬" : "마이크 끔", mic ? "녹화할 때 내 목소리도 (누르면 끔)" : "녹화할 때 화면 소리만 (누르면 마이크도)", () => setMic((m) => !m), mic ? "on" : "small")}
          </>)}
          {sepV}
          {vBtn("ink", "판서", "화면 위에 펜·형광펜·글자 (F9)", () => {
            const on = !inkOn; setInkOn(on); setInk({ drawing: on });
            // 녹화 중 — 판서 도구 막대를 바로 보여 준다 (2026-11-05 사장님: "클릭하면 판서가 안 보이잖아"). 도구를 고르고 마우스를 떼면 숨는다 (3초 안 건드리면 저절로)
            if (rec && on) { setPeek("ink"); if (peekT.current) clearTimeout(peekT.current); peekT.current = setTimeout(() => setPeek(""), 3000); }
          }, inkOn ? "on" : "small")}
          {vBtn("folder", "폴더", "찍은 그림 저장 폴더 (공실뉴스\\07 화면캡쳐)", () => void pickSaveFolder(), "small")}
          {err && <div style={{ fontSize: 10.5, lineHeight: 1.35, color: "#fde68a", textAlign: "center", padding: "2px 0", wordBreak: "keep-all" }}>{err}</div>}
          <div style={{ height: 10 }} />
          {vBtn("close", "닫기", rec ? "녹화를 끝낸 뒤 닫을 수 있어요" : "막대를 닫아요 — 그린 것도 지워져요", close, "small", Boolean(rec))}
        </div>
      )}

      {/* 판서 도구 막대 — 아래 가운데 (앱 ink-bar.html) */}
      {open && inkOn && !inkBarHidden && (
        <div onMouseEnter={keepPeek} onMouseLeave={() => { if (rec) unpeekLater("ink"); }} style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 9999, height: 50, display: "flex", alignItems: "center", gap: 4, padding: "0 10px", borderRadius: 12, background: "rgba(17, 20, 28, 0.94)", border: BORDER, boxShadow: SHADOW, color: "#e5e7eb", fontFamily: FONT, userSelect: "none", whiteSpace: "nowrap" }}>
          {hBtn(<Svg k="mouse" size={18} />, !ink.drawing, "마우스 — 뒤 화면 누르기 (그린 것은 남아요)", () => setInk({ drawing: false }))}
          {TOOLS.map(([k, n]) => {
            if (k !== "shape") return <React.Fragment key={k}>{hBtn(<Svg k={k} size={18} />, ink.tool === k, n, () => pickTool(k))}</React.Fragment>;
            const cur = SHAPES.some(([s]) => s === ink.tool) ? ink.tool : shape;
            return (
              <span key="shape" style={{ position: "relative", display: "inline-flex" }}>
                <button type="button" title={`${shapeName} (길게 누르면 도형 고르기)`} className="gwc-b"
                  onPointerDown={() => { longHit.current = false; longT.current = setTimeout(() => { longHit.current = true; setMenu(true); }, 400); }}
                  onPointerUp={() => { if (longT.current) clearTimeout(longT.current); if (!longHit.current) { setMenu(false); pickTool(cur); } }}
                  onPointerLeave={() => { if (longT.current) clearTimeout(longT.current); }}
                  onContextMenu={(e) => { e.preventDefault(); if (longT.current) clearTimeout(longT.current); setMenu(true); }}
                  style={{ position: "relative", height: 36, minWidth: 36, padding: "0 8px", border: "1px solid transparent", borderRadius: 8, background: SHAPES.some(([s]) => s === ink.tool) ? (ink.drawing ? "#2563eb" : "rgba(255,255,255,0.14)") : "transparent", color: SHAPES.some(([s]) => s === ink.tool) && ink.drawing ? "#fff" : "#e5e7eb", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Svg k={cur} size={18} />
                  <span style={{ position: "absolute", right: 3, bottom: 3, borderStyle: "solid", borderWidth: 3, borderColor: "transparent currentColor currentColor transparent", opacity: 0.7 }} />
                </button>
                {menu && (
                  <div style={{ position: "absolute", bottom: 50, left: -6, display: "flex", gap: 4, padding: 5, borderRadius: 10, background: "rgba(17, 20, 28, 0.96)", border: BORDER, boxShadow: SHADOW }}>
                    {SHAPES.map(([s, nm]) => (
                      <button key={s} type="button" title={nm} onClick={() => { setShape(s); setMenu(false); pickTool(s); }} className="gwc-b"
                        style={{ height: 36, padding: "0 10px", border: "1px solid transparent", borderRadius: 8, background: ink.tool === s ? "#2563eb" : "transparent", color: "#e5e7eb", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Svg k={s} size={18} />{nm}
                      </button>
                    ))}
                  </div>
                )}
              </span>
            );
          })}
          {sepH}
          {COLORS.map((c) => (
            <button key={c} type="button" title={c} onClick={() => setInk({ color: c, tool: ink.tool === "erase" ? "pen" : ink.tool, drawing: true })}
              style={{ width: 22, height: 22, minWidth: 22, padding: 0, borderRadius: 11, border: `2px solid ${ink.color === c ? "#fff" : "rgba(255,255,255,0.25)"}`, boxShadow: ink.color === c ? "0 0 0 2px #2563eb" : "none", background: c, backgroundClip: "padding-box", cursor: "pointer", margin: "0 2px" }} />
          ))}
          {sepH}
          {hBtn("흰 칠판", ink.board === "white", "흰 칠판으로 덮고 쓰기 (다시 누르면 원래 화면)", () => setInk({ board: ink.board === "white" ? "" : "white", drawing: true }))}
          {hBtn("검은 칠판", ink.board === "black", "검은 칠판으로 덮고 쓰기 (다시 누르면 원래 화면)", () => setInk({ board: ink.board === "black" ? "" : "black", color: ink.board !== "black" && ink.color === "#111827" ? "#ffffff" : ink.color, drawing: true }))}
          {sepH}
          {hBtn(<Svg k="undo" size={18} />, false, "되돌리기 (Ctrl+Z)", () => { list().pop(); draw(); })}
          {hBtn("전체 지우기", false, "그린 것 모두 지우기", () => { list().length = 0; setTxt(null); draw(); })}
          {ink.drawing
            ? hBtn("판서 끝 · F9", false, "판서 끄기 (F9 · Esc) — 그린 것은 남고, 마우스는 뒤 화면을 눌러요", () => setInk({ drawing: false }), { marginLeft: 8, background: "#374151" })
            : hBtn("판서 시작 · F9", false, "판서 켜기 (F9) — 도구를 눌러도 켜져요", () => setInk({ drawing: true }), { marginLeft: 8, background: "#2563eb", color: "#fff" })}
        </div>
      )}

      {/* 찍은 뒤 알림 (앱 toast.html) */}
      {open && toast && !hide && (
        <div onMouseEnter={() => { if (toastTimer.current) clearTimeout(toastTimer.current); }} onMouseLeave={later}
          style={{ position: "fixed", right: 104, bottom: inkOn ? 86 : 20, zIndex: 9999, width: 332, height: 272, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, background: "rgba(17, 20, 28, 0.96)", border: BORDER, boxShadow: SHADOW, color: "#e5e7eb", fontFamily: FONT, userSelect: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 10, background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800 }}>{toast.video ? "녹화했어요" : "찍었어요"}</span>
            <button type="button" title="닫기" onClick={() => setToast(null)} className="gwc-b" style={{ width: 26, height: 26, border: "none", borderRadius: 6, background: "transparent", color: "#9ca3af", fontSize: 16, cursor: "pointer" }}>✕</button>
          </div>
          <div title={toast.name} style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{toast.name} · {toast.size}</div>
          <div style={{ fontSize: 12, color: toast.video ? "#86efac" : toast.copied ? "#86efac" : "#fde68a" }}>{toast.video ? (toast.folder ? `공실뉴스\\07 화면캡쳐\\${today()} 에 저장했어요` : "다운로드 폴더에 저장했어요") : toast.copied ? "클립보드에 복사했어요 — 카톡·블로그에 Ctrl+V" : "클립보드에 넣지 못했어요 — 저장된 파일을 써 주세요"}</div>
          {toast.video
            ? <video src={toast.url} controls muted style={{ flex: 1, minHeight: 0, width: "100%", borderRadius: 6, background: "#000" }} />
            : <div style={{ flex: 1, minHeight: 0, borderRadius: 6, background: `#000 url('${toast.url}') center/contain no-repeat` }} />}
          <div style={{ display: "flex", gap: 6 }}>
            {!toast.video && <button type="button" className="gwc-b" onClick={() => void navigator.clipboard.write([new ClipboardItem({ "image/png": toast.blob })]).then(() => setToast({ ...toast, copied: true })).catch(() => {})}
              style={{ flex: 1, height: 32, border: "1px solid #2563eb", borderRadius: 7, background: "#2563eb", color: "#fff", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>다시 복사</button>}
            <button type="button" className="gwc-b" onClick={() => download(toast.name, toast.blob)} title={toast.folder ? `공실뉴스\\07 화면캡쳐\\${today()} 에 저장했어요` : "다운로드 폴더에 저장했어요"}
              style={{ flex: 1, height: 32, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 7, background: "transparent", color: "#e5e7eb", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{toast.folder ? "폴더에 저장됨 · 내려받기" : "내려받기"}</button>
          </div>
        </div>
      )}
      </>, document.documentElement)}
    </>
  );
}

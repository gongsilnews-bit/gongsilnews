"use client";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

/* 복사 — 클립보드 API 가 막힌 브라우저(어사이드 등)는 예전 방식(execCommand)으로 (2026-11-10 사장님: "어사이드에서 복사 붙여넣기가 안되네") */
async function copyText(s: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(s); return true; } catch { /* 아래 */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = s; ta.setAttribute("readonly", ""); Object.assign(ta.style, { position: "fixed", left: "-9999px", top: "0", opacity: "0" });
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, s.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}

/**
 * 웹에서 회원 본인 AI 에게 묻기 (2026-11-03 사장님: 웹 뉴스·SNS자동화도 앱과 같이)
 *
 * 앱은 회원 AI 창에 질문을 넣고 답을 읽어 오지만, 웹은 서버 AI 를 쓰지 않는다 (회원 글쓰기에 서버 API 금지).
 *  1. 질문을 복사해 두고 새 탭에 회원이 고른 AI(ChatGPT · Gemini · Claude)를 연다
 *  2. 회원이 답의 코드 상자 [복사]를 누르고 돌아오면 클립보드에서 답을 읽어 check() 로 확인한다
 * 화면은 웹 기사쓰기(ArticleAiTool)의 어두운 안내 창과 같다.
 */

export const WEB_AI = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com/app" },
  { id: "claude", name: "Claude", url: "https://claude.ai/new" },
];
const KEY = "gs-web-ai"; // 웹 기사쓰기와 같은 기억
export const webAiId = () => {
  try { return localStorage.getItem(KEY) || "chatgpt"; } catch { return "chatgpt"; }
};
export const webAi = () => WEB_AI.find((x) => x.id === webAiId()) || WEB_AI[0];
export const setWebAiId = (id: string) => {
  try { localStorage.setItem(KEY, id); } catch { /* */ }
  window.dispatchEvent(new CustomEvent("gs-web-ai"));
};

/**
 * AI 창 자리 (2026-11-04 사장님: "크롬이 이 위치에 떴으면") — 새 탭 대신 오른쪽 결과 칸(data-ai-dock) 위에 작은 크롬 창으로 띄운다.
 *  결과 칸이 없는 화면(보고서 등)은 화면 오른쪽 60%. 화면 좌표는 크롬 확대(%)를 셈해서 맞춘다
 */
type Dock = { x: number; y: number; w: number; h: number }; // 페이지 안 (CSS px)
export function dockArea(): Dock {
  const el = document.querySelector("[data-ai-dock]") as HTMLElement | null;
  const r = el && el.offsetParent !== null ? el.getBoundingClientRect() : null;
  if (r && r.width > 320 && r.height > 300) return { x: r.left, y: r.top, w: r.width, h: r.height };
  const x = Math.round(window.innerWidth * 0.4);
  return { x, y: 60, w: window.innerWidth - x, h: window.innerHeight - 60 };
}
function popupFeatures(d: Dock): string {
  const zoom = Math.round((window.outerWidth / window.innerWidth) * 20) / 20 || 1; // 크롬 확대 (테두리 몇 px 은 버림)
  const side = Math.max(0, (window.outerWidth - window.innerWidth * zoom) / 2);
  const topBar = Math.max(0, window.outerHeight - window.innerHeight * zoom - side);
  const left = Math.round(window.screenX + side + d.x * zoom);
  const top = Math.round(window.screenY + topBar + d.y * zoom);
  return `popup=yes,left=${left},top=${top},width=${Math.round(d.w * zoom)},height=${Math.round(d.h * zoom)}`;
}
let aiWin: Window | null = null;

/**
 * 네이버 블로그·SNS 글쓰기 화면도 AI 창처럼 오른쪽 결과 칸 위에 작은 크롬 창으로 (2026-11-04 사장님: "채우기 할 때 뜨는 크롬창도 AI 창처럼 위에")
 *  같은 이름 창을 다시 쓴다. 창이 막히면 새 탭으로
 */
export function openDocked(url: string, name = "gs-fill-window"): Window | null {
  const w = window.open(url, name, popupFeatures(dockArea())) || window.open(url, "_blank");
  try { w?.focus(); } catch { /* */ }
  return w;
}

function mount<T>(render: (done: (v: T) => void) => React.ReactNode): Promise<T> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: T) => {
      root.unmount();
      host.remove();
      resolve(v);
    };
    root.render(render(done));
  });
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, marginLeft: 8, verticalAlign: "middle" }} aria-hidden>
      <style>{`@keyframes gsDotW{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}`}</style>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: `gsDotW 1.2s ${i * 0.18}s infinite ease-in-out` }} />)}
    </span>
  );
}

const gb: React.CSSProperties = { height: 34, padding: "0 12px", borderRadius: 6, border: "1px solid #475569", background: "#1e293b", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };

/** check(text) — 답이 맞으면 결과, 아니면 회원에게 보일 말(string)을 던진다 */
type Check<T> = (text: string) => Promise<T>;

function AskBox<T>({ prompt, what, check, done }: { prompt: string; what: string; check: Check<T>; done: (v: { ok: true; value: T } | { ok: false }) => void }) {
  const [site] = useState(webAi());
  const [sec, setSec] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState(""); // 클립보드를 못 읽을 때 직접 붙여 넣기
  const [manual, setManual] = useState(false);
  const busyRef = useRef(false);
  // AI 창이 오른쪽 결과 칸을 덮으니, 안내 창은 그 왼쪽 빈 자리 가운데에 (자리가 좁으면 예전처럼 화면 가운데)
  const [dock] = useState(dockArea);
  const leftRoom = dock.x > 420 ? dock.x : 0;
  const boxW = leftRoom ? Math.min(620, leftRoom - 40) : 620;
  const stop = () => done({ ok: false });

  const tryText = async (raw: string, quiet: boolean) => {
    if (busyRef.current) return;
    const t = raw.trim();
    if (!t || t === prompt.trim()) { if (!quiet) setMsg("아직 질문이 복사돼 있어요. AI 답의 코드 상자 오른쪽 위 [복사]를 누르고 돌아오세요."); return; }
    if (t.indexOf("{") < 0) { if (!quiet) setMsg("복사한 글이 AI 답 모양이 아니에요. 답이 다 나온 뒤 코드 상자의 [복사]를 눌러 주세요."); return; }
    busyRef.current = true;
    setBusy(true);
    try {
      const value = await check(t);
      try { aiWin?.close(); } catch { /* */ } // 답을 받았으면 AI 창은 닫는다 (결과 칸이 보이게)
      aiWin = null;
      done({ ok: true, value });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const fromClipboard = async (quiet: boolean) => {
    let raw = "";
    try { raw = await navigator.clipboard.readText(); } catch {
      if (!quiet) { setManual(true); setMsg("클립보드를 읽지 못했어요. 브라우저가 묻는 [허용]을 누르거나 아래 칸에 직접 붙여 넣어 주세요."); }
      return;
    }
    await tryText(raw, quiet);
  };
  const open = async () => {
    let copied = true;
    if (!(await copyText(prompt))) { copied = false; setManual(true); }
    // noopener 를 주면 열려도 null 이라 막힘을 알 수 없다 — 열고 나서 끊는다
    // 오른쪽 결과 칸 위에 작은 크롬 창으로 (같은 이름 = 다시 누르면 그 창을 다시 씀). 창이 막히면 새 탭으로
    const w = window.open(site.url, "gs-ai-window", popupFeatures(dockArea())) || window.open(site.url, "_blank");
    if (w) { aiWin = w; try { w.opener = null; } catch { /* */ } try { w.focus(); } catch { /* */ } }
    else setMsg(`창이 막혔어요. 위 [질문 다시 복사하고 ${site.name} 열기]를 눌러 주세요.`);
    if (!copied) setMsg("질문을 복사하지 못했어요. 아래 [질문 복사]를 눌러 주세요.");
  };

  useEffect(() => {
    void open();
    const t = window.setInterval(() => setSec((x) => x + 1), 1000);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") stop(); };
    const back = () => { if (document.visibilityState === "visible") window.setTimeout(() => void fromClipboard(true), 250); };
    window.addEventListener("keydown", k);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", back);
    return () => { window.clearInterval(t); window.removeEventListener("keydown", k); window.removeEventListener("focus", back); document.removeEventListener("visibilitychange", back); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,14,20,.62)", display: "flex", alignItems: "center", justifyContent: leftRoom ? "flex-start" : "center", padding: 20, paddingLeft: leftRoom ? Math.max(20, (leftRoom - boxW) / 2) : 20, fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <div style={{ position: "relative", width: boxW, maxWidth: "100%", background: "#16202b", color: "#e5e7eb", borderRadius: 14, padding: "26px 30px 20px", boxShadow: "0 20px 60px rgba(0,0,0,.35)", textAlign: "center" }}>
        <button type="button" onClick={stop} title="멈추기 (Esc)" style={{ position: "absolute", top: 12, right: 14, border: 0, background: "none", color: "#cbd5e1", fontSize: 20, cursor: "pointer" }}>×</button>
        <div style={{ fontSize: 18.5, fontWeight: 800, color: "#fff", marginBottom: 14 }}>{site.name} 내 계정(무료·수동)으로 {what}<Dots /></div>
        <div style={{ textAlign: "left", lineHeight: 1.75, fontSize: 14, maxWidth: 540, margin: "0 auto" }}>
          <b>1.</b> 질문을 복사해 두고 오른쪽에 <b>{site.name}</b> 창을 열었어요. 입력칸에 <b>붙여 넣기(Ctrl+V)</b> 하고 보내세요.<br />
          <b>2.</b> 답이 다 나오면 답 안의 <b>코드 상자 오른쪽 위 [복사]</b>를 누르고 이 창으로 돌아오세요 — 알아서 가져와요.
        </div>
        {/* AI 고르기는 왼쪽 위 [AI 설정]에서만 (2026-11-04 사장님: 쓰는 중 창에는 의미 없음) */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { void open(); setMsg("질문을 다시 복사했어요. 입력칸에 Ctrl+V 하고 보내세요."); }} style={gb}>질문 다시 복사하고 {site.name} 열기</button>
          <button type="button" onClick={() => void fromClipboard(false)} disabled={busy} style={gb}>{busy ? "답을 나누는 중…" : "복사한 답 가져오기"}</button>
        </div>
        {manual && (
          <div style={{ marginTop: 12, textAlign: "left" }}>
            {/* 복사가 막힌 브라우저 — 질문을 직접 골라 복사 (누르면 전체 선택) */}
            <textarea readOnly value={prompt} rows={3} onFocus={(e) => e.currentTarget.select()} onClick={(e) => e.currentTarget.select()} title="누르면 전체 선택돼요 — Ctrl+C 로 복사"
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#94a3b8", padding: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", marginBottom: 6 }} />
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder="AI 답을 여기에 붙여 넣으세요 (Ctrl+V)"
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #475569", background: "#0f172a", color: "#e5e7eb", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" onClick={async () => { setMsg((await copyText(prompt)) ? "질문을 복사했어요." : "질문을 복사하지 못했어요. 위 질문 칸을 눌러 Ctrl+C 해 주세요."); }} style={{ ...gb, height: 30 }}>질문 복사</button>
              <button type="button" onClick={() => void tryText(paste, false)} disabled={busy} style={{ ...gb, height: 30, background: "#2563eb", borderColor: "#2563eb" }}>붙여 넣은 답 쓰기</button>
            </div>
          </div>
        )}
        {msg && <div style={{ marginTop: 10, color: "#fbbf24", fontSize: 13, lineHeight: 1.6 }}>{msg}</div>}
        <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: "#60a5fa" }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>급할 때는 오른쪽 위 × 나 Esc 키로 멈춰요{!manual && <> · <button type="button" onClick={() => setManual(true)} style={{ border: 0, background: "none", color: "#93c5fd", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>직접 붙여 넣기</button></>}</div>
      </div>
    </div>
  );
}

/** 질문을 회원 AI 에게 — 답을 check 가 받아들이면 그 결과, 회원이 멈추면 "그만뒀어요" 오류 */
export async function webAsk<T>(prompt: string, what: string, check: Check<T>): Promise<T> {
  const r = await mount<{ ok: true; value: T } | { ok: false }>((done) => <AskBox prompt={prompt} what={what} check={check} done={done} />);
  if (!r.ok) throw new Error("AI 쓰기를 그만뒀어요.");
  return r.value;
}

/* ── AI 사진 만들기 (2026-11-04 사장님: 블로그에 내 사진뿐 아니라 AI 사진도) ──
 *  질문을 복사해 오른쪽 옆 창에 ChatGPT·Gemini 를 연다 (Claude 는 그림을 못 그려서 뺀다)
 *  회원이 그림을 [복사]하고 돌아오면 클립보드에서 그림을 읽는다. 안 되면 Ctrl+V · 끌어 놓기 · [내려받은 그림 고르기] */
const IMG_AI = WEB_AI.filter((x) => x.id !== "claude");
const IMG_KEY = "gs-web-ai-img"; // [AI 설정] 이미지 칸 (글쓰기 AI 와 따로)
export const webImgAiId = () => {
  try { const v = localStorage.getItem(IMG_KEY); return IMG_AI.some((x) => x.id === v) ? v! : "chatgpt"; } catch { return "chatgpt"; }
};
export const webImgAi = () => IMG_AI.find((x) => x.id === webImgAiId()) || IMG_AI[0];
export const setWebImgAiId = (id: string) => {
  try { localStorage.setItem(IMG_KEY, id); } catch { /* */ }
  window.dispatchEvent(new CustomEvent("gs-web-ai"));
};
const fileToDataUrl = (f: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });

function ImageAskBox({ prompt, done }: { prompt: string; done: (v: string | null) => void }) {
  const [site] = useState(webImgAi); // [AI 설정] 이미지 칸에서 고른 것
  const [sec, setSec] = useState(0);
  const [msg, setMsg] = useState("");
  const [over, setOver] = useState(false);
  const [dock] = useState(dockArea);
  const leftRoom = dock.x > 420 ? dock.x : 0;
  const boxW = leftRoom ? Math.min(620, leftRoom - 40) : 620;
  const gotRef = useRef(false);
  const take = (dataUrl: string) => {
    if (gotRef.current) return;
    gotRef.current = true;
    try { aiWin?.close(); } catch { /* */ }
    aiWin = null;
    done(dataUrl);
  };
  const fromBlob = async (b: Blob | null | undefined) => { if (b && b.type.startsWith("image/")) take(await fileToDataUrl(b)); };
  const fromClipboard = async (quiet: boolean) => {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const t = it.types.find((x) => x.startsWith("image/"));
        if (t) { await fromBlob(await it.getType(t)); return; }
      }
      if (!quiet) setMsg("복사된 그림이 없어요. AI 창에서 그림을 누르고 [복사]를 한 뒤 돌아오세요.");
    } catch {
      if (!quiet) setMsg("클립보드를 읽지 못했어요. 이 창에서 Ctrl+V 하거나, 내려받은 그림을 끌어다 놓아 주세요.");
    }
  };
  const open = async () => {
    if (!(await copyText(prompt))) setMsg("질문을 복사하지 못했어요. 아래 [질문 복사]를 눌러 주세요.");
    const w = window.open(site.url, "gs-ai-window", popupFeatures(dockArea())) || window.open(site.url, "_blank");
    if (w) { aiWin = w; try { w.opener = null; } catch { /* */ } try { w.focus(); } catch { /* */ } }
    else setMsg(`창이 막혔어요. [질문 다시 복사하고 ${site.name} 열기]를 눌러 주세요.`);
  };
  const pickFile = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.onchange = () => void fromBlob(i.files?.[0]);
    i.click();
  };
  useEffect(() => {
    void open(); // eslint-disable-line react-hooks/set-state-in-effect -- 창이 뜨자마자 AI 옆 창을 연다 (글쓰기 창과 같음)
    const t = window.setInterval(() => setSec((x) => x + 1), 1000);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") done(null); };
    const back = () => { if (document.visibilityState === "visible") window.setTimeout(() => void fromClipboard(true), 250); };
    const paste = (e: ClipboardEvent) => { const f = Array.from(e.clipboardData?.files || []).find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); void fromBlob(f); } };
    window.addEventListener("keydown", k);
    window.addEventListener("focus", back);
    window.addEventListener("paste", paste);
    document.addEventListener("visibilitychange", back);
    return () => { window.clearInterval(t); window.removeEventListener("keydown", k); window.removeEventListener("focus", back); window.removeEventListener("paste", paste); document.removeEventListener("visibilitychange", back); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void fromBlob(Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"))); }}
      style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,14,20,.62)", display: "flex", alignItems: "center", justifyContent: leftRoom ? "flex-start" : "center", padding: 20, paddingLeft: leftRoom ? Math.max(20, (leftRoom - boxW) / 2) : 20, fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <div style={{ position: "relative", width: boxW, maxWidth: "100%", background: "#16202b", color: "#e5e7eb", borderRadius: 14, padding: "26px 30px 20px", boxShadow: "0 20px 60px rgba(0,0,0,.35)", textAlign: "center", outline: over ? "3px dashed #60a5fa" : "none", outlineOffset: -8 }}>
        <button type="button" onClick={() => done(null)} title="멈추기 (Esc)" style={{ position: "absolute", top: 12, right: 14, border: 0, background: "none", color: "#cbd5e1", fontSize: 20, cursor: "pointer" }}>×</button>
        <div style={{ fontSize: 18.5, fontWeight: 800, color: "#fff", marginBottom: 14 }}>{site.name} 내 계정으로 AI 사진을 만들고 있습니다<Dots /></div>
        <div style={{ textAlign: "left", lineHeight: 1.75, fontSize: 14, maxWidth: 540, margin: "0 auto" }}>
          <b>1.</b> 질문을 복사해 두고 오른쪽에 <b>{site.name}</b> 창을 열었어요. 입력칸에 <b>붙여 넣기(Ctrl+V)</b> 하고 보내세요.<br />
          <b>2.</b> 그림이 나오면 그림 위 <b>[복사]</b>(또는 오른쪽 클릭 → 이미지 복사)를 누르고 이 창으로 돌아오세요 — 알아서 넣어요.<br />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>그림을 내려받았다면 이 창에 끌어다 놓거나 [내려받은 그림 고르기]를 눌러도 돼요.</span>
        </div>
        {/* AI 고르기는 [AI 설정] 이미지 칸에서만 (ChatGPT·Gemini) */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { void open(); setMsg("질문을 다시 복사했어요. 입력칸에 Ctrl+V 하고 보내세요."); }} style={gb}>질문 다시 복사하고 {site.name} 열기</button>
          <button type="button" onClick={() => void fromClipboard(false)} style={gb}>복사한 그림 가져오기</button>
          <button type="button" onClick={pickFile} style={gb}>내려받은 그림 고르기</button>
        </div>
        {msg && <div style={{ marginTop: 10, color: "#fbbf24", fontSize: 13, lineHeight: 1.6 }}>{msg}</div>}
        <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: "#60a5fa" }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>그림은 1~2분 걸려요 · 급할 때는 오른쪽 위 × 나 Esc 키로 멈춰요</div>
      </div>
    </div>
  );
}

/** AI 사진 — 회원 AI 옆 창에서 그린 그림(data URL). 멈추면 "그만뒀어요" 오류 */
export async function webAskImage(prompt: string): Promise<string> {
  const r = await mount<string | null>((done) => <ImageAskBox prompt={prompt} done={done} />);
  if (!r) throw new Error("AI 사진 만들기를 그만뒀어요.");
  return r;
}

/** [AI 설정] — 웹은 쓸 AI 하나만 고른다 (내 계정 · 새 탭) */
export function chooseWebAi(): Promise<void> {
  return mount<void>((done) => <AiPicker done={done} />);
}
/* [AI 설정] 두 칸 (2026-11-04 사장님): 글쓰기 = ChatGPT·Gemini·Claude / 이미지 = ChatGPT·Gemini 만 */
function AiPicker({ done }: { done: () => void }) {
  const [cur, setCur] = useState(webAiId());
  const [img, setImg] = useState(webImgAiId());
  const group = (title: string, sub: string, list: typeof WEB_AI, on: string, pick: (id: string) => void) => (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{title}</span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${list.length}, 1fr)`, gap: 8 }}>
        {list.map((o) => (
          <button key={o.id} type="button" onClick={() => pick(o.id)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              border: `1px solid ${on === o.id ? "#1a3a6b" : "#e5e7eb"}`, background: on === o.id ? "rgba(26,58,107,0.06)" : "#fff", color: "#111827" }}>
            <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: "50%", border: `2px solid ${on === o.id ? "#1a3a6b" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {on === o.id && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a3a6b" }} />}
            </span>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div onClick={() => done()} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "100%", background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 6 }}>AI 설정</div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>내 AI 계정을 옆 창에 열어 씁니다. 질문을 붙여 넣고 답을 복사해 오면 채워져요. 따로 돈이 들지 않습니다.</div>
        {group("글쓰기", "기사 · 블로그 · SNS · 대본", WEB_AI, cur, (id) => { setWebAiId(id); setCur(id); })}
        {group("이미지", "AI 사진 만들기", IMG_AI, img, (id) => { setWebImgAiId(id); setImg(id); })}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" onClick={() => done()} style={{ padding: "9px 18px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>확인</button>
        </div>
      </div>
    </div>
  );
}

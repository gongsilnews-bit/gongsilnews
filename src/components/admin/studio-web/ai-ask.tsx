"use client";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

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
  const [site, setSite] = useState(webAi());
  const [sec, setSec] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState(""); // 클립보드를 못 읽을 때 직접 붙여 넣기
  const [manual, setManual] = useState(false);
  const busyRef = useRef(false);
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
    try { await navigator.clipboard.writeText(prompt); } catch { copied = false; setManual(true); }
    // noopener 를 주면 열려도 null 이라 막힘을 알 수 없다 — 열고 나서 끊는다
    const w = window.open(site.url, "_blank");
    if (w) { try { w.opener = null; } catch { /* */ } }
    else setMsg(`새 탭이 막혔어요. 위 [질문 다시 복사하고 ${site.name} 열기]를 눌러 주세요.`);
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
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,14,20,.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <div style={{ position: "relative", width: 620, maxWidth: "100%", background: "#16202b", color: "#e5e7eb", borderRadius: 14, padding: "26px 30px 20px", boxShadow: "0 20px 60px rgba(0,0,0,.35)", textAlign: "center" }}>
        <button type="button" onClick={stop} title="멈추기 (Esc)" style={{ position: "absolute", top: 12, right: 14, border: 0, background: "none", color: "#cbd5e1", fontSize: 20, cursor: "pointer" }}>×</button>
        <div style={{ fontSize: 18.5, fontWeight: 800, color: "#fff", marginBottom: 14 }}>{site.name} 내 계정(무료·수동)으로 {what}<Dots /></div>
        <div style={{ textAlign: "left", lineHeight: 1.75, fontSize: 14, maxWidth: 540, margin: "0 auto" }}>
          <b>1.</b> 질문을 복사해 두고 새 탭에 <b>{site.name}</b> 창을 열었어요. 입력칸에 <b>붙여 넣기(Ctrl+V)</b> 하고 보내세요.<br />
          <b>2.</b> 답이 다 나오면 답 안의 <b>코드 상자 오른쪽 위 [복사]</b>를 누르고 이 창으로 돌아오세요 — 알아서 가져와요.
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          {WEB_AI.map((o) => (
            <button key={o.id} type="button" onClick={() => { setWebAiId(o.id); setSite(o); }}
              style={{ ...gb, height: 28, fontSize: 12.5, background: site.id === o.id ? "#2563eb" : "#1e293b", borderColor: site.id === o.id ? "#2563eb" : "#475569" }}>{o.name}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { void open(); setMsg("질문을 다시 복사했어요. 입력칸에 Ctrl+V 하고 보내세요."); }} style={gb}>질문 다시 복사하고 {site.name} 열기</button>
          <button type="button" onClick={() => void fromClipboard(false)} disabled={busy} style={gb}>{busy ? "답을 나누는 중…" : "복사한 답 가져오기"}</button>
        </div>
        {manual && (
          <div style={{ marginTop: 12, textAlign: "left" }}>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder="AI 답을 여기에 붙여 넣으세요 (Ctrl+V)"
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #475569", background: "#0f172a", color: "#e5e7eb", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setMsg("질문을 복사했어요."); } catch { setMsg("질문을 복사하지 못했어요."); } }} style={{ ...gb, height: 30 }}>질문 복사</button>
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

/** [AI 설정] — 웹은 쓸 AI 하나만 고른다 (내 계정 · 새 탭) */
export function chooseWebAi(): Promise<void> {
  return mount<void>((done) => <AiPicker done={done} />);
}
function AiPicker({ done }: { done: () => void }) {
  const [cur, setCur] = useState(webAiId());
  return (
    <div onClick={() => done()} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: "100%", background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 6 }}>AI 설정</div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 14 }}>웹에서는 내 AI 계정을 새 탭에 열어 씁니다. 질문을 붙여 넣고 답을 복사해 오면 글이 채워져요. 따로 돈이 들지 않습니다.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {WEB_AI.map((o) => (
            <button key={o.id} type="button" onClick={() => { setWebAiId(o.id); setCur(o.id); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                border: `1px solid ${cur === o.id ? "#1a3a6b" : "#e5e7eb"}`, background: cur === o.id ? "rgba(26,58,107,0.06)" : "#fff", color: "#111827" }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${cur === o.id ? "#1a3a6b" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cur === o.id && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a3a6b" }} />}
              </span>
              {o.name}
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>내 계정 · 새 탭</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12.5, color: "#6b7280", lineHeight: 1.6 }}>AI가 글을 바로 받아 넣고 화면 캡처까지 하는 자동 쓰기는 공실마케팅studio 앱에서 됩니다.</div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" onClick={() => done()} style={{ padding: "9px 18px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>확인</button>
        </div>
      </div>
    </div>
  );
}

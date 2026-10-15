"use client";

import React, { useEffect, useState } from "react";
import StudioReviseBar from "./StudioReviseBar";

/**
 * 뉴스·SNS발행 — 유튜브 대본 탭 (2026-10-15 회의)
 *
 * - 크롬 확장 4번 탭과 같은 대본 프롬프트로 회원 ChatGPT 가 쓴다. 공실은 매물용, 뉴스칼럼은 뉴스메이커용.
 * - 고르는 것: 영상 형식 · 길이(기본 60초 쇼츠) · 말투 · 숫자(기본 한글 읽기 — AI 성우가 그대로 읽게)
 * - 나오는 것: 제목 · 제목 후보 3개 · 나레이션 원고. 장면·이미지 스크립트는 없다.
 * - 원고 옆에 예상 시간(1초 5.5자), 설명란(요약·링크·출처)과 태그는 앱이 붙인다.
 * - 이용 횟수는 '유튜브'로 따로 센다 (공실·칼럼 하나 = 이번 달 1회). 수정 요청은 같은 대화에서.
 */

type Option = { id: string; label: string; structure?: string; chars?: string };
type Options = { videoTypes: Option[]; durations: Option[]; tones: Option[]; numbers: Option[]; defaults: Record<string, string> };
type Script = {
  vacancyId: string;
  settings: Record<string, string>;
  title: string;
  titles: string[];
  narration: string[];
  seconds: number;
  chars: number;
  description: { text: string; tags: string[] };
  version: string;
};
type Bridge = {
  youtube: {
    options: (id: string) => Promise<Options>;
    get: (id: string) => Promise<Script | null>;
    write: (opts: Record<string, string>) => Promise<Script>;
    revise: (opts: { vacancyId: string; request: string }) => Promise<Script>;
    save: (opts: { vacancyId: string; title?: string; narration?: string[] }) => Promise<Script>;
    exportText: (id: string) => Promise<{ folder: string; file: string }>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
const bridge = () => (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null;
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

/* 원고 길이 어림 — 확장과 같이 1초에 5.5자(공백 제외) */
const secondsOf = (text: string) => Math.round(text.replace(/\s/g, "").length / 5.5);
const clock = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`);

export default function StudioYoutubePanel({ theme, vacancyId, onUsed, onScript }: { theme: Theme; vacancyId: string; onUsed: () => void; onScript?: (has: boolean) => void }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [script, setScript] = useState<Script | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [writing, setWriting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copiedWhat, setCopiedWhat] = useState(""); // 방금 복사한 칸 (아이콘이 잠깐 ✓)

  const show = (s: Script | null) => {
    setScript(s);
    onScript?.(Boolean(s));
    setTitle(s?.title || "");
    setText((s?.narration || []).join("\n\n"));
  };

  useEffect(() => {
    const b = bridge();
    if (!b) return;
    b.youtube.options(vacancyId).then((o) => {
      setOpts(o);
      setPick(o.defaults);
    }).catch(() => {});
    b.youtube.get(vacancyId).then((s) => {
      show(s);
      if (s?.settings) setPick((p) => ({ ...p, ...s.settings }));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancyId]);

  const write = async () => {
    const b = bridge();
    if (!b) return;
    setWriting(true);
    setError("");
    setNote("");
    const off = b.youtube.onProgress(setProgress);
    try {
      show(await b.youtube.write({ vacancyId, ...pick }));
    } catch (e) {
      setError(cleanErr(e));
    } finally {
      off();
      setProgress("");
      setWriting(false);
      onUsed();
    }
  };

  const persist = async (patch: { title?: string; narration?: string[] }) => {
    const b = bridge();
    if (!b || !script) return;
    try {
      setScript(await b.youtube.save({ vacancyId, ...patch }));
    } catch (e) {
      setError(cleanErr(e));
    }
  };
  const paragraphs = () => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const revise = async (request: string, onProgress: (t: string) => void) => {
    const b = bridge();
    if (!b) return;
    await b.youtube.save({ vacancyId, title, narration: paragraphs() });
    const off = b.youtube.onProgress(onProgress);
    try {
      show(await b.youtube.revise({ vacancyId, request }));
    } finally {
      off();
    }
  };

  const copy = async (value: string, msg: string, what = "") => {
    try {
      await navigator.clipboard.writeText(value);
      setNote(msg);
      setCopiedWhat(what);
      setTimeout(() => setCopiedWhat(""), 1500);
    } catch {
      setError("복사하지 못했습니다.");
    }
  };
  const exportText = async () => {
    const b = bridge();
    if (!b) return;
    setError("");
    try {
      await persist({ title, narration: paragraphs() });
      const r = await b.youtube.exportText(vacancyId);
      setNote(`대본을 저장하고 폴더를 열었습니다: ${r.folder}`);
    } catch (e) {
      setError(cleanErr(e));
    }
  };

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const chip = (on: boolean): React.CSSProperties => ({
    padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
    border: `1px solid ${on ? "#1a3a6b" : theme.border}`, background: on ? "#1a3a6b" : "transparent", color: on ? "#fff" : theme.textPrimary,
  });
  const row = (label: string, key: string, list: Option[] | undefined, extra?: (o: Option) => string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      <span style={{ width: 64, fontSize: 13, fontWeight: 700, color: theme.textSecondary }}>{label}</span>
      {(list || []).map((o) => (
        <button key={o.id} onClick={() => setPick((p) => ({ ...p, [key]: o.id }))} title={o.structure ? `흐름: ${o.structure}` : undefined} style={chip(pick[key] === o.id)}>
          {o.label}{extra ? extra(o) : ""}
        </button>
      ))}
    </div>
  );
  const area: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "12px 14px", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 14.5, lineHeight: 1.85, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit", resize: "vertical" };
  const btn = (primary = false): React.CSSProperties => ({
    padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer",
    border: primary ? 0 : `1px solid ${theme.border}`, background: primary ? "#1a3a6b" : theme.cardBg, color: primary ? "#fff" : theme.textPrimary,
  });
  const liveSeconds = secondsOf(text);
  /* SNS 글 칸과 같은 복사 아이콘 */
  const copyIcon = (what: string, value: string, msg: string) => {
    const done = copiedWhat === what;
    return (
      <button onClick={() => copy(value, msg, what)} title="복사"
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: done ? "#16a34a" : theme.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
        {done ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
        )}
        {done ? "복사됨" : "복사"}
      </button>
    );
  };
  const descText = script ? `${script.description.text}${script.description.tags.length ? `\n\n${script.description.tags.join(" ")}` : ""}` : "";
  const target = opts?.durations.find((d) => d.id === (script?.settings?.duration || pick.duration));

  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 14 }}>유튜브 대본 쓰기</div>
        {row("영상 형식", "videoType", opts?.videoTypes)}
        {row("길이", "duration", opts?.durations)}
        {row("말투", "tone", opts?.tones)}
        {row("숫자", "number", opts?.numbers)}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
          <div style={{ flex: 1, minWidth: 260, fontSize: 13, color: theme.textSecondary, lineHeight: 1.6 }}>
            기사(없으면 블로그)를 바탕으로 <b>읽을 원고만</b> 씁니다. 장면·이미지 스크립트는 없습니다. 숫자 &quot;한글 읽기&quot;는 AI 성우가 그대로 읽기 좋게 씁니다.
          </div>
          <button onClick={write} disabled={writing}
            style={{ padding: "10px 18px", background: writing ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: writing ? "default" : "pointer" }}>
            {writing ? "ChatGPT가 쓰는 중…" : script ? "다시 쓰기" : "ChatGPT로 대본 쓰기"}
          </button>
        </div>
        {progress && <div style={{ marginTop: 12, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{progress}</div>}
        {error && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030", lineHeight: 1.6 }}>{error}</div>}
      </div>

      {script && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>제목</div>
          <div style={{ position: "relative" }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== script.title && persist({ title })}
              style={{ ...area, padding: "10px 100px 10px 14px", fontSize: 17, fontWeight: 800, resize: undefined }} />
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>{copyIcon("title", title, "제목을 복사했습니다.")}</div>
          </div>
          {script.titles.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <span style={{ fontSize: 12, color: theme.textSecondary }}>후보 (누르면 제목으로)</span>
              {script.titles.map((t, i) => (
                <button key={i} onClick={() => { setTitle(t); persist({ title: t }); }}
                  style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: title === t ? "rgba(26,58,107,0.08)" : "transparent", color: theme.textPrimary, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                  {t}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 6px" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>나레이션 원고</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: target?.id === "short" && liveSeconds > 65 ? "#c53030" : "#1a3a6b" }}>
                약 {clock(liveSeconds)} · {text.replace(/\s/g, "").length.toLocaleString()}자{target ? ` (목표 ${target.label})` : ""}
              </span>
              {copyIcon("narration", paragraphs().join("\n\n"), "원고를 복사했습니다.")}
            </span>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(22, Math.max(8, script.narration.length * 3))} style={area}
            onBlur={() => persist({ narration: paragraphs() })} />
          <div style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>문단은 빈 줄로 나눕니다. 고친 내용은 칸을 벗어나면 저장됩니다.</div>

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: theme.textSecondary }}>설명란·태그 보기 (요약·링크·출처 — 자동)</summary>
            <div style={{ position: "relative" }}>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "keep-all", margin: "10px 0 0", padding: "14px 100px 14px 16px", borderRadius: 10, background: theme.bg || "#f6f8fa", fontSize: 13.5, lineHeight: 1.7, color: theme.textPrimary, fontFamily: "inherit" }}>
                {descText}
              </pre>
              <div style={{ position: "absolute", top: 10, right: 10 }}>{copyIcon("desc", descText, "설명란을 복사했습니다.")}</div>
            </div>
          </details>

          <StudioReviseBar theme={theme} label="대본" onRevise={revise} examples="첫 문장 훅을 더 강하게, 마지막을 한 줄 정리로" />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            <button onClick={() => copy(paragraphs().join("\n\n"), "원고를 복사했습니다.", "narration")} style={btn(true)}>원고 복사</button>
            <button onClick={() => copy(descText, "설명란을 복사했습니다.", "desc")} style={btn()}>설명란 복사</button>
            <button onClick={exportText} style={btn()}>텍스트로 저장</button>
          </div>
          {note && <div style={{ marginTop: 10, fontSize: 13, color: "#16a34a", lineHeight: 1.6, wordBreak: "break-all" }}>{note}</div>}
          <div style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary }}>동영상제작 메뉴가 열리면 이 원고로 바로 영상을 만들 수 있게 이어 붙입니다.</div>
        </div>
      )}
    </div>
  );
}

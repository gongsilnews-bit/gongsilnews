"use client";

import React, { useState } from "react";

/**
 * [수정 요청] 칸 — 크롬 확장의 "글 수정 요청"과 같다 (기사·블로그·SNS 공용)
 * 적은 요청을 처음 쓴 ChatGPT 대화에 이어 보내 고친 글 전체를 다시 받는다. 사진·자리는 그대로.
 */

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function StudioReviseBar({ theme, label, examples, onRevise }: {
  theme: Theme;
  label: string; // 예: "블로그 글"
  examples: string; // 예: "도입부를 더 짧게, 소제목을 질문형으로"
  onRevise: (request: string, onProgress: (t: string) => void) => Promise<void>;
}) {
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const submit = async () => {
    const req = request.trim();
    if (!req || busy) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      await onRevise(req, setProgress);
      setRequest("");
      setDone(`"${req.length > 40 ? `${req.slice(0, 40)}…` : req}" 요청대로 고쳤습니다.`);
    } catch (e) {
      setError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      setProgress("");
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary, marginBottom: 8 }}>
        {label} 수정 요청 <span style={{ fontWeight: 500, color: theme.textSecondary }}>· 처음 쓴 AI가 같은 대화에서 고쳐 다시 씁니다. 사진은 그대로예요.</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={request} onChange={(e) => setRequest(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submit()}
          disabled={busy} placeholder={`예: ${examples}`}
          style={{ flex: 1, minWidth: 0, padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit" }} />
        <button onClick={submit} disabled={busy || !request.trim()}
          style={{ padding: "10px 18px", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", color: "#fff",
            background: busy || !request.trim() ? "#94a3b8" : "#1a3a6b", cursor: busy || !request.trim() ? "default" : "pointer" }}>
          {busy ? "고치는 중…" : "수정 요청"}
        </button>
      </div>
      {progress && <div style={{ marginTop: 8, fontSize: 13.5, color: "#1a3a6b", fontWeight: 600 }}>{progress}</div>}
      {error && <div style={{ marginTop: 8, fontSize: 13.5, color: "#c53030" }}>{error}</div>}
      {done && !busy && <div style={{ marginTop: 8, fontSize: 13.5, color: "#16a34a", fontWeight: 600 }}>{done}</div>}
    </div>
  );
}

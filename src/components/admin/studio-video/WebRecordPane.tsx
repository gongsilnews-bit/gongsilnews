"use client";

/**
 * 웹 동영상studio [내 목소리] — 마이크로 직접 녹음해 고른 클립 목소리로 (2026-11-05 사장님: 설치 없이, 무료)
 *  브라우저 녹음(MediaRecorder) → 이 브라우저 안에 저장 (webBridge 자료) → 클립 voice. 클립 길이는 녹음 길이로
 *  앱의 [AI 내 목소리 만들기](목소리 복제)는 앱 전용 — 웹은 직접 말한 것을 그대로 쓴다
 */
import React, { useEffect, useRef, useState } from "react";
import { C, FONT, Icon, Btn } from "./ui";

export type RecTarget = { id: string; n: number; text: string } | null;

export default function WebRecordPane({ target, onSave }: { target: RecTarget; onSave: (clipId: string, blob: Blob) => Promise<void> }) {
  const [state, setState] = useState<"idle" | "rec" | "done" | "saving">("idle");
  const [sec, setSec] = useState(0);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    setErr("");
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      stream.current = st;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const r = new MediaRecorder(st, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        st.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        blob.current = b;
        setUrl(URL.createObjectURL(b));
        setState("done");
      };
      rec.current = r;
      r.start();
      setSec(0);
      const t0 = Date.now();
      timer.current = setInterval(() => setSec((Date.now() - t0) / 1000), 200);
      setState("rec");
    } catch {
      setErr("마이크를 쓸 수 없어요. 주소창 왼쪽 자물쇠에서 마이크를 [허용]으로 바꾼 뒤 다시 눌러 주세요.");
    }
  };
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    rec.current?.stop();
  };
  const save = async () => {
    if (!target || !blob.current) return;
    setState("saving");
    try {
      await onSave(target.id, blob.current);
      setState("idle");
      setUrl("");
      blob.current = null;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState("done");
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 24px", fontFamily: FONT, color: C.text }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>내 목소리로 녹음하기</div>
      <div style={{ fontSize: 14, color: C.sub, marginTop: 6, lineHeight: 1.7 }}>
        마이크로 직접 말하면 고른 클립의 목소리가 돼요. 클립 길이는 녹음한 길이에 맞춰져요. (설치 없음 · 무료 · 이 브라우저에 저장)
      </div>
      {!target ? (
        <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 8, border: `1px solid ${C.line2}`, color: C.sub, fontSize: 14.5 }}>먼저 가운데 목록에서 녹음할 클립을 하나 눌러 고른 뒤 다시 열어 주세요.</div>
      ) : (
        <>
          <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 8, background: C.card, border: `1px solid ${C.line2}` }}>
            <div style={{ fontSize: 13, color: C.dim }}>클립 {target.n}{target.text ? " · 읽을 글" : ""}</div>
            {target.text && <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6, lineHeight: 1.6 }}>{target.text}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            {state === "rec" ? (
              <Btn primary onClick={stop} style={{ height: 52, padding: "0 22px", background: "#dc2626", border: "1px solid #dc2626" }}><Icon name="pause" size={18} />멈추기 · {sec.toFixed(1)}초</Btn>
            ) : (
              <Btn primary onClick={() => void start()} disabled={state === "saving"} style={{ height: 52, padding: "0 22px" }}><Icon name="mic" size={18} />{state === "done" ? "다시 녹음" : "녹음 시작"}</Btn>
            )}
            {state === "rec" && <span style={{ width: 12, height: 12, borderRadius: 6, background: "#dc2626", animation: "gsRecBlink 1s infinite" }} />}
          </div>
          {url && state !== "rec" && (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <audio src={url} controls style={{ height: 40 }} />
              <Btn primary onClick={() => void save()} disabled={state === "saving"}><Icon name="check" size={17} />{state === "saving" ? "넣는 중…" : `클립 ${target.n}에 넣기`}</Btn>
            </div>
          )}
        </>
      )}
      {err && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.danger}`, fontSize: 14 }}>{err}</div>}
      <style>{"@keyframes gsRecBlink{0%,100%{opacity:1}50%{opacity:.2}}"}</style>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * 공실마케팅 "클릭 한 번 연결" (회원의 평소 크롬에서 열림)
 * 앱이 처음 켜질 때 이 화면을 크롬으로 연다. 버튼을 누르면 연결 신호를 만들어
 * gongsilstudio:// 주소로 앱에 넘긴다. 로그인이 안 되어 있으면 로그인 후 여기로 돌아온다.
 */
export default function StudioConnectPage() {
  const [state, setState] = useState<"loading" | "ready" | "sending" | "sent" | "error">("loading");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    fetch("/api/studio/connect", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.loggedIn) {
          window.location.replace(`/login?returnTo=${encodeURIComponent("/studio/connect")}`);
          return;
        }
        setName(d.name || "");
        setState("ready");
      })
      .catch(() => {
        setMessage("화면을 불러오지 못했습니다. 새로고침해 주세요.");
        setState("error");
      });
  }, []);

  const connect = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/studio/connect", { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.code) throw new Error(d.error || "연결 신호를 만들지 못했습니다.");
      const url = `gongsilstudio://connect?code=${encodeURIComponent(d.code)}`;
      setAppUrl(url);
      window.location.href = url;
      setState("sent");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f8fa", padding: 24, boxSizing: "border-box", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, padding: "40px 28px", textAlign: "center", boxShadow: "0 1px 3px rgba(16,24,40,.08)" }}>
        <img src="/new_logo.png" alt="" width={56} height={56} style={{ borderRadius: 12, marginBottom: 16 }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7684", marginBottom: 6 }}>공실마케팅</div>

        {state === "loading" && <p style={{ color: "#6b7684", fontSize: 15 }}>확인하는 중…</p>}

        {(state === "ready" || state === "sending") && (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 10px", color: "#16202b", wordBreak: "keep-all" }}>
              {name} 님,<br />이 계정으로 스튜디오를 연결할까요?
            </h1>
            <p style={{ fontSize: 14, color: "#6b7684", margin: "0 0 26px", lineHeight: 1.7, wordBreak: "keep-all" }}>
              한 번 연결하면 앱을 켤 때마다 로그인 없이 바로 시작합니다.
            </p>
            <button onClick={connect} disabled={state === "sending"} style={{ width: "100%", padding: "15px 0", background: "#16202b", color: "#fff", border: 0, borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: "pointer", opacity: state === "sending" ? 0.6 : 1 }}>
              {state === "sending" ? "연결하는 중…" : "공실마케팅 연결"}
            </button>
          </>
        )}

        {state === "sent" && (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 10px", color: "#16202b" }}>앱으로 돌아갑니다</h1>
            <p style={{ fontSize: 14, color: "#6b7684", margin: "0 0 22px", lineHeight: 1.7, wordBreak: "keep-all" }}>
              크롬이 &lsquo;공실마케팅 열기&rsquo;를 물으면 <b>[열기]</b>를 눌러 주세요.<br />
              연결이 끝나면 이 창은 닫으셔도 됩니다.
            </p>
            <a href={appUrl} style={{ fontSize: 14, fontWeight: 700, color: "#16202b" }}>앱이 열리지 않으면 여기를 누르세요</a>
          </>
        )}

        {state === "error" && (
          <>
            <p style={{ fontSize: 15, color: "#c53030", margin: "0 0 20px", wordBreak: "keep-all" }}>{message}</p>
            <button onClick={() => window.location.reload()} style={{ padding: "12px 22px", background: "#16202b", color: "#fff", border: 0, borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>다시 시도</button>
          </>
        )}
      </div>
    </div>
  );
}

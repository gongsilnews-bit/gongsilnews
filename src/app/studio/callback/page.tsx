"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * 공실스튜디오 앱 창 안에서 열리는 연결 마무리 화면
 * 앱이 gongsilstudio://connect?code=… 를 받으면 이 화면을 연다.
 * 연결 신호를 1회용 토큰으로 바꿔 로그인하고 관리자 화면으로 보낸다.
 */
function Callback() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("스튜디오를 연결하는 중…");

  useEffect(() => {
    const code = searchParams.get("code") || "";
    (async () => {
      try {
        const res = await fetch("/api/studio/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const d = await res.json();
        if (!res.ok || !d.tokenHash) throw new Error(d.error || "연결하지 못했습니다.");
        const { error } = await createClient().auth.verifyOtp({ token_hash: d.tokenHash, type: "magiclink" });
        if (error) throw error;
        window.location.replace("/realty_admin");
      } catch (e) {
        setMessage(`${e instanceof Error ? e.message : String(e)}\n앱 첫 화면에서 [크롬에서 연결하기]를 다시 눌러 주세요.`);
      }
    })();
  }, [searchParams]);

  return <p style={{ whiteSpace: "pre-line", fontSize: 16, color: "#16202b", textAlign: "center", lineHeight: 1.7 }}>{message}</p>;
}

export default function StudioCallbackPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f8fa", padding: 24, fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <Suspense fallback={null}>
        <Callback />
      </Suspense>
    </div>
  );
}

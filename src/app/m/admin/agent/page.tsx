"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { isAdminRole } from "@/utils/permissionCheck";
import MobileDevRoom from "./MobileDevRoom";

/*
 * 모바일 AI 비서실 (최고관리자 전용)
 * PC 관리자 컴포넌트(AIWorkspaceSection 등)는 불러오지 않는 독립 페이지다.
 * 데이터는 PC 와 같은 서버 함수(src/devroom/actions.ts)를 써서 그대로 공유된다.
 */

const TABS = [
  { key: "devroom", label: "AI 개발실", icon: "🛠️" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function MobileAgentPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<TabKey>("devroom");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      if (!isAdminRole(data?.role)) {
        alert("최고관리자 전용 기능입니다.");
        router.push("/m");
        return;
      }
      setAuthChecked(true);
    })();
  }, [router]);

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>확인 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "#fff",
        borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 52,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: "#111", margin: 0 }}>AI 비서실</h1>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e5e7eb" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "12px 0", fontSize: 14, fontWeight: tab === t.key ? 800 : 500,
            border: "none", background: "none", cursor: "pointer",
            color: tab === t.key ? "#111" : "#6b7280",
            borderBottom: tab === t.key ? "2px solid #111" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "devroom" && <MobileDevRoom />}
    </div>
  );
}

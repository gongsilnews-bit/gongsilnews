"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function GongsilTalkDMPage() {
  const params = useParams();
  const router = useRouter();
  const targetUserId = params.userId as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);

  const NAVY = "#1a2e50";
  const BLUE = "#508bf5";
  const LNB_BG = "#2c4a7c";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    (async () => {
      // 현재 로그인 유저
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: me } = await supabase.from("members").select("name, email, profile_image_url").eq("id", user.id).single();
        setCurrentUser({ id: user.id, ...me });
      }

      // 대화 상대방 정보
      if (targetUserId) {
        const { data: target } = await supabase
          .from("members")
          .select("name, email, profile_image_url, role, agencies(name, ceo_name, phone, cell)")
          .eq("id", targetUserId)
          .single();
        setTargetUser(target);
      }
      setLoading(false);
    })();
  }, [targetUserId]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "'Pretendard', sans-serif", color: "#888" }}>
        대화 상대 정보를 불러오는 중...
      </div>
    );
  }

  const targetName = targetUser?.agencies?.[0]?.name || targetUser?.agencies?.name || targetUser?.name || "상대방";
  const targetInitial = targetName[0] || "?";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Pretendard', sans-serif" }}>

      {/* ── LNB ── */}
      <div style={{ width: 64, minWidth: 64, background: LNB_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 4 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", marginBottom: 16, cursor: "pointer" }}>
          {currentUser?.profile_image_url ? (
            <img src={currentUser.profile_image_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          ) : "👤"}
        </div>
        {/* 채팅 아이콘 (활성) */}
        <button style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.25)", color: "#fff", border: "none", cursor: "pointer" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
        <div style={{ flex: 1 }} />
        {/* 뒤로가기 */}
        <button onClick={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.6)", border: "none", cursor: "pointer" }} title="뒤로가기">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
      </div>

      {/* ── 1:1 대화방 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#d5e3f0", minWidth: 0 }}>
        {/* 헤더 */}
        <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", display: "flex", alignItems: "center", padding: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            </button>
            {/* 상대방 프사 */}
            {targetUser?.profile_image_url ? (
              <img src={targetUser.profile_image_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid #e5e7eb" }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: BLUE, flexShrink: 0 }}>
                {targetInitial}
              </div>
            )}
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: "#111", margin: 0 }}>{targetName}</h3>
              {targetUser?.agencies?.[0]?.ceo_name && (
                <span style={{ fontSize: 12, color: "#999" }}>대표 {targetUser.agencies[0].ceo_name}</span>
              )}
              {targetUser?.agencies?.ceo_name && !targetUser?.agencies?.[0] && (
                <span style={{ fontSize: 12, color: "#999" }}>대표 {targetUser.agencies.ceo_name}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {/* 대화 시작 안내 */}
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            {targetUser?.profile_image_url ? (
              <img src={targetUser.profile_image_url} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", marginBottom: 16 }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: BLUE, margin: "0 auto 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", border: "3px solid #fff" }}>
                {targetInitial}
              </div>
            )}
            <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: "0 0 6px" }}>{targetName}</p>
            {targetUser?.role === "REALTOR" && (
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>
                {targetUser.agencies?.[0]?.phone || targetUser.agencies?.phone || ""}
              </p>
            )}
            <p style={{ fontSize: 13, color: "#aaa", margin: "16px 0 0" }}>
              <span style={{ background: "rgba(255,255,255,0.7)", padding: "4px 12px", borderRadius: 12, fontSize: 12 }}>
                {targetName}님과의 1:1 대화를 시작합니다
              </span>
            </p>
          </div>
        </div>

        {/* 하단 입력창 */}
        <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: 12, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button style={{ width: 38, height: 38, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0, color: "#fff" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={`${targetName}님에게 메시지 보내기`}
            style={{ flex: 1, background: "#f3f4f6", borderRadius: 20, padding: "10px 16px", fontSize: 14, border: "none", outline: "none", color: "#222" }}
          />
          <button style={{ padding: "10px 20px", borderRadius: 20, background: BLUE, color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0 }}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

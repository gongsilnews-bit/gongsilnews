"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMySubscriptions, toggleSubscription } from "@/app/actions/subscription";

export default function SubscribedReportersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reporters, setReporters] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      setCurrentUserId(user.id);

      const res = await getMySubscriptions(user.id);
      if (res.success) setReporters(res.reporters);
      setLoading(false);
    };
    load();
  }, []);

  const handleUnsubscribe = async (reporterId: string) => {
    if (!currentUserId) return;
    if (!confirm("이 기자의 구독을 취소하시겠습니까?")) return;
    setUnsubscribing(reporterId);
    const res = await toggleSubscription(reporterId, currentUserId);
    if (res.success) {
      setReporters(prev => prev.filter(r => r.id !== reporterId));
    }
    setUnsubscribing(null);
  };

  return (
    <div style={{ width: "100%", maxWidth: 448, margin: "0 auto", minHeight: "100vh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>내가 구독한 기자</h1>
      </div>

      {/* 로딩 */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <div style={{ textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>구독 기자 목록을 불러오는 중...</div>
          </div>
        </div>
      ) : reporters.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <div style={{ textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>구독 중인 기자가 없습니다</div>
            <div style={{ fontSize: 13, color: "#b0b0b0", lineHeight: 1.5 }}>
              기자 프로필에서 구독 버튼을 눌러<br/>관심 기자의 기사를 빠르게 만나보세요!
            </div>
            <button
              onClick={() => router.push("/m/news")}
              style={{ marginTop: 20, padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              뉴스 둘러보기
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "12px 16px" }}>
          {/* 카운트 */}
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 12, padding: "0 4px" }}>
            총 <span style={{ color: "#2563eb", fontWeight: 800 }}>{reporters.length}</span>명
          </div>

          {/* 기자 리스트 */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {reporters.map((reporter: any, idx: number) => (
              <div
                key={reporter.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: idx < reporters.length - 1 ? "1px solid #f3f4f6" : "none",
                  gap: 12,
                }}
              >
                {/* 프로필 이미지 */}
                <Link href={`/m/reporter/${reporter.id}`} style={{ flexShrink: 0, textDecoration: "none" }}>
                  {reporter.profile_image_url ? (
                    <img
                      src={reporter.profile_image_url}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #e5e7eb" }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#9ca3af", border: "2px solid #e5e7eb" }}>
                      {(reporter.name || "?")[0]}
                    </div>
                  )}
                </Link>

                {/* 이름 */}
                <Link href={`/m/reporter/${reporter.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 2 }}>{reporter.name || "기자"}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>기자 프로필 보기 →</div>
                </Link>

                {/* 구독 취소 버튼 */}
                <button
                  onClick={() => handleUnsubscribe(reporter.id)}
                  disabled={unsubscribing === reporter.id}
                  style={{
                    flexShrink: 0,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#6b7280",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {unsubscribing === reporter.id ? "..." : "구독중 ✓"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

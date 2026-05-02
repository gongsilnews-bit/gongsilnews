"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMyArticles, adminUpdateArticleStatus, deleteArticle } from "@/app/actions/article";

function MobileArticleAdmin() {
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name").eq("id", user.id).single();
      if (data) {
        setMemberId(data.id);
        setUserName(data.name || "이름없음");
      }
      setAuthChecked(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      setLoading(true);
      const res = await getMyArticles(memberId);
      if (res.success) setArticles(res.data || []);
      setLoading(false);
    })();
  }, [memberId]);

  const filtered = articles.filter(a => {
    if (filter === "승인대기" && a.status !== "PENDING") return false;
    if (filter === "발행됨" && a.status !== "APPROVED") return false;
    if (filter === "작성중" && a.status !== "DRAFT") return false;
    if (filter === "반려" && a.status !== "REJECTED") return false;
    if (activeKeyword) {
      const k = activeKeyword.toLowerCase();
      if (!(a.title && a.title.toLowerCase().includes(k)) && 
          !(a.author_name && a.author_name.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  const handleRequestApproval = async (id: string) => {
    const a = articles.find(x => x.id === id);
    if (!a || (a.status !== "DRAFT" && a.status !== "REJECTED")) {
      alert("작성중 또는 반려된 기사만 승인신청할 수 있습니다.");
      return;
    }
    if (!confirm("이 기사를 승인신청하시겠습니까?")) return;
    const res = await adminUpdateArticleStatus([id], "PENDING");
    if (res.success) {
      const refreshed = await getMyArticles(memberId!);
      if (refreshed.success) setArticles(refreshed.data || []);
    } else alert("오류: " + res.error);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 기사를 삭제하시겠습니까?")) return;
    const res = await deleteArticle(id);
    if (res.success) {
      const refreshed = await getMyArticles(memberId!);
      if (refreshed.success) setArticles(refreshed.data || []);
    } else alert("삭제 실패: " + res.error);
  };

  const statusInfo: Record<string, { bg: string; label: string }> = {
    PENDING: { bg: "#8b5cf6", label: "승인대기" },
    APPROVED: { bg: "#10b981", label: "발행됨" },
    REJECTED: { bg: "#ef4444", label: "반려됨" },
    DRAFT: { bg: "#9ca3af", label: "작성중" },
  };

  const tabs = [
    { key: "전체", count: articles.length },
    { key: "승인대기", count: articles.filter(a => a.status === "PENDING").length },
    { key: "발행됨", count: articles.filter(a => a.status === "APPROVED").length },
    { key: "작성중", count: articles.filter(a => a.status === "DRAFT").length },
    { key: "반려", count: articles.filter(a => a.status === "REJECTED").length },
  ];

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>권한을 확인하고 있습니다...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 상단 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>기사관리</h1>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            {articles.filter(a => a.status === "PENDING").length}건 대기 / 전체 {articles.length}건
          </span>
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* 검색 영역 (접이식) */}
      {searchOpen && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(searchKeyword); setFilter("전체"); } }}
            placeholder="기사 제목 또는 기자명 검색"
            style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          <button onClick={() => { setActiveKeyword(searchKeyword); setFilter("전체"); }} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>검색</button>
          {activeKeyword && (
            <button onClick={() => { setSearchKeyword(""); setActiveKeyword(""); }} style={{ height: 40, padding: "0 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>초기화</button>
          )}
        </div>
      )}

      {/* 필터 탭 (가로 스크롤) */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setActiveKeyword(""); setSearchKeyword(""); }}
            style={{
              flexShrink: 0, border: "none", background: "none", padding: "14px 16px", fontSize: 14,
              fontWeight: filter === tab.key ? 800 : 500,
              color: filter === tab.key ? "#3b82f6" : "#6b7280",
              borderBottom: filter === tab.key ? "3px solid #3b82f6" : "3px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {tab.key}
            <span style={{
              background: tab.key === "전체" ? "#e5e7eb" : tab.key === "승인대기" ? "#8b5cf6" : tab.key === "발행됨" ? "#10b981" : tab.key === "작성중" ? "#9ca3af" : "#ef4444",
              color: tab.key === "전체" ? "#4b5563" : "#fff",
              padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 안내 배너 */}
      <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>💡</span>
        <span style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600, lineHeight: 1.4 }}>
          기사 작성 후 &quot;승인신청&quot;을 하면 관리자 검토 후 발행됩니다.
        </span>
      </div>

      {/* 기사 카드 리스트 */}
      <div style={{ padding: "12px 16px 100px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {filter === "전체" ? "작성한 기사가 없습니다." : "조회된 기사가 없습니다."}
            </div>
          </div>
        ) : filtered.map(a => {
          const st = statusInfo[a.status] || { bg: "#9ca3af", label: a.status };
          const dateStr = a.created_at ? new Date(a.created_at).toISOString().split("T")[0] : "-";
          const updatedStr = a.updated_at ? new Date(a.updated_at).toISOString().split("T")[0] : "-";
          
          return (
            <div key={a.id} style={{
              background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
            }}>
              {/* 상단: 상태 배지 + 섹션 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "4px 10px", background: st.bg, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{a.section1 || "-"}</span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>#{a.article_no || "-"}</span>
              </div>

              {/* 제목 */}
              <div
                onClick={() => router.push(`/m/news/${a.article_no || a.id}`)}
                style={{ fontSize: 16, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 8, wordBreak: "keep-all", cursor: "pointer" }}
              >
                {a.title || "(제목 없음)"}
              </div>

              {/* 반려 사유 */}
              {a.status === "REJECTED" && a.reject_reason && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 8, fontSize: 12, color: "#dc2626", fontWeight: 600, lineHeight: 1.4 }}>
                  ⚠️ 반려 사유: {a.reject_reason}
                </div>
              )}

              {/* 날짜 정보 */}
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12, display: "flex", gap: 12 }}>
                <span>작성 {dateStr}</span>
                <span>수정 {updatedStr}</span>
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: "flex", gap: 8 }}>
                {(a.status === "DRAFT" || a.status === "REJECTED") && (
                  <button onClick={() => handleRequestApproval(a.id)} style={{ flex: 1, height: 38, background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    📋 승인신청
                  </button>
                )}
                <button onClick={() => window.open(`/news/${a.article_no || a.id}`, '_blank')} style={{ flex: 1, height: 38, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  👁️ 미리보기
                </button>
                <button onClick={() => router.push(`/m/admin/article/write?id=${a.id}`)} style={{ flex: 1, height: 38, background: "#4b5563", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  ✏️ 수정
                </button>
                <button onClick={() => handleDelete(a.id)} style={{ height: 38, padding: "0 14px", background: "#fff", color: "#9ca3af", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB: 새 기사 작성 */}
      <button
        onClick={() => router.push("/m/admin/article/write")}
        style={{
          position: "fixed", bottom: 80, right: 20, width: 56, height: 56,
          borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
          fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 40,
        }}
      >
        +
      </button>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function MobileArticleAdminPage() {
  return (
    <Suspense fallback={null}>
      <MobileArticleAdmin />
    </Suspense>
  );
}

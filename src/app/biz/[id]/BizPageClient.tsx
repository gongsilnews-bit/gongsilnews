"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getBusinessProfileById, getBusinessArticles } from "@/app/actions/businessProfile";

interface BizPageClientProps {
  profileId: string;
}

export default function BizPageClient({ profileId }: BizPageClientProps) {
  const [profile, setProfile] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getBusinessProfileById(profileId);
      if (!res.success) {
        setError(res.error || "업체 정보를 불러올 수 없습니다.");
        setLoading(false);
        return;
      }
      setProfile(res.data);

      // 작성한 기사 로드
      const artRes = await getBusinessArticles(res.data.user_id);
      if (artRes.success) setArticles(artRes.data || []);

      setLoading(false);
    }
    load();
  }, [profileId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Pretendard Variable', 'Malgun Gothic', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#64748b", fontSize: 15 }}>업체 정보를 불러오는 중...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Pretendard Variable', 'Malgun Gothic', sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏢</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>페이지를 찾을 수 없습니다</h2>
          <p style={{ fontSize: 15, color: "#64748b", marginBottom: 24 }}>{error || "존재하지 않거나 비공개 상태인 업체입니다."}</p>
          <Link href="/" style={{ display: "inline-block", padding: "12px 28px", background: "#7c3aed", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const member = profile.members;
  const businessTypeColors: Record<string, string> = {
    "인테리어": "#f59e0b",
    "청소": "#10b981",
    "이사": "#3b82f6",
    "법무사": "#6366f1",
    "세무사": "#8b5cf6",
    "건축/설계": "#f97316",
    "금융/대출": "#14b8a6",
    "보험": "#0ea5e9",
    "광고/마케팅": "#ec4899",
    "IT/소프트웨어": "#6366f1",
    "교육": "#22c55e",
    "기타": "#64748b",
  };
  const typeColor = businessTypeColors[profile.business_type] || "#7c3aed";

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Pretendard Variable', 'Malgun Gothic', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .biz-card { animation: fadeIn 0.5s ease-out; }
        .biz-article-card { transition: transform 0.2s, box-shadow 0.2s; }
        .biz-article-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important; }
        .biz-contact-btn { transition: background 0.2s, transform 0.15s; }
        .biz-contact-btn:hover { transform: scale(1.03); }
      `}</style>

      {/* ── 헤더 ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/logo.png" alt="공실뉴스" style={{ height: 28 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", borderLeft: "1px solid #e2e8f0", paddingLeft: 10 }}>비즈니스 미니홈피</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textDecoration: "none" }}>← 공실뉴스 홈</Link>
      </header>

      {/* ── 프로필 히어로 ── */}
      <section className="biz-card" style={{ background: `linear-gradient(135deg, ${typeColor}22 0%, #f8fafc 100%)`, padding: "60px 24px 48px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* 로고/아바타 */}
            <div style={{ width: 100, height: 100, borderRadius: 20, background: "#fff", border: `3px solid ${typeColor}33`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {profile.logo_url || member?.profile_image_url ? (
                <img src={profile.logo_url || member?.profile_image_url} alt={profile.company_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 42 }}>🏢</span>
              )}
            </div>

            {/* 정보 */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {profile.business_type && (
                <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: typeColor, background: `${typeColor}18`, padding: "4px 12px", borderRadius: 20, marginBottom: 10 }}>
                  {profile.business_type}
                </span>
              )}
              <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", margin: "0 0 8px", letterSpacing: -1 }}>
                {profile.company_name}
              </h1>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
                대표 {profile.ceo_name}
                {profile.address && <> · {profile.address}</>}
              </p>

              {/* 액션 버튼 */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {profile.contact_number && (
                  <a href={`tel:${profile.contact_number.replace(/-/g, '')}`} className="biz-contact-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: typeColor, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: `0 4px 12px ${typeColor}44` }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    전화문의
                  </a>
                )}
                <button className="biz-contact-btn" onClick={() => alert("준비중인 기능입니다.")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  1:1 문의
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 소개글 ── */}
      {profile.description && (
        <section className="biz-card" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", animationDelay: "0.1s" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", marginTop: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={typeColor} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              업체 소개
            </h2>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
              {profile.description}
            </p>
          </div>
        </section>
      )}

      {/* ── 작성 기사 목록 ── */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px 60px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={typeColor} strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
          작성한 기사 <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>({articles.length})</span>
        </h2>

        {articles.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {articles.map((article) => (
              <Link key={article.id} href={`/news/${article.id}`} style={{ textDecoration: "none" }}>
                <div className="biz-article-card" style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", gap: 16, alignItems: "center" }}>
                  {article.thumbnail_url && (
                    <img src={article.thumbnail_url} alt="" style={{ width: 80, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {article.summary}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {article.created_at ? new Date(article.created_at).toLocaleDateString('ko-KR') : ''}
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                      조회 {article.views ?? 0}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, padding: "48px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ fontSize: 15, color: "#94a3b8", margin: 0 }}>아직 작성된 기사가 없습니다.</p>
          </div>
        )}
      </section>

      {/* ── 푸터 ── */}
      <footer style={{ background: "#1e293b", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
          © {new Date().getFullYear()} 공실뉴스 비즈니스 미니홈피 · Powered by <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: 600 }}>공실뉴스</Link>
        </p>
      </footer>
    </div>
  );
}

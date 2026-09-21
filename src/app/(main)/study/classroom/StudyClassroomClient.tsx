"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMyEnrollments } from "@/app/actions/lecture";
import StudyHeader from "@/components/study/StudyHeader";

type FilterKey = "all" | "active" | "expired";

const DAY = 1000 * 60 * 60 * 24;

/** 만료일까지 남은 일수 (만료됐으면 음수) */
function daysLeft(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / DAY);
}

export default function StudyClassroomClient() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  const [oauthLoading, setOauthLoading] = useState<"google" | "kakao" | null>(null);
  const [showFindAccount, setShowFindAccount] = useState(false);
  const [findName, setFindName] = useState("");
  const [findPhone, setFindPhone] = useState("");
  const [findResult, setFindResult] = useState<{ found: boolean; email?: string; provider?: string } | null>(null);
  const [findLoading, setFindLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setCheckingAuth(false);

      if (!user) {
        setLoading(false);
        return;
      }

      const res = await getMyEnrollments(user.id);
      if (res.success && res.data) setEnrollments(res.data);
      setLoading(false);
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        setLoading(true);
        const res = await getMyEnrollments(user.id);
        if (res.success && res.data) setEnrollments(res.data);
        setLoading(false);
      } else {
        setEnrollments([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleOAuthLogin = async (providerName: "google" | "kakao") => {
    if (oauthLoading) return;
    setOauthLoading(providerName);
    try {
      const supabase = createClient();
      const returnTo = encodeURIComponent("/study/classroom");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert("로그인 오류: " + (err?.message || String(err)));
      setOauthLoading(null);
    }
  };

  const handleFindAccount = async () => {
    if (!findName.trim() || !findPhone.trim()) return;
    setFindLoading(true);
    setFindResult(null);
    try {
      const res = await fetch(`/api/find-account?name=${encodeURIComponent(findName)}&phone=${encodeURIComponent(findPhone)}`);
      const data = await res.json();
      setFindResult(data);
    } catch {
      setFindResult({ found: false });
    }
    setFindLoading(false);
  };

  const providerLabel = (p?: string) => {
    if (p === "kakao") return "카카오";
    if (p === "naver") return "네이버";
    return "Google";
  };

  const providerColor = (p?: string) => {
    if (p === "kakao") return "#FEE500";
    if (p === "naver") return "#03C75A";
    return "#fff";
  };

  const activeCount = enrollments.filter((en) => (daysLeft(en.expires_at) ?? 1) > 0).length;
  const expiredCount = enrollments.length - activeCount;
  const soonCount = enrollments.filter((en) => {
    const d = daysLeft(en.expires_at);
    return d !== null && d > 0 && d <= 30;
  }).length;

  const filtered = enrollments.filter((en) => {
    const d = daysLeft(en.expires_at);
    const isExpired = d !== null && d <= 0;
    if (filter === "active") return !isExpired;
    if (filter === "expired") return isExpired;
    return true;
  });

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "전체", count: enrollments.length },
    { key: "active", label: "수강 중", count: activeCount },
    { key: "expired", label: "기간 만료", count: expiredCount },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#132e27", minHeight: "100vh" }}>
      <StudyHeader />

      {/* ━━━ 페이지 헤드 ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "52px 0 46px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#34d399", letterSpacing: "1px", textTransform: "uppercase" }}>
              MY CLASSROOM
            </span>
            <h1 style={{ fontSize: "34px", fontWeight: 900, letterSpacing: "-0.8px", margin: "8px 0 10px 0", color: "#ffffff" }}>
              🎬 나의 강의실
            </h1>
            <p style={{ fontSize: 15.5, color: "#a7f3d0", opacity: 0.9, margin: 0, lineHeight: 1.6, wordBreak: "keep-all" }}>
              수강 중인 인강을 이어보고, 1년 동안 무제한으로 복습하세요.
            </p>
          </div>

          {/* 요약 스탯 */}
          {currentUser && !loading && enrollments.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "14px 20px", minWidth: 104, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff" }}>{activeCount}</div>
                <div style={{ fontSize: 12.5, color: "#a7f3d0", fontWeight: 600, marginTop: 2 }}>수강 중</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "14px 20px", minWidth: 104, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: soonCount > 0 ? "#fbbf24" : "#ffffff" }}>{soonCount}</div>
                <div style={{ fontSize: 12.5, color: "#a7f3d0", fontWeight: 600, marginTop: 2 }}>만료 임박</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* ━━━ 로그인 전: 나의 강의실에서 바로 로그인 ━━━ */}
        {!checkingAuth && !currentUser && (
          <div style={{ maxWidth: 420, margin: "20px auto 0", width: "100%" }}>
            {showFindAccount ? (
              /* 계정 찾기 모드 */
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "32px 28px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>계정 찾기</h2>
                  <p style={{ fontSize: 13.5, color: "#64748b", margin: 0 }}>가입 시 입력한 이름과 연락처를 입력해 주세요.</p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6, display: "block" }}>이름</label>
                  <input
                    type="text"
                    value={findName}
                    onChange={(e) => setFindName(e.target.value)}
                    placeholder="이름 입력"
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6, display: "block" }}>연락처</label>
                  <input
                    type="tel"
                    value={findPhone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + "-" + val.slice(3);
                      else if (val.length > 7) val = val.slice(0, 3) + "-" + val.slice(3, 7) + "-" + val.slice(7, 11);
                      setFindPhone(val);
                    }}
                    placeholder="010-0000-0000"
                    maxLength={13}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                  />
                </div>

                <button
                  onClick={handleFindAccount}
                  disabled={findLoading}
                  style={{ width: "100%", padding: "13px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 14 }}
                >
                  {findLoading ? "조회 중..." : "계정 찾기"}
                </button>

                {findResult && (
                  <div style={{ padding: "14px", borderRadius: 8, background: findResult.found ? "#f0fdf4" : "#fef2f2", border: `1px solid ${findResult.found ? "#bbf7d0" : "#fecaca"}`, marginBottom: 14 }}>
                    {findResult.found ? (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 13.5, color: "#166534", fontWeight: 700, marginBottom: 6 }}>✅ 회원 정보를 찾았습니다!</div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: providerColor(findResult.provider), border: "1px solid #ddd", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: findResult.provider === "naver" ? "#fff" : "#333" }}>
                            {providerLabel(findResult.provider)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#475569" }}>{findResult.email}</div>
                        <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 6 }}>위 소셜 계정으로 로그인해 주세요.</div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", fontSize: 13.5, color: "#991b1b", fontWeight: 600 }}>
                        ❌ 일치하는 회원 정보가 없습니다.
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => { setShowFindAccount(false); setFindResult(null); }}
                  style={{ width: "100%", padding: "11px 0", background: "none", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13.5, color: "#475569", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                >
                  ← 로그인 화면으로 돌아가기
                </button>
              </div>
            ) : (
              /* 소셜 로그인 폼 */
              <div>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
                    공실뉴스 시작하기
                  </h2>
                  <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.55 }}>
                    3초 만에 소셜 연동으로 간편하게 시작하세요.<br />
                    첫 로그인 시 자동으로 가입이 완료됩니다.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Google 로그인 */}
                  <button
                    onClick={() => handleOAuthLogin("google")}
                    disabled={oauthLoading !== null}
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "2px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "14px 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#0f172a",
                      cursor: oauthLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      position: "relative",
                      transition: "all 0.15s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                    onMouseOver={(e) => {
                      if (!oauthLoading) {
                        e.currentTarget.style.borderColor = "#94a3b8";
                        e.currentTarget.style.background = "#f8fafc";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!oauthLoading) {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "#ffffff";
                      }
                    }}
                  >
                    <span style={{ position: "absolute", top: -9, right: 14, background: "#2563eb", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 10, letterSpacing: 0.5 }}>
                      추천
                    </span>
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    {oauthLoading === "google" ? "구글 로그인 연결 중..." : "Google 계정으로 시작하기"}
                  </button>

                  {/* Kakao 로그인 */}
                  <button
                    onClick={() => handleOAuthLogin("kakao")}
                    disabled={oauthLoading !== null}
                    style={{
                      width: "100%",
                      background: "#FEE500",
                      border: "none",
                      borderRadius: 8,
                      padding: "15px 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#1e1e1e",
                      cursor: oauthLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={(e) => {
                      if (!oauthLoading) e.currentTarget.style.background = "#f5dc00";
                    }}
                    onMouseOut={(e) => {
                      if (!oauthLoading) e.currentTarget.style.background = "#FEE500";
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/>
                    </svg>
                    {oauthLoading === "kakao" ? "카카오 로그인 연결 중..." : "카카오 계정으로 시작하기"}
                  </button>
                </div>

                <div style={{ textAlign: "center", marginTop: 28 }}>
                  <button
                    onClick={() => { setShowFindAccount(true); setFindResult(null); }}
                    style={{ background: "none", border: "none", fontSize: 13, color: "#94a3b8", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#2563eb")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  >
                    어떤 계정으로 가입했는지 모르시나요?
                  </button>
                </div>

                {/* 하단 고객센터 및 안내 박스 */}
                <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 36, paddingTop: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>공실뉴스 고객센터</div>
                  <div style={{ fontSize: 11, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", width: "100%", boxSizing: "border-box" }}>
                    <div style={{ fontWeight: 800, color: "#475569", marginBottom: 6, fontSize: 11.5, textAlign: "left" }}>부동산 회원가입 절차</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, color: "#64748b" }}>
                      <span>회원가입</span>
                      <span style={{ color: "#cbd5e1" }}>➔</span>
                      <span>관리자페이지</span>
                      <span style={{ color: "#cbd5e1" }}>➔</span>
                      <span>정보설정</span>
                      <span style={{ color: "#cbd5e1" }}>➔</span>
                      <span style={{ fontWeight: 600 }}>중개소 가입/서류제출</span>
                      <span style={{ color: "#cbd5e1" }}>➔</span>
                      <span style={{ fontWeight: 800, color: "#2563eb" }}>승인완료</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━ 로딩 ━━━ */}
        {(checkingAuth || (currentUser && loading)) && (
          <div style={{ textAlign: "center", padding: "90px 0", color: "#64748b", fontSize: 15, fontWeight: 600 }}>
            {checkingAuth ? "회원 정보를 확인하는 중..." : "강의 목록을 불러오는 중..."}
          </div>
        )}

        {/* ━━━ 수강 내역 없음 ━━━ */}
        {currentUser && !loading && enrollments.length === 0 && (
          <div style={{ background: "#f4fbf7", border: "1px solid #d1fae5", borderRadius: 16, padding: "70px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#062828", marginBottom: 8 }}>아직 수강 중인 강의가 없습니다</div>
            <p style={{ fontSize: 14.5, color: "#64748b", margin: "0 0 22px 0", lineHeight: 1.7 }}>
              공실스터디 특강을 신청하면 이곳에서 바로 이어보실 수 있습니다.
            </p>
            <Link
              href="/study/lectures"
              style={{ display: "inline-block", padding: "12px 30px", background: "#062326", color: "#ffffff", borderRadius: 10, fontSize: 15, fontWeight: 800, textDecoration: "none" }}
            >
              특강 목록 둘러보기 →
            </Link>
          </div>
        )}

        {/* ━━━ 강의 목록 ━━━ */}
        {currentUser && !loading && enrollments.length > 0 && (
          <>
            {/* 필터 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {FILTERS.map((f) => {
                const isSel = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: isSel ? 700 : 500,
                      color: isSel ? "#ffffff" : "#065f46",
                      backgroundColor: isSel ? "#062f32" : "#f0fdf4",
                      border: isSel ? "1px solid #062f32" : "1px solid #d1fae5",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {f.label} {f.count}
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px", background: "#f4fbf7", borderRadius: 12, border: "1px solid #d1fae5", color: "#64748b" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>해당 조건의 강의가 없습니다</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
                {filtered.map((en: any) => {
                  const lecture = en.lecture || {};
                  const d = daysLeft(en.expires_at);
                  const isExpired = d !== null && d <= 0;
                  const isSoon = d !== null && d > 0 && d <= 30;
                  const href = isExpired ? `/study_read?id=${en.lecture_id}` : `/study_watch?id=${en.lecture_id}`;

                  return (
                    <Link key={en.id} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 14,
                          overflow: "hidden",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 12px 24px rgba(5, 150, 105, 0.12)";
                          e.currentTarget.style.borderColor = "#059669";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      >
                        {/* 썸네일 */}
                        <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", background: "#062326" }}>
                          {lecture.thumbnail_url ? (
                            <img src={lecture.thumbnail_url} alt={lecture.title || "특강"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "linear-gradient(135deg, #062326 0%, #064e3b 100%)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#6ee7b7",
                                gap: 6,
                              }}
                            >
                              <span style={{ fontSize: 30 }}>▶</span>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{lecture.category || "공실스터디"}</span>
                            </div>
                          )}

                          {/* 재생 오버레이 / 만료 오버레이 */}
                          {isExpired ? (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                              수강 기간 만료
                            </div>
                          ) : (
                            <div style={{ position: "absolute", top: 10, left: 10, background: isSoon ? "#f59e0b" : "rgba(5,150,105,0.92)", color: "#ffffff", fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: 6 }}>
                              {d !== null ? `D-${d}` : "수강 중"}
                            </div>
                          )}
                        </div>

                        {/* 본문 */}
                        <div style={{ padding: "18px 18px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "3px 8px", borderRadius: 4, display: "inline-block", marginBottom: 10 }}>
                              {lecture.category || "중개실무"}
                            </span>
                            <h3
                              style={{
                                fontSize: 16.5,
                                fontWeight: 800,
                                color: "#062828",
                                lineHeight: 1.45,
                                margin: "0 0 10px 0",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                wordBreak: "keep-all",
                              }}
                            >
                              {lecture.title || "삭제된 강의입니다"}
                            </h3>
                            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
                              강사: {lecture.instructor_name || "공실뉴스 강사진"}
                            </div>
                          </div>

                          <div style={{ paddingTop: 12, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ fontSize: 12.5, color: isSoon ? "#b45309" : "#94a3b8", fontWeight: isSoon ? 700 : 500 }}>
                              {en.expires_at ? `만료 ${new Date(en.expires_at).toLocaleDateString()}` : "기간 제한 없음"}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: "#ffffff",
                                background: isExpired ? "#94a3b8" : "#059669",
                                padding: "7px 16px",
                                borderRadius: 7,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isExpired ? "재수강하기" : "이어보기 ▶"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* 하단 안내 */}
            <div style={{ marginTop: 40, background: "#f4fbf7", border: "1px solid #d1fae5", borderRadius: 14, padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14.5, color: "#065f46", fontWeight: 600, lineHeight: 1.6 }}>
                새로운 특강은 매월 업데이트됩니다. 아직 신청하지 않은 특강을 확인해 보세요.
              </div>
              <Link
                href="/study/lectures"
                style={{ padding: "10px 22px", background: "#062326", color: "#ffffff", borderRadius: 8, fontSize: 13.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                강의목록 보기 →
              </Link>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

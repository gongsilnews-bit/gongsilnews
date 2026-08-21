"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLectureDetail, createLectureReview, enrollLecture, checkEnrollment } from "@/app/actions/lecture";
import { getPointBalance } from "@/app/actions/point";
import { createClient } from "@/utils/supabase/client";

export default function MobileStudyReadClient({ initialLecture }: { initialLecture: any }) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"introduce" | "curriculum" | "review" | "creator">("introduce");
  const [lecture, setLecture] = useState<any>(initialLecture);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  /* ── 수강 등록 상태 ── */
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [pointBalance, setPointBalance] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        const balRes = await getPointBalance(data.user.id);
        if (balRes.success) setPointBalance(balRes.balance);
      }
    });
  }, []);

  useEffect(() => {
    if (!lecture?.id || !user?.id) return;
    checkEnrollment(lecture.id, user.id).then((res) => {
      if (res.success) setIsEnrolled(res.enrolled);
    });
  }, [lecture?.id, user?.id]);

  const handleEnroll = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push(`/m/login?returnTo=/m/study_read?id=${lecture?.id}`);
      return;
    }
    if (isEnrolled) {
      router.push(`/m/study_watch?id=${lecture.id}`);
      return;
    }
    const enrollCheck = await checkEnrollment(lecture.id, user.id);
    if (enrollCheck.success && enrollCheck.enrolled) {
      setIsEnrolled(true);
      router.push(`/m/study_watch?id=${lecture.id}`);
      return;
    }
    const dp = lecture.discount_price || lecture.price || 0;
    if (dp <= 0) {
      setEnrolling(true);
      const res = await enrollLecture(lecture.id, user.id);
      if (res.success) {
        setIsEnrolled(true);
        router.push(`/m/study_watch?id=${lecture.id}`);
      } else {
        alert(res.error || "오류가 발생했습니다.");
      }
      setEnrolling(false);
      return;
    }
    const balRes = await getPointBalance(user.id);
    if (balRes.success) setPointBalance(balRes.balance);
    setShowEnrollModal(true);
  };

  const confirmEnroll = async () => {
    if (!user || !lecture) return;
    setEnrolling(true);
    const res = await enrollLecture(lecture.id, user.id);
    if (res.success) {
      setIsEnrolled(true);
      setShowEnrollModal(false);
      if (res.balance !== undefined) setPointBalance(res.balance);
      alert("수강 등록이 완료되었습니다! 강의실로 이동합니다.");
      router.push(`/m/study_watch?id=${lecture.id}`);
    } else if (res.error === "insufficient_points") {
      alert(`포인트가 부족합니다.\n보유: ${(res as any).balance?.toLocaleString()}P\n필요: ${(res as any).required?.toLocaleString()}P`);
    } else {
      alert(res.error || "수강 등록 실패");
    }
    setEnrolling(false);
  };

  const handleKakaoShare = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사되었습니다.");
      return;
    }
    const shareUrl = window.location.href;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: lecture?.title,
        description: lecture?.category || "공실스터디 | 공실뉴스",
        imageUrl: lecture?.thumbnail_url || "",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: "스터디 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!newReview.trim()) return;
    setIsSubmitting(true);
    const res = await createLectureReview({
      lecture_id: lecture.id,
      user_id: user.id,
      rating: newRating,
      comment: newReview,
    });
    if (res.success) {
      alert("후기가 등록되었습니다.");
      setNewReview("");
      const detail = await getLectureDetail(lecture.id);
      if (detail.success && detail.data) setLecture(detail.data);
    } else {
      alert(res.error || "등록 실패");
    }
    setIsSubmitting(false);
  };

  if (!lecture) {
    return (
      <div style={{ backgroundColor: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#fff", height: "50px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", padding: "0 16px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ flex: 1, textAlign: "center", fontSize: "16px", fontWeight: 700, color: "#111827" }}>공실스터디</div>
        </div>
        <div style={{ textAlign: "center", padding: 80, color: "#999" }}>📭 등록된 강의가 없습니다.</div>
      </div>
    );
  }

  const chapters = lecture.chapters || [];
  const reviews = lecture.reviews || [];
  const totalLessons = chapters.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0);
  const displayPrice = lecture.discount_price !== null && lecture.discount_price !== undefined ? lecture.discount_price : lecture.price;

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", paddingBottom: "90px", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b" }}>
      
      {/* ── 미리보기 모달 ── */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, background: "#000", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", color: "#fff" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{previewTitle || "미리보기 영상"}</span>
              <button onClick={() => setPreviewUrl(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {previewUrl.includes("youtube.com") || previewUrl.includes("youtu.be") ? (
              <div style={{ width: "100%", aspectRatio: "16/9" }}>
                <iframe src={previewUrl.replace("watch?v=", "embed/")} title="preview" style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen />
              </div>
            ) : (
              <video src={previewUrl} controls autoPlay style={{ width: "100%", height: "100%", background: "#000" }} />
            )}
          </div>
        </div>
      )}

      {/* ── 상단 고정 헤더 바 (뒤로가기 & 타이틀) ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#ffffff", height: "50px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 16px", justifyContent: "space-between" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", marginLeft: "-4px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#062828" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: "16px", fontWeight: 800, color: "#062828" }}>
          공실스터디
        </div>
        <button onClick={handleKakaoShare} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
        </button>
      </div>

      {/* ── 1. 썸네일 프리뷰 ── */}
      <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", backgroundColor: "#062326" }}>
        {lecture.thumbnail_url ? (
          <img src={lecture.thumbnail_url} alt={lecture.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #062326 0%, #064e3b 100%)", color: "#fff" }}>
            <span style={{ fontSize: 32, marginBottom: 4 }}>🎓</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#6ee7b7" }}>{lecture.category || "공실스터디"}</span>
          </div>
        )}
        <span style={{ position: "absolute", top: 12, left: 12, background: "#059669", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>
          VOD
        </span>
      </div>

      {/* ── 2. 강의 제목 및 메타 정보 ── */}
      <div style={{ padding: "20px 16px 16px" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "2px 8px", borderRadius: 4, display: "inline-block", marginBottom: 8 }}>
          {lecture.category || "중개실무"}
        </span>
        <h1 style={{ fontSize: "19px", fontWeight: 800, color: "#062828", lineHeight: 1.35, margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>
          {lecture.title}
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: 1.5, margin: "0 0 14px 0" }}>
          {lecture.short_description || "11만 부동산 전문가와 함께 1년 동안 실전 노하우를 배우고 성장하는 공실스터디 과정"}
        </p>

        {/* 뱃지들 */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, fontWeight: 700 }}>
          <span style={{ background: "#f0fdf4", color: "#065f46", border: "1px solid #d1fae5", padding: "3px 8px", borderRadius: 4 }}>
            총 {totalLessons}강
          </span>
          <span style={{ background: "#f0fdf4", color: "#065f46", border: "1px solid #d1fae5", padding: "3px 8px", borderRadius: 4 }}>
            1년(365일) 무제한 수강
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", marginLeft: "auto" }}>
            ★ {(lecture.rating || 4.9).toFixed(1)} ({lecture.review_count || reviews.length})
          </span>
        </div>
      </div>

      {/* ── 3. 윤자동 스타일 탭 바 ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 16px", background: "#ffffff", position: "sticky", top: 50, zIndex: 40 }}>
        {[
          { id: "introduce", label: "소개" },
          { id: "curriculum", label: `커리큘럼 (${totalLessons})` },
          { id: "review", label: `후기 (${reviews.length})` },
          { id: "creator", label: "강사" },
        ].map((tab) => {
          const isSel = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: "12px 0",
                background: "none",
                border: "none",
                borderBottom: isSel ? "2.5px solid #059669" : "2.5px solid transparent",
                fontSize: 14,
                fontWeight: isSel ? 800 : 600,
                color: isSel ? "#062828" : "#64748b",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 4. 탭 본문 ── */}
      <div style={{ padding: "20px 16px" }}>
        {activeTab === "introduce" && (
          <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#062828", margin: "0 0 12px 0" }}>
              스터디 안내
            </h3>
            {lecture.description ? (
              <div dangerouslySetInnerHTML={{ __html: lecture.description }} />
            ) : (
              <p>본 과정은 내일 당장 현장에서 계약을 쓰고 매물을 홍보할 수 있는 실전 노하우를 중심으로 구성되어 있습니다.</p>
            )}

            {/* 신뢰 박스 */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", marginTop: 24 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#062828", marginBottom: 8 }}>공실뉴스가 보장하는 혜택</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12.5, color: "#475569", lineHeight: 1.8 }}>
                <li>· 365일 무제한 모바일/PC 복습</li>
                <li>· 실무 서식 & AI 프롬프트 원본 파일 제공</li>
                <li>· 매월 최신 정책 및 실무 특강 자동 업데이트</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "curriculum" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {chapters.map((ch: any, chIdx: number) => (
                <div key={chIdx} style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                  <div style={{ padding: "10px 14px", background: "#f8fafc", fontWeight: 700, fontSize: 13, color: "#062828", borderBottom: "1px solid #e2e8f0" }}>
                    {ch.title || `Chapter ${chIdx + 1}`}
                  </div>
                  <div>
                    {(ch.lessons || []).map((les: any, lesIdx: number) => {
                      const isPreview = les.is_preview || lesIdx === 0;
                      return (
                        <div key={les.id || lesIdx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid #f8fafc", fontSize: 13 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#059669" }}>{String(lesIdx + 1).padStart(2, "0")}</span>
                            <span style={{ fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{les.title}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {isPreview ? (
                              <button onClick={() => { setPreviewUrl(les.video_url); setPreviewTitle(les.title); }} style={{ padding: "2px 6px", borderRadius: 4, background: "#ecfdf5", color: "#047857", border: "1px solid #d1fae5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                미리보기
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>🔒</span>
                            )}
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{les.duration_minutes ? `${les.duration_minutes}분` : "8:04"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "review" && (
          <div>
            <form onSubmit={handleReviewSubmit} style={{ background: "#f8fafc", padding: "14px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>별점:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button type="button" key={star} onClick={() => setNewRating(star)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: star <= newRating ? "#d97706" : "#cbd5e1" }}>
                    ★
                  </button>
                ))}
              </div>
              <textarea rows={2} placeholder="수강 후기를 작성해 주세요" value={newReview} onChange={(e) => setNewReview(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }} />
              <button type="submit" disabled={isSubmitting} style={{ marginTop: 8, width: "100%", padding: "8px 0", background: "#059669", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                {isSubmitting ? "등록 중..." : "후기 등록"}
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reviews.map((rev: any, i: number) => (
                <div key={i} style={{ padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#d97706", marginBottom: 4 }}>
                    <span>{"★".repeat(rev.rating || 5)}</span>
                    <span style={{ color: "#94a3b8" }}>{rev.created_at?.substring(0, 10)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "creator" && (
          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#062828", marginBottom: 4 }}>{lecture.instructor_name || "공실뉴스 강사진"}</div>
            <div style={{ fontSize: 12, color: "#059669", fontWeight: 700, marginBottom: 10 }}>공실뉴스 공식 파트너 강사</div>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{lecture.instructor_bio || "현직 1등 공인중개사, 프롬프트 엔지니어, 경공매 권리분석 전문가로 구성된 수석 강사진입니다."}</p>
          </div>
        )}
      </div>

      {/* ── 5. 하단 고정 결제/수강 바 (Sticky Bottom Action Bar) ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, zIndex: 50, boxSizing: "border-box" }}>
        <div>
          <div style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>1년(365일) 이용</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#062828" }}>
            {displayPrice ? `${displayPrice.toLocaleString()}P` : "무료 수강"}
          </div>
        </div>

        <button
          onClick={handleEnroll}
          disabled={enrolling}
          style={{
            flex: 1,
            maxWidth: "240px",
            padding: "13px 0",
            background: isEnrolled ? "#062326" : "#059669",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
          }}
        >
          {enrolling ? "처리 중..." : isEnrolled ? "강의실 입장하기 →" : displayPrice ? `${displayPrice.toLocaleString()}P 수강신청` : "무료 수강 시작하기 →"}
        </button>
      </div>

      {/* ── 결제 모달 ── */}
      {showEnrollModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 360, background: "#ffffff", borderRadius: 14, padding: "20px", boxSizing: "border-box" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#062828", margin: "0 0 10px 0" }}>수강 신청 확인</h3>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 14px 0" }}>
              <strong>{lecture.title}</strong><br />1년(365일) 수강을 시작하시겠습니까?
            </p>
            <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>차감 포인트:</span>
                <span style={{ fontWeight: 800, color: "#dc2626" }}>-{displayPrice?.toLocaleString()} P</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>보유 포인트:</span>
                <span style={{ fontWeight: 700, color: "#062828" }}>{pointBalance.toLocaleString()} P</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => setShowEnrollModal(false)} style={{ padding: "10px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>취소</button>
              <button onClick={confirmEnroll} disabled={enrolling} style={{ padding: "10px 0", background: "#059669", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 800 }}>{enrolling ? "결제 중..." : "결제 및 수강"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

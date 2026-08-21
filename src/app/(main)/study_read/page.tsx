"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, getLectures, createLectureReview, enrollLecture, checkEnrollment } from "@/app/actions/lecture";
import { getPointBalance } from "@/app/actions/point";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";

export default function StudyReadPage() {
  return (
    <Suspense fallback={<div style={{ padding: "100px", textAlign: "center", color: "#6b7280" }}>강의 상세 정보를 불러오는 중입니다...</div>}>
      <StudyReadContent />
    </Suspense>
  );
}

function StudyReadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lectureId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState<"introduce" | "curriculum" | "review" | "creator">("introduce");
  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ── 캐러셀 ── */
  const [currentSlide, setCurrentSlide] = useState(0);

  /* ── 영상 미리보기 모달 ── */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  /* ── 리뷰 작성 상태 ── */
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── 인증 상태 ── */
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
        const { data: member } = await supabase.from("members").select("name").eq("id", data.user.id).single();
        if (member?.name) {
          setUserName(member.name);
        } else {
          setUserName(data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "익명");
        }
        // 포인트 잔액 조회
        const balRes = await getPointBalance(data.user.id);
        if (balRes.success) setPointBalance(balRes.balance);
      }
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (lectureId) {
        const res = await getLectureDetail(lectureId);
        if (res.success && res.data) setLecture(res.data);
      } else {
        const res = await getLectures({ status: "ACTIVE" });
        if (res.success && res.data && res.data.length > 0) {
          const detail = await getLectureDetail(res.data[0].id);
          if (detail.success && detail.data) setLecture(detail.data);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [lectureId]);

  // 수강 등록 여부 확인
  useEffect(() => {
    if (!lecture?.id || !user?.id) return;
    checkEnrollment(lecture.id, user.id).then((res) => {
      if (res.success) setIsEnrolled(res.enrolled);
    });
  }, [lecture?.id, user?.id]);

  const handleEnroll = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (isEnrolled) {
      router.push(`/study_watch?id=${lecture.id}`);
      return;
    }
    // 결제 전 실시간 수강 여부 재확인
    const enrollCheck = await checkEnrollment(lecture.id, user.id);
    if (enrollCheck.success && enrollCheck.enrolled) {
      setIsEnrolled(true);
      router.push(`/study_watch?id=${lecture.id}`);
      return;
    }
    const dp = lecture.discount_price || lecture.price || 0;
    if (dp <= 0) {
      setEnrolling(true);
      const res = await enrollLecture(lecture.id, user.id);
      if (res.success) {
        setIsEnrolled(true);
        router.push(`/study_watch?id=${lecture.id}`);
      } else {
        alert(res.error || "오류가 발생했습니다.");
      }
      setEnrolling(false);
      return;
    }
    // 포인트 잔액 새로고침
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
      router.push(`/study_watch?id=${lecture.id}`);
    } else if (res.error === "insufficient_points") {
      alert(`포인트가 부족합니다.\n보유: ${(res as any).balance?.toLocaleString()}P\n필요: ${(res as any).required?.toLocaleString()}P`);
    } else {
      alert(res.error || "수강 등록에 실패했습니다.");
    }
    setEnrolling(false);
  };

  /* ── 이미지 배열 ── */
  const slideImages: string[] = [];
  if (lecture?.thumbnail_url) slideImages.push(lecture.thumbnail_url);
  if (lecture?.images && Array.isArray(lecture.images)) {
    lecture.images.forEach((img: string) => {
      if (img && !slideImages.includes(img)) slideImages.push(img);
    });
  }

  const goSlide = (dir: number) => {
    if (slideImages.length === 0) return;
    setCurrentSlide((prev) => (prev + dir + slideImages.length) % slideImages.length);
  };

  /* ── 미리보기 열기 ── */
  const openPreview = (videoUrl: string, title: string) => {
    setPreviewUrl(videoUrl);
    setPreviewTitle(title);
  };

  /* ── 카카오톡 공유 ── */
  const handleKakaoShare = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로드 중입니다. 잠시 후 시도해 주세요.");
      return;
    }
    const shareUrl = `https://gongsilnews.com/study_read?id=${lecture.id}`;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: lecture.title,
        description: lecture.category || "공실스터디 | 공실뉴스",
        imageUrl: slideImages[0] || "",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "스터디 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
  };

  /* ── URL 복사 ── */
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("URL이 복사되었습니다.");
  };

  /* ── 리뷰 작성 ── */
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
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
      alert("리뷰가 등록되었습니다.");
      setNewReview("");
      const detail = await getLectureDetail(lecture.id);
      if (detail.success && detail.data) setLecture(detail.data);
    } else {
      alert(res.error || "등록 실패");
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        강의 상세 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!lecture) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>등록된 강의가 없습니다</h2>
        <Link href="/study" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>공실스터디 목록으로 돌아가기 ›</Link>
      </div>
    );
  }

  const displayPrice = lecture.discount_price !== null && lecture.discount_price !== undefined ? lecture.discount_price : lecture.price;
  const originalPrice = lecture.discount_price ? lecture.price : null;
  const chapters = lecture.chapters || [];
  const reviews = lecture.reviews || [];
  const totalLessons = chapters.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0);

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b", minHeight: "100vh", paddingBottom: 100 }}>
      
      {/* ── 미리보기 모달 ── */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 840, background: "#000", borderRadius: 14, overflow: "hidden", position: "relative" }}>
            <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", color: "#fff" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{previewTitle || "미리보기 영상"}</span>
              <button onClick={() => setPreviewUrl(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
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

      {/* ── 상단 Breadcrumb ── */}
      <div style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "14px 24px", fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/study" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>공실스터디</Link>
          <span>›</span>
          <span style={{ color: "#334155", fontWeight: 600 }}>{lecture.category || "중개실무"}</span>
        </div>
      </div>

      {/* ── 메인 컨텐츠 영역 (윤자동 스타일 2열 구조) ── */}
      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "36px 24px 0", display: "grid", gridTemplateColumns: "1fr 360px", gap: 44, alignItems: "start" }}>
        
        {/* ━━━ 좌측: 메인 상세 소개 ━━━ */}
        <div>
          
          {/* 1. 메인 프리뷰 이미지 / 썸네일 */}
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", background: "#062326", marginBottom: 28, border: "1px solid #e2e8f0" }}>
            {slideImages.length > 0 ? (
              <>
                <img
                  src={slideImages[currentSlide]}
                  alt={lecture.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {slideImages.length > 1 && (
                  <>
                    <button
                      onClick={() => goSlide(-1)}
                      style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => goSlide(1)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
                    >
                      ›
                    </button>
                  </>
                )}
              </>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #062326 0%, #064e3b 100%)", color: "#ffffff" }}>
                <span style={{ fontSize: 40, marginBottom: 8 }}>🎓</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#6ee7b7" }}>{lecture.category || "공실스터디"}</span>
              </div>
            )}
            
            {/* VOD 태그 */}
            <span style={{ position: "absolute", top: 14, left: 14, background: "#059669", color: "#fff", fontSize: 12, fontWeight: 800, padding: "3px 9px", borderRadius: 6, letterSpacing: "0.5px" }}>
              VOD
            </span>
          </div>

          {/* 2. 강의 제목 및 요약 정보 */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#062828", lineHeight: 1.35, margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>
              {lecture.title}
            </h1>
            <p style={{ fontSize: 15.5, color: "#475569", lineHeight: 1.6, margin: "0 0 18px 0" }}>
              {lecture.short_description || "11만 부동산 실무자와 함께 1년 동안 실전 노하우를 배우고 성장하는 공실스터디 마스터 과정"}
            </p>

            {/* 메타 뱃지 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
              <span style={{ background: "#f0fdf4", color: "#065f46", border: "1px solid #d1fae5", padding: "4px 10px", borderRadius: 6 }}>
                총 {totalLessons}강
              </span>
              <span style={{ background: "#f0fdf4", color: "#065f46", border: "1px solid #d1fae5", padding: "4px 10px", borderRadius: 6 }}>
                1년(365일) 무제한 수강
              </span>
              <span style={{ background: "#f0fdf4", color: "#065f46", border: "1px solid #d1fae5", padding: "4px 10px", borderRadius: 6 }}>
                실무 서식 100% 제공
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#d97706", marginLeft: 4 }}>
                ★ {(lecture.rating || 4.9).toFixed(1)} ({lecture.review_count || reviews.length})
              </span>
            </div>
          </div>

          {/* 3. 윤자동 스타일 탭 바 */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 36, gap: 28 }}>
            {[
              { id: "introduce", label: "소개" },
              { id: "curriculum", label: `커리큘럼 (${totalLessons}강)` },
              { id: "review", label: `수강 후기 (${reviews.length})` },
              { id: "creator", label: "강사진 소개" },
            ].map((tab) => {
              const isSel = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "12px 0",
                    background: "none",
                    border: "none",
                    borderBottom: isSel ? "2.5px solid #059669" : "2.5px solid transparent",
                    fontSize: 15,
                    fontWeight: isSel ? 800 : 600,
                    color: isSel ? "#062828" : "#64748b",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 4. 탭 본문 내용 */}
          {activeTab === "introduce" && (
            <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.8 }}>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: "#062828", margin: "0 0 16px 0" }}>
                스터디 소개
              </h3>
              {lecture.description ? (
                <div dangerouslySetInnerHTML={{ __html: lecture.description }} />
              ) : (
                <div>
                  <p>
                    본 과정은 단순한 이론 강의가 아닌, <strong>내일 당장 현장에서 계약을 쓰고 매물을 홍보할 수 있는 실전 노하우</strong>를 중심으로 구성되어 있습니다.
                  </p>
                  <p>
                    1년(365일) 동안 매월 업데이트되는 최신 AI 도구와 부동산 정책, 실무 서식을 활용하여 나만의 경쟁력을 완성하세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "curriculum" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: "#062828", margin: 0 }}>
                  커리큘럼 <span style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>전체 {totalLessons}강</span>
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {chapters.map((ch: any, chIdx: number) => (
                  <div key={chIdx} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
                    <div style={{ padding: "14px 18px", background: "#f8fafc", fontWeight: 700, fontSize: 14.5, color: "#062828", borderBottom: "1px solid #e2e8f0" }}>
                      {ch.title || `Chapter ${chIdx + 1}`}
                    </div>
                    <div>
                      {(ch.lessons || []).map((les: any, lesIdx: number) => {
                        const isPreview = les.is_preview || lesIdx === 0;
                        return (
                          <div
                            key={les.id || lesIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "13px 18px",
                              borderBottom: lesIdx < ch.lessons.length - 1 ? "1px solid #f1f5f9" : "none",
                              fontSize: 14,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#059669", width: 22 }}>
                                {String(lesIdx + 1).padStart(2, "0")}
                              </span>
                              <span style={{ fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {les.title}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                              {isPreview ? (
                                <button
                                  onClick={() => openPreview(les.video_url, les.title)}
                                  style={{ padding: "3px 8px", borderRadius: 4, background: "#ecfdf5", color: "#047857", border: "1px solid #d1fae5", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                                >
                                  미리보기
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: "#94a3b8" }}>🔒 잠김</span>
                              )}
                              <span style={{ fontSize: 12, color: "#64748b" }}>{les.duration_minutes ? `${les.duration_minutes}분` : "8:04"}</span>
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
              <h3 style={{ fontSize: 19, fontWeight: 800, color: "#062828", margin: "0 0 18px 0" }}>
                수강생 후기
              </h3>

              {/* 리뷰 작성 박스 */}
              <form onSubmit={handleReviewSubmit} style={{ background: "#f8fafc", padding: "20px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>별점 평가:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: star <= newRating ? "#d97706" : "#cbd5e1" }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  placeholder="스터디 수강 후기를 남겨주세요 (실명 보호)"
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, outline: "none", boxSizing: "border-box", resize: "vertical" }}
                />
                <div style={{ textAlign: "right", marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ padding: "8px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                  >
                    {isSubmitting ? "등록 중..." : "후기 작성하기"}
                  </button>
                </div>
              </form>

              {/* 리뷰 리스트 */}
              {reviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  아직 등록된 후기가 없습니다. 첫 후기를 남겨보세요!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {reviews.map((rev: any, i: number) => (
                    <div key={i} style={{ padding: "16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ color: "#d97706", fontWeight: 800 }}>{"★".repeat(rev.rating || 5)}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{rev.created_at?.substring(0, 10)}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#334155", margin: 0, lineHeight: 1.6 }}>{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "creator" && (
            <div style={{ background: "#f8fafc", padding: "28px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#062326", color: "#6ee7b7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>
                  🎓
                </div>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: "0 0 4px 0" }}>
                    {lecture.instructor_name || "공실뉴스 실무 강사진"}
                  </h4>
                  <span style={{ fontSize: 13, color: "#059669", fontWeight: 700 }}>
                    공실뉴스 공인 파트너 강사
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, margin: 0 }}>
                {lecture.instructor_bio || "현직 1등 공인중개사, 프롬프트 엔지니어, 경공매 권리분석 전문가로 구성된 공실뉴스 수석 강사진입니다. 검증된 현장 실무 노하우를 아낌없이 전달합니다."}
              </p>
            </div>
          )}

        </div>

        {/* ━━━ 우측: 윤자동 스타일 Sticky 구매/수강 위젯 ━━━ */}
        <aside style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* 1. 메인 결제/수강 카드 */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "26px 22px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            
            <div style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 11.5, fontWeight: 800, padding: "3px 8px", borderRadius: 4, marginBottom: 12 }}>
              VOD
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#062828", margin: "0 0 14px 0", lineHeight: 1.4 }}>
              {lecture.title}
            </h3>

            {/* 가격 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                {originalPrice && (
                  <span style={{ fontSize: 14, color: "#94a3b8", textDecoration: "line-through" }}>
                    {originalPrice.toLocaleString()}P
                  </span>
                )}
                <span style={{ fontSize: 26, fontWeight: 900, color: "#062828" }}>
                  {displayPrice ? `${displayPrice.toLocaleString()}P` : "무료 수강"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#059669", fontWeight: 700, marginTop: 4 }}>
                1년(365일) 이용 · 결제일로부터
              </div>
            </div>

            {/* 포함 혜택 리스트 */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, marginBottom: 20, fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>실습 템플릿·예제 파일 포함</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>모바일·PC 365일 무제한 수강</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>강의 자료 & 계약서 양식 다운로드 제공</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>전국 11만 부동산 스터디 크루 연계</span>
              </div>
            </div>

            {/* CTA 버튼 */}
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              style={{
                width: "100%",
                padding: "14px 0",
                background: isEnrolled ? "#062326" : "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                fontSize: 15.5,
                fontWeight: 800,
                cursor: "pointer",
                marginBottom: 10,
                transition: "all 0.2s",
                boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
              }}
            >
              {enrolling ? "처리 중..." : isEnrolled ? "강의실 입장하기 →" : displayPrice ? `${displayPrice.toLocaleString()}P 결제 후 수강하기` : "무료로 수강 시작하기 →"}
            </button>

            {/* 보조 버튼들 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={handleKakaoShare}
                style={{ padding: "9px 0", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}
              >
                💬 공유하기
              </button>
              <button
                onClick={handleCopyUrl}
                style={{ padding: "9px 0", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}
              >
                🔗 링크 복사
              </button>
            </div>

          </div>

          {/* 2. 공실뉴스가 보장하는 것 (신뢰 박스) */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px" }}>
            <h4 style={{ fontSize: 13.5, fontWeight: 800, color: "#062828", margin: "0 0 12px 0" }}>
              공실뉴스가 보장하는 것
            </h4>
            <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>365일 무제한 복습</strong><br />
                스마트폰과 PC 어디서나 1년 내내 언제든 복습 가능합니다.
              </p>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>실무 서식 원본 제공</strong><br />
                계약서 특약, AI 프롬프트 원본 파일을 자유롭게 다운로드합니다.
              </p>
              <p style={{ margin: 0 }}>
                <strong>매월 신규 업데이트</strong><br />
                변화하는 최신 AI 기술과 정책을 매달 새로 반영합니다.
              </p>
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 14, paddingTop: 10, fontSize: 12, color: "#64748b", textAlign: "center" }}>
              궁금한 점이 있으신가요? <span onClick={() => alert("고객센터 010-7337-1122 또는 1:1 문의를 이용해 주세요.")} style={{ color: "#059669", fontWeight: 700, cursor: "pointer" }}>문의하기</span>
            </div>
          </div>

        </aside>

      </main>

      {/* ── 결제 모달 ── */}
      {showEnrollModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#ffffff", borderRadius: 16, padding: "28px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: "0 0 14px 0" }}>
              수강 신청 확인
            </h3>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.5, margin: "0 0 18px 0" }}>
              <strong>{lecture.title}</strong><br />
              1년(365일) 수강을 시작하시겠습니까?
            </p>

            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13.5, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>차감 포인트:</span>
                <span style={{ fontWeight: 800, color: "#dc2626" }}>-{displayPrice?.toLocaleString()} P</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>보유 포인트:</span>
                <span style={{ fontWeight: 700, color: "#062828" }}>{pointBalance.toLocaleString()} P</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => setShowEnrollModal(false)}
                style={{ padding: "11px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={confirmEnroll}
                disabled={enrolling}
                style={{ padding: "11px 0", background: "#059669", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
              >
                {enrolling ? "결제 중..." : "결제 및 수강"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}

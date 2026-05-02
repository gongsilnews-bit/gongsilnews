"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, getLectures, createLectureReview } from "@/app/actions/lecture";
import { createClient } from "@/utils/supabase/client";
import SubPageHeader from "../_components/SubPageHeader";

export default function MobileStudyReadPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#999" }}>로딩 중...</div>}>
      <MobileStudyReadContent />
    </Suspense>
  );
}

function MobileStudyReadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lectureId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState("introduce");
  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimer = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});
  const tabBarRef = useRef<HTMLDivElement>(null);

  /* ── 스크롤 시 현재 섹션에 맞게 탭 자동 활성화 ── */
  useEffect(() => {
    const sectionIds = ["introduce", "curriculum", "review", "creator"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        });
      },
      { rootMargin: "-90px 0px -60% 0px", threshold: 0 }
    );
    const timer = setTimeout(() => {
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 500);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [lecture]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        const { data: member } = await supabase.from("members").select("name").eq("id", data.user.id).single();
        setUserName(member?.name || data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "익명");
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

  const allImages: string[] = lecture
    ? [...(lecture.images || []), ...(lecture.thumbnail_url && !(lecture.images || []).includes(lecture.thumbnail_url) ? [lecture.thumbnail_url] : [])]
    : [];
  const slideImages = allImages.length > 0 ? allImages : (lecture?.thumbnail_url ? [lecture.thumbnail_url] : []);

  const startAutoSlide = useCallback(() => {
    if (slideTimer.current) clearInterval(slideTimer.current);
    if (slideImages.length <= 1) return;
    slideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 4000);
  }, [slideImages.length]);

  useEffect(() => {
    startAutoSlide();
    return () => { if (slideTimer.current) clearInterval(slideTimer.current); };
  }, [startAutoSlide]);

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleReviewSubmit = async () => {
    if (!newReview.trim()) return alert("리뷰 내용을 입력해주세요.");
    if (!lecture?.id || !user) return;
    setIsSubmitting(true);
    const res = await createLectureReview({ lecture_id: lecture.id, rating: newRating, content: newReview, user_id: user.id, user_name: userName });
    setIsSubmitting(false);
    if (res.success) {
      alert("리뷰가 등록되었습니다.");
      setNewReview(""); setNewRating(5);
      const d = await getLectureDetail(lecture.id);
      if (d.success && d.data) setLecture(d.data);
    } else { alert("등록 실패"); }
  };

  if (loading) return <div style={{ paddingTop: 50 }}><SubPageHeader title="부동산 특강" /><div style={{ textAlign: "center", padding: 80, color: "#999" }}>⏳ 로딩 중...</div></div>;
  if (!lecture) return <div style={{ paddingTop: 50 }}><SubPageHeader title="부동산 특강" /><div style={{ textAlign: "center", padding: 80, color: "#999" }}>📭 등록된 강의가 없습니다.</div></div>;

  const displayPrice = lecture.discount_price || lecture.price;
  const originalPrice = lecture.discount_price ? lecture.price : null;
  const monthlyPrice = displayPrice && lecture.duration_months ? Math.round(displayPrice / lecture.duration_months) : null;
  const chapters = lecture.chapters || [];
  const reviews = lecture.reviews || [];
  const totalLessons = chapters.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const tabs = [
    { id: "introduce", label: "특강 소개" },
    { id: "curriculum", label: "커리큘럼" },
    { id: "review", label: `리뷰 ${reviews.length}` },
    { id: "creator", label: "크리에이터" },
  ];

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", paddingTop: 36, paddingBottom: 76 }}>
      <SubPageHeader title="부동산 특강" />

      {/* ── 1. 이미지 (비율 유지 축소) ── */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", overflow: "hidden", background: "#f0f0f0" }}>
        {slideImages.length > 0 ? (
          <>
            <div style={{ display: "flex", width: `${slideImages.length * 100}%`, height: "100%", transform: `translateX(-${currentSlide * (100 / slideImages.length)}%)`, transition: "transform 0.5s ease" }}>
              {slideImages.map((url: string, i: number) => (
                <div key={i} style={{ width: `${100 / slideImages.length}%`, height: "100%", flexShrink: 0 }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
            {slideImages.length > 1 && (
              <div style={{ position: "absolute", bottom: 10, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 12, padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
                {currentSlide + 1} / {slideImages.length}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#a8edea,#fed6e3)", fontSize: 28, fontWeight: 800 }}>{lecture.category || "특강"}</div>
        )}
      </div>

      {/* ── 2. 설명 (제목, 가격, CTA) ── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13, fontWeight: 700, color: "#333" }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", overflow: "hidden", background: "#eee", display: "inline-block", flexShrink: 0 }}>
            {lecture.instructor_photo && <img src={lecture.instructor_photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </span>
          {lecture.instructor_name || "강사"} ⌂
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.4, wordBreak: "keep-all" }}>{lecture.title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12 }}>
          <span style={{ color: "#f5a623" }}>⭐ {lecture.rating || "5.0"}</span>
          <span style={{ color: "#ccc" }}>|</span>
          <span style={{ color: "#858a8d" }}>👍 추천 특강</span>
        </div>
        {lecture.discount_label && <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>{lecture.discount_label}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {originalPrice && (
            <>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#ff3f3f" }}>{Math.round((1 - displayPrice / originalPrice) * 100)}%</span>
              <span style={{ fontSize: 14, color: "#aaa", textDecoration: "line-through" }}>{originalPrice.toLocaleString()}원</span>
            </>
          )}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>{displayPrice ? displayPrice.toLocaleString() + "원" : "무료"}</div>
        {monthlyPrice && <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 12 }}>월 {monthlyPrice.toLocaleString()}원 <span style={{ color: "#999", fontWeight: 500 }}>({lecture.duration_months}개월)</span></div>}

        {/* CTA */}
        <button style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: "1px solid #e4e4e4", background: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          쿠폰 받기
        </button>
        <button onClick={() => router.push(`/study_watch?id=${lecture.id}`)} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          특강 수강 시작하기
        </button>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#555", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
          <div>🎥 {totalLessons}개 강의 {lecture.total_duration ? `(총 ${lecture.total_duration})` : ""}</div>
          <div>📝 수업 노트 및 PDF 교재 제공</div>
          <div>💬 크리에이터 Q&A 및 피드백</div>
          <div>♾️ 결제 후 {lecture.duration_months || 5}개월 무제한 수강</div>
        </div>
      </div>

      {/* ── 3. 리뷰 미리보기 (3개) ── */}
      {reviews.length > 0 && (
        <div style={{ padding: "0 16px 16px", borderBottom: "6px solid #f5f5f5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
            {"⭐⭐⭐⭐⭐".split("").map((s, i) => <span key={i} style={{ fontSize: 16, color: i < Math.round(lecture.rating || 5) ? "#f5a623" : "#e0e0e0" }}>★</span>)}
            <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 4 }}>{reviews.length}건</span>
          </div>
          {reviews.slice(0, 3).map((r: any, i: number) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid #f5f5f5" : "none", fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{r.user_name || "수강생"}</div>
              <div style={{ color: "#666", lineHeight: 1.6 }}>{r.content}</div>
            </div>
          ))}
          {reviews.length > 3 && (
            <button onClick={() => scrollToSection("review")} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#333", marginTop: 8 }}>
              리뷰 {reviews.length}개 전체보기 →
            </button>
          )}
        </div>
      )}

      {/* ── 4. 메뉴 탭바 (Sticky) ── */}
      <div ref={tabBarRef} style={{ position: "sticky", top: 36, zIndex: 40, backgroundColor: "#fff", borderBottom: "1px solid #f0f0f0", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", whiteSpace: "nowrap", minWidth: "100%" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => scrollToSection(tab.id)}
                style={{ flex: "1 0 auto", padding: "14px 16px", fontSize: 14, fontWeight: 700, color: isActive ? "#1a1a1a" : "#999", background: "none", border: "none", borderBottom: isActive ? "2px solid #1a1a1a" : "2px solid transparent", transition: "all 0.2s" }}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div style={{ padding: "0 16px" }}>

        {/* 특강 소개 */}
        <div id="introduce" style={{ paddingTop: 24, paddingBottom: 24, borderBottom: "6px solid #f5f5f5" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16, lineHeight: 1.5 }}>이 특강을 듣고 나면<br />이런 걸 할 수 있게 될 거예요</h2>
          {lecture.description ? (
            <div style={{ fontSize: 14, lineHeight: 1.8, color: "#444", wordBreak: "keep-all" }} dangerouslySetInnerHTML={{ __html: lecture.description }} />
          ) : (
            <div style={{ fontSize: 14, color: "#999" }}>강의 상세 소개가 준비 중입니다.</div>
          )}
        </div>

        {/* 커리큘럼 */}
        <div id="curriculum" style={{ paddingTop: 24, paddingBottom: 24, borderBottom: "6px solid #f5f5f5" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>커리큘럼</h2>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>총 {chapters.length}개 챕터, {totalLessons}개 세부 강의</div>
          {chapters.length > 0 ? chapters.map((ch: any, ci: number) => (
            <div key={ch.id || ci} style={{ marginBottom: 12, border: "1px solid #f0f0f0", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setExpandedChapters(prev => ({ ...prev, [ci]: !prev[ci] }))}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px", background: "#fafafa", border: "none", textAlign: "left" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: 4, marginRight: 8 }}>Ch.{ch.chapter_no}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{ch.title}</span>
                </div>
                <span style={{ fontSize: 18, color: "#999", transform: expandedChapters[ci] ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
              </button>
              {expandedChapters[ci] && ch.lessons?.map((lesson: any, li: number) => (
                <div key={li} style={{ padding: "10px 14px 10px 40px", borderTop: "1px solid #f5f5f5", fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#aaa" }}>{li + 1}.</span> {lesson.title}
                  {lesson.duration && <span style={{ marginLeft: "auto", fontSize: 12, color: "#bbb" }}>{lesson.duration}</span>}
                </div>
              ))}
            </div>
          )) : <div style={{ fontSize: 14, color: "#999" }}>커리큘럼이 준비 중입니다.</div>}
        </div>

        {/* 리뷰 전체 */}
        <div id="review" style={{ paddingTop: 24, paddingBottom: 24, borderBottom: "6px solid #f5f5f5" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>수강생 리뷰 {reviews.length}건</h2>
          {visibleReviews.map((r: any, i: number) => (
            <div key={i} style={{ padding: "12px 0", borderTop: i > 0 ? "1px solid #f5f5f5" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{r.user_name || "수강생"}</span>
                <span style={{ fontSize: 12, color: "#f5a623" }}>{"★".repeat(r.rating || 5)}</span>
              </div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{r.content}</div>
            </div>
          ))}
          {reviews.length > 3 && !showAllReviews && (
            <button onClick={() => setShowAllReviews(true)} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
              전체 리뷰 {reviews.length}개 보기
            </button>
          )}
          {showAllReviews && reviews.length > 3 && (
            <button onClick={() => setShowAllReviews(false)} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
              숨기기
            </button>
          )}
          {/* 리뷰 작성 */}
          {user && (
            <div style={{ marginTop: 20, padding: 16, background: "#fafafa", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>✍️ {userName}님, 리뷰를 남겨주세요</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setNewRating(s)} style={{ fontSize: 22, background: "none", border: "none", color: s <= newRating ? "#f5a623" : "#ddd", padding: 0 }}>★</button>
                ))}
              </div>
              <textarea value={newReview} onChange={e => setNewReview(e.target.value)} placeholder="수강 후기를 작성해주세요..." style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #e0e0e0", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
              <button onClick={handleReviewSubmit} disabled={isSubmitting} style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 14, fontWeight: 700, opacity: isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? "등록 중..." : "리뷰 등록"}
              </button>
            </div>
          )}
        </div>

        {/* 크리에이터 */}
        <div id="creator" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>크리에이터 소개</h2>
          <div style={{ padding: 20, background: "#fafafa", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", background: "#e4e4e4", flexShrink: 0 }}>
                {lecture.instructor_photo ? <img src={lecture.instructor_photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#a8edea,#fed6e3)", fontSize: 24 }}>👨‍🏫</div>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#999", marginBottom: 2 }}>공실뉴스 공인 크리에이터</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>{lecture.instructor_name || "강사"}</div>
              </div>
            </div>
            {lecture.instructor_bio ? (
              <div style={{ fontSize: 13, lineHeight: 1.8, color: "#555" }} dangerouslySetInnerHTML={{ __html: lecture.instructor_bio.replace(/\n/g, "<br/>") }} />
            ) : (
              <div style={{ fontSize: 13, color: "#999" }}>강사 소개가 준비 중입니다.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 하단 고정 결제 바 ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 448, background: "#fff", borderTop: "1px solid #eee", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))", zIndex: 50, boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ width: 46, height: 46, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <button onClick={() => router.push(`/study_watch?id=${lecture.id}`)} style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 15, fontWeight: 700 }}>
            특강 수강 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

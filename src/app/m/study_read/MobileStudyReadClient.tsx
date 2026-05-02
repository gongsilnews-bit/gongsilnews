"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, getLectures, createLectureReview } from "@/app/actions/lecture";
import { createClient } from "@/utils/supabase/client";
import SubPageHeader from "../_components/SubPageHeader";
import AnimatedLectureLink from "../study/_components/AnimatedLectureLink";

export default function MobileStudyReadClient({ initialLecture }: { initialLecture: any }) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("introduce");
  const [lecture, setLecture] = useState<any>(initialLecture);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimer = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const tabBarRef = useRef<HTMLDivElement>(null);
  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  const toEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
    if (url.includes("youtube.com/embed")) return url + (url.includes("?") ? "&autoplay=1" : "?autoplay=1");
    return url;
  };

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
    if (!lecture && initialLecture) {
      setLecture(initialLecture);
    }
  }, [initialLecture]);

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

  if (loading) return (
    <div style={{ paddingTop: 50, minHeight: "100vh", backgroundColor: "#fff", display: "flex", flexDirection: "column" }}>
      <SubPageHeader title="부동산 특강" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, marginTop: "20vh" }}>
        <style>{`@keyframes pulse-breathe { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.96); } }`}</style>
        <img src="/new_logo.png" alt="loading" style={{ width: 140, animation: "pulse-breathe 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
        <div style={{ color: "#888", fontSize: 14, fontWeight: 600, letterSpacing: "-0.5px" }}>강의 정보를 불러오는 중입니다...</div>
      </div>
    </div>
  );
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
        <AnimatedLectureLink href={`/m/study_watch?id=${lecture.id}`}>
          <div style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
            특강 수강 시작하기
          </div>
        </AnimatedLectureLink>

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
          <div style={{ position: "relative", maxHeight: expandedSections["introduce"] ? "none" : 280, overflow: "hidden", transition: "max-height 0.3s ease" }}>
            {lecture.description ? (
              <div style={{ fontSize: 14, lineHeight: 1.8, color: "#444", wordBreak: "keep-all" }} dangerouslySetInnerHTML={{ __html: lecture.description }} />
            ) : (
              <div style={{ fontSize: 14, color: "#999" }}>강의 상세 소개가 준비 중입니다.</div>
            )}
            {!expandedSections["introduce"] && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #fff)" }} />
            )}
          </div>
          <button onClick={() => toggleSection("introduce")} style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #e8e8e8", background: "#fff", fontSize: 13, fontWeight: 600, color: "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 16, transform: expandedSections["introduce"] ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            {expandedSections["introduce"] ? "숨기기" : "더보기"}
          </button>
        </div>

        {/* 커리큘럼 */}
        <div id="curriculum" style={{ paddingTop: 24, paddingBottom: 24, borderBottom: "6px solid #f5f5f5" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>커리큘럼</h2>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>총 {chapters.length}개 챕터, {totalLessons}개 세부 강의</div>
          <div style={{ position: "relative", maxHeight: expandedSections["curriculum"] ? "none" : 300, overflow: "hidden", transition: "max-height 0.3s ease" }}>
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
              {expandedChapters[ci] && ch.lessons?.map((lesson: any, li: number) => {
                const hasVideo = !!lesson.video_url;
                const canPreview = lesson.is_preview && hasVideo;
                return (
                  <div key={li}
                    onClick={() => { if (canPreview) { setPreviewUrl(lesson.video_url); setPreviewTitle(`${ch.chapter_no}-${lesson.lesson_no}. ${lesson.title}`); } }}
                    style={{ padding: "12px 14px 12px 40px", borderTop: "1px solid #f5f5f5", fontSize: 13, color: canPreview ? "#1a1a1a" : "#555", display: "flex", alignItems: "center", gap: 8, cursor: canPreview ? "pointer" : "default" }}>
                    <span style={{ color: "#aaa", flexShrink: 0 }}>{lesson.lesson_no || li + 1}.</span>
                    <span style={{ fontWeight: canPreview ? 700 : 400 }}>{lesson.title}</span>
                    {lesson.is_preview && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: hasVideo ? "#fff" : "#059669", background: hasVideo ? "#059669" : "#ecfdf5", padding: "3px 7px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {hasVideo ? "▶ 미리보기" : "미리보기"}
                      </span>
                    )}
                    {lesson.duration && <span style={{ marginLeft: "auto", fontSize: 12, color: "#bbb", flexShrink: 0 }}>{lesson.duration}</span>}
                  </div>
                );
              })}
            </div>
          )) : <div style={{ fontSize: 14, color: "#999" }}>커리큘럼이 준비 중입니다.</div>}
            {!expandedSections["curriculum"] && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #fff)" }} />
            )}
          </div>
          <button onClick={() => toggleSection("curriculum")} style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #e8e8e8", background: "#fff", fontSize: 13, fontWeight: 600, color: "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 16, transform: expandedSections["curriculum"] ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            {expandedSections["curriculum"] ? "숨기기" : "더보기"}
          </button>
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

        <div id="creator" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>크리에이터 소개</h2>
          <div style={{ position: "relative", maxHeight: expandedSections["creator"] ? "none" : 200, overflow: "hidden", transition: "max-height 0.3s ease" }}>
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
            {!expandedSections["creator"] && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #fff)" }} />
            )}
          </div>
          <button onClick={() => toggleSection("creator")} style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #e8e8e8", background: "#fff", fontSize: 13, fontWeight: 600, color: "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 16, transform: expandedSections["creator"] ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            {expandedSections["creator"] ? "숨기기" : "더보기"}
          </button>
        </div>
      </div>

      {/* ── 영상 미리보기 모달 ── */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{previewTitle}</div>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", background: "#000" }}>
            {(() => { const embed = toEmbedUrl(previewUrl); return embed && embed.includes("youtube") ? (
              <iframe src={embed} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay; encrypted-media" allowFullScreen />
            ) : (
              <video src={previewUrl} controls autoPlay style={{ width: "100%", height: "100%" }} />
            ); })()}
          </div>
          <button onClick={() => setPreviewUrl(null)} style={{ marginTop: 16, padding: "10px 32px", borderRadius: 8, border: "none", background: "#fff", fontSize: 14, fontWeight: 700 }}>닫기</button>
        </div>
      )}

      {/* ── 하단 고정 결제 바 ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 448, background: "#fff", borderTop: "1px solid #eee", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))", zIndex: 50, boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ width: 46, height: 46, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <AnimatedLectureLink href={`/m/study_watch?id=${lecture.id}`} style={{ flex: 1 }}>
            <div style={{ width: "100%", height: 46, borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              특강 수강 시작하기
            </div>
          </AnimatedLectureLink>
        </div>
      </div>
    </div>
  );
}

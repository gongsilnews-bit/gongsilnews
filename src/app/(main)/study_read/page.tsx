"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, getLectures } from "@/app/actions/lecture";

export default function StudyReadPage() {
  return (
    <Suspense fallback={<div style={{ padding: "100px", textAlign: "center", color: "#6b7280" }}>수강 신청 페이지를 불러오는 중입니다...</div>}>
      <StudyReadContent />
    </Suspense>
  );
}

function StudyReadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lectureId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState("introduce");
  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ── 캐러셀 ── */
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimer = useRef<NodeJS.Timeout | null>(null);

  /* ── 영상 미리보기 모달 ── */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

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

  /* ── 이미지 배열 구성 ── */
  const allImages: string[] = lecture
    ? [...(lecture.images || []), ...(lecture.thumbnail_url && !(lecture.images || []).includes(lecture.thumbnail_url) ? [lecture.thumbnail_url] : [])]
    : [];
  const slideImages = allImages.length > 0 ? allImages : (lecture?.thumbnail_url ? [lecture.thumbnail_url] : []);

  /* ── 자동 롤링 ── */
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

  const goSlide = (dir: number) => {
    setCurrentSlide((prev) => (prev + dir + slideImages.length) % slideImages.length);
    startAutoSlide();
  };

  /* ── YouTube embed URL 변환 ── */
  const toEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    // youtube.com/watch?v=xxx
    const match1 = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (match1) return `https://www.youtube.com/embed/${match1[1]}?autoplay=1`;
    // already embed
    if (url.includes("youtube.com/embed")) return url + (url.includes("?") ? "&autoplay=1" : "?autoplay=1");
    // bare video URL
    return url;
  };

  const scrollToAnchor = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 210;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-w-[1200px] bg-white font-sans text-[#222]">
        <main className="w-[1200px] mx-auto px-[20px] pt-[30px] pb-[100px]">
          <div style={{ textAlign: "center", padding: "120px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>강의 정보를 불러오는 중...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="min-w-[1200px] bg-white font-sans text-[#222]">
        <main className="w-[1200px] mx-auto px-[20px] pt-[30px] pb-[100px]">
          <div style={{ textAlign: "center", padding: "120px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#374151" }}>등록된 강의가 없습니다.</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>관리자에서 강의를 등록해주세요.</div>
          </div>
        </main>
      </div>
    );
  }

  const displayPrice = lecture.discount_price || lecture.price;
  const originalPrice = lecture.discount_price ? lecture.price : null;
  const monthlyPrice = displayPrice && lecture.duration_months ? Math.round(displayPrice / lecture.duration_months) : null;
  const chapters = lecture.chapters || [];
  const reviews = lecture.reviews || [];
  const totalLessons = chapters.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0);

  return (
    <div className="bg-white font-sans text-gray-900" style={{ minWidth: 1200 }}>
      {/* ── 영상 미리보기 모달 ── */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{ position: "relative", width: "80%", maxWidth: 960, aspectRatio: "16/9" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              style={{
                position: "absolute", top: -44, right: 0,
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff", fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            >✕</button>

            {previewTitle && (
              <div style={{ position: "absolute", top: -44, left: 0, color: "#fff", fontSize: 15, fontWeight: 700 }}>
                🎬 {previewTitle}
              </div>
            )}

            {toEmbedUrl(previewUrl) ? (
              <iframe
                src={toEmbedUrl(previewUrl)!}
                style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={previewUrl} controls autoPlay style={{ width: "100%", height: "100%", borderRadius: 12, background: "#000" }} />
            )}
          </div>
        </div>
      )}

      <main style={{ width: 1200, margin: "0 auto", padding: "40px 24px 120px" }}>
        {/* Breadcrumb */}
        <div className="flex items-center font-medium" style={{ fontSize: 13, color: "#858a8d", marginBottom: 24, gap: 8 }}>
          <span className="cursor-pointer hover:text-black transition-colors">부동산 특강</span>
          <span className="text-gray-300">&gt;</span>
          <span className="cursor-pointer hover:text-black transition-colors">{lecture.category || "중개실무"}</span>
        </div>

        <div className="flex relative" style={{ gap: 48, alignItems: "stretch" }}>
          {/* 좌측 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">

            {/* ── 이미지 캐러셀 (Class101 스타일 라운드) ── */}
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", borderRadius: 16, overflow: "hidden", marginBottom: 40, background: "#f8f8f8", border: "1px solid #f0f0f0" }}>
              {slideImages.length > 0 ? (
                <>
                  <div style={{ display: "flex", width: `${slideImages.length * 100}%`, height: "100%", transform: `translateX(-${currentSlide * (100 / slideImages.length)}%)`, transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)" }}>
                    {slideImages.map((url, idx) => (
                      <div key={idx} style={{ width: `${100 / slideImages.length}%`, height: "100%", flexShrink: 0 }}>
                        <img src={url} alt={`강의 이미지 ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>

                  {slideImages.length > 1 && (
                    <>
                      <button onClick={() => goSlide(-1)}
                        style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "1px solid #eaeaea", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", color: "#333", transition: "all 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fff"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.9)"}
                      >◀</button>
                      <button onClick={() => goSlide(1)}
                        style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "1px solid #eaeaea", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", color: "#333", transition: "all 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fff"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.9)"}
                      >▶</button>
                    </>
                  )}

                  {slideImages.length > 1 && (
                    <div style={{ position: "absolute", top: 16, right: 16, padding: "5px 14px", borderRadius: 20, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                      {currentSlide + 1} / {slideImages.length}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", color: "#333", fontSize: 32, fontWeight: 800 }}>
                  {lecture.category || "특강"}
                </div>
              )}
            </div>

            {/* Sticky Tab */}
            <div className="sticky bg-white z-50 flex border-b transition-colors" style={{ position: "sticky", top: 136, borderColor: "#f0f0f0", marginBottom: 48 }}>
              {["introduce", "curriculum", "review", "creator"].map((tabId) => {
                const labels: any = { introduce: "클래스 소개", curriculum: "커리큘럼", creator: "크리에이터", review: `리뷰 ${lecture.review_count || reviews.length}` };
                const isActive = activeTab === tabId;
                return (
                  <button key={tabId} onClick={() => scrollToAnchor(tabId)}
                    className="relative transition-colors"
                    style={{ padding: "16px 0", marginRight: 32, fontSize: 16, fontWeight: 700, color: isActive ? "#1a1a1a" : "#858a8d" }}>
                    {labels[tabId]}
                    {isActive && <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 3, backgroundColor: "#1a1a1a" }} />}
                  </button>
                );
              })}
            </div>

            {/* 1. 클래스 소개 */}
            <div id="introduce" style={{ paddingTop: 10, marginBottom: 80 }}>
              <h2 className="font-bold leading-snug" style={{ fontSize: 24, color: "#1a1a1a", marginBottom: 28 }}>이 클래스를 듣고 나면<br />이런 걸 할 수 있게 될 거예요</h2>
              {lecture.description ? (
                <div className="break-keep" style={{ fontSize: 16, lineHeight: 1.8, color: "#3e4042" }} dangerouslySetInnerHTML={{ __html: lecture.description }} />
              ) : (
                <div className="text-[16px] leading-[1.8] text-[#858a8d]"><p className="mb-[1em]">강의 상세 소개가 준비 중입니다.</p></div>
              )}
            </div>

            {/* 2. 커리큘럼 */}
            <div id="curriculum" style={{ paddingTop: 10, marginBottom: 80 }}>
              <h2 className="font-bold" style={{ fontSize: 24, color: "#1a1a1a", marginBottom: 8 }}>커리큘럼</h2>
              <div className="font-medium" style={{ fontSize: 15, color: "#858a8d", marginBottom: 32 }}>
                총 {chapters.length}개 챕터, {totalLessons}개 세부 강의로 구성되어 있습니다.
              </div>

              <div className="flex flex-col" style={{ gap: 16 }}>
                {chapters.length > 0 ? (
                  chapters.map((chapter: any, ci: number) => (
                    <div key={chapter.id || ci} className="transition-colors hover:bg-white" style={{ border: "1px solid #f0f0f0", backgroundColor: "#fafafa", borderRadius: 12, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
                        <span className="font-bold" style={{ fontSize: 13, color: "#059669", backgroundColor: "#ecfdf5", padding: "4px 10px", borderRadius: 6 }}>Chapter {chapter.chapter_no}</span>
                        <h3 className="font-bold" style={{ fontSize: 18, color: "#1a1a1a" }}>{chapter.title}</h3>
                      </div>
                      <ul className="m-0 p-0 list-none flex flex-col" style={{ gap: 12 }}>
                        {(chapter.lessons || []).map((lesson: any, li: number) => {
                          const hasVideo = !!lesson.video_url;
                          const canPreview = lesson.is_preview && hasVideo;
                          return (
                            <li key={lesson.id || li}
                              className={`flex justify-between items-center transition-all ${canPreview ? "cursor-pointer bg-white" : "bg-white"}`}
                              style={{ fontSize: 15, border: "1px solid #f0f0f0", borderRadius: 8, padding: 16 }}
                              onMouseEnter={(e) => { if (canPreview) e.currentTarget.style.borderColor = "#1a1a1a"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f0f0f0"; }}
                              onClick={() => {
                                if (canPreview) {
                                  setPreviewUrl(lesson.video_url);
                                  setPreviewTitle(`${chapter.chapter_no}-${lesson.lesson_no}. ${lesson.title}`);
                                }
                              }}
                            >
                              <span className="flex items-center" style={{ gap: 12, color: canPreview ? "#1a1a1a" : "#3e4042", fontWeight: canPreview ? 700 : 500 }}>
                                <span className="rounded-full flex items-center justify-center font-bold" style={{ width: 28, height: 28, backgroundColor: "#f8f8f8", color: "#858a8d", fontSize: 12 }}>
                                  {lesson.lesson_no}
                                </span>
                                {lesson.title}
                                {lesson.is_preview && (
                                  <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    color: hasVideo ? "#fff" : "#059669",
                                    background: hasVideo ? "#059669" : "#ecfdf5",
                                    padding: "4px 8px", borderRadius: 4, marginLeft: 8,
                                    display: "inline-flex", alignItems: "center", gap: 3,
                                  }}>
                                    {hasVideo ? "▶ 미리보기" : "미리보기"}
                                  </span>
                                )}
                              </span>
                              <span className="font-medium" style={{ color: "#858a8d", fontSize: 14 }}>{lesson.duration || "00:00"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 40, textAlign: "center", color: "#858a8d", fontSize: 15, background: "#fafafa", borderRadius: 12 }}>커리큘럼이 준비 중입니다.</div>
                )}
              </div>
            </div>

            {/* 3. 리뷰 */}
            <div id="review" style={{ paddingTop: 10, marginBottom: 80 }}>
              <div className="flex justify-between items-end" style={{ marginBottom: 32 }}>
                <h2 className="font-bold" style={{ fontSize: 24, color: "#1a1a1a" }}>실제 수강생 리뷰</h2>
              </div>
              {reviews.length > 0 ? (
                <>
                  <div className="flex overflow-x-auto hide-scrollbar" style={{ gap: 16, paddingBottom: 16, scrollbarWidth: "none" }}>
                    {reviews.map((review: any, idx: number) => (
                      <div key={review.id || idx} className="shrink-0 flex flex-col bg-white" style={{ width: 300, padding: 24, border: "1px solid #f0f0f0", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
                        <div className="flex items-center" style={{ gap: 8, marginBottom: 16 }}>
                          <div className="flex" style={{ gap: 2, color: "#f5a623", fontSize: 14 }}>{"⭐".repeat(review.rating || 5)}</div>
                          <span className="font-bold" style={{ fontSize: 14, color: "#1a1a1a" }}>{review.rating || 5}</span>
                        </div>
                        <div className="flex-1 break-keep line-clamp-4" style={{ fontSize: 15, color: "#3e4042", lineHeight: 1.6, marginBottom: 24 }}>{review.content}</div>
                        <div className="flex items-center font-medium" style={{ gap: 8, fontSize: 13, color: "#858a8d" }}>
                          <span className="rounded-full flex items-center justify-center font-bold" style={{ width: 24, height: 24, backgroundColor: "#f0f0f0", fontSize: 11, color: "#858a8d" }}>
                            {review.user_name ? review.user_name.charAt(0) : "익"}
                          </span>
                          <span className="font-semibold" style={{ color: "#1a1a1a" }}>{review.user_name || "익명"}</span>
                          <span>·</span>
                          <span>{review.created_at ? new Date(review.created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {reviews.length > 4 && (
                    <button className="w-full font-bold hover:bg-gray-50 transition-colors" style={{ marginTop: 16, padding: "16px 0", border: "1px solid #e4e4e4", borderRadius: 8, fontSize: 15, color: "#1a1a1a" }}>
                      {lecture.review_count || reviews.length}개 리뷰 전체 보기
                    </button>
                  )}
                </>
              ) : (
                <div style={{ padding: 60, textAlign: "center", color: "#858a8d", border: "1px solid #f0f0f0", borderRadius: 12, background: "#fafafa" }}>
                  <div className="text-[32px] mb-[12px]">💬</div>
                  <div className="text-[16px] font-[600] text-[#3e4042]">아직 등록된 리뷰가 없습니다.</div>
                </div>
              )}
            </div>

            {/* 4. 크리에이터 */}
            <div id="creator" style={{ paddingTop: 10, marginBottom: 40 }}>
              <h2 className="font-bold" style={{ fontSize: 24, color: "#1a1a1a", marginBottom: 24 }}>크리에이터 소개</h2>
              <div style={{ padding: 40, backgroundColor: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 16 }}>
                <div className="flex items-center" style={{ gap: 24, marginBottom: 24 }}>
                  <div className="shrink-0 rounded-full overflow-hidden" style={{ width: 80, height: 80, backgroundColor: "#e4e4e4" }}>
                    {lecture.instructor_photo ? (
                      <img src={lecture.instructor_photo} className="w-full h-full object-cover" alt="크리에이터" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-white" style={{ fontSize: 28, background: "linear-gradient(135deg, #a8edea, #fed6e3)" }}>👨‍🏫</div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold" style={{ fontSize: 14, color: "#858a8d", marginBottom: 4 }}>공실뉴스 공인 크리에이터</div>
                    <h3 className="font-bold" style={{ fontSize: 22, color: "#1a1a1a" }}>{lecture.instructor_name || "강사"}</h3>
                  </div>
                </div>
                {lecture.instructor_bio ? (
                  <div className="break-keep" style={{ fontSize: 16, lineHeight: 1.8, color: "#3e4042" }} dangerouslySetInnerHTML={{ __html: lecture.instructor_bio.replace(/\n/g, "<br/>") }} />
                ) : (
                  <div style={{ fontSize: 16, lineHeight: 1.8, color: "#858a8d" }}>강사 상세 소개가 준비 중입니다.</div>
                )}
              </div>
            </div>

          </div>

          {/* 우측 Sticky 박스 (Class101 스타일) */}
          <div className="shrink-0" style={{ width: 360 }}>
            <div className="sticky" style={{ position: "sticky", top: 136 }}>
              
              {/* Creator Info (Small) */}
              <div className="flex items-center font-bold" style={{ gap: 8, marginBottom: 12, fontSize: 14, color: "#1a1a1a" }}>
                <span className="rounded-full overflow-hidden" style={{ width: 20, height: 20, backgroundColor: "#eee" }}>
                  {lecture.instructor_photo && <img src={lecture.instructor_photo} className="w-full h-full object-cover" />}
                </span>
                {lecture.instructor_name || "연플레르"} ⌂
              </div>

              {/* Title */}
              <h1 className="font-bold leading-snug break-keep" style={{ fontSize: 24, color: "#1a1a1a", marginBottom: 16 }}>
                {lecture.title}
              </h1>

              {/* Rating & Badge */}
              <div className="flex items-center font-semibold border-b" style={{ gap: 12, fontSize: 14, color: "#1a1a1a", marginBottom: 24, paddingBottom: 24, borderColor: "#f0f0f0" }}>
                <span className="flex items-center" style={{ gap: 4, color: "#f5a623" }}>⭐ {lecture.rating || "5.0"} <span className="font-medium" style={{ color: "#858a8d" }}>({lecture.review_count || reviews.length})</span></span>
                <span style={{ color: "#e4e4e4" }}>|</span>
                <span className="flex items-center" style={{ gap: 4, color: "#858a8d" }}><span style={{ color: "#1a1a1a" }}>👍</span> 추천 클래스</span>
              </div>

              {/* Price Section */}
              <div style={{ marginBottom: 24 }}>
                {lecture.discount_label && <div className="font-bold" style={{ fontSize: 14, color: "#059669", marginBottom: 4 }}>{lecture.discount_label}</div>}
                
                {originalPrice && (
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="font-bold" style={{ fontSize: 16, color: "#ff3f3f" }}>
                      {Math.round((1 - displayPrice / originalPrice) * 100)}%
                    </span>
                    <span className="line-through font-medium" style={{ fontSize: 16, color: "#a2a2a2" }}>{originalPrice.toLocaleString()}원</span>
                  </div>
                )}
                
                <div className="flex items-end tracking-tight" style={{ gap: 4, marginBottom: 8 }}>
                  <span className="font-bold leading-none" style={{ fontSize: 28, color: "#1a1a1a" }}>{displayPrice ? displayPrice.toLocaleString() + "원" : "무료"}</span>
                </div>
                
                {monthlyPrice && (
                  <div className="font-bold" style={{ fontSize: 15, color: "#059669" }}>
                    월 {monthlyPrice.toLocaleString()}원 <span className="font-medium" style={{ color: "#858a8d" }}>({lecture.duration_months}개월)</span>
                  </div>
                )}
              </div>

              {/* Download Coupon Button */}
              <button className="w-full font-bold flex items-center justify-center transition-colors hover:bg-gray-50" style={{ marginBottom: 16, padding: "14px 0", borderRadius: 8, border: "1px solid #e4e4e4", backgroundColor: "white", fontSize: 14, color: "#1a1a1a", gap: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                쿠폰 받기
              </button>

              {/* CTA Button */}
              <button 
                onClick={() => router.push(`/study_watch?id=${lecture.id}`)} 
                className="w-full font-bold text-white transition-colors"
                style={{ marginBottom: 24, padding: "18px 0", borderRadius: 8, fontSize: 16, backgroundColor: "#059669", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#047857"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#059669"; }}
              >
                클래스 수강 시작하기
              </button>

              {/* Share & Like */}
              <div className="flex justify-center border-b" style={{ gap: 40, paddingBottom: 24, marginBottom: 24, borderColor: "#f0f0f0" }}>
                <div className="flex flex-col items-center cursor-pointer group" style={{ gap: 6 }}>
                  <svg className="transition-colors text-gray-500 group-hover:text-black" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  <span className="font-semibold transition-colors text-gray-500 group-hover:text-black" style={{ fontSize: 13 }}>1,043</span>
                </div>
                <div className="flex flex-col items-center cursor-pointer group" style={{ gap: 6 }}>
                  <svg className="transition-colors text-gray-500 group-hover:text-black" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                  <span className="font-semibold transition-colors text-gray-500 group-hover:text-black" style={{ fontSize: 13 }}>공유</span>
                </div>
              </div>

              {/* Class Features */}
              <div className="flex flex-col" style={{ gap: 14 }}>
                <div className="flex items-center font-medium" style={{ gap: 12, fontSize: 14, color: "#3e4042" }}>
                  <span style={{ fontSize: 18 }}>🎥</span> {totalLessons}개 강의 {lecture.total_duration ? `(총 ${lecture.total_duration})` : ""}
                </div>
                <div className="flex items-center font-medium" style={{ gap: 12, fontSize: 14, color: "#3e4042" }}>
                  <span style={{ fontSize: 18 }}>📝</span> 수업 노트 및 PDF 교재 제공
                </div>
                <div className="flex items-center font-medium" style={{ gap: 12, fontSize: 14, color: "#3e4042" }}>
                  <span style={{ fontSize: 18 }}>💬</span> 크리에이터 Q&A 및 피드백
                </div>
                <div className="flex items-center font-medium" style={{ gap: 12, fontSize: 14, color: "#3e4042" }}>
                  <span style={{ fontSize: 18 }}>♾️</span> 결제 후 {lecture.duration_months || 5}개월 무제한 수강
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

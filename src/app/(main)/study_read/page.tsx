"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, getLectures } from "@/app/actions/lecture";

export default function StudyReadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lectureId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState("introduce");
  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (lectureId) {
        const res = await getLectureDetail(lectureId);
        if (res.success && res.data) {
          setLecture(res.data);
        }
      } else {
        // id 없으면 첫 번째 ACTIVE 강의 보여주기
        const res = await getLectures({ status: "ACTIVE" });
        if (res.success && res.data && res.data.length > 0) {
          const detail = await getLectureDetail(res.data[0].id);
          if (detail.success && detail.data) {
            setLecture(detail.data);
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [lectureId]);

  const scrollToAnchor = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  /* ── 로딩 상태 ── */
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

  /* ── 강의 없음 ── */
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

  /* ── 가격 포맷 ── */
  const displayPrice = lecture.discount_price || lecture.price;
  const originalPrice = lecture.discount_price ? lecture.price : null;
  const monthlyPrice = displayPrice && lecture.duration_months ? Math.round(displayPrice / lecture.duration_months) : null;
  const chapters = lecture.chapters || [];
  const reviews = lecture.reviews || [];
  const totalLessons = chapters.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0);

  return (
    <div className="min-w-[1200px] bg-white font-sans text-[#222]">
      <main className="w-[1200px] mx-auto px-[20px] pt-[30px] pb-[100px]">
        {/* Breadcrumb */}
        <div className="text-[13px] text-[#666] mb-[20px] flex items-center gap-[8px]">
          <span className="cursor-pointer hover:font-bold">부동산 특강</span>
          <span className="text-[#ccc]">&gt;</span>
          <span className="cursor-pointer hover:font-bold">{lecture.category || "중개실무"}</span>
        </div>

        <div className="flex gap-[40px] relative">
          {/* 좌측 메인 콘텐츠 (65%) */}
          <div className="flex-[6.5] min-w-0">
            {/* Thumbnail */}
            <div className="w-full aspect-[16/9] bg-[#f0f0f0] rounded-[4px] overflow-hidden relative mb-[24px]">
              {lecture.thumbnail_url ? (
                <img src={lecture.thumbnail_url} className="w-full h-full object-cover" alt="클래스 썸네일" />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "#fff", fontSize: 28, fontWeight: 800 }}>
                  {lecture.category || "특강"}
                </div>
              )}
            </div>

            {/* 타이틀 영역 */}
            <div className="mb-[40px]">
              {lecture.subtitle && (
                <div className="text-[14px] font-[700] text-[#8a3ffc] mb-[8px]">{lecture.subtitle}</div>
              )}
              <h1 className="text-[32px] font-[800] text-[#111] leading-[1.3] mb-[12px] break-words">
                {lecture.title}
              </h1>
              <div className="text-[14px] text-[#666] flex items-center gap-[12px]">
                <span className="flex items-center gap-[4px]">
                  <span className="w-[24px] h-[24px] rounded-full bg-[#eee] overflow-hidden">
                    {lecture.instructor_photo && (
                      <img src={lecture.instructor_photo} className="w-full h-full object-cover" />
                    )}
                  </span>
                  {lecture.instructor_name || "강사"}
                </span>
                <span className="text-[#eee]">|</span>
                <span className="flex items-center gap-[4px]">⭐ {lecture.rating || "0.0"} ({lecture.review_count || 0})</span>
                <span className="text-[#eee]">|</span>
                <span>수강생 {(lecture.student_count || 0).toLocaleString()}명</span>
              </div>
            </div>

            {/* Sticky Tab Menu */}
            <div className="sticky top-[90px] border-b border-[#eee] flex mb-[40px]" style={{ zIndex: 90, backgroundColor: "#ffffff" }}>
              {["introduce", "curriculum", "creator", "review"].map((tabId) => {
                const labels: any = { introduce: "클래스 소개", curriculum: "커리큘럼", creator: "크리에이터", review: "리뷰" };
                return (
                  <button
                    key={tabId}
                    onClick={() => scrollToAnchor(tabId)}
                    className={`flex-1 py-[16px] text-[15px] font-[700] border-b-[3px] transition-colors ${activeTab === tabId ? "border-[#111] text-[#111]" : "border-transparent text-[#888] hover:text-[#111]"}`}
                  >
                    {labels[tabId]}
                  </button>
                );
              })}
            </div>

            {/* 1. 클래스 소개 (introduce) */}
            <div id="introduce" className="pt-[10px] mb-[80px]">
              <h2 className="text-[24px] font-[800] text-[#111] mb-[24px]">
                이 클래스를 듣고 나면<br />이런 걸 할 수 있게 될 거예요
              </h2>
              {lecture.description ? (
                <div className="text-[16px] leading-[1.8] text-[#333]" dangerouslySetInnerHTML={{ __html: lecture.description.replace(/\n/g, "<br/>") }} />
              ) : (
                <div className="text-[16px] leading-[1.8] text-[#333]">
                  <p className="mb-[1em]">강의 상세 소개가 준비 중입니다.</p>
                </div>
              )}
            </div>

            {/* 2. 커리큘럼 (curriculum) */}
            <div id="curriculum" className="pt-[10px] mb-[80px]">
              <h2 className="text-[24px] font-[800] text-[#111] mb-[24px]">커리큘럼</h2>
              <div className="text-[15px] text-[#666] mb-[24px]">
                총 {chapters.length} 챕터, {totalLessons}개 세부 강의로 구성되어 있습니다.
              </div>

              <div className="flex flex-col gap-[12px]">
                {chapters.length > 0 ? (
                  chapters.map((chapter: any, ci: number) => (
                    <div key={chapter.id || ci} className="border border-[#e5e5e5] rounded-[8px] p-[24px]">
                      <div className="text-[14px] font-[700] text-[#8a3ffc] mb-[8px]">Chapter {chapter.chapter_no}</div>
                      <h3 className="text-[18px] font-[700] text-[#111] mb-[16px]">{chapter.title}</h3>
                      <ul className="m-0 p-0 list-none flex flex-col gap-[12px]">
                        {(chapter.lessons || []).map((lesson: any, li: number) => (
                          <li key={lesson.id || li} className="flex justify-between items-center text-[15px] text-[#444]">
                            <span className="flex items-center gap-[8px]">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polygon points="10 8 16 12 10 16 10 8" />
                              </svg>
                              {chapter.chapter_no}-{lesson.lesson_no}. {lesson.title}
                              {lesson.is_preview && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", background: "#dbeafe", padding: "2px 6px", borderRadius: 4, marginLeft: 4 }}>미리보기</span>
                              )}
                            </span>
                            <span className="text-[#999] text-[13px]">{lesson.duration || "-"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                    커리큘럼이 준비 중입니다.
                  </div>
                )}
              </div>
            </div>

            {/* 3. 크리에이터 (creator) */}
            <div id="creator" className="pt-[10px] mb-[80px]">
              <h2 className="text-[24px] font-[800] text-[#111] mb-[24px]">크리에이터 소개</h2>
              <div className="flex gap-[24px] items-center p-[32px] bg-[#f8f9fa] rounded-[12px]">
                <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#ddd" }}>
                  {lecture.instructor_photo ? (
                    <img src={lecture.instructor_photo} className="w-full h-full object-cover" alt="크리에이터" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#fff", background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                      👨‍🏫
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-[20px] font-[800] text-[#111] mb-[8px]">{lecture.instructor_name || "강사"}</h3>
                  {lecture.instructor_bio ? (
                    <div className="text-[15px] leading-[1.6] text-[#555]" dangerouslySetInnerHTML={{ __html: lecture.instructor_bio.replace(/\n/g, "<br/>") }} />
                  ) : (
                    <div className="text-[15px] leading-[1.6] text-[#555]">강사 소개가 준비 중입니다.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. 리뷰 (review) */}
            <div id="review" className="pt-[10px] mb-[40px]">
              <div className="flex justify-between items-end mb-[24px]">
                <h2 className="text-[24px] font-[800] text-[#111]">실제 수강생 리뷰</h2>
                {reviews.length > 4 && (
                  <span className="text-[14px] font-[700] text-[#8a3ffc] cursor-pointer hover:underline">
                    리뷰 {lecture.review_count || reviews.length}개 더보기 &gt;
                  </span>
                )}
              </div>

              {reviews.length > 0 ? (
                <div className="grid grid-cols-2 gap-[16px]">
                  {reviews.slice(0, 4).map((review: any, idx: number) => (
                    <div key={review.id || idx} className="p-[24px] border border-[#e5e5e5] rounded-[8px]">
                      <div className="flex gap-[4px] mb-[12px] text-[#ffc107]">
                        {"⭐".repeat(review.rating || 5)}
                      </div>
                      <div className="text-[15px] text-[#333] leading-[1.6] mb-[16px]">{review.content}</div>
                      <div className="flex justify-between items-center text-[13px] text-[#999]">
                        <span className="font-[600] text-[#666]">{review.user_name || "익명"}님</span>
                        <span>{review.created_at ? new Date(review.created_at).toLocaleDateString("ko-KR") : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", border: "1px solid #e5e5e5", borderRadius: 8 }}>
                  아직 리뷰가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* 우측 Sticky 플로팅 박스 (35%) */}
          <div className="flex-[3.5] min-w-0">
            <div className="sticky top-[110px] bg-white border border-[#e5e5e5] rounded-[12px] p-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              {lecture.discount_label && (
                <div className="text-[13px] font-[700] text-[#eb5757] mb-[8px]">{lecture.discount_label}</div>
              )}
              <div className="flex items-end gap-[8px] mb-[8px]">
                {originalPrice && (
                  <span className="text-[18px] text-[#888] line-through font-[500]">{originalPrice.toLocaleString()}원</span>
                )}
                <span className="text-[28px] font-[800] text-[#111] leading-none">
                  {displayPrice ? displayPrice.toLocaleString() + "원" : "무료"}
                </span>
                {lecture.duration_months && (
                  <span className="text-[16px] text-[#111] font-[600]">/ {lecture.duration_months}개월</span>
                )}
              </div>
              {monthlyPrice && (
                <div className="text-[13px] text-[#666] mb-[24px] pb-[24px] border-b border-[#eee]">
                  월 {monthlyPrice.toLocaleString()}원으로 시작하는 {lecture.category || "부동산"} 마스터
                </div>
              )}

              <div className="flex flex-col gap-[12px] mb-[32px]">
                <div className="text-[14px] font-[700] text-[#111] mb-[4px]">클래스 정보</div>
                <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                  <span>🎥 {totalLessons}개 강의 {lecture.total_duration ? `(총 ${lecture.total_duration})` : ""}</span>
                </div>
                <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                  <span>📝 수업 노트 및 PDF 교재 제공</span>
                </div>
                <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                  <span>💬 크리에이터 Q&A 및 피드백</span>
                </div>
                <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                  <span>♾️ 결제 후 {lecture.duration_months || 5}개월 무제한 수강</span>
                </div>
              </div>

              {/* 구매 버튼 */}
              <div className="flex flex-col gap-[10px]">
                <button
                  onClick={() => router.push(`/study_watch?id=${lecture.id}`)}
                  className="w-full bg-[#111] text-white py-[18px] rounded-[6px] text-[16px] font-[800] hover:bg-[#333] transition-colors"
                >
                  클래스 수강 시작하기
                </button>
                <div className="flex gap-[10px]">
                  <button className="flex-1 py-[14px] rounded-[6px] border border-[#d1d5db] text-[#555] font-[700] hover:bg-[#f9fafb] flex justify-center items-center gap-[6px]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    찜하기
                  </button>
                  <button className="flex-1 py-[14px] rounded-[6px] border border-[#d1d5db] text-[#555] font-[700] hover:bg-[#f9fafb] flex justify-center items-center gap-[6px]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    공유하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

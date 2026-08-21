"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MobileTopBarHeader from "../_components/MobileTopBarHeader";
import StudySubMenuBar, { type StudyTab } from "../_components/StudySubMenuBar";

// SVG Pictogram Icons
const IconDrone = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5l2 2M19 5l-2 2M5 19l2-2M19 19l-2-2"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>;
const IconApp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IconAI = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M16 14H8l-2 8h12l-2-8z"/><line x1="9" y1="18" x2="15" y2="18"/></svg>;
const IconMusic = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const IconDoc = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;

const BOARD_ITEMS = [
  { id: "drone", name: "드론영상", desc: "매물 홍보용 드론 항공 촬영 영상", icon: <IconDrone /> },
  { id: "app", name: "APP(앱)", desc: "부동산 업무에 유용한 앱 모음", icon: <IconApp /> },
  { id: "prompt", name: "AI 프롬프트", desc: "ChatGPT·AI 활용 프롬프트 공유", icon: <IconAI /> },
  { id: "sound", name: "음원", desc: "매물 영상용 배경 음원 자료", icon: <IconMusic /> },
  { id: "doc", name: "계약서/양식", desc: "부동산 계약서 및 실무 양식", icon: <IconDoc /> },
];

const FAQS = [
  {
    q: "초보 공인중개사도 AI 쇼츠를 만들 수 있나요?",
    a: "네! 코딩 없이 클릭 몇 번으로 매물 쇼츠를 뽑아내는 실습 위주로 구성되어 있어 누구나 쉽게 따라할 수 있습니다.",
  },
  {
    q: "1년 과정은 언제든 시작할 수 있나요?",
    a: "상시 가입 즉시 시작 가능하며, 가입일로부터 365일간 모든 강의와 서식을 무제한 이용할 수 있습니다.",
  },
  {
    q: "실무 서식은 어디서 다운로드받나요?",
    a: "강의실 내 자료실 및 상단 [자료실] 메뉴에서 한글(HWP), 엑셀, AI 프롬프트 원본을 자유롭게 다운로드받으실 수 있습니다.",
  },
];

export default function MobileStudyHubClient({ lectures }: any) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: StudyTab = tabParam === "board" ? "board" : tabParam === "community" ? "community" : "lecture";
  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const currentTab: StudyTab = tabParam === "board" ? "board" : tabParam === "community" ? "community" : "lecture";
    setActiveTab(currentTab);
  }, [tabParam]);

  const handleTabChange = (newTab: StudyTab) => {
    setActiveTab(newTab);
    router.replace(`/m/study?tab=${newTab}`, { scroll: false });
  };

  return (
    <div style={{ width: "100%", backgroundColor: "#f8fafc", minHeight: "100vh", paddingBottom: "80px", paddingTop: "56px", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b" }}>
      <MobileTopBarHeader activeTab="study" />
      <StudySubMenuBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── 특강 콘텐츠 ── */}
      {activeTab === "lecture" && (
        <div>
          
          {/* 1. 모바일 히어로 배너 (윤자동 딥 포레스트 그린 스타일) */}
          <div style={{ backgroundColor: "#062326", color: "#ffffff", padding: "28px 20px 24px", margin: "12px 16px 20px", borderRadius: 14, boxShadow: "0 4px 16px rgba(6,35,38,0.15)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", padding: "4px 10px", borderRadius: 16, fontSize: 11.5, fontWeight: 700, color: "#6ee7b7", marginBottom: 12 }}>
              <span>🌿</span>
              <span>1년(12개월) 부동산 실무 & AI 마스터마인드</span>
            </div>

            <h1 style={{ fontSize: "20px", fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.5px", margin: "0 0 10px 0" }}>
              1년 365일, 현장과 함께 달리는<br />
              <span style={{ color: "#34d399" }}>공실뉴스 AI 실전 스터디</span>
            </h1>

            <p style={{ fontSize: "13px", color: "#a7f3d0", opacity: 0.9, lineHeight: 1.5, margin: "0 0 18px 0" }}>
              단발성 인강이 아닙니다. 12개월 동안 매월 업데이트되는 최신 AI 기술과 실전 노하우로 지역 1등 부동산을 완성하세요.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", fontSize: "12px", color: "#d1fae5", fontWeight: 600 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 365일 무제한 수강
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 매월 신규 VOD 업데이트
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 실무 서식 100% 제공
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 11만 중개사 크루 연계
              </span>
            </div>
          </div>

          {/* ━━━ 3D PASTEL AVATARS: 나이가 많아서요? 코딩을 못해서요? (윤자동 증명 섹션) ━━━ */}
          <div style={{ padding: "0 16px", marginBottom: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#062828", margin: "0 0 6px 0", lineHeight: 1.35 }}>
                나이가 많아서요? 컴맹이라서요?<br />
                <span style={{ color: "#059669" }}>초보라서 못 할 것 같다고요?</span>
              </h2>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                그 걱정, 이제 내려놓으셔도 됩니다.<br />먼저 1년 동안 해내신 분들이 증명했거든요.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  role: "소속공인중개사 1년차",
                  quote: "“블로그 글 1개 쓰는데 반나절 걸리던 제가, AI 프롬프트 쓰고 5분 만에 상위노출 글을 뚝딱 완성했어요.”",
                  author: "마포구 소속공인중개사 이OO 실장",
                  image: "/images/study/avatar_realtor_female.jpg",
                },
                {
                  role: "50대 개업공인중개사",
                  quote: "“컴맹이라 AI는 남 이야기인 줄 알았는데, 클릭 몇 번으로 매물 쇼츠 만들었더니 유튜브 보고 젊은 임차인 문의가 3배 폭증했네요.”",
                  author: "강남구 개업공인중개사 박OO 대표",
                  image: "/images/study/avatar_realtor_male.jpg",
                },
                {
                  role: "상가 건물주 / 임대인",
                  quote: "“1년 넘게 공실이던 3층 통상가, 공실스터디에서 배운 타깃 마케팅으로 2주 만에 프랜차이즈 임대 맞췄습니다.”",
                  author: "판교 상가 건물주 정OO 대표",
                  image: "/images/study/avatar_landlord_male.jpg",
                },
                {
                  role: "부동산 유튜버 크리에이터",
                  quote: "“고가 장비 없이 AI 음성으로 부동산 브리핑 채널 시작해 구독자 1만 명 돌파하고 전속 매물 쏟아집니다.”",
                  author: "유튜브 채널 운영자 김OO 대표",
                  image: "/images/study/avatar_creator_male.jpg",
                },
                {
                  role: "경매 & 특수물건 실무자",
                  quote: "“어려운 유찰 물건 권리분석부터 특약 작성까지, 1년 스터디 실무 서식 덕분에 안전하게 계약 체결했어요.”",
                  author: "경기 분당구 공인중개사 최OO 대표",
                  image: "/images/study/avatar_senior_female.jpg",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ width: 80, height: 80, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={item.image} alt={item.role} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4, marginBottom: 4 }}>
                      {item.role}
                    </span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#062828", lineHeight: 1.45, margin: "0 0 6px 0" }}>
                      {item.quote}
                    </p>
                    <span style={{ fontSize: 11.5, color: "#64748b" }}>
                      {item.author}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 12개월 마스터 로드맵 (컴팩트 카드) */}
          <div style={{ padding: "0 16px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#062828" }}>1년 12개월 로드맵</span>
              <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>4단계 마스터 플랜</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q1 (1~3개월)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🤖 AI 무기 장착</div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>1분 매물 쇼츠·블로그 10배 자동화</div>
              </div>

              <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q2 (4~6개월)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🏢 실전 공실 해결</div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>상가/원룸 임대 마케팅 클로징</div>
              </div>

              <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q3 (7~9개월)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🔨 경공매 권리분석</div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>유찰 물건 발굴·특수물건 중개</div>
              </div>

              <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q4 (10~12개월)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🏆 지역 1등 안착</div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>유튜브 채널·11만 공동중개망</div>
              </div>
            </div>
          </div>

          {/* 3. 특강 목록 */}
          <div style={{ padding: "0 16px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#062828" }}>전체 스터디 특강</span>
              <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>총 {lectures.length}개</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {lectures.length === 0 && (
                <div style={{ padding: "50px 20px", textAlign: "center", color: "#9ca3af", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  등록된 특강이 없습니다.
                </div>
              )}

              {lectures.map((lecture: any) => (
                <Link key={lecture.id} href={`/m/study_read?id=${lecture.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", backgroundColor: "#062326" }}>
                      {lecture.thumbnail_url ? (
                        <img src={lecture.thumbnail_url} alt={lecture.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#062326,#064e3b)", color: "#fff" }}>
                          <span style={{ fontSize: 28, marginBottom: 4 }}>🎓</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#6ee7b7" }}>{lecture.category || "공실스터디"}</span>
                        </div>
                      )}
                      <span style={{ position: "absolute", top: 10, left: 10, background: "#059669", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>
                        VOD
                      </span>
                    </div>

                    <div style={{ padding: "16px" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "2px 7px", borderRadius: 4, display: "inline-block", marginBottom: 6 }}>
                        {lecture.category || "중개실무"}
                      </span>
                      <h2 style={{ color: "#062828", fontSize: "16.5px", fontWeight: 800, lineHeight: 1.35, margin: "0 0 10px 0", wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {lecture.title}
                      </h2>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12.5px", color: "#64748b", marginBottom: "12px" }}>
                        <span>{lecture.instructor_name || "강사진"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                          ★ {(lecture.rating || 4.9).toFixed(1)} ({lecture.review_count || 120})
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#062828", fontWeight: 900, fontSize: "16px" }}>
                          {lecture.discount_price ? `${lecture.discount_price.toLocaleString()} P` : lecture.price ? `${lecture.price.toLocaleString()} P` : "무료 수강"}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#059669" }}>
                          수강신청 ›
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 4. 자주 묻는 질문 FAQ (모바일 아코디언) */}
          <div style={{ padding: "0 16px 20px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#062828", marginBottom: 12 }}>
              자주 묻는 질문 FAQ
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FAQS.map((faq, i) => {
                const isOpen = openFaqIndex === i;
                return (
                  <div key={i} style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                      style={{ width: "100%", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#062828" }}>Q. {faq.q}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 14px 12px", fontSize: 12.5, color: "#475569", lineHeight: 1.55, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── 자료실 콘텐츠 ── */}
      {activeTab === "board" && (
        <div style={{ padding: "16px", paddingTop: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {BOARD_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/m/board?id=${item.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#062828", marginBottom: "2px" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.desc}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

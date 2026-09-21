"use client";

import React, { useState } from "react";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";

interface Props {
  lectures: any[];
  totalCount: number;
}

const BENEFITS = [
  {
    icon: "🎬",
    title: "365일 무제한 다시보기",
    desc: "가입일로부터 1년 동안 모든 VOD 특강을 횟수 제한 없이 반복 시청하고 복습할 수 있습니다.",
  },
  {
    icon: "🔄",
    title: "매월 신규 특강 자동 추가",
    desc: "빠르게 바뀌는 AI 툴과 부동산 정책에 맞춰 매달 새로운 실무 특강이 업데이트됩니다.",
  },
  {
    icon: "📁",
    title: "실무 서식·프롬프트 원본",
    desc: "계약서 특약, 체크리스트, AI 프롬프트, 영상 템플릿 원본 파일을 그대로 내려받아 씁니다.",
  },
  {
    icon: "🤝",
    title: "11만 중개사 스터디 크루",
    desc: "전국 공인중개사 크루와 공동중개·정보 교류를 이어가며 혼자가 아닌 1년을 만듭니다.",
  },
];

const FAQS = [
  {
    q: "컴퓨터나 AI를 잘 모르는 초보 공인중개사도 따라할 수 있나요?",
    a: "네, 100% 가능합니다. 복잡한 코딩이나 어려운 이론 없이, 클릭 몇 번으로 매물 쇼츠 영상을 만들고 ChatGPT로 매물 설명글을 뽑아내는 실습 위주로 진행됩니다. 컴퓨터를 잘 다루지 못하셔도 순서대로만 따라 하시면 됩니다.",
  },
  {
    q: "1년 연간 스터디는 언제부터 참여할 수 있나요?",
    a: "상시 가입하여 즉시 수강을 시작할 수 있습니다. 가입한 날로부터 1년(365일) 동안 모든 VOD 강의 무제한 시청 및 매달 새롭게 업데이트되는 신규 특강과 실무 서식을 모두 이용하실 수 있습니다.",
  },
  {
    q: "강의 자료와 계약서 양식, AI 프롬프트는 어떻게 다운받나요?",
    a: "각 강의실 본문 내 [강의자료 다운로드] 탭 및 공실뉴스 [자료실] 메뉴에서 한글(HWP), 엑셀, PDF 및 프롬프트 텍스트 파일 원본을 횟수 제한 없이 자유롭게 다운로드받으실 수 있습니다.",
  },
  {
    q: "스마트폰(모바일)에서도 강의를 들을 수 있나요?",
    a: "네, PC는 물론 스마트폰, 태블릿 등 모든 기기에서 최적화된 모바일 전용 뷰어로 언제 어디서나 끊김 없이 이어보기가 가능합니다.",
  },
  {
    q: "공실뉴스 회원에게 주어지는 추가 혜택이 있나요?",
    a: "공실뉴스 가입 회원은 기초 실무 특강 및 AI 맛보기 과정을 무료로 수강할 수 있으며, 공실 등록 및 전국 법원 경공매 정보 열람 혜택이 함께 제공됩니다.",
  },
];

export default function StudyHomeClient({ lectures, totalCount }: Props) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const formatLecturePrice = (item: any) => {
    const value = Number(item?.price ?? 0);
    if (!value) return "무료 수강";
    return `${value.toLocaleString()} P`;
  };

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#132e27", minHeight: "100vh" }}>
      <StudyHeader />

      {/* ━━━ 1. HERO (센터 정렬 딥 포레스트) ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "80px 0 70px", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "6px 14px", borderRadius: 24, fontSize: 13, fontWeight: 700, color: "#6ee7b7", marginBottom: 28 }}>
            <span>🌿</span>
            <span>1년(12개월) 부동산 실무 &amp; AI 마스터마인드</span>
          </div>

          <h1 style={{ fontSize: "44px", fontWeight: 900, lineHeight: 1.35, letterSpacing: "-1px", margin: "0 auto 20px", color: "#ffffff" }}>
            매주 보고 따라 하다 보면,<br />
            AI와 유튜브가 <span style={{ color: "#34d399" }}>익숙해집니다.</span>
          </h1>

          <p style={{ fontSize: "17.5px", color: "#a7f3d0", opacity: 0.9, lineHeight: 1.7, maxWidth: 660, margin: "0 auto 32px", wordBreak: "keep-all" }}>
            공실뉴스는 매주 부동산 실무와 마케팅에 꼭 필요한 실전 특강을 제공합니다.<br />
            놓친 강의는 언제든 무제한 다시보기로 복습할 수 있어요.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/study/lectures"
              style={{
                display: "inline-block",
                padding: "16px 36px",
                background: "#059669",
                color: "#ffffff",
                borderRadius: 12,
                fontSize: 16.5,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 8px 24px rgba(5, 150, 105, 0.35)",
              }}
            >
              특강 둘러보기 →
            </Link>
            <Link
              href="/study/about"
              style={{
                display: "inline-block",
                padding: "16px 30px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "#d1fae5",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              공실스터디란? ›
            </Link>
          </div>

          {/* 소개 영상 */}
          <div style={{ maxWidth: 720, margin: "44px auto 0" }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#000000",
              }}
            >
              <iframe
                src="https://www.youtube-nocookie.com/embed/QyClYIjPzao?rel=0"
                title="공실스터디 안내 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ 2. WHY 1-YEAR STUDY ━━━ */}
      <section style={{ padding: "75px 0 70px", backgroundColor: "#f2f9f6", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              WHY 1-YEAR STUDY
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#062828", margin: "8px 0 12px 0", letterSpacing: "-0.5px" }}>
              혼자 보다가 작심삼일로 끝나는 온라인 강의는 이제 그만.
            </h2>
            <p style={{ fontSize: "16px", color: "#475569", margin: 0 }}>
              AI 기술과 부동산 정책은 매달 빠르게 변합니다. 1년 동안 곁에서 함께 뛰는 든든한 파트너가 필요합니다.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {/* 기존 단발성 강의 */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "32px 28px" }}>
              <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ❌ 기존 단발성 강의
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: "#334155", margin: "0 0 16px 0" }}>혼자 듣다가 흐지부지 포기</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15, color: "#64748b", lineHeight: 2.0 }}>
                <li>· 1회성 결제 후 방치되어 수강 기한 만료</li>
                <li>· 6개월만 지나도 쓸 수 없는 옛날 AI/정책 정보</li>
                <li>· 막히는 부분이 생겨도 질문할 곳이 없음</li>
                <li>· 강의는 들었지만 내 실무에 적용하지 못함</li>
              </ul>
            </div>

            {/* 공실뉴스 1년 스터디 */}
            <div style={{ background: "#ffffff", border: "2px solid #059669", borderRadius: 16, padding: "32px 28px", boxShadow: "0 10px 30px rgba(5, 150, 105, 0.1)" }}>
              <div style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ✅ 공실뉴스 1년 스터디
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: "#062828", margin: "0 0 16px 0" }}>365일 실전 동행 마스터마인드</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15, color: "#064e3b", fontWeight: 600, lineHeight: 2.0 }}>
                <li>· 1년(365일) 내내 무제한 반복 시청 및 복습</li>
                <li>· 매달 변화하는 최신 AI 툴과 정책 특강 자동 추가</li>
                <li>· 계약서 특약, AI 프롬프트, 영상 템플릿 원본 제공</li>
                <li>· 전국 11만 부동산 스터디 크루와 공동중개 네트워킹</li>
              </ul>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 36 }}>
            <Link
              href="/study/about"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 26px",
                background: "#ffffff",
                border: "1px solid #059669",
                color: "#047857",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              <span>공실스터디 자세히 보기</span>
              <span>→</span>
            </Link>
          </div>

        </div>
      </section>

      {/* ━━━ 3. 인기 특강 미리보기 ━━━ */}
      <section style={{ padding: "70px 0 75px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
                CURRICULUM &amp; LECTURES
              </span>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#062828", margin: "6px 0 0 0", letterSpacing: "-0.5px" }}>
                지금 바로 들을 수 있는 실전 특강
              </h2>
            </div>
            <Link
              href="/study/lectures"
              style={{
                fontSize: 14.5,
                fontWeight: 800,
                color: "#047857",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              전체 강의목록 보기{totalCount > 0 ? ` (${totalCount})` : ""} ›
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {lectures.map((item, i) => {
              const href = item.id && !String(item.id).startsWith("sample-") ? `/study_read?id=${item.id}` : "/study/lectures";
              return (
                <Link key={item.id || i} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      transition: "all 0.2s ease",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 12px 24px rgba(5, 150, 105, 0.1)";
                      e.currentTarget.style.borderColor = "#059669";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }}
                  >
                    <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", backgroundColor: "#062326" }}>
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                            color: "#ffffff",
                            padding: 16,
                            textAlign: "center",
                          }}
                        >
                          <span style={{ fontSize: 24, marginBottom: 4 }}>🎓</span>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#6ee7b7" }}>{item.category || "공실스터디"}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "18px 18px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "3px 8px", borderRadius: 4, display: "inline-block", marginBottom: 10 }}>
                          {item.category || "중개실무"}
                        </span>
                        <h3
                          style={{
                            fontSize: 16,
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
                          {item.title}
                        </h3>
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                          <span>{item.instructor_name || "공실뉴스 강사진"}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                            ★ {(item.rating || 4.9).toFixed(1)}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                          <span style={{ fontSize: 15.5, fontWeight: 800, color: item.price ? "#062828" : "#059669" }}>
                            {formatLecturePrice(item)}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>수강신청 ›</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>
      </section>

      {/* ━━━ 4. 4대 연간 멤버십 혜택 ━━━ */}
      <section style={{ padding: "70px 0", backgroundColor: "#f2f9f6", borderTop: "1px solid #d1fae5", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              MEMBERSHIP BENEFITS
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#062828", margin: "8px 0 0 0", letterSpacing: "-0.5px" }}>
              1년 스터디 크루가 되면 받는 4가지
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                style={{
                  background: "#ffffff",
                  border: "1px solid #d1fae5",
                  borderRadius: 16,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 30 }}>{b.icon}</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: 0, letterSpacing: "-0.3px" }}>{b.title}</h3>
                <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.7, margin: 0, wordBreak: "keep-all" }}>{b.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ━━━ 5. FAQ ━━━ */}
      <section style={{ padding: "70px 0 75px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              FAQ
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#062828", margin: "6px 0 0 0" }}>
              자주 묻는 질문
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#ffffff",
                    border: isOpen ? "1.5px solid #059669" : "1px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    boxShadow: isOpen ? "0 4px 16px rgba(5, 150, 105, 0.08)" : "none",
                  }}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    style={{
                      width: "100%",
                      padding: "20px 24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#ffffff",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      gap: 16,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: isOpen ? "#064e3b" : "#1e293b", lineHeight: 1.4 }}>
                      Q. {faq.q}
                    </span>
                    <span
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        color: isOpen ? "#059669" : "#94a3b8",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: "16px 24px 22px 24px",
                        fontSize: 14.5,
                        color: "#334155",
                        lineHeight: 1.7,
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link href="/study/qna" style={{ fontSize: 14.5, fontWeight: 700, color: "#047857", textDecoration: "none" }}>
              더 궁금한 점은 Q&amp;A게시판에 남겨주세요 ›
            </Link>
          </div>

        </div>
      </section>

      {/* ━━━ 6. BOTTOM CTA ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "64px 0", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 14px 0", color: "#ffffff" }}>
            지역 1등 부동산으로 성장하는 가장 확실한 1년
          </h2>
          <p style={{ fontSize: 15.5, color: "#a7f3d0", margin: "0 0 28px 0", lineHeight: 1.7 }}>
            지금 가입하고 1년 동안 제공되는 모든 AI 실무 특강과 자료를 무제한으로 누리세요.
          </p>
          <Link
            href="/study/lectures"
            style={{
              display: "inline-block",
              padding: "15px 36px",
              background: "#059669",
              color: "#ffffff",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 8px 24px rgba(5, 150, 105, 0.4)",
            }}
          >
            1년 스터디 지금 시작하기 →
          </Link>
        </div>
      </section>

    </div>
  );
}

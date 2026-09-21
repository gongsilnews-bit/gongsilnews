"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StudyHeader from "@/components/study/StudyHeader";
import { createClient } from "@/utils/supabase/client";

/**
 * 공실스터디 금액안내
 * 공실뉴스부동산 금액안내(/newsrealty/pricing)와 동일한 구성이며
 * 포인트 컬러만 스터디 에메랄드로 맞춘다.
 */
const POINT = "#059669";
const POINT_DARK = "#047857";
const POINT_SOFT = "#ecfdf5";
const POINT_BORDER = "#a7f3d0";

export default function StudyPricingClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    });
  }, []);

  // 멤버십 신청 (로그인 여부에 따라 분기)
  const handleJoinClick = () => {
    if (user) router.push("/study/lectures");
    else router.push("/login?returnTo=" + encodeURIComponent("/study/pricing"));
  };

  // 바로 위 서브카피가 말하는 4가지와 순서까지 1:1로 맞춘다
  const valueStats = [
    { title: "공실 등록 월 20건", highlight: "무료 포함" },
    { title: "AI 매물보고서", highlight: "무제한 생성" },
    { title: "기사 등록 월 4건 포털 송고", highlight: "무료 포함" },
    { title: "뉴스 광고영업권 (최대 50%)", highlight: "권한 부여" },
  ];

  const faqs = [
    {
      q: "월 3만 원 외에 가입비나 교재비 등 추가 비용이 있나요?",
      a: "전혀 없습니다. 가입비 0원, 교재비 0원이며 오직 월 30,000원(VAT 포함)으로 1년 365일 모든 VOD 특강과 실무 자료를 무제한 이용하실 수 있습니다.",
    },
    {
      q: "언제부터 수강할 수 있고, 기간은 얼마나 되나요?",
      a: "상시 가입하여 즉시 수강을 시작할 수 있습니다. 가입한 날로부터 1년(365일) 동안 모든 VOD 강의를 무제한 시청하실 수 있으며, 매달 새로 업데이트되는 신규 특강도 추가 비용 없이 이용하실 수 있습니다.",
    },
    {
      q: "의무 약정 기간이나 중도 해지 위약금이 있나요?",
      a: "위약금은 0원입니다. 의무 사용 기간이 없으므로 원하실 때 언제든지 자유롭게 해지하실 수 있습니다.",
    },
    {
      q: "강의 자료와 계약서 양식, AI 프롬프트도 받을 수 있나요?",
      a: "네. 각 강의실의 [강의자료 다운로드] 탭과 공실뉴스 [자료실] 메뉴에서 한글(HWP), 엑셀, PDF 및 프롬프트 텍스트 원본을 횟수 제한 없이 다운로드하실 수 있습니다.",
    },
    {
      q: "세금계산서나 현금영수증 발행이 가능한가요?",
      a: "네. 결제 시 입력하신 사업자등록번호로 매월 전자세금계산서 또는 지출증빙 현금영수증이 자동 발행됩니다.",
    },
  ];

  // 시중 부동산 실무교육과의 대비. on:true 는 타 강의도 주는 것, on:false 는 못 받는 것.
  const rivalFeatures = [
    { on: true, text: <>이론 강의 + <strong>종이 교재 수십 권</strong></> },
    { on: true, text: <>수료증 · <strong>자격증 응시자격</strong></> },
    { on: false, text: "결국 \"유튜브·블로그 하세요\"로 끝" },
    { on: false, text: "콘텐츠 제작은 오롯이 내 몫" },
    { on: false, text: "AI 실전 활용 과정 없음" },
    { on: false, text: "내 매물에 바로 적용 불가" },
    { on: false, text: "매달 신규 특강 업데이트 없음" },
    { on: false, text: "일시불 결제 · 중도 해지 어려움" },
    { on: false, text: "공실 등록 · 경공매 열람 혜택 없음" },
  ];

  const paidFeatures = [
    <>전 과목 VOD + <strong>HWP·엑셀·PDF 자료 원본</strong></>,
    <>수강 기간 : <strong style={{ color: POINT }}>1년(365일) 무제한 다시보기</strong></>,
    <><strong style={{ color: POINT_DARK }}>유튜브·블로그 콘텐츠를 강의 안에서 제작</strong></>,
    <>AI가 <strong>대본·썸네일·본문 초안</strong>까지 생성</>,
    <>실무 AI 프롬프트 <strong>원본 전체 공개</strong></>,
    <><strong>내 공실·매물</strong>로 바로 실습</>,
    <>신규 특강 : <strong>매달 업데이트 전편 무료</strong></>,
    <><strong>월 결제</strong> · 위약금 없이 언제든 해지</>,
    <>공실 등록 · <strong>경공매 정보 열람 혜택</strong></>,
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <StudyHeader />

      {/* ━━━ 1. 메인 타이틀 + 플랜 비교 ━━━ */}
      <section
        style={{
          background: "linear-gradient(180deg, #f0fdf9 0%, #ffffff 100%)",
          padding: "70px 20px 40px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              background: POINT_SOFT,
              color: POINT_DARK,
              fontSize: "13px",
              fontWeight: 800,
              padding: "6px 18px",
              borderRadius: "20px",
              marginBottom: "20px",
              border: `1px solid ${POINT_BORDER}`,
            }}
          >
            수백만 원짜리 교육비, 이제 그만
          </div>

          <h1
            style={{
              fontSize: "42px",
              fontWeight: 900,
              color: "#0f2e28",
              letterSpacing: "-1.5px",
              margin: "0 0 16px 0",
              lineHeight: 1.3,
            }}
          >
            AI 유튜브 + 부동산 실무<br />
            월 <span style={{ color: POINT }}>3만 원</span>이면 OK
          </h1>

          <p
            style={{
              fontSize: "17px",
              color: "#64748b",
              margin: "0 auto 50px",
              maxWidth: "620px",
              lineHeight: 1.6,
            }}
          >
            수백만 원짜리 시중 실무교육과 공실스터디의 차이를 확인해 보세요.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "32px",
              alignItems: "stretch",
              textAlign: "left",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            {/* 1. 시중 실무교육 (비교 대상) */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                padding: "42px 34px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#334155", margin: 0 }}>시중 실무교육</h3>
                  <span style={{ fontSize: "12px", fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "4px 10px", borderRadius: 20 }}>
                    오프라인 아카데미
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "38px", fontWeight: 900, color: "#1e293b", letterSpacing: "-1px" }}>
                    수백만 원
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>/ 12개월 일시불</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0" }}>
                    수백만 원을 먼저 결제하고 이론과 교재부터 시작하는 과정
                  </p>
                </div>

                {/* 비교용 카드라 버튼 대신 안내 스트립으로 오른쪽 카드와 높이를 맞춘다 */}
                <div style={{ marginBottom: 28 }}>
                  <div
                    style={{
                      width: "100%",
                      height: "50px",
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    한 번에 결제 · 환불 규정 확인 필요
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#64748b", marginBottom: 16 }}>
                    수백만 원을 내고 얻는 것
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14, fontSize: "13.5px" }}>
                    {rivalFeatures.map((f, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: f.on ? "#475569" : "#94a3b8" }}>
                        <span style={{ color: f.on ? POINT : "#cbd5e1", fontWeight: f.on ? 900 : 400 }}>{f.on ? "✓" : "✕"}</span>
                        <span style={f.on ? undefined : { textDecoration: "line-through" }}>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. 공실스터디 멤버십 (하이라이트) */}
            <div
              style={{
                background: "#ffffff",
                border: `2.5px solid ${POINT}`,
                borderRadius: "20px",
                padding: "42px 34px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 16px 44px rgba(5, 150, 105, 0.18)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: `linear-gradient(135deg, ${POINT} 0%, ${POINT_DARK} 100%)`,
                  color: "#ffffff",
                  padding: "5px 20px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 900,
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.35)",
                  letterSpacing: "-0.3px",
                  whiteSpace: "nowrap",
                }}
              >
                🔥 강력 추천 · 1년 마스터마인드
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#0f2e28", margin: 0 }}>공실스터디</h3>
                  <span style={{ fontSize: "12px", fontWeight: 800, background: POINT_SOFT, color: POINT_DARK, padding: "4px 12px", borderRadius: 20 }}>
                    정회원 전용 플랜
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "40px", fontWeight: 900, color: "#0f2e28", letterSpacing: "-1px" }}>
                    ₩30,000
                    <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#64748b", marginLeft: 6 }}>/ 월 (VAT 포함)</span>
                  </div>
                  <p style={{ fontSize: "13px", color: POINT, fontWeight: 700, margin: "6px 0 0" }}>
                    가입비 0원 · 교재비 0원 · 위약금 없이 언제든 해지 가능
                  </p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <button
                    type="button"
                    onClick={handleJoinClick}
                    style={{
                      width: "100%",
                      height: "50px",
                      backgroundColor: POINT,
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = POINT_DARK)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = POINT)}
                  >
                    공실스터디 신청하기 ➔
                  </button>
                </div>

                <div style={{ borderTop: `1px solid ${POINT_BORDER}`, paddingTop: 24 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f2e28", marginBottom: 16 }}>
                    포함된 모든 전용 혜택
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14, fontSize: "13.5px" }}>
                    {paidFeatures.map((f, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f2e28" }}>
                        <span style={{ color: POINT, fontWeight: 900 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 2. 비용 대비 가치 ━━━ */}
      <section style={{ backgroundColor: "#f8fafc", padding: "80px 20px", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", marginTop: "60px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ color: POINT, fontSize: "13px", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px" }}>
              LEARN &amp; USE
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "0 0 10px 0" }}>
              배우고 끝이 아닙니다<br />
              <span style={{ color: POINT }}>내 실무에 바로 활용</span>할 수 있습니다.
            </h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              공실스터디에 가입하시면, 실무에 바로 활용하실 수 있습니다.<br />
              공실등록 20건 + 매물보고서 + 기사작성 + 광고영업까지
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {valueStats.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  padding: "24px 18px",
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "10px" }}>{item.title}</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: POINT }}>{item.highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 3. FAQ ━━━ */}
      <section style={{ maxWidth: "800px", margin: "80px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
            금액 및 수강 관련 자주 묻는 질문
          </h2>
          <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>
            멤버십 가입과 결제 방식에 대해 가장 자주 문의하시는 내용입니다.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  backgroundColor: "#ffffff",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    width: "100%",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "15.5px",
                    fontWeight: 800,
                    color: isOpen ? POINT : "#1e293b",
                  }}
                >
                  <span>Q. {faq.q}</span>
                  <span style={{ fontSize: "18px", transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "0 20px 20px 20px",
                      fontSize: "14.5px",
                      color: "#475569",
                      lineHeight: 1.65,
                      borderTop: "1px solid #f8fafc",
                    }}
                  >
                    A. {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ 4. 하단 와이드 CTA ━━━ */}
      <section
        style={{
          background: "linear-gradient(135deg, #062326 0%, #0f3d33 100%)",
          color: "#ffffff",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ color: "#34d399", fontSize: "14px", fontWeight: 800, marginBottom: "12px" }}>
            SPECIAL OFFER · 365 DAYS UNLIMITED
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
            월 3만 원으로 1년 내내 반복 수강하세요
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 32px 0" }}>
            위약금 0원, 가입비 0원! 언제든 자유롭게 해지할 수 있으니 부담 없이 시작하세요.
          </p>
          <button
            type="button"
            onClick={handleJoinClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "16px 36px",
              backgroundColor: POINT,
              color: "#ffffff",
              fontSize: "16.5px",
              fontWeight: 800,
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(5, 150, 105, 0.4)",
            }}
          >
            <span>공실스터디 지금 신청하기</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실스터디. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}

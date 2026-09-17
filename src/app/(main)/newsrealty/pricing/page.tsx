"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import { createClient } from "@/utils/supabase/client";

export default function NewsrealtyPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      }
    });
  }, []);

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/newsrealty/apply");
  };

  const handleGeneralLoginClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    if (user) {
      router.push("/realty_admin");
    } else {
      router.push("/login?returnTo=" + encodeURIComponent("/realty_admin"));
    }
  };

  const valueStats = [
    { title: "포털 언론 보도 4건", original: "정가 2,000,000원 상당", highlight: "무료 포함" },
    { title: "부동산유튜브 마스터클래스", original: "정가 1,200,000원 상당", highlight: "무료 포함" },
    { title: "공동중개 전국망 20건", original: "월 500,000원 상당", highlight: "무료 포함" },
    { title: "뉴스 광고 영업권 (최대 50%)", original: "월 1,500,000원+ 추가수익", highlight: "권한 부여" },
  ];

  const faqs = [
    {
      q: "월 3만 원 외에 가입비나 연회비 등 추가 비용이 있나요?",
      a: "전혀 없습니다! 가입비 0원, 연회비 0원이며 오직 월 30,000원(VAT 포함)으로 모든 프리미엄 혜택(언론보도 4건, 공동중개 20건, 유튜브 강의, AI 리포트 등)을 무제한 누리실 수 있습니다.",
    },
    {
      q: "의무 약정 기간이나 중도 해지 위약금이 있나요?",
      a: "위약금은 0원입니다. 의무 사용 기간이 없으므로 소장님께서 원하실 때 언제든지 클릭 한 번으로 자유롭게 해지하실 수 있습니다.",
    },
    {
      q: "세금계산서나 현금영수증 발행이 가능한가요?",
      a: "네! 결제 시 입력하신 사업자등록번호로 매월 100% 매입 세액공제가 가능한 전자세금계산서 또는 지출증빙 현금영수증이 자동 발행됩니다.",
    },
    {
      q: "결제 방법은 무엇이 지원되나요?",
      a: "신용카드, 체크카드 자동 정기결제를 지원하며, 원하시는 경우 가상계좌나 법인카드 등록도 가능합니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 1. 메인 타이틀 섹션 (원래 만든 디자인 스타일) ━━━ */}
      <section
        style={{
          background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
          padding: "70px 20px 40px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          {/* 상단 뱃지 */}
          <div
            style={{
              display: "inline-block",
              background: "#fff2e8",
              color: "#ea580c",
              fontSize: "13px",
              fontWeight: 800,
              padding: "6px 18px",
              borderRadius: "20px",
              marginBottom: "20px",
              border: "1px solid #ffd8b2",
            }}
          >
            가입비 0원 · 연회비 0원
          </div>

          {/* 메인 타이틀 */}
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 900,
              color: "#1c1917",
              letterSpacing: "-1.5px",
              margin: "0 0 16px 0",
              lineHeight: 1.3,
            }}
          >
            <span style={{ color: "#ff8e15" }}>월 3만 원</span>으로<br />
            지역 1등 로컬기자 파트너가 되세요
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
            일반 부동산 무료 회원과 공실뉴스부동산 파트너의 압도적인 혜택 차이를 확인해 보세요.
          </p>

          {/* ━━━ 2. 2열 SaaS 플랜 비교 카드 (첨부 이미지 100% 동일 구현) ━━━ */}
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
            {/* 1. 일반부동산 (무료) */}
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
                  <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#334155", margin: 0 }}>
                    일반부동산
                  </h3>
                  <span style={{ fontSize: "12px", fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "4px 10px", borderRadius: 20 }}>
                    기본 플랜
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "38px", fontWeight: 900, color: "#1e293b", letterSpacing: "-1px" }}>
                    ₩0
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>
                      / 평생 무료
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0" }}>
                    기본적인 공실 등록과 시스템 체험이 가능한 입문용 플랜
                  </p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <button
                    type="button"
                    onClick={handleGeneralLoginClick}
                    style={{
                      width: "100%",
                      height: "50px",
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(30, 41, 59, 0.15)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0f172a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1e293b")}
                  >
                    {user ? "일반부동산 바로가기 ➔" : "일반부동산 바로가기 ➔"}
                  </button>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#64748b", marginBottom: 16 }}>
                    제공되는 기본 기능
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14, fontSize: "13.5px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                      <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                      <span>공실 등록 : <strong>최초 3건</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                      <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                      <span>기사 등록 : <strong>최초 3건</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                      <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                      <span>물건 보고서 : <strong>일부 기본 열람</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>광고 등록 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>뉴스 광고영업 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>정회원 커뮤니티 : 이용 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>실무 자료실 다운로드 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>드론 항공영상 저작권 무료 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>공실스터디 강좌 : 이용 불가</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. 공실뉴스부동산 (로컬기자 전용 플랜 - 하이라이트) */}
            <div
              style={{
                background: "#ffffff",
                border: "2.5px solid #ff8e15",
                borderRadius: "20px",
                padding: "42px 34px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 16px 44px rgba(255, 142, 21, 0.18)",
                position: "relative",
              }}
            >
              {/* 상단 뱃지 */}
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #ff8e15 0%, #e67e10 100%)",
                  color: "#ffffff",
                  padding: "5px 20px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 900,
                  boxShadow: "0 4px 12px rgba(255, 142, 21, 0.35)",
                  letterSpacing: "-0.3px",
                  whiteSpace: "nowrap",
                }}
              >
                🔥 강력 추천 · 대표 파트너십
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#1c1917", margin: 0 }}>
                    공실뉴스부동산
                  </h3>
                  <span style={{ fontSize: "12px", fontWeight: 800, background: "#fff2e8", color: "#ea580c", padding: "4px 12px", borderRadius: 20 }}>
                    로컬기자 전용 플랜
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "40px", fontWeight: 900, color: "#1c1917", letterSpacing: "-1px" }}>
                    ₩30,000
                    <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#64748b", marginLeft: 6 }}>
                      / 월 (VAT 포함)
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#ff8e15", fontWeight: 700, margin: "6px 0 0" }}>
                    가입비 0원 · 연회비 0원 · 위약금 없이 언제든 해지 가능
                  </p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <button
                    type="button"
                    onClick={handleApplyClick}
                    style={{
                      width: "100%",
                      height: "50px",
                      backgroundColor: "#ff8e15",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(255, 142, 21, 0.35)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0790b")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ff8e15")}
                  >
                    공실뉴스부동산 신청하기 ➔
                  </button>
                </div>

                <div style={{ borderTop: "1px solid #fed7aa", paddingTop: 24 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#1c1917", marginBottom: 16 }}>
                    포함된 모든 전용 혜택
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14, fontSize: "13.5px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>공실 등록 : <strong style={{ color: "#1c1917" }}>월 20건</strong> (11만 중개망 실시간 노출)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>기사 등록 : <strong style={{ color: "#1c1917" }}>월 4건 정식 송고</strong> (뉴스 포털 노출)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>물건 보고서 : <strong style={{ color: "#ff8e15" }}>AI 물건보고서 전체 무제한 생성</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>광고 등록 : <strong>포털 내 매물 광고 등록 가능</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>광고 영업 : <strong style={{ color: "#ea580c" }}>뉴스 광고영업 가능 (영업비 20~50% 지급)</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>커뮤니티 : <strong>공실뉴스 정회원 전용 커뮤니티 가입</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>자료실 : <strong>실무 서식·특약·계약서 무료 다운로드</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>드론 영상 : <strong>고화질 드론 영상 저작권 무료 상업 이용</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>공실 스터디 : <strong>실무 마케팅 강좌 일부 무료 수강</strong></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 3. 비용 대비 가치 분석 (Value Guarantee) ━━━ */}
      <section style={{ backgroundColor: "#f8fafc", padding: "80px 20px", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", marginTop: "60px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ color: "#ff8e15", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px" }}>
              ROI & VALUE GUARANTEE
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "0 0 10px 0" }}>
              월 30,000원으로 누리는 <span style={{ color: "#ff8e15" }}>520만 원 상당의 혜택</span>
            </h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
              기사 1건만 포털에 송출되어도 타 언론사 기준 50만 원 이상입니다. 공실뉴스는 압도적인 가치를 보장합니다.
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
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "line-through", marginBottom: "6px" }}>
                  {item.original}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: "#ff8e15" }}>
                  {item.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 4. 자주 묻는 질문 FAQ ━━━ */}
      <section style={{ maxWidth: "800px", margin: "80px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
            금액 및 결제 관련 자주 묻는 질문
          </h2>
          <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>
            요금제 가입과 결제 방식에 대해 가장 자주 문의하시는 내용입니다.
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
                    color: isOpen ? "#ff8e15" : "#1e293b",
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

      {/* ━━━ 5. 하단 와이드 CTA 배너 ━━━ */}
      <section
        style={{
          background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
          color: "#ffffff",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ color: "#ff8e15", fontSize: "14px", fontWeight: 800, marginBottom: "12px" }}>
            SPECIAL OFFER · 100% REFUND GUARANTEE
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
            월 3만 원으로 내 지역 최고의 미디어 파트너가 되세요
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 32px 0" }}>
            위약금 0원, 가입비 0원! 언제든 자유롭게 해지할 수 있으니 부담 없이 시작하세요.
          </p>
          <button
            type="button"
            onClick={handleApplyClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "16px 36px",
              backgroundColor: "#ff8e15",
              color: "#ffffff",
              fontSize: "16.5px",
              fontWeight: 800,
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(255, 142, 21, 0.4)",
            }}
          >
            <span>공실뉴스부동산 지금 신청하기</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}

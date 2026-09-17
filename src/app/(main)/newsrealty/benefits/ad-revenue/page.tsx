"use client";

import React, { useState } from "react";
import Link from "next/link";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";

export default function AdRevenueBenefitPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { label: "광고비 다이렉트 정산율", value: "최대 50%", desc: "업계 최고 수준의 영업 리워드 배분", highlight: true },
    { label: "월 평균 추가 부가수익", value: "240만원+", desc: "광고 3~5건 유치 기준 매월 정산", highlight: true },
    { label: "본사 디자인 & 영업 지원", value: "100% 무료", desc: "소개만 하시면 제안·계약·배너 대행", highlight: false },
    { label: "재계약 누적 수수료", value: "영구 인정", desc: "광고주가 연장할 때마다 수수료 지급", highlight: false },
  ];

  const targetAdvertisers = [
    {
      category: "01. 신축 분양 / 개발 시행사",
      title: "아파트·오피스텔·지식산업센터 분양 홍보",
      desc: "분양 대행사는 지역 언론 배너 홍보에 수백~수천만 원의 예산을 집행합니다. 소장님이 연결만 해 주시면 분양 광고비의 최대 50%가 즉시 정산됩니다.",
      icon: "🏗️",
      potential: "건당 100~300만원 정산",
    },
    {
      category: "02. 지역 인테리어 / 이사 / 청소",
      title: "이사철 필수 생활 밀착형 로컬 제휴",
      desc: "부동산 계약 고객들이 가장 먼저 찾는 인테리어, 입주청소, 이사업체 배너를 공실뉴스에 노출하고 매월 고정 광고비를 분배받습니다.",
      icon: "🛋️",
      potential: "건당 30~50만원 정산",
    },
    {
      category: "03. 부동산 전문 세무사 / 법무사",
      title: "양도세·상속세 전문 자문 브랜딩 배너",
      desc: "고액 자산가 고객을 유치하고 싶어 하는 지역 세무사, 법무법인의 공식 칼럼 기사 및 배너 광고를 유치할 수 있습니다.",
      icon: "⚖️",
      potential: "건당 40~80만원 정산",
    },
    {
      category: "04. 프랜차이즈 가맹 본부 & 창업",
      title: "지역 유망 상권 가맹점 모집 광고",
      desc: "공실 상가에 입점할 유망 프랜차이즈 창업 광고를 공실뉴스 상권 섹션에 매칭하여 매월 안정적인 부가수익을 창출합니다.",
      icon: "☕",
      potential: "건당 50~150만원 정산",
    },
  ];

  const simulations = [
    { target: "광고 2건 유치 (소형 상가/인테리어)", monthly: "월 100만 원", annual: "연 1,200만 원", desc: "매달 관리비와 임대료를 가볍게 충당하는 기초 파이프라인" },
    { target: "광고 5건 유치 (분양 1건 + 로컬업체 4건)", monthly: "월 250만 원", annual: "연 3,000만 원", desc: "중개보수 2~3건 분량의 탄탄한 추가 고정 월급 형성" },
    { target: "광고 10건 유치 (지역 지국 전담 파트너)", monthly: "월 500만 원", annual: "연 6,000만 원", desc: "부동산 침체기에도 끄떡없는 전문 미디어 사업자 수준의 수익" },
  ];

  const faqs = [
    {
      q: "제가 광고 영업을 해본 적이 없는데 정말 가능한가요?",
      a: "네! 소장님께서 광고주에게 브리핑하거나 복잡한 영업을 하실 필요가 없습니다. 평소 알고 지내시는 인테리어 대표님이나 분양 실장님 연락처만 본사에 전달해 주시면, 본사 미디어 전문팀이 제안서 발송, 단가 조율, 계약 체결을 모두 대행합니다.",
    },
    {
      q: "광고 배너 이미지 제작은 누가 하나요?",
      a: "공실뉴스 본사 그래픽 디자인팀이 100% 무료로 고품질 움직이는 애니메이션 배너를 제작하여 포털과 공실뉴스에 게재합니다.",
    },
    {
      q: "수수료는 언제, 어떻게 정산되나요?",
      a: "광고주가 광고비를 입금한 익월 10일에 3.3% 원천징수(또는 세금계산서 발행) 후 소장님의 지정 계좌로 투명하게 자동 입금됩니다. 관리자 대시보드에서 실시간 정산 내역 확인이 가능합니다.",
    },
    {
      q: "광고주가 기간을 연장하거나 재계약하면 어떻게 되나요?",
      a: "최초 1회만 유치하셔도 해당 광고주가 계약을 연장하거나 6개월, 1년 단위로 재계약할 때마다 소장님께 매월 동일하게 리워드 수수료가 누적 정산됩니다. 진정한 패시브 인컴(Passive Income)이 완성됩니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ 1. GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 2. 서브 탭 네비게이션 ━━━ */}
      <BenefitsSubNav activeTab="ad-revenue" />

      {/* ━━━ 3. 히어로 섹션 ━━━ */}
      <section
        style={{
          background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
          padding: "70px 20px 60px 20px",
          textAlign: "center",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#ffedd5",
              color: "#ea580c",
              fontSize: "13px",
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: "20px",
              marginBottom: "20px",
            }}
          >
            <span>💰 BENEFIT 03</span>
            <span>•</span>
            <span>거래 절벽을 이기는 고정 캐시카우</span>
          </div>

          <h1
            style={{
              fontSize: "38px",
              fontWeight: 900,
              lineHeight: 1.35,
              color: "#0f172a",
              letterSpacing: "-1px",
              margin: "0 0 20px 0",
            }}
          >
            중개수수료 외에 매월 꼬박꼬박 들어오는<br />
            <span style={{ color: "#ff8e15" }}>‘뉴스 광고 영업 수익’ 최대 50% 리워드</span>
          </h1>

          <p
            style={{
              fontSize: "17px",
              color: "#475569",
              lineHeight: 1.7,
              margin: "0 0 36px 0",
              fontWeight: 500,
            }}
          >
            부동산 거래가 없어도 통장에 돈이 꽂힙니다. 공실뉴스 지역 지국장 권한으로<br />
            내 지역 분양, 인테리어, 세무사 배너 광고를 유치하고 <strong>광고비의 최대 50%</strong>를 고정 월급으로 챙기세요.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/newsrealty/apply"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "15px 32px",
                backgroundColor: "#ff8e15",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 800,
                borderRadius: "10px",
                textDecoration: "none",
                boxShadow: "0 8px 20px rgba(255, 142, 21, 0.35)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0790b")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ff8e15")}
            >
              <span>뉴스 지국 파트너 신청하기</span>
              <span>→</span>
            </Link>
            <a
              href="#simulation"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "15px 26px",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: "16px",
                fontWeight: 700,
                borderRadius: "10px",
                textDecoration: "none",
                border: "1px solid #cbd5e1",
              }}
            >
              예상 수익 계산기 보기 ↓
            </a>
          </div>
        </div>
      </section>

      {/* ━━━ 4. 핵심 지표 통계 카드 ━━━ */}
      <section style={{ maxWidth: "1080px", margin: "-30px auto 70px auto", padding: "0 20px", position: "relative", zIndex: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            backgroundColor: "#ffffff",
            padding: "24px",
            borderRadius: "18px",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e2e8f0",
          }}
        >
          {stats.map((stat, idx) => (
            <div
              key={idx}
              style={{
                textAlign: "center",
                padding: "16px 12px",
                borderRight: idx < 3 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>{stat.label}</div>
              <div style={{ fontSize: "30px", fontWeight: 900, color: stat.highlight ? "#ff8e15" : "#0f172a", letterSpacing: "-0.5px", marginBottom: "6px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 5. 유치 가능한 4대 광고 영역 ━━━ */}
      <section style={{ maxWidth: "1080px", margin: "0 auto 80px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ color: "#ff8e15", fontSize: "14px", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px" }}>
            HIGH PROFIT TARGETS
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
            소장님 주변의 모든 비즈니스가 추가 수익이 됩니다
          </h2>
          <p style={{ fontSize: "15px", color: "#64748b", marginTop: "10px" }}>
            중개업을 하면서 매일 마주치는 분양팀, 인테리어 사장님에게 배너 홍보를 제안해 보세요.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          {targetAdvertisers.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "18px",
                padding: "32px 28px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ fontSize: "32px" }}>{item.icon}</span>
                <span
                  style={{
                    backgroundColor: "#fff5eb",
                    color: "#ea580c",
                    fontSize: "12.5px",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: "1px solid #ffd8b2",
                  }}
                >
                  {item.potential}
                </span>
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#ff8e15", marginBottom: "4px" }}>
                {item.category}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b", margin: "0 0 10px 0" }}>
                {item.title}
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 6. 예상 수익 시뮬레이션 표 ━━━ */}
      <section id="simulation" style={{ backgroundColor: "#f8fafc", padding: "80px 20px", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
              내 중개사무소의 <span style={{ color: "#ff8e15" }}>광고 부가수익 시뮬레이션</span>
            </h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
              한 번 연결해 둔 광고주는 매달 재계약되어 소장님의 평생 연금성 수익이 됩니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {simulations.map((sim, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px 30px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>
                    {sim.target}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#64748b" }}>
                    {sim.desc}
                  </div>
                </div>

                <div style={{ textAlign: "right", marginLeft: "20px" }}>
                  <div style={{ fontSize: "24px", fontWeight: 900, color: "#ff8e15" }}>
                    {sim.monthly}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>
                    ({sim.annual})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 7. 자주 묻는 질문 FAQ ━━━ */}
      <section style={{ maxWidth: "800px", margin: "80px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
            자주 묻는 질문
          </h2>
          <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>
            광고 영업 수익 및 정산 방식에 관한 궁금증을 풀어드립니다.
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

      {/* ━━━ 8. 하단 와이드 CTA 배너 ━━━ */}
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
            REGIONAL MEDIA PARTNERSHIP
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
            내 지역의 유일한 ‘뉴스 지국 파트너’ 지위를 선점하세요
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 32px 0" }}>
            지역 동별 1개 업소 우선권이 부여되며 마감 시 추가 배정이 불가합니다.
          </p>
          <Link
            href="/newsrealty/apply"
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
              textDecoration: "none",
              boxShadow: "0 10px 25px rgba(255, 142, 21, 0.4)",
            }}
          >
            <span>지국 파트너 신청하기</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}

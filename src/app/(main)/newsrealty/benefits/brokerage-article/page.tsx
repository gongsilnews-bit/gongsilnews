"use client";

import React, { useState } from "react";
import Link from "next/link";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";

export default function BrokerageArticleBenefitPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { label: "포털 뉴스 보도 보장", value: "월 4건", desc: "네이버·다음 등 주요 포털 기사 송출", highlight: true },
    { label: "프리미엄 공동중개 매칭", value: "월 20건+", desc: "전국 검증 파트너 B2B 전용망", highlight: false },
    { label: "매물 계약 성사율", value: "3.8배↑", desc: "단순 리스팅 광고 대비 신뢰도 효과", highlight: true },
    { label: "추가 기사 작성 비용", value: "0원", desc: "AI 기사 엔진 & 전담 데스크 무상 지원", highlight: false },
  ];

  const processSteps = [
    {
      step: "01",
      title: "간편 매물 등록",
      desc: "공실뉴스 파트너 관리자에서 사진과 기본 정보만 입력하면 등록이 완료됩니다.",
      icon: "📝",
    },
    {
      step: "02",
      title: "AI 기사 엔진 자동 분석",
      desc: "매물의 입지, 상권, 미래가치를 AI 에이전트가 1:1로 분석하여 정식 보도자료 기사로 완성합니다.",
      icon: "⚡",
    },
    {
      step: "03",
      title: "포털 뉴스 송출 & 신뢰도 극대화",
      desc: "네이버/다음 등 포털 뉴스 지면에 정식 보도되며 기사 하단에 소장님 상호 및 직통 번호가 단독 노출됩니다.",
      icon: "📰",
    },
    {
      step: "04",
      title: "전국 20건+ 공동중개 초고속 매칭",
      desc: "공실뉴스 전국 네트워크에 매물이 동시 공유되어 타 지역 매수인·투자자와 빠르게 연결됩니다.",
      icon: "🤝",
    },
  ];

  const comparison = [
    { item: "매물 노출 방식", standard: "포털 사이트 수천 개 리스팅 속 하단 매몰", gongsil: "포털 정식 언론 기사 단독 보도로 압도적 주목" },
    { item: "고객 신뢰도", standard: "단순 '광고'로 인식하여 단가 깎기 및 의심", gongsil: "'언론 검증 매물'로 인식되어 상담 전환율 급상승" },
    { item: "공동중개 판로", standard: "주변 몇몇 부동산과 카톡방 공유에 한계", gongsil: "전국 공실뉴스 제휴 중개사 네트워크로 월 20건+ 매칭" },
    { item: "광고비 지출", standard: "매월 클릭당 수십~수백만 원 소진", gongsil: "월 고정 멤버십 하나로 기사 4건 + 공동중개 20건 올인원" },
  ];

  const faqs = [
    {
      q: "언론 기사 4건은 어떤 언론사에 보도되나요?",
      a: "공실뉴스와 제휴된 정식 언론사를 통해 네이버, 다음 등 국내 주요 포털 뉴스 지면에 동시 송출됩니다. 기사 검색창에 매물명이나 키워드 검색 시 상위에 노출됩니다.",
    },
    {
      q: "기사 작성 시 소장님이 글을 직접 써야 하나요?",
      a: "전혀 그렇지 않습니다! 매물 정보와 특장점만 간략히 입력하시면, 공실뉴스의 특화된 'AI 기사 작성 에이전트'가 전문 부동산 기자의 필체로 보도자료를 완성하고 전문 데스크의 검수를 거쳐 발행됩니다.",
    },
    {
      q: "공동중개 20건은 어떻게 진행되나요?",
      a: "등록된 매물 중 우량 매물은 공실뉴스 폐쇄형 B2B 매칭망에 즉시 공유되며, 전국 제휴 중개사들에게 맞춤 알림이 발송됩니다. 법정 중개보수는 100% 안전하게 보장됩니다.",
    },
    {
      q: "4건 초과로 추가 기사를 발행하고 싶으면 어떻게 하나요?",
      a: "기본 멤버십 제공 건수(월 4건) 소진 후에도 파트너 우대 단가로 언제든지 추가 기사 송출을 신청하실 수 있습니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ 1. GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 2. 서브 탭 네비게이션 ━━━ */}
      <BenefitsSubNav activeTab="brokerage-article" />

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
            <span>🏢 BENEFIT 01</span>
            <span>•</span>
            <span>강력한 미디어 & 제휴 네트워크</span>
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
            매물 등록 즉시 <span style={{ color: "#ff8e15" }}>포털 언론보도 4건</span> 보장<br />
            전국망 <span style={{ color: "#ff8e15" }}>공동중개 20건</span> 초고속 매칭
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
            수많은 포털 매물 리스팅 속에 묻혀 콜 한 통 없던 매물이, <strong>포털 정식 기사</strong>로 보도되는 순간<br />
            매수인과 임차인의 신뢰도가 급상승하고 전국 제휴망을 통해 계약이 빠르게 성사됩니다.
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
              <span>지금 무료 파트너 신청하기</span>
              <span>→</span>
            </Link>
            <a
              href="#details"
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
              상세 혜택 살펴보기 ↓
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
              <div style={{ fontSize: "32px", fontWeight: 900, color: stat.highlight ? "#ff8e15" : "#0f172a", letterSpacing: "-0.5px", marginBottom: "6px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 5. 상세 프로세스 (어떻게 진행되나요?) ━━━ */}
      <section id="details" style={{ maxWidth: "1080px", margin: "0 auto 80px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ color: "#ff8e15", fontSize: "14px", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px" }}>
            HOW IT WORKS
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
            매물이 뉴스가 되는 4단계 자동화 시스템
          </h2>
          <p style={{ fontSize: "15px", color: "#64748b", marginTop: "10px" }}>
            소장님은 평소처럼 매물만 올려주세요. 전문 기사 작성부터 포털 송출까지 공실뉴스가 전부 대행합니다.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {processSteps.map((step, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                padding: "28px 22px",
                border: "1px solid #e2e8f0",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontSize: "28px" }}>{step.icon}</span>
                <span style={{ fontSize: "18px", fontWeight: 900, color: "#ff8e15" }}>{step.step}</span>
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#1e293b", margin: "0 0 10px 0" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 6. 비교 분석 섹션 ━━━ */}
      <section style={{ backgroundColor: "#f8fafc", padding: "80px 20px", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
              일반 포털 리스팅 vs 공실뉴스부동산 언론 보도
            </h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
              광고비만 빨아들이는 단순 노출에서 벗어나, 언론의 공신력으로 시장을 선점하세요.
            </p>
          </div>

          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 2fr", backgroundColor: "#f1f5f9", padding: "16px 24px", fontWeight: 800, fontSize: "14px", color: "#334155" }}>
              <div>비교 항목</div>
              <div>일반 부동산 포털 리스팅</div>
              <div style={{ color: "#ff8e15" }}>공실뉴스부동산 파트너 혜택</div>
            </div>

            {comparison.map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 2fr 2fr",
                  padding: "18px 24px",
                  borderTop: "1px solid #f1f5f9",
                  alignItems: "center",
                  fontSize: "14px",
                }}
              >
                <div style={{ fontWeight: 700, color: "#1e293b" }}>{row.item}</div>
                <div style={{ color: "#64748b", lineHeight: 1.5 }}>{row.standard}</div>
                <div style={{ color: "#ea580c", fontWeight: 700, lineHeight: 1.5, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>✓</span>
                  <span>{row.gongsil}</span>
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
            공동중개 및 기사 보도에 대해 궁금하신 점을 확인해 보세요.
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

      {/* ━━━ 8. 하단 와이드 CTA 배너 (직방 스타일) ━━━ */}
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
            SPECIAL LAUNCHING OFFER
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
            지금 입점하고 언론기사 4건 & 공동중개 20건을 바로 시작하세요
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 32px 0" }}>
            선착순 지역별 한정 구좌로 운영되며 조기 마감될 수 있습니다.
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
            <span>무료 파트너 신청서 작성하기</span>
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

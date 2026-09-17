"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";

export default function MobileBrokerageArticlePage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { label: "포털 뉴스 보도 보장", value: "월 4건", desc: "네이버·다음 등 포털 송출", highlight: true },
    { label: "프리미엄 공동중개", value: "월 20건+", desc: "전국 파트너 전용망", highlight: false },
    { label: "매물 계약 성사율", value: "3.8배↑", desc: "언론 신뢰도 효과", highlight: true },
    { label: "기사 작성 비용", value: "0원", desc: "AI 기사 엔진 무상 지원", highlight: false },
  ];

  const processSteps = [
    { step: "01", title: "간편 매물 등록", desc: "사진과 기본 정보만 입력하면 파트너 관리자에서 등록 완료.", icon: "📝" },
    { step: "02", title: "AI 기사 엔진 자동 분석", desc: "입지·상권·미래가치를 AI가 1:1로 정밀 분석하여 보도자료 기사 완성.", icon: "⚡" },
    { step: "03", title: "포털 뉴스 송출", desc: "네이버·다음 등 뉴스 지면에 보도되며 소장님 상호와 직통 번호 단독 노출.", icon: "📰" },
    { step: "04", title: "전국 20건+ 공동중개 매칭", desc: "공실뉴스 전국망 공유로 타 지역 매수인과 초고속 연결.", icon: "🤝" },
  ];

  const faqs = [
    {
      q: "언론 기사 4건은 어디에 보도되나요?",
      a: "네이버, 다음 등 국내 주요 포털 뉴스 지면에 정식 송출되어 검색 시 상위에 노출됩니다.",
    },
    {
      q: "소장님이 직접 기사를 써야 하나요?",
      a: "아닙니다! 기본 매물 정보만 넣으시면 공실뉴스 AI 기사 작성 에이전트가 완성하고 데스크 검수 후 자동 송출됩니다.",
    },
    {
      q: "공동중개 20건은 어떻게 진행되나요?",
      a: "공실뉴스 폐쇄형 B2B 매칭망을 통해 전국 제휴 중개사에게 실시간 공유되며 법정 수수료가 100% 보장됩니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: "80px" }}>
      {/* ━━━ 모바일 상단 고정 헤더 ━━━ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: "none", border: "none", fontSize: "18px", color: "#475569", cursor: "pointer", padding: "4px" }}
          >
            ‹
          </button>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 800, color: "#111827", textDecoration: "none" }}>
            공실뉴스부동산
          </Link>
        </div>
        <Link
          href="/m/newsrealty/apply"
          style={{
            fontSize: "12.5px",
            fontWeight: 800,
            color: "#ffffff",
            backgroundColor: "#ff8e15",
            padding: "5px 12px",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          입점신청
        </Link>
      </header>

      {/* ━━━ 모바일 서브 탭 ━━━ */}
      <BenefitsSubNav activeTab="brokerage-article" isMobile={true} />

      {/* ━━━ 모바일 히어로 ━━━ */}
      <section style={{ padding: "36px 16px 30px 16px", background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: "#ffedd5",
            color: "#ea580c",
            fontSize: "11.5px",
            fontWeight: 800,
            padding: "4px 12px",
            borderRadius: "14px",
            marginBottom: "14px",
          }}
        >
          🏢 BENEFIT 01. 미디어 & 네트워크
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1.4, color: "#0f172a", margin: "0 0 14px 0", letterSpacing: "-0.5px" }}>
          매물 등록 즉시 <span style={{ color: "#ff8e15" }}>포털 기사 4건</span><br />
          전국망 <span style={{ color: "#ff8e15" }}>공동중개 20건</span> 매칭
        </h1>

        <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6, margin: "0 0 24px 0" }}>
          리스팅에 묻히던 내 매물이 포털 정식 기사로 보도되어 신뢰도 급상승! 전국 제휴망으로 빠르게 계약을 성사시킵니다.
        </p>

        <Link
          href="/m/newsrealty/apply"
          style={{
            display: "block",
            width: "100%",
            padding: "14px",
            backgroundColor: "#ff8e15",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: 800,
            borderRadius: "10px",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(255, 142, 21, 0.3)",
          }}
        >
          지금 무료 파트너 신청하기 →
        </Link>
      </section>

      {/* ━━━ 모바일 핵심 지표 카드 ━━━ */}
      <section style={{ padding: "0 16px", marginTop: "-10px", marginBottom: "36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 12px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>{stat.label}</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: stat.highlight ? "#ff8e15" : "#0f172a", marginBottom: "2px" }}>{stat.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 모바일 프로세스 ━━━ */}
      <section style={{ padding: "0 16px 40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ color: "#ff8e15", fontSize: "12px", fontWeight: 800, marginBottom: "4px" }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", margin: 0 }}>4단계 자동화 시스템</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {processSteps.map((step, idx) => (
            <div key={idx} style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "18px 16px", border: "1px solid #e2e8f0", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "24px" }}>{step.icon}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#ff8e15" }}>STEP {step.step}</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b" }}>{step.title}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 모바일 FAQ ━━━ */}
      <section style={{ padding: "0 16px 40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", margin: 0 }}>자주 묻는 질문</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", backgroundColor: "#ffffff" }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", textAlign: "left", fontSize: "14px", fontWeight: 800, color: isOpen ? "#ff8e15" : "#1e293b" }}
                >
                  <span>Q. {faq.q}</span>
                  <span style={{ fontSize: "14px", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px 16px", fontSize: "13px", color: "#475569", lineHeight: 1.6, borderTop: "1px solid #f1f5f9" }}>
                    A. {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ 모바일 하단 고정 CTA 바 ━━━ */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          padding: "10px 16px",
          display: "flex",
          gap: "10px",
          zIndex: 50,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
        }}
      >
        <a
          href="tel:1555-5343"
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor: "#f1f5f9",
            color: "#334155",
            fontSize: "13.5px",
            fontWeight: 800,
            borderRadius: "8px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          전화 상담
        </a>
        <Link
          href="/m/newsrealty/apply"
          style={{
            flex: 2,
            padding: "12px",
            backgroundColor: "#ff8e15",
            color: "#ffffff",
            fontSize: "14.5px",
            fontWeight: 800,
            borderRadius: "8px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          무료 파트너 신청하기
        </Link>
      </div>
    </div>
  );
}

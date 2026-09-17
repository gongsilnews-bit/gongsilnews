"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";

export default function MobileAdRevenuePage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { label: "광고비 정산율", value: "최대 50%", desc: "업계 최고 리워드", highlight: true },
    { label: "월 부가수익", value: "240만원+", desc: "3~5건 유치 기준", highlight: true },
    { label: "디자인·영업 지원", value: "100% 무료", desc: "본사 전액 대행", highlight: false },
    { label: "재계약 수수료", value: "영구 인정", desc: "연장 시마다 지급", highlight: false },
  ];

  const targetAdvertisers = [
    { category: "신축 분양 대행사", title: "분양 홍보 배너", desc: "분양 광고비의 최대 50%를 소장님께 즉시 정산.", icon: "🏗️", reward: "건당 100~300만원" },
    { category: "인테리어 / 이사 / 청소", title: "로컬 제휴 배너", desc: "입주·이사철 제휴 배너로 매월 고정 광고비 분배.", icon: "🛋️", reward: "건당 30~50만원" },
    { category: "부동산 전문 세무 / 법무", title: "전문가 브랜딩 배너", desc: "양도세·상속세 전문 자문 칼럼 및 로컬 배너.", icon: "⚖️", reward: "건당 40~80만원" },
    { category: "프랜차이즈 창업", title: "가맹점 모집 배너", desc: "공실 상가 입점 브랜드 매칭 및 광고 수수료.", icon: "☕", reward: "건당 50~150만원" },
  ];

  const faqs = [
    {
      q: "영업을 한 번도 안 해봤는데 가능한가요?",
      a: "소장님은 지인 대표님 연락처만 주시면, 본사 미디어팀이 제안서 전달 및 계약을 모두 전담합니다.",
    },
    {
      q: "배너 이미지는 누가 만드나요?",
      a: "공실뉴스 디자인팀이 고품질 배너를 100% 무료로 제작해 드립니다.",
    },
    {
      q: "수수료는 언제 입금되나요?",
      a: "광고비 입금 익월 10일에 원천징수 후 지정 계좌로 자동 입금됩니다.",
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
      <BenefitsSubNav activeTab="ad-revenue" isMobile={true} />

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
          💰 BENEFIT 03. 고정 캐시카우
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1.4, color: "#0f172a", margin: "0 0 14px 0", letterSpacing: "-0.5px" }}>
          중개수수료 외 매월 꼬박꼬박<br />
          <span style={{ color: "#ff8e15" }}>뉴스 광고 영업 수익</span> 최대 50%
        </h1>

        <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6, margin: "0 0 24px 0" }}>
          거래 절벽에도 안정적인 수입! 지역 신문 지국장 권한으로 로컬 광고를 유치하고 최대 50%의 리워드를 챙기세요.
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
          지국 파트너 신청하기 →
        </Link>
      </section>

      {/* ━━━ 모바일 핵심 지표 카드 ━━━ */}
      <section style={{ padding: "0 16px", marginTop: "-10px", marginBottom: "36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 12px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>{stat.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: stat.highlight ? "#ff8e15" : "#0f172a", marginBottom: "2px" }}>{stat.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 모바일 광고 유치 영역 ━━━ */}
      <section style={{ padding: "0 16px 40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ color: "#ff8e15", fontSize: "12px", fontWeight: 800, marginBottom: "4px" }}>TARGET ADVERTISERS</div>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", margin: 0 }}>유치 가능한 4대 광고주</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {targetAdvertisers.map((item, idx) => (
            <div key={idx} style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "18px 16px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>{item.icon}</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b" }}>{item.title}</span>
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#ea580c", backgroundColor: "#fff5eb", padding: "3px 8px", borderRadius: "6px" }}>
                  {item.reward}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
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
          지국 파트너 신청하기
        </Link>
      </div>
    </div>
  );
}

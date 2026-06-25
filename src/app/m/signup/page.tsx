"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";

const PlayLogo = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="24" fill="#111827" />
    <circle cx="24" cy="24" r="16" fill="#FFFFFF" />
    <path d="M19 15.34L34 24L19 32.66Z" fill="#F59E0B" stroke="#111827" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="12" fill="#3f37c9" />
    <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const brokerStats = [
  { label: "누적 가입 중개사", value: "11만+", sub: "전국 중개사무소" },
  { label: "부동산 뉴스 콘텐츠", value: "50,000+", sub: "일일 업데이트" },
  { label: "무료 특강 영상", value: "300+", sub: "AI 기반 맞춤 추천" },
];

const landlordStats = [
  { label: "공실 등록 수수료", value: "0원", sub: "평생 무료 등록" },
  { label: "매칭 가능 중개사", value: "11만+", sub: "전국 네트워크" },
  { label: "실시간 매물 노출", value: "24시간", sub: "등록 즉시 노출" },
];

const brokerFeatures = [
  {
    icon: "📰",
    title: "로컬 부동산이 직접 전달하는\n시세 현황 뉴스",
    desc: "각 지역 현장 중개사가 직접 작성하는 실시간 시세 동향과 공실광고 정보를 가장 빠르게 확인하세요. 동네별 공실률, 매매·전세 시세 변동까지 한눈에 파악할 수 있습니다.",
    color: "#1e56a0",
  },
  {
    icon: "🎬",
    title: "중개사에게 꼭 필요한\nAI 유튜브 특강 시청",
    desc: "세무·법률·마케팅·실무 노하우까지, AI가 엄선한 부동산 전문 특강을 무료로 시청하세요. 바쁜 중개사를 위해 핵심만 담은 콘텐츠로 경쟁력을 높일 수 있습니다.",
    color: "#F59E0B",
  },
  {
    icon: "🤝",
    title: "대한민국 부동산 누구나 가입하는\n100% 무료 공동중개망",
    desc: "가입비·수수료 제로! 전국 어디서나 공동중개 공실광고를 등록하고 조회해보세요. 지금 공실뉴스에 가입한 11만 중개사와 함께 더 많은 거래 기회를 만들 수 있습니다.",
    color: "#10b981",
  },
];

const landlordFeatures = [
  {
    icon: "🏠",
    title: "수수료 없는 100% 무료\n공실광고 등록 및 중개 의뢰",
    desc: "직접 발품 팔 필요 없이 소중한 매물 정보를 클릭 몇 번으로 등록하고, 인근 중개업소 11만 곳에 수수료 부담 없이 즉시 노출시켜 빠른 계약을 유도하세요.",
    color: "#3f37c9",
  },
  {
    icon: "🚁",
    title: "드론 항공 촬영 및\n매물 홍보 무료 지원",
    desc: "비어 있는 상가, 토지, 건물 등의 가치를 극대화할 수 있도록 드론 항공 촬영을 지원하며, 시선을 사로잡는 차별화된 홍보 콘텐츠를 제작해 드립니다.",
    color: "#f72585",
  },
  {
    icon: "📊",
    title: "지역별 실시간 공실률 및\n시세 리포트 제공",
    desc: "내 매물이 위치한 지역구의 실시간 공실률 변동 추이와 실제 실거래 변동 데이터를 제공받아 합리적인 임대 조건 설정과 시세 예측이 가능해집니다.",
    color: "#4361ee",
  },
];

const comparisonData = [
  { feature: "가입비 & 가입 절차", legacy: "가입비 발생 & 대기", gongsil: "100% 무료 & 즉시 승인" },
  { feature: "월 고정 이용료", legacy: "매월 10~30만원 지출", gongsil: "평생 0원 (수수료 제로)" },
  { feature: "매물 등록 광고비", legacy: "건당 추가 비용 발생", gongsil: "무제한 등록 & 무료 노출" },
  { feature: "중개 실무 교육/특강", legacy: "유료 아카데미 결제", gongsil: "전문가 특강 전면 무료" },
  { feature: "매물 매칭 지원", legacy: "수동 검색 및 연락", gongsil: "AI 실시간 추천 및 알림" },
];

const faqs = [
  {
    q: "가입비나 이용료가 정말 없나요?",
    a: "네, 맞습니다. 공실뉴스는 중개사와 임대인을 위한 상생 플랫폼으로 가입비, 월 고정 이용료, 수수료가 평생 100% 무료입니다.",
  },
  {
    q: "공동중개/공실 등록 서류는?",
    a: "개인 회원은 인증만으로 가입이 가능합니다. 중개사 회원 가입 시 사업자등록증 또는 개설등록증 업로드가 필요합니다.",
  },
  {
    q: "매물 매칭은 어떻게 되나요?",
    a: "임대인이 등록한 매물 정보는 즉시 인근 지역의 11만 중개사 회원에게 알림으로 전송되어 빠르게 거래를 매칭합니다.",
  },
  {
    q: "무료 특강/뉴스 구독 요건은?",
    a: "회원가입만 하시면 세무, 부동산 마케팅, 실무 트렌드 분석 리포트 및 부동산 뉴스를 모두 제한 없이 무료 이용 가능합니다.",
  },
];

export default function MobileSignupPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"broker" | "landlord">("broker");
  const [emailInput, setEmailInput] = useState("");

  const currentStats = activeTab === "broker" ? brokerStats : landlordStats;
  const currentFeatures = activeTab === "broker" ? brokerFeatures : landlordFeatures;

  const handleQuickSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="signup" />

      <div className="m-signup-container">
        <style>{`
          .m-signup-container {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            background: #ffffff;
            min-height: 100vh;
            color: #1f2937;
          }
          
          /* ===== Mobile Header ===== */
          .m-signup-header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid #f3f4f6;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
          }
          .m-header-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
          }

          /* ===== Hero ===== */
          .m-signup-hero {
            background: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 60%, #020617 100%);
            padding: 50px 16px 80px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .m-signup-hero::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: url("/handshake_bg.png");
            background-size: cover;
            background-position: center;
            filter: blur(6px);
            opacity: 0.25;
            z-index: 0;
            pointer-events: none;
          }
          .m-hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 50px;
            padding: 6px 16px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            font-size: 12px;
            color: rgba(255, 255, 255, 0.95);
            font-weight: 600;
          }
          .m-hero-title {
            font-size: 26px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.35;
            margin: 0 0 14px;
            letter-spacing: -0.5px;
            word-break: keep-all;
          }
          .m-hero-desc {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.6;
            margin: 0 0 28px;
            word-break: keep-all;
          }

          /* ===== Segmented Tabs ===== */
          .m-tab-container {
            display: inline-flex;
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(10px);
            padding: 4px;
            border-radius: 50px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 28px;
            width: 100%;
            max-width: 320px;
          }
          .m-tab-btn {
            flex: 1;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 13px;
            font-weight: 700;
            padding: 10px 0;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.25s ease;
            font-family: inherit;
          }
          .m-tab-btn.active {
            background: #ffffff;
            color: #0f172a;
            box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15);
          }

          /* ===== Quick Input Form ===== */
          .m-quick-signup-form {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 10px;
            max-width: 320px;
            margin: 0 auto;
          }
          .m-quick-signup-input {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            color: #ffffff;
            padding: 12px 16px;
            font-size: 14px;
            text-align: center;
            outline: none;
            font-family: inherit;
          }
          .m-quick-signup-input::placeholder {
            color: #64748b;
          }
          .m-quick-signup-btn {
            background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
          }

          /* ===== Stats ===== */
          .m-stats-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 0 16px;
            transform: translateY(-30px);
            position: relative;
            z-index: 2;
          }
          .m-stat-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 20px 16px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
            border: 1px solid #f1f5f9;
          }
          .m-stat-label { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 2px; }
          .m-stat-val { font-size: 28px; font-weight: 900; color: #3f37c9; letter-spacing: -1px; }
          .m-stat-sub { font-size: 11px; color: #94a3b8; }

          /* ===== Features ===== */
          .m-features-sec {
            padding: 20px 16px 50px;
            background: #f8fafc;
          }
          .m-feature-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 28px 20px;
            margin-bottom: 16px;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
            border: 1px solid #f1f5f9;
          }
          .m-feature-icon-wrap {
            width: 60px; height: 60px;
            border-radius: 16px;
            display: flex; align-items: center; justify-content: center;
            font-size: 28px;
            margin: 0 auto 16px;
          }
          .m-feature-title {
            font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.4;
            margin: 0 0 10px; white-space: pre-line; letter-spacing: -0.5px;
          }
          .m-feature-desc {
            font-size: 13px; color: #475569; line-height: 1.6; margin: 0; word-break: keep-all;
          }

          /* ===== Comparison ===== */
          .m-comp-sec {
            padding: 50px 16px;
            background: #ffffff;
            text-align: center;
          }
          .m-comp-table-wrapper {
            margin-top: 24px;
            border-radius: 16px;
            overflow-x: auto;
            border: 1px solid #e2e8f0;
          }
          .m-comp-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .m-comp-table th {
            background: #f8fafc;
            padding: 14px 10px;
            font-weight: 800;
            border-bottom: 1px solid #e2e8f0;
          }
          .m-comp-table td {
            padding: 14px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            word-break: keep-all;
          }
          .m-comp-highlight {
            font-weight: 700;
            color: #3f37c9;
            background: rgba(63, 87, 201, 0.02);
          }

          /* ===== FAQ ===== */
          .m-faq-sec {
            padding: 50px 16px;
            background: #f8fafc;
          }
          .m-faq-card {
            background: #ffffff; border-radius: 12px; margin-bottom: 10px;
            border: 1px solid #e2e8f0; overflow: hidden;
          }
          .m-faq-q {
            width: 100%; padding: 18px 16px; background: none; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: space-between;
            font-size: 14px; font-weight: 700; color: #0f172a; text-align: left;
            font-family: inherit;
          }
          .m-faq-a {
            padding: 0 16px 18px; font-size: 13px; color: #475569; line-height: 1.6; word-break: keep-all;
          }

          /* ===== CTA ===== */
          .m-cta-sec {
            padding: 60px 16px;
            background: radial-gradient(circle at bottom right, #1e1b4b 0%, #020617 100%);
            text-align: center;
          }
          .m-cta-title {
            font-size: 22px; font-weight: 900; color: #ffffff; line-height: 1.35;
            margin: 16px 0 10px; letter-spacing: -0.5px;
          }
          .m-cta-desc {
            font-size: 13px; color: #94a3b8; margin: 0 0 24px;
          }

          /* ===== Footer ===== */
          .m-footer {
            background: #0b0f19; padding: 36px 16px; text-align: center; border-top: 1px solid #1e293b;
          }
        `}</style>

        {/* ===== Header ===== */}
        <header className="m-signup-header">
          <Link href="/m" className="m-header-logo">
            <PlayLogo size={28} />
            <span style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>공실뉴스</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/m" style={{ fontSize: 13, fontWeight: 600, color: "#475569", textDecoration: "none" }}>홈</Link>
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              style={{ background: "#3f37c9", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}
            >
              무료 회원가입
            </button>
          </div>
        </header>

        {/* ===== Hero ===== */}
        <section className="m-signup-hero">
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <div className="m-hero-badge">
              🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 중개망 무료 상생 플랫폼
            </div>
            <h1 className="m-hero-title">
              수수료 없는 부동산 매칭,<br />
              <span style={{ color: "#F59E0B" }}>공실뉴스</span>와 함께하세요
            </h1>
            <p className="m-hero-desc">
              공실 지도, 공동중개망, AI 교육 특강까지 모든 정보가 평생 조건 없이 100% 무료로 제공됩니다.
            </p>

            {/* Tab Switcher */}
            <div className="m-tab-container">
              <button className={`m-tab-btn ${activeTab === "broker" ? "active" : ""}`} onClick={() => setActiveTab("broker")}>
                💼 공인중개사 회원
              </button>
              <button className={`m-tab-btn ${activeTab === "landlord" ? "active" : ""}`} onClick={() => setActiveTab("landlord")}>
                🏠 임대인/일반 회원
              </button>
            </div>

            {/* Quick Input Form */}
            <form className="m-quick-signup-form" onSubmit={handleQuickSignup}>
              <input 
                type="email" 
                placeholder="이메일을 입력해 빠르게 시작" 
                className="m-quick-signup-input"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                required
              />
              <button type="submit" className="m-quick-signup-btn">지금 가입하기</button>
            </form>
          </div>
        </section>

        {/* ===== Stats ===== */}
        <div style={{ background: "#f8fafc" }}>
          <div className="m-stats-container">
            {currentStats.map((s, i) => (
              <div key={i} className="m-stat-card">
                <div className="m-stat-label">{s.label}</div>
                <div className="m-stat-val">{s.value}</div>
                <div className="m-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Features ===== */}
        <section className="m-features-sec">
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.5px" }}>주요 혜택 안내</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>성공적인 비즈니스를 지원하기 위한 맞춤 서비스입니다.</p>
          </div>

          {currentFeatures.map((f, i) => (
            <div key={i} className="m-feature-card">
              <div className="m-feature-icon-wrap" style={{ background: `${f.color}10`, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="m-feature-title">{f.title}</h3>
              <p className="m-feature-desc">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* ===== Comparison Table ===== */}
        <section className="m-comp-sec">
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.5px" }}>기존 플랫폼과의 차이</h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>공실뉴스만의 합리적인 차별점을 직접 확인해보세요.</p>
          
          <div className="m-comp-table-wrapper">
            <table className="m-comp-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>기존 유료망</th>
                  <th className="m-comp-highlight">공실뉴스</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700 }}>{row.feature}</td>
                    <td style={{ color: "#64748b" }}>{row.legacy}</td>
                    <td className="m-comp-highlight">{row.gongsil}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="m-faq-sec">
          <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 20px" }}>자주 묻는 질문</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="m-faq-card" style={{ borderColor: openFaq === i ? "#3f37c9" : "#e2e8f0" }}>
              <button className="m-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <span style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
              </button>
              {openFaq === i && (
                <div className="m-faq-a">{faq.a}</div>
              )}
            </div>
          ))}
        </section>

        {/* ===== CTA ===== */}
        <section className="m-cta-sec">
          <PlayLogo size={44} />
          <h2 className="m-cta-title">부동산 상생 네트워크,<br />공실뉴스에 동참하세요.</h2>
          <p className="m-cta-desc">가입비 및 수수료 없이 강력한 정보 혜택을 제공받으실 수 있습니다.</p>
          <button className="m-quick-signup-btn" style={{ width: "100%", maxWidth: "260px", margin: "0 auto" }} onClick={() => setIsAuthModalOpen(true)}>
            무료 회원가입 바로가기
          </button>
        </section>

        {/* ===== Footer ===== */}
        <footer className="m-footer">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
            문의: <a href="mailto:gongsilmarketing@gmail.com" style={{ color: "#94a3b8", textDecoration: "none" }}>gongsilmarketing@gmail.com</a>
          </div>
          <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
            © 2026 공실뉴스. All rights reserved.
          </div>
        </footer>

      </div>
    </>
  );
}

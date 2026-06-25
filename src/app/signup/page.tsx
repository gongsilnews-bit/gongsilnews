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
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
  { feature: "가입비 & 가입 절차", legacy: "초기 가입비 발생 & 복잡한 심사", gongsil: "100% 평생 무료 & 즉시 승인" },
  { feature: "월 고정 이용료", legacy: "매월 10~30만원 고정 지출", gongsil: "평생 0원 (수수료/이용료 제로)" },
  { feature: "매물 등록 및 광고비", legacy: "건당 추가 비용 및 상단 노출 유도", gongsil: "무제한 등록 및 전체 무료 노출" },
  { feature: "중개 실무 교육/특강", legacy: "수십만 원 상당의 유료 아카데미", gongsil: "전문가 특강 영상 전면 무료 제공" },
  { feature: "매물 매칭 지원", legacy: "수동 검색 및 직접 연락 필요", gongsil: "AI 추천 및 실시간 매칭 알림" },
];

const faqs = [
  {
    q: "가입비나 이용료가 정말 없나요?",
    a: "네, 맞습니다. 공실뉴스는 중개사와 임대인을 위한 상생 플랫폼으로 가입비, 월 고정 이용료, 수수료가 평생 100% 무료입니다.",
  },
  {
    q: "공동중개/공실 등록을 위해 준비할 서류가 있나요?",
    a: "개인 회원은 이메일 및 휴대폰 인증만으로 즉시 가입 및 이용이 가능합니다. 다만, 중개사 회원으로 공동중개 기능을 이용하려면 사업자등록증 또는 중개업소 개설등록증 업로드가 필요합니다.",
  },
  {
    q: "매물 매칭이나 홍보 서비스는 어떻게 이루어지나요?",
    a: "임대인이 등록한 공실 정보는 즉시 AI 시스템을 거쳐 인근 지역의 활성화된 11만 중개 회원에게 실시간 알림으로 전송되어 빠르게 거래를 매칭합니다.",
  },
  {
    q: "무료 특강 및 뉴스 구독은 회원가입만 하면 되나요?",
    a: "그렇습니다. 회원가입 후 세무, 부동산 마케팅, 실무 트렌드 분석 리포트 및 부동산 뉴스를 무제한으로 시청하고 구독하실 수 있습니다.",
  },
];

export default function SignupPage() {
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

      <div className="signup-page-container">
        <style>{`
          .signup-page-container {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            background: #ffffff;
            min-height: 100vh;
            color: #1f2937;
          }
          
          /* ===== Sticky Header ===== */
          .signup-header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid #f3f4f6;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
          }

          /* ===== Hero Section ===== */
          .signup-hero {
            background: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 40%, #020617 100%);
            padding: 90px 40px 140px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .signup-hero::before {
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
          .signup-hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(8px);
            border-radius: 50px;
            padding: 8px 24px;
            margin-bottom: 28px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.95);
            font-size: 14px;
            font-weight: 600;
          }
          .signup-hero-title {
            font-size: 48px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.25;
            margin: 0 0 20px;
            letter-spacing: -1px;
          }
          .signup-hero-desc {
            font-size: 19px;
            color: #94a3b8;
            line-height: 1.7;
            margin: 0 0 40px;
          }

          /* ===== Segmented Tabs ===== */
          .tab-container {
            display: inline-flex;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            padding: 6px;
            border-radius: 50px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            margin-bottom: 40px;
          }
          .tab-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 16px;
            font-weight: 700;
            padding: 12px 36px;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
          }
          .tab-btn.active {
            background: #ffffff;
            color: #0f172a;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
          }

          /* ===== Quick Signup Form ===== */
          .quick-signup-form {
            display: flex;
            max-width: 520px;
            margin: 0 auto;
            gap: 10px;
            background: rgba(255, 255, 255, 0.06);
            padding: 8px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          }
          .quick-signup-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #ffffff;
            padding: 12px 20px;
            font-size: 15px;
            font-family: inherit;
          }
          .quick-signup-input::placeholder {
            color: #64748b;
          }
          .quick-signup-btn {
            background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 14px 28px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(67, 97, 238, 0.4);
          }
          .quick-signup-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(67, 97, 238, 0.6);
          }

          /* ===== Stats Cards ===== */
          .signup-stats-outer {
            background: #ffffff;
            padding: 0 40px;
            position: relative;
            z-index: 2;
          }
          .signup-stats-container {
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            gap: 24px;
            transform: translateY(-50px);
          }
          .signup-stats-card {
            flex: 1;
            background: #ffffff;
            border-radius: 20px;
            padding: 36px 24px;
            text-align: center;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
            border: 1px solid #f1f5f9;
            transition: all 0.3s;
          }
          .signup-stats-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.08);
          }
          .signup-stats-value {
            font-size: 42px;
            font-weight: 900;
            color: #3f37c9;
            letter-spacing: -1px;
            margin-bottom: 4px;
          }
          .signup-stats-label {
            font-size: 14px;
            font-weight: 700;
            color: #64748b;
            margin-bottom: 2px;
          }
          .signup-stats-sub {
            font-size: 12px;
            color: #94a3b8;
          }

          /* ===== Features Section ===== */
          .signup-feature-section {
            padding: 60px 40px 100px;
            background: #f8fafc;
          }
          .feature-grid {
            max-width: 1100px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
          }
          .feature-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 44px 36px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
            border: 1px solid #f1f5f9;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
          }
          .feature-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06);
            border-color: #e2e8f0;
          }
          .feature-icon-wrapper {
            width: 72px;
            height: 72px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin-bottom: 28px;
          }
          .feature-title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.45;
            margin: 0 0 16px;
            white-space: pre-line;
            letter-spacing: -0.5px;
          }
          .feature-desc {
            font-size: 15px;
            color: #475569;
            line-height: 1.7;
            margin: 0;
          }

          /* ===== Comparison Table Section ===== */
          .comparison-section {
            padding: 100px 40px;
            background: #ffffff;
            text-align: center;
          }
          .comparison-table-wrapper {
            max-width: 900px;
            margin: 40px auto 0;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          }
          .comparison-table {
            width: 100%;
            border-collapse: collapse;
          }
          .comparison-table th {
            background: #f8fafc;
            color: #0f172a;
            font-weight: 800;
            font-size: 16px;
            padding: 22px 24px;
            border-bottom: 1px solid #e2e8f0;
          }
          .comparison-table td {
            padding: 20px 24px;
            font-size: 15px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          .comparison-table tr:last-child td {
            border-bottom: none;
          }
          .comparison-highlight {
            font-weight: 700;
            color: #3f37c9;
            background: rgba(63, 87, 201, 0.03);
          }

          /* ===== FAQ Section ===== */
          .faq-section {
            background: #f8fafc;
            padding: 100px 40px;
          }
          .faq-accordion {
            max-width: 800px;
            margin: 40px auto 0;
          }
          .faq-item {
            background: #ffffff;
            border-radius: 16px;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            transition: all 0.2s;
          }
          .faq-question-btn {
            width: 100%;
            padding: 24px 28px;
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: inherit;
            text-align: left;
          }
          .faq-question-text {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
          }
          .faq-icon {
            font-size: 20px;
            color: #94a3b8;
            transition: transform 0.2s;
          }
          .faq-answer {
            padding: 0 28px 24px;
            font-size: 15px;
            color: #475569;
            line-height: 1.7;
          }

          /* ===== CTA Section ===== */
          .cta-section {
            background: radial-gradient(circle at bottom left, #1e1b4b 0%, #020617 100%);
            padding: 100px 40px;
            text-align: center;
            position: relative;
          }
          .cta-title {
            font-size: 36px;
            font-weight: 900;
            color: #ffffff;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
          }
          .cta-desc {
            font-size: 16px;
            color: #94a3b8;
            margin-bottom: 40px;
          }

          /* ===== Media Queries ===== */
          @media (max-width: 1024px) {
            .feature-grid {
              grid-template-columns: 1fr;
              gap: 20px;
            }
          }
          @media (max-width: 768px) {
            .signup-header {
              padding: 0 20px;
            }
            .signup-hero {
              padding: 60px 20px 100px;
            }
            .signup-hero-title {
              font-size: 32px;
            }
            .quick-signup-form {
              flex-direction: column;
              background: transparent;
              border: none;
              padding: 0;
              box-shadow: none;
            }
            .quick-signup-input {
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 12px;
              margin-bottom: 10px;
              text-align: center;
            }
            .quick-signup-btn {
              width: 100%;
            }
            .signup-stats-container {
              flex-direction: column;
              transform: translateY(-40px);
              gap: 16px;
            }
            .comparison-table-wrapper {
              overflow-x: auto;
            }
            .cta-title {
              font-size: 26px;
            }
          }
        `}</style>

        {/* ===== Header ===== */}
        <header className="signup-header">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <PlayLogo size={36} />
            <span style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>공실뉴스</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: "#475569", textDecoration: "none", padding: "8px 12px", borderRadius: 8 }}>홈</Link>
            <button onClick={() => setIsAuthModalOpen(true)} style={{ background: "#3f37c9", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              무료 회원가입
            </button>
          </div>
        </header>

        {/* ===== Hero Section ===== */}
        <section className="signup-hero">
          <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto" }}>
            <div className="signup-hero-badge">
              <span>🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 중개 네트워크 무료 상생 플랫폼</span>
            </div>
            
            <h1 className="signup-hero-title">
              수수료 없는 부동산 매칭,<br />
              <span style={{ color: "#F59E0B" }}>공실뉴스</span>와 함께 시작하세요
            </h1>
            <p className="signup-hero-desc">
              동네 공실 리포트부터 맞춤형 공동중개, AI 실무 교육 특강까지<br />
              필요한 모든 정보 인프라가 조건 없이 100% 무료로 제공됩니다.
            </p>

            {/* Target Segmentation Switcher */}
            <div className="tab-container">
              <button className={`tab-btn ${activeTab === "broker" ? "active" : ""}`} onClick={() => setActiveTab("broker")}>
                💼 공인중개사 회원
              </button>
              <button className={`tab-btn ${activeTab === "landlord" ? "active" : ""}`} onClick={() => setActiveTab("landlord")}>
                🏠 임대인/일반 회원
              </button>
            </div>

            {/* Quick Email Registration */}
            <form className="quick-signup-form" onSubmit={handleQuickSignup}>
              <input 
                type="email" 
                placeholder="이메일 주소를 입력해 빠르게 시작하기" 
                className="quick-signup-input" 
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                required
              />
              <button type="submit" className="quick-signup-btn">
                지금 가입하기
              </button>
            </form>
          </div>
        </section>

        {/* ===== Stats Cards ===== */}
        <div className="signup-stats-outer">
          <div className="signup-stats-container">
            {currentStats.map((s, i) => (
              <div key={i} className="signup-stats-card">
                <div className="signup-stats-label">{s.label}</div>
                <div className="signup-stats-value">{s.value}</div>
                <div className="signup-stats-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Features Grid Section ===== */}
        <section className="signup-feature-section">
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.5px" }}>
                주요 핵심 서비스 안내
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>
                회원님의 비즈니스를 극대화하기 위한 대표 혜택입니다.
              </p>
            </div>

            <div className="feature-grid">
              {currentFeatures.map((f, i) => (
                <div key={i} className="feature-card">
                  <div className="feature-icon-wrapper" style={{ background: `${f.color}12`, color: f.color }}>
                    {f.icon}
                  </div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Comparison Table Section ===== */ }
        <section className="comparison-section">
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.5px" }}>
              기존 플랫폼과의 차별성
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>
              비용 걱정 없는 공실뉴스만의 압도적인 혜택 테이블을 확인해보세요.
            </p>

            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>구분 항목</th>
                    <th>기존 유료 부동산망</th>
                    <th className="comparison-highlight">공실뉴스</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{row.feature}</td>
                      <td style={{ color: "#64748b" }}>{row.legacy}</td>
                      <td className="comparison-highlight">{row.gongsil}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===== FAQ Section ===== */}
        <section className="faq-section">
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: 30, fontWeight: 900, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.5px" }}>
              자주 묻는 질문
            </h2>
            <p style={{ textAlign: "center", fontSize: 16, color: "#64748b", margin: "0 0 40px" }}>
              궁금한 부분을 빠르게 찾아보실 수 있습니다.
            </p>

            <div className="faq-accordion">
              {faqs.map((faq, i) => (
                <div key={i} className="faq-item" style={{ borderColor: openFaq === i ? "#3f37c9" : "#e2e8f0" }}>
                  <button 
                    className="faq-question-btn" 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="faq-question-text">{faq.q}</span>
                    <span className="faq-icon" style={{ transform: openFaq === i ? "rotate(180deg)" : "none" }}>▾</span>
                  </button>
                  {openFaq === i && (
                    <div className="faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Final CTA ===== */}
        <section className="cta-section">
          <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <PlayLogo size={56} />
            <h2 className="cta-title">
              부동산 상생의 첫걸음,<br />공실뉴스에 참여하세요.
            </h2>
            <p className="cta-desc">
              가입비나 이용 요금 제한 없이, 파워풀한 정보 연계를 전면 무료로 체험하세요.
            </p>
            <button 
              className="quick-signup-btn" 
              style={{ padding: "18px 48px", fontSize: 16, borderRadius: "14px" }}
              onClick={() => setIsAuthModalOpen(true)}
            >
              무료 회원가입 바로가기
            </button>
          </div>
        </section>

        {/* ===== Footer ===== */}
        <footer style={{ background: "#0b0f19", padding: "50px 40px", textAlign: "center", borderTop: "1px solid #1e293b" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
              문의사항: <a href="mailto:gongsilmarketing@gmail.com" style={{ color: "#94a3b8", textDecoration: "none" }}>gongsilmarketing@gmail.com</a>
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              © 2026 공실뉴스. All rights reserved. 본 채널은 공정하고 투명한 부동산 네트워크 상생을 모토로 합니다.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

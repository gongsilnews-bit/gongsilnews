"use client";

import React, { useState } from "react";
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
  { feature: "가입비 & 가입 절차", legacy: "가입비 발생 & 승인 대기", gongsil: "100% 무료 & 즉시 가입/승인" },
  { feature: "월 고정 이용료", legacy: "매월 10~30만원 지출", gongsil: "평생 0원 (수수료 제로)" },
  { feature: "매물 등록 광고비", legacy: "건당 추가 비용 발생", gongsil: "무제한 등록 & 무료 노출" },
  { feature: "중개 실무 교육/특강", legacy: "유료 아카데미 결제", gongsil: "전문가 특강 전면 무료" },
  { feature: "매물 매칭 지원", legacy: "수동 검색 및 연락", gongsil: "AI 실시간 추천 및 자동 매칭" },
];

const faqs = [
  {
    q: "가입비나 이용료가 정말 없나요?",
    a: "네, 맞습니다. 공실뉴스는 중개사와 임대인을 위한 상생 플랫폼으로 가입비, 월 고정 이용료, 수수료가 평생 100% 무료입니다.",
  },
  {
    q: "공동중개/공실 등록 서류는?",
    a: "일반 개인 회원은 인증만으로 간편 가입이 가능합니다. 다만 공인중개사 회원으로 활동하시려면 사업자등록증 또는 개설등록증 등의 자격 서류 업로드가 필요합니다.",
  },
  {
    q: "매물 매칭은 어떻게 되나요?",
    a: "임대인이 등록한 공실 정보는 즉시 인근 지역의 11만 중개사 회원에게 전송되어 실시간 거래를 유도하고 자동으로 빠르게 매칭합니다.",
  },
  {
    q: "무료 특강/뉴스 구독 요건은?",
    a: "회원가입만 완료하시면 세무, 부동산 마케팅, 실무 트렌드 분석 리포트 및 부동산 뉴스를 아무런 제한 없이 전면 무료로 이용하실 수 있습니다.",
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

      <div className="pc-signup-container">
        <style>{`
          .pc-signup-container {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            background: #ffffff;
            color: #1f2937;
            padding-bottom: 80px;
          }

          /* ===== Hero Section ===== */
          .pc-signup-hero {
            background: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 60%, #020617 100%);
            padding: 100px 20px 140px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .pc-signup-hero::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: url("/handshake_bg.png");
            background-size: cover;
            background-position: center;
            opacity: 0.15;
            z-index: 0;
            pointer-events: none;
          }
          .hero-inner {
            position: relative;
            z-index: 1;
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .pc-hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 50px;
            padding: 8px 24px;
            margin-bottom: 24px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            font-size: 14px;
            color: rgba(255, 255, 255, 0.95);
            font-weight: 600;
          }
          .pc-hero-title {
            font-size: 48px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.3;
            margin: 0 0 20px;
            letter-spacing: -1.5px;
            word-break: keep-all;
          }
          .pc-hero-desc {
            font-size: 18px;
            color: #94a3b8;
            line-height: 1.6;
            margin: 0 0 40px;
            max-width: 720px;
            word-break: keep-all;
          }

          /* ===== Segmented Tabs ===== */
          .pc-tab-container {
            display: inline-flex;
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(10px);
            padding: 5px;
            border-radius: 50px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            margin-bottom: 40px;
            width: 100%;
            max-width: 440px;
          }
          .pc-tab-btn {
            flex: 1;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 15px;
            font-weight: 700;
            padding: 12px 0;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.25s ease;
            font-family: inherit;
          }
          .pc-tab-btn.active {
            background: #ffffff;
            color: #0f172a;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          }

          /* ===== Quick Input Form ===== */
          .pc-quick-signup-form {
            display: flex;
            width: 100%;
            gap: 12px;
            max-width: 500px;
            margin: 0 auto;
          }
          .pc-quick-signup-input {
            flex: 1;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            color: #ffffff;
            padding: 14px 20px;
            font-size: 15px;
            outline: none;
            font-family: inherit;
            transition: border-color 0.2s;
          }
          .pc-quick-signup-input:focus {
            border-color: rgba(255, 255, 255, 0.4);
          }
          .pc-quick-signup-input::placeholder {
            color: #64748b;
          }
          .pc-quick-signup-btn {
            background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 0 28px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
            transition: transform 0.2s, opacity 0.2s;
            white-space: nowrap;
          }
          .pc-quick-signup-btn:hover {
            opacity: 0.95;
            transform: translateY(-1px);
          }

          /* ===== Stats (Float Section) ===== */
          .pc-stats-outer {
            background: #f8fafc;
            padding-bottom: 60px;
          }
          .pc-stats-container {
            max-width: 1000px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            padding: 0 20px;
            transform: translateY(-50px);
            position: relative;
            z-index: 2;
          }
          .pc-stat-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 30px 24px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            transition: transform 0.3s;
          }
          .pc-stat-card:hover {
            transform: translateY(-4px);
          }
          .pc-stat-label { font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 6px; }
          .pc-stat-val { font-size: 38px; font-weight: 900; color: #3f37c9; letter-spacing: -1px; margin-bottom: 4px; }
          .pc-stat-sub { font-size: 13px; color: #94a3b8; }

          /* ===== Features ===== */
          .pc-features-sec {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px 80px;
          }
          .pc-sec-header {
            text-align: center;
            margin-bottom: 50px;
          }
          .pc-sec-title {
            font-size: 32px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 12px;
            letter-spacing: -1px;
          }
          .pc-sec-desc {
            font-size: 16px;
            color: #64748b;
            margin: 0;
          }
          .pc-features-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 28px;
          }
          .pc-feature-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 40px 30px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
            border: 1px solid #f1f5f9;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          .pc-feature-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          }
          .pc-feature-icon-wrap {
            width: 72px; height: 72px;
            border-radius: 20px;
            display: flex; align-items: center; justify-content: center;
            font-size: 34px;
            margin: 0 auto 24px;
          }
          .pc-feature-title {
            font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.4;
            margin: 0 0 14px; white-space: pre-line; letter-spacing: -0.5px;
          }
          .pc-feature-desc {
            font-size: 14px; color: #475569; line-height: 1.7; margin: 0; word-break: keep-all;
          }

          /* ===== Comparison ===== */
          .pc-comp-sec {
            max-width: 1000px;
            margin: 0 auto;
            padding: 80px 20px;
            text-align: center;
          }
          .pc-comp-table-wrapper {
            margin-top: 40px;
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
          }
          .pc-comp-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 15px;
          }
          .pc-comp-table th {
            background: #f8fafc;
            padding: 20px;
            font-weight: 800;
            font-size: 16px;
            border-bottom: 1px solid #e2e8f0;
            color: #0f172a;
          }
          .pc-comp-table td {
            padding: 20px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            word-break: keep-all;
          }
          .pc-comp-table tr:hover td {
            background: #fdfdfd;
          }
          .pc-comp-highlight {
            font-weight: 800;
            color: #3f37c9;
            background: rgba(63, 87, 201, 0.03);
          }

          /* ===== FAQ ===== */
          .pc-faq-sec {
            background: #f8fafc;
            padding: 80px 20px;
          }
          .pc-faq-container {
            max-width: 800px;
            margin: 40px auto 0;
          }
          .pc-faq-card {
            background: #ffffff;
            border-radius: 16px;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .pc-faq-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          }
          .pc-faq-q {
            width: 100%; padding: 22px 28px; background: none; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: space-between;
            font-size: 16px; font-weight: 700; color: #0f172a; text-align: left;
            font-family: inherit;
          }
          .pc-faq-a {
            padding: 0 28px 24px; font-size: 15px; color: #475569; line-height: 1.7; word-break: keep-all;
            border-top: 1px solid #f8fafc;
          }

          /* ===== CTA Section ===== */
          .pc-cta-sec {
            max-width: 1000px;
            margin: 80px auto 0;
            border-radius: 30px;
            padding: 80px 40px;
            background: radial-gradient(circle at bottom right, #1e1b4b 0%, #020617 100%);
            text-align: center;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          }
          .pc-cta-title {
            font-size: 36px; font-weight: 900; color: #ffffff; line-height: 1.3;
            margin: 24px 0 14px; letter-spacing: -1px;
          }
          .pc-cta-desc {
            font-size: 16px; color: #94a3b8; margin: 0 0 36px;
          }
          .pc-cta-btn {
            background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 16px 48px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(67, 97, 238, 0.4);
            transition: transform 0.2s, opacity 0.2s;
          }
          .pc-cta-btn:hover {
            opacity: 0.95;
            transform: translateY(-2px);
          }
        `}</style>

        {/* ===== Hero Section ===== */}
        <section className="pc-signup-hero">
          <div className="hero-inner">
            <div className="pc-hero-badge">
              🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 중개망 무료 상생 플랫폼
            </div>
            <h1 className="pc-hero-title">
              수수료 없는 부동산 매칭,<br />
              <span style={{ color: "#F59E0B" }}>공실뉴스</span>와 함께하세요
            </h1>
            <p className="pc-hero-desc">
              공실 지도, 공동중개망, AI 교육 특강까지 모든 정보가 평생 조건 없이 100% 무료로 제공됩니다.
            </p>

            {/* Tab Switcher */}
            <div className="pc-tab-container">
              <button className={`pc-tab-btn ${activeTab === "broker" ? "active" : ""}`} onClick={() => setActiveTab("broker")}>
                💼 공인중개사 회원
              </button>
              <button className={`pc-tab-btn ${activeTab === "landlord" ? "active" : ""}`} onClick={() => setActiveTab("landlord")}>
                🏠 임대인/일반 회원
              </button>
            </div>

            {/* Quick Input Form */}
            <form className="pc-quick-signup-form" onSubmit={handleQuickSignup}>
              <input 
                type="email" 
                placeholder="이메일을 입력해 빠르게 시작" 
                className="pc-quick-signup-input"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                required
              />
              <button type="submit" className="pc-quick-signup-btn">지금 가입하기</button>
            </form>
          </div>
        </section>

        {/* ===== Stats ===== */}
        <div className="pc-stats-outer">
          <div className="pc-stats-container">
            {currentStats.map((s, i) => (
              <div key={i} className="pc-stat-card">
                <div className="pc-stat-label">{s.label}</div>
                <div className="pc-stat-val">{s.value}</div>
                <div className="pc-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Features ===== */}
        <section className="pc-features-sec">
          <div className="pc-sec-header">
            <h2 className="pc-sec-title">주요 혜택 안내</h2>
            <p className="pc-sec-desc">성공적인 비즈니스를 지원하기 위한 맞춤 서비스입니다.</p>
          </div>

          <div className="pc-features-grid">
            {currentFeatures.map((f, i) => (
              <div key={i} className="pc-feature-card">
                <div className="pc-feature-icon-wrap" style={{ background: `${f.color}10`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="pc-feature-title">{f.title}</h3>
                <p className="pc-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Comparison Table ===== */}
        <section className="pc-comp-sec">
          <h2 className="pc-sec-title">기존 플랫폼과의 차이</h2>
          <p className="pc-sec-desc">공실뉴스만의 합리적인 차별점을 직접 확인해보세요.</p>
          
          <div className="pc-comp-table-wrapper">
            <table className="pc-comp-table">
              <thead>
                <tr>
                  <th style={{ width: "34%" }}>구분</th>
                  <th style={{ width: "33%" }}>기존 유료망</th>
                  <th style={{ width: "33%", color: "#3f37c9" }} className="pc-comp-highlight">공실뉴스</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, textAlign: "left", paddingLeft: "30px" }}>{row.feature}</td>
                    <td style={{ color: "#64748b" }}>{row.legacy}</td>
                    <td className="pc-comp-highlight">{row.gongsil}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="pc-faq-sec">
          <h2 className="pc-sec-title" style={{ textAlign: "center" }}>자주 묻는 질문</h2>
          <div className="pc-faq-container">
            {faqs.map((faq, i) => (
              <div key={i} className="pc-faq-card" style={{ borderColor: openFaq === i ? "#3f37c9" : "#e2e8f0" }}>
                <button className="pc-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </button>
                {openFaq === i && (
                  <div className="pc-faq-a">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="pc-cta-sec">
          <PlayLogo size={56} />
          <h2 className="pc-cta-title">부동산 상생 네트워크,<br />공실뉴스에 동참하세요.</h2>
          <p className="pc-cta-desc">가입비 및 수수료 없이 강력한 정보 혜택을 제공받으실 수 있습니다.</p>
          <button className="pc-cta-btn" onClick={() => setIsAuthModalOpen(true)}>
            무료 회원가입 바로가기
          </button>
        </section>
      </div>
    </>
  );
}

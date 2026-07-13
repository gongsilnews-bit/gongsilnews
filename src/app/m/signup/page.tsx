"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <circle cx="12" cy="12" r="12" fill="#e11d48" />
    <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WarnIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="12" fill="#ef4444" fillOpacity="0.1" />
    <path d="M8 8l8 8M16 8l-8 8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const brokerStats = [
  { label: "전국 가입 부동산", value: "11만+", sub: "대규모 네트워크 인프라" },
  { label: "공동중개 매물 공유", value: "실시간 조회", sub: "지도 기반 편리한 확인" },
  { label: "전국 경/공매 정보", value: "평생 무료", sub: "권리분석/뉴스 무료 열람" },
];

const brokerFaqs = [
  {
    q: "공동중개 물건 등록은 정말 무료인가요?",
    a: "네, 그렇습니다. 공실뉴스에서는 부동산 회원님들이 공동중개 물건을 2건까지 평생 아무런 비용 없이 무료로 등록하고 관리하실 수 있도록 지원합니다.",
  },
  {
    q: "타 사이트 및 지역 공동중개망과의 가장 큰 차이점은 무엇인가요?",
    a: "타사 공실 사이트는 높은 월정액을 요구하고, 기존 지역 공동중개 사이트(친목회 등)는 텃세와 카르텔로 신규 가입을 제한하거나 수백만 원의 가입비를 요구합니다. 반면 공실뉴스는 가입 제한 장벽이 전혀 없으며, 전국 11만 중개망을 평생 무료로 활용할 수 있습니다. 또한 지역의 상세 공실 소식과 전문 부동산 뉴스까지 무료 개방하여 중개사님들의 정착을 지원합니다.",
  },
  {
    q: "지역 공실 뉴스와 부동산 기사는 어떻게 열람하나요?",
    a: "부동산 회원으로 가입 승인이 완료되면 별도의 추가 비용 없이, 관심 지역을 설정하여 해당 지역의 실시간 공실 뉴스와 전문적인 부동산 시장 분석 기사를 상시 무료로 편하게 열람하실 수 있습니다.",
  },
  {
    q: "스마트폰 모바일이나 외부 현장에서도 지도 열람이 가능한가요?",
    a: "네, 스마트폰 모바일 화면에 최적화되어 있으므로, 야외 현장에 나가 계시더라도 실시간 지도 기반으로 주변 공동중개 물건을 즉시 검색하고 중개사 연락처를 확인하실 수 있습니다.",
  },
  {
    q: "경매/공매 정보는 신뢰할 수 있나요?",
    a: "공실뉴스에서 제공하는 경매 및 공매 데이터는 법원 및 한국자산관리공사의 공식 정보를 실시간 연동하여 제공하므로 신뢰도가 높으며, 권리분석 및 최신 진행 상황 정보도 모두 무료로 투명하게 공개됩니다.",
  },
];

export default function MobileSignupPage() {
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            background: radial-gradient(circle at top right, #311019 0%, #0f172a 65%, #020617 100%);
            padding: 50px 16px 80px;
            text-align: center;
            position: relative;
            overflow: hidden;
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

          /* ===== Pricing Section ===== */
          .m-pricing-sec {
            padding: 0 16px 40px;
            margin-top: -40px;
            position: relative;
            z-index: 10;
          }
          .m-pricing-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-width: 480px;
            margin: 0 auto;
          }
          .m-pricing-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 36px 24px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
            border: 2px solid #f1f5f9;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          .m-pricing-card.premium {
            border-color: #fca5a5;
            background: linear-gradient(180deg, #ffffff 0%, #fffcfc 100%);
          }
          .m-pricing-card.premium::before {
            content: "강력 추천";
            position: absolute;
            top: -12px;
            right: 24px;
            background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 12px;
            border-radius: 99px;
            box-shadow: 0 4px 10px rgba(225, 29, 72, 0.25);
          }
          .m-price-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 10px;
            border-radius: 6px;
            margin-bottom: 16px;
            width: fit-content;
          }
          .m-price-badge.free {
            background: #ffe4e6;
            color: #e11d48;
          }
          .m-price-badge.legacy-badge {
            background: #f1f5f9;
            color: #64748b;
          }
          .m-pricing-card-title {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 6px;
            text-align: left;
          }
          .m-pricing-card-sub {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 20px;
            line-height: 1.4;
            text-align: left;
            min-height: 40px;
          }
          .m-pricing-card-price {
            font-size: 28px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 20px;
            display: flex;
            align-items: baseline;
            gap: 4px;
          }
          .m-pricing-card-price span {
            font-size: 13px;
            color: #64748b;
            font-weight: 500;
          }
          .m-pricing-card-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 0 0 20px;
          }
          .m-pricing-card-features {
            list-style: none;
            padding: 0;
            margin: 0 0 28px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex-grow: 1;
          }
          .m-pricing-card-feature-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 13.5px;
            color: #334155;
            line-height: 1.4;
            text-align: left;
          }
          .m-pricing-card-btn {
            width: 100%;
            border: none;
            border-radius: 12px;
            padding: 14px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .m-pricing-card-btn.legacy-btn {
            background: #f1f5f9;
            color: #94a3b8;
            cursor: not-allowed;
          }
          .m-pricing-card-btn.free-btn {
            background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(225, 29, 72, 0.2);
          }

          /* ===== Stats ===== */
          .m-stats-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 0 16px;
            margin-bottom: 30px;
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
          .m-stat-val { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
          .m-stat-sub { font-size: 11px; color: #94a3b8; }

          /* ===== Detail Rows (Mobile Style) ===== */
          .m-detail-sec {
            padding: 50px 16px;
            background: #ffffff;
          }
          .m-detail-rows {
            display: flex;
            flex-direction: column;
            gap: 48px;
            margin-top: 30px;
          }
          .m-detail-row {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .m-detail-img-wrap {
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            border: 1px solid #f1f5f9;
            background: #f8fafc;
          }
          .m-detail-img-wrap img {
            width: 100%;
            height: auto;
            display: block;
          }
          .m-detail-text-wrap {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 0 4px;
          }
          .m-detail-sub {
            font-size: 12.5px;
            font-weight: 800;
            color: #e11d48;
          }
          .m-detail-row-title {
            font-size: 19px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.35;
            margin: 0;
            word-break: keep-all;
          }
          .m-detail-row-desc {
            font-size: 13.5px;
            color: #475569;
            line-height: 1.6;
            margin: 4px 0 0;
            word-break: keep-all;
          }

          /* ===== Mobile Recommendations Section ===== */
          .m-recom-sec {
            padding: 50px 16px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
          }
          .m-recom-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-top: 24px;
          }
          .m-recom-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 24px 20px;
            border: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.01);
          }
          .m-recom-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
            margin-bottom: 16px;
          }
          .m-recom-title {
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 2px;
          }
          .m-recom-sub {
            font-size: 13px;
            color: #e11d48;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .m-recom-desc {
            font-size: 13.5px;
            color: #475569;
            line-height: 1.5;
            margin: 0;
            word-break: keep-all;
          }

          /* ===== FAQ ===== */
          .m-faq-sec {
            padding: 50px 16px;
            background: #ffffff;
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
          .m-faq-card.active-border {
            border-color: #e11d48 !important;
          }

          /* ===== CTA ===== */
          .m-cta-sec {
            padding: 60px 16px;
            background: radial-gradient(circle at bottom right, #311019 0%, #020617 100%);
            text-align: center;
          }
          .m-cta-title {
            font-size: 22px; font-weight: 900; color: #ffffff; line-height: 1.35;
            margin: 16px 0 10px; letter-spacing: -0.5px;
          }
          .m-cta-desc {
            font-size: 13px; color: #94a3b8; margin: 0 0 24px;
          }
          .m-cta-btn-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
            max-width: 280px;
            margin: 0 auto;
          }
          .m-cta-main-btn {
            background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 15px;
            font-size: 15px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 6px 16px rgba(225, 29, 72, 0.35);
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
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('signup_member_type', 'broker');
                }
                setIsAuthModalOpen(true);
              }} 
              style={{ background: '#e11d48', color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}
            >
              무료 가입
            </button>
          </div>
        </header>

        {/* ===== Hero ===== */}
        <section 
          className="m-signup-hero"
          style={{
            background: "radial-gradient(circle at top right, #311019 0%, #0f172a 65%, #020617 100%)",
            padding: "50px 16px 80px"
          }}
        >
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <div className="m-hero-badge">
              🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 부동산 공실뉴스
            </div>
            <h1 className="m-hero-title">
              공실을 뉴스로 전달하다!
            </h1>
            <p className="m-hero-desc">
              내 지역/단지 공실홍보 및 유튜브 채널 운영을 꾸준히 할 수 있습니다.
            </p>
          </div>
        </section>


        {/* ===== Stats ===== */}
        <div style={{ background: "#ffffff" }}>
          <div className="m-stats-container">
            {brokerStats.map((s, i) => (
              <div key={i} className="m-stat-card">
                <div className="m-stat-label">{s.label}</div>
                <div className="m-stat-val">{s.value}</div>
                <div className="m-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Detail Rows (Mobile Landing Page Style) ===== */}
        <section className="m-detail-sec">
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.5px" }}>부동산회원 상세 혜택</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>중개사님의 성공적인 파트너로서 제공하는 핵심 솔루션입니다.</p>
          </div>

          <div className="m-detail-rows">
            {/* Row 1 */}
            <div className="m-detail-row">
              <div className="m-detail-img-wrap">
                <img src="/signup_map.png" alt="공동중개 지도 검색" />
              </div>
              <div className="m-detail-text-wrap">
                <span className="m-detail-sub">01. 네트워크 한계가 없는 공동중개</span>
                <h3 className="m-detail-row-title">전국 11만 개업 중개사망 연동 공동중개 매물 실시간 무제한 무료 열람</h3>
                <p className="m-detail-row-desc">
                  가입 승인 즉시 평생 무료로 타 중개업소들이 등록한 방대한 매물을 지도 기반으로 검색하고 즉시 공동중개를 매칭할 수 있습니다. 물건 등록 역시 2건까지 평생 무료로 지원하여 신규 개업 중개사님들의 정착을 확실하게 돕습니다.
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="m-detail-row">
              <div className="m-detail-img-wrap">
                <img src="/signup_news.png" alt="지역 공실 뉴스" />
              </div>
              <div className="m-detail-text-wrap">
                <span className="m-detail-sub">02. 지역 밀착형 실시간 부동산 정보</span>
                <h3 className="m-detail-row-title">관심 지역의 핵심 공실 속보와 정부 규제 정책 실시간 무료 구독</h3>
                <p className="m-detail-row-desc">
                  성공적인 중개 영업은 한발 앞선 정보에서 시작됩니다. 관심 지역을 설정하면 해당 지역의 실시간 공실 뉴스와 최신 부동산 법률·시장 트렌드 분석 기사를 상시 제한 없이 무료로 받아보실 수 있습니다.
                </p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="m-detail-row">
              <div className="m-detail-img-wrap">
                <img src="/signup_auction.png" alt="법원 경공매 정보" />
              </div>
              <div className="m-detail-text-wrap">
                <span className="m-detail-sub">03. 경매·공매 권리분석 무료 제공</span>
                <h3 className="m-detail-row-title">고가의 구독료 지불 없이 전국 법원 경/공매 정보 실시간 무료 조회</h3>
                <p className="m-detail-row-desc">
                  매달 고가의 월정액을 내야만 열람할 수 있었던 전국 법원의 경매 및 캠코 공매 정보를 무제한 무료로 제공합니다. 지도 기반 매물 위치와 상세 매각 기일, 정밀한 권리분석 정보까지 투명하게 공개됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Recommendations Section ===== */}
        <section className="m-recom-sec">
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.5px" }}>실제 가입 중개사님이 추천합니다!</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>전국 수많은 부동산 회원사들이 전하는 솔직한 이용 후기입니다.</p>
          </div>
          
          <div className="m-recom-grid">
            {/* Card 1 */}
            <div className="m-recom-card">
              <img className="m-recom-avatar" src="/signup_broker1.png" alt="대박 공인중개사사무소" />
              <h4 className="m-recom-title">대박 공인중개사사무소</h4>
              <span className="m-recom-sub">김대박 소장 (서울 강남구)</span>
              <p className="m-recom-desc">
                "매월 15만 원씩 나가던 사설 공실 사이트 비용을 아끼고 공실뉴스로 완전히 정착했습니다. 지도 검색 기능도 직관적이고 매칭 속도가 아주 빠릅니다."
              </p>
            </div>

            {/* Card 2 */}
            <div className="m-recom-card">
              <img className="m-recom-avatar" src="/signup_broker2.png" alt="골드밸리 공인중개사사무소" />
              <h4 className="m-recom-title">골드밸리 공인중개사사무소</h4>
              <span className="m-recom-sub">이밸리 소장 (경기 분당)</span>
              <p className="m-recom-desc">
                "지역 친목회 카르텔 텃세에 고민이 많았는데, 공실뉴스는 가입 장벽 없이 전국 11만 부동산망과 자유롭게 공동중개할 수 있어서 영업 활로가 뚫렸습니다."
              </p>
            </div>

            {/* Card 3 */}
            <div className="m-recom-card">
              <img className="m-recom-avatar" src="/signup_broker3.png" alt="에이스 공인중개사사무소" />
              <h4 className="m-recom-title">에이스 공인중개사사무소</h4>
              <span className="m-recom-sub">박에이스 소장 (부산 해운대)</span>
              <p className="m-recom-desc">
                "매월 고가의 비용을 지불하던 경공매 정보를 실시간 무료로 보니 부담이 없고, 관심 지역 공실 뉴스 알림 덕분에 매일 고객 관리가 수월해졌습니다."
              </p>
            </div>
          </div>
        </section>

        {/* ===== Pricing Section ===== */}
        <section className="m-pricing-sec">
          <div className="m-pricing-grid">
            {/* Card 1: Free Realtor Member */}
            <div className="m-pricing-card">
              <span className="m-price-badge free" style={{ background: "#e0f2fe", color: "#0284c7" }}>100% 무료</span>
              <h3 className="m-pricing-card-title">부동산회원</h3>
              <p className="m-pricing-card-sub">가입비부터 월정액 이용료까지 평생 단 1원도 들지 않는 기본 회원</p>
              
              <div className="m-pricing-card-divider" />
              
              <ul className="m-pricing-card-features">
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>가입 승인 즉시 평생 100% 무료 제공</strong>
                </li>
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>공동중개 물건 등록 2건 무료</strong>
                </li>
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>공동중개 물건 무제한 무료 열람</strong>
                </li>
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>모바일 지도 기반 실시간 매물 검색 지원</strong>
                </li>
              </ul>
              
              <div className="m-pricing-card-price" style={{ marginTop: 12 }}>
                0원 <span>/ 평생 무료</span>
              </div>
              
              <button 
                className="m-pricing-card-btn free-btn"
                style={{ background: "#0284c7", boxShadow: "0 8px 20px rgba(2, 132, 199, 0.3)" }}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('signup_member_type', 'broker');
                  }
                  setIsAuthModalOpen(true);
                }}
              >
                무료 회원가입 바로가기
              </button>
            </div>

            {/* Card 2: Gongsilnews Realtor (MIDDLE PREMIUM) */}
            <div className="m-pricing-card premium">
              <span className="m-price-badge free">강력 추천</span>
              <h3 className="m-pricing-card-title">공실뉴스부동산</h3>
              <p className="m-pricing-card-sub">단지 및 지역의 대표 부동산 권한과 스마트 AI 유튜브 매물 마케팅 솔루션</p>
              
              <div className="m-pricing-card-divider" />
              
              <ul className="m-pricing-card-features">
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[유튜브/홍보] 유튜브 스마트 홍보 & 브리핑 카드 지원</strong>
                </li>
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[AI 솔루션] 1초 완성 'AI 물건보고서' 무제한 생성</strong>
                </li>
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[독점 권한] 주력 단지 상단 '공식 파트너' 우선 단독 노출</strong>
                </li>
                <li className="m-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[매물 확보] 포털 뉴스 기사 송출권을 통한 전속 확보</strong>
                </li>
              </ul>
              
              <div className="m-pricing-card-price" style={{ color: "#e11d48", marginTop: 12 }}>
                30,000원 <span>/ 월 (VAT 별도)</span>
              </div>
              
              <button 
                className="m-pricing-card-btn free-btn"
                onClick={() => {
                  router.push('/m/newsrealty');
                }}
              >
                공실뉴스부동산 신청하기
              </button>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="m-faq-sec">
          <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 20px" }}>자주 묻는 질문</h2>
          {brokerFaqs.map((faq, i) => (
            <div key={i} className={`m-faq-card ${openFaq === i ? 'active-border' : ''}`}>
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
        <section 
          className="m-cta-sec"
          style={{
            background: "radial-gradient(circle at bottom right, #311019 0%, #020617 100%)"
          }}
        >
          <PlayLogo size={44} />
          <h2 className="m-cta-title">11만 부동산을 위한 무료 정보 채널, 공실뉴스</h2>
          <p className="m-cta-desc">매월 부과되던 비싼 고정비 회비를 아끼고 스마트한 중개 비즈니스를 시작해 보세요.</p>
          <div className="m-cta-btn-wrapper">
            <button 
              className="m-cta-main-btn" 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('signup_member_type', 'broker');
                }
                setIsAuthModalOpen(true);
              }}
            >
              지금 무료로 가입하기
            </button>
          </div>
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

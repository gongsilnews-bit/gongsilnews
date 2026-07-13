"use client";

import React, { useState } from "react";
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
    q: "공실뉴스는 정말 평생 무료인가요?",
    a: "네, 그렇습니다. 부동산회원 서비스는 가입비, 연회비, 월정액 이용료가 전혀 없는 100% 무료 서비스입니다. 타사 공실 사이트들의 월 10만원 이상 고정 회비 부담에서 벗어나 무료로 공동중개를 활성화하세요.",
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

export default function SignupPage() {
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            background: radial-gradient(circle at top right, #311019 0%, #0f172a 65%, #020617 100%);
            padding: 100px 20px 160px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .hero-inner {
            max-width: 800px;
            margin: 0 auto;
            position: relative;
            z-index: 2;
          }
          .pc-hero-badge {
            display: inline-flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 8px 18px;
            border-radius: 50px;
            font-size: 13px;
            color: #ffffff;
            margin-bottom: 24px;
            letter-spacing: -0.2px;
          }
          .pc-hero-title {
            font-size: 44px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.3;
            margin: 0 0 20px;
            letter-spacing: -1.5px;
          }
          .pc-hero-desc {
            font-size: 17px;
            color: #94a3b8;
            line-height: 1.7;
            margin: 0;
            word-break: keep-all;
          }

          /* ===== Pricing Grid Section ===== */
          .pc-pricing-sec {
            max-width: 1200px;
            margin: -80px auto 0;
            padding: 0 20px;
            position: relative;
            z-index: 10;
          }
          .pc-pricing-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
          .pc-pricing-card {
            background: #ffffff;
            border-radius: 28px;
            padding: 40px 30px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
            border: 2px solid #f1f5f9;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: all 0.3s ease;
          }
          .pc-pricing-card.premium {
            border-color: #fca5a5;
            background: linear-gradient(180deg, #ffffff 0%, #fffcfc 100%);
            box-shadow: 0 15px 50px rgba(225, 29, 72, 0.08);
            transform: scale(1.03);
            z-index: 2;
          }
          .pc-pricing-card.premium::before {
            content: "강력 추천";
            position: absolute;
            top: -14px;
            right: 30px;
            background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 5px 14px;
            border-radius: 99px;
            box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
          }
          .pc-price-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            width: fit-content;
          }
          .pc-price-badge.free {
            background: #ffe4e6;
            color: #e11d48;
          }
          .pc-price-badge.legacy-badge {
            background: #f1f5f9;
            color: #64748b;
          }
          .pc-pricing-card-title {
            font-size: 21px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 10px;
            letter-spacing: -0.5px;
          }
          .pc-pricing-card-sub {
            font-size: 13.5px;
            color: #64748b;
            margin: 0 0 24px;
            line-height: 1.5;
            min-height: 60px;
          }
          .pc-pricing-card-price {
            font-size: 32px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 24px;
            display: flex;
            align-items: baseline;
            gap: 4px;
          }
          .pc-pricing-card-price span {
            font-size: 14px;
            color: #64748b;
            font-weight: 600;
          }
          .pc-pricing-card-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 0 0 24px;
          }
          .pc-pricing-card-features {
            list-style: none;
            padding: 0;
            margin: 0 0 32px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            flex-grow: 1;
          }
          .pc-pricing-card-feature-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 14px;
            color: #334155;
            line-height: 1.4;
          }
          .pc-pricing-card-btn {
            width: 100%;
            border: none;
            border-radius: 12px;
            padding: 15px;
            font-size: 14.5px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .pc-pricing-card-btn.legacy-btn {
            background: #f1f5f9;
            color: #94a3b8;
            cursor: not-allowed;
          }
          .pc-pricing-card-btn.free-btn {
            background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
            color: #ffffff;
            box-shadow: 0 6px 20px rgba(225, 29, 72, 0.25);
          }
          .pc-pricing-card-btn.free-btn:hover {
            transform: translateY(-2px);
            filter: brightness(1.05);
            box-shadow: 0 8px 24px rgba(225, 29, 72, 0.35);
          }
          .pc-pricing-card-btn.free-btn:active {
            transform: translateY(0);
          }

          /* ===== Stats ===== */
          .pc-stats-outer {
            margin-top: 80px;
            background: #f8fafc;
            padding: 60px 20px;
            border-top: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
          }
          .pc-stats-container {
            max-width: 1000px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
          .pc-stat-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 30px 20px;
            text-align: center;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 10px rgba(0,0,0,0.01);
          }
          .pc-stat-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .pc-stat-val {
            font-size: 32px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 6px;
            letter-spacing: -0.5px;
          }
          .pc-stat-sub {
            font-size: 13px;
            color: #94a3b8;
          }

          /* ===== Detail Rows (Landing Page Style) ===== */
          .pc-detail-sec {
            max-width: 1100px;
            margin: 0 auto;
            padding: 80px 20px;
          }
          .pc-sec-header {
            text-align: center;
            margin-bottom: 60px;
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
          .pc-detail-rows {
            display: flex;
            flex-direction: column;
            gap: 80px;
          }
          .pc-detail-row {
            display: flex;
            align-items: center;
            gap: 60px;
          }
          .pc-detail-row.reverse {
            flex-direction: row-reverse;
          }
          .pc-detail-img-wrap {
            flex: 1.1;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
            border: 1px solid #f1f5f9;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .pc-detail-img-wrap img {
            width: 100%;
            height: auto;
            display: block;
            object-fit: cover;
            transition: transform 0.5s ease;
          }
          .pc-detail-img-wrap:hover img {
            transform: scale(1.02);
          }
          .pc-detail-text-wrap {
            flex: 0.9;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .pc-detail-sub {
            font-size: 13.5px;
            font-weight: 800;
            color: #e11d48;
            letter-spacing: 0.5px;
          }
          .pc-detail-row-title {
            font-size: 26px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.35;
            letter-spacing: -1px;
            margin: 0;
          }
          .pc-detail-row-desc {
            font-size: 15px;
            color: #475569;
            line-height: 1.7;
            margin: 8px 0 0;
            word-break: keep-all;
          }

          /* ===== Recommendations Section ===== */
          .pc-recom-sec {
            background: #f8fafc;
            padding: 80px 20px;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
          }
          .pc-recom-container {
            max-width: 1100px;
            margin: 0 auto;
          }
          .pc-recom-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 28px;
            margin-top: 40px;
          }
          .pc-recom-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 36px 30px;
            border: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01);
          }
          .pc-recom-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 30px rgba(225, 29, 72, 0.08);
            border-color: #fca5a5;
          }
          .pc-recom-avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #ffffff;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
          }
          .pc-recom-title {
            font-size: 19px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 4px;
          }
          .pc-recom-sub {
            font-size: 13.5px;
            color: #e11d48;
            font-weight: 800;
            margin-bottom: 18px;
          }
          .pc-recom-desc {
            font-size: 14.5px;
            color: #475569;
            line-height: 1.6;
            margin: 0;
            word-break: keep-all;
          }

          /* ===== FAQ ===== */
          .pc-faq-sec {
            background: #ffffff;
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
          .pc-faq-card.active-border {
            border-color: #e11d48 !important;
          }

          /* ===== CTA Section ===== */
          .pc-cta-sec {
            max-width: 1000px;
            margin: 80px auto 0;
            border-radius: 30px;
            padding: 80px 40px;
            background: radial-gradient(circle at bottom right, #311019 0%, #020617 100%);
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
          
          /* ===== Quick CTA Button ===== */
          .pc-hero-cta-btn {
            color: #ffffff;
            border: none;
            border-radius: 14px;
            padding: 18px 64px;
            font-size: 18px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
            box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4);
          }
          .pc-hero-cta-btn:hover {
            transform: translateY(-3px);
            filter: brightness(1.08);
            box-shadow: 0 14px 30px rgba(225, 29, 72, 0.5);
          }
          .pc-hero-cta-btn:active {
            transform: translateY(-1px);
          }
        `}</style>

        {/* ===== Hero Section ===== */}
        <section className="pc-signup-hero">
          <div className="hero-inner">
            <div className="pc-hero-badge">
              🏢 전국 <strong style={{ color: "#F59E0B", marginLeft: "4px", marginRight: "4px" }}>11만</strong> 부동산이 함께하는 공실뉴스
            </div>
            <h1 className="pc-hero-title">
              공실을 뉴스로 전달하다!
            </h1>
            <p className="pc-hero-desc">
              내 지역/단지 공실홍보 및 유튜브 채널 운영을 꾸준히 할 수 있습니다.
            </p>
          </div>
        </section>


        {/* ===== Stats ===== */}
        <div className="pc-stats-outer">
          <div className="pc-stats-container">
            {brokerStats.map((s, i) => (
              <div key={i} className="pc-stat-card">
                <div className="pc-stat-label">{s.label}</div>
                <div className="pc-stat-val">{s.value}</div>
                <div className="pc-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Detail Rows (Landing Page Style) ===== */}
        <section className="pc-detail-sec">
          <div className="pc-sec-header">
            <h2 className="pc-sec-title">부동산회원 상세 혜택</h2>
            <p className="pc-sec-desc">중개사님의 성공적인 파트너로서 제공하는 핵심 솔루션입니다.</p>
          </div>
          
          <div className="pc-detail-rows">
            {/* Row 1 */}
            <div className="pc-detail-row">
              <div className="pc-detail-img-wrap">
                <img src="/signup_map.png" alt="유튜브 매물 홍보 자동화" />
              </div>
              <div className="pc-detail-text-wrap">
                <span className="pc-detail-sub">01. 유튜브 매물 홍보 자동화 솔루션</span>
                <h3 className="pc-detail-row-title">원클릭 유튜브 매물 스마트 홍보 &<br/>자동 동영상 브리핑 카드 지원</h3>
                <p className="pc-detail-row-desc">
                  등록한 매물 정보를 기반으로 전문적인 동영상 브리핑 카드와 쇼츠 콘텐츠를 자동으로 생성하고 유튜브 채널에 간편하게 연동하여 꾸준한 채널 마케팅과 매물 노출을 성공시킵니다.
                </p>
              </div>
            </div>

            {/* Row 2 (Alternated) */}
            <div className="pc-detail-row reverse">
              <div className="pc-detail-img-wrap">
                <img src="/signup_news.png" alt="AI 물건/매매 보고서 생성" />
              </div>
              <div className="pc-detail-text-wrap">
                <span className="pc-detail-sub">02. 1초 완성 AI 솔루션</span>
                <h3 className="pc-detail-row-title">AI 물건/매매 보고서 무제한 생성으로<br/>고객 상담 신뢰도 및 계약 전환율 상승</h3>
                <p className="pc-detail-row-desc">
                  지번만 입력하면 1초 만에 깔끔하고 세련된 디자인의 AI 부동산 보고서 PDF를 생성합니다. 권리 분석, 시세 추이, 매물 특징 등 복잡한 정보를 직관적으로 정리해 즉시 브리핑할 수 있습니다.
                </p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="pc-detail-row">
              <div className="pc-detail-img-wrap">
                <img src="/signup_auction.png" alt="공식 파트너 독점 권한" />
              </div>
              <div className="pc-detail-text-wrap">
                <span className="pc-detail-sub">03. 공식 파트너 독점 권한</span>
                <h3 className="pc-detail-row-title">아파트 대단지 및 주력 지역 상단 노출과<br/>포털 뉴스 기사 송출권을 활용한 전속 매물 확보</h3>
                <p className="pc-detail-row-desc">
                  해당 단지 및 행정구역의 '공식 파트너 부동산' 자격을 선점하여 상단 검색에 단독 노출됩니다. 또한 본사 포털 뉴스 기사 송출권을 지원받아 소유주들의 신뢰를 얻고 전속 매물을 독점으로 확보할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Recommendations Section ===== */}
        <section className="pc-recom-sec">
          <div className="pc-recom-container">
            <div className="pc-sec-header">
              <h2 className="pc-sec-title">실제 가입 중개사님이 강력 추천합니다!</h2>
              <p className="pc-sec-desc">전국 수많은 개업 중개사사무소에서 공실뉴스를 통해 고정 비용을 절감하고 있습니다.</p>
            </div>
            
            <div className="pc-recom-grid">
              {/* Recom Card 1 */}
              <div className="pc-recom-card">
                <img className="pc-recom-avatar" src="/signup_broker1.png" alt="대박 공인중개사사무소" />
                <h4 className="pc-recom-title">대박 공인중개사사무소</h4>
                <span className="pc-recom-sub">김대박 소장 (서울 강남구)</span>
                <p className="pc-recom-desc">
                  "매월 15만 원씩 나가던 사설 공실 사이트 비용을 아끼고 공실뉴스로 완전히 정착했습니다. 지도 검색 기능도 직관적이고 매칭 속도가 아주 빠릅니다."
                </p>
              </div>

              {/* Recom Card 2 */}
              <div className="pc-recom-card">
                <img className="pc-recom-avatar" src="/signup_broker2.png" alt="골드밸리 공인중개사사무소" />
                <h4 className="pc-recom-title">골드밸리 공인중개사사무소</h4>
                <span className="pc-recom-sub">이밸리 소장 (경기 분당)</span>
                <p className="pc-recom-desc">
                  "지역 친목회 카르텔 텃세에 고민이 많았는데, 공실뉴스는 가입 장벽 없이 전국 11만 부동산망과 자유롭게 공동중개할 수 있어서 영업 활로가 뚫렸습니다."
                </p>
              </div>

              {/* Recom Card 3 */}
              <div className="pc-recom-card">
                <img className="pc-recom-avatar" src="/signup_broker3.png" alt="에이스 공인중개사사무소" />
                <h4 className="pc-recom-title">에이스 공인중개사사무소</h4>
                <span className="pc-recom-sub">박에이스 소장 (부산 해운대)</span>
                <p className="pc-recom-desc">
                  "매월 고가의 비용을 지불하던 경공매 정보를 실시간 무료로 보니 부담이 없고, 관심 지역 공실 뉴스 알림 덕분에 매일 고객 관리가 수월해졌습니다."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="pc-faq-sec">
          <h2 className="pc-sec-title" style={{ textAlign: "center" }}>자주 묻는 질문</h2>
          <div className="pc-faq-container">
            {brokerFaqs.map((faq, i) => (
              <div key={i} className={`pc-faq-card ${openFaq === i ? 'active-border' : ''}`}>
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

        {/* ===== Pricing Section ===== */}
        <section className="pc-pricing-sec">
          <div className="pc-pricing-grid">
            {/* Card 1: Free Realtor Member */}
            <div className="pc-pricing-card">
              <span className="pc-price-badge free" style={{ background: "#e0f2fe", color: "#0284c7" }}>100% 무료</span>
              <h3 className="pc-pricing-card-title">부동산회원</h3>
              <p className="pc-pricing-card-sub">가입비부터 월정액 이용료까지 평생 단 1원도 들지 않는 기본 회원</p>
              
              <div className="pc-pricing-card-divider" />
              
              <ul className="pc-pricing-card-features">
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>가입 승인 즉시 평생 100% 무료 제공</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>공동중개 물건 등록 2건 무료</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>공동중개 물건 무제한 무료 열람</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>전국 법원 경매 및 공매 정보 실시간 무료 열람</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>지역별 공실 뉴스 및 부동산 기사 무료 열람</strong>
                </li>
              </ul>
              
              <div className="pc-pricing-card-price" style={{ marginTop: 12 }}>
                0원 <span>/ 평생 무료</span>
              </div>
              
              <button 
                className="pc-pricing-card-btn free-btn"
                style={{ background: "#0284c7", boxShadow: "0 10px 25px rgba(2, 132, 199, 0.3)" }}
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
            <div className="pc-pricing-card premium">
              <span className="pc-price-badge free">강력 추천</span>
              <h3 className="pc-pricing-card-title">공실뉴스부동산</h3>
              <p className="pc-pricing-card-sub">단지 및 지역의 대표 부동산 권한과 스마트 AI 유튜브 매물 마케팅 솔루션</p>
              
              <div className="pc-pricing-card-divider" />
              
              <ul className="pc-pricing-card-features">
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[유튜브/홍보] 유튜브 매물 스마트 홍보 & 브리핑 카드 지원</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[AI 솔루션] 1초 완성 'AI 물건보고서' 무제한 생성</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[독점 권한] 주력 아파트 단지 상단 '공식 파트너' 우선 단독 노출</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>[매물 확보] 포털 뉴스 기사 송출권을 활용한 전속 매물 확보</strong>
                </li>
                <li className="pc-pricing-card-feature-item">
                  <CheckIcon />
                  <strong>부동산회원 혜택 모두 포함</strong>
                </li>
              </ul>
              
              <div className="pc-pricing-card-price" style={{ color: "#e11d48", marginTop: 12 }}>
                30,000원 <span>/ 월 (VAT 별도)</span>
              </div>
              
              <button 
                className="pc-pricing-card-btn free-btn"
                onClick={() => {
                  router.push('/newsrealty');
                }}
              >
                공실뉴스부동산 신청하기
              </button>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section 
          className="pc-cta-sec"
          style={{
            background: "radial-gradient(circle at bottom right, #311019 0%, #020617 100%)"
          }}
        >
          <PlayLogo size={56} />
          <h2 className="pc-cta-title">11만 부동산을 위한 무료 정보 채널, 공실뉴스</h2>
          <p className="pc-cta-desc">가입 제한이나 비싼 회비 부담 없이, 지금 공실뉴스에서 무료로 가입하고 활발하게 교류하세요.</p>
          <button 
            className="pc-hero-cta-btn" 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('signup_member_type', 'broker');
              }
              setIsAuthModalOpen(true);
            }}
          >
            지금 무료로 가입하기
          </button>
        </section>
      </div>
    </>
  );
}

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
  { label: "공동중개 물건 등록", value: "2건 무료", sub: "평생 무료 등록 지원" },
  { label: "가입 부동산 회원", value: "11만+", sub: "전국 부동산 네트워크" },
  { label: "공동중개 매물 열람", value: "부동산 무료", sub: "모바일 지도 기반 열람" },
];

const landlordStats = [
  { label: "매물 평생 등록", value: "2건 무료", sub: "수수료/등록비 0원" },
  { label: "노출 부동산 망", value: "11만+", sub: "전국 부동산 채널" },
  { label: "경/공매 및 기사", value: "평생 무료", sub: "실시간 정보 무료 구독" },
];

const brokerFeatures = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: "공동중개 무료 등록 및 열람\n(2건 평생 무료 등록)",
    desc: "공실뉴스 부동산 회원이 되시면 공동중개 물건을 2건까지 평생 무료로 등록할 수 있으며, 다른 회원들이 올린 공동중개 매물 역시 무료로 편리하게 열람할 수 있습니다.",
    color: "#3f37c9",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
        <path d="M12 6a3 3 0 0 0-3 3c0 2.2 3 5 3 5s3-2.8 3-5a3 3 0 0 0-3-3z" fill="currentColor" fillOpacity="0.1" />
        <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: "모바일 지원 및\n지도 기반 매물 실시간 검색",
    desc: "야외 현장이나 이동 중에도 스마트폰 모바일을 통해 언제 어디서나 지도 기반으로 주변의 공동중개 물건을 한눈에 조회하고 신속하게 확인할 수 있습니다.",
    color: "#4361ee",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <circle cx="11" cy="13" r="3" />
        <line x1="13.5" y1="15.5" x2="18" y2="20" />
      </svg>
    ),
    title: "전국 경매·공매 무료 열람 및\n부동산 정보 기사 무료 구독",
    desc: "별도의 유료 결제 없이 전국 경매 및 공매 물건 상세 정보를 무료로 열람하고, 신뢰성 높은 최신 부동산 정보 뉴스를 매일 무료로 받아보실 수 있습니다.",
    color: "#10b981",
  },
];

const landlordFeatures = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
    title: "내 소중한 매물 무료 등록 및\n중개 의뢰 (2건 평생 무료)",
    desc: "소유하신 상가, 주택 등 소중한 매물 정보를 수수료나 광고 등록비 없이 최대 2건까지 평생 무료로 등록하여 인근의 11만 부동산 회원들에게 중개 의뢰할 수 있습니다.",
    color: "#7209b7",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
        <path d="M12 6a3 3 0 0 0-3 3c0 2.2 3 5 3 5s3-2.8 3-5a3 3 0 0 0-3-3z" fill="currentColor" fillOpacity="0.1" />
        <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: "모바일 및 지도 기반\n편리한 등록 및 관리",
    desc: "모바일 페이지를 통해 밖에서도 스마트폰으로 간편하게 매물 위치를 지도에서 확인하고 매물 상세 정보를 업로드 및 모니터링할 수 있어 관리가 편리합니다.",
    color: "#3f37c9",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <circle cx="11" cy="13" r="3" />
        <line x1="13.5" y1="15.5" x2="18" y2="20" />
      </svg>
    ),
    title: "전국 경매·공매 무료 열람 및\n부동산 정보 기사 무료 구독",
    desc: "전국 경매/공매 진행 물건 정보를 평생 비용 없이 무료로 직접 열람하고, 매일 업데이트되는 부동산 시세 뉴스 및 트렌드 기사를 무료로 구독하실 수 있습니다.",
    color: "#4361ee",
  },
];

const brokerComparisonData = [
  { feature: "가입비 & 고정 이용료", legacy: "가입비 발생 & 매월 10~30만원 지출", gongsil: "평생 100% 무료" },
  { feature: "공동중개 물건 등록", legacy: "매물 건당 추가 광고비 청구", gongsil: "2건 평생 무료 등록" },
  { feature: "공동중개 매물 열람", legacy: "유료 정액제 가입 시 열람", gongsil: "부동산 회원 무료 열람" },
  { feature: "모바일 지도 열람", legacy: "PC 전용이거나 모바일 유료", gongsil: "모바일에서 지도 기반 무료 열람" },
  { feature: "경/공매 및 정보 기사", legacy: "개별 유료 서비스 구독 필요", gongsil: "회원가입 시 평생 무료 제공" },
];

const landlordComparisonData = [
  { feature: "가입비 & 등록 비용", legacy: "가입 승인 대기 & 등록 수수료 청구", gongsil: "평생 100% 무료" },
  { feature: "매물 등록 지원", legacy: "등록 시 건당 비용 발생", gongsil: "2건 평생 무료 등록" },
  { feature: "모바일 지도 매물 관리", legacy: "사용하기 복잡하고 불편함", gongsil: "모바일로 실시간 위치 기반 관리" },
  { feature: "경/공매 및 정보 기사", legacy: "고비용 전문 사이트 결제", gongsil: "회원가입 시 평생 무료 제공" },
  { feature: "부동산 매칭 노출", legacy: "직접 전화 또는 직접 방문", gongsil: "11만 부동산망 실시간 정보 제공" },
];

const brokerFaqs = [
  {
    q: "공동중개 물건 등록은 정말 무료인가요?",
    a: "네, 그렇습니다. 공실뉴스에서는 부동산 회원님들이 공동중개 물건을 2건까지 평생 아무런 비용 없이 무료로 등록하고 관리하실 수 있도록 지원합니다.",
  },
  {
    q: "공동중개 물건 열람 자격과 비용은 어떻게 되나요?",
    a: "정식 개업/소속 공인중개사 등 부동산 회원으로 가입 및 인증이 완료되시면, 다른 중개사들이 공유한 공동중개 매물들을 전면 무료로 무제한 열람하실 수 있습니다.",
  },
  {
    q: "스마트폰 모바일이나 외부 현장에서도 열람이 가능한가요?",
    a: "네, 스마트폰 모바일 화면에 최적화되어 있으므로, 야외 현장에 나가 계시더라도 실시간 지도 기반으로 편리하게 공동중개 물건을 즉시 확인하고 찾아보실 수 있습니다.",
  },
  {
    q: "경매/공매 열람 및 부동산 기사 구독은 정말 무료인가요?",
    a: "네, 회원가입만 하시면 전국 경매·공매 물건 정보 검색 및 유용한 전문 부동산 뉴스 기사 구독 서비스를 별도 요금 없이 평생 무료로 제공받으실 수 있습니다.",
  },
];

const landlordFaqs = [
  {
    q: "일반 회원도 매물 등록이 무료인가요?",
    a: "네, 임대인 및 일반 회원님께서는 보유하신 매물(상가, 주택 등)을 최대 2건까지 평생 수수료나 등록 대행 비용 없이 완전히 무료로 등록하여 의뢰하실 수 있습니다.",
  },
  {
    q: "등록한 매물은 누구에게 보여지고 중개되나요?",
    a: "등록하신 매물은 공실뉴스에 가입된 11만 부동산 회원(공인중개사)들에게 공유되어 신속한 공동중개 매칭 및 거래 계약 성사가 이루어지도록 돕습니다.",
  },
  {
    q: "경매/공매 정보와 부동산 기사는 누구나 무료로 볼 수 있나요?",
    a: "네, 일반 회원으로 가입만 하시면 전국의 모든 경매·공매 물건 정보를 제한 없이 무료 열람하실 수 있으며, 유용한 부동산 뉴스 기사도 무료로 상시 구독하실 수 있습니다.",
  },
];

export default function SignupPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"broker" | "landlord">("broker");
  const [emailInput, setEmailInput] = useState("");

  const currentStats = activeTab === "broker" ? brokerStats : landlordStats;
  const currentFeatures = activeTab === "broker" ? brokerFeatures : landlordFeatures;
  const currentComparison = activeTab === "broker" ? brokerComparisonData : landlordComparisonData;
  const currentFaqs = activeTab === "broker" ? brokerFaqs : landlordFaqs;

  const bottomCtaContent = {
    broker: {
      title: (
        <>
          11만 부동산을 위한 무료 부동산 정보 채널,<br />공실뉴스 부동산이 되세요.
        </>
      ),
      desc: "공동중개 무료 등록/열람, 전국 경공매 무료 열람, 부동산 정보 기사 무료 구독을 지금 시작하세요.",
      buttonText: "무료 회원가입 바로가기",
    },
    landlord: {
      title: (
        <>
          내 매물 등록과 유용한 부동산 정보,<br />공실뉴스 회원으로 해결하세요.
        </>
      ),
      desc: "매물 평생 무료 등록부터 전국 경공매 무료 열람, 부동산 기사 구독까지 편리하게 이용해 보세요.",
      buttonText: "무료 회원가입 바로가기",
    }
  };

  const heroContent = {
    broker: {
      badge: (
        <>
          🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 부동산을 위한 무료 부동산 정보 채널
        </>
      ),
      title: (
        <>
          11만 부동산을 위한 무료 부동산 정보 채널,<br />
          <span style={{ color: "#F59E0B" }}>공실뉴스 부동산</span>이 되세요
        </>
      ),
      desc: "공동중개 무료 등록(2건 평생 무료)/열람, 경매/공매 물건 무료 열람, 부동산 정보 기사 무료 구독 혜택을 제공합니다.",
      placeholder: "",
      buttonText: "무료 회원가입",
    },
    landlord: {
      badge: (
        <>
          🏠 임대인과 일반회원을 위한 무료 부동산 매칭 플랫폼
        </>
      ),
      title: (
        <>
          내 매물 무료 등록 및 정보 열람,<br />
          <span style={{ color: "#f472b6" }}>공실뉴스 회원</span>이 되세요
        </>
      ),
      desc: "매물 평생 무료 등록(2건 평생 무료), 경매/공매 물건 무료 열람, 부동산 정보 기사 무료 구독 혜택을 이용해 보세요.",
      placeholder: "",
      buttonText: "무료 회원가입",
    }
  };

  const handleQuickSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('signup_member_type', activeTab === 'broker' ? 'broker' : 'landlord');
    }
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
            background-size: cover;
            background-position: center;
            z-index: 0;
            pointer-events: none;
            transition: background-image 0.5s ease, opacity 0.5s ease;
          }
          .pc-signup-hero.broker::before {
            background-image: url("/handshake_bg.png");
            opacity: 0.15;
          }
          .pc-signup-hero.landlord::before {
            background-image: url("/landlord_bg.png");
            opacity: 0.25;
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
          }
          .pc-hero-cta-btn.broker {
            background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
            box-shadow: 0 10px 25px rgba(67, 97, 238, 0.4);
          }
          .pc-hero-cta-btn.landlord {
            background: linear-gradient(135deg, #7209b7 0%, #3f37c9 100%);
            box-shadow: 0 10px 25px rgba(114, 9, 183, 0.4);
          }
          .pc-hero-cta-btn:hover {
            transform: translateY(-3px);
            filter: brightness(1.08);
          }
          .pc-hero-cta-btn.broker:hover {
            box-shadow: 0 14px 30px rgba(67, 97, 238, 0.5);
          }
          .pc-hero-cta-btn.landlord:hover {
            box-shadow: 0 14px 30px rgba(114, 9, 183, 0.5);
          }
          .pc-hero-cta-btn:active {
            transform: translateY(-1px);
          }
        `}</style>

        {/* ===== Hero Section ===== */}
        <section 
          className={`pc-signup-hero ${activeTab}`}
          style={{
            background: activeTab === "broker"
              ? "radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 60%, #020617 100%)"
              : "radial-gradient(circle at top right, #2e1042 0%, #0f172a 60%, #020617 100%)",
            transition: "background 0.5s ease"
          }}
        >
          <div className="hero-inner">
            <div className="pc-hero-badge">
              {heroContent[activeTab].badge}
            </div>
            <h1 className="pc-hero-title">
              {heroContent[activeTab].title}
            </h1>
            <p className="pc-hero-desc">
              {heroContent[activeTab].desc}
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

            {/* Large Free Signup Button */}
            <div style={{ marginTop: '10px' }}>
              <button 
                className={`pc-hero-cta-btn ${activeTab}`}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('signup_member_type', activeTab === 'broker' ? 'broker' : 'landlord');
                  }
                  setIsAuthModalOpen(true);
                }}
              >
                무료 회원가입
              </button>
            </div>
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
                <div className="pc-feature-icon-wrap" style={{ background: "transparent", color: f.color }}>
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
                  <th 
                    style={{ 
                      width: "33%", 
                      color: activeTab === "broker" ? "#3f37c9" : "#7209b7" 
                    }} 
                    className="pc-comp-highlight"
                  >
                    공실뉴스
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentComparison.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, textAlign: "left", paddingLeft: "30px" }}>{row.feature}</td>
                    <td style={{ color: "#64748b" }}>{row.legacy}</td>
                    <td 
                      className="pc-comp-highlight"
                      style={{
                        color: activeTab === "broker" ? "#3f37c9" : "#7209b7",
                        background: activeTab === "broker" 
                          ? "rgba(63, 87, 201, 0.03)" 
                          : "rgba(114, 9, 183, 0.03)"
                      }}
                    >
                      {row.gongsil}
                    </td>
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
            {currentFaqs.map((faq, i) => (
              <div key={i} className="pc-faq-card" style={{ borderColor: openFaq === i ? (activeTab === "broker" ? "#3f37c9" : "#7209b7") : "#e2e8f0" }}>
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
        <section 
          className="pc-cta-sec"
          style={{
            background: activeTab === "broker"
              ? "radial-gradient(circle at bottom right, #1e1b4b 0%, #020617 100%)"
              : "radial-gradient(circle at bottom right, #2e1042 0%, #020617 100%)",
            transition: "background 0.5s ease"
          }}
        >
          <PlayLogo size={56} />
          <h2 className="pc-cta-title">{bottomCtaContent[activeTab].title}</h2>
          <p className="pc-cta-desc">{bottomCtaContent[activeTab].desc}</p>
          <button 
            className={`pc-hero-cta-btn ${activeTab}`} 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('signup_member_type', activeTab === 'broker' ? 'broker' : 'landlord');
              }
              setIsAuthModalOpen(true);
            }}
          >
            {bottomCtaContent[activeTab].buttonText}
          </button>
        </section>
      </div>
    </>
  );
}

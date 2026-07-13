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

const brokerComparisonData = [
  { feature: "가입비 & 가입 절차", legacy: "가입비 발생 & 승인 대기", gongsil: "100% 무료 & 즉시 가입/승인" },
  { feature: "월 고정 이용료", legacy: "매월 10~30만원 지출", gongsil: "평생 0원 (수수료 제로)" },
  { feature: "공동중개 광고망", legacy: "광고 건당 추가 비용 발생", gongsil: "무제한 등록 & 무료 노출" },
  { feature: "중개 실무 교육/특강", legacy: "유료 아카데미 결제", gongsil: "전문가 특강 전면 무료" },
  { feature: "매물 매칭 지원", legacy: "수동 검색 및 직접 연락", gongsil: "AI 실시간 추천 및 자동 매칭" },
];

const landlordComparisonData = [
  { feature: "공실 등록 수수료", legacy: "등록 대행 수수료 청구", gongsil: "평생 0원 (100% 무료)" },
  { feature: "중개망 동시 노출", legacy: "직접 여러 부동산 방문", gongsil: "클릭 한 번으로 11만 중개업소 동시 노출" },
  { feature: "매물 홍보 콘텐츠 지원", legacy: "본인 촬영 또는 유료 대행", gongsil: "드론 촬영 및 무료 매물 홍보물 지원" },
  { feature: "공실 해결 속도", legacy: "평균 1~3개월 소요", gongsil: "매칭 알고리즘으로 즉각적인 거래 중개" },
  { feature: "지역 시세 리포트", legacy: "유료 리포트 구매 필요", gongsil: "지역 실거래 시세 리포트 상시 무료" },
];

const brokerFaqs = [
  {
    q: "가입비나 이용료가 정말 없나요?",
    a: "네, 맞습니다. 공실뉴스는 중개사님과의 상생을 최우선으로 하여, 가입비, 월 고정 이용료, 수수료가 평생 100% 무료입니다.",
  },
  {
    q: "회원 인증 및 가입 승인 절차는 어떻게 되나요?",
    a: "공인중개사 회원으로 활동하시려면 사업자등록증 또는 개설등록증 등의 자격 서류 업로드가 필요하며, 확인 후 신속하게 승인 처리가 완료됩니다.",
  },
  {
    q: "공동중개 매물은 안전하게 보호되나요?",
    a: "네, 당사의 정보망은 검증된 개업 공인중개사 간에만 공유되며, 강력한 보안 프로토콜 및 실명제를 통해 안전하게 중개 활동을 진행하실 수 있습니다.",
  },
  {
    q: "무료 특강 및 실무 콘텐츠 구독은 어떻게 이용하나요?",
    a: "가입 완료 후 별도의 추가 결제 없이 세무, 법률, 부동산 마케팅 등 실무 트렌드 아카데미 전체 강의를 언제 어디서나 전면 무료로 시청하실 수 있습니다.",
  },
];

const landlordFaqs = [
  {
    q: "공실 등록 광고비나 수수료가 전혀 없나요?",
    a: "네, 임대인 회원님께서는 가입비, 매물 등록비, 광고 노출비 등이 평생 전면 무료이며, 계약 성공 시 중개보수 외의 별도 수수료 또한 일절 청구되지 않습니다.",
  },
  {
    q: "매물을 등록하면 어떻게 11만 중개업소에 동시에 알려지나요?",
    a: "임대인님이 매물을 등록하는 순간, 해당 지역 인근의 공인중개사 회원 전용 중개망에 즉각 알림 전송 및 정보 노출이 이루어져 가장 빠르게 매칭이 시작됩니다.",
  },
  {
    q: "드론 항공 촬영 및 홍보물 무료 지원은 어떻게 받나요?",
    a: "상가, 토지, 건물 등의 대형 공실을 등록하신 후 고객센터 또는 드론 촬영 신청 메뉴를 통해 접수하시면, 무료 촬영 및 온라인 홍보물 제작을 지원해 드립니다.",
  },
  {
    q: "일반 주택 소유자나 개인 회원도 가입해서 이용할 수 있나요?",
    a: "네, 당연합니다. 상가나 빌딩뿐만 아니라 아파트, 오피스텔, 원룸 등 모든 유형의 주택 소유주 및 세입자(임차인)분들도 누구나 일반 회원으로 가입하여 공실 매칭 서비스를 무료로 이용하실 수 있습니다.",
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
          부동산 상생 네트워크,<br />공실뉴스에 동참하세요.
        </>
      ),
      desc: "가입비 및 수수료 없이 강력한 정보 혜택을 제공받으실 수 있습니다.",
      buttonText: "무료 회원가입 바로가기",
    },
    landlord: {
      title: (
        <>
          비어 있는 내 공실,<br />가장 빠르게 채우는 비결!
        </>
      ),
      desc: "수수료와 광고비 걱정 없이 전국 11만 중개망에 즉시 무료 등록해 보세요.",
      buttonText: "무료 공실 등록하고 가입하기",
    }
  };

  const heroContent = {
    broker: {
      badge: (
        <>
          🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 중개망 무료 상생 플랫폼
        </>
      ),
      title: (
        <>
          수수료 없는 부동산 매칭,<br />
          <span style={{ color: "#F59E0B" }}>공실뉴스</span>와 함께하세요
        </>
      ),
      desc: "공실 지도, 공동중개망, AI 교육 특강까지 모든 정보가 평생 조건 없이 100% 무료로 제공됩니다.",
      placeholder: "이메일을 입력해 빠르게 시작",
      buttonText: "지금 가입하기",
    },
    landlord: {
      badge: (
        <>
          🏠 내 건물/상가/주택 <strong style={{ color: "#f472b6" }}>100% 무료</strong> 공실 매칭 플랫폼
        </>
      ),
      title: (
        <>
          광고비 0원! 소중한 내 공실,<br />
          <span style={{ color: "#f472b6" }}>가장 빠르게</span> 해결하는 비결
        </>
      ),
      desc: "단 한 번의 무료 등록으로 인근 11만 중개업소에 즉시 노출되고, 드론 촬영 홍보물 제작까지 평생 무료 지원!",
      placeholder: "이메일을 입력하고 무료 공실 등록하기",
      buttonText: "무료 등록 시작하기",
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

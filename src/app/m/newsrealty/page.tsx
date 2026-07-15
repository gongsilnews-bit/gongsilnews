"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/client";
import { submitInquiry } from "@/app/actions/inquiry";

const PlayLogo = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="24" fill="#111827" />
    <circle cx="24" cy="24" r="16" fill="#FFFFFF" />
    <path d="M19 15.34L34 24L19 32.66Z" fill="#fbbf24" stroke="#111827" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="12" fill="#475569" />
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

export default function MobileNewsRealtyPage() {
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [user, setUser] = useState<any>(null);
  const [isApplicationOpen, setIsApplicationOpen] = useState(false);
  const [formData, setFormData] = useState({
    agencyName: "",
    targetComplex: "",
    bizRegion: "",
    category: "아파트 전문",
    memo: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppliedSuccessfully, setIsAppliedSuccessfully] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      }
    });
  }, []);

  const handleApplyClick = (selectedComplex?: string, selectedRegion?: string, selectedCategory?: string) => {
    setFormData(prev => ({
      ...prev,
      targetComplex: selectedComplex || prev.targetComplex || "",
      bizRegion: selectedRegion || prev.bizRegion || "",
      category: selectedCategory || prev.category || "아파트 전문"
    }));

    if (!user) {
      if (typeof window !== "undefined") {
        localStorage.setItem("signup_member_type", "broker");
      }
      setIsAuthModalOpen(true);
    } else {
      setIsApplicationOpen(true);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyName.trim() || !formData.targetComplex.trim() || !formData.bizRegion.trim()) {
      alert("모든 필수 입력 항목을 채워주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitInquiry({
        name: user.user_metadata?.name || user.email?.split("@")[0] || "기자단 신청자",
        phone: user.user_metadata?.phone || "010-0000-0000",
        email: user.email,
        category: "기자단 신청",
        title: `[기자단 신청] ${formData.agencyName}`,
        content: `상호명: ${formData.agencyName}\n희망단지: ${formData.targetComplex}\n활동지역: ${formData.bizRegion}\n주력물건: ${formData.category}\n신청 메모: ${formData.memo || "없음"}`,
        userId: user.id,
      });

      if (res.success) {
        setIsAppliedSuccessfully(true);
      } else {
        alert("신청 중 오류가 발생했습니다: " + res.message);
      }
    } catch (err: any) {
      alert("시스템 오류: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
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
            background: radial-gradient(circle at top right, #311019 0%, #0f172a 65%, #020617 100%);
            padding: 50px 16px 120px;
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
            margin-top: 40px;
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
            border-color: #cbd5e1;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          }
          .m-pricing-card.premium::before {
            content: "강력 추천";
            position: absolute;
            top: -12px;
            right: 24px;
            background: #475569;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 12px;
            border-radius: 99px;
            box-shadow: 0 4px 10px rgba(71, 85, 105, 0.2);
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
            background: #f1f5f9;
            color: #475569;
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
            background: #475569;
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(71, 85, 105, 0.15);
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

          /* ===== Mobile Target Section ===== */
          .m-target-sec {
            padding: 50px 16px;
            background: #ffffff;
            border-top: 1px solid #f1f5f9;
          }
          .m-target-container {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .m-target-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            color: #e11d48;
            background: #ffe4e6;
            padding: 4px 8px;
            border-radius: 6px;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .m-target-title-main {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 6px 0;
            line-height: 1.3;
          }
          .m-target-desc-main {
            font-size: 13.5px;
            color: #64748b;
            margin: 0;
            line-height: 1.5;
            word-break: keep-all;
          }
          .m-target-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .m-target-list-item {
            display: flex;
            gap: 14px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
          }
          .m-target-list-icon {
            font-size: 20px;
            line-height: 1;
            flex-shrink: 0;
          }
          .m-target-list-text h4 {
            font-size: 14.5px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 4px 0;
            word-break: keep-all;
          }
          .m-target-list-text p {
            font-size: 12.5px;
            color: #475569;
            margin: 0;
            line-height: 1.5;
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

          /* ===== Application Modal ===== */
          .application-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 99999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .application-modal {
            background: #ffffff;
            width: 100%;
            max-width: 480px;
            border-radius: 20px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            max-height: 90vh;
            overflow: hidden;
            animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(15px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .modal-header {
            padding: 20px 24px 10px;
            border-bottom: 1px solid #f1f5f9;
            position: relative;
          }
          .modal-close-btn {
            position: absolute;
            top: 16px; right: 16px;
            background: none; border: none;
            font-size: 20px; color: #94a3b8;
            cursor: pointer;
          }
          .modal-title { font-size: 16px; font-weight: 900; color: #0f172a; margin: 0; }
          .modal-body {
            padding: 16px 24px 24px;
            overflow-y: auto;
            flex: 1;
          }
          .form-group {
            margin-bottom: 12px;
          }
          .form-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 4px;
          }
          .form-input {
            width: 100%;
            padding: 8px 12px;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            font-size: 13.5px;
            outline: none;
            box-sizing: border-box;
            background: #fff;
          }
          .form-input:focus { border-color: #d97706; }
          .form-input.readonly { background: #f8fafc; color: #64748b; cursor: not-allowed; }
          .form-select {
            width: 100%;
            padding: 8px 12px;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            font-size: 13.5px;
            outline: none;
            background: #fff;
            box-sizing: border-box;
          }
          .form-textarea {
            width: 100%;
            height: 70px;
            padding: 8px 12px;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            font-size: 13.5px;
            outline: none;
            resize: none;
            box-sizing: border-box;
            font-family: inherit;
          }
          
          .bank-info-box {
            background: #fffbeb;
            border: 1.5px dashed #fcd34d;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 16px;
          }
          .bank-title {
            font-size: 12.5px;
            font-weight: 800;
            color: #b45309;
            margin: 0 0 2px 0;
          }
          .bank-text {
            font-size: 11.5px;
            color: #78350f;
            line-height: 1.5;
            margin: 0;
          }
          .submit-btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            color: #ffffff;
            font-size: 14.5px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(217,119,6,0.2);
          }
          .submit-btn:disabled { background: #94a3b8; cursor: not-allowed; }
          
          /* ===== New CTA Section (Full Width Banner) ===== */
          .m-new-cta-sec {
            width: 100%;
            background: #ffffff;
            padding: 50px 16px 30px;
            text-align: center;
          }
          .m-new-cta-container {
            max-width: 480px;
            margin: 0 auto;
          }
          .m-new-cta-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
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
            padding: "50px 16px 120px"
          }}
        >
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <div className="m-hero-badge">
              🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 부동산 공실뉴스
            </div>
            <h1 className="m-hero-title" style={{ fontSize: "28px", lineHeight: "1.4", wordBreak: "keep-all", textAlign: "center" }}>
              내 지역 공실을 <span style={{ color: "#fbbf24" }}>등록만 하세요!</span><br />
              부동산 마케팅이 <span style={{ color: "#fbbf24" }}>자동</span>으로 시작됩니다.
            </h1>
            <p className="m-hero-desc" style={{ fontSize: "14px", marginTop: "12px", textAlign: "center", wordBreak: "keep-all" }}>
              공실만 입력하면 완성되는 온/오프라인 AI 매매 보고서와 유튜브/블로그 포스팅,<br />
              AI 실무 부동산 유튜브 특강(드론영상 저작권 무료) 까지,,<br />
              부동산 마케팅이 쉬워집니다.
            </p>
            <div style={{ marginTop: "28px", display: "flex", justifyContent: "center", width: "100%", maxWidth: "480px" }}>
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", boxShadow: "0 15px 30px rgba(0, 0, 0, 0.4)" }}>
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/4a3_M6-Crew"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </section>


        {/* ===== Stats ===== */}
        <div style={{ background: "#ffffff" }}>
          <div className="m-stats-container" style={{ gap: "12px", marginTop: "-30px", position: "relative", zIndex: 10 }}>
            {/* Card 1 */}
            <div className="m-stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 12px" }}>
              <div className="m-stat-label" style={{ fontSize: "11px", fontWeight: "bold" }}>Point 01</div>
              <div className="m-stat-val" style={{ fontSize: "20px", fontWeight: "900", margin: "4px 0" }}>AI 매매 보고서</div>
              <div className="m-stat-sub" style={{ fontSize: "12px", color: "#475569" }}>지번 입력 즉시 1초 자동 완성</div>
            </div>

            {/* Card 2 */}
            <div className="m-stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 12px" }}>
              <div className="m-stat-label" style={{ fontSize: "11px", fontWeight: "bold" }}>Point 02</div>
              <div className="m-stat-val" style={{ fontSize: "20px", fontWeight: "900", margin: "4px 0" }}>유튜브/블로그 기사</div>
              <div className="m-stat-sub" style={{ fontSize: "12px", color: "#475569" }}>원클릭 스크립트 &amp; 원고 완성</div>
            </div>

            {/* Card 3 */}
            <div className="m-stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 12px" }}>
              <div className="m-stat-label" style={{ fontSize: "11px", fontWeight: "bold" }}>Point 03</div>
              <div className="m-stat-val" style={{ fontSize: "20px", fontWeight: "900", margin: "4px 0" }}>유튜브 특강 &amp; 드론</div>
              <div className="m-stat-sub" style={{ fontSize: "12px", color: "#475569" }}>영상 저작권 무료 다운로드</div>
            </div>
          </div>
        </div>

        {/* ===== Detail Rows (Mobile Landing Page Style) ===== */}
        <section className="m-detail-sec">
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.5px" }}>공실뉴스부동산이 되면 좋은점!!</h2>
            <p style={{ fontSize: 13, color: "#e11d48", fontWeight: 800, margin: 0 }}>내 지역 공실을 등록만 하세요. 마케팅이 자동으로 해결됩니다.</p>
          </div>

          <div className="m-detail-rows">
            {/* Row 1 */}
            <div className="m-detail-row">
              <div className="m-detail-img-wrap">
                <img src="/signup_news.png" alt="AI 물건/매매 보고서 생성" />
              </div>
              <div className="m-detail-text-wrap">
                <span className="m-detail-sub">POINT 01</span>
                <h3 className="m-detail-row-title">1, 온/오프라인 AI 매매 보고서 자동 생성</h3>
                <p className="m-detail-row-desc">
                  지번만 입력하면 1초 만에 온/오프라인 매매 보고서 PDF가 자동 완성됩니다. 카카오톡 전송 및 유리창 출력을 터치 한 번으로 끝내세요.
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="m-detail-row">
              <div className="m-detail-img-wrap">
                <img src="/signup_map.png" alt="유튜브/블로그 기사 자동 생성" />
              </div>
              <div className="m-detail-text-wrap">
                <span className="m-detail-sub">POINT 02</span>
                <h3 className="m-detail-row-title">2, 유튜브/블로그 기사 자동 생성</h3>
                <p className="m-detail-row-desc">
                  글쓰기 고민 없이 클릭 한 번으로 유튜브 대본, 쇼츠 스크립트, 포스팅 원고, 포털 송출용 기사를 1분 만에 추출해 드립니다.
                </p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="m-detail-row">
              <div className="m-detail-img-wrap">
                <img src="/signup_auction.png" alt="유튜브 특강 및 드론 영상 소스" />
              </div>
              <div className="m-detail-text-wrap">
                <span className="m-detail-sub">POINT 03</span>
                <h3 className="m-detail-row-title">3, AI 유튜브 무료 특강 (드론영상저작권무료)</h3>
                <p className="m-detail-row-desc">
                  방송국 PD 출신의 유튜브 노하우 특강은 물론 저작권이 완전 해결된 드론/고화질 영상 소스를 무제한 지원합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Recommended Target Section ===== */}
        <section className="m-target-sec">
          <div className="m-target-container">
            <div>
              <span className="m-target-badge">RECOMMENDED FOR</span>
              <h2 className="m-target-title-main">이런 부동산에 추천!</h2>
              <p className="m-target-desc-main">부동산 마케팅 때문에 고민이 깊으신 대표님들을 위한 최적의 솔루션입니다.</p>
            </div>

            <div className="m-target-list">
              {/* Item 1 */}
              <div className="m-target-list-item">
                <div className="m-target-list-icon">😭</div>
                <div className="m-target-list-text">
                  <h4>부동산마케팅 혼자하기 힘든 부동산</h4>
                  <p>기사 작성, 홍보물 제작, 고객 브리핑까지 AI가 자동으로 알아서 처리해 드립니다.</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="m-target-list-item">
                <div className="m-target-list-icon">🎬</div>
                <div className="m-target-list-text">
                  <h4>유튜브 매번 포기하는 부동산</h4>
                  <p>영상 촬영 구도부터 1년 강의, 드론/영상 소스 무료 다운로드로 지속가능한 채널 운영을 돕습니다.</p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="m-target-list-item">
                <div className="m-target-list-icon">💸</div>
                <div className="m-target-list-text">
                  <h4>비싼 고정 광고비가 부담되는 부동산</h4>
                  <p>월 3만 원의 합리적인 비용으로 광고 대행업체 수준의 전문적인 퀄리티를 유지할 수 있습니다.</p>
                </div>
              </div>

              {/* Item 4 */}
              <div className="m-target-list-item">
                <div className="m-target-list-icon">🏆</div>
                <div className="m-target-list-text">
                  <h4>지역 내 공동중개망 텃세를 넘고 독점 매물을 잡고 싶은 부동산</h4>
                  <p>공실 등록 수 20건 보장 및 AI 분석 브리핑 혜택으로 임대인과 임차인의 신뢰를 독점합니다.</p>
                </div>
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
              
              <div className="m-pricing-card-price" style={{ color: "#0f172a", marginTop: 12 }}>
                30,000원 <span>/ 월 (VAT 별도)</span>
              </div>
              
              <button 
                className="m-pricing-card-btn free-btn"
                onClick={() => handleApplyClick()}
              >
                공실뉴스부동산 신청하기
              </button>
            </div>
          </div>
        </section>

        {/* ===== CTA Section ===== */}
        <section className="m-new-cta-sec">
          <div className="m-new-cta-container">
            <h2 className="m-new-cta-title">공실뉴스 부동산이 되세요</h2>
            <div 
              className="m-new-cta-banner"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('signup_member_type', 'broker');
                }
                setIsAuthModalOpen(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <img 
                src="/signup_cta_bg.png" 
                alt="공실뉴스 부동산이 되세요" 
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "14px", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.06)" }} 
              />
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

      {/* ===== Application Overlay & Modal ===== */}
      {isApplicationOpen && (
        <div className="application-overlay" onClick={() => setIsApplicationOpen(false)}>
          <div className="application-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-close-btn" onClick={() => setIsApplicationOpen(false)}>✕</button>
              <h2 className="modal-title">📰 공실뉴스부동산 가입 신청 (대표 심사)</h2>
            </div>
            
            <div className="modal-body">
              {isAppliedSuccessfully ? (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🎉</span>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: "#111", margin: "0 0 8px" }}>기자단 신청 완료!</h3>
                  <p style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.5, marginBottom: 16, wordBreak: "keep-all" }}>
                    제출해 주신 주력 단지 및 구역의 중복 신청 여부와 중개인 정보 확인 후 24시간 이내에 승인 문자가 발송됩니다.
                  </p>
                  
                  <div className="bank-info-box">
                    <h4 className="bank-title">💳 입금 계좌</h4>
                    <p className="bank-text">
                      <strong>신한은행 110-482-123456</strong><br/>
                      예금주: <strong>(주)공실뉴스</strong><br/>
                      금액: <strong>30,000원</strong> (월 회비)<br/>
                    </p>
                  </div>
                  
                  <button 
                    className="submit-btn" 
                    onClick={() => {
                      setIsApplicationOpen(false);
                      setIsAppliedSuccessfully(false);
                      window.location.reload();
                    }}
                  >
                    확인 및 닫기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit}>
                  <div className="form-group">
                    <label className="form-label">신청자 이메일</label>
                    <input className="form-input readonly" type="text" value={user?.email || ""} readOnly />
                  </div>

                  <div className="form-group">
                    <label className="form-label">부동산 상호명 <span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="예: 공실뉴스 공인중개사사무소" 
                      value={formData.agencyName}
                      onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">주력 아파트 단지명 <span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="예: 마포 래미안 푸르지오 단지" 
                      value={formData.targetComplex}
                      onChange={(e) => setFormData({ ...formData, targetComplex: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">주요 활동 지역 <span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="예: 서울 마포구 아현동" 
                      value={formData.bizRegion}
                      onChange={(e) => setFormData({ ...formData, bizRegion: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">주력 물건 카테고리 <span style={{ color: "#ef4444" }}>*</span></label>
                    <select 
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="아파트 전문">아파트 전문</option>
                      <option value="상가/사무실 전문">상가/사무실 전문</option>
                      <option value="원룸/오피스텔 전문">원룸/오피스텔 전문</option>
                      <option value="토지/빌딩 전문">토지/빌딩 전문</option>
                      <option value="분양/재개발 전문">분양/재개발 전문</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">신청 메모 (기타 요청사항)</label>
                    <textarea 
                      className="form-textarea" 
                      placeholder="기타 요청사항을 남겨주세요." 
                      value={formData.memo}
                      onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    />
                  </div>

                  <div className="bank-info-box">
                    <h4 className="bank-title">💳 월 회비 결제 안내</h4>
                    <p className="bank-text">
                      <strong>금액: 월 30,000원</strong><br/>
                      <strong>신한은행 110-482-123456</strong> (예금주: 주식회사 공실뉴스)<br/>
                    </p>
                  </div>

                  <button className="submit-btn" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "신청 처리 중..." : "독점 권한 심사 및 신청하기 ✨"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

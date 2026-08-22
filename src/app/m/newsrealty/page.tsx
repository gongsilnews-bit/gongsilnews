"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/client";
import { submitInquiry } from "@/app/actions/inquiry";

const brokerStats = [
  { label: "전국 가입 부동산", value: "11만+", sub: "대규모 네트워크 인프라" },
  { label: "공동중개 실매물 열람", value: "100% 무료", sub: "빠른 계약을 위한 무료 개방" },
  { label: "가입비 · 월이용료", value: "평생 0원", sub: "부동산 누구나 무료 열람" },
];

const RECOMMENDED_TARGETS = [
  {
    role: "개업공인중개사 대표님",
    title: "빠른 전월세·매매 공동중개 매칭이 필요하신 대표님",
    desc: "전국 11만 부동산 실매물망을 100% 무료로 열람하여 내 고객에게 딱 맞는 물건을 빠르게 찾아 공동중개를 성사시킬 수 있습니다.",
    tag: "추천 대상: 매물망을 넓히고 빠른 계약 성사를 원하는 개업공인중개사",
    image: "/images/realty/avatar_broker_success.jpg",
  },
  {
    role: "현장 실무 & 임장 중개사",
    title: "현장에서 즉시 브리핑 제안서와 주변 공실을 확인하고 싶을 때",
    desc: "야외에서도 스마트폰 지도로 주변 공실을 실시간 확인하고, 지번만 넣으면 1초 만에 깔끔한 고객 브리핑용 AI 제안서를 바로 출력할 수 있습니다.",
    tag: "추천 대상: 고객 브리핑 퀄리티를 높이고 현장 미팅이 잦은 소속·개업 중개사",
    image: "/images/realty/avatar_realtor_mobile.jpg",
  },
  {
    role: "신규 개업 공인중개사",
    title: "초기 고정비 부담 없이 전국 매물 네트워크가 필요한 신규 대표님",
    desc: "가입비나 월정액 비용 없이 전국 11만 부동산 매물망을 즉시 확보하여 개업 초기부터 경쟁력 있는 공동중개를 시작할 수 있습니다.",
    tag: "추천 대상: 텃세 없는 오픈 네트워크에서 빠르게 자리를 잡고 싶은 신규 개업 중개사",
    image: "/images/realty/avatar_young_broker.jpg",
  },
  {
    role: "상가·오피스·토지 전문 중개법인",
    title: "법원 경·공매 및 권리분석 데이터까지 원스톱으로 필요한 전문가",
    desc: "실시간 법원 경매·공매 물건 정보와 기본 권리분석 데이터까지 무료로 열람하여 고난도 특수물건 중개와 고객 컨설팅에 즉시 활용할 수 있습니다.",
    tag: "추천 대상: 경공매 및 수익형 부동산 전문 컨설팅 역량을 강화하려는 중개법인",
    image: "/images/realty/avatar_corporate_broker.jpg",
  },
];

const brokerFaqs = [
  {
    q: "공동중개 열람과 물건 등록은 어떻게 무료인가요?",
    a: "대한민국 부동산 대표님이라면 전국 11만 공동중개 실매물 열람은 100% 평생 무료(무제한)이며, 내 매물을 올려 다른 부동산에 알리는 공동중개 물건 등록도 3건까지 무료로 제공됩니다.",
  },
  {
    q: "공실뉴스는 정말 평생 무료인가요?",
    a: "네, 그렇습니다. 공실뉴스부동산은 가입비나 월정액 이용료가 전혀 없는 100% 무료 서비스입니다. 빠른 계약을 위해 대한민국 공인중개사 대표님 누구라도 100% 무료로 실매물을 열람하고 공동중개에 참여하실 수 있습니다.",
  },
  {
    q: "어떤 매물과 정보를 무료로 열람할 수 있나요?",
    a: "전국 11만 부동산의 실시간 공동중개 실매물망부터 실시간 법원 경·공매 정보 및 기본 권리분석 데이터까지, 빠른 계약에 필요한 모든 정보를 부동산 누구라도 제한 없이 무료로 열람하실 수 있습니다.",
  },
  {
    q: "스마트폰 모바일에서도 지도 열람이 가능한가요?",
    a: "네, 스마트폰 모바일 화면에 완벽히 최적화되어 있어, 야외 현장이나 임장 중에도 실시간 지도 기반으로 주변 공실 및 공동중개 물건을 누구나 무료로 열람하고 담당 중개사와 바로 연결됩니다.",
  },
  {
    q: "AI 물건보고서(제안서)는 어떻게 활용하나요?",
    a: "지번이나 주소만 입력하면 1초 만에 깔끔한 고객 브리핑용 맞춤 제안서가 완성됩니다. 빠른 계약 성사를 위해 고객 방문 상담, 현장 브리핑, 모바일 카카오톡 전송 등에 즉시 활용하실 수 있습니다.",
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
    memo: "",
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

  const handleApplyClick = () => {
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

      <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", backgroundColor: "#ffffff", color: "#1e293b", paddingBottom: 80, paddingTop: 50 }}>
        
        {/* ── 고정 상단 헤더 ── */}
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: 50, background: "#091e3a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 50, borderBottom: "1px solid #1e3a8a", boxSizing: "border-box" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#bae6fd", padding: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>공실뉴스부동산</div>
          <div style={{ width: 24 }} />
        </div>

        {/* ━━━ 1. 모바일 히어로 배너 (무료 강조) ━━━ */}
        <section style={{ backgroundColor: "#091e3a", color: "#ffffff", padding: "28px 16px 36px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", padding: "4px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 800, color: "#fbbf24", marginBottom: 14 }}>
            <span>✨</span>
            <span>공실뉴스 부동산이 되세요!</span>
          </div>

          <h1 style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.5px", margin: "0 0 10px 0" }}>
            부동산이세요?<br />
            <span style={{ color: "#fbbf24" }}>공동중개 열람 평생 무료!</span>
          </h1>

          <p style={{ fontSize: 13, color: "#bae6fd", lineHeight: 1.55, margin: "0 0 20px 0", wordBreak: "keep-all" }}>
            지금 가입하시면, 공동중개 3건 등록/열람, AI물건보고서, 그리고 전국 법원 경공매 정보를 무료로 열람하실 수 있습니다.
          </p>

          <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: "1px solid #1e3a8a", marginBottom: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/4a3_M6-Crew?rel=0"
              title="소개 영상"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <button
            onClick={handleApplyClick}
            className="m-realty-cta-btn"
          >
            ✨ 공실뉴스 부동산 무료 신청하기
          </button>
        </section>

        {/* 모바일 인터랙티브 애니메이션 스타일 */}
        <style>{`
          .m-realty-cta-btn {
            width: 100%;
            padding: 14px 0;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            border: none;
            border-radius: 10px;
            font-size: 15.5px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37,99,235,0.4);
            transition: all 0.25s ease;
            animation: mCtaFloat 3.2s ease-in-out infinite;
          }
          .m-realty-cta-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37,99,235,0.5);
            filter: brightness(1.06);
          }
          .m-realty-cta-btn:active {
            transform: scale(0.98);
          }
          @keyframes mCtaFloat {
            0%, 100% { transform: translateY(0); box-shadow: 0 4px 14px rgba(37,99,235,0.4); }
            50% { transform: translateY(-3px); box-shadow: 0 8px 18px rgba(37,99,235,0.5); }
          }

          .m-benefit-card {
            background: #f8fafc;
            padding: 16px 14px;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            display: flex;
            gap: 12px;
            align-items: flex-start;
            transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: pointer;
          }
          .m-benefit-card:hover {
            transform: translateY(-4px);
            border-color: #3b82f6;
            box-shadow: 0 10px 22px rgba(37,99,235,0.1);
            background: #ffffff;
          }
          .m-benefit-card .m-benefit-icon {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .m-benefit-card:hover .m-benefit-icon {
            transform: scale(1.1) rotate(3deg);
          }

          .m-benefit-card .m-benefit-title {
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 3px;
          }

          .m-target-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 14px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.02);
            transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: pointer;
          }
          .m-target-card:hover {
            transform: translateY(-4px);
            border-color: #3b82f6;
            box-shadow: 0 12px 24px rgba(37,99,235,0.1);
          }
          .m-target-card .m-avatar-img {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .m-target-card:hover .m-avatar-img {
            transform: scale(1.1) rotate(2deg);
          }
          .m-target-card .m-target-title {
            font-size: 13.5px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.4;
            margin-bottom: 4px;
          }
          .m-target-card .m-role-badge {
            display: inline-block;
            background: #eff6ff;
            color: #1d4ed8;
            font-size: 10.5px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 4px;
            transition: all 0.25s ease;
          }
          .m-target-card:hover .m-role-badge {
            background: #dbeafe;
            color: #1e40af;
          }
        `}</style>

        {/* ━━━ 2. 3대 핵심 무료 혜택 ━━━ */}
        <section style={{ padding: "32px 16px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb", letterSpacing: "0.5px" }}>100% FREE BENEFITS</span>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "4px 0 6px 0", letterSpacing: "-0.3px" }}>
              대한민국 11만 부동산을 위한 무료 공실 채널
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: 0 }}>
              가입비 0원, 월정액 0원! 100% 무료 개방
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {/* 1. 100% 무료 공동중개망 */}
            <div className="m-benefit-card">
              <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: "1px solid #e2e8f0", background: "#fff" }}>
                <img src="/images/realty/icons/icon_key_unlock.jpg" alt="100% 무료 공동중개망" className="m-benefit-icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", padding: "2px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 800, marginBottom: 4 }}>
                  전국 부동산 누구나
                </div>
                <div className="m-benefit-title">
                  100% 무료 공동중개망
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  빠른 공실 계약을 위해 11만 부동산 실매물 열람은 100% 무료! 물건 등록도 3건까지 무료로 제공됩니다.
                </div>
              </div>
            </div>

            {/* 2. 1초 완성 AI 물건보고서 3건 무료 */}
            <div className="m-benefit-card">
              <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: "1px solid #e2e8f0", background: "#fff" }}>
                <img src="/images/realty/icons/icon_doc_chart.jpg" alt="1초 완성 AI 물건보고서 3건 무료" className="m-benefit-icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ display: "inline-block", background: "#fef3c7", color: "#d97706", padding: "2px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 800, marginBottom: 4 }}>
                  중개사 필수 AI 도구
                </div>
                <div className="m-benefit-title">
                  1초 완성 AI 물건보고서 3건 무료
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  지번만 입력하면 고객 브리핑용 매매·임대 제안서를 1초 만에 깔끔하게 만들어 드립니다.
                </div>
              </div>
            </div>

            {/* 3. 전국 법원 경공매 물건 무료 열람 */}
            <div className="m-benefit-card">
              <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: "1px solid #e2e8f0", background: "#fff" }}>
                <img src="/images/realty/icons/icon_auction_gavel.jpg" alt="전국 법원 경공매 물건 무료 열람" className="m-benefit-icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ display: "inline-block", background: "#ecfdf5", color: "#059669", padding: "2px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 800, marginBottom: 4 }}>
                  실시간 법원 연동
                </div>
                <div className="m-benefit-title">
                  전국 법원 경공매 물건 무료 열람
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  법원 실시간 경매·공매 물건 정보 및 기본권리분석 정보를 무료로 열람할 수 있습니다.
                </div>
              </div>
            </div>
          </div>

          {/* 회원 유형 안내 */}
          <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "12px 14px", fontSize: 11.5, color: "#475569", lineHeight: 1.6, textAlign: "left" }}>
            <div>· <strong>일반회원</strong> : 공실 3건 무료, 경공매 열람 가능, 공동중개 열람 불가</div>
            <div>· <strong>부동산회원</strong> : <strong style={{ color: "#2563eb" }}>공동중개 열람 100% 무료</strong>, <strong>공동중개 물건등록 3건 무료</strong>, 경공매 열람 가능</div>
          </div>
        </section>

        {/* ━━━ 3. 3D 파스텔 아바타 후기 섹션 (11만 부동산 & 임대인 실제 증명) ━━━ */}
        <section style={{ padding: "36px 16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 17.5, fontWeight: 900, color: "#0f172a", margin: "0 0 6px 0", lineHeight: 1.35 }}>
              빠른 계약을 원할땐, 이제 공실뉴스부동산이 되세요!<br />
              <span style={{ color: "#2563eb" }}>부동산은 누구나 무료!!</span>
            </h2>
            <p style={{ fontSize: 13, color: "#1e293b", margin: "0 0 2px 0", fontWeight: 800 }}>
              💡 이런 부동산 대표님께 적극 추천합니다
            </p>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              가입비 0원, 월정액 0원! 100% 무료 공동중개망
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {RECOMMENDED_TARGETS.map((item, idx) => (
              <div
                key={idx}
                className="m-target-card"
              >
                <div style={{ width: 68, height: 68, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
                  <img src={item.image} alt={item.role} className="m-avatar-img" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="m-role-badge">
                    {item.role}
                  </span>
                  <div className="m-target-title">
                    {item.title}
                  </div>
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.45, margin: "0 0 4px 0" }}>
                    {item.desc}
                  </p>
                  <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>
                    {item.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ 5. 3대 핵심 혜택 및 회원 안내 (FAQ 상단) ━━━ */}
        <section style={{ padding: "36px 16px", backgroundColor: "#f8fafc" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", marginBottom: 14 }}>
            자주 묻는 질문 FAQ
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {brokerFaqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    style={{ width: "100%", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Q. {faq.q}</span>
                    <span style={{ fontSize: 12, color: "#2563eb" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 14px 12px", fontSize: 12.5, color: "#475569", lineHeight: 1.6, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* ━━━ 신청 모달 ━━━ */}
      {isApplicationOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 360, background: "#ffffff", borderRadius: 14, padding: "20px", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                공실뉴스부동산 무료 신청서
              </h3>
              <button onClick={() => setIsApplicationOpen(false)} style={{ background: "none", border: "none", fontSize: 18, color: "#94a3b8" }}>✕</button>
            </div>

            {isAppliedSuccessfully ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>신청이 접수되었습니다!</h4>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px 0" }}>확인 후 신속히 연락드리겠습니다.</p>
                <button onClick={() => { setIsApplicationOpen(false); setIsAppliedSuccessfully(false); }} style={{ padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700 }}>
                  확인
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 3 }}>중개업소 상호명 (또는 성명) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 공실뉴스공인중개사"
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 3 }}>주요 활동 지역 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 서울 강남구 역삼동"
                    value={formData.bizRegion}
                    onChange={(e) => setFormData({ ...formData, bizRegion: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 3 }}>희망 대표 단지/건물명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 래미안역삼 또는 테헤란빌딩"
                    value={formData.targetComplex}
                    onChange={(e) => setFormData({ ...formData, targetComplex: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 3 }}>주력 물건 유형</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  >
                    <option value="아파트 전문">아파트 전문</option>
                    <option value="상가/오피스 전문">상가/오피스 전문</option>
                    <option value="원룸/오피스텔 전문">원룸/오피스텔 전문</option>
                    <option value="토지/공장/창고 전문">토지/공장/창고 전문</option>
                    <option value="경·공매 전문">경·공매 전문</option>
                  </select>
                </div>

                <div style={{ marginTop: 6 }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ width: "100%", padding: "10px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
                  >
                    {isSubmitting ? "신청 중..." : "무료 신청서 제출"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}

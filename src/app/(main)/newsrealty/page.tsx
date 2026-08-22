"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const brokerStats = [
  { label: "전국 가입 부동산", value: "11만+", sub: "대규모 네트워크 인프라" },
  { label: "공동중개 실매물 열람", value: "100% 무료", sub: "빠른 계약을 위한 무료 개방" },
  { label: "공동중개 물건 등록", value: "3건 무료", sub: "부동산 기본 무료 등록" },
];

const RECOMMENDED_TARGETS = [
  {
    role: "개업공인중개사 대표님",
    title: "빠른 전월세·매매 공동중개 매칭이 필요하신 대표님",
    desc: "전국 11만 부동산 실매물망을 100% 무료로 열람하여 내 고객에게 딱 맞는 물건을 빠르게 찾아 공동중개를 성사시킬 수 있습니다.",
    tag: "추천 대상: 매물망을 넓히고 빠른 계약 성사를 원하는 개업공인중개사",
    image: "/images/realty/avatar_broker_success.jpg",
    imagePosition: "left" as const,
  },
  {
    role: "현장 실무 & 임장 중개사",
    title: "현장에서 즉시 브리핑 제안서와 주변 공실을 확인하고 싶을 때",
    desc: "야외에서도 스마트폰 지도로 주변 공실을 실시간 확인하고, 지번만 넣으면 1초 만에 깔끔한 고객 브리핑용 AI 제안서를 바로 출력할 수 있습니다.",
    tag: "추천 대상: 고객 브리핑 퀄리티를 높이고 현장 미팅이 잦은 소속·개업 중개사",
    image: "/images/realty/avatar_realtor_mobile.jpg",
    imagePosition: "right" as const,
  },
  {
    role: "신규 개업 공인중개사",
    title: "초기 고정비 부담 없이 전국 매물 네트워크가 필요한 신규 대표님",
    desc: "가입비나 월정액 비용 없이 전국 11만 부동산 매물망을 즉시 확보하여 개업 초기부터 경쟁력 있는 공동중개를 시작할 수 있습니다.",
    tag: "추천 대상: 텃세 없는 오픈 네트워크에서 빠르게 자리를 잡고 싶은 신규 개업 중개사",
    image: "/images/realty/avatar_young_broker.jpg",
    imagePosition: "left" as const,
  },
  {
    role: "상가·오피스·토지 전문 중개법인",
    title: "법원 경·공매 및 권리분석 데이터까지 원스톱으로 필요한 전문가",
    desc: "실시간 법원 경매·공매 물건 정보와 기본 권리분석 데이터까지 무료로 열람하여 고난도 특수물건 중개와 고객 컨설팅에 즉시 활용할 수 있습니다.",
    tag: "추천 대상: 경공매 및 수익형 부동산 전문 컨설팅 역량을 강화하려는 중개법인",
    image: "/images/realty/avatar_corporate_broker.jpg",
    imagePosition: "right" as const,
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
    q: "스마트폰 모바일이나 외부 현장에서도 무료 열람이 가능한가요?",
    a: "네, 스마트폰 모바일 화면에 완벽히 최적화되어 있어, 현장이나 임장 중에도 실시간 지도 기반으로 주변 공실 및 공동중개 물건을 누구나 무료로 열람하고 담당 중개사와 바로 연결됩니다.",
  },
  {
    q: "고객 브리핑용 AI 제안서도 무료로 지원되나요?",
    a: "네, 빠른 계약 성사를 돕기 위해 지번만 입력하면 1초 만에 완성되는 깔끔한 고객 브리핑용 AI 제안서 3건이 무료로 즉시 지원됩니다.",
  },
];

export default function NewsRealtyPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      }
    });
  }, []);

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    if (!user) {
      window.location.href = "/login?returnTo=" + encodeURIComponent("/realty_admin?menu=settings");
    } else {
      window.location.href = "/realty_admin?menu=settings";
    }
  };

  return (
    <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", backgroundColor: "#ffffff", color: "#1e293b", paddingBottom: 100 }}>
        
        {/* ━━━ 1. HERO BANNER (대한민국 11만 부동산을 위한 무료 공동중개 네트워크) ━━━ */}
        <section style={{ backgroundColor: "#091e3a", color: "#ffffff", padding: "80px 24px 70px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 2 }}>
            
            {/* 핵심 메인 배지 */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.35)", padding: "6px 20px", borderRadius: 30, fontSize: 14, fontWeight: 800, color: "#fbbf24", marginBottom: 22 }}>
              <span>✨</span>
              <span>공실뉴스에 무료 등록하세요!</span>
            </div>

            {/* 메인 헤드라인 */}
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.35, letterSpacing: "-1.5px", margin: "0 0 18px 0" }}>
              부동산이세요?<br />
              <span style={{ color: "#fbbf24" }}>공동중개 열람 평생 무료!</span>
            </h1>

            <p style={{ fontSize: 17, color: "#bae6fd", lineHeight: 1.7, margin: "0 0 32px 0", wordBreak: "keep-all" }}>
              지금 가입하시면, 공동중개 3건 등록/열람, AI물건보고서, 그리고 전국 법원 경공매 정보를 무료로 열람하실 수 있습니다.
            </p>

            {/* 유튜브 영상 프레임 */}
            <div style={{ maxWidth: 740, margin: "0 auto 28px", width: "100%", aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.5)", border: "1px solid #1e3a8a" }}>
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/4a3_M6-Crew?rel=0"
                title="무료 중개업소 등록 소개 영상"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* CTA 버튼 */}
            <div>
              <button
                onClick={() => handleApplyClick()}
                className="realty-cta-btn"
              >
                ✨ 무료 중개업소 등록하기 →
              </button>
            </div>

          </div>
        </section>

        {/* ━━━ 2. 3대 핵심 무료 혜택 카드 (100% 무료 개방) ━━━ */}
        <section style={{ padding: "60px 0 50px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                100% FREE BENEFITS
              </span>
              <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "8px 0 10px 0", letterSpacing: "-0.5px" }}>
                대한민국 11만 부동산을 위한 무료 공실 채널
              </h2>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
                가입비 0원, 월정액 0원! 부동산 대표님들을 위해 100% 무료로 개방됩니다.
              </p>
            </div>

            {/* 3대 핵심 무료 카드 그리드 & 모션 스타일 */}
            <style>{`
              .realty-cta-btn {
                padding: 16px 38px;
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: #ffffff;
                border: none;
                border-radius: 12px;
                font-size: 17px;
                font-weight: 900;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(37,99,235,0.4);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                animation: ctaFloating 3.5s ease-in-out infinite;
              }
              .realty-cta-btn:hover {
                transform: translateY(-5px) scale(1.03);
                box-shadow: 0 14px 32px rgba(37,99,235,0.55);
                filter: brightness(1.08);
              }
              .realty-cta-btn:active {
                transform: translateY(-1px) scale(0.99);
              }
              @keyframes ctaFloating {
                0%, 100% { transform: translateY(0); box-shadow: 0 6px 20px rgba(37,99,235,0.4); }
                50% { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(37,99,235,0.52); }
              }

              /* 3대 핵심 무료 혜택 카드 */
              .realty-benefit-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 28px 24px;
                transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 2px 10px rgba(0,0,0,0.03);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                cursor: pointer;
              }
              .realty-benefit-card:hover {
                transform: translateY(-8px);
                border-color: #2563eb;
                box-shadow: 0 18px 36px rgba(37, 99, 235, 0.14);
              }
              .realty-benefit-card:hover .benefit-3d-icon {
                transform: scale(1.15) rotate(4deg);
              }
              .realty-benefit-card .benefit-card-title {
                font-size: 19px;
                font-weight: 900;
                color: #0f172a;
                margin: 0 0 8px 0;
              }
              .benefit-3d-icon-wrap {
                width: 64px;
                height: 64px;
                border-radius: 14px;
                background: #f8fafc;
                border: 1px solid #f1f5f9;
                overflow: hidden;
                margin-bottom: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 8px rgba(0,0,0,0.04);
              }
              .benefit-3d-icon {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
              }

              /* 추천 대상(사례) 카드 마우스 호버 모션 */
              .realty-target-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px 30px;
                display: flex;
                align-items: center;
                gap: 32px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
                cursor: pointer;
              }
              .realty-target-card:hover {
                transform: translateY(-7px);
                border-color: #3b82f6;
                box-shadow: 0 18px 36px rgba(37, 99, 235, 0.13);
                background: #ffffff;
              }
              .realty-target-card .target-avatar-img {
                transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
              }
              .realty-target-card:hover .target-avatar-img {
                transform: scale(1.12) rotate(2deg) translateY(-2px);
              }
              .realty-target-card .target-card-title {
                font-size: 17.5px;
                font-weight: 900;
                color: #0f172a;
                margin: 0 0 6px 0;
                letter-spacing: -0.2px;
              }
              .realty-target-card .target-role-badge {
                display: inline-block;
                background: #eff6ff;
                color: #1d4ed8;
                font-size: 12px;
                font-weight: 800;
                padding: 3px 10px;
                border-radius: 6px;
                margin-bottom: 8px;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
              }
              .realty-target-card:hover .target-role-badge {
                background: #dbeafe;
                color: #1e40af;
                transform: scale(1.05);
              }
            `}</style>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
              
              {/* 1. 무료 공동중개망 */}
              <div className="realty-benefit-card">
                <div>
                  <div className="benefit-3d-icon-wrap">
                    <img src="/images/realty/icons/icon_key_unlock.jpg" alt="100% 무료 공동중개망" className="benefit-3d-icon" />
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eff6ff", color: "#2563eb", padding: "4px 9px", borderRadius: 6, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
                    <span>✓</span> 전국 부동산 누구나 가입하는
                  </div>
                  <h3 className="benefit-card-title">100% 무료 공동중개망</h3>
                  <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                    빠른 공실 계약을 위해 11만 부동산 실매물 열람은 100% 무료! 공동중개 물건 등록도 3건까지 무료로 제공됩니다.
                  </p>
                </div>
              </div>

              {/* 2. AI 물건보고서 3건 무료 */}
              <div className="realty-benefit-card">
                <div>
                  <div className="benefit-3d-icon-wrap">
                    <img src="/images/realty/icons/icon_doc_chart.jpg" alt="1초 완성 AI 물건보고서 3건 무료" className="benefit-3d-icon" />
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fef3c7", color: "#d97706", padding: "4px 9px", borderRadius: 6, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
                    <span>✓</span> 중개사에게 꼭 필요한
                  </div>
                  <h3 className="benefit-card-title">1초 완성 AI 물건보고서 3건 무료</h3>
                  <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                    지번만 입력하면 고객 브리핑용 매매·임대 제안서를 1초 만에 깔끔하게 만들어 드립니다.
                  </p>
                </div>
              </div>

              {/* 3. 전국 법원 경공매 물건 무료 열람 */}
              <div className="realty-benefit-card">
                <div>
                  <div className="benefit-3d-icon-wrap">
                    <img src="/images/realty/icons/icon_auction_gavel.jpg" alt="전국 법원 경공매 물건 무료 열람" className="benefit-3d-icon" />
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#ecfdf5", color: "#059669", padding: "4px 9px", borderRadius: 6, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
                    <span>✓</span> 실시간 업데이트
                  </div>
                  <h3 className="benefit-card-title">전국 법원 경공매 물건 무료 열람</h3>
                  <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                    법원 실시간 경매·공매 물건 정보 및 기본권리분석 정보를 무료로 열람할 수 있습니다.
                  </p>
                </div>
              </div>

            </div>

            {/* 회원 유형 안내 */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, color: "#475569", lineHeight: 1.7, display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", textAlign: "center" }}>
              <div>· <strong>일반회원</strong> : 공실등록 3건 무료, 경공매 열람 가능, 공동중개 열람 불가</div>
              <div>· <strong>부동산회원</strong> : <strong style={{ color: "#2563eb" }}>공동중개 열람 100% 무료</strong>, <strong>공동중개 물건등록 3건 무료</strong>, 경공매 열람 가능</div>
            </div>

          </div>
        </section>

        {/* ━━━ 3. 3D PASTEL AVATARS: 11만 부동산 & 임대인 실제 성공 증명 섹션 ━━━ */}
        <section style={{ padding: "80px 0 75px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "0 0 10px 0", letterSpacing: "-0.5px", lineHeight: 1.35 }}>
                빠른 계약을 원할땐, 공실뉴스에 무료 등록하세요!<br />
                <span style={{ color: "#2563eb" }}>부동산은 누구나 무료!!</span>
              </h2>
              <p style={{ fontSize: "16px", color: "#334155", lineHeight: 1.6, margin: "0 0 4px 0", fontWeight: 800 }}>
                💡 이런 부동산 대표님께 적극 추천합니다
              </p>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                가입비 0원, 월정액 0! 100% 무료 실매물 공동중개망으로 중개 업무의 효율을 극대화하세요.
              </p>
            </div>

            {/* 4대 3D 아바타 추천 대상 교차 카드 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {RECOMMENDED_TARGETS.map((item, idx) => {
                const isLeftImage = item.imagePosition === "left";
                return (
                  <div
                    key={idx}
                    className="realty-target-card"
                  >
                    {/* 이미지 좌측 배치 */}
                    {isLeftImage && (
                      <div style={{ width: 140, height: 140, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                          src={item.image}
                          alt={item.role}
                          className="target-avatar-img"
                          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                        />
                      </div>
                    )}

                    {/* 본문 텍스트 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="target-role-badge">
                        {item.role}
                      </div>
                      <h4 className="target-card-title">
                        {item.title}
                      </h4>
                      <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: "0 0 8px 0" }}>
                        {item.desc}
                      </p>
                      <span style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 700 }}>
                        {item.tag}
                      </span>
                    </div>

                    {/* 이미지 우측 배치 */}
                    {!isLeftImage && (
                      <div style={{ width: 140, height: 140, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                          src={item.image}
                          alt={item.role}
                          className="target-avatar-img"
                          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ━━━ 5. FAQ 아코디언 ━━━ */}
        <section style={{ padding: "75px 0", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 840, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                FAQ
              </span>
              <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: "6px 0 0 0" }}>
                자주 묻는 질문
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {brokerFaqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{ width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Q. {faq.q}</span>
                      <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 800 }}>{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 20px 18px", fontSize: 14, color: "#475569", lineHeight: 1.7, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ━━━ 6. 하단 CTA 배너 (딥 네이비) ━━━ */}
        <section style={{ padding: "70px 24px", backgroundColor: "#091e3a", color: "#ffffff", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>
              내 지역 공실등록, 지금 바로 무료로 시작하세요
            </h2>
            <p style={{ fontSize: 15.5, color: "#bae6fd", lineHeight: 1.6, margin: "0 0 28px 0" }}>
              가입비 0원, 월정액 0원으로 전국 11만 부동산 네트워크와 100% 무료 공동중개를 누려보세요.
            </p>
            <button
              onClick={() => handleApplyClick()}
              className="realty-cta-btn"
            >
              ✨ 무료 중개업소 등록하기 →
            </button>
          </div>
        </section>

      </div>
  );
}

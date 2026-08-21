"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/client";
import { submitInquiry } from "@/app/actions/inquiry";

const brokerStats = [
  { label: "전국 가입 부동산", value: "11만+", sub: "대규모 네트워크 인프라" },
  { label: "공동중개 실매물 공유", value: "100% 무료", sub: "지도 기반 실시간 열람" },
  { label: "임대인 공실 등록비", value: "평생 0원", sub: "누구나 무료 직등록" },
];

const PROOF_STORIES = [
  {
    role: "개업공인중개사 7년차",
    quote: "“매달 15만 원씩 나가던 타사 유료 공실망 해지하고 공실뉴스 무료 공동중개로 갈아탔는데, 첫 달 만에 아파트 전세 공동중개 2건 바로 맞췄습니다.”",
    author: "서울 송파구 개업공인중개사 박OO 대표",
    image: "/images/realty/avatar_broker_success.jpg",
  },
  {
    role: "상가·원룸 건물주 / 임대인",
    quote: "“수수료나 등록비 없이 스마트폰으로 공실 올렸더니, 그날 오후에 동네 부동산 대표님 3분에게 바로 연락 와서 주말에 계약 끝냈습니다.”",
    author: "경기 수원시 원룸 통건물주 정OO 대표",
    image: "/images/realty/avatar_landlord_success.jpg",
  },
  {
    role: "소속공인중개사 2년차",
    quote: "“손님 모시고 임장 나갔을 때 모바일 지도로 주변 공실 실시간 확인하고, AI 매매 보고서 뽑아서 카톡 브리핑하니 고객 신뢰도가 급상승하더군요.”",
    author: "마포구 소속공인중개사 이OO 실장",
    image: "/images/realty/avatar_realtor_mobile.jpg",
  },
  {
    role: "신규 개업 공인중개사",
    quote: "“기존 지역 친목회 가입비 수백만 원과 텃세 때문에 막막했는데, 공실뉴스 전국 11만 망 덕분에 타 지역 매물까지 자유롭게 공동중개 중입니다.”",
    author: "인천 연수구 개업공인중개사 김OO 대표",
    image: "/images/realty/avatar_young_broker.jpg",
  },
  {
    role: "상가·오피스 전문 중개법인",
    quote: "“법원 등기소·토지대장 연동과 실시간 경·공매 물건 무료 열람 덕분에 대형 통사옥 임대차 특약까지 한 치의 오차 없이 깔끔하게 계약 체결했습니다.”",
    author: "강남 테헤란로 중개법인 최OO 이사",
    image: "/images/realty/avatar_corporate_broker.jpg",
  },
];

const brokerFaqs = [
  {
    q: "공실뉴스는 정말 평생 무료인가요?",
    a: "네, 그렇습니다. 공실뉴스부동산은 가입비, 연회비, 월정액 이용료가 전혀 없는 100% 무료 서비스입니다. 타사 공실 사이트들의 월 10만원 이상 고정 회비 부담에서 벗어나 무료로 공동중개를 활성화하세요.",
  },
  {
    q: "임대인(건물주)도 무료로 공실을 등록할 수 있나요?",
    a: "네, 100% 무료입니다! 임대인 누구나 등록비 0원으로 공실을 등록하시면, 해당 지역의 수천 명의 개업공인중개사들에게 실시간으로 매칭되어 가장 빠르게 임차인을 찾을 수 있습니다.",
  },
  {
    q: "타 사이트 및 지역 공동중개망과의 가장 큰 차이점은 무엇인가요?",
    a: "타사 공실 사이트는 높은 월정액을 요구하고, 기존 지역 친목회는 텃세와 카르텔로 수백만 원의 가입비를 요구합니다. 반면 공실뉴스는 가입 제한 장벽이 전혀 없으며, 전국 11만 중개망을 평생 무료로 활용할 수 있습니다.",
  },
  {
    q: "스마트폰 모바일에서도 지도 열람이 가능한가요?",
    a: "네, 스마트폰 모바일 화면에 최적화되어 있으므로, 야외 현장에 나가 계시더라도 실시간 지도 기반으로 주변 공동중개 물건을 즉시 검색하고 중개사 연락처를 확인하실 수 있습니다.",
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
            <span style={{ color: "#fbbf24" }}>공동중개 등록/열람 평생 무료!</span>
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
            style={{
              width: "100%",
              padding: "14px 0",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontSize: 15.5,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
            }}
          >
            ✨ 무료 공실뉴스부동산 신청하기
          </button>
        </section>

        {/* ━━━ 2. 3대 핵심 혜택 카드 (히어로 직하단) ━━━ */}
        <section style={{ padding: "24px 16px 20px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {/* 1. 무료 공동중개망 */}
            <div style={{ background: "#ffffff", padding: "16px 14px", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eff6ff", color: "#2563eb", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
                <span>✓</span> 전국 부동산 누구나 가입하는
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>
                100% 무료 공동중개망
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                타사 월회비 ZERO! 전국 11만 부동산 실매물 평생 무료 열람
              </div>
            </div>

            {/* 2. AI 물건보고서 */}
            <div style={{ background: "#ffffff", padding: "16px 14px", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fef3c7", color: "#d97706", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
                <span>✓</span> 중개사에게 꼭 필요한
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>
                1초 완성 AI 물건보고서 3건 무료
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                지번 입력 시 고객 브리핑용 고품격 매매·임대 제안서 1초 완성
              </div>
            </div>

            {/* 3. 경공매 무료 열람 */}
            <div style={{ background: "#ffffff", padding: "16px 14px", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#ecfdf5", color: "#059669", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
                <span>✓</span> 실시간 업데이트
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>
                전국 법원 경공매 물건 무료 열람
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                법원 실시간 경매·공매 물건 정보 및 권리분석 서식 무료 제공
              </div>
            </div>
          </div>

          {/* 회원 유형 안내 */}
          <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "#475569", lineHeight: 1.6, textAlign: "left" }}>
            <div>· <strong>일반회원</strong> : 공실 3건 무료, 경공매 열람 가능, 공동중개 열람 불가</div>
            <div>· <strong>부동산회원</strong> : 공동중개 3건 무료, 경공매 열람, <strong style={{ color: "#2563eb" }}>공동중개 열람 가능</strong></div>
          </div>
        </section>

        {/* ━━━ 3. 5대 핵심 무료 시스템 ━━━ */}
        <section style={{ padding: "36px 16px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb" }}>100% FREE BENEFITS</span>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "4px 0 0 0" }}>
              11만 부동산을 위한 5대 핵심 무료 혜택
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>🤝 1. 공동중개 열람 무료</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>타사 월정액 ZERO! 전국 11만 부동산 실매물 정보를 평생 무료 열람</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>📄 2. 매매 보고서 3건 무료</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>지번만 넣으면 AI가 고객 브리핑용 고품격 매매/임대 제안서 1초 만에 완성</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>📍 3. 지도기반 모바일 등록/열람</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>야외 현장에서도 스마트폰 지도로 주변 공실 확인 및 원터치 전화 연결</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>📝 4. 공동중개 등록 3건 무료</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>보유 매물을 전국 11만 부동산망에 즉시 노출! 3건까지 등록비 ZERO로 자유롭게 등록</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>💬 5. 11만 부동산 커뮤니티 무료</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>전국 공인중개사와 소통하며 비공개 특급 매물 정보를 자유롭게 교환</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>⚖️ 6. 경공매 물건 무료 열람</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>법원 실시간 경매·공매 물건 정보를 추가 비용 없이 100% 무료 제공</div>
            </div>
          </div>
        </section>

        {/* ━━━ 3. 3D 파스텔 아바타 후기 섹션 (11만 부동산 & 임대인 실제 증명) ━━━ */}
        <section style={{ padding: "36px 16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "0 0 6px 0", lineHeight: 1.35 }}>
              비싼 사설 공실망 월회비 부담?<br />
              <span style={{ color: "#2563eb" }}>11만 부동산과 임대인이 증명합니다</span>
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              가입비 0원, 월정액 0원!<br />100% 무료 실매물망으로 빠른 계약을 성사시킨 실제 이야기입니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PROOF_STORIES.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ width: 76, height: 76, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={item.image} alt={item.role} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", fontSize: 10.5, fontWeight: 800, padding: "2px 6px", borderRadius: 4, marginBottom: 4 }}>
                    {item.role}
                  </span>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.45, margin: "0 0 4px 0" }}>
                    {item.quote}
                  </p>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {item.author}
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

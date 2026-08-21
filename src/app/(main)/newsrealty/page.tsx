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
    imagePosition: "left",
  },
  {
    role: "상가·원룸 건물주 / 임대인",
    quote: "“수수료나 등록비 없이 스마트폰으로 공실 올렸더니, 그날 오후에 동네 부동산 대표님 3분에게 바로 연락 와서 주말에 계약 끝냈습니다.”",
    author: "경기 수원시 원룸 통건물주 정OO 대표",
    image: "/images/realty/avatar_landlord_success.jpg",
    imagePosition: "right",
  },
  {
    role: "소속공인중개사 2년차",
    quote: "“손님 모시고 임장 나갔을 때 모바일 지도로 주변 공실 실시간 확인하고, AI 매매 보고서 뽑아서 카톡 브리핑하니 고객 신뢰도가 급상승하더군요.”",
    author: "마포구 소속공인중개사 이OO 실장",
    image: "/images/realty/avatar_realtor_mobile.jpg",
    imagePosition: "left",
  },
  {
    role: "신규 개업 공인중개사",
    quote: "“기존 지역 친목회 가입비 수백만 원과 텃세 때문에 막막했는데, 공실뉴스 전국 11만 망 덕분에 타 지역 매물까지 자유롭게 공동중개 중입니다.”",
    author: "인천 연수구 개업공인중개사 김OO 대표",
    image: "/images/realty/avatar_young_broker.jpg",
    imagePosition: "right",
  },
  {
    role: "상가·오피스 전문 중개법인",
    quote: "“법원 등기소·토지대장 연동과 무료 경·공매 권리분석 덕분에 대형 통사옥 임대차 특약까지 한 치의 오차 없이 깔끔하게 계약 체결했습니다.”",
    author: "강남 테헤란로 중개법인 최OO 이사",
    image: "/images/realty/avatar_corporate_broker.jpg",
    imagePosition: "left",
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
    q: "스마트폰 모바일이나 외부 현장에서도 지도 열람이 가능한가요?",
    a: "네, 스마트폰 모바일 화면에 최적화되어 있으므로, 야외 현장에 나가 계시더라도 실시간 지도 기반으로 주변 공동중개 물건을 즉시 검색하고 중개사 연락처를 확인하실 수 있습니다.",
  },
  {
    q: "AI 매매 보고서는 어떻게 출력하고 활용하나요?",
    a: "매물 주소와 간단한 조건만 입력하면 1초 만에 고객 브리핑용 고품격 PDF 및 모바일 리포트가 완성되며, 인쇄하여 사무실 유리창 부착 및 고객 카톡 전송용으로 즉시 활용할 수 있습니다.",
  },
];

export default function NewsRealtyPage() {
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

  const handleApplyClick = (selectedComplex?: string, selectedRegion?: string, selectedCategory?: string) => {
    setFormData((prev) => ({
      ...prev,
      targetComplex: selectedComplex || prev.targetComplex || "",
      bizRegion: selectedRegion || prev.bizRegion || "",
      category: selectedCategory || prev.category || "아파트 전문",
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

      <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", backgroundColor: "#ffffff", color: "#1e293b", paddingBottom: 100 }}>
        
        {/* ━━━ 1. HERO BANNER (대한민국 11만 부동산을 위한 무료 공동중개 네트워크) ━━━ */}
        <section style={{ backgroundColor: "#091e3a", color: "#ffffff", padding: "80px 24px 70px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 2 }}>
            
            {/* 핵심 메인 배지 */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.35)", padding: "6px 20px", borderRadius: 30, fontSize: 14, fontWeight: 800, color: "#fbbf24", marginBottom: 22 }}>
              <span>✨</span>
              <span>공실뉴스 부동산이 되세요!</span>
            </div>

            {/* 메인 헤드라인 */}
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.35, letterSpacing: "-1.5px", margin: "0 0 18px 0" }}>
              부동산이세요?<br />
              <span style={{ color: "#fbbf24" }}>공동중개 등록/열람 평생 무료!</span>
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
                title="공실뉴스부동산 소개 영상"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* CTA 버튼 */}
            <div>
              <button
                onClick={() => handleApplyClick()}
                style={{
                  padding: "16px 38px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 17,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(37,99,235,0.4)",
                  transition: "all 0.2s",
                }}
              >
                ✨ 무료 공실뉴스부동산 신청하기 →
              </button>
            </div>

          </div>
        </section>

        {/* ━━━ 2. 3대 핵심 혜택 카드 (히어로 직하단) ━━━ */}
        <section style={{ padding: "40px 0 35px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 18 }}>
              
              {/* 1. 무료 공동중개망 */}
              <div style={{ background: "#ffffff", padding: "24px 20px", borderRadius: 14, border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", color: "#2563eb", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
                    <span>✓</span> 전국 부동산 누구나 가입하는
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", lineHeight: 1.4, marginBottom: 6 }}>
                    100% 무료 공동중개망
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    타사 월 10~20만원 회비 ZERO! 전국 11만 부동산 실매물 평생 무료 열람
                  </div>
                </div>
              </div>

              {/* 2. AI 물건보고서 */}
              <div style={{ background: "#ffffff", padding: "24px 20px", borderRadius: 14, border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fef3c7", color: "#d97706", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
                    <span>✓</span> 중개사에게 꼭 필요한
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", lineHeight: 1.4, marginBottom: 6 }}>
                    1초 완성 AI 물건보고서 3건 무료
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    지번만 입력하면 고객 브리핑용 고품격 매매·임대 제안서 1초 완성
                  </div>
                </div>
              </div>

              {/* 3. 경공매 무료 열람 */}
              <div style={{ background: "#ffffff", padding: "24px 20px", borderRadius: 14, border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#059669", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
                    <span>✓</span> 실시간 업데이트
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", lineHeight: 1.4, marginBottom: 6 }}>
                    전국 법원 경공매 물건 무료 열람
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    법원 실시간 경매·공매 물건 정보 및 권리분석 서식 100% 무료 제공
                  </div>
                </div>
              </div>

            </div>

            {/* 회원 유형 안내 */}
            <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "12px 18px", fontSize: 13, color: "#475569", lineHeight: 1.7, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", textAlign: "center" }}>
              <div>· <strong>일반회원</strong> : 공실등록 3건 무료, 경공매 열람 가능, 공동중개 열람 불가</div>
              <div>· <strong>부동산회원</strong> : 공동중개 3건 등록 무료, 경공매 열람 가능, <strong style={{ color: "#2563eb" }}>공동중개 열람 가능</strong></div>
            </div>
          </div>
        </section>

        {/* ━━━ 3. 5대 핵심 무료 혜택 상세 카드 (공실뉴스부동산 메인 가치) ━━━ */}
        <section style={{ padding: "75px 0", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                100% FREE BENEFITS
              </span>
              <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "8px 0 10px 0", letterSpacing: "-0.5px" }}>
                대한민국 11만 부동산을 위한 5대 핵심 무료 혜택
              </h2>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
                가입비 0원, 월정액 0원! 부동산 대표님들을 위해 100% 무료로 개방됩니다.
              </p>
            </div>

            {/* 5대 무료 카드 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              
              {/* 1. 공동중개 열람 무료 */}
              <div style={{ background: "#f8fafc", padding: "26px 22px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  🤝
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb", marginBottom: 4 }}>FREE BENEFIT 01</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>공동중개 열람 무료</h3>
                <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  타사 월 10~20만원 유료 회비 부담 ZERO! 전국 11만 공인중개사의 실매물 공동중개 정보를 평생 100% 무료로 무제한 열람합니다.
                </p>
              </div>

              {/* 2. 공동중개 등록 3건 무료 */}
              <div style={{ background: "#f8fafc", padding: "26px 22px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  📝
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb", marginBottom: 4 }}>FREE BENEFIT 02</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>공동중개 등록 3건 무료</h3>
                <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  보유 매물을 전국 11만 부동산망에 즉시 노출! 3건까지 등록비 ZERO로 자유롭게 공동중개 등록하여 빠른 계약을 성사시키세요.
                </p>
              </div>

              {/* 3. 지도기반 모바일 등록/열람 */}
              <div style={{ background: "#f8fafc", padding: "26px 22px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  📍
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb", marginBottom: 4 }}>FREE BENEFIT 03</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>지도기반 모바일 등록/열람</h3>
                <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  현장 어디서든 스마트폰 실시간 지도로 내 주변 공실과 공동중개 매물을 즉시 확인하고, 원터치 등록 및 중개사 전화 연결이 가능합니다.
                </p>
              </div>

              {/* 4. 매매 보고서 자동 작성 */}
              <div style={{ background: "#f8fafc", padding: "26px 22px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  📄
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb", marginBottom: 4 }}>FREE BENEFIT 04</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>매매 보고서 자동 작성</h3>
                <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  지번과 조건만 간단히 입력하면 AI가 고객 브리핑용 고품격 매매/임대 제안서와 유리창 부착용 리포트를 1초 만에 깔끔하게 자동 완성합니다.
                </p>
              </div>

              {/* 5. 커뮤니티 무료 */}
              <div style={{ background: "#f8fafc", padding: "26px 22px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  💬
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb", marginBottom: 4 }}>FREE BENEFIT 05</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>전국 11만 커뮤니티 무료</h3>
                <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  지역 텃세 없이 전국 11만 부동산 전문가들과 실전 계약 노하우, 특약 서식 원본, 정책 분석 및 공동중개 네트워크를 자유롭게 교류하세요.
                </p>
              </div>

              {/* 보너스: 경공매 권리분석 무료 */}
              <div style={{ background: "linear-gradient(135deg, #091e3a 0%, #1e3a8a 100%)", color: "#ffffff", padding: "26px 22px", borderRadius: 14, boxShadow: "0 4px 16px rgba(15,23,42,0.15)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(56,189,248,0.2)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                    ⚖️
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: "#38bdf8", marginBottom: 4 }}>SPECIAL BONUS</div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", margin: "0 0 8px 0" }}>전국 경·공매 권리분석 무료</h3>
                  <p style={{ fontSize: 13.5, color: "#bae6fd", lineHeight: 1.6, margin: 0 }}>
                    법원 및 캠코 공식 데이터 기반 전국 경·공매 유찰 물건 분석과 실무 특약 정보를 무료 열람할 수 있습니다.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ━━━ 3. 3D PASTEL AVATARS: 11만 부동산 & 임대인 실제 성공 증명 섹션 ━━━ */}
        <section style={{ padding: "80px 0 75px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "0 0 10px 0", letterSpacing: "-0.5px", lineHeight: 1.35 }}>
                비싼 사설 공실망 월회비, 아직도 내고 계신가요?<br />
                <span style={{ color: "#2563eb" }}>11만 부동산과 임대인이 직접 증명합니다</span>
              </h2>
              <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.6, margin: "0 0 4px 0" }}>
                가입비 0원, 월정액 0원!
              </p>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                100% 무료 실매물 공동중개 네트워크로 가장 빠르게 계약을 성사시킨 실제 현장 이야기입니다.
              </p>
            </div>

            {/* 5대 3D 아바타 교차 카드 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {PROOF_STORIES.map((item, idx) => {
                const isLeftImage = item.imagePosition === "left";
                return (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: "24px 30px",
                      display: "flex",
                      alignItems: "center",
                      gap: 32,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    }}
                  >
                    {/* 이미지 좌측 배치 */}
                    {isLeftImage && (
                      <div style={{ width: 160, height: 160, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                          src={item.image}
                          alt={item.role}
                          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                        />
                      </div>
                    )}

                    {/* 본문 텍스트 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 6, marginBottom: 10 }}>
                        {item.role}
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.55, margin: "0 0 10px 0", letterSpacing: "-0.2px" }}>
                        {item.quote}
                      </p>
                      <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                        {item.author}
                      </span>
                    </div>

                    {/* 이미지 우측 배치 */}
                    {!isLeftImage && (
                      <div style={{ width: 160, height: 160, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                          src={item.image}
                          alt={item.role}
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
              style={{
                padding: "16px 38px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                fontSize: 16.5,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
              }}
            >
              무료 공실뉴스부동산 신청하기 →
            </button>
          </div>
        </section>

      </div>

      {/* ━━━ 신청 모달 ━━━ */}
      {isApplicationOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 480, background: "#ffffff", borderRadius: 16, padding: "28px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                공실뉴스부동산 무료 신청서
              </h3>
              <button onClick={() => setIsApplicationOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>✕</button>
            </div>

            {isAppliedSuccessfully ? (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>신청이 정상 접수되었습니다!</h4>
                <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px 0" }}>담당자가 확인 후 빠른 시일 내에 안내 연락을 드리겠습니다.</p>
                <button onClick={() => { setIsApplicationOpen(false); setIsAppliedSuccessfully(false); }} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                  확인
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>중개업소 상호명 (또는 임대인 성명) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 공실뉴스공인중개사사무소"
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>주요 활동 지역 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 서울 강남구 역삼동"
                    value={formData.bizRegion}
                    onChange={(e) => setFormData({ ...formData, bizRegion: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>희망 대표 단지/건물명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 래미안역삼단지 또는 테헤란빌딩"
                    value={formData.targetComplex}
                    onChange={(e) => setFormData({ ...formData, targetComplex: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>주력 물건 유형</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                  >
                    <option value="아파트 전문">아파트 전문</option>
                    <option value="상가/오피스 전문">상가/오피스 전문</option>
                    <option value="원룸/오피스텔 전문">원룸/오피스텔 전문</option>
                    <option value="토지/공장/창고 전문">토지/공장/창고 전문</option>
                    <option value="경·공매 전문">경·공매 전문</option>
                  </select>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ width: "100%", padding: "12px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
                  >
                    {isSubmitting ? "신청서 접수 중..." : "무료 신청서 제출하기"}
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

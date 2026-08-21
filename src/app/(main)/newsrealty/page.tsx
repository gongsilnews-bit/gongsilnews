"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/client";
import { submitInquiry } from "@/app/actions/inquiry";

const brokerStats = [
  { label: "전국 가입 부동산", value: "11만+", sub: "대규모 네트워크 인프라" },
  { label: "공동중개 매물 공유", value: "실시간 조회", sub: "지도 기반 편리한 확인" },
  { label: "전국 경/공매 정보", value: "평생 무료", sub: "권리분석/뉴스 무료 열람" },
];

const PROOF_STORIES = [
  {
    role: "소속공인중개사 1년차",
    quote: "“블로그 글 1개 쓰는데 반나절 걸리던 제가, 공실뉴스 AI 프롬프트 쓰고 5분 만에 상위노출 글 3개를 뚝딱 완성했어요.”",
    author: "마포구 소속공인중개사 이OO 실장",
    image: "/images/study/avatar_realtor_female.jpg",
    imagePosition: "left",
  },
  {
    role: "50대 개업공인중개사",
    quote: "“컴맹이라 AI는 남 이야기인 줄 알았는데, 클릭 몇 번으로 매물 쇼츠 만들었더니 유튜브 보고 젊은 임차인 문의가 3배 폭증했네요.”",
    author: "강남구 개업공인중개사 박OO 대표",
    image: "/images/study/avatar_realtor_male.jpg",
    imagePosition: "right",
  },
  {
    role: "상가 건물주 / 임대인",
    quote: "“1년 넘게 공실이던 3층 통상가, 공실스터디에서 배운 타깃 마케팅과 AI 제안서로 2주 만에 우량 프랜차이즈 임대 맞췄습니다.”",
    author: "판교 상가 건물주 정OO 대표",
    image: "/images/study/avatar_landlord_male.jpg",
    imagePosition: "left",
  },
  {
    role: "부동산 유튜버 크리에이터",
    quote: "“고가 카메라 장비 없이 스마트폰과 AI 음성으로 부동산 브리핑 채널 시작해 구독자 1만 명 돌파하고 전속 매물 쏟아집니다.”",
    author: "유튜브 부동산 채널 운영자 김OO 대표",
    image: "/images/study/avatar_creator_male.jpg",
    imagePosition: "right",
  },
  {
    role: "경매 & 특수물건 실무자",
    quote: "“어려운 유찰 물건 권리분석부터 특약 작성까지, 1년 스터디 실무 서식 원본 덕분에 실수 없이 안전하게 계약 체결했어요.”",
    author: "경기 분당구 공인중개사 최OO 대표",
    image: "/images/study/avatar_senior_female.jpg",
    imagePosition: "left",
  },
];

const brokerFaqs = [
  {
    q: "공실뉴스는 정말 평생 무료인가요?",
    a: "네, 그렇습니다. 부동산회원 서비스는 가입비, 연회비, 월정액 이용료가 전혀 없는 100% 무료 서비스입니다. 타사 공실 사이트들의 월 10만원 이상 고정 회비 부담에서 벗어나 무료로 공동중개를 활성화하세요.",
  },
  {
    q: "타 사이트 및 지역 공동중개망과의 가장 큰 차이점은 무엇인가요?",
    a: "타사 공실 사이트는 높은 월정액을 요구하고, 기존 지역 공동중개 사이트(친목회 등)는 텃세와 카르텔로 신규 가입을 제한하거나 수백만 원의 가입비를 요구합니다. 반면 공실뉴스는 가입 제한 장벽이 전혀 없으며, 전국 11만 중개망을 평생 무료로 활용할 수 있습니다. 또한 지역의 상세 공실 소식 및 전문 부동산 뉴스까지 무료 개방하여 중개사님들의 정착을 지원합니다.",
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
        
        {/* ━━━ 1. HERO BANNER (윤자동 딥 포레스트 그린 테마) ━━━ */}
        <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "80px 24px 70px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", position: "relative", zIndex: 2 }}>
            
            {/* 뱃지 */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 18px", borderRadius: 30, fontSize: 13.5, fontWeight: 700, color: "#6ee7b7", marginBottom: 24 }}>
              <span>🏢</span>
              <span>전국 <strong style={{ color: "#34d399" }}>11만</strong> 공인중개사가 함께하는 공실뉴스</span>
            </div>

            {/* 메인 헤드라인 */}
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.35, letterSpacing: "-1.5px", margin: "0 0 18px 0" }}>
              내 지역 공실을 <span style={{ color: "#34d399" }}>등록만 하세요!</span><br />
              부동산 마케팅이 <span style={{ color: "#34d399" }}>자동</span>으로 시작됩니다.
            </h1>

            <p style={{ fontSize: 17, color: "#a7f3d0", lineHeight: 1.7, margin: "0 0 36px 0", wordBreak: "keep-all" }}>
              공실만 입력하면 완성되는 온/오프라인 AI 매매 보고서와 유튜브/블로그 포스팅,<br />
              AI 실무 부동산 유튜브 특강(드론영상 저작권 무료) 까지,<br />
              부동산 마케팅이 쉬워집니다.
            </p>

            {/* 유튜브 영상 프레임 */}
            <div style={{ maxWidth: 740, margin: "0 auto 36px", width: "100%", aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.5)", border: "1px solid #134e4a" }}>
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/14Ug16MNNh8?rel=0"
                title="공실뉴스부동산 소개 영상"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* 4대 혜택 체크리스트 */}
            <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", fontSize: 14, color: "#d1fae5", fontWeight: 700 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#34d399" }}>✓</span> 평생 100% 무료 회원
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#34d399" }}>✓</span> 실시간 공동중개망 연동
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#34d399" }}>✓</span> AI 매물 보고서 자동 생성
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#34d399" }}>✓</span> 전국 경·공매 권리분석 무료
              </span>
            </div>

            {/* CTA 버튼 */}
            <div style={{ marginTop: 36 }}>
              <button
                onClick={() => handleApplyClick()}
                style={{
                  padding: "16px 36px",
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 17,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(5,150,105,0.4)",
                  transition: "all 0.2s",
                }}
              >
                ✨ 무료 공실뉴스부동산 신청하기 →
              </button>
            </div>

          </div>
        </section>

        {/* ━━━ 2. 3D PASTEL AVATARS: 나이가 많아서요? 코딩/컴퓨터를 못해서요? (윤자동 증명 섹션) ━━━ */}
        <section style={{ padding: "80px 0 75px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#062828", margin: "0 0 10px 0", letterSpacing: "-0.5px", lineHeight: 1.35 }}>
                나이가 많아서요? 컴퓨터를 잘 못 다뤄서요?<br />
                <span style={{ color: "#059669" }}>초보라서 AI 마케팅이 어렵다고요?</span>
              </h2>
              <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.6, margin: "0 0 4px 0" }}>
                그 걱정, 이제 내려놓으셔도 됩니다.
              </p>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                공실만 등록하면 AI가 브리핑 영상부터 블로그 글, 매물 보고서까지 100% 자동으로 완성해 드립니다.
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
                      <div style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 6, marginBottom: 10 }}>
                        {item.role}
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: "#062828", lineHeight: 1.55, margin: "0 0 10px 0", letterSpacing: "-0.2px" }}>
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

        {/* ━━━ 3. 4대 마케팅 자동화 시스템 (상세 카드) ━━━ */}
        <section style={{ padding: "75px 0", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
                AUTOMATIC MARKETING
              </span>
              <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#062828", margin: "8px 0 10px 0", letterSpacing: "-0.5px" }}>
                공실 등록 시 100% 자동 완성되는 4대 시스템
              </h2>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
                어려운 마케팅 작업은 AI에게 맡기고, 대표님은 계약과 중개에만 집중하세요.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              
              <div style={{ background: "#ffffff", padding: "26px 24px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  📄
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>1. AI 매매·임대 보고서 자동 생성</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  매물 주소와 조건만 입력하면 고객 브리핑용 고품격 PDF 및 모바일 리포트가 즉시 생성됩니다.
                </p>
              </div>

              <div style={{ background: "#ffffff", padding: "26px 24px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  🎬
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>2. 유튜브 매물 쇼츠 & 드론 영상</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  저작권 걱정 없는 드론 항공 영상과 AI 보이스로 1분 만에 유튜브 쇼츠와 릴스를 완성합니다.
                </p>
              </div>

              <div style={{ background: "#ffffff", padding: "26px 24px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  ✍️
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>3. 네이버 블로그 상위노출 포스팅</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  지역 키워드와 단지 특성을 완벽 분석한 전문 홍보 원고를 클릭 한 번으로 작성 및 배포합니다.
                </p>
              </div>

              <div style={{ background: "#ffffff", padding: "26px 24px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>
                  🤝
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>4. 전국 11만 공동중개망 실시간 매칭</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                  등록 즉시 전국의 매칭 공인중개사에게 알림이 전송되어 공동중개 계약 성사율이 극대화됩니다.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ━━━ 4. 3대 핵심 수치 STATS ━━━ */}
        <section style={{ padding: "50px 0", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {brokerStats.map((st, i) => (
              <div key={i} style={{ background: "#f8fafc", padding: "24px 20px", borderRadius: 14, border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, marginBottom: 6 }}>{st.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#062828", marginBottom: 4 }}>{st.value}</div>
                <div style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>{st.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ 5. FAQ 아코디언 ━━━ */}
        <section style={{ padding: "75px 0", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ maxWidth: 840, margin: "0 auto", padding: "0 24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
                FAQ
              </span>
              <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#062828", margin: "6px 0 0 0" }}>
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
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#062828" }}>Q. {faq.q}</span>
                      <span style={{ fontSize: 13, color: "#059669", fontWeight: 800 }}>{isOpen ? "▲" : "▼"}</span>
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

        {/* ━━━ 6. 하단 CTA 배너 ━━━ */}
        <section style={{ padding: "70px 24px", backgroundColor: "#062326", color: "#ffffff", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>
              내 지역 공실등록, 지금 바로 시작하세요
            </h2>
            <p style={{ fontSize: 15.5, color: "#a7f3d0", lineHeight: 1.6, margin: "0 0 28px 0" }}>
              가입비 0원, 월정액 0원으로 전국 11만 부동산 네트워크와 AI 자동 마케팅을 누려보세요.
            </p>
            <button
              onClick={() => handleApplyClick()}
              style={{
                padding: "16px 36px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                fontSize: 16.5,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(5,150,105,0.4)",
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
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: 0 }}>
                공실뉴스부동산 신청서
              </h3>
              <button onClick={() => setIsApplicationOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>✕</button>
            </div>

            {isAppliedSuccessfully ? (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>신청이 정상 접수되었습니다!</h4>
                <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px 0" }}>담당자가 확인 후 빠른 시일 내에 안내 연락을 드리겠습니다.</p>
                <button onClick={() => { setIsApplicationOpen(false); setIsAppliedSuccessfully(false); }} style={{ padding: "10px 24px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                  확인
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>중개업소 상호명 *</label>
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
                    style={{ width: "100%", padding: "12px 0", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
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

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
    quote: "“블로그 글 1개 쓰는데 반나절 걸리던 제가, AI 프롬프트 쓰고 5분 만에 상위노출 글을 뚝딱 완성했어요.”",
    author: "마포구 소속공인중개사 이OO 실장",
    image: "/images/study/avatar_realtor_female.jpg",
  },
  {
    role: "50대 개업공인중개사",
    quote: "“컴맹이라 AI는 남 이야기인 줄 알았는데, 클릭 몇 번으로 매물 쇼츠 만들었더니 유튜브 보고 젊은 임차인 문의가 3배 폭증했네요.”",
    author: "강남구 개업공인중개사 박OO 대표",
    image: "/images/study/avatar_realtor_male.jpg",
  },
  {
    role: "상가 건물주 / 임대인",
    quote: "“1년 넘게 공실이던 3층 통상가, 공실스터디에서 배운 타깃 마케팅으로 2주 만에 우량 프랜차이즈 임대 맞췄습니다.”",
    author: "판교 상가 건물주 정OO 대표",
    image: "/images/study/avatar_landlord_male.jpg",
  },
  {
    role: "부동산 유튜버 크리에이터",
    quote: "“고가 장비 없이 AI 음성으로 부동산 브리핑 채널 시작해 구독자 1만 명 돌파하고 전속 매물 쏟아집니다.”",
    author: "유튜브 채널 운영자 김OO 대표",
    image: "/images/study/avatar_creator_male.jpg",
  },
  {
    role: "경매 & 특수물건 실무자",
    quote: "“어려운 유찰 물건 권리분석부터 특약 작성까지, 1년 스터디 실무 서식 원본 덕분에 안전하게 계약 체결했어요.”",
    author: "경기 분당구 공인중개사 최OO 대표",
    image: "/images/study/avatar_senior_female.jpg",
  },
];

const brokerFaqs = [
  {
    q: "공실뉴스는 정말 평생 무료인가요?",
    a: "네, 그렇습니다. 부동산회원 서비스는 가입비, 연회비, 월정액 이용료가 전혀 없는 100% 무료 서비스입니다. 타사 공실 사이트들의 월 10만원 이상 고정 회비 부담에서 벗어나 무료로 공동중개를 활성화하세요.",
  },
  {
    q: "타 사이트 및 지역 공동중개망과의 가장 큰 차이점은 무엇인가요?",
    a: "타사 공실 사이트는 높은 월정액을 요구하고, 기존 지역 공동중개 사이트(친목회 등)는 텃세와 카르텔로 신규 가입을 제한하거나 수백만 원의 가입비를 요구합니다. 반면 공실뉴스는 가입 제한 장벽이 전혀 없으며, 전국 11만 중개망을 평생 무료로 활용할 수 있습니다.",
  },
  {
    q: "스마트폰 모바일에서도 지도 열람이 가능한가요?",
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

        {/* ━━━ 1. 모바일 히어로 배너 (블루 & 딥 네이비) ━━━ */}
        <section style={{ backgroundColor: "#091e3a", color: "#ffffff", padding: "28px 16px 36px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.35)", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#38bdf8", marginBottom: 14 }}>
            <span>🏢</span>
            <span>전국 <strong style={{ color: "#60a5fa" }}>11만</strong> 부동산과 함께하는 공실뉴스</span>
          </div>

          <h1 style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.5px", margin: "0 0 12px 0" }}>
            내 지역 공실을 <span style={{ color: "#38bdf8" }}>등록만 하세요!</span><br />
            부동산 마케팅이 <span style={{ color: "#38bdf8" }}>자동</span>으로 시작됩니다.
          </h1>

          <p style={{ fontSize: 13, color: "#bae6fd", lineHeight: 1.55, margin: "0 0 22px 0", wordBreak: "keep-all" }}>
            공실만 입력하면 완성되는 온/오프라인 AI 매매 보고서와 유튜브/블로그 포스팅, AI 실무 부동산 특강까지 무료로 제공됩니다.
          </p>

          {/* 유튜브 비디오 프레임 */}
          <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: "1px solid #1e3a8a", marginBottom: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
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

        {/* ━━━ 2. 3D 파스텔 아바타 후기 섹션 (블루 톤) ━━━ */}
        <section style={{ padding: "36px 16px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "0 0 6px 0", lineHeight: 1.35 }}>
              나이가 많아서요? 컴맹이라서요?<br />
              <span style={{ color: "#2563eb" }}>초보라서 못 할 것 같다고요?</span>
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              그 걱정, 이제 내려놓으셔도 됩니다.<br />먼저 해내신 분들이 증명했거든요.
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

        {/* ━━━ 3. 4대 마케팅 자동화 시스템 (블루) ━━━ */}
        <section style={{ padding: "36px 16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#2563eb" }}>AUTOMATIC MARKETING</span>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "4px 0 0 0" }}>
              공실 등록 시 100% 자동 완성
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#ffffff", padding: "16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>📄 1. AI 매매·임대 보고서 자동 생성</div>
              <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>매물 입력 시 고객 브리핑용 고품격 PDF/모바일 리포트 즉시 완성</div>
            </div>

            <div style={{ background: "#ffffff", padding: "16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>🎬 2. 유튜브 매물 쇼츠 & 드론 영상</div>
              <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>저작권 무료 드론 영상과 AI 보이스로 1분 만에 매물 쇼츠 제작</div>
            </div>

            <div style={{ background: "#ffffff", padding: "16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>✍️ 3. 블로그 상위노출 원클릭 포스팅</div>
              <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>지역 키워드 최적화 전문 원고를 AI가 자동 작성 및 배포</div>
            </div>

            <div style={{ background: "#ffffff", padding: "16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>🤝 4. 전국 11만 공동중개망 실시간 매칭</div>
              <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>전국 중개사 네트워크로 매물이 즉시 공유되어 빠른 계약 성사</div>
            </div>
          </div>
        </section>

        {/* ━━━ 4. 3대 핵심 수치 ━━━ */}
        <section style={{ padding: "28px 16px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {brokerStats.map((st, i) => (
              <div key={i} style={{ background: "#f8fafc", padding: "14px 8px", borderRadius: 10, border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 2 }}>{st.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{st.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ 5. FAQ ━━━ */}
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
                공실뉴스부동산 신청서
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
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 3 }}>중개업소 상호명 *</label>
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

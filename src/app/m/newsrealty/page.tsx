"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const benefits: {
  num: string;
  tag: string;
  title: React.ReactNode;
  modalTitle: string;
  desc: string;
  videoUrl: string;
  videoBullets: string[];
  badgeBg: string;
  badgeColor: string;
  numColor: string;
}[] = [
  {
    num: "01",
    tag: "기본 혜택",
    title: (
      <>
        공실 20건 &<br />
        매월 언론 기사 4건 등록
      </>
    ),
    modalTitle: "공실 20건 & 매월 언론 기사 4건 등록",
    videoUrl: "https://www.youtube.com/embed/4a3_M6-Crew?autoplay=1&rel=0",
    videoBullets: [
      "전국 11만 공인중개사가 실시간 무료 열람하는 공실뉴스에 매월 20건 공실 매물 등록",
      "네이버 등 주요 포털 검색 및 언론 매체에 정식 송출되는 공식 뉴스기사 매월 4건 발행 권한",
      "단순 매물 광고를 넘어 언론 보도로 신뢰도와 전속 계약 확률을 대폭 극대화"
    ],
    desc: "전국 11만 부동산이 무료 열람할 수 있는 공실뉴스에 공실 매물 20건과 매월 기사 4건을 등록·홍보할 수 있습니다.",
    badgeBg: "#fff2e8",
    badgeColor: "#ea580c",
    numColor: "#ff8e15",
  },
  {
    num: "02",
    tag: "AI 원클릭",
    title: (
      <>
        유튜브 대본부터<br />
        블로그 포스팅까지 AI 원클릭 생성
      </>
    ),
    modalTitle: "유튜브 대본부터 블로그 포스팅까지 AI 원클릭 생성",
    videoUrl: "https://www.youtube.com/embed/4a3_M6-Crew?autoplay=1&rel=0",
    videoBullets: [
      "공실 매물 정보 입력 즉시 AI가 자동으로 정밀 분석 및 보도기사 초안 완성",
      "네이버 블로그 검색 상위 노출에 최적화된 포스팅 글 원클릭 자동 생성",
      "1분 쇼츠 및 릴스 제작용 유튜브 영상 대본까지 한 번에 자동 추출하여 제작 부담 0%"
    ],
    desc: "등록한 공실 매물 데이터를 기반으로, AI가 뉴스 기사 초안부터 네이버 블로그 글, 유튜브 쇼츠 대본까지 단 한 번의 클릭으로 자동 완성합니다.",
    badgeBg: "#eff6ff",
    badgeColor: "#1d4ed8",
    numColor: "#3b82f6",
  },
  {
    num: "03",
    tag: "수익 다각화",
    title: (
      <>
        지역 독점 로컬기자로<br />
        새로운 언론 광고수익 창출
      </>
    ),
    modalTitle: "지역 독점 로컬기자로 새로운 언론 광고수익 창출",
    videoUrl: "https://www.youtube.com/embed/4a3_M6-Crew?autoplay=1&rel=0",
    videoBullets: [
      "내 관할 지역의 공실뉴스 공식 '로컬기자부동산' 단독 취재 및 영업 권한 부여",
      "지역 건물주, 상가 점주, 기업을 대상으로 배너 광고 및 기사형 홍보 영업 진행",
      "단순 중개보수 수입에 그치지 않고, 매월 안정적인 언론 미디어 광고 수익을 추가 창출"
    ],
    desc: "단순 중개보수에 머물지 않고, 지역 건물주 및 상가 사업자를 대상으로 배너 광고, 기사형 홍보 등 언론사 광고 영업을 통해 추가 수익을 만듭니다.",
    badgeBg: "#fef3c7",
    badgeColor: "#b45309",
    numColor: "#f59e0b",
  },
];

const faqs = [
  {
    q: "공실뉴스부동산은 어떤 서비스인가요?",
    a: "매물만 광고하는 중개사무소에서 벗어나, 우리 지역의 공실·매물·상권 소식을 뉴스와 미디어 콘텐츠로 전달하며 지역을 대표하는 1위 부동산으로 성장하도록 돕는 파트너십입니다.",
  },
  {
    q: "초보 공인중개사도 콘텐츠를 만들 수 있나요?",
    a: "네, 공실뉴스의 원클릭 AI 초안 작성기를 통해 1분 만에 기사, 블로그, 쇼츠 대본까지 완벽히 생성되므로 누구나 쉽게 운영할 수 있습니다.",
  },
  {
    q: "신청 절차는 어떻게 되나요?",
    a: "신청서 제출 후 담당 매니저가 중개사무소 확인을 거쳐 전용 파트너 권한 및 콘텐츠 제작 가이드를 제공해 드립니다.",
  },
];

export default function MobileNewsRealtyPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedVideoBenefit, setSelectedVideoBenefit] = useState<any>(null);

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
    router.push("/m/newsrealty/apply");
  };

  const handleGeneralLoginClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    if (user) {
      router.push("/m/admin/dashboard");
    } else {
      router.push("/m/login?returnTo=" + encodeURIComponent("/m/admin/dashboard"));
    }
  };

  return (
    <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", backgroundColor: "#ffffff", color: "#1e293b", paddingBottom: 90, paddingTop: 50, overflowX: "hidden" }}>
      
      {/* ── 고정 상단 헤더 ── */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 50,
        background: "#181411",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        boxSizing: "border-box"
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#ffb347", padding: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
          공실뉴스부동산
        </div>
        <Link href="/" style={{ color: "#ffb347", fontSize: 13, textDecoration: "none", fontWeight: 700 }}>
          홈으로
        </Link>
      </div>

      {/* ── 스타일 ── */}
      <style>{`
        .m-cta-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px 20px;
          background: #ff8e15;
          color: #ffffff;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -0.3px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(255, 142, 21, 0.35);
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .m-cta-btn:active {
          background: #e67e10;
          transform: scale(0.98);
        }

        .m-flow-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #ffffff;
          border: 1px solid #fed7aa;
          border-radius: 14px;
          padding: 14px 18px;
          box-shadow: 0 2px 8px rgba(255, 142, 21, 0.04);
        }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HERO SECTION (모바일: 웜 다크 & 코랄 오렌지)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        backgroundColor: "#181411",
        color: "#ffffff",
        padding: "50px 20px 54px",
        textAlign: "center"
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255, 142, 21, 0.14)",
          border: "1px solid rgba(255, 142, 21, 0.38)",
          padding: "6px 16px",
          borderRadius: 24,
          fontSize: 12.5,
          fontWeight: 800,
          color: "#ffb347",
          marginBottom: 20
        }}>
          <span>공실뉴스부동산이란?</span>
        </div>

        <h1 style={{
          fontSize: 32,
          fontWeight: 900,
          lineHeight: 1.35,
          letterSpacing: "-1px",
          margin: "0 0 18px 0",
          color: "#ffffff",
          wordBreak: "keep-all"
        }}>
          내 지역의 공실을<br />
          <span style={{ color: "#ff8e15" }}>뉴스로 전달하다</span>
        </h1>

        <div style={{
          fontSize: 16,
          color: "#e2e8f0",
          lineHeight: 1.65,
          margin: "0 0 26px 0",
          wordBreak: "keep-all",
          fontWeight: 500
        }}>
          매물만 광고하는 부동산에서<br />
          <strong style={{ color: "#ffffff", fontSize: 17.5, fontWeight: 900, borderBottom: "2px solid #ff8e15", paddingBottom: "1px" }}>
            지역 부동산 정보를 전달하는 "로컬기자부동산"으로
          </strong>
        </div>

        <div>
          <button
            onClick={handleApplyClick}
            className="m-cta-btn"
          >
            <span>공실뉴스부동산 신청하기</span>
            <span>➔</span>
          </button>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. 무엇이 좋아질까요? (모바일 3 Core Benefits)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "50px 20px", backgroundColor: "#ffffff" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#ea580c", letterSpacing: "1px" }}>
            ADVANTAGES
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#1c1917", margin: "6px 0 8px 0", letterSpacing: "-0.5px" }}>
            무엇이 좋아질까요?
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0, wordBreak: "keep-all" }}>
            공실뉴스부동산이 되시면, 부동산마케팅이 쉬워집니다.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {benefits.map((b) => (
            <div key={b.num} style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "22px 18px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: b.numColor, lineHeight: 1 }}>
                  {b.num}
                </span>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: 16,
                  background: b.badgeBg,
                  fontSize: 12,
                  fontWeight: 800,
                  color: b.badgeColor
                }}>
                  {b.tag}
                </span>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", lineHeight: 1.45, margin: "0 0 8px 0", wordBreak: "keep-all" }}>
                {b.title}
              </h3>

              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.65, margin: 0, wordBreak: "keep-all" }}>
                {b.desc}
              </p>

              <div 
                onClick={() => setSelectedVideoBenefit(b)}
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#ff8e15",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span>▶</span>
                  <span>영상으로 상세보기</span>
                </span>
                <span>➔</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. 공실이 콘텐츠가 됩니다 (모바일 파이프라인)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "48px 20px", backgroundColor: "#fffbf7", borderBottom: "1px solid #fed7aa" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: 16, background: "#fff2e8", color: "#ea580c", fontWeight: 800, fontSize: 12, marginBottom: 10 }}>
            CONTENT PIPELINE
          </div>
          <h2 style={{ fontSize: 25, fontWeight: 900, color: "#1c1917", margin: "0 0 10px 0", letterSpacing: "-0.5px" }}>
            내가 기사를 쓸 수 있을까??
          </h2>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0, wordBreak: "keep-all" }}>
            공실뉴스에 공실을 등록하고, AI가 알아서 기사 초안을 작성합니다.
          </p>
        </div>

        {/* 파이프라인 단계 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {[
            {
              step: "01",
              icon: "🏢",
              title: "공동중개 등록",
              badge: "#11만 무료열람",
              sub: "전국 중개망 실시간 무료 노출",
              badgeBg: "#fff2e8",
              badgeColor: "#ea580c",
            },
            {
              step: "02",
              icon: "📊",
              title: "AI 매물보고서",
              badge: "#10초 완성",
              sub: "임대인·고객 맞춤 브리핑 리포트",
              badgeBg: "#eff6ff",
              badgeColor: "#2563eb",
            },
            {
              step: "03",
              icon: "📰",
              title: "AI 기사초안 작성",
              badge: "#10초 완성",
              sub: "포털 송출용 정식 뉴스 기사 생성",
              badgeBg: "#fef3c7",
              badgeColor: "#b45309",
            },
            {
              step: "04",
              icon: "🎬",
              title: "기사·유튜브·블로그",
              badge: "#AI 초안작성",
              sub: "SNS 멀티채널 원클릭 동시 확산",
              badgeBg: "#f5f3ff",
              badgeColor: "#7c3aed",
            },
            {
              step: "05",
              icon: "💼",
              title: "뉴스 광고영업",
              badge: "#신축·분양·로컬",
              sub: "지역 언론 미디어 추가 광고수익",
              badgeBg: "#ecfdf5",
              badgeColor: "#059669",
            },
          ].map((item) => (
            <div key={item.step} className="m-flow-item">
              <div style={{ fontSize: 26, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8" }}>
                      STEP {item.step}
                    </span>
                    <span style={{ fontSize: 15.5, fontWeight: 900, color: "#1c1917" }}>
                      {item.title}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: item.badgeColor,
                    background: item.badgeBg,
                    padding: "2px 7px",
                    borderRadius: 10
                  }}>
                    {item.badge}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 500 }}>
                  {item.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: "#ffffff",
          border: "1px solid #fed7aa",
          borderRadius: 14,
          padding: "20px 18px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(255, 142, 21, 0.06)"
        }}>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: "#1c1917", marginBottom: 8, wordBreak: "keep-all", lineHeight: 1.45 }}>
            "공실뉴스기자가 되시면, AI 물건보고서부터 기사 / 유튜브 대본 / 블로그 글까지<br />쉽게 완성하실 수 있습니다."
          </div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, wordBreak: "keep-all" }}>
            부동산 중개와 뉴스 광고영업까지, 공실뉴스부동산이 되시면 AI로 콘텐츠 제작이 쉬워집니다.
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. 매물을 받으러 가지 말고 뉴스를 취재하러 가세요 (모바일)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        backgroundColor: "#181411",
        color: "#ffffff",
        padding: "54px 20px",
        textAlign: "center"
      }}>
        <div style={{
          display: "inline-block",
          background: "rgba(255, 142, 21, 0.14)",
          border: "1px solid rgba(255, 142, 21, 0.38)",
          color: "#ffb347",
          padding: "5px 14px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 16
        }}>
          영업의 패러다임 전환
        </div>

        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          lineHeight: 1.35,
          letterSpacing: "-1px",
          margin: "0 0 28px 0",
          wordBreak: "keep-all"
        }}>
          매물을 받으러 가지 말고,<br />
          <span style={{ color: "#ff8e15" }}>뉴스를 취재하러 가세요.</span>
        </h2>

        {/* 2단 비교 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28, textAlign: "left" }}>
          
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: "20px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", padding: "4px 10px", borderRadius: 4, fontSize: 11.5, fontWeight: 700 }}>
                ❌ 기존 방식
              </div>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>단순 중개 영업</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <img
                src="/images/realty/sales_old_way.png"
                alt="기존 영업 방식"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #fee2e2",
                  flexShrink: 0
                }}
              />
              <div style={{ fontSize: 16, color: "#334155", fontWeight: 800, lineHeight: 1.4, wordBreak: "keep-all" }}>
                “대표님, 매물 있으세요?”
              </div>
            </div>

            <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55, wordBreak: "keep-all" }}>
              수많은 부동산 중 하나로 인식되어 건물주의 경계심과 피로도를 유발하는 전형적인 '을'의 영업
            </div>
          </div>

          <div style={{
            background: "#ffffff",
            border: "2px solid #ff8e15",
            borderRadius: 16,
            padding: "20px 18px",
            boxShadow: "0 6px 20px rgba(255, 142, 21, 0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "inline-block", background: "#fff2e8", color: "#ea580c", padding: "4px 10px", borderRadius: 4, fontSize: 11.5, fontWeight: 800 }}>
                ✅ 공실뉴스부동산
              </div>
              <span style={{ fontSize: "11px", color: "#ff8e15", fontWeight: 800 }}>언론 취재형 2단계 영업</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <img
                src="/images/realty/sales_news_way.png"
                alt="공실뉴스부동산 영업 방식"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #fed7aa",
                  flexShrink: 0,
                  marginTop: 2
                }}
              />
              <div style={{ fontSize: 16, color: "#1c1917", fontWeight: 900, lineHeight: 1.45, wordBreak: "keep-all" }}>
                “사장님, 공실 등록 무료로 해드릴게요.<br />
                <span style={{ color: "#ff8e15" }}>그런데… 뉴스 기사 광고도 한번 내보시는 건 어떠세요?”</span>
              </div>
            </div>

            <div style={{ fontSize: 12.5, color: "#9a3412", lineHeight: 1.55, fontWeight: 600, wordBreak: "keep-all" }}>
              거절 없는 무료 공실 등록으로 문을 열고, 지역 언론 기사 광고로 고수익까지 창출하는 당당한 취재형 영업
            </div>
          </div>

        </div>

        <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>
          뉴스가 새로운 영업의 시작이 됩니다.
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. 플랜 비교 (모바일 요금 안내 & 플랜 비교)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "54px 18px", backgroundColor: "#f8fafc", borderTop: "1px solid #eaedf0", borderBottom: "1px solid #eaedf0", textAlign: "center" }}>
        
        {/* 상단 뱃지 */}
        <div style={{
          display: "inline-block",
          background: "rgba(255, 142, 21, 0.12)",
          border: "1px solid rgba(255, 142, 21, 0.3)",
          color: "#ea580c",
          padding: "5px 14px",
          borderRadius: 20,
          fontSize: "12px",
          fontWeight: 800,
          marginBottom: 14
        }}>
          가입비 0원 · 연회비 0원
        </div>

        <h2 style={{
          fontSize: 25,
          fontWeight: 900,
          color: "#1c1917",
          letterSpacing: "-1px",
          margin: "0 0 10px 0",
          wordBreak: "keep-all",
          lineHeight: 1.35
        }}>
          <span style={{ color: "#ff8e15" }}>월 3만 원</span>으로<br />
          지역 1등 로컬기자가 되세요
        </h2>

        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 28px 0", lineHeight: 1.55, wordBreak: "keep-all" }}>
          일반 부동산 무료 회원과 공실뉴스부동산 파트너의 혜택 차이를 확인해 보세요.
        </p>

        {/* 2개 플랜 카드 스택 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "left" }}>
          
          {/* 1. 공실뉴스부동산 - 모바일 상단 우선 노출 및 하이라이트 */}
          <div style={{
            background: "#ffffff",
            border: "2px solid #ff8e15",
            borderRadius: 18,
            padding: "26px 20px",
            boxShadow: "0 10px 30px rgba(255, 142, 21, 0.16)",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: -12,
              left: 20,
              background: "linear-gradient(135deg, #ff8e15 0%, #e67e10 100%)",
              color: "#ffffff",
              padding: "3px 12px",
              borderRadius: 14,
              fontSize: "11px",
              fontWeight: 900,
              boxShadow: "0 2px 8px rgba(255, 142, 21, 0.35)"
            }}>
              🔥 강력 추천 플랜
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, marginTop: 4 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "#1c1917", margin: 0 }}>
                공실뉴스부동산
              </h3>
              <span style={{ fontSize: 11, fontWeight: 800, background: "#fff2e8", color: "#ea580c", padding: "3px 8px", borderRadius: 12 }}>
                로컬기자 전용
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#1c1917", letterSpacing: "-0.5px" }}>
                ₩30,000
                <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginLeft: 4 }}>
                  / 월 (VAT 포함)
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: "#ff8e15", fontWeight: 700, margin: "4px 0 0" }}>
                가입비 0원 · 연회비 0원 · 언제든 해지 가능
              </p>
            </div>

            <button
              onClick={handleApplyClick}
              style={{
                width: "100%",
                height: 46,
                backgroundColor: "#ff8e15",
                border: "none",
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 800,
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(255, 142, 21, 0.28)",
                marginBottom: 20
              }}
            >
              공실뉴스부동산 신청하기 ➔
            </button>

            <div style={{ borderTop: "1px solid #fed7aa", paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1c1917", marginBottom: 12 }}>
                포함된 모든 전용 혜택
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>공실 등록 : <strong>월 20건</strong> (11만 중개망 실시간 노출)</span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>기사 등록 : <strong>월 4건 정식 송고</strong> (뉴스 포털)</span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>물건 보고서 : <strong style={{ color: "#ff8e15" }}>AI 물건보고서 전체 무제한 생성</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>광고 등록 : <strong>포털 내 매물 광고 등록 가능</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>광고 영업 : <strong style={{ color: "#ea580c" }}>뉴스 광고영업 가능 (영업비 20~50% 지급)</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>커뮤니티 : <strong>공실뉴스 정회원 커뮤니티 가입</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>자료실 : <strong>실무 서식·특약·계약서 무료 다운</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>드론 영상 : <strong>고화질 드론 영상 저작권 무료 상업 이용</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#1c1917" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                  <span>공실 스터디 : <strong>실무 마케팅 강좌 일부 무료 수강</strong></span>
                </li>
              </ul>
            </div>
          </div>

          {/* 2. 일반부동산 (무료) */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: "24px 20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#475569", margin: 0 }}>
                일반부동산
              </h3>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "3px 8px", borderRadius: 12 }}>
                기본 플랜
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#334155" }}>
                ₩0
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginLeft: 4 }}>
                  / 평생 무료
                </span>
              </div>
            </div>

            <button
              onClick={handleGeneralLoginClick}
              style={{
                width: "100%",
                height: 46,
                backgroundColor: "#1e293b",
                border: "none",
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 800,
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(30, 41, 59, 0.15)",
                marginBottom: 20
              }}
            >
              {user ? "일반부동산 바로가기 ➔" : "로그인 ➔"}
            </button>

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
                  <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                  <span>공실 등록 : <strong>최초 3건</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
                  <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                  <span>기사 등록 : <strong>최초 3건</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
                  <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                  <span>물건 보고서 : <strong>일부 기본 열람</strong></span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
                  <span style={{ color: "#cbd5e1" }}>✕</span>
                  <span style={{ textDecoration: "line-through" }}>광고 등록 : 불가</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
                  <span style={{ color: "#cbd5e1" }}>✕</span>
                  <span style={{ textDecoration: "line-through" }}>뉴스 광고영업 : 불가</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
                  <span style={{ color: "#cbd5e1" }}>✕</span>
                  <span style={{ textDecoration: "line-through" }}>정회원 커뮤니티 : 이용 불가</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
                  <span style={{ color: "#cbd5e1" }}>✕</span>
                  <span style={{ textDecoration: "line-through" }}>실무 자료실 다운 : 불가</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
                  <span style={{ color: "#cbd5e1" }}>✕</span>
                  <span style={{ textDecoration: "line-through" }}>드론 영상 무료 : 불가</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
                  <span style={{ color: "#cbd5e1" }}>✕</span>
                  <span style={{ textDecoration: "line-through" }}>공실스터디 강좌 : 이용 불가</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. 내 지역/단지 로컬 부동산 기자가 되세요! (모바일 Closing)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "50px 20px", textAlign: "center", backgroundColor: "#ffffff" }}>
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          color: "#1c1917",
          letterSpacing: "-1px",
          margin: "0 0 14px 0",
          wordBreak: "keep-all",
          lineHeight: 1.35
        }}>
          내 지역/단지<br />
          <span style={{ color: "#ff8e15" }}>로컬 부동산 기자가 되세요!</span>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#ff8e15", marginTop: 8, letterSpacing: "-0.3px" }}>
            부동산중개 + 지역부동산기자
          </div>
        </h2>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#fffbf7",
          border: "1px solid #fed7aa",
          padding: "8px 16px",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 800,
          color: "#1c1917",
          marginBottom: 22
        }}>
          <span>부동산</span>
          <span style={{ color: "#ff8e15" }}>×</span>
          <span>뉴스</span>
          <span style={{ color: "#ff8e15" }}>×</span>
          <span>유튜브</span>
          <span style={{ color: "#ff8e15" }}>×</span>
          <span>블로그</span>
        </div>

        <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.7, marginBottom: 28, wordBreak: "keep-all" }}>
          내 지역의 공실을 가장 잘 아는 사람.<br />
          내 지역의 부동산 소식을 가장 먼저 전달하는 사람.
          <div style={{ fontSize: 24, fontWeight: 900, color: "#1c1917", marginTop: 10 }}>
            공실뉴스부동산
          </div>
        </div>

        <div>
          <button
            onClick={handleApplyClick}
            className="m-cta-btn"
          >
            <span>공실뉴스부동산 신청하기</span>
            <span>➔</span>
          </button>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. 자주 묻는 질문 (FAQ)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "40px 20px 60px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "0 0 20px 0", textAlign: "center" }}>
          자주 묻는 질문 (FAQ)
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: "#ffffff",
                  border: isOpen ? "1px solid #059669" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  overflow: "hidden"
                }}
              >
                <div
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                    <span style={{ color: "#059669", fontWeight: 900, fontSize: 15 }}>Q.</span>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: "#1e293b" }}>{faq.q}</span>
                  </div>
                  <span style={{
                    fontSize: 14,
                    color: "#94a3b8",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s"
                  }}>
                    ▼
                  </span>
                </div>

                {isOpen && (
                  <div style={{
                    padding: "0 18px 16px 18px",
                    fontSize: 13.5,
                    color: "#475569",
                    lineHeight: 1.65,
                    borderTop: "1px solid #f1f5f9",
                    textAlign: "left"
                  }}>
                    <p style={{ margin: "12px 0 0 0" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 하단 고정 플로팅 바 ── */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        padding: "12px 16px",
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid #e2e8f0",
        boxSizing: "border-box",
        zIndex: 40
      }}>
        <button
          onClick={handleApplyClick}
          className="m-cta-btn"
          style={{ padding: "14px 20px", fontSize: 16 }}
        >
          <span>공실뉴스부동산 신청하기</span>
          <span>➔</span>
        </button>
      </div>

      {/* ── 모바일 비디오 팝업 모달 ── */}
      {selectedVideoBenefit && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setSelectedVideoBenefit(null)}
        >
          <div 
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 18,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              position: "relative",
              border: "1px solid rgba(255, 142, 21, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 팝업 헤더 */}
            <div style={{
              padding: "16px 18px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  padding: "3px 8px",
                  borderRadius: 10,
                  background: selectedVideoBenefit.badgeBg,
                  color: selectedVideoBenefit.badgeColor,
                  fontSize: "11.5px",
                  fontWeight: 800
                }}>
                  {selectedVideoBenefit.num} {selectedVideoBenefit.tag}
                </span>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: 900,
                  color: "#1e293b",
                  margin: 0
                }}>
                  {selectedVideoBenefit.modalTitle || selectedVideoBenefit.tag}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVideoBenefit(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "2px 6px"
                }}
              >
                ✕
              </button>
            </div>

            {/* 비디오 영역 */}
            <div style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              backgroundColor: "#000000"
            }}>
              <iframe
                src={selectedVideoBenefit.videoUrl}
                title="공실뉴스부동산 영상 가이드"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none"
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* 하단 상세 텍스트 */}
            <div style={{ padding: "18px 18px", backgroundColor: "#fffbf7", borderTop: "1px solid #fed7aa" }}>
              <div style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#ea580c",
                marginBottom: 8
              }}>
                💡 핵심 포인트 안내
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedVideoBenefit.videoBullets?.map((bullet: string, idx: number) => (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    fontSize: "13px",
                    color: "#334155",
                    lineHeight: 1.55,
                    wordBreak: "keep-all"
                  }}>
                    <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 팝업 확인 버튼 */}
            <div style={{
              padding: "12px 18px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setSelectedVideoBenefit(null)}
                style={{
                  backgroundColor: "#ff8e15",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 800,
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer"
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

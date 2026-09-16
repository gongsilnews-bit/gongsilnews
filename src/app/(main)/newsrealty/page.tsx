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
    numColor: "#fa8258",
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
    q: "블로그나 유튜브를 잘 모르는 초보 공인중개사도 할 수 있나요?",
    a: "네, 누구나 가능합니다. 공실뉴스의 원클릭 AI 초안 작성기와 5대 채널(기사, 블로그, 쇼츠 대본, 쓰레드, 인스타) 맞춤 원고 생성 시스템을 통해 초보 대표님도 1분 만에 수준 높은 콘텐츠를 발행할 수 있습니다.",
  },
  {
    q: "공실뉴스부동산 신청 후 절차는 어떻게 진행되나요?",
    a: "신청서를 제출하시면 담당 매니저가 중개사무소 확인 후 전용 권한을 활성화해 드리며, 지역 독점 취재 및 콘텐츠 제작 지원 가이드를 즉시 제공해 드립니다.",
  },
];

export default function NewsRealtyPage() {
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
    router.push("/newsrealty/apply");
  };

  return (
    <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh" }}>
      
      {/* ━━━ 스타일 정의 ━━━ */}
      <style>{`
        .cta-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px 52px;
          background: #fa8258;
          color: #ffffff;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 8px 26px rgba(250, 130, 88, 0.35);
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cta-action-btn:hover {
          background: #f37243;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 14px 34px rgba(250, 130, 88, 0.45);
        }
        .cta-action-btn:active {
          transform: translateY(0) scale(0.99);
        }

        .flow-node-box {
          background: #ffffff;
          border: 1px solid #fed7aa;
          border-radius: 16px;
          padding: 28px 18px;
          flex: 1;
          text-align: center;
          box-shadow: 0 4px 16px rgba(250, 130, 88, 0.05);
          transition: all 0.25s ease;
        }
        .flow-node-box:hover {
          border-color: #fa8258;
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(250, 130, 88, 0.15);
        }

        .clean-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 38px 32px;
          transition: all 0.3s ease;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .clean-card:hover {
          transform: translateY(-5px);
          border-color: #fdba74;
          box-shadow: 0 14px 30px rgba(250, 130, 88, 0.12);
        }

        .video-action-btn {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fa8258;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .video-action-btn:hover {
          color: #ea580c;
          transform: translateX(3px);
        }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HERO SECTION (웜 다크 & 따뜻한 코랄 오렌지 포인트)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        backgroundColor: "#181411",
        color: "#ffffff",
        padding: "96px 24px 88px",
        textAlign: "center",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "relative"
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          
          {/* 상단 태그 */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(250, 130, 88, 0.14)", border: "1px solid rgba(250, 130, 88, 0.38)", padding: "8px 20px", borderRadius: 30, fontSize: 14, fontWeight: 700, color: "#ffaa88", marginBottom: 28 }}>
            <span>공실뉴스부동산이란?</span>
          </div>

          {/* 메인 타이틀 */}
          <h1 style={{
            fontSize: "48px",
            fontWeight: 900,
            lineHeight: 1.3,
            letterSpacing: "-1.5px",
            margin: "0 auto 26px",
            color: "#ffffff",
            wordBreak: "keep-all"
          }}>
            내 지역의 공실을<br />
            <span style={{ color: "#fa8258" }}>뉴스로 전달하다</span>
          </h1>

          {/* 서브 카피 */}
          <div style={{
            fontSize: "22px",
            color: "#e2e8f0",
            lineHeight: 1.65,
            margin: "0 auto 40px",
            maxWidth: 720,
            wordBreak: "keep-all"
          }}>
            매물만 광고하는 부동산에서<br />
            <strong style={{ color: "#ffffff", fontSize: "24px", fontWeight: 900, borderBottom: "3px solid #fa8258", paddingBottom: "2px" }}>
              지역 부동산 정보를 전달하는 "로컬기자부동산"으로
            </strong>
          </div>

          {/* CTA 버튼 */}
          <div>
            <button
              onClick={handleApplyClick}
              className="cta-action-btn"
            >
              <span>공실뉴스부동산 신청하기</span>
              <span style={{ fontSize: "22px" }}>➔</span>
            </button>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. 무엇이 좋아질까요? (3 Core Benefits)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "96px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#ea580c", letterSpacing: "1px", textTransform: "uppercase" }}>
              ADVANTAGES
            </span>
            <h2 style={{ fontSize: "36px", fontWeight: 900, color: "#1c1917", margin: "10px 0 14px 0", letterSpacing: "-1px" }}>
              무엇이 좋아질까요?
            </h2>
            <p style={{ fontSize: "16.5px", color: "#64748b", margin: 0 }}>
              공실뉴스부동산이 되시면, 부동산마케팅이 쉬워집니다.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26 }}>
            {benefits.map((b) => (
              <div key={b.num} className="clean-card">
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                    <span style={{
                      fontSize: "36px",
                      fontWeight: 900,
                      color: b.numColor,
                      letterSpacing: "-1px",
                      lineHeight: 1
                    }}>
                      {b.num}
                    </span>
                    <span style={{
                      padding: "5px 14px",
                      borderRadius: 20,
                      background: b.badgeBg,
                      fontSize: "13px",
                      fontWeight: 800,
                      color: b.badgeColor
                    }}>
                      {b.tag}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", lineHeight: 1.5, margin: "0 0 14px 0", wordBreak: "keep-all" }}>
                    {b.title}
                  </h3>

                  <p style={{ fontSize: "15px", color: "#475569", lineHeight: 1.75, margin: 0, wordBreak: "keep-all" }}>
                    {b.desc}
                  </p>
                </div>

                <div 
                  onClick={() => setSelectedVideoBenefit(b)}
                  className="video-action-btn"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "14px" }}>▶</span>
                    <span>영상으로 상세보기</span>
                  </span>
                  <span>➔</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. 공실이 콘텐츠가 됩니다 (Story & Pipeline Section)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        padding: "85px 24px 80px",
        backgroundColor: "#fffbf7",
        borderBottom: "1px solid #fed7aa"
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
          
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, background: "#fff2e8", color: "#ea580c", fontWeight: 800, fontSize: 13, marginBottom: 16 }}>
            CONTENT PIPELINE
          </div>

          <h2 style={{
            fontSize: "36px",
            fontWeight: 900,
            color: "#1c1917",
            letterSpacing: "-1px",
            margin: "0 0 16px 0",
            wordBreak: "keep-all"
          }}>
            내가 기사를 쓸 수 있을까??
          </h2>

          <p style={{
            fontSize: "18px",
            color: "#475569",
            lineHeight: 1.7,
            margin: "0 auto 44px auto",
            maxWidth: 640,
            wordBreak: "keep-all"
          }}>
            공실뉴스에 공실을 등록하고, AI가 알아서 기사 초안을 작성합니다.
          </p>

          {/* 파이프라인 흐름도: 5단계 스마트 AI 자동화 */}
          <div style={{
            display: "flex",
            alignItems: "stretch",
            justifyContent: "center",
            gap: 10,
            marginBottom: 44,
          }}>
            {[
              {
                step: "01",
                icon: "🏢",
                title: "공동중개 등록",
                badge: "#11만 무료열람",
                sub: "전국 중개망 실시간 노출",
                badgeBg: "#fff2e8",
                badgeColor: "#ea580c",
              },
              {
                step: "02",
                icon: "📊",
                title: "AI 매물보고서",
                badge: "#10초 완성",
                sub: "임대인·고객 브리핑 리포트",
                badgeBg: "#eff6ff",
                badgeColor: "#2563eb",
              },
              {
                step: "03",
                icon: "📰",
                title: "AI 기사초안",
                badge: "#10초 완성",
                sub: "언론 포털 송출용 기사",
                badgeBg: "#fef3c7",
                badgeColor: "#b45309",
              },
              {
                step: "04",
                icon: "🎬",
                title: "기사·유튜브·블로그",
                badge: "#AI 초안작성",
                sub: "SNS 멀티채널 원클릭 확산",
                badgeBg: "#f5f3ff",
                badgeColor: "#7c3aed",
              },
              {
                step: "05",
                icon: "💼",
                title: "뉴스 광고영업",
                badge: "#신축·분양·로컬",
                sub: "지역 언론 미디어 광고수익",
                badgeBg: "#ecfdf5",
                badgeColor: "#059669",
              },
            ].map((node, idx, arr) => (
              <React.Fragment key={node.title}>
                <div className="flow-node-box" style={{ padding: "26px 14px" }}>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#94a3b8",
                    letterSpacing: "0.5px",
                    marginBottom: 8
                  }}>
                    STEP {node.step}
                  </span>
                  <div style={{ fontSize: "30px", marginBottom: 10 }}>
                    {node.icon}
                  </div>
                  <div style={{
                    fontSize: "17px",
                    fontWeight: 900,
                    color: "#1c1917",
                    marginBottom: 10,
                    letterSpacing: "-0.5px",
                    lineHeight: 1.3
                  }}>
                    {node.title}
                  </div>
                  <div style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 14,
                    background: node.badgeBg,
                    color: node.badgeColor,
                    fontSize: "12px",
                    fontWeight: 800,
                    marginBottom: 8
                  }}>
                    {node.badge}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, lineHeight: 1.45, wordBreak: "keep-all" }}>
                    {node.sub}
                  </div>
                </div>

                {idx < arr.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", fontSize: "20px", color: "#fa8258", fontWeight: 900, padding: "0 1px" }}>
                    →
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* 서술 박스 */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #fed7aa",
            borderRadius: 18,
            padding: "32px 40px",
            maxWidth: 780,
            margin: "0 auto",
            boxShadow: "0 8px 24px rgba(250, 130, 88, 0.08)"
          }}>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#1c1917", marginBottom: 10, wordBreak: "keep-all", lineHeight: 1.45 }}>
              "공실뉴스기자가 되시면, AI 물건보고서부터 기사 / 유튜브 대본 / 블로그 글까지<br />쉽게 완성하실 수 있습니다."
            </div>
            <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.75, wordBreak: "keep-all" }}>
              부동산 중개와 뉴스 광고영업까지, 공실뉴스부동산이 되시면 AI로 콘텐츠 제작이 쉬워집니다.
            </div>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. 매물을 받으러 가지 말고 뉴스를 취재하러 가세요 (Paradigm Shift)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        backgroundColor: "#181411",
        color: "#ffffff",
        padding: "96px 24px",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          
          <div style={{
            display: "inline-block",
            background: "rgba(250, 130, 88, 0.14)",
            border: "1px solid rgba(250, 130, 88, 0.38)",
            color: "#ffaa88",
            padding: "6px 18px",
            borderRadius: 30,
            fontSize: "13.5px",
            fontWeight: 800,
            marginBottom: 24
          }}>
            영업의 패러다임 전환
          </div>

          <h2 style={{
            fontSize: "42px",
            fontWeight: 900,
            lineHeight: 1.35,
            letterSpacing: "-1.5px",
            margin: "0 0 46px 0",
            wordBreak: "keep-all"
          }}>
            매물을 받으러 가지 말고,<br />
            <span style={{ color: "#fa8258" }}>뉴스를 취재하러 가세요.</span>
          </h2>

          {/* 2열 비교 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginBottom: 44, textAlign: "left" }}>
            
            {/* 기존 영업 방식 */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", fontSize: "13px", fontWeight: 800, padding: "5px 14px", borderRadius: 6 }}>
                    ❌ 기존 방식
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>단순 중개 매물 영업</span>
                </div>

                <div style={{ textAlign: "center", margin: "16px 0 24px" }}>
                  <img
                    src="/images/realty/sales_old_way.png"
                    alt="기존 영업 방식"
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid #fee2e2",
                      boxShadow: "0 8px 20px rgba(220, 38, 38, 0.08)",
                      display: "inline-block"
                    }}
                  />
                </div>

                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#334155", margin: "0 0 14px 0", lineHeight: 1.45 }}>
                  “대표님, 매물 있으세요?”
                </h3>
                <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: 1.7, margin: 0, wordBreak: "keep-all" }}>
                  수많은 중개업소 중 하나로 인식되어 건물주의 경계심과 피로도를 유발하는 전형적인 '을'의 입장 영업
                </p>
              </div>
            </div>

            {/* 공실뉴스부동산 방식 */}
            <div style={{
              background: "#ffffff",
              border: "2px solid #fa8258",
              borderRadius: 18,
              padding: "36px 32px",
              boxShadow: "0 12px 36px rgba(250, 130, 88, 0.16)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "inline-block", background: "#fff2e8", color: "#ea580c", fontSize: "13px", fontWeight: 800, padding: "5px 14px", borderRadius: 6 }}>
                    ✅ 공실뉴스부동산
                  </div>
                  <span style={{ fontSize: "12px", color: "#fa8258", fontWeight: 800 }}>언론 취재형 2단계 영업</span>
                </div>

                <div style={{ textAlign: "center", margin: "16px 0 24px" }}>
                  <img
                    src="/images/realty/sales_news_way.png"
                    alt="공실뉴스부동산 영업 방식"
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid #fed7aa",
                      boxShadow: "0 10px 24px rgba(250, 130, 88, 0.22)",
                      display: "inline-block"
                    }}
                  />
                </div>

                <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#1c1917", margin: "0 0 14px 0", lineHeight: 1.45, wordBreak: "keep-all" }}>
                  “사장님, 공실 등록 무료로 해드릴게요.<br />
                  <span style={{ color: "#fa8258" }}>그런데… 뉴스 기사 광고도 한번 내보시는 건 어떠세요?”</span>
                </h3>
                <p style={{ fontSize: "14.5px", color: "#9a3412", fontWeight: 600, lineHeight: 1.7, margin: 0, wordBreak: "keep-all" }}>
                  거절 없는 무료 공실 등록으로 먼저 문을 열고, 지역 언론 기사 광고로 고수익까지 창출하는 당당한 취재형 영업
                </p>
              </div>
            </div>

          </div>

          <div style={{
            fontSize: "24px",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.5px"
          }}>
            뉴스가 새로운 영업의 시작이 됩니다.
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. 플랜 비교 (Pricing & Plan Comparison)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        padding: "100px 24px",
        backgroundColor: "#f8fafc",
        borderTop: "1px solid #eaedf0",
        borderBottom: "1px solid #eaedf0",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: 940, margin: "0 auto" }}>
          
          {/* 상단 뱃지 */}
          <div style={{
            display: "inline-block",
            background: "rgba(250, 130, 88, 0.12)",
            border: "1px solid rgba(250, 130, 88, 0.3)",
            color: "#ea580c",
            padding: "6px 18px",
            borderRadius: 30,
            fontSize: "13.5px",
            fontWeight: 800,
            marginBottom: 20
          }}>
            가입비 0원 · 연회비 0원
          </div>

          <h2 style={{
            fontSize: "40px",
            fontWeight: 900,
            color: "#1c1917",
            letterSpacing: "-1.5px",
            margin: "0 0 16px 0",
            wordBreak: "keep-all",
            lineHeight: 1.3
          }}>
            <span style={{ color: "#fa8258" }}>월 3만 원</span>으로<br />
            지역 1등 로컬기자 파트너가 되세요
          </h2>

          <p style={{
            fontSize: "17px",
            color: "#64748b",
            margin: "0 auto 52px",
            maxWidth: 620,
            lineHeight: 1.6,
            wordBreak: "keep-all"
          }}>
            일반 부동산 무료 회원과 공실뉴스부동산 파트너의 압도적인 혜택 차이를 확인해 보세요.
          </p>

          {/* 2열 SaaS 플랜 비교 카드 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            alignItems: "stretch",
            textAlign: "left"
          }}>
            
            {/* 1. 일반부동산 (무료) */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: "38px 32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#334155", margin: 0 }}>
                    일반부동산
                  </h3>
                  <span style={{ fontSize: "12px", fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "4px 10px", borderRadius: 20 }}>
                    기본 플랜
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "36px", fontWeight: 900, color: "#1e293b", letterSpacing: "-1px" }}>
                    ₩0
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>
                      / 평생 무료
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0" }}>
                    기본적인 공실 등록과 시스템 체험이 가능한 입문용 플랜
                  </p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <button
                    disabled
                    style={{
                      width: "100%",
                      height: "48px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#94a3b8",
                      cursor: "default"
                    }}
                  >
                    기본 가입 제공
                  </button>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#64748b", marginBottom: 16 }}>
                    제공되는 기본 기능
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13, fontSize: "13.5px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                      <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                      <span>공실 등록 : <strong>최초 3건</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                      <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                      <span>기사 등록 : <strong>최초 3건</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                      <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                      <span>물건 보고서 : <strong>일부 기본 열람</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>광고 등록 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>뉴스 광고영업 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>정회원 커뮤니티 : 이용 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>실무 자료실 다운로드 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>드론 항공영상 저작권 무료 : 불가</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" }}>
                      <span style={{ color: "#cbd5e1" }}>✕</span>
                      <span style={{ textDecoration: "line-through" }}>공실스터디 강좌 : 이용 불가</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. 공실뉴스부동산 - 하이라이트 */}
            <div style={{
              background: "#ffffff",
              border: "2.5px solid #fa8258",
              borderRadius: 20,
              padding: "38px 32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 16px 44px rgba(250, 130, 88, 0.18)",
              position: "relative"
            }}>
              {/* 상단 뱃지 */}
              <div style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #fa8258 0%, #f37243 100%)",
                color: "#ffffff",
                padding: "4px 18px",
                borderRadius: 20,
                fontSize: "12px",
                fontWeight: 900,
                boxShadow: "0 4px 12px rgba(250, 130, 88, 0.35)",
                letterSpacing: "-0.3px"
              }}>
                🔥 강력 추천 · 대표 파트너십
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#1c1917", margin: 0 }}>
                    공실뉴스부동산
                  </h3>
                  <span style={{ fontSize: "12px", fontWeight: 800, background: "#fff2e8", color: "#ea580c", padding: "4px 12px", borderRadius: 20 }}>
                    로컬기자 전용 플랜
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "38px", fontWeight: 900, color: "#1c1917", letterSpacing: "-1px" }}>
                    ₩30,000
                    <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#64748b", marginLeft: 6 }}>
                      / 월 (VAT 포함)
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#fa8258", fontWeight: 700, margin: "6px 0 0" }}>
                    가입비 0원 · 연회비 0원 · 위약금 없이 언제든 해지 가능
                  </p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <button
                    onClick={handleApplyClick}
                    style={{
                      width: "100%",
                      height: "48px",
                      backgroundColor: "#fa8258",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(250, 130, 88, 0.3)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    공실뉴스부동산 신청하기 ➔
                  </button>
                </div>

                <div style={{ borderTop: "1px solid #fed7aa", paddingTop: 24 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#1c1917", marginBottom: 16 }}>
                    포함된 모든 전용 혜택
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13, fontSize: "13.5px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>공실 등록 : <strong style={{ color: "#1c1917" }}>월 20건</strong> (11만 중개망 실시간 노출)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>기사 등록 : <strong style={{ color: "#1c1917" }}>월 4건 정식 송고</strong> (뉴스 포털 노출)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>물건 보고서 : <strong style={{ color: "#fa8258" }}>AI 물건보고서 전체 무제한 생성</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>광고 등록 : <strong>포털 내 매물 광고 등록 가능</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>광고 영업 : <strong style={{ color: "#ea580c" }}>뉴스 광고영업 가능 (영업비 20~50% 지급)</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>커뮤니티 : <strong>공실뉴스 정회원 전용 커뮤니티 가입</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>자료실 : <strong>실무 서식·특약·계약서 무료 다운로드</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>드론 영상 : <strong>고화질 드론 영상 저작권 무료 상업 이용</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#fa8258", fontWeight: 900 }}>✓</span>
                      <span>공실 스터디 : <strong>실무 마케팅 강좌 일부 무료 수강</strong></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              상세 멤버십 기능 비교표 (Feature Comparison Table)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div style={{ marginTop: 72 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                display: "inline-block",
                background: "#f1f5f9",
                color: "#475569",
                fontSize: "12px",
                fontWeight: 800,
                padding: "4px 12px",
                borderRadius: 20,
                marginBottom: 10
              }}>
                DETAILED COMPARISON
              </div>
              <h3 style={{ fontSize: "26px", fontWeight: 900, color: "#1c1917", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                일반부동산 vs 공실뉴스부동산 혜택 비교표
              </h3>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
                한눈에 확인하는 멤버십별 서비스 및 혜택 차이
              </p>
            </div>

            <div style={{
              background: "#ffffff",
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{
                      padding: "20px 28px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#334155",
                      width: "30%",
                      background: "#f8fafc"
                    }}>
                      서비스 항목
                    </th>
                    <th style={{
                      padding: "20px 24px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#64748b",
                      width: "35%",
                      textAlign: "center",
                      background: "#f8fafc"
                    }}>
                      일반부동산 <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>(무료)</span>
                    </th>
                    <th style={{
                      padding: "20px 24px",
                      fontSize: "15.5px",
                      fontWeight: 900,
                      color: "#ea580c",
                      width: "35%",
                      textAlign: "center",
                      background: "#fff7ed",
                      borderLeft: "2px solid #fed7aa"
                    }}>
                      공실뉴스부동산
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      name: "공실 등록",
                      free: "최초 3건",
                      pro: "월 20건 (11만 중개망 실시간 노출)",
                      highlight: false
                    },
                    {
                      name: "기사 등록",
                      free: "최초 3건",
                      pro: "월 4건 (뉴스 포털 정식 송고)",
                      highlight: false
                    },
                    {
                      name: "물건 보고서",
                      free: "일부 기본 열람",
                      pro: "AI 물건보고서 전체 무제한 생성",
                      highlight: true
                    },
                    {
                      name: "광고 등록",
                      free: "불가",
                      pro: "등록 가능 (포털 내 매물 광고)",
                      highlight: false
                    },
                    {
                      name: "광고 영업",
                      free: "불가",
                      pro: "영업 가능 (영업비 20~50% 지급)",
                      highlight: true
                    },
                    {
                      name: "커뮤니티",
                      free: "이용 불가",
                      pro: "정회원 커뮤니티 가입",
                      highlight: false
                    },
                    {
                      name: "실무 자료실",
                      free: "다운로드 불가",
                      pro: "실무 서식·특약 무료 다운로드",
                      highlight: false
                    },
                    {
                      name: "드론 영상",
                      free: "이용 불가",
                      pro: "고화질 드론 영상 저작권 무료",
                      highlight: true
                    },
                    {
                      name: "공실 스터디",
                      free: "이용 불가",
                      pro: "실무 마케팅 강좌 일부 무료 수강",
                      highlight: false
                    }
                  ].map((row, idx) => {
                    const isFreeDisabled = row.free === "불가" || row.free === "이용 불가" || row.free === "다운로드 불가";
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: idx === 8 ? "none" : "1px solid #f1f5f9",
                          backgroundColor: row.highlight ? "#fffcf9" : idx % 2 === 0 ? "#ffffff" : "#fafbfc"
                        }}
                      >
                        <td style={{
                          padding: "18px 28px",
                          fontSize: "14.5px",
                          fontWeight: 700,
                          color: "#1e293b"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {row.highlight && (
                              <span style={{
                                display: "inline-block",
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: "#fa8258"
                              }} />
                            )}
                            {row.name}
                          </div>
                        </td>
                        <td style={{
                          padding: "18px 24px",
                          fontSize: "14px",
                          fontWeight: isFreeDisabled ? 500 : 700,
                          color: isFreeDisabled ? "#94a3b8" : "#475569",
                          textAlign: "center"
                        }}>
                          {isFreeDisabled ? (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: "#94a3b8",
                              background: "#f1f5f9",
                              padding: "4px 12px",
                              borderRadius: 20,
                              fontSize: "12.5px"
                            }}>
                              ✕ {row.free}
                            </span>
                          ) : (
                            row.free
                          )}
                        </td>
                        <td style={{
                          padding: "18px 24px",
                          fontSize: "14.5px",
                          fontWeight: 800,
                          color: "#1c1917",
                          textAlign: "center",
                          background: row.highlight ? "#fff8f1" : "#fffcf9",
                          borderLeft: "2px solid #fed7aa"
                        }}>
                          <span style={{ color: "#fa8258", marginRight: 6 }}>✓</span>
                          {row.pro}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 하단 CTA 바 */}
              <div style={{
                background: "#f8fafc",
                padding: "24px 28px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16
              }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#1c1917" }}>
                    가입비 0원, 월 3만 원으로 모든 권한을 시작하세요
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: 2 }}>
                    위약금이나 의무 약정 없이 언제든지 자유롭게 해지하실 수 있습니다.
                  </div>
                </div>
                <button
                  onClick={handleApplyClick}
                  style={{
                    backgroundColor: "#fa8258",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px 28px",
                    borderRadius: 10,
                    fontSize: "15px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(250, 130, 88, 0.3)",
                    transition: "all 0.2s ease"
                  }}
                >
                  공실뉴스부동산 가입하기 ➔
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. 내 지역/단지 로컬 부동산 기자가 되세요! (Closing & Final CTA)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        padding: "100px 24px",
        backgroundColor: "#ffffff",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: 840, margin: "0 auto" }}>
          
          <h2 style={{
            fontSize: "42px",
            fontWeight: 900,
            color: "#1c1917",
            letterSpacing: "-1.5px",
            margin: "0 0 18px 0",
            wordBreak: "keep-all",
            lineHeight: 1.32
          }}>
            내 지역/단지<br />
            <span style={{ color: "#fa8258" }}>로컬 부동산 기자가 되세요!</span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#fa8258", marginTop: "14px", letterSpacing: "-0.5px" }}>
              부동산중개 + 지역부동산기자
            </div>
          </h2>

          {/* 매트릭스 뱃지: 부동산 × 뉴스 × 유튜브 × 블로그 */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "#fffbf7",
            border: "1px solid #fed7aa",
            padding: "12px 28px",
            borderRadius: 30,
            fontSize: "17px",
            fontWeight: 800,
            color: "#1c1917",
            margin: "0 0 36px 0"
          }}>
            <span>부동산</span>
            <span style={{ color: "#fa8258" }}>×</span>
            <span>뉴스</span>
            <span style={{ color: "#fa8258" }}>×</span>
            <span>유튜브</span>
            <span style={{ color: "#fa8258" }}>×</span>
            <span>블로그</span>
          </div>

          <div style={{
            fontSize: "20px",
            color: "#334155",
            lineHeight: 1.8,
            marginBottom: 44,
            wordBreak: "keep-all"
          }}>
            내 지역의 공실을 가장 잘 아는 사람.<br />
            내 지역의 부동산 소식을 가장 먼저 전달하는 사람.
            <div style={{
              fontSize: "34px",
              fontWeight: 900,
              color: "#1c1917",
              marginTop: 14,
              letterSpacing: "-0.5px"
            }}>
              공실뉴스부동산
            </div>
          </div>

          {/* 최종 신청 CTA 버튼 */}
          <div>
            <button
              onClick={handleApplyClick}
              className="cta-action-btn"
              style={{ fontSize: "21px", padding: "22px 56px" }}
            >
              <span>공실뉴스부동산 신청하기</span>
              <span style={{ fontSize: "24px" }}>➔</span>
            </button>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. 자주 묻는 질문 (FAQ)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "80px 24px 96px", backgroundColor: "#fffbf7", borderTop: "1px solid #fed7aa" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 38 }}>
            <h3 style={{ fontSize: "28px", fontWeight: 900, color: "#1c1917", margin: 0, letterSpacing: "-0.5px" }}>
              자주 묻는 질문 (FAQ)
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "#ffffff",
                    border: isOpen ? "1px solid #fa8258" : "1px solid #e2e8f0",
                    borderRadius: 14,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    boxShadow: isOpen ? "0 4px 16px rgba(250, 130, 88, 0.12)" : "none"
                  }}
                >
                  <div
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: "#fa8258", fontWeight: 900, fontSize: 17 }}>Q.</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{faq.q}</span>
                    </div>
                    <span style={{
                      fontSize: 18,
                      color: isOpen ? "#fa8258" : "#94a3b8",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s"
                    }}>
                      ▼
                    </span>
                  </div>

                  {isOpen && (
                    <div style={{
                      padding: "0 24px 22px 24px",
                      fontSize: 14.5,
                      color: "#475569",
                      lineHeight: 1.75,
                      borderTop: "1px solid #fef3c7"
                    }}>
                      <p style={{ margin: "14px 0 0 0" }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          혜택 영상 팝업 모달
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {selectedVideoBenefit && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setSelectedVideoBenefit(null)}
        >
          <div 
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              maxWidth: 680,
              width: "100%",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.45)",
              overflow: "hidden",
              position: "relative",
              border: "1px solid rgba(250, 130, 88, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 팝업 헤더 */}
            <div style={{
              padding: "20px 26px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#ffffff"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  background: selectedVideoBenefit.badgeBg,
                  color: selectedVideoBenefit.badgeColor,
                  fontSize: "12.5px",
                  fontWeight: 800
                }}>
                  {selectedVideoBenefit.num} {selectedVideoBenefit.tag}
                </span>
                <h3 style={{
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "#1e293b",
                  margin: 0,
                  letterSpacing: "-0.5px"
                }}>
                  {selectedVideoBenefit.modalTitle || selectedVideoBenefit.tag}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVideoBenefit(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1,
                  borderRadius: 6
                }}
              >
                ✕
              </button>
            </div>

            {/* 영상 플레이어 (16:9 반응형 유튜브) */}
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

            {/* 하단 상세 텍스트 영역 */}
            <div style={{ padding: "24px 26px", backgroundColor: "#fffbf7", borderTop: "1px solid #fed7aa" }}>
              <div style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#ea580c",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <span>💡</span>
                <span>상세 혜택 및 활용 안내</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {selectedVideoBenefit.videoBullets?.map((bullet: string, idx: number) => (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: "14.5px",
                    color: "#334155",
                    lineHeight: 1.65,
                    wordBreak: "keep-all"
                  }}>
                    <span style={{ color: "#fa8258", fontWeight: 900, marginTop: "1px" }}>✓</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 팝업 푸터 버튼 */}
            <div style={{
              padding: "16px 26px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setSelectedVideoBenefit(null)}
                style={{
                  backgroundColor: "#fa8258",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 800,
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(250, 130, 88, 0.28)",
                  transition: "background 0.2s"
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

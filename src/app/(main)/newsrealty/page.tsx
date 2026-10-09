"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import NewsrealtyStudyMarketingSection from "@/components/newsrealty/NewsrealtyStudyMarketingSection";

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
    tag: "AI 마케팅",
    title: (
      <>
        매매보고서부터<br />
        유리창홍보지, 홈페이지 무료 제공
      </>
    ),
    modalTitle: "AI 매매보고서 · 유리창홍보지 · 홈페이지 무료 제공",
    videoUrl: "https://www.youtube.com/embed/4a3_M6-Crew?autoplay=1&rel=0",
    videoBullets: [
      "등록한 매물 데이터로 고품질 AI 매매보고서 즉시 자동 완성",
      "사무실 내방 고객의 시선을 사로잡는 유리창 홍보물 원클릭 출력",
      "내 부동산 전용 모바일·PC 반응형 홈페이지 무료 구축 및 자동 연동"
    ],
    desc: "등록한 공실 매물 데이터를 기반으로, AI가 매매보고서, 유리창홍보지, 부동산홈페이지까지 자동으로 활용하실 수 있습니다.",
    badgeBg: "#f0fdf4",
    badgeColor: "#16a34a",
    numColor: "#22c55e",
  },
  {
    num: "03",
    tag: "AI 원클릭",
    title: (
      <>
        유튜브 대본부터<br />
        블로그, SNS까지 AI 원클릭 생성
      </>
    ),
    modalTitle: "유튜브 대본부터 블로그, SNS까지 AI 원클릭 생성",
    videoUrl: "https://www.youtube.com/embed/4a3_M6-Crew?autoplay=1&rel=0",
    videoBullets: [
      "공실 매물 정보 입력 즉시 AI가 자동으로 정밀 분석 및 보도기사 초안 완성",
      "네이버 블로그 검색 상위 노출에 최적화된 블로그·SNS 글 원클릭 자동 생성",
      "1분 쇼츠 및 릴스 제작용 유튜브 영상 대본까지 한 번에 자동 추출하여 제작 부담 0%"
    ],
    desc: "등록한 공실 매물 데이터를 기반으로, AI가 뉴스 기사 초안부터 네이버 블로그 글, SNS, 유튜브대본까지 단 한 번의 클릭으로 자동 완성합니다.",
    badgeBg: "#eff6ff",
    badgeColor: "#1d4ed8",
    numColor: "#3b82f6",
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

  const handleGeneralLoginClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    if (user) {
      router.push("/realty_admin");
    } else {
      router.push("/login?returnTo=" + encodeURIComponent("/realty_admin"));
    }
  };

  return (
    <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh" }}>
      <NewsrealtyHeader />
      
      {/* ━━━ 스타일 정의 ━━━ */}
      <style>{`
        .cta-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px 52px;
          background: #ff8e15;
          color: #ffffff !important;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 8px 26px rgba(255, 142, 21, 0.35);
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cta-action-btn:hover {
          background: #e67e10;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 14px 34px rgba(255, 142, 21, 0.45);
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
          box-shadow: 0 4px 16px rgba(255, 142, 21, 0.05);
          transition: all 0.25s ease;
        }
        .flow-node-box:hover {
          border-color: #ff8e15;
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(255, 142, 21, 0.15);
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
          box-shadow: 0 14px 30px rgba(255, 142, 21, 0.12);
        }

        .video-action-btn {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #ff8e15;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .video-action-btn:hover {
          color: #ea580c;
          transform: translateX(3px);
        }

        .heroV2 {
          --hv-orange: #ea580c;
          --hv-orange-strong: #c2410c;
          --hv-orange-soft: #fff7ed;
          --hv-bg: #fffaf5;
          --hv-grid: rgba(255, 142, 21, 0.12);
          position: relative;
          background-color: var(--hv-bg);
          background-image:
            linear-gradient(to right, var(--hv-grid) 1px, transparent 1px),
            linear-gradient(to bottom, var(--hv-grid) 1px, transparent 1px);
          background-size: 48px 48px;
          min-height: 640px;
          display: flex;
          align-items: center;
          overflow: hidden;
          border-bottom: 1px solid #fed7aa;
        }
        .heroV2Photo {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 58vw;
          min-width: 520px;
          max-width: 1020px;
          z-index: 1;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 22%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 65%, #000 72%, #000 100%);
          mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 22%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 65%, #000 72%, #000 100%);
        }
        .heroV2Photo :global(img) {
          object-fit: contain !important;
          object-position: right center !important;
        }
        .heroV2Inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1560px;
          margin: 0 auto;
          padding: 80px 48px 80px max(48px, calc((100vw - 1480px) / 2));
          box-sizing: border-box;
        }
        .heroV2Text {
          max-width: 660px;
        }
        .heroV2Eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 8px 18px;
          border-radius: 9999px;
          background: #ea580c;
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.01em;
          margin-bottom: 22px;
          box-shadow: 0 4px 14px rgba(234, 88, 12, 0.25);
        }
        .heroV2Title {
          font-size: 56px;
          line-height: 1.15;
          letter-spacing: -0.035em;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 22px;
          word-break: keep-all;
        }
        .heroV2Title span {
          display: block;
          color: var(--hv-orange);
          margin-top: 6px;
        }
        .heroV2Description {
          font-size: 17.5px;
          line-height: 1.68;
          color: #475569;
          margin: 0 0 32px;
          word-break: keep-all;
        }
        .heroV2Actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .heroV2Primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 32px;
          border-radius: 12px;
          background: #ea580c;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(234, 88, 12, 0.3);
          transition: all 0.2s ease;
        }
        .heroV2Primary:hover {
          background: #c2410c;
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(234, 88, 12, 0.4);
        }
        .heroV2Secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 28px;
          border-radius: 12px;
          background: #ffffff;
          color: var(--hv-orange-strong);
          border: 1.5px solid #fed7aa;
          font-size: 16px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }
        .heroV2Secondary:hover {
          background: #fff7ed;
          border-color: #ea580c;
          transform: translateY(-2px);
        }
        .heroV2HighlightTags {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 6px;
        }
        .heroHighlightRow {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .heroHighlightItem {
          display: inline-block;
          background: #fef08a;
          color: #0f172a;
          font-size: 14.5px;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: -0.3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.06);
        }

        @media (max-width: 1200px) {
          .heroV2Inner {
            padding-left: 48px;
          }
        }
        @media (max-width: 860px) {
          .heroV2 {
            flex-direction: column;
            min-height: 0;
          }
          .heroV2Photo {
            position: relative;
            inset: auto;
            width: 100%;
            height: auto;
            aspect-ratio: 16 / 9;
            -webkit-mask-image: none;
            mask-image: none;
          }
          .heroV2Inner {
            width: calc(100% - 40px);
            padding: 8px 0 56px;
          }
          .heroV2Description br {
            display: none;
          }
          .heroV2Actions {
            flex-direction: column;
          }
          .heroV2Primary,
          .heroV2Secondary {
            width: 100%;
          }
        }
      
      `}</style>

      {/* ━━━ [1섹션] 메인 히어로 ━━━ */}
      <section className="heroV2" aria-labelledby="newsrealty-hero-title">
        <div className="heroV2Photo">
          <Image
            src="/images/newsrealty/hero_gangnam_multichannel_agent.jpg"
            alt="공실뉴스 부동산 AI 마케팅 및 공동중개 네트워크를 활용하는 전문 공인중개사"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 58vw"
            style={{
              objectFit: "contain",
              objectPosition: "right center",
            }}
          />
        </div>

        <div className="heroV2Inner">
          <div className="heroV2Text">
            <p className="heroV2Eyebrow">11만 부동산 무료 열람 채널</p>
            <h1 id="newsrealty-hero-title" className="heroV2Title">
              유튜브, 블로그, SNS
              <span>이제, 공실만 등록하면 자동으로!!</span>
            </h1>
            <p className="heroV2Description">
              <span style={{ display: "block", whiteSpace: "nowrap" }}>정보를 주고 받는 부동산에게 유튜브/블로그/SNS 마케팅은 선택이 아니라 필수입니다!</span>
              <span style={{ display: "block", whiteSpace: "nowrap", marginTop: "4px" }}>이제, 공실뉴스부동산이 되시면, 블로그/유튜브/SNS 마케팅 바로 시작하실 수 있습니다!</span>
            </p>
            <div className="heroV2Actions">
              <Link href="/newsrealty/benefits/brokerage-article" className="heroV2Primary" style={{ color: "#ffffff", backgroundColor: "#ea580c" }}>
                멤버십 혜택 &gt;&gt;
              </Link>
              <Link href="/newsrealty/apply" className="heroV2Secondary">
                멤버십 신청하기 &gt;&gt;
              </Link>
            </div>
            <div className="heroV2HighlightTags">
              <div className="heroHighlightRow">
                <span className="heroHighlightItem"># AI 공동중개등록</span>
                <span className="heroHighlightItem"># AI 매매보고서</span>
                <span className="heroHighlightItem"># AI 블로그 포스팅</span>
                <span className="heroHighlightItem"># AI SNS 인스타그램</span>
              </div>
              <div className="heroHighlightRow">
                <span className="heroHighlightItem"># 부동산홈페이지</span>
                <span className="heroHighlightItem"># 유리창홍보지</span>
                <span className="heroHighlightItem"># 강의 채널 개설</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. 무엇이 좋아질까요? (3 Core Benefits)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="products" style={{ padding: "96px 24px", backgroundColor: "#ffffff", scrollMarginTop: "70px" }}>
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
            내가 이번에 꾸준히 할 수 있을까?
          </h2>

          <p style={{
            fontSize: "18px",
            color: "#475569",
            lineHeight: 1.7,
            margin: "0 auto 44px auto",
            maxWidth: 640,
            wordBreak: "keep-all"
          }}>
            공실뉴스에 공실만 등록하시면, AI가 알아서 기사 초안 및 SNS 글을 작성합니다.
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
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
                  </svg>
                ),
                title: "공동중개 등록",
                badge: "#11만 무료열람",
                sub: "전국 중개망 실시간 노출",
                badgeBg: "#fff2e8",
                badgeColor: "#ea580c",
              },
              {
                step: "02",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                ),
                title: "AI 매물보고서",
                badge: "#10초 완성",
                sub: "임대인·고객 브리핑 리포트",
                badgeBg: "#eff6ff",
                badgeColor: "#2563eb",
              },
              {
                step: "03",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                    <path d="M18 14h-8" />
                    <path d="M15 18h-5" />
                    <rect x="10" y="6" width="8" height="4" rx="1" />
                  </svg>
                ),
                title: "AI 기사초안",
                badge: "#10초 완성",
                sub: "공실뉴스 기사 등록",
                badgeBg: "#fef3c7",
                badgeColor: "#b45309",
              },
              {
                step: "04",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <polygon points="10 9 16 12 10 15 10 9" fill="#7c3aed" />
                  </svg>
                ),
                title: "SNS·블로그·유튜브대본",
                badge: "#AI 초안작성",
                sub: "SNS 멀티채널 원클릭 확산",
                badgeBg: "#f5f3ff",
                badgeColor: "#7c3aed",
              },
              {
                step: "05",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="18" rx="3" />
                    <line x1="2" y1="9" x2="22" y2="9" />
                    <circle cx="5.5" cy="6" r="1" fill="#059669" />
                    <circle cx="8.5" cy="6" r="1" fill="#059669" />
                    <circle cx="11.5" cy="6" r="1" fill="#059669" />
                    <path d="M8 15l4-4 4 4" />
                  </svg>
                ),
                title: "부동산홈페이지",
                badge: "#물건,기사,접수",
                sub: "물건, 기사, 손님접수",
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
                    marginBottom: 10
                  }}>
                    STEP {node.step}
                  </span>
                  <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: "14px",
                    background: node.badgeBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    border: `1px solid ${node.badgeColor}25`,
                    boxShadow: `0 4px 12px ${node.badgeColor}12`
                  }}>
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
                  <div style={{ display: "flex", alignItems: "center", fontSize: "20px", color: "#ff8e15", fontWeight: 900, padding: "0 1px" }}>
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
            boxShadow: "0 8px 24px rgba(255, 142, 21, 0.08)"
          }}>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#1c1917", marginBottom: 10, wordBreak: "keep-all", lineHeight: 1.45 }}>
              "공실뉴스부동산이 되시면, AI 물건보고서부터 기사 / 유튜브 대본 / 블로그 글 /<br />인스타그램, 페이스북, 쓰레드, 내 홈페이지까지 자동으로 쉽게 완성하실 수 있습니다."
            </div>
            <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.75, wordBreak: "keep-all" }}>
              11만 부동산이 무료 열람할 수 있는 공실뉴스에 공실만 등록하세요. 부동산마케팅이 쉬워집니다!
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
            background: "rgba(255, 142, 21, 0.14)",
            border: "1px solid rgba(255, 142, 21, 0.38)",
            color: "#ffb347",
            padding: "6px 18px",
            borderRadius: 30,
            fontSize: "13.5px",
            fontWeight: 800,
            marginBottom: 24
          }}>
            아파트/로컬 부동산 강력추천
          </div>

          <h2 style={{
            fontSize: "42px",
            fontWeight: 900,
            lineHeight: 1.35,
            letterSpacing: "-1.5px",
            margin: "0",
            wordBreak: "keep-all"
          }}>
            지역/단지, 바쁜 1~2인 부동산을 위한<br />
            <span style={{ color: "#ff8e15" }}>스마트한 AI 마케팅!</span>
          </h2>

          </div>
      </section>

      {/* ━━━ 공실스터디 마케팅 섹션 통합 (대형부동산 현황 ~ 추천 부동산) ━━━ */}
      <NewsrealtyStudyMarketingSection />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. 플랜 비교 (Pricing & Plan Comparison)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pricing" style={{
        padding: "100px 24px",
        backgroundColor: "#f8fafc",
        borderTop: "1px solid #eaedf0",
        borderBottom: "1px solid #eaedf0",
        textAlign: "center",
        scrollMarginTop: "70px"
      }}>
        <div style={{ maxWidth: 940, margin: "0 auto" }}>
          
          {/* 상단 뱃지 */}
          <div style={{
            display: "inline-block",
            background: "rgba(255, 142, 21, 0.12)",
            border: "1px solid rgba(255, 142, 21, 0.3)",
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
            <span style={{ color: "#ff8e15" }}>월 3만 원</span>으로<br />
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
                    onClick={handleGeneralLoginClick}
                    style={{
                      width: "100%",
                      height: "48px",
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(30, 41, 59, 0.15)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0f172a";
                      e.currentTarget.style.boxShadow = "0 6px 18px rgba(15, 23, 42, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#1e293b";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(30, 41, 59, 0.15)";
                    }}
                  >
                    {user ? "일반부동산 바로가기 ➔" : "로그인 ➔"}
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
              border: "2.5px solid #ff8e15",
              borderRadius: 20,
              padding: "38px 32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 16px 44px rgba(255, 142, 21, 0.18)",
              position: "relative"
            }}>
              {/* 상단 뱃지 */}
              <div style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #ff8e15 0%, #e67e10 100%)",
                color: "#ffffff",
                padding: "4px 18px",
                borderRadius: 20,
                fontSize: "12px",
                fontWeight: 900,
                boxShadow: "0 4px 12px rgba(255, 142, 21, 0.35)",
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
                  <p style={{ fontSize: "13px", color: "#ff8e15", fontWeight: 700, margin: "6px 0 0" }}>
                    가입비 0원 · 연회비 0원 · 위약금 없이 언제든 해지 가능
                  </p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <button
                    onClick={handleApplyClick}
                    style={{
                      width: "100%",
                      height: "48px",
                      backgroundColor: "#ff8e15",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(255, 142, 21, 0.3)",
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
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>공실 등록 : <strong style={{ color: "#1c1917" }}>월 20건</strong> (11만 중개망 실시간 노출)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>기사 등록 : <strong style={{ color: "#1c1917" }}>월 4건 정식 송고</strong> (뉴스 포털 노출)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>물건 보고서 : <strong style={{ color: "#ff8e15" }}>AI 물건보고서 전체 무제한 생성</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>광고 등록 : <strong>포털 내 매물 광고 등록 가능</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>광고 영업 : <strong style={{ color: "#ea580c" }}>뉴스 광고영업 가능 (영업비 20~50% 지급)</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>커뮤니티 : <strong>공실뉴스 정회원 전용 커뮤니티 가입</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>자료실 : <strong>실무 서식·특약·계약서 무료 다운로드</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>드론 영상 : <strong>고화질 드론 영상 저작권 무료 상업 이용</strong></span>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 10, color: "#1c1917" }}>
                      <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                      <span>공실 스터디 : <strong>실무 마케팅 강좌 일부 무료 수강</strong></span>
                    </li>
                  </ul>
                </div>
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
            <span style={{ color: "#ff8e15" }}>로컬 부동산 기자가 되세요!</span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#ff8e15", marginTop: "14px", letterSpacing: "-0.5px" }}>
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
            <span style={{ color: "#ff8e15" }}>×</span>
            <span>뉴스</span>
            <span style={{ color: "#ff8e15" }}>×</span>
            <span>유튜브</span>
            <span style={{ color: "#ff8e15" }}>×</span>
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
                    border: isOpen ? "1px solid #ff8e15" : "1px solid #e2e8f0",
                    borderRadius: 14,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    boxShadow: isOpen ? "0 4px 16px rgba(255, 142, 21, 0.12)" : "none"
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
                      <span style={{ color: "#ff8e15", fontWeight: 900, fontSize: 17 }}>Q.</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{faq.q}</span>
                    </div>
                    <span style={{
                      fontSize: 18,
                      color: isOpen ? "#ff8e15" : "#94a3b8",
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
              border: "1px solid rgba(255, 142, 21, 0.2)"
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
                    <span style={{ color: "#ff8e15", fontWeight: 900, marginTop: "1px" }}>✓</span>
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
                  backgroundColor: "#ff8e15",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 800,
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(255, 142, 21, 0.28)",
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

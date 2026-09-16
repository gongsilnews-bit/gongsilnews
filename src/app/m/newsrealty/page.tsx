"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const benefits: {
  num: string;
  tag: string;
  title: React.ReactNode;
  desc: string;
  badgeBg: string;
  badgeColor: string;
  numColor: string;
}[] = [
  {
    num: "01",
    tag: "기본 혜택",
    title: (
      <>
        11만 중개망 공실 20건 &<br />
        매월 언론 기사 4건 등록
      </>
    ),
    desc: "전국 11만 부동산이 실시간 무료 열람하는 공실뉴스에 매월 공실 매물 20건과 공식 보도기사 4건을 자유롭게 등록·홍보할 수 있습니다.",
    badgeBg: "#fff2e8",
    badgeColor: "#ea580c",
    numColor: "#fa8258",
  },
  {
    num: "02",
    tag: "AI 원클릭",
    title: (
      <>
        AI로 유튜브 대본부터<br />
        블로그 포스팅까지 원클릭
      </>
    ),
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
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#ffaa88", padding: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
          공실뉴스부동산
        </div>
        <Link href="/" style={{ color: "#ffaa88", fontSize: 13, textDecoration: "none", fontWeight: 700 }}>
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
          background: #fa8258;
          color: #ffffff;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -0.3px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(250, 130, 88, 0.35);
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .m-cta-btn:active {
          background: #f37243;
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
          box-shadow: 0 2px 8px rgba(250, 130, 88, 0.04);
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
          background: "rgba(250, 130, 88, 0.14)",
          border: "1px solid rgba(250, 130, 88, 0.38)",
          padding: "6px 16px",
          borderRadius: 24,
          fontSize: 12.5,
          fontWeight: 800,
          color: "#ffaa88",
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
          <span style={{ color: "#fa8258" }}>뉴스로 전달하다</span>
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
          <strong style={{ color: "#ffffff", fontSize: 17.5, fontWeight: 900, borderBottom: "2px solid #fa8258", paddingBottom: "1px" }}>
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
            공실이 콘텐츠가 됩니다
          </h2>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0, wordBreak: "keep-all" }}>
            지역의 새로운 공실과 매물은 그 자체로 좋은 부동산 콘텐츠입니다.
          </p>
        </div>

        {/* 파이프라인 단계 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {[
            { step: "01", title: "공실", sub: "지역 매물 발굴", icon: "🏢" },
            { step: "02", title: "뉴스", sub: "공실뉴스 보도", icon: "📰" },
            { step: "03", title: "블로그", sub: "검색 노출 장악", icon: "✍️" },
            { step: "04", title: "유튜브", sub: "영상 브리핑 쇼츠", icon: "🎥" },
            { step: "05", title: "고객", sub: "직접 문의 및 계약", icon: "🤝" },
          ].map((item) => (
            <div key={item.step} className="m-flow-item">
              <div style={{ fontSize: 24, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#ea580c", background: "#fff2e8", padding: "2px 6px", borderRadius: 4 }}>
                    STEP {item.step}
                  </span>
                  <span style={{ fontSize: 15.5, fontWeight: 900, color: "#1c1917" }}>
                    {item.title}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#ea580c", fontWeight: 600 }}>
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
          boxShadow: "0 4px 12px rgba(250, 130, 88, 0.06)"
        }}>
          <div style={{ fontSize: 16.5, fontWeight: 900, color: "#1c1917", marginBottom: 6 }}>
            "오늘 무엇을 올릴지 고민하지 않아도 됩니다."
          </div>
          <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.65, wordBreak: "keep-all" }}>
            지역의 부동산 이야기를 꾸준히 전달하면서 유튜브와 블로그를 함께 키울 수 있습니다.
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
          background: "rgba(250, 130, 88, 0.14)",
          border: "1px solid rgba(250, 130, 88, 0.38)",
          color: "#ffaa88",
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
          <span style={{ color: "#fa8258" }}>뉴스를 취재하러 가세요.</span>
        </h2>

        {/* 2단 비교 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, textAlign: "left" }}>
          
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "20px 18px"
          }}>
            <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", padding: "3px 8px", borderRadius: 4, fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
              ❌ 기존 방식
            </div>
            <div style={{ fontSize: 16, color: "#334155", fontWeight: 700, lineHeight: 1.5, marginBottom: 6 }}>
              “대표님, 매물 있으세요?”
            </div>
            <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
              수많은 부동산 중 하나로 인식되어 피로도를 유발하는 전형적인 '을'의 영업
            </div>
          </div>

          <div style={{
            background: "#ffffff",
            border: "2px solid #fa8258",
            borderRadius: 14,
            padding: "20px 18px",
            boxShadow: "0 6px 18px rgba(250, 130, 88, 0.15)"
          }}>
            <div style={{ display: "inline-block", background: "#fff2e8", color: "#ea580c", padding: "3px 8px", borderRadius: 4, fontSize: 11.5, fontWeight: 800, marginBottom: 8 }}>
              ✅ 공실뉴스부동산
            </div>
            <div style={{ fontSize: 17, color: "#1c1917", fontWeight: 900, lineHeight: 1.45, marginBottom: 6 }}>
              “대표님 건물의 공실을<br />공실뉴스에서 소개해드리겠습니다.”
            </div>
            <div style={{ fontSize: 13, color: "#9a3412", lineHeight: 1.5, fontWeight: 600 }}>
              건물주의 자존감을 높이고 언론 홍보 기회를 제공하는 당당한 '취재형' 영업
            </div>
          </div>

        </div>

        <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>
          뉴스가 새로운 영업의 시작이 됩니다.
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. 우리 지역을 대표하는 부동산이 되어보세요 (모바일 Closing)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: "50px 20px", textAlign: "center", backgroundColor: "#ffffff" }}>
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          color: "#1c1917",
          letterSpacing: "-1px",
          margin: "0 0 16px 0",
          wordBreak: "keep-all"
        }}>
          우리 지역을 대표하는<br />부동산이 되어보세요
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
          <span style={{ color: "#fa8258" }}>×</span>
          <span>뉴스</span>
          <span style={{ color: "#fa8258" }}>×</span>
          <span>유튜브</span>
          <span style={{ color: "#fa8258" }}>×</span>
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

    </div>
  );
}

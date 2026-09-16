"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const benefits = [
  {
    num: "01",
    tag: "콘텐츠",
    title: "유튜브·블로그를 꾸준히 운영할 수 있습니다.",
    desc: "내 지역의 공실과 부동산 소식이 계속해서 새로운 콘텐츠가 됩니다. 매일 무엇을 올려야 할지 고민할 필요 없이, 지역의 생생한 소식이 끊이지 않는 콘텐츠 원천이 됩니다.",
    badgeBg: "#fff2e8",
    badgeColor: "#ea580c",
    numColor: "#fa8258",
  },
  {
    num: "02",
    tag: "수익",
    title: "새로운 광고수익을 만들 수 있습니다.",
    desc: "건물주와 임대인의 공실·매물 홍보를 통해 지역 광고와 중개의 새로운 기회를 만들 수 있습니다. 단순 중개보수를 넘어 프리미엄 홍보 플랫폼으로 수익 다각화를 이룹니다.",
    badgeBg: "#eff6ff",
    badgeColor: "#1d4ed8",
    numColor: "#3b82f6",
  },
  {
    num: "03",
    tag: "네트워크",
    title: "강력한 지역 네트워크를 만들 수 있습니다.",
    desc: "취재와 콘텐츠를 통해 건물주·임대인·사업자·투자자와 자연스럽게 연결됩니다. 정보 전달자로서 지역 내 탄탄하고 독점적인 인맥 자산을 구축할 수 있습니다.",
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
              공실뉴스부동산으로 전환하는 순간, 3가지 핵심 성장 엔진이 작동합니다.
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

                <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 6, color: "#fa8258", fontSize: "13px", fontWeight: 800 }}>
                  <span>핵심 혜택 확인</span>
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
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          
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
            공실이 콘텐츠가 됩니다
          </h2>

          <p style={{
            fontSize: "18px",
            color: "#475569",
            lineHeight: 1.7,
            margin: "0 auto 44px auto",
            maxWidth: 640,
            wordBreak: "keep-all"
          }}>
            지역의 새로운 공실과 매물은 그 자체로 좋은 부동산 콘텐츠입니다.
          </p>

          {/* 파이프라인 흐름도: 공실 → 뉴스 → 블로그 → 유튜브 → 고객 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 44,
          }}>
            {[
              { step: "01", title: "공실", sub: "지역 매물", icon: "🏢" },
              { step: "02", title: "뉴스", sub: "공실뉴스 보도", icon: "📰" },
              { step: "03", title: "블로그", sub: "포털 검색장악", icon: "✍️" },
              { step: "04", title: "유튜브", sub: "영상 브리핑", icon: "🎥" },
              { step: "05", title: "고객", sub: "문의 및 계약", icon: "🤝" },
            ].map((node, idx, arr) => (
              <React.Fragment key={node.title}>
                <div className="flow-node-box">
                  <div style={{ fontSize: "28px", marginBottom: 8 }}>
                    {node.icon}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#1c1917", marginBottom: 4 }}>
                    {node.title}
                  </div>
                  <div style={{ fontSize: "13px", color: "#ea580c", fontWeight: 700 }}>
                    {node.sub}
                  </div>
                </div>

                {idx < arr.length - 1 && (
                  <div style={{ fontSize: "24px", color: "#fa8258", fontWeight: 900, padding: "0 2px" }}>
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
            maxWidth: 720,
            margin: "0 auto",
            boxShadow: "0 8px 24px rgba(250, 130, 88, 0.08)"
          }}>
            <div style={{ fontSize: "21px", fontWeight: 900, color: "#1c1917", marginBottom: 10 }}>
              "오늘 무엇을 올릴지 고민하지 않아도 됩니다."
            </div>
            <div style={{ fontSize: "16.5px", color: "#475569", lineHeight: 1.75, wordBreak: "keep-all" }}>
              지역의 부동산 이야기를 꾸준히 전달하면서<br />
              유튜브와 블로그를 함께 키울 수 있습니다.
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
              borderRadius: 16,
              padding: "34px 30px"
            }}>
              <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", fontSize: "13px", fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ❌ 기존 방식
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#334155", margin: "0 0 12px 0" }}>
                “대표님, 매물 있으세요?”
              </h3>
              <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: 1.7, margin: 0 }}>
                수많은 중개업소 중 하나로 인식되어 경계심과 피로도를 유발하는 전형적인 '을'의 입장 영업
              </p>
            </div>

            {/* 공실뉴스부동산 방식 */}
            <div style={{
              background: "#ffffff",
              border: "2px solid #fa8258",
              borderRadius: 16,
              padding: "34px 30px",
              boxShadow: "0 10px 30px rgba(250, 130, 88, 0.15)"
            }}>
              <div style={{ display: "inline-block", background: "#fff2e8", color: "#ea580c", fontSize: "13px", fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ✅ 공실뉴스부동산
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#1c1917", margin: "0 0 12px 0", lineHeight: 1.45 }}>
                “대표님 건물의 공실을<br />공실뉴스에서 소개해드리겠습니다.”
              </h3>
              <p style={{ fontSize: "14.5px", color: "#9a3412", fontWeight: 600, lineHeight: 1.7, margin: 0 }}>
                건물주의 자존감을 높이고 언론 홍보 기회를 제공하여 굳게 닫힌 문을 여는 당당한 '취재형' 영업
              </p>
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
          5. 우리 지역을 대표하는 부동산이 되어보세요 (Closing & Final CTA)
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
            margin: "0 0 22px 0",
            wordBreak: "keep-all"
          }}>
            우리 지역을 대표하는<br />부동산이 되어보세요
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

    </div>
  );
}

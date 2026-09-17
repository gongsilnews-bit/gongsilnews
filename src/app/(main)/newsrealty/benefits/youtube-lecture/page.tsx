"use client";

import React, { useState } from "react";
import Link from "next/link";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";

export default function YoutubeLectureBenefitPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { label: "강의 수강료", value: "0원 (전액무료)", desc: "정가 120만원 상당 전문 마스터클래스", highlight: true },
    { label: "수강 만족도", value: "98.7%", desc: "현직 공인중개사 850+명 수강 완료", highlight: false },
    { label: "영상 제작 소요시간", value: "15분", desc: "스마트폰 & AI 자동화 템플릿 활용", highlight: true },
    { label: "월간 매물 문의 증가", value: "평균 2.6배↑", desc: "유튜브 쇼츠 & 브랜딩 시청자 유입", highlight: false },
  ];

  const curriculum = [
    {
      step: "STAGE 01",
      title: "왕초보도 가능한 스마트폰 매물 촬영 노하우",
      desc: "수백만 원짜리 비싼 카메라가 필요 없습니다. 갤럭시/아이폰 기본 카메라로 광각 왜곡 없이 채광과 공간감을 살리는 삼각대 앵글과 3분 촬영 기법을 전수합니다.",
      badge: "기초 촬영",
      icon: "📱",
    },
    {
      step: "STAGE 02",
      title: "AI 컷편집 & 자막 자동 생성 (CapCut/Vrew)",
      desc: "편집에 밤새지 마세요! 말실수한 부분만 AI가 알아서 잘라내고, 자막도 음성을 인식해 100% 자동 생성해 주는 초간단 편집 워크플로우를 실습합니다.",
      badge: "AI 자동편집",
      icon: "⚡",
    },
    {
      step: "STAGE 03",
      title: "클릭을 부르는 유튜브 썸네일 & 카피라이팅",
      desc: "알고리즘의 선택을 받는 썸네일 황금 비율과 '절대 사면 안 되는 빌라 vs 급매물' 등 시청자의 손가락을 멈추게 하는 헤드라인 작성 공식을 공개합니다.",
      badge: "알고리즘 비밀",
      icon: "🎯",
    },
    {
      step: "STAGE 04",
      title: "단순 조회를 ‘진짜 계약 문의 콜’로 바꾸는 비법",
      desc: "영상만 보고 나가는 시청자를 내 사무실 고객으로 만드는 영상 설명란 세팅, 고정 댓글 전략, 실시간 카톡 상담 링크 연동법을 완벽히 마스터합니다.",
      badge: "실전 전환",
      icon: "📞",
    },
  ];

  const bonusPerks = [
    {
      title: "공실뉴스 유튜브 채널 동시 송출",
      desc: "제작하신 우수 매물 영상을 공실뉴스 공식 유튜브 채널과 포털에 동시 송출하여 전국 투자자에게 노출해 드립니다.",
      icon: "🚀",
    },
    {
      title: "쇼츠 전용 디자인 템플릿 20종 무상 제공",
      desc: "디자이너가 제작한 폰트, 자막 바, 인트로 템플릿을 무료로 다운로드하여 바로 적용할 수 있습니다.",
      icon: "🎁",
    },
    {
      title: "1:1 영상 피드백 & 채널 진단 클리닉",
      desc: "처음 올린 3편의 영상에 대해 전문 PD가 썸네일, 음질, 구도를 1:1로 직접 피드백해 드립니다.",
      icon: "👨‍🏫",
    },
  ];

  const faqs = [
    {
      q: "컴퓨터나 스마트폰을 잘 못 다루는 60대 중개사도 배울 수 있나요?",
      a: "네! 본 강의는 컴퓨터 전공자가 아닌 중개사 소장님들의 눈높이에 맞춰 마우스 클릭 하나, 스마트폰 터치 하나까지 단계별로 천천히 안내합니다. 현재 50~60대 소장님들이 가장 활발히 영상을 업로드하고 계십니다.",
    },
    {
      q: "강의는 어디서, 언제 수강할 수 있나요?",
      a: "공실뉴스부동산 파트너로 입점 승인되시면 즉시 '파트너 전용 온라인 아카데미' 계정이 발급되며, PC와 스마트폰으로 24시간 언제 어디서나 무제한 반복 수강하실 수 있습니다.",
    },
    {
      q: "비싼 촬영 장비나 마이크를 따로 사야 하나요?",
      a: "전혀 사실 필요 없습니다! 소장님이 지금 들고 계신 스마트폰과 1만 원대 다이소 삼각대 하나면 충분합니다. 장비 욕심 대신 콘텐츠 내용으로 승부하는 실전 노하우를 가르쳐 드립니다.",
    },
    {
      q: "강의는 정말 평생 무료인가요?",
      a: "네, 공실뉴스부동산 파트너 회원님들께는 멤버십 유지 기간 동안 모든 정규 강의 및 매월 업데이트되는 신규 특강이 100% 전액 무료로 제공됩니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ 1. GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 2. 서브 탭 네비게이션 ━━━ */}
      <BenefitsSubNav activeTab="youtube-lecture" />

      {/* ━━━ 3. 히어로 섹션 ━━━ */}
      <section
        style={{
          background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
          padding: "70px 20px 60px 20px",
          textAlign: "center",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#ffedd5",
              color: "#ea580c",
              fontSize: "13px",
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: "20px",
              marginBottom: "20px",
            }}
          >
            <span>🎬 BENEFIT 02</span>
            <span>•</span>
            <span>중개사 전용 실전 미디어 스쿨</span>
          </div>

          <h1
            style={{
              fontSize: "38px",
              fontWeight: 900,
              lineHeight: 1.35,
              color: "#0f172a",
              letterSpacing: "-1px",
              margin: "0 0 20px 0",
            }}
          >
            스마트폰 하나로 계약까지 이끄는<br />
            <span style={{ color: "#ff8e15" }}>‘부동산 유튜브 & 쇼츠’ 실전 마스터클래스</span> 전액 무료
          </h1>

          <p
            style={{
              fontSize: "17px",
              color: "#475569",
              lineHeight: 1.7,
              margin: "0 0 36px 0",
              fontWeight: 500,
            }}
          >
            카메라 울렁증? 비싼 장비? 복잡한 영상 편집? 전부 걱정하지 마세요.<br />
            현업 전문 유튜버와 PD가 <strong>중개사 맞춤 15분 AI 영상 제작법</strong>을 100% 무료로 전수합니다.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/newsrealty/apply"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "15px 32px",
                backgroundColor: "#ff8e15",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 800,
                borderRadius: "10px",
                textDecoration: "none",
                boxShadow: "0 8px 20px rgba(255, 142, 21, 0.35)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0790b")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ff8e15")}
            >
              <span>파트너 신청하고 무료 수강하기</span>
              <span>→</span>
            </Link>
            <a
              href="#curriculum"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "15px 26px",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: "16px",
                fontWeight: 700,
                borderRadius: "10px",
                textDecoration: "none",
                border: "1px solid #cbd5e1",
              }}
            >
              커리큘럼 확인하기 ↓
            </a>
          </div>
        </div>
      </section>

      {/* ━━━ 4. 핵심 지표 통계 카드 ━━━ */}
      <section style={{ maxWidth: "1080px", margin: "-30px auto 70px auto", padding: "0 20px", position: "relative", zIndex: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            backgroundColor: "#ffffff",
            padding: "24px",
            borderRadius: "18px",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e2e8f0",
          }}
        >
          {stats.map((stat, idx) => (
            <div
              key={idx}
              style={{
                textAlign: "center",
                padding: "16px 12px",
                borderRight: idx < 3 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>{stat.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: stat.highlight ? "#ff8e15" : "#0f172a", letterSpacing: "-0.5px", marginBottom: "6px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 5. 실전 커리큘럼 4단계 ━━━ */}
      <section id="curriculum" style={{ maxWidth: "1080px", margin: "0 auto 80px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ color: "#ff8e15", fontSize: "14px", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px" }}>
            CURRICULUM
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
            왕초보도 1주일 만에 유튜버가 되는 4단계 코스
          </h2>
          <p style={{ fontSize: "15px", color: "#64748b", marginTop: "10px" }}>
            어려운 이론은 뺐습니다. 현업 부동산 매물을 직접 찍고 올려 문의 전화가 오게 만드는 실전만 담았습니다.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          {curriculum.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "18px",
                padding: "32px 28px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontSize: "32px" }}>{item.icon}</span>
                <span
                  style={{
                    backgroundColor: "#fff5eb",
                    color: "#ff8e15",
                    fontSize: "12px",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: "1px solid #ffd8b2",
                  }}
                >
                  {item.badge}
                </span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#ff8e15", marginBottom: "6px" }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#1e293b", margin: "0 0 12px 0", letterSpacing: "-0.3px" }}>
                {item.title}
              </h3>
              <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: 1.65, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 6. 파트너 전용 특별 보너스 특전 ━━━ */}
      <section style={{ backgroundColor: "#f8fafc", padding: "80px 20px", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
              강의만 듣고 끝나지 않습니다. <span style={{ color: "#ff8e15" }}>3대 파트너 특별 혜택</span>
            </h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
              채널 개설부터 첫 계약이 터질 때까지 공실뉴스가 함께 달립니다.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {bonusPerks.map((perk, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "30px 24px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "16px" }}>{perk.icon}</div>
                <h3 style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b", margin: "0 0 10px 0" }}>
                  {perk.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                  {perk.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 7. 자주 묻는 질문 FAQ ━━━ */}
      <section style={{ maxWidth: "800px", margin: "80px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
            자주 묻는 질문
          </h2>
          <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>
            유튜브 무료 강의에 관해 가장 많이 묻는 질문입니다.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  backgroundColor: "#ffffff",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    width: "100%",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "15.5px",
                    fontWeight: 800,
                    color: isOpen ? "#ff8e15" : "#1e293b",
                  }}
                >
                  <span>Q. {faq.q}</span>
                  <span style={{ fontSize: "18px", transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "0 20px 20px 20px",
                      fontSize: "14.5px",
                      color: "#475569",
                      lineHeight: 1.65,
                      borderTop: "1px solid #f8fafc",
                    }}
                  >
                    A. {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ 8. 하단 와이드 CTA 배너 ━━━ */}
      <section
        style={{
          background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
          color: "#ffffff",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ color: "#ff8e15", fontSize: "14px", fontWeight: 800, marginBottom: "12px" }}>
            LIMITED PARTNER PRIVILEGE
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 900, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
            지금 파트너 등록하고 120만원 상당 유튜브 강의를 전액 무료로 수강하세요
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 32px 0" }}>
            블로그와 포털 리스팅 경쟁에서 벗어나, 유튜브로 독점 고객을 확보할 절호의 기회입니다.
          </p>
          <Link
            href="/newsrealty/apply"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "16px 36px",
              backgroundColor: "#ff8e15",
              color: "#ffffff",
              fontSize: "16.5px",
              fontWeight: 800,
              borderRadius: "10px",
              textDecoration: "none",
              boxShadow: "0 10px 25px rgba(255, 142, 21, 0.4)",
            }}
          >
            <span>무료 수강 파트너 신청하기</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";

export default function MobileYoutubeLecturePage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { label: "강의 수강료", value: "0원 전액무료", desc: "정가 120만원 상당", highlight: true },
    { label: "수강 만족도", value: "98.7%", desc: "현직 중개사 850+명", highlight: false },
    { label: "영상 제작 시간", value: "15분", desc: "스마트폰 & AI 템플릿", highlight: true },
    { label: "문의 콜 증가", value: "2.6배↑", desc: "쇼츠 & 브랜딩 효과", highlight: false },
  ];

  const curriculum = [
    { step: "01", title: "스마트폰 매물 촬영법", desc: "비싼 카메라 없이 기본 스마트폰으로 채광과 구도를 살리는 3분 촬영법.", icon: "📱" },
    { step: "02", title: "AI 컷편집 & 자막 자동화", desc: "CapCut/Vrew로 말실수 컷편집 및 음성인식 자막 100% 자동 생성.", icon: "⚡" },
    { step: "03", title: "알고리즘 썸네일 노하우", desc: "클릭을 부르는 유튜브 썸네일 황금비율과 시선을 사로잡는 제목 카피.", icon: "🎯" },
    { step: "04", title: "조회수를 계약 콜로 전환", desc: "설명란 세팅, 고정 댓글, 실시간 카톡 상담 링크 연동 비법 전수.", icon: "📞" },
  ];

  const faqs = [
    {
      q: "컴퓨터를 잘 못 다루는 60대도 가능한가요?",
      a: "네! 마우스 클릭, 스마트폰 터치 하나까지 단계별로 천천히 알려드립니다.",
    },
    {
      q: "강의는 어디서 듣나요?",
      a: "입점 승인 후 파트너 전용 온라인 아카데미에서 PC/모바일로 24시간 반복 수강 가능합니다.",
    },
    {
      q: "정말 무료인가요?",
      a: "공실뉴스 파트너 회원님들께는 멤버십 기간 동안 정규 강의와 신규 특강이 100% 전액 무료입니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: "80px" }}>
      {/* ━━━ 모바일 상단 고정 헤더 ━━━ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: "none", border: "none", fontSize: "18px", color: "#475569", cursor: "pointer", padding: "4px" }}
          >
            ‹
          </button>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 800, color: "#111827", textDecoration: "none" }}>
            공실뉴스부동산
          </Link>
        </div>
        <Link
          href="/m/newsrealty/apply"
          style={{
            fontSize: "12.5px",
            fontWeight: 800,
            color: "#ffffff",
            backgroundColor: "#ff8e15",
            padding: "5px 12px",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          입점신청
        </Link>
      </header>

      {/* ━━━ 모바일 서브 탭 ━━━ */}
      <BenefitsSubNav activeTab="youtube-lecture" isMobile={true} />

      {/* ━━━ 모바일 히어로 ━━━ */}
      <section style={{ padding: "36px 16px 30px 16px", background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: "#ffedd5",
            color: "#ea580c",
            fontSize: "11.5px",
            fontWeight: 800,
            padding: "4px 12px",
            borderRadius: "14px",
            marginBottom: "14px",
          }}
        >
          🎬 BENEFIT 02. 실전 미디어 스쿨
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1.4, color: "#0f172a", margin: "0 0 14px 0", letterSpacing: "-0.5px" }}>
          스마트폰 하나로 시작하는<br />
          <span style={{ color: "#ff8e15" }}>부동산 유튜브 & 쇼츠 강의</span> 전액 무료
        </h1>

        <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6, margin: "0 0 24px 0" }}>
          카메라 울렁증, 편집 고민 끝! 전문 PD가 전수하는 15분 AI 영상 제작법을 100% 무료로 수강하세요.
        </p>

        <Link
          href="/m/newsrealty/apply"
          style={{
            display: "block",
            width: "100%",
            padding: "14px",
            backgroundColor: "#ff8e15",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: 800,
            borderRadius: "10px",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(255, 142, 21, 0.3)",
          }}
        >
          파트너 신청하고 무료 수강하기 →
        </Link>
      </section>

      {/* ━━━ 모바일 핵심 지표 카드 ━━━ */}
      <section style={{ padding: "0 16px", marginTop: "-10px", marginBottom: "36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 12px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>{stat.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: stat.highlight ? "#ff8e15" : "#0f172a", marginBottom: "2px" }}>{stat.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 모바일 커리큘럼 ━━━ */}
      <section style={{ padding: "0 16px 40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ color: "#ff8e15", fontSize: "12px", fontWeight: 800, marginBottom: "4px" }}>CURRICULUM</div>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", margin: 0 }}>실전 4단계 커리큘럼</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {curriculum.map((item, idx) => (
            <div key={idx} style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "18px 16px", border: "1px solid #e2e8f0", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "24px" }}>{item.icon}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#ff8e15" }}>STAGE {item.step}</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b" }}>{item.title}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ 모바일 FAQ ━━━ */}
      <section style={{ padding: "0 16px 40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", margin: 0 }}>자주 묻는 질문</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", backgroundColor: "#ffffff" }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", textAlign: "left", fontSize: "14px", fontWeight: 800, color: isOpen ? "#ff8e15" : "#1e293b" }}
                >
                  <span>Q. {faq.q}</span>
                  <span style={{ fontSize: "14px", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px 16px", fontSize: "13px", color: "#475569", lineHeight: 1.6, borderTop: "1px solid #f1f5f9" }}>
                    A. {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ 모바일 하단 고정 CTA 바 ━━━ */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          padding: "10px 16px",
          display: "flex",
          gap: "10px",
          zIndex: 50,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
        }}
      >
        <a
          href="tel:1555-5343"
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor: "#f1f5f9",
            color: "#334155",
            fontSize: "13.5px",
            fontWeight: 800,
            borderRadius: "8px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          전화 상담
        </a>
        <Link
          href="/m/newsrealty/apply"
          style={{
            flex: 2,
            padding: "12px",
            backgroundColor: "#ff8e15",
            color: "#ffffff",
            fontSize: "14.5px",
            fontWeight: 800,
            borderRadius: "8px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          무료 수강 신청하기
        </Link>
      </div>
    </div>
  );
}

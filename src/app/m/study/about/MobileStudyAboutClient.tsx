"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";

const FAQS = [
  {
    q: "초보 공인중개사도 AI 쇼츠를 만들 수 있나요?",
    a: "네! 복잡한 코딩 없이 클릭 몇 번으로 매물 쇼츠와 블로그 글을 뽑아내는 실습 위주로 구성되어 있어 누구나 쉽게 따라할 수 있습니다.",
  },
  {
    q: "1년 과정은 언제든 시작할 수 있나요?",
    a: "상시 가입 즉시 시작 가능하며, 가입일로부터 365일간 모든 강의와 실무 서식을 무제한 이용할 수 있습니다.",
  },
  {
    q: "실무 서식은 어디서 다운로드받나요?",
    a: "강의실 내 자료실 및 상단 [자료실] 메뉴에서 한글(HWP), 엑셀, AI 프롬프트 원본을 자유롭게 다운로드받으실 수 있습니다.",
  },
  {
    q: "스마트폰에서도 강의를 편하게 볼 수 있나요?",
    a: "네! 모바일 전용 뷰어와 이어보기 기능이 완벽히 지원되어 이동 중에도 편안하게 수강하실 수 있습니다.",
  },
];

export default function MobileStudyAboutClient() {
  const router = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div style={{ width: "100%", backgroundColor: "#f8fafc", minHeight: "100vh", paddingBottom: "80px", paddingTop: "56px", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b" }}>
      <MobileTopBarHeader activeTab="study" />

      {/* ── 1. 상단 뒤로가기 바 ── */}
      <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link
          href="/m/study"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: "13px",
            fontWeight: 700,
            color: "#059669",
            textDecoration: "none",
            background: "#ecfdf5",
            padding: "5px 10px",
            borderRadius: 6,
          }}
        >
          <span>‹</span>
          <span>특강 목록으로 돌아가기</span>
        </Link>
      </div>

      {/* ── 2. 모바일 히어로 배너 (Clean & Centered YunJaDong style) ── */}
      <div style={{ backgroundColor: "#062326", color: "#ffffff", padding: "32px 20px 28px", margin: "10px 16px 20px", borderRadius: 16, boxShadow: "0 4px 16px rgba(6,35,38,0.15)", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", padding: "4px 10px", borderRadius: 16, fontSize: 11.5, fontWeight: 700, color: "#6ee7b7", marginBottom: 16 }}>
          <span>🌿</span>
          <span>ABOUT 공실스터디</span>
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.5px", margin: "0 auto 12px", color: "#ffffff" }}>
          매주 보고 따라 하다 보면,<br />
          AI와 유튜브가 <span style={{ color: "#34d399" }}>익숙해집니다.</span>
        </h1>

        <p style={{ fontSize: "13px", color: "#a7f3d0", opacity: 0.9, lineHeight: 1.6, margin: "0 auto 20px", wordBreak: "keep-all" }}>
          공실뉴스는 매주 부동산 실무와 마케팅에 꼭 필요한 실전 특강을 제공합니다. 놓친 강의는 언제든 무제한 다시보기로 복습할 수 있어요.
        </p>

        <Link
          href="/m/study"
          style={{
            display: "block",
            textAlign: "center",
            padding: "13px 20px",
            background: "#059669",
            color: "#ffffff",
            borderRadius: 10,
            fontSize: "14.5px",
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
          }}
        >
          특강 둘러보기 →
        </Link>
      </div>

      {/* ━━━ 3. 3D PASTEL AVATARS: 성공 스토리 ━━━ */}
      <div style={{ padding: "0 16px", marginBottom: 28 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#062828", margin: "0 0 6px 0", lineHeight: 1.35 }}>
            나이가 많아서요? 컴맹이라서요?<br />
            <span style={{ color: "#059669" }}>초보라서 못 할 것 같다고요?</span>
          </h2>
          <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            그 걱정, 이제 내려놓으셔도 됩니다.<br />먼저 1년 동안 해내신 분들이 증명했거든요.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
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
              quote: "“1년 넘게 공실이던 3층 통상가, 공실스터디에서 배운 타깃 마케팅으로 2주 만에 프랜차이즈 임대 맞췄습니다.”",
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
              quote: "“어려운 유찰 물건 권리분석부터 특약 작성까지, 1년 스터디 실무 서식 덕분에 안전하게 계약 체결했어요.”",
              author: "경기 분당구 공인중개사 최OO 대표",
              image: "/images/study/avatar_senior_female.jpg",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ width: 72, height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={item.image} alt={item.role} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4, marginBottom: 4 }}>
                  {item.role}
                </span>
                <p style={{ fontSize: "12.5px", fontWeight: 700, color: "#062828", lineHeight: 1.45, margin: "0 0 4px 0" }}>
                  {item.quote}
                </p>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {item.author}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ 4. 12개월 마스터 로드맵 ━━━ */}
      <div style={{ padding: "0 16px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#062828" }}>1년 12개월 로드맵</span>
          <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>4단계 마스터 플랜</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q1 (1~3개월)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🤖 AI 무기 장착</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>1분 매물 쇼츠·블로그 10배 자동화</div>
          </div>

          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q2 (4~6개월)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🏢 실전 공실 해결</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>상가/원룸 임대 마케팅 클로징</div>
          </div>

          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q3 (7~9개월)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🔨 경공매 권리분석</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>유찰 물건 발굴·특수물건 중개</div>
          </div>

          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Q4 (10~12개월)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#062828", marginBottom: 2 }}>🏆 지역 1등 안착</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>유튜브 채널·11만 공동중개망</div>
          </div>
        </div>
      </div>

      {/* ━━━ 5. FAQ ━━━ */}
      <div style={{ padding: "0 16px 32px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#062828", marginBottom: 12 }}>
          자주 묻는 질문 (FAQ)
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                style={{
                  backgroundColor: "#ffffff",
                  border: isOpen ? "1.5px solid #059669" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  boxShadow: isOpen ? "0 2px 8px rgba(5, 150, 105, 0.08)" : "none",
                }}
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: isOpen ? "#064e3b" : "#1e293b", lineHeight: 1.4 }}>
                    Q. {faq.q}
                  </span>
                  <span style={{ color: isOpen ? "#059669" : "#94a3b8", fontSize: 12, flexShrink: 0 }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 16px 14px 16px", fontSize: 12.5, color: "#334155", lineHeight: 1.6, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 하단 특강 바로가기 CTA */}
        <div style={{ marginTop: 24 }}>
          <Link
            href="/m/study"
            style={{
              display: "block",
              textAlign: "center",
              padding: "14px",
              background: "#059669",
              color: "#ffffff",
              borderRadius: 10,
              fontSize: "15px",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
            }}
          >
            전체 특강 라인업 보러가기 →
          </Link>
        </div>
      </div>

    </div>
  );
}

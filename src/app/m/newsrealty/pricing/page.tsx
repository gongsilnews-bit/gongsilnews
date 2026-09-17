"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function MobileNewsrealtyPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const faqs = [
    {
      q: "가입비나 연회비 등 추가 비용이 있나요?",
      a: "전혀 없습니다! 가입비 0원, 연회비 0원이며 월 30,000원(VAT 포함)으로 모든 프리미엄 혜택을 누리실 수 있습니다.",
    },
    {
      q: "중도 해지 시 위약금이 있나요?",
      a: "위약금은 0원입니다. 의무 약정이 없으므로 언제든 자유롭게 해지하실 수 있습니다.",
    },
    {
      q: "세금계산서 발행이 가능한가요?",
      a: "네! 사업자등록번호로 매월 100% 매입 세액공제가 가능한 전자세금계산서가 자동 발행됩니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: "80px" }}>
      {/* ━━━ 모바일 상단 헤더 ━━━ */}
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

      {/* ━━━ 모바일 히어로 타이틀 ━━━ */}
      <section style={{ padding: "36px 16px 24px 16px", background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: "#fff2e8",
            color: "#ea580c",
            fontSize: "12px",
            fontWeight: 800,
            padding: "4px 12px",
            borderRadius: "14px",
            marginBottom: "14px",
            border: "1px solid #ffd8b2",
          }}
        >
          가입비 0원 · 연회비 0원
        </div>

        <h1 style={{ fontSize: "25px", fontWeight: 900, lineHeight: 1.35, color: "#1c1917", margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>
          <span style={{ color: "#ff8e15" }}>월 3만 원</span>으로<br />
          지역 1등 로컬기자 파트너가 되세요
        </h1>

        <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: 1.5, margin: "0 0 20px 0" }}>
          일반 무료 회원과 공실뉴스 파트너의 압도적인 혜택 차이를 확인해 보세요.
        </p>
      </section>

      {/* ━━━ 모바일 플랜 카드 (추천 플랜 상단 배치) ━━━ */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* 1. 공실뉴스부동산 (로컬기자 전용 플랜 - 하이라이트) */}
        <div
          style={{
            background: "#ffffff",
            border: "2px solid #ff8e15",
            borderRadius: "18px",
            padding: "30px 22px",
            boxShadow: "0 10px 30px rgba(255, 142, 21, 0.15)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #ff8e15 0%, #e67e10 100%)",
              color: "#ffffff",
              padding: "4px 14px",
              borderRadius: "14px",
              fontSize: "11px",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            🔥 강력 추천 · 대표 파트너십
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", marginTop: "4px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#1c1917", margin: 0 }}>
              공실뉴스부동산
            </h3>
            <span style={{ fontSize: "11px", fontWeight: 800, background: "#fff2e8", color: "#ea580c", padding: "3px 8px", borderRadius: "12px" }}>
              로컬기자 전용
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "32px", fontWeight: 900, color: "#1c1917", letterSpacing: "-0.5px" }}>
              ₩30,000
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", marginLeft: 4 }}>
                / 월 (VAT 포함)
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#ff8e15", fontWeight: 700, margin: "4px 0 0" }}>
              가입비 0원 · 연회비 0원 · 위약금 없이 즉시 해지 가능
            </p>
          </div>

          <button
            type="button"
            onClick={handleApplyClick}
            style={{
              width: "100%",
              height: "46px",
              backgroundColor: "#ff8e15",
              border: "none",
              borderRadius: "8px",
              fontSize: "14.5px",
              fontWeight: 800,
              color: "#ffffff",
              cursor: "pointer",
              marginBottom: "20px",
              boxShadow: "0 4px 12px rgba(255, 142, 21, 0.3)",
            }}
          >
            공실뉴스부동산 신청하기 ➔
          </button>

          <div style={{ borderTop: "1px solid #fed7aa", paddingTop: "18px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#1c1917", marginBottom: "12px" }}>
              포함된 모든 전용 혜택
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>공실 등록 : <strong>월 20건</strong> (11만 호가망 실시간 노출)</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>기사 등록 : <strong>월 4건 정식 송고</strong> (뉴스 포털 노출)</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>물건 보고서 : <strong style={{ color: "#ff8e15" }}>AI 물건보고서 무제한 생성</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>광고 등록 : <strong>포털 내 매물 광고 등록 가능</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>광고 영업 : <strong style={{ color: "#ea580c" }}>뉴스 광고영업 (20~50% 지급)</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>커뮤니티 : <strong>정회원 전용 커뮤니티 가입</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>자료실 : <strong>실무 서식·계약서 무료 다운로드</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>드론 영상 : <strong>고화질 드론 영상 저작권 무료</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1c1917" }}>
                <span style={{ color: "#ff8e15", fontWeight: 900 }}>✓</span>
                <span>공실 스터디 : <strong>실무 마케팅 강좌 무료 수강</strong></span>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. 일반부동산 (무료) */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "24px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#334155", margin: 0 }}>
              일반부동산
            </h3>
            <span style={{ fontSize: "11px", fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "3px 8px", borderRadius: "10px" }}>
              기본 플랜
            </span>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "26px", fontWeight: 900, color: "#1e293b" }}>
              ₩0
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginLeft: 4 }}>
                / 평생 무료
              </span>
            </div>
            <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
              기본적인 공실 등록과 체험이 가능한 플랜
            </p>
          </div>

          <button
            type="button"
            onClick={handleGeneralLoginClick}
            style={{
              width: "100%",
              height: "42px",
              backgroundColor: "#1e293b",
              border: "none",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 800,
              color: "#ffffff",
              cursor: "pointer",
              marginBottom: "16px",
            }}
          >
            {user ? "일반부동산 바로가기 ➔" : "일반부동산 바로가기 ➔"}
          </button>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
            <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#64748b", marginBottom: "8px" }}>
              제공되는 기본 기능
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                <span>공실 등록 : <strong>최초 3건</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                <span>기사 등록 : <strong>최초 3건</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                <span style={{ color: "#059669", fontWeight: 900 }}>✓</span>
                <span>물건 보고서 : <strong>일부 기본 열람</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
                <span style={{ color: "#cbd5e1" }}>✕</span>
                <span style={{ textDecoration: "line-through" }}>광고 등록 : 불가</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
                <span style={{ color: "#cbd5e1" }}>✕</span>
                <span style={{ textDecoration: "line-through" }}>뉴스 광고영업 : 불가</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ━━━ 모바일 FAQ ━━━ */}
      <section style={{ padding: "30px 16px 20px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", margin: 0 }}>자주 묻는 질문</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", backgroundColor: "#ffffff" }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", textAlign: "left", fontSize: "13.5px", fontWeight: 800, color: isOpen ? "#ff8e15" : "#1e293b" }}
                >
                  <span>Q. {faq.q}</span>
                  <span style={{ fontSize: "14px", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px 16px", fontSize: "12.5px", color: "#475569", lineHeight: 1.6, borderTop: "1px solid #f1f5f9" }}>
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
        <button
          type="button"
          onClick={handleApplyClick}
          style={{
            flex: 2,
            padding: "12px",
            backgroundColor: "#ff8e15",
            color: "#ffffff",
            fontSize: "14.5px",
            fontWeight: 800,
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          공실뉴스 파트너 신청
        </button>
      </div>
    </div>
  );
}

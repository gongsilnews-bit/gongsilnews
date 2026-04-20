"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";

const PlayLogo = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="24" fill="#222222" />
    <circle cx="24" cy="24" r="16" fill="#FFFFFF" />
    <path d="M19 15.34L34 24L19 32.66Z" fill="#F59E0B" stroke="#222222" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#1e56a0" />
    <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const stats = [
  { label: "누적 가입 중개사", value: "11만+", sub: "전국 중개사무소" },
  { label: "부동산 뉴스 콘텐츠", value: "50,000+", sub: "일일 업데이트" },
  { label: "무료 특강 영상", value: "300+", sub: "AI 기반 맞춤 추천" },
];

const features = [
  {
    icon: "📰",
    title: "로컬 부동산이 직접 전달하는\n시세 현황 뉴스",
    desc: "각 지역 현장 중개사가 직접 작성하는 실시간 시세 동향과 매물 정보를 가장 빠르게 확인하세요. 동네별 공실률, 매매·전세 시세 변동까지 한눈에 파악할 수 있습니다.",
    color: "#1e56a0",
  },
  {
    icon: "🎬",
    title: "중개사에게 꼭 필요한\nAI 유튜브 특강 시청",
    desc: "세무·법률·마케팅·실무 노하우까지, AI가 엄선한 부동산 전문 특강을 무료로 시청하세요. 바쁜 중개사를 위해 핵심만 담은 콘텐츠로 경쟁력을 높일 수 있습니다.",
    color: "#F59E0B",
  },
  {
    icon: "🤝",
    title: "대한민국 부동산 누구나 가입하는\n100% 무료 공동중개망",
    desc: "가입비·수수료 제로! 전국 어디서나 공동중개 매물을 등록하고 조회해보세요. 지금 공실뉴스에 가입한 11만 중개사와 함께 더 많은 거래 기회를 만들 수 있습니다.",
    color: "#10b981",
  },
];

const faqs = [
  {
    q: "가입비나 이용료가 있나요?",
    a: "아닙니다. 공실뉴스는 중개사무소를 위한 100% 무료 서비스입니다. 가입비, 월 이용료, 수수료가 전혀 없습니다.",
  },
  {
    q: "가입에 필요한 서류가 있나요?",
    a: "사업자등록증과 중개사무소 개설등록증이 필요합니다. 가입 후 마이페이지에서 간편하게 업로드하실 수 있습니다.",
  },
  {
    q: "일반 회원도 가입할 수 있나요?",
    a: "네! 부동산 뉴스 열람과 특강 시청은 누구나 무료로 이용 가능합니다. 공동중개 기능은 중개사무소 인증 후 사용하실 수 있습니다.",
  },
  {
    q: "공동중개 매물은 어떻게 등록하나요?",
    a: "가입 후 관리자 페이지에서 간편하게 공실/매물 정보를 등록할 수 있으며, 등록 즉시 전국 중개사에게 노출됩니다.",
  },
];

export default function SignupPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="signup" />

      <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: "#fff", minHeight: "100vh" }}>

        {/* ===== Sticky Header ===== */}
        <header style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid #e5e7eb", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <PlayLogo size={36} />
            <span style={{ fontWeight: 900, fontSize: 18, color: "#111" }}>공실뉴스</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: "#555", textDecoration: "none", padding: "8px 12px", borderRadius: 6, transition: "background 0.2s" }}>홈</Link>
            <button onClick={() => setIsAuthModalOpen(true)} style={{ background: "#1e56a0", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
              onMouseOver={e => (e.currentTarget.style.background = "#163d7a")}
              onMouseOut={e => (e.currentTarget.style.background = "#1e56a0")}
            >무료 회원가입</button>
          </div>
        </header>

        {/* ===== Hero Section ===== */}
        <section style={{ background: "linear-gradient(135deg, #0f1b2d 0%, #1a3a6b 50%, #1e56a0 100%)", padding: "100px 40px 110px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.03)", top: -120, right: -100 }} />
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.02)", bottom: -80, left: -60 }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 740, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 50, padding: "8px 20px", marginBottom: 32, border: "1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 중개사무소가 선택한 무료 플랫폼</span>
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1.3, margin: "0 0 20px", letterSpacing: "-1px" }}>
              부동산 중개사를 위한<br /><span style={{ color: "#F59E0B" }}>100% 무료</span> 정보채널
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 44px", fontWeight: 400 }}>
              시세 뉴스, AI 특강, 공동중개망까지<br />중개 실무에 필요한 모든 것을 무료로 제공합니다.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setIsAuthModalOpen(true)} style={{ background: "#F59E0B", color: "#111", border: "none", borderRadius: 12, padding: "18px 48px", fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 30px rgba(245,158,11,0.35)", transition: "all 0.2s", letterSpacing: "-0.3px" }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(245,158,11,0.45)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(245,158,11,0.35)"; }}
              >중개사무소 무료 회원가입</button>
              <Link href="/" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "18px 36px", fontSize: 18, fontWeight: 700, textDecoration: "none", fontFamily: "inherit", transition: "all 0.2s" }}>홈으로 이동</Link>
            </div>
          </div>
        </section>

        {/* ===== Stats Cards ===== */}
        <section style={{ background: "#f9fafb", padding: "0 40px", position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 20, transform: "translateY(-48px)" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "32px 24px", textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", transition: "transform 0.2s" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#1e56a0", letterSpacing: "-1px" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Features Section ===== */}
        <section style={{ padding: "40px 40px 80px", background: "#f9fafb" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#111", margin: "0 0 12px", letterSpacing: "-0.5px" }}>왜 <span style={{ color: "#1e56a0" }}>공실뉴스</span>인가요?</h2>
              <p style={{ fontSize: 16, color: "#888", margin: 0 }}>중개사 실무를 위해 설계된 3가지 핵심 서비스</p>
            </div>

            {features.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: i % 2 === 1 ? "center" : "center",
                flexDirection: i % 2 === 1 ? "row-reverse" : "row",
                gap: 60, marginBottom: i < features.length - 1 ? 80 : 0,
                background: "#fff", borderRadius: 24, padding: "48px 52px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0",
              }}>
                <div style={{ flex: "0 0 120px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 8 }}>
                    {f.icon}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 24, fontWeight: 900, color: "#111", lineHeight: 1.4, margin: "0 0 14px", whiteSpace: "pre-line", letterSpacing: "-0.3px" }}>{f.title}</h3>
                  <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Checklist Section ===== */}
        <section style={{ background: "#fff", padding: "80px 40px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "#111", margin: "0 0 40px", letterSpacing: "-0.5px" }}>공실뉴스 가입 혜택 요약</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "left" }}>
              {[
                "전국 실시간 시세·공실 현황 뉴스 무료 열람",
                "AI 기반 맞춤형 부동산 유튜브 특강 무제한 시청",
                "수수료 제로, 100% 무료 공동중개 매물 등록·검색",
                "전문 기자단이 작성하는 프리미엄 분석 리포트",
                "동네별 부동산 지수 및 동향 데이터 무료 제공",
                "드론 영상, 계약서 양식 등 실무 자료실 이용",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px", background: "#f8fafc", borderRadius: 12, border: "1px solid #eef2f7", transition: "all 0.2s" }}>
                  <CheckIcon />
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#333", letterSpacing: "-0.3px" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ Section ===== */}
        <section style={{ background: "#f4f6fa", padding: "80px 40px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 900, color: "#1e56a0", margin: "0 0 40px", letterSpacing: "-0.5px" }}>자주 묻는 질문</h2>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, marginBottom: 12, border: "1px solid #e8eaef", overflow: "hidden", transition: "all 0.2s" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", padding: "20px 24px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#222", textAlign: "left" }}>{faq.q}</span>
                  <span style={{ fontSize: 20, color: "#999", flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", fontSize: 14, color: "#666", lineHeight: 1.8 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ===== Final CTA ===== */}
        <section style={{ background: "linear-gradient(135deg, #0f1b2d 0%, #1a3a6b 100%)", padding: "80px 40px", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <PlayLogo size={56} />
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: "24px 0 12px", letterSpacing: "-0.5px" }}>
              대한민국 대표 부동산 정보채널,<br />공실뉴스를 지금 시작하세요.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", margin: "0 0 40px" }}>가입비·이용료 전혀 없이, 모든 기능을 무료로 이용하세요.</p>
            <button onClick={() => setIsAuthModalOpen(true)} style={{ background: "#F59E0B", color: "#111", border: "none", borderRadius: 12, padding: "20px 64px", fontSize: 20, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 30px rgba(245,158,11,0.35)", transition: "all 0.2s", letterSpacing: "-0.3px" }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(245,158,11,0.45)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(245,158,11,0.35)"; }}
            >중개사무소 무료 회원가입</button>
          </div>
        </section>

        {/* ===== Footer ===== */}
        <footer style={{ background: "#111", padding: "40px", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
              문의: <a href="mailto:gongsilmarketing@gmail.com" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>gongsilmarketing@gmail.com</a>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>© 2026 공실뉴스. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}

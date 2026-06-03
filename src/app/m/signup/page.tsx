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
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
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
    desc: "각 지역 현장 중개사가 직접 작성하는 실시간 시세 동향과 공실광고 정보를 가장 빠르게 확인하세요. 동네별 공실률, 매매·전세 시세 변동까지 한눈에 파악할 수 있습니다.",
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
    desc: "가입비·수수료 제로! 전국 어디서나 공동중개 공실광고을 등록하고 조회해보세요. 지금 공실뉴스에 가입한 11만 중개사와 함께 더 많은 거래 기회를 만들 수 있습니다.",
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
    q: "공동중개 공실광고는 어떻게 등록하나요?",
    a: "가입 후 관리자 페이지에서 간편하게 공실/공실광고 정보를 등록할 수 있으며, 등록 즉시 전국 중개사에게 노출됩니다.",
  },
];

export default function MobileSignupPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="signup" />

      <div className="m-signup-container">
        <style>{`
          .m-signup-container {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            background: #fff;
            min-height: 100vh;
            color: #111;
          }
          
          /* ===== Header ===== */
          .m-signup-header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
          }
          .m-header-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
          }
          .m-header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          /* ===== Hero ===== */
          .m-signup-hero {
            background: linear-gradient(135deg, #0f1b2d 0%, #1a3a6b 50%, #1e56a0 100%);
            padding: 60px 20px 80px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .m-hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.12);
            border-radius: 50px;
            padding: 6px 16px;
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.15);
            font-size: 13px;
            color: rgba(255,255,255,0.95);
            font-weight: 600;
          }
          .m-hero-title {
            font-size: 28px;
            font-weight: 900;
            color: #fff;
            line-height: 1.35;
            margin: 0 0 16px;
            letter-spacing: -1px;
            word-break: keep-all;
          }
          .m-hero-desc {
            font-size: 15px;
            color: rgba(255,255,255,0.8);
            line-height: 1.6;
            margin: 0 0 32px;
            font-weight: 400;
            word-break: keep-all;
          }

          /* ===== Buttons ===== */
          .m-btn-primary {
            width: 100%;
            background: #F59E0B;
            color: #111;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(245,158,11,0.35);
            margin-bottom: 12px;
            display: block;
            text-align: center;
            text-decoration: none;
          }
          .m-btn-outline {
            width: 100%;
            background: rgba(255,255,255,0.12);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            display: block;
            text-align: center;
          }

          /* ===== Stats ===== */
          .m-stats-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 0 20px;
            transform: translateY(-30px);
            position: relative;
            z-index: 2;
          }
          .m-stat-card {
            background: #fff;
            border-radius: 16px;
            padding: 24px 20px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border: 1px solid #f0f0f0;
          }
          .m-stat-label { font-size: 13px; font-weight: 600; color: #888; margin-bottom: 6px; }
          .m-stat-val { font-size: 28px; font-weight: 900; color: #1e56a0; letter-spacing: -1px; }
          .m-stat-sub { font-size: 12px; color: #bbb; margin-top: 4px; }

          /* ===== Features ===== */
          .m-features-sec {
            padding: 20px 20px 60px;
            background: #f9fafb;
          }
          .m-feature-card {
            background: #fff;
            border-radius: 20px;
            padding: 32px 24px;
            margin-bottom: 24px;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.04);
            border: 1px solid #f0f0f0;
          }
          .m-feature-icon-wrap {
            width: 80px; height: 80px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 36px;
            margin: 0 auto 20px;
          }
          .m-feature-title {
            font-size: 20px; font-weight: 900; color: #111; line-height: 1.4;
            margin: 0 0 12px; white-space: pre-line; letter-spacing: -0.5px;
          }
          .m-feature-desc {
            font-size: 14px; color: #666; line-height: 1.7; margin: 0; word-break: keep-all;
          }

          /* ===== Checklist ===== */
          .m-check-sec {
            padding: 60px 20px;
            background: #fff;
          }
          .m-check-title {
            font-size: 24px; font-weight: 900; color: #111; text-align: center;
            margin: 0 0 28px; letter-spacing: -0.5px;
          }
          .m-check-item {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 16px 20px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #eef2f7;
            margin-bottom: 12px;
          }
          .m-check-text {
            font-size: 14px; font-weight: 600; color: #333; line-height: 1.5; letter-spacing: -0.3px;
          }

          /* ===== FAQ ===== */
          .m-faq-sec {
            padding: 60px 20px;
            background: #f4f6fa;
          }
          .m-faq-title {
            font-size: 24px; font-weight: 900; color: #1e56a0; text-align: center;
            margin: 0 0 28px; letter-spacing: -0.5px;
          }
          .m-faq-card {
            background: #fff; border-radius: 12px; margin-bottom: 12px;
            border: 1px solid #e8eaef; overflow: hidden;
          }
          .m-faq-q {
            width: 100%; padding: 18px 20px; background: none; border: none; cursor: pointer;
            display: flex; alignItems: center; justify-content: space-between;
            font-size: 15px; font-weight: 700; color: #222; text-align: left;
          }
          .m-faq-a {
            padding: 0 20px 18px; font-size: 14px; color: #666; line-height: 1.7; word-break: keep-all;
          }

          /* ===== CTA ===== */
          .m-cta-sec {
            padding: 60px 20px;
            background: linear-gradient(135deg, #0f1b2d 0%, #1a3a6b 100%);
            text-align: center;
          }
          .m-cta-title {
            font-size: 24px; font-weight: 900; color: #fff; line-height: 1.3;
            margin: 20px 0 12px; letter-spacing: -0.5px;
          }
          .m-cta-desc {
            font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 32px;
          }

          /* ===== Footer ===== */
          .m-footer {
            background: #111; padding: 32px 20px; text-align: center;
          }
        `}</style>

        {/* ===== Header ===== */}
        <header className="m-signup-header">
          <Link href="/m" className="m-header-logo">
            <PlayLogo size={28} />
            <span style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>공실뉴스</span>
          </Link>
          <div className="m-header-actions">
            <Link href="/m" style={{ fontSize: 13, fontWeight: 600, color: "#555", textDecoration: "none" }}>홈</Link>
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              style={{ background: "#1e56a0", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}
            >
              무료 회원가입
            </button>
          </div>
        </header>

        {/* ===== Hero ===== */}
        <section className="m-signup-hero">
          {/* Decorative Background */}
          <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,0.03)", top: -50, right: -50 }} />
          <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.02)", bottom: -50, left: -50 }} />
          
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="m-hero-badge">
              🏢 전국 <strong style={{ color: "#F59E0B" }}>11만</strong> 중개사무소가 선택
            </div>
            <h1 className="m-hero-title">
              부동산 중개사를 위한<br /><span style={{ color: "#F59E0B" }}>100% 무료</span> 정보채널
            </h1>
            <p className="m-hero-desc">
              시세 뉴스, AI 특강, 공동중개망까지<br />중개 실무에 필요한 모든 것을 무료로 제공합니다.
            </p>
            <div>
              <button className="m-btn-primary" onClick={() => setIsAuthModalOpen(true)}>중개사무소 무료 회원가입</button>
              <Link href="/m" className="m-btn-outline">홈으로 돌아가기</Link>
            </div>
          </div>
        </section>

        {/* ===== Stats ===== */}
        <div style={{ background: "#f9fafb" }}>
          <div className="m-stats-container">
            {stats.map((s, i) => (
              <div key={i} className="m-stat-card">
                <div className="m-stat-label">{s.label}</div>
                <div className="m-stat-val">{s.value}</div>
                <div className="m-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Features ===== */}
        <section className="m-features-sec">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111", margin: "0 0 8px", letterSpacing: "-0.5px" }}>왜 <span style={{ color: "#1e56a0" }}>공실뉴스</span>인가요?</h2>
            <p style={{ fontSize: 14, color: "#888", margin: 0 }}>중개사 실무를 위해 설계된 3가지 핵심 서비스</p>
          </div>

          {features.map((f, i) => (
            <div key={i} className="m-feature-card">
              <div className="m-feature-icon-wrap" style={{ background: `${f.color}15` }}>
                {f.icon}
              </div>
              <h3 className="m-feature-title">{f.title}</h3>
              <p className="m-feature-desc">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* ===== Checklist ===== */}
        <section className="m-check-sec">
          <h2 className="m-check-title">공실뉴스 가입 혜택 요약</h2>
          <div>
            {[
              "전국 실시간 시세·공실 현황 뉴스 무료 열람",
              "AI 기반 맞춤형 부동산 유튜브 특강 무제한 시청",
              "수수료 제로, 100% 무료 공동중개 공실광고 등록·검색",
              "전문 기자단이 작성하는 프리미엄 분석 리포트",
              "동네별 부동산 지수 및 동향 데이터 무료 제공",
              "드론 영상, 계약서 양식 등 실무 자료실 이용",
            ].map((item, i) => (
              <div key={i} className="m-check-item">
                <CheckIcon />
                <span className="m-check-text">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="m-faq-sec">
          <h2 className="m-faq-title">자주 묻는 질문</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="m-faq-card">
              <button className="m-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <span style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
              </button>
              {openFaq === i && (
                <div className="m-faq-a">{faq.a}</div>
              )}
            </div>
          ))}
        </section>

        {/* ===== Final CTA ===== */}
        <section className="m-cta-sec">
          <PlayLogo size={48} />
          <h2 className="m-cta-title">
            대한민국 대표 정보채널,<br />공실뉴스를 시작하세요.
          </h2>
          <p className="m-cta-desc">가입비·이용료 전혀 없이, 모든 기능을 무료로 이용하세요.</p>
          <button className="m-btn-primary" onClick={() => setIsAuthModalOpen(true)}>중개사무소 무료 회원가입</button>
        </section>

        {/* ===== Footer ===== */}
        <footer className="m-footer">
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
            문의: <a href="mailto:gongsilmarketing@gmail.com" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>gongsilmarketing@gmail.com</a>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>© 2026 공실뉴스. All rights reserved.</div>
        </footer>

      </div>
    </>
  );
}

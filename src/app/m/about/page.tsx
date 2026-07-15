"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";

// Network Node SVG Placeholder (Mobile Sized)
const NetworkGraphic = () => (
  <svg width="100%" height="auto" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ margin: "0 auto", display: "block", maxWidth: "240px" }}>
    <path d="M100 20 L180 80 L150 170 L50 170 L20 80 Z" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
    <path d="M100 20 L100 170 M20 80 L180 170 M180 80 L20 170 M100 20 L150 170 M100 20 L50 170 M20 80 L150 170 M180 80 L50 170 M100 100 L150 170" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
    <circle cx="100" cy="20" r="4" fill="#cbd5e1" />
    <circle cx="180" cy="80" r="4" fill="#cbd5e1" />
    <circle cx="150" cy="170" r="4" fill="#cbd5e1" />
    <circle cx="50" cy="170" r="4" fill="#cbd5e1" />
    <circle cx="20" cy="80" r="4" fill="#cbd5e1" />
    <circle cx="100" cy="100" r="3" fill="#94a3b8" />
  </svg>
);

export default function MobileAboutPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  // Fade-up animation observer
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 50);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />

      <div className="mobile-about-container">
        <style>{`
          .mobile-about-container {
            font-family: 'Pretendard Variable', 'Malgun Gothic', sans-serif;
            background: #fff;
            min-height: 100vh;
            color: #111;
          }
          
          .fade-up {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.8s ease-out, transform 0.8s ease-out;
          }
          .fade-up.animate-in {
            opacity: 1;
            transform: translateY(0);
          }
          .delay-100 { transition-delay: 100ms; }
          .delay-200 { transition-delay: 200ms; }

          /* Header */
          .mobile-about-header {
            display: flex;
            align-items: center;
            padding: 0 16px;
            height: 56px;
            border-bottom: 1px solid #eee;
            position: sticky;
            top: 0;
            background: #fff;
            z-index: 10;
          }

          /* Hero Section */
          .mobile-about-hero {
            position: relative;
            height: 360px;
            background-image: url('/about_hero_bg.png');
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;
            display: flex;
            align-items: center;
          }
          .mobile-about-hero::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to right, rgba(26, 32, 44, 0.9), rgba(26, 32, 44, 0.4));
            z-index: 1;
          }
          .m-hero-content {
            position: relative;
            z-index: 2;
            padding: 0 24px;
            width: 100%;
          }
          .m-hero-title {
            font-size: 32px;
            font-weight: 900;
            color: #fff;
            margin-bottom: 16px;
            letter-spacing: -1.5px;
            line-height: 1.2;
          }
          .m-hero-desc {
            font-size: 16px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            word-break: keep-all;
          }

          /* Main Content */
          .mobile-about-main {
            padding: 40px 24px 60px;
          }

          .m-text-paragraph {
            font-size: 15px;
            color: #333;
            line-height: 1.8;
            margin-bottom: 20px;
            word-break: keep-all;
          }

          .m-signature {
            margin-top: 32px;
            font-size: 15px;
            color: #555;
            text-align: right;
          }
          .m-signature-name {
            font-size: 18px;
            font-weight: 800;
            color: #111;
            margin-left: 6px;
          }
        `}</style>

        {/* ── 심플 모바일 상단 헤더 ── */}
        <header className="mobile-about-header">
          <Link href="/m" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#333", marginRight: "16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </Link>
          <h1 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>회사소개</h1>
        </header>

        {/* ===== Hero Section ===== */}
        <section className="mobile-about-hero fade-up">
          <div className="m-hero-content">
            <h1 className="m-hero-title">공실뉴스</h1>
            <p className="m-hero-desc">
              11만 부동산과 임대인의 빠른 공실계약을 위한<br/>
              공동중개 실매물 뉴스 채널
            </p>
          </div>
        </section>

        {/* ===== Main Content ===== */}
        <main className="mobile-about-main">
          
          <div className="fade-up delay-100" style={{ marginBottom: 32 }}>
            <p className="m-text-paragraph" style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 20, lineHeight: 1.5 }}>
              안녕하십니까. 공실뉴스 편집장입니다.
            </p>
            <p className="m-text-paragraph">
              공실뉴스는 11만 개업공인중개사 여러분과 함께 만들어가는 부동산 네트워크 플랫폼이자, 실매물 기반의 공동중개 뉴스 채널입니다.
            </p>
            <p className="m-text-paragraph">
              임대인과 지역 부동산들이 신속하게 공실을 해소할 수 있도록 무료 매물 등록 서비스를 제공하며, 생생한 지역 부동산 소식을 뉴스로 공유하고 홍보할 수 있도록 돕습니다.
            </p>
            <p className="m-text-paragraph" style={{ fontWeight: 700, color: "#111", marginBottom: 12 }}>
              공실뉴스 회원이라면 누구나 아래 혜택을 누리실 수 있습니다.
            </p>

            <div style={{ margin: "20px 0", padding: "20px 24px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e40af", marginBottom: 12 }}>임대인 회원</h3>
              <ul style={{ paddingLeft: 16, margin: 0, color: "#333", lineHeight: 1.7, fontSize: 14 }}>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#111" }}>공실 등록:</strong> 모든 부동산이 무료 열람하는 공실 무료 등록 (2건 무료)</li>
                <li><strong style={{ color: "#111" }}>공실뉴스 열람:</strong> 공실뉴스 부동산기사 무료 열람</li>
              </ul>
            </div>

            <div style={{ margin: "16px 0", padding: "20px 24px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #10b981" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#047857", marginBottom: 12 }}>부동산 회원</h3>
              <ul style={{ paddingLeft: 16, margin: 0, color: "#333", lineHeight: 1.7, fontSize: 14 }}>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#111" }}>공동중개 무료:</strong> 부동산이 등록한 공동중개 물건 열람 및 등록 (5건)</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#111" }}>AI 매물보고서:</strong> 부동산 마케팅에 필요한 온/오프라인 물건 보고서 작성</li>
                <li><strong style={{ color: "#111" }}>AI 마케팅 교육:</strong> 부동산 실무마케팅에 필요한 AI 활용 및 유튜브, 블로그 특강</li>
              </ul>
            </div>

            <div style={{ margin: "16px 0", padding: "20px 24px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #8b5cf6" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#6d28d9", marginBottom: 12 }}>비즈니스 회원</h3>
              <ul style={{ paddingLeft: 16, margin: 0, color: "#333", lineHeight: 1.7, fontSize: 14 }}>
                <li style={{ marginBottom: 6 }}><strong style={{ color: "#111" }}>기사형 광고:</strong> 비즈니스 소식 및 브랜드 홍보 기사 직접 등록 및 송출</li>
                <li><strong style={{ color: "#111" }}>비즈니스 제휴:</strong> 부동산 및 임대인 연관 업종과의 상생 협력</li>
              </ul>
            </div>
          </div>

          <div className="fade-up delay-200">
            <p className="m-text-paragraph" style={{ fontWeight: 600 }}>
              공실뉴스는 임대인과 공인중개사 여러분의 가장 든든한 파트너로서, 신속하고 원활한 공실 해결을 위해 늘 최선을 다하겠습니다.
            </p>
            <p className="m-text-paragraph">
              감사합니다.
            </p>

            
            <div className="m-signature">
              공실뉴스 <span className="m-signature-name">임직원 일동</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

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
            background-image: url('https://digitalspecial.joongang.co.kr/_o/img/newsroom/2020/0715_marketing/images/main-bg@2x.jpg');
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
            <h1 className="m-hero-title">공실뉴스<br/>비즈솔루션본부</h1>
            <p className="m-hero-desc">
              부동산 미디어의 디지털 혁신을 주도하며<br/>
              객관적인 지역/단지 정보를 바탕으로 최고의 마케팅 솔루션을 제공합니다.
            </p>
          </div>
        </section>

        {/* ===== Main Content ===== */}
        <main className="mobile-about-main">
          
          <div className="fade-up delay-100" style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, color: "#111", letterSpacing: "-1px", lineHeight: 1.3 }}>
              대한민국 10만 부동산을 위한<br/>프리미엄 네트워크
            </h2>
            <p className="m-text-paragraph">
              공실뉴스는 지역/단지 시세 및 정보를 객관적으로 제공하는 부동산 언론채널이 되겠습니다.
            </p>
            <p className="m-text-paragraph">
              대한민국 10만 부동산이 독자가 되고, 또 지역/단지 정보를 제공하는 로컬기자가 되어 집을 구하는 매수자에게 가치 있는 정보를 제공하도록 돕는 매체가 되겠습니다.
            </p>
            <p className="m-text-paragraph">
              또한, 임대인에게 필요한 세무, 법률, 인테리어, 경매, 건축정보를 현업에서 활발히 활동하는 전문가가 동영상뉴스로 제공합니다. 빠른 공실계약을 위해 부동산과 임대인에게 필요한 온라인마케팅 교육 및 공실네트워크 플랫폼을 제공합니다.
            </p>
          </div>

          <div className="fade-up delay-200">
            {/* Network Graphic */}
            <div style={{ marginBottom: 32, opacity: 0.8 }}>
              <NetworkGraphic />
            </div>

            <p className="m-text-paragraph">
              부동산은 대한민국 국민이라면 누구나 중요한 삶의 기반입니다.<br />
              인터넷의 발달로 수 많은 정보가 넘쳐나지만, 각자 주관적인 판단만을 주장해 독자들에게 많은 혼선을 주고 있습니다.
            </p>
            <p className="m-text-paragraph">
              공실뉴스는 폭락론도 상승론도 아닌 지역/단지 시세 및 거래 정보를 현지 부동산 로컬 기자가 전달합니다.
            </p>
            <p className="m-text-paragraph">
              부동산 구매를 희망하는 독자들이 객관적인 판단을 할 수 있도록 돕는 부동산미디어가 되겠습니다.
            </p>
            <p className="m-text-paragraph">
              내 지역/단지 부동산 정보를 제공하고 싶은 부동산,<br />
              공실이 길어져 고민인 임대인,<br />
              부동산 구매를 희망하는 매수인,<br />
              <br />
              다양한 방법으로 독자와 소통의 창을 넓혀 가겠습니다.<br />
              여러분의 참여를 적극 환영합니다.
            </p>
            
            <div className="m-signature">
              - 공실뉴스 편집장 <span className="m-signature-name">김 동 현</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

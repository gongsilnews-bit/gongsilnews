"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";

// Network Node SVG Placeholder
const NetworkGraphic = () => (
  <svg width="240" height="240" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ margin: "0 auto", display: "block" }}>
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

export default function AboutPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  // Fade-up animation observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />

      <div className="about-container">
        <style>{`
          .about-container {
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
          .about-header {
            border-bottom: 1px solid #f0f0f0;
            background: #fff;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
          }

          /* Hero Section (Main Style) */
          .about-hero {
            position: relative;
            height: 600px;
            background-image: url('https://digitalspecial.joongang.co.kr/_o/img/newsroom/2020/0715_marketing/images/main-bg@2x.jpg');
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;
            display: flex;
            align-items: center;
          }
          .about-hero::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to right, rgba(26, 32, 44, 0.9), rgba(26, 32, 44, 0.4));
            z-index: 1;
          }
          .hero-content {
            position: relative;
            z-index: 2;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 40px;
            width: 100%;
          }
          .hero-title {
            font-size: 56px;
            font-weight: 900;
            color: #fff;
            margin-bottom: 24px;
            letter-spacing: -2px;
            line-height: 1.2;
          }
          .hero-desc {
            font-size: 24px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            word-break: keep-all;
          }

          /* Main Content Wrapper */
          .about-main {
            max-width: 1200px;
            margin: 0 auto;
            padding: 100px 40px 120px;
          }

          /* Two Columns */
          .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 80px;
            align-items: center;
          }

          .text-paragraph {
            font-size: 17px;
            color: #333;
            line-height: 1.8;
            margin-bottom: 24px;
            word-break: keep-all;
          }

          .signature {
            margin-top: 40px;
            font-size: 16px;
            color: #555;
          }
          .signature-name {
            font-size: 20px;
            font-weight: 800;
            color: #111;
            margin-left: 8px;
          }

          /* Contact Footer */
          .contact-footer {
            background: #1e293b;
            color: #fff;
            padding: 80px 40px;
          }
          .contact-footer-inner {
            max-width: 1000px;
            margin: 0 auto;
            position: relative;
          }
          .contact-title {
            font-size: 28px;
            font-weight: 600;
            letter-spacing: 1px;
            margin-bottom: 30px;
          }
          .contact-info {
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.8;
            margin-bottom: 24px;
          }
          .contact-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 40px;
            flex-wrap: wrap;
            gap: 20px;
          }
          .contact-copy {
            font-size: 13px;
            font-weight: 700;
            color: #f8fafc;
          }
          .contact-links {
            display: flex;
            gap: 24px;
          }
          .contact-links a {
            font-size: 14px;
            color: #cbd5e1;
            text-decoration: none;
            transition: color 0.2s;
          }
          .contact-links a:hover {
            color: #fff;
          }
          .scroll-top-btn {
            position: absolute;
            right: 0;
            bottom: -20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: none;
            color: #1e293b;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .about-header { padding: 0 20px; height: 60px; }
            .about-hero { height: 400px; }
            .hero-content { padding: 0 20px; }
            .hero-title { font-size: 36px; margin-bottom: 16px; }
            .hero-desc { font-size: 18px; }
            .about-main { padding: 60px 20px 80px; }
            .content-grid { grid-template-columns: 1fr; gap: 40px; }
            .contact-footer { padding: 60px 20px; }
          }
        `}</style>

        <header className="about-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 32, width: "auto" }} />
            </Link>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', borderLeft: "1px solid #e2e8f0", paddingLeft: 16 }}>
              회사소개
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "14px", fontWeight: "600" }}>
            <Link href="/about" style={{ color: "#0f172a", textDecoration: "none" }}>회사소개</Link>
            <Link href="/marketing" style={{ color: "#475569", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#0f172a"} onMouseLeave={(e) => e.currentTarget.style.color = "#475569"}>광고안내</Link>
            <Link href="/partnership" style={{ color: "#475569", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#0f172a"} onMouseLeave={(e) => e.currentTarget.style.color = "#475569"}>제휴문의</Link>
          </div>
        </header>

        {/* ===== Hero Section ===== */}
        <section className="about-hero fade-up">
          <div className="hero-content">
            <h1 className="hero-title">공실뉴스<br/>비즈솔루션본부</h1>
            <p className="hero-desc">
              부동산 미디어의 디지털 혁신을 주도하며<br/>
              객관적인 지역/단지 정보를 바탕으로 최고의 마케팅 솔루션을 제공합니다.
            </p>
          </div>
        </section>

        {/* ===== Main Content ===== */}
        <main className="about-main">
          {/* Two Columns Grid */}
          <div className="content-grid">
            {/* Left Column */}
            <div className="fade-up delay-100">
              <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 32, color: "#111", letterSpacing: "-1px" }}>
                대한민국 10만 부동산을 위한<br/>프리미엄 네트워크
              </h2>
              <p className="text-paragraph">
                공실뉴스는 지역/단지 시세 및 정보를 객관적으로 제공하는 부동산 언론채널이 되겠습니다.
              </p>
              <p className="text-paragraph">
                대한민국 10만 부동산이 독자가 되고, 또 지역/단지 정보를 제공하는 로컬기자가 되어 집을 구하는 매수자에게 가치 있는 정보를 제공하도록 돕는 매체가 되겠습니다.
              </p>
              <p className="text-paragraph">
                또한, 임대인에게 필요한 세무, 법률, 인테리어, 경매, 건축정보를 현업에서 활발히 활동하는 전문가가 동영상뉴스로 제공합니다. 빠른 공실계약을 위해 부동산과 임대인에게 필요한 온라인마케팅 교육 및 공실네트워크 플랫폼을 제공합니다.
              </p>
            </div>

            {/* Right Column */}
            <div className="fade-up delay-200">
              {/* Network Graphic */}
              <div style={{ marginBottom: 40, opacity: 0.8 }}>
                <NetworkGraphic />
              </div>

              <p className="text-paragraph">
                부동산은 대한민국 국민이라면 누구나 중요한 삶의 기반입니다.<br />
                인터넷의 발달로 수 많은 정보가 넘쳐나지만, 각자 주관적인 판단만을 주장해 독자들에게 많은 혼선을 주고 있습니다.
              </p>
              <p className="text-paragraph">
                공실뉴스는 폭락론도 상승론도 아닌 지역/단지 시세 및 거래 정보를 현지 부동산 로컬 기자가 전달합니다.
              </p>
              <p className="text-paragraph">
                부동산 구매를 희망하는 독자들이 객관적인 판단을 할 수 있도록 돕는 부동산미디어가 되겠습니다.
              </p>
              <p className="text-paragraph">
                내 지역/단지 부동산 정보를 제공하고 싶은 부동산,<br />
                공실이 길어져 고민인 임대인,<br />
                부동산 구매를 희망하는 매수인,<br />
                <br />
                다양한 방법으로 독자와 소통의 창을 넓혀 가겠습니다.<br />
                여러분의 참여를 적극 환영합니다.
              </p>
              
              <div className="signature">
                - 공실뉴스 편집장 <span className="signature-name">김 동 현</span>
              </div>
            </div>
          </div>
        </main>

        {/* ===== Contact Footer ===== */}
        <footer className="contact-footer">
          <div className="contact-footer-inner">
            {/* ── 상단 내비게이션 링크 ── */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 24, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div className="contact-links" style={{ gap: 16 }}>
                  <Link href="/about">회사소개</Link>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                  <Link href="/marketing">광고안내</Link>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                  <Link href="/partnership">제휴문의</Link>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                  <Link href="/terms">이용약관</Link>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                  <Link href="#" style={{ fontWeight: 700, color: "#fff" }}>개인정보 처리방침</Link>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                  <Link href="/youth-policy">청소년 보호정책</Link>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                  <Link href="#">고충처리</Link>
                </div>
                {/* 우측 파트너 로고/링크 (선택) */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>DATA PARTNER</span>
                  <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4 }}>공공데이터포털</span>
                  <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4 }}>국토교통부</span>
                </div>
              </div>
            </div>

            {/* ── 하단 회사 정보 ── */}
            <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
              {/* 로고 */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.2 }}>
                  공실뉴스
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: -0.3 }}>GONGSIL NEWS</div>
              </div>

              {/* 회사 정보 */}
              <div style={{ flex: 1, minWidth: 300, fontSize: 13, color: "#94a3b8", lineHeight: 1.8, letterSpacing: -0.2 }}>
                <div>
                  주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동)
                  <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
                  인터넷신문 등록번호 : 서울 아55037
                  <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
                  등록일자 : 2023.09.05
                </div>
                <div>
                  제호 : 공실뉴스
                  <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
                  법인명 : (주)공실마케팅
                  <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
                  사업자등록번호 : 337-81-03010
                </div>
                <div>
                  대표자·발행인 : 김윤경
                  <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
                  편집인 : 김동현
                  <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
                  이메일 : master@gongsilnews.com
                </div>
                <div>
                  고객센터 : 1555-5343 (평일 10:00~18:00)
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                  공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단 전재, 복사, 배포 등을 금합니다.(저작권 문의는 별도 안내)
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                  Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.
                </div>
              </div>
            </div>

            {/* Scroll to Top Button */}
            <button 
              className="scroll-top-btn" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="맨 위로 가기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

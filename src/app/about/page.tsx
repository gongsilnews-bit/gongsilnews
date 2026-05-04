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
          
          .about-nav {
            display: flex;
            gap: 40px;
          }
          
          .about-nav a {
            font-size: 16px;
            font-weight: 700;
            color: #d97706; /* 주황색 텍스트 */
            text-decoration: none;
            transition: opacity 0.2s;
          }
          .about-nav a:hover { opacity: 0.8; }

          /* Main Content Wrapper */
          .about-main {
            max-width: 1000px;
            margin: 0 auto;
            padding: 100px 20px 120px;
          }

          /* Title Area */
          .intro-label {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }
          .intro-line {
            width: 40px;
            height: 2px;
            background-color: #d97706;
          }
          .intro-text {
            font-size: 14px;
            font-weight: 700;
            color: #d97706;
            letter-spacing: 1px;
          }
          .intro-title {
            font-size: 48px;
            font-weight: 900;
            color: #111;
            margin: 0 0 40px;
            letter-spacing: -1.5px;
          }
          .main-catchphrase {
            font-size: 28px;
            font-weight: 700;
            color: #111;
            line-height: 1.5;
            margin: 0 0 80px;
            letter-spacing: -1px;
            word-break: keep-all;
          }
          .highlight-box {
            background-color: #f59e0b;
            color: #fff;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 800;
            margin: 0 4px;
          }

          /* Two Columns */
          .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 80px;
          }

          .text-paragraph {
            font-size: 15px;
            color: #333;
            line-height: 1.8;
            margin-bottom: 24px;
            word-break: keep-all;
          }

          .monitor-img {
            width: 100%;
            height: auto;
            border-radius: 8px;
            margin-top: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
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
            .about-nav { display: none; } /* 모바일에서는 숨기고 햄버거 메뉴 활용 */
            .about-main { padding: 60px 20px 80px; }
            .intro-title { font-size: 36px; margin-bottom: 30px; }
            .main-catchphrase { font-size: 22px; margin-bottom: 50px; }
            .content-grid { grid-template-columns: 1fr; gap: 40px; }
            .contact-footer { padding: 60px 20px; }
            .contact-title { font-size: 24px; }
          }
        `}</style>

        {/* ===== Header ===== */}
        <header className="about-header">
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 32, width: "auto" }} />
          </Link>
          <nav className="about-nav">
            <Link href="/about">매체소개</Link>
            <Link href="#">광고·제휴</Link>
            <Link href="/board">공실스터디</Link>
          </nav>
        </header>

        {/* ===== Main Content ===== */}
        <main className="about-main">
          {/* Title Area */}
          <div className="fade-up">
            <div className="intro-label">
              <div className="intro-line"></div>
              <span className="intro-text">INTRODUCTION</span>
            </div>
            <h1 className="intro-title">인사말</h1>
            
            <p className="main-catchphrase">
              공실뉴스는 <span className="highlight-box">지역/단지 정보</span>를<br />
              객관적으로 전하는 부동산 언론채널이 되겠습니다.
            </p>
          </div>

          {/* Two Columns Grid */}
          <div className="content-grid">
            {/* Left Column */}
            <div className="fade-up delay-100">
              <p className="text-paragraph">
                공실뉴스는 지역/단지 시세 및 정보를<br />
                객관적으로 제공하는 부동산 언론채널이 되겠습니다.
              </p>
              <p className="text-paragraph">
                대한민국 10만 부동산이 독자가 되고,<br />
                또, 지역/단지 정보를 제공하는 로컬기자가 되어<br />
                집을 구하는 매수자에게 가치 있는 정보를<br />
                제공하도록 돕는 매체가 되겠습니다.
              </p>
              <p className="text-paragraph">
                또한, 임대인에게 필요한 세무, 법률, 인테리어, 경매, 건축정보를 현업에서 활발히 활동하는 전문가가 동영상뉴스로 제공합니다.
              </p>
              <p className="text-paragraph">
                빠른 공실계약을 위해 부동산과 임대인에게 필요한<br />
                온라인마케팅 교육 및 공실네트워크 플랫폼을 제공합니다.
              </p>

              {/* Placeholder for Monitor Image */}
              <img 
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1472&auto=format&fit=crop" 
                alt="공실뉴스 웹사이트 모니터 화면" 
                className="monitor-img"
              />
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
            <h2 className="contact-title">CONTACT US</h2>
            <div className="contact-info">
              서울특별시 강남구 논현로115길 31, 105호<br />
              대표전화 : 1555-5343
            </div>
            
            <div className="contact-bottom">
              <div className="contact-copy">© 공실뉴스</div>
              <div className="contact-links">
                <Link href="/">홈</Link>
                <Link href="/news_all">실시간뉴스</Link>
                <Link href="#">개인정보처리방침</Link>
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

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
            <h1 className="m-hero-title">공실뉴스<br/>편집장 인사말</h1>
            <p className="m-hero-desc">
              11만 부동산과 임대인의 빠른 공실계약을 위해<br/>
              함께 노력하는 공동중개 실매물 뉴스 채널
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
              공실뉴스는 11만 개업공인중개사 여러분과 함께 만들어가는 부동산 네트워크 플랫폼입니다.
            </p>
            <p className="m-text-paragraph">
              공실뉴스는 지역의 로컬 부동산들이 빠른 공실 계약을 위해 공실을 무료로 등록하고, 지역 부동산 정보를 뉴스로 공유하며 홍보할 수 있는 공동중개 실매물 뉴스 채널입니다.
            </p>
            <p className="m-text-paragraph" style={{ fontWeight: 700, color: "#111", marginBottom: 12 }}>
              부동산 회원이라면 누구나 아래 혜택을 누리실 수 있습니다.
            </p>

            <div style={{ margin: "20px 0", padding: "20px 24px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e40af", marginBottom: 8 }}>🤝 무료 공동중개 네트워크</h3>
              <p className="m-text-paragraph" style={{ marginBottom: 0, fontSize: 14 }}>
                내 주변 공실의 빠른 계약을 위해 부동산이 직접 등록한 공동중개 물건을 누구나 무료로 열람하고, 공유할 수 있습니다.
              </p>
            </div>

            <div style={{ margin: "16px 0", padding: "20px 24px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #10b981" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#047857", marginBottom: 8 }}>🎓 실전 부동산 마케팅 교육</h3>
              <p className="m-text-paragraph" style={{ marginBottom: 0, fontSize: 14 }}>
                이제 AI를 활용한 마케팅은 필수입니다. 공실뉴스는 중개사님들이 변화하는 디지털 환경에 발 빠르게 적응하실 수 있도록 AI 기반의 실무 마케팅 교육과 특강을 제공합니다.
              </p>
            </div>

            <div style={{ margin: "16px 0", padding: "20px 24px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #f59e0b" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#b45309", marginBottom: 8 }}>📰 부동산 마케팅 및 지역 뉴스 정보</h3>
              <p className="m-text-paragraph" style={{ marginBottom: 0, fontSize: 14 }}>
                공실뉴스는 중개사님들이 경쟁력을 갖출 수 있도록 다양한 부동산 정보를 뉴스로 제공합니다. 특히, 지역의 믿을 수 있는 공실뉴스 부동산이 내 지역 부동산 정보를 뉴스로 제공합니다. 빠른 계약을 위한 무료 공동중개 및 AI시대 꼭 필요한 유튜브/블로그 교육을 공실뉴스에서 쉽게 열람하세요.
              </p>
            </div>
          </div>

          <div className="fade-up delay-200">
            <p className="m-text-paragraph" style={{ fontWeight: 600 }}>
              공실뉴스는 11만 부동산과 임대인의 빠른 공실계약을 위해 함께 노력하겠습니다.
            </p>
            <p className="m-text-paragraph">
              감사합니다.
            </p>

            <div style={{ margin: "32px 0 24px", opacity: 0.8 }}>
              <NetworkGraphic />
            </div>
            
            <div className="m-signature">
              공실뉴스 <span className="m-signature-name">편집장</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

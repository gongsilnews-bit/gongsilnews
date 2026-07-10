"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import MobileFooter from "@/app/m/_components/MobileFooter";

export default function MobileMarketingPage() {
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
    <div className="mobile-marketing-container">
      <style>{`
        .mobile-marketing-container {
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
        .mobile-marketing-header {
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
        .mobile-marketing-hero {
          position: relative;
          height: 280px;
          background-image: url('https://digitalspecial.joongang.co.kr/_o/img/newsroom/2020/0715_marketing/images/main-bg@2x.jpg');
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
          display: flex;
          align-items: center;
        }
        .mobile-marketing-hero::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to right, rgba(26, 32, 44, 0.95), rgba(26, 32, 44, 0.6));
          z-index: 1;
        }
        .m-hero-content {
          position: relative;
          z-index: 2;
          padding: 0 24px;
          width: 100%;
        }
        .m-hero-title {
          font-size: 28px;
          font-weight: 900;
          color: #fff;
          margin-bottom: 12px;
          letter-spacing: -1.5px;
          line-height: 1.3;
        }
        .m-hero-desc {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          word-break: keep-all;
        }

        /* Main Content */
        .mobile-marketing-main {
          padding: 40px 20px 60px;
        }
        .m-section-title-wrap {
          margin-bottom: 32px;
          text-align: center;
        }
        .m-section-title {
          font-size: 22px;
          font-weight: 900;
          color: #111;
          margin: 0 0 10px;
          letter-spacing: -1px;
        }
        .m-section-desc {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
          word-break: keep-all;
        }

        /* Service Cards */
        .m-service-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 48px;
        }
        .m-service-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 30px 24px;
          text-align: center;
        }
        .m-service-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }
        .m-service-name {
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .m-service-detail {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          word-break: keep-all;
        }

        /* Download Banner */
        .m-download-banner {
          background: #1e293b;
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          margin-bottom: 56px;
        }
        .m-download-title {
          font-size: 20px;
          color: #fff;
          font-weight: 800;
          margin: 0 0 8px;
        }
        .m-download-desc {
          color: #94a3b8;
          font-size: 13px;
          margin: 0 0 20px;
          line-height: 1.5;
          word-break: keep-all;
        }
        .m-download-btn {
          background: #3b82f6;
          color: #fff;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        /* Contact Section */
        .m-contact-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .m-contact-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
        }
        .m-contact-team {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }
        .m-contact-detail {
          font-size: 14px;
          color: #475569;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .m-contact-detail svg {
          color: #94a3b8;
          flex-shrink: 0;
        }
      `}</style>

      {/* ── 심플 모바일 상단 헤더 ── */}
      <header className="mobile-marketing-header">
        <Link href="/m" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#333", marginRight: "16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </Link>
        <h1 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>광고안내</h1>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="mobile-marketing-hero fade-up">
        <div className="m-hero-content">
          <h1 className="m-hero-title">공실뉴스<br/>비즈솔루션본부</h1>
          <p className="m-hero-desc">
            대한민국 11만 부동산과 임대인, 매수인을 연결하는 부동산 전문 미디어의 강력한 마케팅 네트워크를 경험하세요.
          </p>
        </div>
      </section>

      {/* ===== Main Content ===== */}
      <main className="mobile-marketing-main">
        <section>
          <div className="m-section-title-wrap fade-up">
            <h2 className="m-section-title">디지털 마케팅 및 콘텐트 유통</h2>
            <p className="m-section-desc">
              광고주와 파트너사에 맞춤형 미디어 마케팅 컨설팅을 제공하여 최적의 광고, 콘텐트, 캠페인 솔루션을 제안합니다.
            </p>
          </div>
          <div className="m-service-list">
            <div className="m-service-card fade-up">
              <div className="m-service-icon">📰</div>
              <h3 className="m-service-name">Advertisements</h3>
              <p className="m-service-detail">배너 광고, 스폰서십, 네이티브 애드 등 목적에 맞는 최적의 광고 지면 제공</p>
            </div>
            <div className="m-service-card fade-up">
              <div className="m-service-icon">✍️</div>
              <h3 className="m-service-name">News & PR</h3>
              <p className="m-service-detail">신뢰도 높은 기획 기사 및 보도자료 배포를 통한 브랜드 인지도 상승</p>
            </div>
            <div className="m-service-card fade-up">
              <div className="m-service-icon">📱</div>
              <h3 className="m-service-name">Social Media</h3>
              <p className="m-service-detail">유튜브, 블로그 등 다양한 소셜 미디어 채널을 활용한 바이럴 마케팅</p>
            </div>
          </div>
        </section>

        <section className="m-download-banner fade-up">
          <h3 className="m-download-title">광고 상품 소개서 다운로드</h3>
          <p className="m-download-desc">다양한 비즈니스 니즈를 충족시키는 공실뉴스의 최신 광고 상품을 만나보세요.</p>
          <a href="#" className="m-download-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            PDF 다운로드
          </a>
        </section>

        <section>
          <div className="m-section-title-wrap fade-up">
            <h2 className="m-section-title">광고 및 제휴 문의</h2>
            <p className="m-section-desc">광고 집행, 제휴 제안 등 궁금하신 사항은 언제든 연락 주시기 바랍니다.</p>
          </div>
          <div className="m-contact-list">
            <div className="m-contact-card fade-up">
              <h3 className="m-contact-team">솔루션영업팀</h3>
              <div className="m-contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                1555-5343
              </div>
              <div className="m-contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                sales@gongsilnews.com
              </div>
            </div>
            <div className="m-contact-card fade-up">
              <h3 className="m-contact-team">전략기획팀</h3>
              <div className="m-contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                1555-5343
              </div>
              <div className="m-contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                partner@gongsilnews.com
              </div>
            </div>
            <div className="m-contact-card fade-up">
              <h3 className="m-contact-team">오시는 길</h3>
              <div className="m-contact-detail" style={{ alignItems: 'flex-start' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: 2 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                서울특별시 강남구 논현로115길 31, 105호
              </div>
            </div>
          </div>
        </section>
      </main>

      <MobileFooter />
    </div>
  );
}

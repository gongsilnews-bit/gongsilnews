"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import MobileFooter from "@/app/m/_components/MobileFooter";

export default function MobilePartnershipPage() {
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
    <div className="mobile-partnership-container">
      <style>{`
        .mobile-partnership-container {
          font-family: 'Pretendard Variable', 'Malgun Gothic', sans-serif;
          background: #f8f9fa;
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
        .mobile-partnership-header {
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
        .mobile-partnership-hero {
          position: relative;
          background: #ffe812;
          padding: 50px 24px;
          text-align: center;
          overflow: hidden;
        }
        .mobile-partnership-hero::before {
          content: '';
          position: absolute;
          top: -50%; left: -10%; right: -10%; bottom: -50%;
          background: radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%);
          z-index: 1;
        }
        .m-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
        }
        .m-hero-label {
          display: inline-block;
          background: #111;
          color: #fff;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: 0.5px;
        }
        .m-hero-title {
          font-size: 28px;
          font-weight: 900;
          color: #111;
          margin-bottom: 16px;
          letter-spacing: -1.5px;
          line-height: 1.3;
          word-break: keep-all;
        }
        .m-hero-desc {
          font-size: 14px;
          color: #333;
          line-height: 1.6;
          margin-bottom: 28px;
          word-break: keep-all;
        }
        .m-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111;
          color: #fff;
          padding: 14px 28px;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .m-hero-cta:active {
          transform: scale(0.98);
        }

        /* Main Content */
        .mobile-partnership-main {
          padding: 48px 20px 60px;
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
        .m-card-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 56px;
        }
        .m-partner-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        .m-card-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .m-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #111;
          margin-bottom: 8px;
        }
        .m-card-desc {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          word-break: keep-all;
        }

        /* Process Section */
        .m-process-wrapper {
          background: #fff;
          border-radius: 20px;
          padding: 32px 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        .m-process-steps {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 32px;
          position: relative;
        }
        .m-process-line {
          position: absolute;
          top: 20px;
          left: 20px;
          bottom: 20px;
          width: 2px;
          background: #f0f0f0;
          z-index: 1;
        }
        .m-step-item {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .m-step-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 900;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .m-step-content {
          padding-top: 8px;
        }
        .m-step-title {
          font-size: 16px;
          font-weight: 800;
          color: #111;
          margin-bottom: 6px;
        }
        .m-step-desc {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          word-break: keep-all;
        }
      `}</style>

      {/* ── 심플 모바일 상단 헤더 ── */}
      <header className="mobile-partnership-header">
        <Link href="/m" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#333", marginRight: "16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </Link>
        <h1 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>제휴문의</h1>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="mobile-partnership-hero fade-up">
        <div className="m-hero-content">
          <div className="m-hero-label">서비스/콘텐츠 제휴</div>
          <h1 className="m-hero-title">공실뉴스와 함께 성장할<br/>파트너를 모십니다.</h1>
          <p className="m-hero-desc">
            대한민국 대표 부동산 미디어 채널 공실뉴스와 함께 새로운 비즈니스 기회를 만들어갈 혁신적인 제안을 기다립니다.
          </p>
          <a href="mailto:partner@gongsilnews.com" className="m-hero-cta">
            제휴 제안하기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>
      </section>

      {/* ===== Main Content ===== */}
      <main className="mobile-partnership-main">
        <div className="m-section-title-wrap fade-up">
          <h2 className="m-section-title">다양한 분야의 제휴를 기다립니다</h2>
          <p className="m-section-desc">공실뉴스의 강력한 부동산 네트워크와 결합하여 시너지를 낼 수 있는 모든 제안을 환영합니다.</p>
        </div>

        <div className="m-card-list">
          <div className="m-partner-card fade-up">
            <div className="m-card-icon">🗞️</div>
            <h3 className="m-card-title">기사 및 콘텐츠 제휴</h3>
            <p className="m-card-desc">전문적인 부동산 칼럼, 마켓 리포트, 데이터 기반의 심층 분석 등 양질의 콘텐츠를 공실뉴스를 통해 유통하고 독자와 소통하세요.</p>
          </div>
          <div className="m-partner-card fade-up">
            <div className="m-card-icon">🎓</div>
            <h3 className="m-card-title">교육 및 세미나 제휴</h3>
            <p className="m-card-desc">공인중개사, 임대인, 매수인을 위한 온/오프라인 교육 프로그램 기획 및 강연자 제안을 환영합니다. 함께 성장하는 교육 문화를 만듭니다.</p>
          </div>
          <div className="m-partner-card fade-up">
            <div className="m-card-icon">📊</div>
            <h3 className="m-card-title">데이터 및 API 연동</h3>
            <p className="m-card-desc">프롭테크 기업의 빅데이터, AI 기술, 매물 정보 API 등 혁신적인 솔루션을 공실뉴스 플랫폼에 연동하여 차별화된 서비스를 제공합니다.</p>
          </div>
          <div className="m-partner-card fade-up">
            <div className="m-card-icon">🤝</div>
            <h3 className="m-card-title">공동 마케팅 프로모션</h3>
            <p className="m-card-desc">11만 부동산 네트워크를 대상으로 한 타겟 마케팅, 이벤트, 캠페인 등 상호 브랜드 가치를 높일 수 있는 윈윈(Win-win) 전략을 실행합니다.</p>
          </div>
        </div>

        {/* Process Section */}
        <div className="m-process-wrapper fade-up">
          <h2 className="m-section-title" style={{ fontSize: "20px" }}>제휴 제안 프로세스</h2>
          <p className="m-section-desc">제휴 제안은 아래의 순서로 투명하고 신속하게 진행됩니다.</p>
          
          <div className="m-process-steps">
            <div className="m-process-line"></div>
            <div className="m-step-item">
              <div className="m-step-circle">01</div>
              <div className="m-step-content">
                <h4 className="m-step-title">제안서 접수</h4>
                <p className="m-step-desc">이메일(partner@gongsilnews.com)을 통해 제휴 제안서 및 소개서를 접수합니다.</p>
              </div>
            </div>
            <div className="m-step-item">
              <div className="m-step-circle">02</div>
              <div className="m-step-content">
                <h4 className="m-step-title">담당자 검토</h4>
                <p className="m-step-desc">공실뉴스 전략기획팀 담당자가 제안 내용을 바탕으로 사업성과 시너지를 꼼꼼히 검토합니다.</p>
              </div>
            </div>
            <div className="m-step-item">
              <div className="m-step-circle">03</div>
              <div className="m-step-content">
                <h4 className="m-step-title">상세 논의</h4>
                <p className="m-step-desc">긍정적으로 검토된 제안에 대해 오프라인/온라인 미팅을 통해 구체적인 실행 방안을 논의합니다.</p>
              </div>
            </div>
            <div className="m-step-item">
              <div className="m-step-circle">04</div>
              <div className="m-step-content">
                <h4 className="m-step-title">제휴 체결</h4>
                <p className="m-step-desc">최종 협의가 완료되면 제휴 계약을 체결하고 본격적인 파트너십 활동을 시작합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileFooter />
    </div>
  );
}

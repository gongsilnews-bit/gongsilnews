"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import Footer from "@/components/Footer";

export default function PartnershipPage() {
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

      <div className="partnership-container">
        <style>{`
          .partnership-container {
            font-family: 'Pretendard Variable', 'Malgun Gothic', sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
            color: #111;
          }
          
          .fade-up {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.8s ease-out, transform 0.8s ease-out;
          }
          .fade-up.animate-in {
            opacity: 1;
            transform: translateY(0);
          }
          .delay-100 { transition-delay: 100ms; }
          .delay-200 { transition-delay: 200ms; }
          .delay-300 { transition-delay: 300ms; }

          /* Header */
          .marketing-header {
            border-bottom: 1px solid #f0f0f0;
            background: #fff;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            position: sticky;
            top: 0;
            z-index: 100;
          }

          /* Hero Section */
          .partnership-hero {
            position: relative;
            background: #ffe812; /* 카카오 느낌의 옐로우 포인트, 공실뉴스는 #111이나 파스텔톤일수도. 일단 노란색 포인트 */
            padding: 80px 40px;
            text-align: center;
            overflow: hidden;
          }
          .partnership-hero::before {
            content: '';
            position: absolute;
            top: -50%; left: -10%; right: -10%; bottom: -50%;
            background: radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%);
            z-index: 1;
          }
          .hero-content {
            position: relative;
            z-index: 2;
            max-width: 1000px;
            margin: 0 auto;
          }
          .hero-label {
            display: inline-block;
            background: #111;
            color: #fff;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 800;
            margin-bottom: 24px;
            letter-spacing: 1px;
          }
          .hero-title {
            font-size: 48px;
            font-weight: 900;
            color: #111;
            margin-bottom: 24px;
            letter-spacing: -2px;
            line-height: 1.3;
            word-break: keep-all;
          }
          .hero-desc {
            font-size: 18px;
            color: #333;
            line-height: 1.6;
            margin-bottom: 40px;
            word-break: keep-all;
          }
          .hero-cta {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: #111;
            color: #fff;
            padding: 18px 40px;
            border-radius: 30px;
            font-size: 18px;
            font-weight: 800;
            text-decoration: none;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .hero-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.15);
          }

          /* Main Content Wrapper */
          .partnership-main {
            max-width: 1200px;
            margin: 0 auto;
            padding: 100px 40px 120px;
          }

          /* Section Titles */
          .section-title-wrap {
            margin-bottom: 50px;
            text-align: center;
          }
          .section-title {
            font-size: 36px;
            font-weight: 900;
            color: #111;
            margin: 0 0 16px;
            letter-spacing: -1.5px;
          }
          .section-desc {
            font-size: 18px;
            color: #666;
            line-height: 1.6;
            word-break: keep-all;
          }

          /* Card Grid */
          .card-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 120px;
          }
          .partner-card {
            background: #fff;
            border-radius: 20px;
            padding: 50px 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.03);
            transition: transform 0.3s, box-shadow 0.3s;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-start;
          }
          .partner-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          }
          .card-icon {
            font-size: 48px;
            margin-bottom: 24px;
          }
          .card-title {
            font-size: 24px;
            font-weight: 800;
            color: #111;
            margin-bottom: 16px;
          }
          .card-desc {
            font-size: 16px;
            color: #666;
            line-height: 1.6;
            word-break: keep-all;
          }

          /* Process Section */
          .process-wrapper {
            background: #fff;
            border-radius: 24px;
            padding: 80px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.03);
            text-align: center;
          }
          .process-steps {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 60px;
            position: relative;
          }
          .process-line {
            position: absolute;
            top: 40px;
            left: 10%;
            right: 10%;
            height: 2px;
            background: #f0f0f0;
            z-index: 1;
          }
          .step-item {
            position: relative;
            z-index: 2;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .step-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 900;
            color: #cbd5e1;
            margin-bottom: 24px;
            transition: all 0.3s;
          }
          .step-item:hover .step-circle {
            border-color: #111;
            color: #111;
            transform: scale(1.1);
          }
          .step-title {
            font-size: 18px;
            font-weight: 800;
            color: #111;
            margin-bottom: 12px;
          }
          .step-desc {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
            word-break: keep-all;
            max-width: 80%;
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
          .contact-links {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
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
            .marketing-header { padding: 0 20px; height: 60px; }
            .partnership-hero { padding: 60px 20px; }
            .hero-title { font-size: 32px; }
            .partnership-main { padding: 60px 20px 80px; }
            .card-grid { grid-template-columns: 1fr; gap: 16px; margin-bottom: 60px; }
            .partner-card { padding: 30px; }
            .process-wrapper { padding: 40px 20px; }
            .process-steps { flex-direction: column; gap: 40px; margin-top: 40px; }
            .process-line { display: none; }
            .step-desc { max-width: 100%; }
            .contact-footer { padding: 60px 20px; }
          }
        `}</style>

        <header className="marketing-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 32, width: "auto" }} />
            </Link>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', borderLeft: "1px solid #e2e8f0", paddingLeft: 16 }}>
              제휴문의
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "14px", fontWeight: "600" }}>
            <Link href="/about" style={{ color: "#475569", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#0f172a"} onMouseLeave={(e) => e.currentTarget.style.color = "#475569"}>회사소개</Link>
            <Link href="/marketing" style={{ color: "#475569", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#0f172a"} onMouseLeave={(e) => e.currentTarget.style.color = "#475569"}>광고안내</Link>
            <Link href="/partnership" style={{ color: "#0f172a", textDecoration: "none" }}>제휴문의</Link>
          </div>
        </header>

        {/* ===== Hero Section ===== */}
        <section className="partnership-hero fade-up">
          <div className="hero-content">
            <div className="hero-label">서비스/콘텐츠 제휴</div>
            <h1 className="hero-title">공실뉴스와 함께 성장할<br/>파트너를 모십니다.</h1>
            <p className="hero-desc">
              대한민국 대표 부동산 미디어 채널 공실뉴스와 함께<br/>
              새로운 비즈니스 기회를 만들어갈 혁신적인 제안을 기다립니다.
            </p>
            <a href="mailto:partner@gongsilnews.com" className="hero-cta">
              제휴 제안하기
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </a>
          </div>
        </section>

        {/* ===== Main Content ===== */}
        <main className="partnership-main">
          
          <div className="section-title-wrap fade-up delay-100">
            <h2 className="section-title">다양한 분야의 제휴를 기다립니다</h2>
            <p className="section-desc">공실뉴스의 강력한 부동산 네트워크와 결합하여 시너지를 낼 수 있는 모든 제안을 환영합니다.</p>
          </div>

          <div className="card-grid">
            <div className="partner-card fade-up delay-100">
              <div>
                <div className="card-icon">🗞️</div>
                <h3 className="card-title">기사 및 콘텐츠 제휴</h3>
                <p className="card-desc">전문적인 부동산 칼럼, 마켓 리포트, 데이터 기반의 심층 분석 등 양질의 콘텐츠를 공실뉴스를 통해 유통하고 독자와 소통하세요.</p>
              </div>
            </div>
            <div className="partner-card fade-up delay-200">
              <div>
                <div className="card-icon">🎓</div>
                <h3 className="card-title">교육 및 세미나 제휴</h3>
                <p className="card-desc">공인중개사, 임대인, 매수인을 위한 온/오프라인 교육 프로그램 기획 및 강연자 제안을 환영합니다. 함께 성장하는 교육 문화를 만듭니다.</p>
              </div>
            </div>
            <div className="partner-card fade-up delay-100">
              <div>
                <div className="card-icon">📊</div>
                <h3 className="card-title">데이터 및 API 연동</h3>
                <p className="card-desc">프롭테크 기업의 빅데이터, AI 기술, 매물 정보 API 등 혁신적인 솔루션을 공실뉴스 플랫폼에 연동하여 차별화된 서비스를 제공합니다.</p>
              </div>
            </div>
            <div className="partner-card fade-up delay-200">
              <div>
                <div className="card-icon">🤝</div>
                <h3 className="card-title">공동 마케팅 프로모션</h3>
                <p className="card-desc">11만 부동산 네트워크를 대상으로 한 타겟 마케팅, 이벤트, 캠페인 등 상호 브랜드 가치를 높일 수 있는 윈윈(Win-win) 전략을 실행합니다.</p>
              </div>
            </div>
          </div>

          {/* Process Section */}
          <div className="process-wrapper fade-up delay-300">
            <h2 className="section-title" style={{ fontSize: 32 }}>제휴 제안 프로세스</h2>
            <p className="section-desc">제휴 제안은 아래의 순서로 투명하고 신속하게 진행됩니다.</p>
            
            <div className="process-steps">
              <div className="process-line"></div>
              
              <div className="step-item">
                <div className="step-circle">01</div>
                <h4 className="step-title">제안서 접수</h4>
                <p className="step-desc">이메일(partner@gongsilnews.com)을 통해 제휴 제안서 및 소개서를 접수합니다.</p>
              </div>
              <div className="step-item">
                <div className="step-circle">02</div>
                <h4 className="step-title">담당자 검토</h4>
                <p className="step-desc">공실뉴스 전략기획팀 담당자가 제안 내용을 바탕으로 사업성과 시너지를 꼼꼼히 검토합니다.</p>
              </div>
              <div className="step-item">
                <div className="step-circle">03</div>
                <h4 className="step-title">상세 논의</h4>
                <p className="step-desc">긍정적으로 검토된 제안에 대해 오프라인/온라인 미팅을 통해 구체적인 실행 방안을 논의합니다.</p>
              </div>
              <div className="step-item">
                <div className="step-circle">04</div>
                <h4 className="step-title">제휴 체결</h4>
                <p className="step-desc">최종 협의가 완료되면 제휴 계약을 체결하고 본격적인 파트너십 활동을 시작합니다.</p>
              </div>
            </div>
          </div>

        </main>

        <Footer />
      </div>
    </>
  );
}

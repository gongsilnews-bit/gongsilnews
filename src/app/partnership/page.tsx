import React from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = {
  title: "제휴문의 | 공실뉴스",
  description: "공실뉴스와 함께 성장할 비즈니스 파트너를 모십니다.",
};

export default function PartnershipPage() {
  return (
    <div className="partnership-container">
      <style>{`
        .partnership-container {
          font-family: 'Pretendard Variable', 'Malgun Gothic', sans-serif;
          background: #f8f9fa;
          min-height: 100vh;
          color: #111;
        }

        /* ===== Header ===== */
        .marketing-header {
          border-bottom: 1px solid #f0f0f0;
          background: #fff;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
        }
        .header-links {
          display: flex;
          gap: 20px;
          font-size: 14px;
          font-weight: 600;
        }
        .header-link {
          color: #475569;
          text-decoration: none;
          transition: color 0.2s;
        }
        .header-link:hover, .header-link.active {
          color: #0f172a;
        }

        /* ===== Hero ===== */
        .partnership-hero {
          position: relative;
          background: #ffe812;
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

        /* ===== Main Content ===== */
        .partnership-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 40px 120px;
        }
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
      `}</style>

      {/* ===== Header ===== */}
      <header className="marketing-header">
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 32, width: "auto" }} />
        </Link>
        <div className="header-links">
          <Link href="/about" className="header-link">회사소개</Link>
          <Link href="/marketing" className="header-link">광고안내</Link>
          <Link href="/partnership" className="header-link active">제휴문의</Link>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="partnership-hero">
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
        <div className="section-title-wrap">
          <h2 className="section-title">다양한 분야의 제휴를 기다립니다</h2>
          <p className="section-desc">공실뉴스의 강력한 부동산 네트워크와 결합하여 시너지를 낼 수 있는 모든 제안을 환영합니다.</p>
        </div>

        <div className="card-grid">
          <div className="partner-card">
            <div>
              <div className="card-icon">🗞️</div>
              <h3 className="card-title">기사 및 콘텐츠 제휴</h3>
              <p className="card-desc">전문적인 부동산 칼럼, 마켓 리포트, 데이터 기반의 심층 분석 등 양질의 콘텐츠를 공실뉴스를 통해 유통하고 독자와 소통하세요.</p>
            </div>
          </div>
          <div className="partner-card">
            <div>
              <div className="card-icon">🎓</div>
              <h3 className="card-title">교육 및 세미나 제휴</h3>
              <p className="card-desc">공인중개사, 임대인, 매수인을 위한 온/오프라인 교육 프로그램 기획 및 강연자 제안을 환영합니다. 함께 성장하는 교육 문화를 만듭니다.</p>
            </div>
          </div>
          <div className="partner-card">
            <div>
              <div className="card-icon">📊</div>
              <h3 className="card-title">데이터 및 API 연동</h3>
              <p className="card-desc">프롭테크 기업의 빅데이터, AI 기술, 매물 정보 API 등 혁신적인 솔루션을 공실뉴스 플랫폼에 연동하여 차별화된 서비스를 제공합니다.</p>
            </div>
          </div>
          <div className="partner-card">
            <div>
              <div className="card-icon">🤝</div>
              <h3 className="card-title">공동 마케팅 프로모션</h3>
              <p className="card-desc">11만 부동산 네트워크를 대상으로 한 타겟 마케팅, 이벤트, 캠페인 등 상호 브랜드 가치를 높일 수 있는 윈윈(Win-win) 전략을 실행합니다.</p>
            </div>
          </div>
        </div>

        {/* Process Section */}
        <div className="process-wrapper">
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
  );
}

import React from "react";
import Link from "next/link";

export const metadata = {
  title: "광고안내 | 공실뉴스",
  description: "공실뉴스의 디지털 마케팅 및 광고 솔루션을 안내합니다.",
};

export default function MarketingPage() {
  return (
    <div className="marketing-container">
      <style>{`
        .marketing-container {
          font-family: 'Pretendard Variable', 'Malgun Gothic', sans-serif;
          background: #fff;
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
        .marketing-hero {
          position: relative;
          height: 600px;
          background-image: url('https://digitalspecial.joongang.co.kr/_o/img/newsroom/2020/0715_marketing/images/main-bg@2x.jpg');
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
          display: flex;
          align-items: center;
        }
        .marketing-hero::after {
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

        /* ===== Main Content ===== */
        .marketing-main {
          max-width: 1000px;
          margin: 0 auto;
          padding: 80px 20px 120px;
        }
        .section-title-wrap {
          margin-bottom: 40px;
        }
        .section-title {
          font-size: 32px;
          font-weight: 800;
          color: #111;
          margin: 0 0 16px;
          letter-spacing: -1px;
        }
        .section-desc {
          font-size: 16px;
          color: #666;
          line-height: 1.6;
          word-break: keep-all;
        }
        .service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-bottom: 80px;
        }
        .service-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 40px 30px;
          text-align: center;
        }
        .service-icon {
          font-size: 40px;
          margin-bottom: 20px;
        }
        .service-name {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 12px;
        }
        .service-detail {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
        }
        .download-banner {
          background: #1e293b;
          border-radius: 16px;
          padding: 50px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 100px;
        }
        .download-info h3 {
          font-size: 28px;
          color: #fff;
          font-weight: 800;
          margin: 0 0 12px;
        }
        .download-info p {
          color: #94a3b8;
          font-size: 16px;
          margin: 0;
        }
        .download-btn {
          background: #3b82f6;
          color: #fff;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-bottom: 80px;
        }
        .contact-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 30px;
        }
        .contact-team {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f1f5f9;
        }
        .contact-detail {
          font-size: 15px;
          color: #475569;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .contact-detail svg {
          color: #94a3b8;
        }

        /* ===== Footer ===== */
        .contact-footer {
          background: #1e293b;
          color: #fff;
          padding: 80px 40px;
        }
        .contact-footer-inner {
          max-width: 1000px;
          margin: 0 auto;
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
        }
        .contact-links a:hover {
          color: #fff;
        }
        .company-info {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.8;
          letter-spacing: -0.2px;
        }
      `}</style>

      {/* ===== Header ===== */}
      <header className="marketing-header">
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 32, width: "auto" }} />
        </Link>
        <div className="header-links">
          <Link href="/about" className="header-link">회사소개</Link>
          <Link href="/marketing" className="header-link active">광고안내</Link>
          <Link href="/partnership" className="header-link">제휴문의</Link>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="marketing-hero">
        <div className="hero-content">
          <h1 className="hero-title">공실뉴스<br/>비즈솔루션본부</h1>
          <p className="hero-desc">
            대한민국 11만 부동산과 임대인, 매수인을 연결하는<br/>
            부동산 전문 미디어의 강력한 마케팅 네트워크를 경험하세요.
          </p>
        </div>
      </section>

      {/* ===== Main Content ===== */}
      <main className="marketing-main">
        <section>
          <div className="section-title-wrap">
            <h2 className="section-title">디지털 마케팅 및 콘텐트 유통</h2>
            <p className="section-desc">
              광고주와 파트너사에 맞춤형 미디어 마케팅 컨설팅을 제공하여<br />
              최적의 광고, 콘텐트, 캠페인 솔루션을 제안합니다.
            </p>
          </div>
          <div className="service-grid">
            <div className="service-card">
              <div className="service-icon">📰</div>
              <h3 className="service-name">Advertisements</h3>
              <p className="service-detail">배너 광고, 스폰서십, 네이티브 애드 등 목적에 맞는 최적의 광고 지면 제공</p>
            </div>
            <div className="service-card">
              <div className="service-icon">✍️</div>
              <h3 className="service-name">News & PR</h3>
              <p className="service-detail">신뢰도 높은 기획 기사 및 보도자료 배포를 통한 브랜드 인지도 상승</p>
            </div>
            <div className="service-card">
              <div className="service-icon">📱</div>
              <h3 className="service-name">Social Media</h3>
              <p className="service-detail">유튜브, 블로그 등 다양한 소셜 미디어 채널을 활용한 바이럴 마케팅</p>
            </div>
          </div>
        </section>

        <section className="download-banner">
          <div className="download-info">
            <h3>광고 상품 소개서 다운로드</h3>
            <p>다양한 비즈니스 니즈를 충족시키는 공실뉴스의 최신 광고 상품을 만나보세요.</p>
          </div>
          <a href="#" className="download-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            PDF 다운로드
          </a>
        </section>

        <section>
          <div className="section-title-wrap">
            <h2 className="section-title">광고 및 제휴 문의</h2>
            <p className="section-desc">광고 집행, 제휴 제안 등 궁금하신 사항은 언제든 연락 주시기 바랍니다.</p>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <h3 className="contact-team">솔루션영업팀</h3>
              <div className="contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                1555-5343
              </div>
              <div className="contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                sales@gongsilnews.com
              </div>
            </div>
            <div className="contact-card">
              <h3 className="contact-team">전략기획팀</h3>
              <div className="contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                1555-5343
              </div>
              <div className="contact-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                partner@gongsilnews.com
              </div>
            </div>
            <div className="contact-card">
              <h3 className="contact-team">오시는 길</h3>
              <div className="contact-detail" style={{ alignItems: 'flex-start' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: 2 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                서울특별시 강남구<br/>논현로115길 31, 105호
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="contact-footer">
        <div className="contact-footer-inner">
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div className="contact-links">
                <Link href="/about">회사소개</Link>
                <Link href="/marketing">광고안내</Link>
                <Link href="/partnership">제휴문의</Link>
                <Link href="/terms">이용약관</Link>
                <Link href="#" style={{ fontWeight: 700, color: "#fff" }}>개인정보 처리방침</Link>
                <Link href="/youth-policy">청소년 보호정책</Link>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>DATA PARTNER</span>
                <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4 }}>공공데이터포털</span>
                <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4 }}>국토교통부</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.2 }}>공실뉴스</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: -0.3 }}>GONGSIL NEWS</div>
            </div>
            <div className="company-info" style={{ flex: 1, minWidth: 300 }}>
              <div>주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동) <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span> 인터넷신문 등록번호 : 서울 아55037 <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span> 등록일자 : 2023.09.05</div>
              <div>제호 : 공실뉴스 <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span> 법인명 : (주)공실마케팅 <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span> 사업자등록번호 : 337-81-03010</div>
              <div>대표자·발행인 : 김윤경 <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span> 편집인 : 김동현 <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span> 이메일 : master@gongsilnews.com</div>
              <div>고객센터 : 1555-5343 (평일 10:00~18:00)</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단 전재, 복사, 배포 등을 금합니다.</div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

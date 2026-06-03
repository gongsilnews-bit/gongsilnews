import React from "react";
import Link from "next/link";

export const metadata = {
  title: "회사소개 | 공실뉴스",
  description: "부동산 미디어의 디지털 혁신을 주도하는 공실뉴스 소개 페이지입니다.",
};

export default function AboutPage() {
  return (
    <div className="about-container">
      <style>{`
        .about-container {
          font-family: 'Pretendard Variable', 'Malgun Gothic', sans-serif;
          background: #fff;
          min-height: 100vh;
          color: #111;
        }

        /* ===== Header ===== */
        .about-header {
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

        /* ===== Main Content ===== */
        .about-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 40px 120px;
        }
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
          transition: color 0.2s;
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
      <header className="about-header">
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 32, width: "auto" }} />
        </Link>
        <div className="header-links">
          <a href="/about" className="header-link active">회사소개</a>
          <a href="/marketing" className="header-link">광고안내</a>
          <a href="/partnership" className="header-link">제휴문의</a>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="about-hero">
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
        <div className="content-grid">
          <div>
            <p className="text-paragraph">
              공실뉴스는 대한민국 11만 개업공인중개사와 임대인, 매수인을 연결하는 가장 빠르고 정확한 부동산 전문 미디어 채널입니다. 급변하는 부동산 시장 속에서 오직 '팩트'와 '데이터'에 기반한 깊이 있는 시세 정보와 로컬 부동산 동향을 제공하여, 중개 시장의 정보 비대칭을 해소하는 데 앞장서고 있습니다.
            </p>
            <p className="text-paragraph">
              우리는 단순한 뉴스 전달을 넘어, 중개사들의 실무 역량을 강화하는 AI 맞춤형 교육 특강과, 수수료 0원의 투명한 공동중개 공실광고 네트워크를 통해 부동산 중개업계의 질적 성장을 지원합니다.
            </p>
            <p className="text-paragraph">
              앞으로도 공실뉴스는 '가장 신뢰받는 부동산 비즈니스 파트너'로서, 혁신적인 프롭테크(Prop-tech) 솔루션과 수준 높은 미디어 콘텐츠를 결합하여 대한민국 부동산 시장의 새로운 표준을 만들어 가겠습니다.
            </p>
            <div className="signature">
              (주)공실마케팅 대표이사 <span className="signature-name">김 윤 경</span>
            </div>
          </div>
          
          <div style={{ textAlign: "center" }}>
            <svg width="300" height="300" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ margin: "0 auto", display: "block" }}>
              <path d="M100 20 L180 80 L150 170 L50 170 L20 80 Z" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
              <path d="M100 20 L100 170 M20 80 L180 170 M180 80 L20 170 M100 20 L150 170 M100 20 L50 170 M20 80 L150 170 M180 80 L50 170 M100 100 L150 170" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
              <circle cx="100" cy="20" r="4" fill="#cbd5e1" />
              <circle cx="180" cy="80" r="4" fill="#cbd5e1" />
              <circle cx="150" cy="170" r="4" fill="#cbd5e1" />
              <circle cx="50" cy="170" r="4" fill="#cbd5e1" />
              <circle cx="20" cy="80" r="4" fill="#cbd5e1" />
              <circle cx="100" cy="100" r="3" fill="#94a3b8" />
            </svg>
          </div>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="contact-footer">
        <div className="contact-footer-inner">
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div className="contact-links">
                <a href="/about">회사소개</a>
                <a href="/marketing">광고안내</a>
                <a href="/partnership">제휴문의</a>
                <a href="/terms">이용약관</a>
                <a href="#" style={{ fontWeight: 700, color: "#fff" }}>개인정보 처리방침</a>
                <a href="/youth-policy">청소년 보호정책</a>
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

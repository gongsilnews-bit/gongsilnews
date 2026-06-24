import React from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

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
          <Link href="/about" className="header-link active">회사소개</Link>
          <Link href="/marketing" className="header-link">광고안내</Link>
          <Link href="/partnership" className="header-link">제휴문의</Link>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="about-hero">
        <div className="hero-content">
          <h1 className="hero-title">공실뉴스<br/>편집장 인사말</h1>
          <p className="hero-desc">
            11만 부동산과 임대인의 빠른 공실계약을 위해<br/>
            함께 노력하는 공동중개 실매물 뉴스 채널
          </p>
        </div>
      </section>

      {/* ===== Main Content ===== */}
      <main className="about-main">
        <div className="content-grid">
          <div>
            <p className="text-paragraph" style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 32, lineHeight: 1.6 }}>
              안녕하십니까. 공실뉴스 편집장입니다.
            </p>
            <p className="text-paragraph">
              공실뉴스는 11만 개업공인중개사 여러분과 함께 만들어가는 부동산 네트워크 플랫폼입니다.
            </p>
            <p className="text-paragraph">
              공실뉴스는 지역의 로컬 부동산들이 빠른 공실 계약을 위해 공실을 무료로 등록하고, 지역 부동산 정보를 뉴스로 공유하며 홍보할 수 있는 공동중개 실매물 뉴스 채널입니다.
            </p>
            <p className="text-paragraph" style={{ fontWeight: 700, color: "#111", marginBottom: 8 }}>
              부동산 회원이라면 누구나 아래 혜택을 누리실 수 있습니다.
            </p>

            <div style={{ margin: "32px 0", padding: "28px 32px", background: "#f8fafc", borderRadius: 16, borderLeft: "4px solid #3b82f6" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e40af", marginBottom: 12 }}>🤝 무료 공동중개 네트워크</h3>
              <p className="text-paragraph" style={{ marginBottom: 0 }}>
                내 주변 공실의 빠른 계약을 위해 부동산이 직접 등록한 공동중개 물건을 누구나 무료로 열람하고, 공유할 수 있습니다.
              </p>
            </div>

            <div style={{ margin: "24px 0", padding: "28px 32px", background: "#f8fafc", borderRadius: 16, borderLeft: "4px solid #10b981" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#047857", marginBottom: 12 }}>🎓 실전 부동산 마케팅 교육</h3>
              <p className="text-paragraph" style={{ marginBottom: 0 }}>
                이제 AI를 활용한 마케팅은 필수입니다. 공실뉴스는 중개사님들이 변화하는 디지털 환경에 발 빠르게 적응하실 수 있도록 AI 기반의 실무 마케팅 교육과 특강을 제공합니다.
              </p>
            </div>

            <div style={{ margin: "24px 0", padding: "28px 32px", background: "#f8fafc", borderRadius: 16, borderLeft: "4px solid #f59e0b" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#b45309", marginBottom: 12 }}>📰 부동산 마케팅 및 지역 뉴스 정보</h3>
              <p className="text-paragraph" style={{ marginBottom: 0 }}>
                공실뉴스는 중개사님들이 경쟁력을 갖출 수 있도록 다양한 부동산 정보를 뉴스로 제공합니다. 특히, 지역의 믿을 수 있는 공실뉴스 부동산이 내 지역 부동산 정보를 뉴스로 제공합니다. 빠른 계약을 위한 무료 공동중개 및 AI시대 꼭 필요한 유튜브/블로그 교육을 공실뉴스에서 쉽게 열람하세요.
              </p>
            </div>

            <p className="text-paragraph" style={{ marginTop: 32, fontWeight: 600 }}>
              공실뉴스는 11만 부동산과 임대인의 빠른 공실계약을 위해 함께 노력하겠습니다.
            </p>
            <p className="text-paragraph">
              감사합니다.
            </p>

            <div className="signature">
              공실뉴스 <span className="signature-name">편집장</span>
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

      <Footer />
    </div>
  );
}

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
          background-image: url('/about_hero_bg.png');
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
          <h1 className="hero-title">공실뉴스</h1>
          <p className="hero-desc">
            11만 부동산과 임대인의 빠른 공실계약을 위한<br/>
            공동중개 실매물 뉴스 채널
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
              공실뉴스는 11만 개업공인중개사 여러분과 함께 만들어가는 부동산 네트워크 플랫폼이자, 실매물 기반의 공동중개 뉴스 채널입니다.
            </p>
            <p className="text-paragraph">
              임대인과 지역 부동산들이 신속하게 공실을 해소할 수 있도록 무료 매물 등록 서비스를 제공하며, 생생한 지역 부동산 소식을 뉴스로 공유하고 홍보할 수 있도록 돕습니다.
            </p>
            <p className="text-paragraph" style={{ fontWeight: 700, color: "#111", marginBottom: 8 }}>
              공실뉴스 회원이라면 누구나 아래 혜택을 누리실 수 있습니다.
            </p>

            <div style={{ margin: "32px 0", padding: "28px 32px", background: "#f8fafc", borderRadius: 16, borderLeft: "4px solid #3b82f6" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e40af", marginBottom: 16 }}>임대인 회원</h3>
              <ul style={{ paddingLeft: 20, margin: 0, color: "#333", lineHeight: 1.8 }}>
                <li style={{ marginBottom: 8 }}><strong style={{ color: "#111" }}>공실 등록:</strong> 모든 부동산이 무료 열람하는 공실 무료 등록 (2건 무료)</li>
                <li><strong style={{ color: "#111" }}>공실뉴스 열람:</strong> 공실뉴스 부동산기사 무료 열람</li>
              </ul>
            </div>

            <div style={{ margin: "24px 0", padding: "28px 32px", background: "#f8fafc", borderRadius: 16, borderLeft: "4px solid #10b981" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#047857", marginBottom: 16 }}>부동산 회원</h3>
              <ul style={{ paddingLeft: 20, margin: 0, color: "#333", lineHeight: 1.8 }}>
                <li style={{ marginBottom: 8 }}><strong style={{ color: "#111" }}>공동중개 무료:</strong> 부동산이 등록한 공동중개 물건 열람 및 등록 (5건)</li>
                <li style={{ marginBottom: 8 }}><strong style={{ color: "#111" }}>AI 매물보고서:</strong> 부동산 마케팅에 필요한 온/오프라인 물건 보고서 작성</li>
                <li><strong style={{ color: "#111" }}>AI 마케팅 교육:</strong> 부동산 실무마케팅에 필요한 AI 활용 및 유튜브, 블로그 특강</li>
              </ul>
            </div>

            <div style={{ margin: "24px 0", padding: "28px 32px", background: "#f8fafc", borderRadius: 16, borderLeft: "4px solid #8b5cf6" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#6d28d9", marginBottom: 16 }}>비즈니스 회원</h3>
              <ul style={{ paddingLeft: 20, margin: 0, color: "#333", lineHeight: 1.8 }}>
                <li style={{ marginBottom: 8 }}><strong style={{ color: "#111" }}>기사형 광고:</strong> 비즈니스 소식 및 브랜드 홍보 기사 직접 등록 및 송출</li>
                <li><strong style={{ color: "#111" }}>비즈니스 제휴:</strong> 부동산 및 임대인 연관 업종과의 상생 협력</li>
              </ul>
            </div>

            <p className="text-paragraph" style={{ marginTop: 32, fontWeight: 600 }}>
              공실뉴스는 임대인과 공인중개사 여러분의 가장 든든한 파트너로서, 신속하고 원활한 공실 해결을 위해 늘 최선을 다하겠습니다.
            </p>
            <p className="text-paragraph">
              감사합니다.
            </p>

            <div className="signature">
              공실뉴스 <span className="signature-name">임직원 일동</span>
            </div>
          </div>
          
          <div style={{ textAlign: "center" }}>
            <img src="/about_illustration.png" alt="공실뉴스 브랜드 일러스트" style={{ maxWidth: "360px", width: "100%", height: "auto", display: "block", margin: "0 auto" }} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

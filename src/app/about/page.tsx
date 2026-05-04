"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";



const VisionIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h3M19 12h3M12 2v3M12 19v3M5.636 5.636l2.122 2.122M16.243 16.243l2.122 2.122M5.636 18.364l2.122-2.122M16.243 7.757l2.122-2.122" />
    <circle cx="12" cy="12" r="5" />
  </svg>
);

const MissionIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e56a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const MailIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

// Counter Animation Component
const AnimatedCounter = ({ target, duration = 2000, suffix = "" }: { target: number, duration?: number, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setIsVisible(true);
    }, { threshold: 0.1 });
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(target * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, target, duration]);

  return <div ref={elementRef}>{count.toLocaleString()}{suffix}</div>;
};

export default function AboutPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            background: #fff;
            min-height: 100vh;
            color: #111;
          }
          
          /* Common Utilities */
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
          .about-header {
            position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px);
            border-bottom: 1px solid #e5e7eb; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px;
          }
          
          /* Hero */
          .about-hero {
            background: #0f172a;
            color: #fff;
            padding: 160px 40px 140px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .hero-bg-glow {
            position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(30,86,160,0.4) 0%, rgba(15,23,42,0) 70%);
            top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;
          }
          .hero-title { font-size: 56px; font-weight: 900; line-height: 1.2; letter-spacing: -1.5px; margin-bottom: 24px; position: relative; z-index: 1; }
          .hero-desc { font-size: 22px; color: rgba(255,255,255,0.8); line-height: 1.6; font-weight: 400; position: relative; z-index: 1; }
          .highlight { color: #F59E0B; }

          /* Vision & Mission */
          .vision-section { padding: 120px 40px; background: #fff; }
          .vision-grid { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
          .vision-card { background: #f8fafc; border-radius: 24px; padding: 50px; border: 1px solid #f1f5f9; }
          .vision-card-title { font-size: 28px; font-weight: 800; margin: 20px 0 16px; color: #1e293b; }
          .vision-card-desc { font-size: 17px; color: #64748b; line-height: 1.7; }

          /* Stats */
          .stats-section { padding: 100px 40px; background: #1e56a0; color: #fff; text-align: center; }
          .stats-grid { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
          .stat-value { font-size: 56px; font-weight: 900; letter-spacing: -2px; margin-bottom: 8px; color: #fff; display: flex; justify-content: center; }
          .stat-label { font-size: 18px; color: rgba(255,255,255,0.8); font-weight: 500; }

          /* Services */
          .services-section { padding: 120px 40px; background: #f4f6fa; }
          .section-title { text-align: center; font-size: 36px; font-weight: 900; color: #0f172a; margin-bottom: 16px; }
          .section-subtitle { text-align: center; font-size: 18px; color: #64748b; margin-bottom: 80px; }
          .services-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
          .service-card { background: #fff; border-radius: 24px; padding: 50px 30px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; transition: transform 0.3s; }
          .service-card:hover { transform: translateY(-10px); }
          .service-icon-wrap { width: 80px; height: 80px; border-radius: 50%; background: #f0f9ff; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px; }
          .service-title { font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 16px; }
          .service-desc { font-size: 16px; color: #64748b; line-height: 1.6; word-break: keep-all; }

          /* Contact */
          .contact-section { padding: 120px 40px; background: #fff; }
          .contact-container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 24px; border: 1px solid #e2e8f0; padding: 60px; box-shadow: 0 20px 40px rgba(0,0,0,0.03); }
          .contact-item { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 30px; }
          .contact-item:last-child { margin-bottom: 0; }
          .contact-icon { width: 48px; height: 48px; border-radius: 12px; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #1e56a0; flex-shrink: 0; }
          .contact-text-wrap { pt-2; }
          .contact-label { font-size: 14px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
          .contact-value { font-size: 18px; font-weight: 600; color: #1e293b; line-height: 1.5; word-break: keep-all; }

          /* Responsive */
          @media (max-width: 768px) {
            .about-header { padding: 0 16px; height: 56px; }
            .about-header span { font-size: 16px !important; }
            .about-hero { padding: 100px 20px 80px; }
            .hero-title { font-size: 36px; }
            .hero-desc { font-size: 16px; }
            .vision-section { padding: 60px 20px; }
            .vision-grid { grid-template-columns: 1fr; gap: 24px; }
            .vision-card { padding: 30px 24px; }
            .vision-card-title { font-size: 24px; }
            .stats-section { padding: 60px 20px; }
            .stats-grid { grid-template-columns: 1fr; gap: 40px; }
            .stat-value { font-size: 48px; }
            .services-section { padding: 60px 20px; }
            .section-title { font-size: 28px; margin-bottom: 12px; }
            .section-subtitle { font-size: 15px; margin-bottom: 40px; }
            .services-grid { grid-template-columns: 1fr; gap: 20px; }
            .service-card { padding: 40px 24px; }
            .contact-section { padding: 60px 20px; }
            .contact-container { padding: 30px 20px; }
            .contact-item { flex-direction: column; gap: 12px; align-items: center; text-align: center; }
            .contact-label { margin-bottom: 4px; }
          }
        `}</style>

        {/* ===== Header ===== */}
        <header className="about-header">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/logo.png" alt="공실뉴스" style={{ height: 28, width: "auto" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: "#555", textDecoration: "none" }}>홈</Link>
            <Link href="/signup" style={{ fontSize: 14, fontWeight: 600, color: "#1e56a0", textDecoration: "none" }}>무료가입</Link>
          </div>
        </header>

        {/* ===== Hero Section ===== */}
        <section className="about-hero">
          <div className="hero-bg-glow" />
          <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 10 }}>
            <h1 className="hero-title fade-up">
              11만 중개사무소를 잇는<br />
              <span className="highlight">단 하나의 정보채널</span>
            </h1>
            <p className="hero-desc fade-up delay-100">
              정보의 비대칭을 허물고, 허위매물 없는 진짜 부동산 시장을.<br />
              공실뉴스가 대한민국 부동산 중개의 새로운 기준을 세웁니다.
            </p>
          </div>
        </section>

        {/* ===== Vision & Mission ===== */}
        <section className="vision-section">
          <div className="vision-grid">
            <div className="vision-card fade-up">
              <VisionIcon />
              <h2 className="vision-card-title">우리의 비전</h2>
              <p className="vision-card-desc">
                정보의 투명성을 높여 중개사와 고객 모두가 신뢰할 수 있는 건강한 부동산 생태계를 구축합니다. 누구나 쉽고 정확한 부동산 정보에 접근할 수 있는 세상을 꿈꿉니다.
              </p>
            </div>
            <div className="vision-card fade-up delay-100">
              <MissionIcon />
              <h2 className="vision-card-title">우리의 미션</h2>
              <p className="vision-card-desc">
                현장의 공인중개사에게는 실무 중심의 강력한 무기와 100% 무료 공동중개망을 제공하고, 일반 유저에게는 동네 전문가가 직접 전하는 생생하고 진짜인 정보만을 전달합니다.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Key Metrics ===== */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="fade-up">
              <div className="stat-value"><AnimatedCounter target={110000} suffix="+" /></div>
              <div className="stat-label">전국 가입 중개사무소</div>
            </div>
            <div className="fade-up delay-100">
              <div className="stat-value"><AnimatedCounter target={50000} suffix="+" /></div>
              <div className="stat-label">일일 업데이트 매물·뉴스</div>
            </div>
            <div className="fade-up delay-200">
              <div className="stat-value"><AnimatedCounter target={100} suffix="%" /></div>
              <div className="stat-label">수수료 및 가입비 무료</div>
            </div>
          </div>
        </section>

        {/* ===== Core Services ===== */}
        <section className="services-section">
          <h2 className="section-title fade-up">핵심 서비스</h2>
          <p className="section-subtitle fade-up delay-100">공실뉴스가 제공하는 3가지 강력한 솔루션</p>
          
          <div className="services-grid">
            <div className="service-card fade-up">
              <div className="service-icon-wrap" style={{ background: '#fff7ed', color: '#ea580c' }}>📰</div>
              <h3 className="service-title">우리동네뉴스</h3>
              <p className="service-desc">
                전국 로컬 공인중개사가 직접 작성하고 전하는 생생한 현장 시세와 지역 동향 브리핑.
              </p>
            </div>
            <div className="service-card fade-up delay-100">
              <div className="service-icon-wrap" style={{ background: '#eff6ff', color: '#3b82f6' }}>🤝</div>
              <h3 className="service-title">전국 공동중개망</h3>
              <p className="service-desc">
                가입비, 수수료 전혀 없이 11만 중개사가 함께 나누고 검색하는 강력한 공실/공동중개 네트워크.
              </p>
            </div>
            <div className="service-card fade-up delay-200">
              <div className="service-icon-wrap" style={{ background: '#f0fdf4', color: '#22c55e' }}>🎓</div>
              <h3 className="service-title">AI 부동산 특강</h3>
              <p className="service-desc">
                마케팅부터 세무, 법률까지 중개 실무 역량을 200% 끌어올려줄 프리미엄 AI 큐레이션 교육.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Contact ===== */}
        <section className="contact-section">
          <h2 className="section-title fade-up">오시는 길 & 문의</h2>
          <p className="section-subtitle fade-up delay-100">언제든 공실뉴스와 소통하세요.</p>

          <div className="contact-container fade-up delay-200">
            <div className="contact-item">
              <div className="contact-icon"><MapPinIcon /></div>
              <div className="contact-text-wrap">
                <div className="contact-label">Address</div>
                <div className="contact-value">서울특별시 강남구 논현로115길 31, 105호</div>
              </div>
            </div>
            <div style={{ height: 1, background: '#f1f5f9', margin: '30px 0' }} />
            <div className="contact-item">
              <div className="contact-icon"><PhoneIcon /></div>
              <div className="contact-text-wrap">
                <div className="contact-label">Phone</div>
                <div className="contact-value">1555-5343 <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>(평일 10:00~18:00)</span></div>
              </div>
            </div>
            <div style={{ height: 1, background: '#f1f5f9', margin: '30px 0' }} />
            <div className="contact-item">
              <div className="contact-icon"><MailIcon /></div>
              <div className="contact-text-wrap">
                <div className="contact-label">Email</div>
                <div className="contact-value">gongsilmarketing@gmail.com</div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Footer ===== */}
        <footer style={{ background: "#111", padding: "40px", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>© 2026 공실뉴스. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}

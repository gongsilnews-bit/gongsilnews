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

        {/* ?€?€ ?¬í”Œ ëª¨ë°”???ë‹¨ ?¤ë” ?€?€ */}
        <header className="mobile-about-header">
          <Link href="/m" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#333", marginRight: "16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </Link>
          <h1 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>?Œì‚¬?Œê°œ</h1>
        </header>

        {/* ===== Hero Section ===== */}
        <section className="mobile-about-hero fade-up">
          <div className="m-hero-content">
            <h1 className="m-hero-title">ê³µì‹¤?´ìŠ¤<br/>ë¹„ì¦ˆ?”ë£¨?˜ë³¸ë¶€</h1>
            <p className="m-hero-desc">
              ë¶€?™ì‚° ë¯¸ë””?´ì˜ ?”ì????ì‹ ??ì£¼ë„?˜ë©°<br/>
              ê°ê??ì¸ ì§€???¨ì? ?•ë³´ë¥?ë°”íƒ•?¼ë¡œ ìµœê³ ??ë§ˆì????”ë£¨?˜ì„ ?œê³µ?©ë‹ˆ??
            </p>
          </div>
        </section>

        {/* ===== Main Content ===== */}
        <main className="mobile-about-main">
          
          <div className="fade-up delay-100" style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, color: "#111", letterSpacing: "-1px", lineHeight: 1.3 }}>
              ?€?œë?êµ?10ë§?ë¶€?™ì‚°???„í•œ<br/>?„ë¦¬ë¯¸ì—„ ?¤íŠ¸?Œí¬
            </h2>
            <p className="m-text-paragraph">
              ê³µì‹¤?´ìŠ¤??ì§€???¨ì? ?œì„¸ ë°??•ë³´ë¥?ê°ê??ìœ¼ë¡??œê³µ?˜ëŠ” ë¶€?™ì‚° ?¸ë¡ ì±„ë„???˜ê² ?µë‹ˆ??
            </p>
            <p className="m-text-paragraph">
              ?€?œë?êµ?10ë§?ë¶€?™ì‚°???…ìê°€ ?˜ê³ , ??ì§€???¨ì? ?•ë³´ë¥??œê³µ?˜ëŠ” ë¡œì»¬ê¸°ìê°€ ?˜ì–´ ì§‘ì„ êµ¬í•˜??ë§¤ìˆ˜?ì—ê²?ê°€ì¹??ˆëŠ” ?•ë³´ë¥??œê³µ?˜ë„ë¡??•ëŠ” ë§¤ì²´ê°€ ?˜ê² ?µë‹ˆ??
            </p>
            <p className="m-text-paragraph">
              ?í•œ, ?„ë??¸ì—ê²??„ìš”???¸ë¬´, ë²•ë¥ , ?¸í…Œë¦¬ì–´, ê²½ë§¤, ê±´ì¶•?•ë³´ë¥??„ì—…?ì„œ ?œë°œ???œë™?˜ëŠ” ?„ë¬¸ê°€ê°€ ?™ì˜?ë‰´?¤ë¡œ ?œê³µ?©ë‹ˆ?? ë¹ ë¥¸ ê³µì‹¤ê³„ì•½???„í•´ ë¶€?™ì‚°ê³??„ë??¸ì—ê²??„ìš”???¨ë¼?¸ë§ˆì¼€??êµìœ¡ ë°?ê³µì‹¤?¤íŠ¸?Œí¬ ?Œë«?¼ì„ ?œê³µ?©ë‹ˆ??
            </p>
          </div>

          <div className="fade-up delay-200">
            {/* Network Graphic */}
            <div style={{ marginBottom: 32, opacity: 0.8 }}>
              <NetworkGraphic />
            </div>

            <p className="m-text-paragraph">
              ë¶€?™ì‚°?€ ?€?œë?êµ?êµ???´ë¼ë©??„êµ¬??ì¤‘ìš”???¶ì˜ ê¸°ë°˜?…ë‹ˆ??<br />
              ?¸í„°?·ì˜ ë°œë‹¬ë¡???ë§ì? ?•ë³´ê°€ ?˜ì³?˜ì?ë§? ê°ì ì£¼ê??ì¸ ?ë‹¨ë§Œì„ ì£¼ì¥???…ì?¤ì—ê²?ë§ì? ?¼ì„ ??ì£¼ê³  ?ˆìŠµ?ˆë‹¤.
            </p>
            <p className="m-text-paragraph">
              ê³µì‹¤?´ìŠ¤????½ë¡ ë„ ?ìŠ¹ë¡ ë„ ?„ë‹Œ ì§€???¨ì? ?œì„¸ ë°?ê±°ë˜ ?•ë³´ë¥??„ì? ë¶€?™ì‚° ë¡œì»¬ ê¸°ìê°€ ?„ë‹¬?©ë‹ˆ??
            </p>
            <p className="m-text-paragraph">
              ë¶€?™ì‚° êµ¬ë§¤ë¥??¬ë§?˜ëŠ” ?…ì?¤ì´ ê°ê??ì¸ ?ë‹¨???????ˆë„ë¡??•ëŠ” ë¶€?™ì‚°ë¯¸ë””?´ê? ?˜ê² ?µë‹ˆ??
            </p>
            <p className="m-text-paragraph">
              ??ì§€???¨ì? ë¶€?™ì‚° ?•ë³´ë¥??œê³µ?˜ê³  ?¶ì? ë¶€?™ì‚°,<br />
              ê³µì‹¤??ê¸¸ì–´??ê³ ë????„ë???<br />
              ë¶€?™ì‚° êµ¬ë§¤ë¥??¬ë§?˜ëŠ” ë§¤ìˆ˜??<br />
              <br />
              ?¤ì–‘??ë°©ë²•?¼ë¡œ ?…ì?€ ?Œí†µ??ì°½ì„ ?“í? ê°€ê² ìŠµ?ˆë‹¤.<br />
              ?¬ëŸ¬ë¶„ì˜ ì°¸ì—¬ë¥??ê·¹ ?˜ì˜?©ë‹ˆ??
            </p>
            
            <div className="m-signature">
              - ê³µì‹¤?´ìŠ¤ ?¸ì§‘??<span className="m-signature-name">ê¹€ ????/span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

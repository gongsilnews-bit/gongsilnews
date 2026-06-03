"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";

const PlayLogo = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="24" fill="#222222" />
    <circle cx="24" cy="24" r="16" fill="#FFFFFF" />
    <path d="M19 15.34L34 24L19 32.66Z" fill="#F59E0B" stroke="#222222" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="12" fill="#1e56a0" />
    <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const stats = [
  { label: "?„ì  ê°€??ì¤‘ê°œ??, value: "11ë§?", sub: "?„êµ­ ì¤‘ê°œ?¬ë¬´?? },
  { label: "ë¶€?™ì‚° ?´ìŠ¤ ì½˜í…ì¸?, value: "50,000+", sub: "?¼ì¼ ?…ë°?´íŠ¸" },
  { label: "ë¬´ë£Œ ?¹ê°• ?ìƒ", value: "300+", sub: "AI ê¸°ë°˜ ë§ì¶¤ ì¶”ì²œ" },
];

const features = [
  {
    icon: "?“°",
    title: "ë¡œì»¬ ë¶€?™ì‚°??ì§ì ‘ ?„ë‹¬?˜ëŠ”\n?œì„¸ ?„í™© ?´ìŠ¤",
    desc: "ê°?ì§€???„ì¥ ì¤‘ê°œ?¬ê? ì§ì ‘ ?‘ì„±?˜ëŠ” ?¤ì‹œê°??œì„¸ ?™í–¥ê³?ê³µì‹¤ê´‘ê³  ?•ë³´ë¥?ê°€??ë¹ ë¥´ê²??•ì¸?˜ì„¸?? ?™ë„¤ë³?ê³µì‹¤ë¥? ë§¤ë§¤Â·?„ì„¸ ?œì„¸ ë³€?™ê¹Œì§€ ?œëˆˆ???Œì•…?????ˆìŠµ?ˆë‹¤.",
    color: "#1e56a0",
  },
  {
    icon: "?¬",
    title: "ì¤‘ê°œ?¬ì—ê²?ê¼??„ìš”??nAI ? íŠœë¸??¹ê°• ?œì²­",
    desc: "?¸ë¬´Â·ë²•ë¥ Â·ë§ˆì??…Â·ì‹¤ë¬??¸í•˜?°ê¹Œì§€, AIê°€ ?„ì„ ??ë¶€?™ì‚° ?„ë¬¸ ?¹ê°•??ë¬´ë£Œë¡??œì²­?˜ì„¸?? ë°”ìœ ì¤‘ê°œ?¬ë? ?„í•´ ?µì‹¬ë§??´ì? ì½˜í…ì¸ ë¡œ ê²½ìŸ?¥ì„ ?’ì¼ ???ˆìŠµ?ˆë‹¤.",
    color: "#F59E0B",
  },
  {
    icon: "?¤",
    title: "?€?œë?êµ?ë¶€?™ì‚° ?„êµ¬??ê°€?…í•˜??n100% ë¬´ë£Œ ê³µë™ì¤‘ê°œë§?,
    desc: "ê°€?…ë¹„Â·?˜ìˆ˜ë£??œë¡œ! ?„êµ­ ?´ë””?œë‚˜ ê³µë™ì¤‘ê°œ ê³µì‹¤ê´‘ê³ ???±ë¡?˜ê³  ì¡°íšŒ?´ë³´?¸ìš”. ì§€ê¸?ê³µì‹¤?´ìŠ¤??ê°€?…í•œ 11ë§?ì¤‘ê°œ?¬ì? ?¨ê»˜ ??ë§ì? ê±°ë˜ ê¸°íšŒë¥?ë§Œë“¤ ???ˆìŠµ?ˆë‹¤.",
    color: "#10b981",
  },
];

const faqs = [
  {
    q: "ê°€?…ë¹„???´ìš©ë£Œê? ?ˆë‚˜??",
    a: "?„ë‹™?ˆë‹¤. ê³µì‹¤?´ìŠ¤??ì¤‘ê°œ?¬ë¬´?Œë? ?„í•œ 100% ë¬´ë£Œ ?œë¹„?¤ì…?ˆë‹¤. ê°€?…ë¹„, ???´ìš©ë£? ?˜ìˆ˜ë£Œê? ?„í? ?†ìŠµ?ˆë‹¤.",
  },
  {
    q: "ê°€?…ì— ?„ìš”???œë¥˜ê°€ ?ˆë‚˜??",
    a: "?¬ì—…?ë“±ë¡ì¦ê³?ì¤‘ê°œ?¬ë¬´??ê°œì„¤?±ë¡ì¦ì´ ?„ìš”?©ë‹ˆ?? ê°€????ë§ˆì´?˜ì´ì§€?ì„œ ê°„í¸?˜ê²Œ ?…ë¡œ?œí•˜?????ˆìŠµ?ˆë‹¤.",
  },
  {
    q: "?¼ë°˜ ?Œì›??ê°€?…í•  ???ˆë‚˜??",
    a: "?? ë¶€?™ì‚° ?´ìŠ¤ ?´ëŒê³??¹ê°• ?œì²­?€ ?„êµ¬??ë¬´ë£Œë¡??´ìš© ê°€?¥í•©?ˆë‹¤. ê³µë™ì¤‘ê°œ ê¸°ëŠ¥?€ ì¤‘ê°œ?¬ë¬´???¸ì¦ ???¬ìš©?˜ì‹¤ ???ˆìŠµ?ˆë‹¤.",
  },
  {
    q: "ê³µë™ì¤‘ê°œ ê³µì‹¤ê´‘ê³ ???´ë–»ê²??±ë¡?˜ë‚˜??",
    a: "ê°€????ê´€ë¦¬ì ?˜ì´ì§€?ì„œ ê°„í¸?˜ê²Œ ê³µì‹¤/ê³µì‹¤ê´‘ê³  ?•ë³´ë¥??±ë¡?????ˆìœ¼ë©? ?±ë¡ ì¦‰ì‹œ ?„êµ­ ì¤‘ê°œ?¬ì—ê²??¸ì¶œ?©ë‹ˆ??",
  },
];

export default function MobileSignupPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="signup" />

      <div className="m-signup-container">
        <style>{`
          .m-signup-container {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            background: #fff;
            min-height: 100vh;
            color: #111;
          }
          
          /* ===== Header ===== */
          .m-signup-header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
          }
          .m-header-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
          }
          .m-header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          /* ===== Hero ===== */
          .m-signup-hero {
            background: linear-gradient(135deg, #0f1b2d 0%, #1a3a6b 50%, #1e56a0 100%);
            padding: 60px 20px 80px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .m-hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.12);
            border-radius: 50px;
            padding: 6px 16px;
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.15);
            font-size: 13px;
            color: rgba(255,255,255,0.95);
            font-weight: 600;
          }
          .m-hero-title {
            font-size: 28px;
            font-weight: 900;
            color: #fff;
            line-height: 1.35;
            margin: 0 0 16px;
            letter-spacing: -1px;
            word-break: keep-all;
          }
          .m-hero-desc {
            font-size: 15px;
            color: rgba(255,255,255,0.8);
            line-height: 1.6;
            margin: 0 0 32px;
            font-weight: 400;
            word-break: keep-all;
          }

          /* ===== Buttons ===== */
          .m-btn-primary {
            width: 100%;
            background: #F59E0B;
            color: #111;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(245,158,11,0.35);
            margin-bottom: 12px;
            display: block;
            text-align: center;
            text-decoration: none;
          }
          .m-btn-outline {
            width: 100%;
            background: rgba(255,255,255,0.12);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            display: block;
            text-align: center;
          }

          /* ===== Stats ===== */
          .m-stats-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 0 20px;
            transform: translateY(-30px);
            position: relative;
            z-index: 2;
          }
          .m-stat-card {
            background: #fff;
            border-radius: 16px;
            padding: 24px 20px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border: 1px solid #f0f0f0;
          }
          .m-stat-label { font-size: 13px; font-weight: 600; color: #888; margin-bottom: 6px; }
          .m-stat-val { font-size: 28px; font-weight: 900; color: #1e56a0; letter-spacing: -1px; }
          .m-stat-sub { font-size: 12px; color: #bbb; margin-top: 4px; }

          /* ===== Features ===== */
          .m-features-sec {
            padding: 20px 20px 60px;
            background: #f9fafb;
          }
          .m-feature-card {
            background: #fff;
            border-radius: 20px;
            padding: 32px 24px;
            margin-bottom: 24px;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.04);
            border: 1px solid #f0f0f0;
          }
          .m-feature-icon-wrap {
            width: 80px; height: 80px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 36px;
            margin: 0 auto 20px;
          }
          .m-feature-title {
            font-size: 20px; font-weight: 900; color: #111; line-height: 1.4;
            margin: 0 0 12px; white-space: pre-line; letter-spacing: -0.5px;
          }
          .m-feature-desc {
            font-size: 14px; color: #666; line-height: 1.7; margin: 0; word-break: keep-all;
          }

          /* ===== Checklist ===== */
          .m-check-sec {
            padding: 60px 20px;
            background: #fff;
          }
          .m-check-title {
            font-size: 24px; font-weight: 900; color: #111; text-align: center;
            margin: 0 0 28px; letter-spacing: -0.5px;
          }
          .m-check-item {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 16px 20px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #eef2f7;
            margin-bottom: 12px;
          }
          .m-check-text {
            font-size: 14px; font-weight: 600; color: #333; line-height: 1.5; letter-spacing: -0.3px;
          }

          /* ===== FAQ ===== */
          .m-faq-sec {
            padding: 60px 20px;
            background: #f4f6fa;
          }
          .m-faq-title {
            font-size: 24px; font-weight: 900; color: #1e56a0; text-align: center;
            margin: 0 0 28px; letter-spacing: -0.5px;
          }
          .m-faq-card {
            background: #fff; border-radius: 12px; margin-bottom: 12px;
            border: 1px solid #e8eaef; overflow: hidden;
          }
          .m-faq-q {
            width: 100%; padding: 18px 20px; background: none; border: none; cursor: pointer;
            display: flex; alignItems: center; justify-content: space-between;
            font-size: 15px; font-weight: 700; color: #222; text-align: left;
          }
          .m-faq-a {
            padding: 0 20px 18px; font-size: 14px; color: #666; line-height: 1.7; word-break: keep-all;
          }

          /* ===== CTA ===== */
          .m-cta-sec {
            padding: 60px 20px;
            background: linear-gradient(135deg, #0f1b2d 0%, #1a3a6b 100%);
            text-align: center;
          }
          .m-cta-title {
            font-size: 24px; font-weight: 900; color: #fff; line-height: 1.3;
            margin: 20px 0 12px; letter-spacing: -0.5px;
          }
          .m-cta-desc {
            font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 32px;
          }

          /* ===== Footer ===== */
          .m-footer {
            background: #111; padding: 32px 20px; text-align: center;
          }
        `}</style>

        {/* ===== Header ===== */}
        <header className="m-signup-header">
          <Link href="/m" className="m-header-logo">
            <PlayLogo size={28} />
            <span style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>ê³µì‹¤?´ìŠ¤</span>
          </Link>
          <div className="m-header-actions">
            <Link href="/m" style={{ fontSize: 13, fontWeight: 600, color: "#555", textDecoration: "none" }}>??/Link>
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              style={{ background: "#1e56a0", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}
            >
              ë¬´ë£Œ ?Œì›ê°€??            </button>
          </div>
        </header>

        {/* ===== Hero ===== */}
        <section className="m-signup-hero">
          {/* Decorative Background */}
          <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,0.03)", top: -50, right: -50 }} />
          <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.02)", bottom: -50, left: -50 }} />
          
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="m-hero-badge">
              ?¢ ?„êµ­ <strong style={{ color: "#F59E0B" }}>11ë§?/strong> ì¤‘ê°œ?¬ë¬´?Œê? ? íƒ
            </div>
            <h1 className="m-hero-title">
              ë¶€?™ì‚° ì¤‘ê°œ?¬ë? ?„í•œ<br /><span style={{ color: "#F59E0B" }}>100% ë¬´ë£Œ</span> ?•ë³´ì±„ë„
            </h1>
            <p className="m-hero-desc">
              ?œì„¸ ?´ìŠ¤, AI ?¹ê°•, ê³µë™ì¤‘ê°œë§ê¹Œì§€<br />ì¤‘ê°œ ?¤ë¬´???„ìš”??ëª¨ë“  ê²ƒì„ ë¬´ë£Œë¡??œê³µ?©ë‹ˆ??
            </p>
            <div>
              <button className="m-btn-primary" onClick={() => setIsAuthModalOpen(true)}>ì¤‘ê°œ?¬ë¬´??ë¬´ë£Œ ?Œì›ê°€??/button>
              <Link href="/m" className="m-btn-outline">?ˆìœ¼ë¡??Œì•„ê°€ê¸?/Link>
            </div>
          </div>
        </section>

        {/* ===== Stats ===== */}
        <div style={{ background: "#f9fafb" }}>
          <div className="m-stats-container">
            {stats.map((s, i) => (
              <div key={i} className="m-stat-card">
                <div className="m-stat-label">{s.label}</div>
                <div className="m-stat-val">{s.value}</div>
                <div className="m-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Features ===== */}
        <section className="m-features-sec">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111", margin: "0 0 8px", letterSpacing: "-0.5px" }}>??<span style={{ color: "#1e56a0" }}>ê³µì‹¤?´ìŠ¤</span>?¸ê???</h2>
            <p style={{ fontSize: 14, color: "#888", margin: 0 }}>ì¤‘ê°œ???¤ë¬´ë¥??„í•´ ?¤ê³„??3ê°€ì§€ ?µì‹¬ ?œë¹„??/p>
          </div>

          {features.map((f, i) => (
            <div key={i} className="m-feature-card">
              <div className="m-feature-icon-wrap" style={{ background: `${f.color}15` }}>
                {f.icon}
              </div>
              <h3 className="m-feature-title">{f.title}</h3>
              <p className="m-feature-desc">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* ===== Checklist ===== */}
        <section className="m-check-sec">
          <h2 className="m-check-title">ê³µì‹¤?´ìŠ¤ ê°€???œíƒ ?”ì•½</h2>
          <div>
            {[
              "?„êµ­ ?¤ì‹œê°??œì„¸Â·ê³µì‹¤ ?„í™© ?´ìŠ¤ ë¬´ë£Œ ?´ëŒ",
              "AI ê¸°ë°˜ ë§ì¶¤??ë¶€?™ì‚° ? íŠœë¸??¹ê°• ë¬´ì œ???œì²­",
              "?˜ìˆ˜ë£??œë¡œ, 100% ë¬´ë£Œ ê³µë™ì¤‘ê°œ ê³µì‹¤ê´‘ê³  ?±ë¡Â·ê²€??,
              "?„ë¬¸ ê¸°ì?¨ì´ ?‘ì„±?˜ëŠ” ?„ë¦¬ë¯¸ì—„ ë¶„ì„ ë¦¬í¬??,
              "?™ë„¤ë³?ë¶€?™ì‚° ì§€??ë°??™í–¥ ?°ì´??ë¬´ë£Œ ?œê³µ",
              "?œë¡  ?ìƒ, ê³„ì•½???‘ì‹ ???¤ë¬´ ?ë£Œ???´ìš©",
            ].map((item, i) => (
              <div key={i} className="m-check-item">
                <CheckIcon />
                <span className="m-check-text">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="m-faq-sec">
          <h2 className="m-faq-title">?ì£¼ ë¬»ëŠ” ì§ˆë¬¸</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="m-faq-card">
              <button className="m-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <span style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>??/span>
              </button>
              {openFaq === i && (
                <div className="m-faq-a">{faq.a}</div>
              )}
            </div>
          ))}
        </section>

        {/* ===== Final CTA ===== */}
        <section className="m-cta-sec">
          <PlayLogo size={48} />
          <h2 className="m-cta-title">
            ?€?œë?êµ??€???•ë³´ì±„ë„,<br />ê³µì‹¤?´ìŠ¤ë¥??œì‘?˜ì„¸??
          </h2>
          <p className="m-cta-desc">ê°€?…ë¹„Â·?´ìš©ë£??„í? ?†ì´, ëª¨ë“  ê¸°ëŠ¥??ë¬´ë£Œë¡??´ìš©?˜ì„¸??</p>
          <button className="m-btn-primary" onClick={() => setIsAuthModalOpen(true)}>ì¤‘ê°œ?¬ë¬´??ë¬´ë£Œ ?Œì›ê°€??/button>
        </section>

        {/* ===== Footer ===== */}
        <footer className="m-footer">
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
            ë¬¸ì˜: <a href="mailto:gongsilmarketing@gmail.com" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>gongsilmarketing@gmail.com</a>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Â© 2026 ê³µì‹¤?´ìŠ¤. All rights reserved.</div>
        </footer>

      </div>
    </>
  );
}

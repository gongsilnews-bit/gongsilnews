"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const SearchOverlay = dynamic(() => import("@/app/m/_components/header/SearchOverlay"), { ssr: false });

const CATEGORIES = [
  { key: "news_gongsil", label: "ê³µì‹¤?´ìŠ¤", path: "/m/news_gongsil" },
  { key: "news_politics", label: "ë¶€?™ì‚°Â·ê²½ì œ", path: "/m/news_politics" },
  { key: "news_marketing", label: "AIë§ˆì???, path: "/m/news_marketing" },
  { key: "news_etc", label: "?¼ì´?„Â·ì˜¤?¼ë‹ˆ??, path: "/m/news_etc" },
];

interface MobileNewsTabBarProps {
  /** ?„ì¬ ?œì„±?”ëœ ??key (?†ìœ¼ë©??˜ì´?¼ì´???†ìŒ) */
  activeTab?: string;
}

export default function MobileNewsTabBar({ activeTab }: MobileNewsTabBarProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "0px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "448px",
          zIndex: 40,
          backgroundColor: "#ffffff",
          borderBottom: "9px solid #F4F6F8",
          display: "flex",
          alignItems: "stretch",
          height: "56px",
        }}
      >
        {/* ì¢Œì¸¡ ë¡œê³  ??ê³ ì • */}
        <button
          onClick={() => router.push("/m")}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            padding: "0 8px 6px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <img src="/new_logo.png" alt="?? style={{ width: "28px", height: "28px", objectFit: "contain" }} />
        </button>

        {/* ì¤‘ì•™ ?¤í¬ë¡?ë©”ë‰´ */}
        <div
          ref={tabBarRef}
          className="hide-scrollbar"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
            scrollBehavior: "smooth",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              data-active={activeTab === cat.key ? "true" : "false"}
              onClick={() => router.push(cat.path)}
              style={{
                flexShrink: 0,
                padding: "0 14px 0",
                fontSize: "17px",
                fontWeight: activeTab === cat.key ? 700 : 500,
                color: activeTab === cat.key ? "#1a4282" : "#222222",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s",
                whiteSpace: "nowrap",
                letterSpacing: "-0.3px",
              }}
            >
              <span style={{
                display: "inline-block",
                paddingBottom: "3px",
                borderBottom: activeTab === cat.key ? "3px solid #1a4282" : "3px solid transparent",
              }}>
                {cat.label}
              </span>
            </button>
          ))}
          {/* ê²€??ë²„íŠ¼??ê°€?¤ì?ì§€ ?Šë„ë¡??ë?ë¶??¬ë°± ì¶”ê? */}
          <div style={{ flexShrink: 0, width: "40px" }} />
        </div>

        {/* ?°ì¸¡ ê²€??ë²„íŠ¼ ??ê³ ì • */}
        <button
          onClick={() => setIsSearchOpen(true)}
          style={{
            position: "absolute",
            right: "0",
            top: "4px",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>

      {/* ??°”(56px) ë§Œí¼ ì½˜í…ì¸?ë°€ë¦¬ê¸° */}
      <div style={{ height: "56px" }} />

      {/* ê²€???¤ë²„?ˆì´ */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </>
  );
}

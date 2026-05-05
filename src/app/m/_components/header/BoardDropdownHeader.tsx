"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const QUICK_MENU = [
  {
    category: "커뮤니티",
    items: [
      { name: "자유게시판", path: "/m/board?id=free" },
      { name: "Q&A게시판", path: "/m/board?id=qna" },
      { name: "공지사항", path: "/m/board?id=notice" },
      { name: "1:1 문의", path: "/m/board?id=inquiry" },
    ]
  },
  {
    category: "자료실",
    items: [
      { name: "부동산특강", path: "/m/study" },
      { name: "드론영상", path: "/m/board?id=drone" },
      { name: "APP(앱)", path: "/m/board?id=app" },
      { name: "AI 프롬프트", path: "/m/board?id=prompt" },
      { name: "음원", path: "/m/board?id=sound" },
      { name: "계약서/양식", path: "/m/board?id=doc" },
    ]
  }
];

export default function BoardDropdownHeader({ currentBoardName }: { currentBoardName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleNav = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          fontSize: "16px",
          fontWeight: 700,
          color: "#111827",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: "6px",
        }}
      >
        {currentBoardName}
        <svg 
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" 
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 전체 화면 배경 오버레이 (클릭 시 닫힘) */}
          <div 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 99, backdropFilter: "blur(2px)" }} 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* 드롭다운 메뉴 컨테이너 */}
          <div
            style={{
              position: "absolute",
              top: "36px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "240px",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              zIndex: 100,
              overflow: "hidden",
              animation: "dropdownFadeIn 0.2s ease-out forwards",
              transformOrigin: "top center",
            }}
          >
            <style>{`
              @keyframes dropdownFadeIn {
                from { opacity: 0; transform: translate(-50%, -10px) scale(0.95); }
                to { opacity: 1; transform: translate(-50%, 0) scale(1); }
              }
            `}</style>
            
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {QUICK_MENU.map((section, idx) => (
                <div key={section.category}>
                  <div style={{ padding: "12px 16px 8px", fontSize: "13px", fontWeight: 800, color: "#9ca3af", background: "#f9fafb" }}>
                    {section.category}
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {section.items.map(item => {
                      const isActive = item.name === currentBoardName;
                      return (
                        <li key={item.name}>
                          <button
                            onClick={() => handleNav(item.path)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "14px 20px",
                              fontSize: "15px",
                              fontWeight: isActive ? 800 : 500,
                              color: isActive ? "#2563eb" : "#1f2937",
                              background: isActive ? "#eff6ff" : "#fff",
                              border: "none",
                              borderBottom: "1px solid #f3f4f6",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between"
                            }}
                          >
                            {item.name}
                            {isActive && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

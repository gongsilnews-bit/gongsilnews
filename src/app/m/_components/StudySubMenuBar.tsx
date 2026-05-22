"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function StudySubMenuBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [activeDropdown, setActiveDropdown] = useState<"study" | "board" | "community" | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const studyRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const commRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStudyItemClick = (type: string) => {
    setActiveDropdown(null);
    if (type === "active") {
      router.push("/m/study");
    } else {
      alert("💡 더 좋은 명사 특강을 열심히 준비 중입니다! 기대해 주세요.");
    }
  };

  const handleBoardItemClick = (id: string) => {
    setActiveDropdown(null);
    router.push(`/m/board?id=${id}`);
  };

  // Determine active states dynamically based on current path and search parameters
  const boardId = searchParams.get("id") || searchParams.get("board_id") || "";
  const isStudyPage = pathname.startsWith("/m/study") || pathname.startsWith("/m/study_read");
  const isBoardPage = pathname.startsWith("/m/board") || pathname.startsWith("/m/board_read") || pathname.startsWith("/m/board_write");

  const isStudyActive = isStudyPage || activeDropdown === "study";
  const isBoardActive = (isBoardPage && ["drone", "app", "prompt", "sound", "doc"].includes(boardId)) || activeDropdown === "board";
  const isCommActive = (isBoardPage && ["free", "qna", "notice", "inquiry"].includes(boardId)) || activeDropdown === "community";

  const activeBorderColor = "#16a34a"; // Green active border
  const activeColor = "#16a34a";       // Green active text
  const activeBgColor = "#f0fdf4";     // Light green active background

  return (
    <div 
      ref={containerRef}
      className="study-sub-menu-scroll"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 16px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        whiteSpace: "nowrap",
        position: "relative",
        zIndex: 35,
      }}
    >
      <style>{`
        .study-sub-menu-scroll::-webkit-scrollbar { display: none; }
        .study-sub-menu-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .sub-menu-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 20px;
          border: 1.5px solid #d1d5db;
          background-color: #ffffff;
          font-size: 13.5px;
          font-weight: 700;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          user-select: none;
        }
        .sub-menu-pill:active {
          transform: scale(0.97);
        }
        .sub-menu-dropdown {
          position: absolute;
          top: 46px;
          z-index: 100;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          padding: 6px;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: dropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes dropFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dropdown-item {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.12s;
          white-space: nowrap;
        }
        .dropdown-item:hover {
          background-color: #f3f4f6;
          color: #111827;
        }
      `}</style>

      {/* 1. 특강준비중 ▾ */}
      <div ref={studyRef} style={{ position: "relative" }}>
        <button 
          onClick={() => setActiveDropdown(activeDropdown === "study" ? null : "study")}
          className="sub-menu-pill"
          style={{
            borderColor: isStudyActive ? activeBorderColor : "#d1d5db",
            color: isStudyActive ? activeColor : "#374151",
            backgroundColor: isStudyActive ? activeBgColor : "#ffffff",
          }}
        >
          특강준비중 <span style={{ fontSize: "10px", transition: "transform 0.2s", transform: activeDropdown === "study" ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        {activeDropdown === "study" && (
          <div className="sub-menu-dropdown" style={{ left: 0 }}>
            <button onClick={() => handleStudyItemClick("active")} className="dropdown-item">부동산 실무 특강</button>
            <button onClick={() => handleStudyItemClick("prep")} className="dropdown-item" style={{ color: "#9ca3af" }}>💡 특강 추가 준비중</button>
          </div>
        )}
      </div>

      {/* 2. 자료실 ▾ */}
      <div ref={boardRef} style={{ position: "relative" }}>
        <button 
          onClick={() => setActiveDropdown(activeDropdown === "board" ? null : "board")}
          className="sub-menu-pill"
          style={{
            borderColor: isBoardActive ? activeBorderColor : "#d1d5db",
            color: isBoardActive ? activeColor : "#374151",
            backgroundColor: isBoardActive ? activeBgColor : "#ffffff",
          }}
        >
          자료실 <span style={{ fontSize: "10px", transition: "transform 0.2s", transform: activeDropdown === "board" ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        {activeDropdown === "board" && (
          <div className="sub-menu-dropdown" style={{ left: 0 }}>
            <button onClick={() => handleBoardItemClick("drone")} className="dropdown-item">드론영상</button>
            <button onClick={() => handleBoardItemClick("app")} className="dropdown-item">APP(앱)</button>
            <button onClick={() => handleBoardItemClick("prompt")} className="dropdown-item">AI 프롬프트</button>
            <button onClick={() => handleBoardItemClick("sound")} className="dropdown-item">음원</button>
            <button onClick={() => handleBoardItemClick("doc")} className="dropdown-item">계약서/양식</button>
          </div>
        )}
      </div>

      {/* 3. 커뮤니티 ▾ */}
      <div ref={commRef} style={{ position: "relative" }}>
        <button 
          onClick={() => setActiveDropdown(activeDropdown === "community" ? null : "community")}
          className="sub-menu-pill"
          style={{
            borderColor: isCommActive ? activeBorderColor : "#d1d5db",
            color: isCommActive ? activeColor : "#374151",
            backgroundColor: isCommActive ? activeBgColor : "#ffffff",
          }}
        >
          커뮤니티 <span style={{ fontSize: "10px", transition: "transform 0.2s", transform: activeDropdown === "community" ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        {activeDropdown === "community" && (
          <div className="sub-menu-dropdown" style={{ left: 0 }}>
            <button onClick={() => handleBoardItemClick("free")} className="dropdown-item">자유게시판</button>
            <button onClick={() => handleBoardItemClick("qna")} className="dropdown-item">Q&A게시판</button>
            <button onClick={() => handleBoardItemClick("notice")} className="dropdown-item">공지사항</button>
            <button onClick={() => handleBoardItemClick("inquiry")} className="dropdown-item">1:1 문의</button>
          </div>
        )}
      </div>
    </div>
  );
}

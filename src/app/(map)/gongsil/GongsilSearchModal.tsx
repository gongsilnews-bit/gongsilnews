"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface GongsilSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (keyword: string) => void;
  initialKeyword?: string;
}

const STORAGE_KEY = "gongsil_map_recent_searches";
const POPULAR_TAGS = ["85437", "강남역", "서초동", "역삼동", "오피스텔", "경매"];

export default function GongsilSearchModal({
  isOpen,
  onClose,
  onSearch,
  initialKeyword = "",
}: GongsilSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState(initialKeyword);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 로컬스토리지에서 최근 검색어 불러오기
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((item) => typeof item === "string" && item.trim()));
        }
      }
    } catch (e) {
      console.error("Failed to load recent searches:", e);
    }
  }, [isOpen]);

  // 모달 오픈 시 검색어 초기화 및 포커스, ESC 키 닫기 이벤트 등록
  useEffect(() => {
    if (!isOpen) return;

    setSearchTerm(initialKeyword);
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, initialKeyword, onClose]);

  if (!isOpen) return null;

  const executeSearch = (rawKeyword: string) => {
    const trimmed = rawKeyword.trim();
    if (!trimmed) return;

    // 최근 검색어 저장 (최대 10개, 중복 제거)
    try {
      const updated = [trimmed, ...recentSearches.filter((item) => item !== trimmed)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent search:", e);
    }

    onSearch(trimmed);
    onClose();
  };

  const removeSingleSearch = (target: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((item) => item !== target);
    setRecentSearches(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(6px)",
        zIndex: 9999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "12vh",
        animation: "gongsilModalFadeIn 0.2s ease-out",
      }}
    >
      <style>{`
        @keyframes gongsilModalFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 우측 상단 닫기(X) 버튼 */}
      <button
        onClick={onClose}
        aria-label="검색 닫기"
        style={{
          position: "absolute",
          top: "40px",
          right: "48px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "10px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#374151",
          transition: "transform 0.15s, background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.06)";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* 중앙 검색 컨테이너 */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 타이틀 */}
        <h2
          style={{
            fontSize: "30px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "36px",
            textAlign: "center",
            letterSpacing: "-0.5px",
          }}
        >
          찾고 싶은 매물번호, 경매번호, 위치를 검색해 보세요.
        </h2>

        {/* 거대한 검색 입력창 */}
        <div
          style={{
            position: "relative",
            width: "100%",
            borderBottom: "3px solid #1a73e8",
            paddingBottom: "14px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                executeSearch(searchTerm);
              }
            }}
            placeholder="물건번호, 경매번호, 지하철, 동 이름 검색"
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              fontSize: "26px",
              outline: "none",
              color: "#111827",
              paddingLeft: "8px",
              fontWeight: "500",
            }}
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                inputRef.current?.focus();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                marginRight: "10px",
              }}
              title="지우기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => executeSearch(searchTerm)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1a73e8",
              flexShrink: 0,
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            title="검색"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>

        {/* 추천 및 최근 검색어 영역 */}
        <div style={{ marginTop: "36px", textAlign: "center" }}>
          {/* 최근 검색어 */}
          <div
            style={{
              color: "#1a73e8",
              fontWeight: "700",
              fontSize: "15px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span>✨ 최근 검색어</span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "10px",
              minHeight: "44px",
              alignItems: "center",
            }}
          >
            {recentSearches.length > 0 ? (
              recentSearches.map((term, idx) => (
                <div
                  key={`${term}-${idx}`}
                  onClick={() => executeSearch(term)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    borderRadius: "30px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#1a73e8";
                    e.currentTarget.style.background = "#eff6ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#1f2937",
                      fontWeight: "500",
                      marginRight: "8px",
                    }}
                  >
                    {term}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => removeSingleSearch(term, e)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#9ca3af",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="삭제"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div style={{ color: "#9ca3af", fontSize: "14px" }}>최근 검색한 내역이 없습니다.</div>
            )}
          </div>

          {recentSearches.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                onClick={clearAllSearches}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "13px",
                  color: "#9ca3af",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                전체 기록 삭제
              </button>
            </div>
          )}

          {/* 추천 키워드 예시 태그 */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px dashed #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "600", marginRight: "4px" }}>
              추천 검색어:
            </span>
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => executeSearch(tag)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "16px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  color: "#4b5563",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                  e.currentTarget.style.color = "#111827";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.color = "#4b5563";
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

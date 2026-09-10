"use client";

import React from "react";
import {
  MAEMAE_SCALE,
  DEPOSIT_SCALE,
  RENT_SCALE,
  AREA_SCALE,
  YEAR_SCALE,
  UNIT_SCALE,
  getScaleIndex,
} from "./gongsilFilterScales";
import { MAINT_PRESETS } from "./gongsilHelpers";

export interface GongsilFilterPanelProps {
  panel: Record<string, unknown>;
}

export default function GongsilFilterPanel({ panel }: GongsilFilterPanelProps) {
  const {
    filterName,
    isWizardOpen,
    handleDragStart,
    isPremiumWizard,
    setIsWizardOpen,
    setActiveFilterDropdown,
    filterOffset,
    isDraggingFilter,
    getWizardTabs,
    activeSection,
    tempFilterTradeTypes,
    tempMaemaeMin,
    tempMaemaeMax,
    tempDepositMin,
    tempDepositMax,
    tempRentMin,
    tempRentMax,
    filterAreaMin,
    filterAreaMax,
    filterYearMin,
    filterYearMax,
    filterUnitMin,
    filterUnitMax,
    filterRoomCount,
    filterBathCount,
    filterDirection,
    filterOwnerRole,
    filterCommissionType,
    filterThemes,
    scrollToSection,
    scrollDebounceRef,
    setActiveSection,
    isAuctionMode,
    setTempFilterTradeTypes,
    activeCategory,
    setTempMaemaeMin,
    formatPriceLabel,
    handleSliderRelease,
    setTempMaemaeMax,
    setTempDepositMin,
    setTempDepositMax,
    setTempRentMin,
    setTempRentMax,
    setFilterAreaMin,
    setFilterAreaMax,
    setFilterFloor,
    filterFloor,
    setFilterYearMin,
    setFilterYearMax,
    setFilterUnitMin,
    setFilterUnitMax,
    setRoomBathInteractions,
    setFilterRoomCount,
    setFilterBathCount,
    setFilterDirection,
    setFilterMaintIdx,
    filterMaintIdx,
    setFilterParking,
    filterParking,
    activePills,
    setFilterOptions,
    filterOptions,
    setFilterAuctionAppraisalMin,
    setFilterAuctionAppraisalMax,
    filterAuctionAppraisalMin,
    filterAuctionAppraisalMax,
    setFilterAuctionBidPriceMin,
    setFilterAuctionBidPriceMax,
    filterAuctionBidPriceMin,
    filterAuctionBidPriceMax,
    filterAuctionDiscount,
    setFilterAuctionDiscount,
    filterAuctionBidCount,
    setFilterAuctionBidCount,
    filterAuctionStartDate,
    setFilterAuctionStartDate,
    setFilterOwnerRole,
    setFilterCommissionType,
    getThemesByCategory,
    setFilterThemes,
    setPopoverSearchKeyword,
    setFilterSearchKeyword,
    setFilterTradeTypes,
    setFilterPriceMin,
    setFilterPriceMax,
    setFilterSaleStage,
    setFilterSaleType,
    setAppliedMaemaeMin,
    setAppliedMaemaeMax,
    setAppliedDepositMin,
    setAppliedDepositMax,
    setAppliedRentMin,
    setAppliedRentMax,
    setIsFilterCollapsed,
  } = panel;

  return (
    <div>
      {isWizardOpen && (
        <div
                      onMouseDown={filterName === "거래유형" ? handleDragStart : undefined}
                      style={isPremiumWizard ? {
                        position: "fixed",
                        top: 130,
                        left: 400,
                        marginTop: 4,
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        padding: 24,
                        zIndex: 1200,
                        minWidth: 560,
                        animation: "dropdownFadeIn 0.15s ease",
                        transform: `translate(${filterOffset.x}px, ${filterOffset.y}px)`,
                        cursor: isDraggingFilter ? "grabbing" : "grab",
                      } : {
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: 4,
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        padding: 16,
                        zIndex: 1200,
                        minWidth: 200,
                        animation: "dropdownFadeIn 0.15s ease",
                      }}
                    >
                      {/* Close button at the top right of the popover */}
                      <button
                        onClick={() => {
                          if (isPremiumWizard) {
                            setIsWizardOpen(false);
                          } else {
                            setActiveFilterDropdown(null);
                          }
                        }}
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#6b7280",
                          padding: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          transition: "background 0.15s, color 0.15s",
                          zIndex: 310,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.color = "#111827";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "none";
                          e.currentTarget.style.color = "#6b7280";
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                      {filterName === "거래유형" && (
                        <div style={{ display: "flex", flexDirection: "column", width: "510px" }}>
                          {/* Dedicated elegant grab bar at the very top */}
                          <div
                            style={{
                              width: "36px",
                              height: "4px",
                              borderRadius: "2px",
                              background: "#cbd5e1",
                              margin: "0 auto 10px auto",
                              cursor: isDraggingFilter ? "grabbing" : "grab",
                            }}
                            title="드래그하여 이동할 수 있습니다"
                          />
                          {/* style block to inject dual slider styles and custom scrollbar */}
                          <style>{`
                            .dual-slider-container {
                              position: relative;
                              width: 100%;
                              height: 4px;
                              background: #e5e7eb;
                              border-radius: 2px;
                              margin: 20px 0 28px 0;
                            }
                            .dual-slider-track {
                              position: absolute;
                              height: 100%;
                              background: #1a4282; /* Corporate Deep Navy track */
                              border-radius: 2px;
                            }
                            .dual-slider-input {
                              position: absolute;
                              width: 100%;
                              height: 4px;
                              top: 0;
                              left: 0;
                              background: none;
                              pointer-events: none;
                              -webkit-appearance: none;
                              -moz-appearance: none;
                              appearance: none;
                              margin: 0;
                            }
                             .dual-slider-input::-webkit-slider-thumb {
                              height: 20px;
                              width: 20px;
                              margin-top: -8px;
                              border-radius: 50%;
                              background: #ffffff;
                              border: 2.5px solid #1a4282;
                              cursor: pointer;
                              pointer-events: auto;
                              -webkit-appearance: none;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                              transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 0.12s, border-color 0.12s, box-shadow 0.12s;
                            }
                            .dual-slider-input::-webkit-slider-thumb:hover {
                              transform: scale(1.35);
                              background: #f8fafc;
                              border-color: #0f172a;
                              box-shadow: 0 4px 10px rgba(0,0,0,0.22);
                            }
                            .dual-slider-input::-webkit-slider-thumb:active {
                              transform: scale(1.45);
                              background: #1a4282;
                              border-color: #1a4282;
                            }
                            .dual-slider-input::-moz-range-thumb {
                              height: 20px;
                              width: 20px;
                              border-radius: 50%;
                              background: #ffffff;
                              border: 2.5px solid #1a4282;
                              cursor: pointer;
                              pointer-events: auto;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                              transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 0.12s, border-color 0.12s, box-shadow 0.12s;
                            }
                            .dual-slider-input::-moz-range-thumb:hover {
                              transform: scale(1.35);
                              background: #f8fafc;
                              border-color: #0f172a;
                              box-shadow: 0 4px 10px rgba(0,0,0,0.22);
                            }
                            .dual-slider-input::-moz-range-thumb:active {
                              transform: scale(1.45);
                              background: #1a4282;
                              border-color: #1a4282;
                            }
                            
                            /* Custom slim scrollbar */
                            #popover-scroll-container::-webkit-scrollbar {
                              width: 10px;
                            }
                            #popover-scroll-container::-webkit-scrollbar-track {
                              background: #f1f5f9;
                              border-radius: 5px;
                            }
                            #popover-scroll-container::-webkit-scrollbar-thumb {
                              background: #cbd5e1;
                              border-radius: 5px;
                            }
                            #popover-scroll-container::-webkit-scrollbar-thumb:hover {
                              background: #94a3b8;
                            }
                            
                            .sub-gnb-scroll::-webkit-scrollbar {
                              display: none;
                            }
                            .sub-gnb-scroll {
                              -ms-overflow-style: none;
                              scrollbar-width: none;
                            }
                          `}</style>
                          


                          {/* Horizontal Navigation with Left/Right Buttons */}
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px", position: "relative", paddingRight: "36px" }}>
                            <button
                              onClick={() => {
                                const nav = document.getElementById("sub-gnb-scroll");
                                if (nav) nav.scrollBy({ left: -80, behavior: "smooth" });
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                fontSize: "16px",
                                color: "#6b7280",
                                cursor: "pointer",
                                padding: "4px 8px",
                                fontWeight: "bold",
                              }}
                            >
                              &lt;
                            </button>
                            
                            <div
                              id="sub-gnb-scroll"
                              className="sub-gnb-scroll"
                              style={{
                                display: "flex",
                                gap: "8px",
                                overflowX: "auto",
                                flex: 1,
                                whiteSpace: "nowrap",
                                padding: "6px 0",
                              }}
                            >
                              {getWizardTabs().map((tab) => {
                                const isActive = activeSection === tab;
                                return (
                                  <span
                                    key={tab}
                                    onClick={() => {
                                      scrollToSection(tab);
                                    }}
                                    style={{
                                      fontSize: "14px",
                                      color: isActive ? "#1a4282" : "#4b5563",
                                      fontWeight: isActive ? "bold" : "normal",
                                      cursor: "pointer",
                                      padding: "6px 12px",
                                      background: isActive ? "#e8f0fe" : "none",
                                      border: "1px solid transparent",
                                      borderRadius: "14px",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {tab}
                                  </span>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => {
                                const nav = document.getElementById("sub-gnb-scroll");
                                if (nav) nav.scrollBy({ left: 80, behavior: "smooth" });
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                fontSize: "16px",
                                color: "#6b7280",
                                cursor: "pointer",
                                padding: "4px 8px",
                                fontWeight: "bold",
                              }}
                            >
                              &gt;
                            </button>
                          </div>

                          {/* Scrollable area */}
                          <div
                            id="popover-scroll-container"
                            style={{ maxHeight: "560px", overflowY: "auto", paddingRight: "8px", paddingBottom: "10px" }}
                            onScroll={(e) => {
                              const container = e.currentTarget;
                              if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
                              scrollDebounceRef.current = setTimeout(() => {
                                const containerRect = container.getBoundingClientRect();
                                const sections = getWizardTabs();
                                
                                let closestSec = sections[0];
                                let minDiff = Infinity;
                                
                                for (const sec of sections) {
                                  const el = document.getElementById(`section-${sec}`);
                                  if (el) {
                                    const rect = el.getBoundingClientRect();
                                    const diff = Math.abs(rect.top - containerRect.top);
                                    if (diff < minDiff) {
                                      minDiff = diff;
                                      closestSec = sec;
                                    }
                                  }
                                }
                                
                                setActiveSection(closestSec);
                              }, 100);
                            }}
                          >
                            {/* Section 1: 거래유형 */}
                            <div
                              id="section-거래유형"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "거래유형" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                                display: isAuctionMode ? "none" : "block",
                              }}
                            >
                              {isAuctionMode ? null : (
                                <>
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>
                                    거래유형 중복선택 가능
                                  </div>
                                  
                                  <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                                    <button
                                      onClick={() => {
                                        setTempFilterTradeTypes([]);
                                        setTimeout(() => {
                                          scrollToSection("면적");
                                        }, 350);
                                      }}
                                      style={{
                                        padding: "6px 14px",
                                        borderRadius: 4,
                                        fontSize: 13,
                                        border: "1px solid " + (tempFilterTradeTypes.length === 0 ? "#111" : "#ccc"),
                                        background: tempFilterTradeTypes.length === 0 ? "#111" : "#ffffff",
                                        color: tempFilterTradeTypes.length === 0 ? "#ffffff" : "#333",
                                        fontWeight: tempFilterTradeTypes.length === 0 ? "bold" : "normal",
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                      }}
                                    >
                                      전체
                                    </button>
                                    
                                    {["매매", "전세", "월세", "단기"]
                                      .filter((type) => !(activeCategory === "원룸·투룸(풀옵션)" && type === "매매"))
                                      .map((type) => {
                                      const isSel = tempFilterTradeTypes.includes(type);
                                      return (
                                        <button
                                          key={type}
                                          onClick={() => {
                                            setTempFilterTradeTypes((prev) => {
                                              return prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type];
                                            });
                                          }}
                                          style={{
                                            padding: "6px 14px",
                                            borderRadius: 4,
                                            fontSize: 13,
                                            border: "1px solid " + (isSel ? "#111" : "#ccc"),
                                            background: isSel ? "#111" : "#ffffff",
                                            color: isSel ? "#ffffff" : "#333",
                                            fontWeight: isSel ? "bold" : "normal",
                                            cursor: "pointer",
                                            transition: "all 0.15s"
                                          }}
                                        >
                                          {type}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  
                                  <div style={{ height: "1px", background: "#e5e7eb", marginBottom: "20px" }} />
                                  
                                  {/* MAEMAE Price Range Slider */}
                                  {(tempFilterTradeTypes.length === 0 || tempFilterTradeTypes.includes("매매")) && (() => {
                                    const minIdx = getScaleIndex(tempMaemaeMin, MAEMAE_SCALE, false);
                                    const maxIdx = getScaleIndex(tempMaemaeMax, MAEMAE_SCALE, true);
                                    return (
                                      <div style={{ marginBottom: "24px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>매매가</span>
                                          <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                            {tempMaemaeMin === null && tempMaemaeMax === null 
                                              ? "전체" 
                                              : `${formatPriceLabel(tempMaemaeMin) || "0"} ~ ${formatPriceLabel(tempMaemaeMax) || "최대"}`}
                                          </span>
                                        </div>
                                        
                                        <div className="dual-slider-container">
                                          <div 
                                            className="dual-slider-track" 
                                            style={{ left: `${(minIdx / (MAEMAE_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (MAEMAE_SCALE.length - 1)) * 100}%` }} 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={MAEMAE_SCALE.length - 1} 
                                            value={minIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val <= maxIdx) {
                                                setTempMaemaeMin(val === 0 ? null : MAEMAE_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("maemae", "min", "면적")}
                                            onTouchEnd={() => handleSliderRelease("maemae", "min", "면적")}
                                            className="dual-slider-input" 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={MAEMAE_SCALE.length - 1} 
                                            value={maxIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val >= minIdx) {
                                                setTempMaemaeMax(val === MAEMAE_SCALE.length - 1 ? null : MAEMAE_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("maemae", "max", "면적")}
                                            onTouchEnd={() => handleSliderRelease("maemae", "max", "면적")}
                                            className="dual-slider-input" 
                                          />
                                        </div>
                                        
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>1억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>5억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>15억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  
                                  {/* DEPOSIT Price Range Slider */}
                                  {(tempFilterTradeTypes.length === 0 || tempFilterTradeTypes.includes("전세") || tempFilterTradeTypes.includes("월세") || tempFilterTradeTypes.includes("단기")) && (() => {
                                    const minIdx = getScaleIndex(tempDepositMin, DEPOSIT_SCALE, false);
                                    const maxIdx = getScaleIndex(tempDepositMax, DEPOSIT_SCALE, true);
                                    return (
                                      <div style={{ marginBottom: "24px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>보증금</span>
                                          <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                            {tempDepositMin === null && tempDepositMax === null 
                                              ? "전체" 
                                              : `${formatPriceLabel(tempDepositMin) || "0"} ~ ${formatPriceLabel(tempDepositMax) || "최대"}`}
                                          </span>
                                        </div>
                                        
                                        <div className="dual-slider-container">
                                          <div 
                                            className="dual-slider-track" 
                                            style={{ left: `${(minIdx / (DEPOSIT_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (DEPOSIT_SCALE.length - 1)) * 100}%` }} 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={DEPOSIT_SCALE.length - 1} 
                                            value={minIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val <= maxIdx) {
                                                setTempDepositMin(val === 0 ? null : DEPOSIT_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("deposit", "min", "면적")}
                                            onTouchEnd={() => handleSliderRelease("deposit", "min", "면적")}
                                            className="dual-slider-input" 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={DEPOSIT_SCALE.length - 1} 
                                            value={maxIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val >= minIdx) {
                                                setTempDepositMax(val === DEPOSIT_SCALE.length - 1 ? null : DEPOSIT_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("deposit", "max", "면적")}
                                            onTouchEnd={() => handleSliderRelease("deposit", "max", "면적")}
                                            className="dual-slider-input" 
                                          />
                                        </div>
                                        
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>5천만</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>10억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  
                                  {/* RENT Price Range Slider */}
                                  {(tempFilterTradeTypes.length === 0 || tempFilterTradeTypes.includes("월세") || tempFilterTradeTypes.includes("단기")) && (() => {
                                    const minIdx = getScaleIndex(tempRentMin, RENT_SCALE, false);
                                    const maxIdx = getScaleIndex(tempRentMax, RENT_SCALE, true);
                                    return (
                                      <div style={{ marginBottom: "12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>월세</span>
                                          <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                            {tempRentMin === null && tempRentMax === null 
                                              ? "전체" 
                                              : `${formatPriceLabel(tempRentMin) || "0"} ~ ${formatPriceLabel(tempRentMax) || "최대"}`}
                                          </span>
                                        </div>
                                        
                                        <div className="dual-slider-container">
                                          <div 
                                            className="dual-slider-track" 
                                            style={{ left: `${(minIdx / (RENT_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (RENT_SCALE.length - 1)) * 100}%` }} 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={RENT_SCALE.length - 1} 
                                            value={minIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val <= maxIdx) {
                                                setTempRentMin(val === 0 ? null : RENT_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("rent", "min", "면적")}
                                            onTouchEnd={() => handleSliderRelease("rent", "min", "면적")}
                                            className="dual-slider-input" 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={RENT_SCALE.length - 1} 
                                            value={maxIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val >= minIdx) {
                                                setTempRentMax(val === RENT_SCALE.length - 1 ? null : RENT_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("rent", "max", "면적")}
                                            onTouchEnd={() => handleSliderRelease("rent", "max", "면적")}
                                            className="dual-slider-input" 
                                          />
                                        </div>
                                        
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>20만</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>50만</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>150만</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                            </div>

                            {/* Section 2: 면적 */}
                            <div
                              id="section-면적"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "면적" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                                display: isAuctionMode ? "none" : "block",
                              }}
                            >
                              {(() => {
                                const pyeongMin = filterAreaMin ? Math.round(filterAreaMin / 3.3) : null;
                                const pyeongMax = filterAreaMax ? Math.round(filterAreaMax / 3.3) : null;
                                const minIdx = getScaleIndex(pyeongMin, AREA_SCALE, false);
                                const maxIdx = getScaleIndex(pyeongMax, AREA_SCALE, true);
                                return (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>면적</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {filterAreaMin === null && filterAreaMax === null 
                                          ? "전체" 
                                          : `${pyeongMin || "0"}평 ~ ${pyeongMax || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (AREA_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (AREA_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={AREA_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setFilterAreaMin(val === 0 ? null : AREA_SCALE[val] * 3.3);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("area", "min", "사용승인일")}
                                        onTouchEnd={() => handleSliderRelease("area", "min", "사용승인일")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={AREA_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setFilterAreaMax(val === AREA_SCALE.length - 1 ? null : AREA_SCALE[val] * 3.3);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("area", "max", "사용승인일")}
                                        onTouchEnd={() => handleSliderRelease("area", "max", "사용승인일")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>10평</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>40평</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>150평</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Section: 층수 */}
                            {getWizardTabs().includes("층수") && (
                              <div
                                id="section-층수"
                                style={{
                                  padding: "16px 12px",
                                  borderRadius: "8px",
                                  background: activeSection === "층수" ? "#f3f4f6" : "transparent",
                                  marginBottom: "16px",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              >
                                <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>층수</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                  {["전체", "지하", "1층", "2층", "3~5층", "6층이상"].map((fl) => {
                                    const isSel = filterFloor === fl || (!filterFloor && fl === "전체");
                                    return (
                                      <button
                                        key={fl}
                                        onClick={() => {
                                          setFilterFloor(fl === "전체" ? null : fl);
                                          setTimeout(() => {
                                            scrollToSection("관리비");
                                          }, 350);
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          border: "1px solid " + (isSel ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: isSel ? "#111" : "#fff",
                                          color: isSel ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {fl}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Section 3: 사용승인일 */}
                            {getWizardTabs().includes("사용승인일") && (
                            <div
                              id="section-사용승인일"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "사용승인일" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              {(() => {
                                const minIdx = getScaleIndex(filterYearMin, YEAR_SCALE, false);
                                const maxIdx = getScaleIndex(filterYearMax, YEAR_SCALE, true);
                                return (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>사용승인일</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {filterYearMin === null && filterYearMax === null 
                                          ? "전체" 
                                          : `${filterYearMin || "1960"}년 ~ ${filterYearMax || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (YEAR_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (YEAR_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={YEAR_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setFilterYearMin(val === 0 ? null : YEAR_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("year", "min", "세대수")}
                                        onTouchEnd={() => handleSliderRelease("year", "min", "세대수")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={YEAR_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setFilterYearMax(val === YEAR_SCALE.length - 1 ? null : YEAR_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("year", "max", "세대수")}
                                        onTouchEnd={() => handleSliderRelease("year", "max", "세대수")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>1990년</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2005년</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2020년</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            )}

                            {/* Section 4: 세대수 */}
                            {getWizardTabs().includes("세대수") && (
                            <div
                              id="section-세대수"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "세대수" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              {(() => {
                                const minIdx = getScaleIndex(filterUnitMin, UNIT_SCALE, false);
                                const maxIdx = getScaleIndex(filterUnitMax, UNIT_SCALE, true);
                                return (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>세대수</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {filterUnitMin === null && filterUnitMax === null 
                                          ? "전체" 
                                          : `${filterUnitMin || "0"}세대 ~ ${filterUnitMax || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (UNIT_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (UNIT_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={UNIT_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setFilterUnitMin(val === 0 ? null : UNIT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("unit", "min", "방/욕실수")}
                                        onTouchEnd={() => handleSliderRelease("unit", "min", "방/욕실수")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={UNIT_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setFilterUnitMax(val === UNIT_SCALE.length - 1 ? null : UNIT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("unit", "max", "방/욕실수")}
                                        onTouchEnd={() => handleSliderRelease("unit", "max", "방/욕실수")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>100세대</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>500세대</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2000세대</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            )}

                            {/* Section 5: 방/욕실수 */}
                            {getWizardTabs().includes("방/욕실수") && (
                            <div
                              id="section-방/욕실수"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "방/욕실수" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>방/욕실수</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div>
                                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>방 개수</div>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 2, 3, 4].map((num) => (
                                      <button
                                        key={num}
                                        onClick={() => {
                                          setFilterRoomCount(filterRoomCount === num ? null : num);
                                          setRoomBathInteractions((prev) => {
                                            const updated = { ...prev, room: true };
                                            if (updated.room && updated.bath) {
                                              setTimeout(() => {
                                                scrollToSection("방향");
                                              }, 500);
                                              return { room: false, bath: false };
                                            }
                                            return updated;
                                          });
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: "6px 0",
                                          border: "1px solid " + (filterRoomCount === num ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: filterRoomCount === num ? "#111" : "#fff",
                                          color: filterRoomCount === num ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {num}개+
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>욕실 개수</div>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 2, 3].map((num) => (
                                      <button
                                        key={num}
                                        onClick={() => {
                                          setFilterBathCount(filterBathCount === num ? null : num);
                                          setRoomBathInteractions((prev) => {
                                            const updated = { ...prev, bath: true };
                                            if (updated.room && updated.bath) {
                                              setTimeout(() => {
                                                scrollToSection("방향");
                                              }, 500);
                                              return { room: false, bath: false };
                                            }
                                            return updated;
                                          });
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: "6px 0",
                                          border: "1px solid " + (filterBathCount === num ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: filterBathCount === num ? "#111" : "#fff",
                                          color: filterBathCount === num ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {num}개+
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            )}

                            {/* Section 6: 방향 */}
                            {getWizardTabs().includes("방향") && (
                            <div
                              id="section-방향"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "방향" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>방향</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                                <button
                                  onClick={() => {
                                    setFilterDirection(null);
                                    setTimeout(() => {
                                      scrollToSection("등록자");
                                    }, 350);
                                  }}
                                  style={{
                                    gridColumn: "span 2",
                                    padding: "6px 0",
                                    border: "1px solid " + (filterDirection === null ? "#111" : "#eee"),
                                    borderRadius: 4,
                                    background: filterDirection === null ? "#111" : "#fff",
                                    color: filterDirection === null ? "#fff" : "#333",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    transition: "all 0.15s"
                                  }}
                                >
                                  전체
                                </button>
                                {["동향", "서향", "남향", "북향", "남동향", "남서향", "북동향", "북서향"].map((dir) => (
                                  <button
                                    key={dir}
                                    onClick={() => {
                                      setFilterDirection(filterDirection === dir ? null : dir);
                                      setTimeout(() => {
                                        scrollToSection("등록자");
                                      }, 350);
                                    }}
                                    style={{
                                      padding: "6px 0",
                                      border: "1px solid " + (filterDirection === dir ? "#111" : "#eee"),
                                      borderRadius: 4,
                                      background: filterDirection === dir ? "#e8f0fe" : "#fff",
                                      color: filterDirection === dir ? "#1a4282" : "#333",
                                      fontSize: 12,
                                      fontWeight: filterDirection === dir ? "bold" : "normal",
                                      cursor: "pointer",
                                      transition: "all 0.15s"
                                    }}
                                  >
                                    {dir}
                                  </button>
                                ))}
                              </div>
                            </div>
                            )}

                            {/* Section: 관리비 */}
                            {getWizardTabs().includes("관리비") && (
                              <div
                                id="section-관리비"
                                style={{
                                  padding: "16px 12px",
                                  borderRadius: "8px",
                                  background: activeSection === "관리비" ? "#f3f4f6" : "transparent",
                                  marginBottom: "16px",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              >
                                <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>관리비</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                  {MAINT_PRESETS.map((m, idx) => {
                                    const isSel = filterMaintIdx === idx;
                                    return (
                                      <button
                                        key={m.label}
                                        onClick={() => {
                                          setFilterMaintIdx(idx);
                                          setTimeout(() => {
                                            scrollToSection("기타옵션");
                                          }, 350);
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          border: "1px solid " + (isSel ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: isSel ? "#111" : "#fff",
                                          color: isSel ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {m.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Section: 주차 */}
                            {getWizardTabs().includes("주차") && (
                              <div
                                id="section-주차"
                                style={{
                                  padding: "16px 12px",
                                  borderRadius: "8px",
                                  background: activeSection === "주차" ? "#f3f4f6" : "transparent",
                                  marginBottom: "16px",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              >
                                <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>주차가능 여부</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                                  <button
                                    onClick={() => {
                                      setFilterParking(null);
                                      setTimeout(() => {
                                        scrollToSection("기타옵션");
                                      }, 350);
                                    }}
                                    style={{
                                      gridColumn: "span 3",
                                      padding: "6px 0",
                                      border: "1px solid " + (filterParking === null ? "#111" : "#eee"),
                                      borderRadius: 4,
                                      background: filterParking === null ? "#111" : "#fff",
                                      color: filterParking === null ? "#fff" : "#333",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                      cursor: "pointer",
                                      transition: "all 0.15s"
                                    }}
                                  >
                                    전체
                                  </button>
                                  {["없음", "1대", "2대", "3대", "4대", "5대이상"].map((p) => (
                                    <button
                                      key={p}
                                      onClick={() => {
                                        setFilterParking(filterParking === p ? null : p);
                                        setTimeout(() => {
                                          scrollToSection("기타옵션");
                                        }, 350);
                                      }}
                                      style={{
                                        padding: "6px 0",
                                        border: "1px solid " + (filterParking === p ? "#111" : "#eee"),
                                        borderRadius: 4,
                                        background: filterParking === p ? "#e8f0fe" : "#fff",
                                        color: filterParking === p ? "#1a4282" : "#333",
                                        fontSize: 12,
                                        fontWeight: filterParking === p ? "bold" : "normal",
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                      }}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Section: 기타옵션 */}
                            {getWizardTabs().includes("기타옵션") && (
                              <div
                                id="section-기타옵션"
                                style={{
                                  padding: "16px 12px",
                                  borderRadius: "8px",
                                  background: activeSection === "기타옵션" ? "#f3f4f6" : "transparent",
                                  marginBottom: "16px",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              >
                                <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>기타옵션</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                                  {(() => {
                                    const opts = new Set<string>();
                                    const isEmpty = activePills.length === 0;

                                    if (activeCategory === "apart") {
                                      return ["시스템에어컨", "세탁기", "건조기", "빌트인냉장고", "식기세척기", "인덕션", "붙박이장", "침대", "TV", "비데", "도어락", "무인택배함"];
                                    }
                                    if (activeCategory === "one") {
                                      return ["에어컨", "세탁기", "냉장고", "가스레인지/인덕션", "전자레인지", "침대", "옷장", "책상", "신발장", "도어락"];
                                    }
                                    if (activeCategory === "villa") {
                                      return ["에어컨", "세탁기", "냉장고", "가스레인지/인덕션", "전자레인지", "침대", "옷장", "책상", "신발장", "도어락", "무인택배함", "CCTV", "엘리베이터"];
                                    }
                                    if (activeCategory === "biz") {
                                      if (isEmpty || activePills.includes("상가")) ["천장형에어컨", "내부화장실", "탕비실", "엘리베이터", "개별난방", "테라스", "주차가능", "창고", "환풍시설"].forEach(o => opts.add(o));
                                      if (isEmpty || activePills.includes("사무실") || activePills.includes("건물/빌딩")) ["시스템에어컨", "개별난방", "엘리베이터", "내부화장실", "탕비실", "휴게공간", "주차편리", "보안시스템", "회의실"].forEach(o => opts.add(o));
                                      if (isEmpty || activePills.includes("공장/창고") || activePills.includes("지식산업센터") || activePills.includes("토지")) ["호이스트", "화물엘리베이터", "동력넉넉", "높은층고(5m이상)", "마당넓음", "대형차량진입", "사무동있음", "기숙사", "크린룸"].forEach(o => opts.add(o));
                                      return Array.from(opts);
                                    }
                                    return ["주차가능", "엘리베이터"];
                                  })().map((opt) => {
                                    const isSel = filterOptions.includes(opt);
                                    return (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          setFilterOptions((prev) =>
                                            isSel ? prev.filter((x) => x !== opt) : [...prev, opt]
                                          );
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          border: "1px solid " + (isSel ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: isSel ? "#111" : "#fff",
                                          color: isSel ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* ═══ 경매 전용 필터 섹션들 ═══ */}
                            {isAuctionMode && (
                              <>
                                {/* 감정가 범위 */}
                                <div
                                  id="section-감정가"
                                  style={{
                                    padding: "16px 12px",
                                    borderRadius: "8px",
                                    background: activeSection === "감정가" ? "#f3f4f6" : "transparent",
                                    marginBottom: "16px",
                                    transition: "all 0.2s ease-in-out",
                                  }}
                                >
                                  {(() => {
                                    const minIdx = getScaleIndex(filterAuctionAppraisalMin, MAEMAE_SCALE, false);
                                    const maxIdx = getScaleIndex(filterAuctionAppraisalMax, MAEMAE_SCALE, true);
                                    return (
                                      <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>감정가</span>
                                          <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                            {filterAuctionAppraisalMin === null && filterAuctionAppraisalMax === null 
                                              ? "전체" 
                                              : `${formatPriceLabel(filterAuctionAppraisalMin) || "0"} ~ ${formatPriceLabel(filterAuctionAppraisalMax) || "최대"}`}
                                          </span>
                                        </div>
                                        
                                        <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                          <div 
                                            className="dual-slider-track" 
                                            style={{ left: `${(minIdx / (MAEMAE_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (MAEMAE_SCALE.length - 1)) * 100}%` }} 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={MAEMAE_SCALE.length - 1} 
                                            value={minIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val <= maxIdx) {
                                                setFilterAuctionAppraisalMin(val === 0 ? null : MAEMAE_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("appraisal", "min", "최저입찰가")}
                                            onTouchEnd={() => handleSliderRelease("appraisal", "min", "최저입찰가")}
                                            className="dual-slider-input" 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={MAEMAE_SCALE.length - 1} 
                                            value={maxIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val >= minIdx) {
                                                setFilterAuctionAppraisalMax(val === MAEMAE_SCALE.length - 1 ? null : MAEMAE_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("appraisal", "max", "최저입찰가")}
                                            onTouchEnd={() => handleSliderRelease("appraisal", "max", "최저입찰가")}
                                            className="dual-slider-input" 
                                          />
                                        </div>
                                        
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>1억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>5억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>15억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* 최저입찰가 범위 */}
                                <div
                                  id="section-최저입찰가"
                                  style={{
                                    padding: "16px 12px",
                                    borderRadius: "8px",
                                    background: activeSection === "최저입찰가" ? "#f3f4f6" : "transparent",
                                    marginBottom: "16px",
                                    transition: "all 0.2s ease-in-out",
                                  }}
                                >
                                  {(() => {
                                    const minIdx = getScaleIndex(filterAuctionBidPriceMin, MAEMAE_SCALE, false);
                                    const maxIdx = getScaleIndex(filterAuctionBidPriceMax, MAEMAE_SCALE, true);
                                    return (
                                      <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>최저입찰가</span>
                                          <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                            {filterAuctionBidPriceMin === null && filterAuctionBidPriceMax === null 
                                              ? "전체" 
                                              : `${formatPriceLabel(filterAuctionBidPriceMin) || "0"} ~ ${formatPriceLabel(filterAuctionBidPriceMax) || "최대"}`}
                                          </span>
                                        </div>
                                        
                                        <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                          <div 
                                            className="dual-slider-track" 
                                            style={{ left: `${(minIdx / (MAEMAE_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (MAEMAE_SCALE.length - 1)) * 100}%` }} 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={MAEMAE_SCALE.length - 1} 
                                            value={minIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val <= maxIdx) {
                                                setFilterAuctionBidPriceMin(val === 0 ? null : MAEMAE_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("bidprice", "min", "할인율")}
                                            onTouchEnd={() => handleSliderRelease("bidprice", "min", "할인율")}
                                            className="dual-slider-input" 
                                          />
                                          <input 
                                            type="range" 
                                            min={0} 
                                            max={MAEMAE_SCALE.length - 1} 
                                            value={maxIdx} 
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              if (val >= minIdx) {
                                                setFilterAuctionBidPriceMax(val === MAEMAE_SCALE.length - 1 ? null : MAEMAE_SCALE[val]);
                                              }
                                            }} 
                                            onMouseUp={() => handleSliderRelease("bidprice", "max", "할인율")}
                                            onTouchEnd={() => handleSliderRelease("bidprice", "max", "할인율")}
                                            className="dual-slider-input" 
                                          />
                                        </div>
                                        
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>1억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>5억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>15억</span>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* 할인율 */}
                                <div
                                  id="section-할인율"
                                  style={{
                                    padding: "16px 12px",
                                    borderRadius: "8px",
                                    background: activeSection === "할인율" ? "#f3f4f6" : "transparent",
                                    marginBottom: "16px",
                                    transition: "all 0.2s ease-in-out",
                                  }}
                                >
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>할인율 (감정가 대비)</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {[
                                      { label: "전체", val: 0 },
                                      { label: "▼10%↑", val: 10 },
                                      { label: "▼20%↑", val: 20 },
                                      { label: "▼30%↑", val: 30 },
                                      { label: "▼50%↑", val: 50 },
                                    ].map((item) => {
                                      const isSelected = filterAuctionDiscount === item.val;
                                      return (
                                        <button
                                          key={item.label}
                                          onClick={() => setFilterAuctionDiscount(item.val)}
                                          style={{
                                            padding: "6px 12px",
                                            border: "1px solid " + (isSelected ? "#e74c3c" : "#eee"),
                                            borderRadius: 20,
                                            background: isSelected ? "#e74c3c" : "#fff",
                                            color: isSelected ? "#fff" : "#333",
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            transition: "all 0.15s"
                                          }}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 유찰 횟수 */}
                                <div
                                  id="section-유찰횟수"
                                  style={{
                                    padding: "16px 12px",
                                    borderRadius: "8px",
                                    background: activeSection === "유찰횟수" ? "#f3f4f6" : "transparent",
                                    marginBottom: "16px",
                                    transition: "all 0.2s ease-in-out",
                                  }}
                                >
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>유찰 횟수</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {[
                                      { label: "전체", val: "all" },
                                      { label: "0회 (신건)", val: "0" },
                                      { label: "1회", val: "1" },
                                      { label: "2회", val: "2" },
                                      { label: "3회", val: "3" },
                                      { label: "4회 이상", val: "4+" },
                                    ].map((item) => {
                                      const isSelected = item.val === "all"
                                        ? (filterAuctionBidCount === "all" || filterAuctionBidCount === 0 || !filterAuctionBidCount)
                                        : (String(filterAuctionBidCount) === item.val || filterAuctionBidCount === Number(item.val));
                                      return (
                                        <button
                                          key={item.label}
                                          onClick={() => setFilterAuctionBidCount(item.val)}
                                          style={{
                                            padding: "6px 12px",
                                            border: "1px solid " + (isSelected ? "#111" : "#eee"),
                                            borderRadius: 20,
                                            background: isSelected ? "#111" : "#fff",
                                            color: isSelected ? "#fff" : "#333",
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            transition: "all 0.15s"
                                          }}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 입찰일 */}
                                <div
                                  id="section-입찰일"
                                  style={{
                                    padding: "16px 12px",
                                    borderRadius: "8px",
                                    background: activeSection === "입찰일" ? "#f3f4f6" : "transparent",
                                    marginBottom: "16px",
                                    transition: "all 0.2s ease-in-out",
                                  }}
                                >
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>입찰 시작일</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {[
                                      { label: "전체", val: "all" },
                                      { label: "1주 이내", val: "1w" },
                                      { label: "2주 이내", val: "2w" },
                                      { label: "1달 이내", val: "1m" },
                                      { label: "1~3개월", val: "1_3m" },
                                      { label: "3개월 이후", val: "over_3m" },
                                    ].map((item) => {
                                      const isSelected = filterAuctionStartDate === item.val;
                                      return (
                                        <button
                                          key={item.label}
                                          onClick={() => setFilterAuctionStartDate(item.val)}
                                          style={{
                                            padding: "6px 12px",
                                            border: "1px solid " + (isSelected ? "#111" : "#eee"),
                                            borderRadius: 20,
                                            background: isSelected ? "#111" : "#fff",
                                            color: isSelected ? "#fff" : "#333",
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            transition: "all 0.15s"
                                          }}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Section 7: 등록자 (경공매 모드에서는 숨김 - 위에 전용 필터 사용) */}
                            <div
                              id="section-등록자"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "등록자" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                                display: isAuctionMode ? "none" : "block",
                              }}
                            >
                              {isAuctionMode ? (
                                <>
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>유찰 횟수</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {[
                                      { label: "전체", val: 0 },
                                      { label: "1회 이상 유찰", val: 1 },
                                      { label: "2회 이상 유찰", val: 2 },
                                      { label: "3회 이상 유찰", val: 3 },
                                    ].map((item) => {
                                      const isSelected = (() => {
                                        if (filterAuctionBidCount === 0) return item.val === 0;
                                        if (item.val === 0) return false;
                                        if (filterAuctionBidCount === 1) {
                                          return item.val === 1 || item.val === 2 || item.val === 3;
                                        }
                                        if (filterAuctionBidCount === 2) {
                                          return item.val === 2 || item.val === 3;
                                        }
                                        if (filterAuctionBidCount === 3) {
                                          return item.val === 3;
                                        }
                                        return filterAuctionBidCount === item.val;
                                      })();
                                      return (
                                        <button
                                          key={item.label}
                                          onClick={() => {
                                            setFilterAuctionBidCount(item.val);
                                            setTimeout(() => {
                                              scrollToSection("중개보수");
                                            }, 350);
                                          }}
                                          style={{
                                            padding: "8px 12px",
                                            border: "1px solid " + (isSelected ? "#111" : "#eee"),
                                            borderRadius: 4,
                                            background: isSelected ? "#111" : "#fff",
                                            color: isSelected ? "#fff" : "#333",
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "all 0.15s"
                                          }}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>등록자</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {[
                                      { label: "전체", val: null },
                                      { label: "중개사", val: "REALTOR" },
                                      { label: "임대인", val: "OWNER" },
                                    ].map((item) => (
                                      <button
                                        key={item.label}
                                        onClick={() => {
                                          setFilterOwnerRole(item.val);
                                          setTimeout(() => {
                                            scrollToSection("중개보수");
                                          }, 350);
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          border: "1px solid " + (filterOwnerRole === item.val ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: filterOwnerRole === item.val ? "#111" : "#fff",
                                          color: filterOwnerRole === item.val ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          textAlign: "left",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Section 8: 중개보수 (경공매 모드에서는 입찰시작일로 대체) */}
                            <div
                              id="section-중개보수"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "중개보수" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                                display: isAuctionMode ? "none" : "block",
                              }}
                            >
                              {isAuctionMode ? (
                                <>
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>입찰시작일</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {[
                                      { label: "전체", val: "all" },
                                      { label: "1주이내", val: "1w" },
                                      { label: "2주이내", val: "2w" },
                                      { label: "1달이내", val: "1m" },
                                      { label: "1~3개월", val: "1_3m" },
                                      { label: "3개월이후", val: "over_3m" },
                                    ].map((item) => {
                                      const isSelected = filterAuctionStartDate === item.val;
                                      return (
                                        <button
                                          key={item.label}
                                          onClick={() => {
                                            setFilterAuctionStartDate(item.val);
                                            setTimeout(() => {
                                              scrollToSection("테마");
                                            }, 350);
                                          }}
                                          style={{
                                            padding: "8px 12px",
                                            border: "1px solid " + (isSelected ? "#111" : "#eee"),
                                            borderRadius: 4,
                                            background: isSelected ? "#111" : "#fff",
                                            color: isSelected ? "#fff" : "#333",
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "all 0.15s"
                                          }}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>중개보수</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {[
                                      { label: "전체", val: null },
                                      { label: "공동중개 가능", val: "공동중개" },
                                      { label: "수수료 25%이상", val: "25" },
                                      { label: "수수료 50%이상", val: "50" },
                                      { label: "수수료 100%(법정가)", val: "100" },
                                    ].map((item) => {
                                      const isSelected = (() => {
                                        if (filterCommissionType === null) return item.val === null;
                                        if (item.val === null) return false;
                                        if (filterCommissionType === "공동중개") {
                                          return item.val === "공동중개" || item.val === "25" || item.val === "50" || item.val === "100";
                                        }
                                        if (filterCommissionType === "25") {
                                          return item.val === "25" || item.val === "50" || item.val === "100";
                                        }
                                        if (filterCommissionType === "50") {
                                          return item.val === "50" || item.val === "100";
                                        }
                                        if (filterCommissionType === "100") {
                                          return item.val === "100";
                                        }
                                        return filterCommissionType === item.val;
                                      })();
                                      return (
                                        <button
                                          key={item.label}
                                          onClick={() => {
                                            setFilterCommissionType(item.val);
                                            setTimeout(() => {
                                              scrollToSection("테마");
                                            }, 350);
                                          }}
                                          style={{
                                            padding: "8px 12px",
                                            border: "1px solid " + (isSelected ? "#111" : "#eee"),
                                            borderRadius: 4,
                                            background: isSelected ? "#111" : "#fff",
                                            color: isSelected ? "#fff" : "#333",
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "all 0.15s"
                                          }}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Section 9: 테마 */}
                            <div
                              id="section-테마"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "테마" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>테마</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                                {getThemesByCategory(activeCategory).map((t) => {
                                  const isThemeSelected = filterThemes.includes(t);
                                  return (
                                    <button
                                      key={t}
                                      onClick={() => {
                                        setFilterThemes((prev) =>
                                          isThemeSelected ? prev.filter((x) => x !== t) : [...prev, t]
                                        );
                                        setTimeout(() => {
                                          scrollToSection("적용하기");
                                        }, 500);
                                      }}
                                      style={{
                                        padding: "8px 0",
                                        border: "1px solid " + (isThemeSelected ? "#111" : "#eee"),
                                        borderRadius: 4,
                                        background: isThemeSelected ? "#111" : "#fff",
                                        color: isThemeSelected ? "#fff" : "#333",
                                        fontSize: 12,
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                      }}
                                    >
                                      #{t}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          


                          {/* Bottom Action buttons */}
                          <div style={{ display: "flex", gap: "10px", borderTop: "1px solid #f3f4f6", paddingTop: "15px", background: "#ffffff" }}>
                            <button
                              onClick={() => {
                                // Reset all temporary wizard states
                                setTempFilterTradeTypes([]);
                                setTempMaemaeMin(null);
                                setTempMaemaeMax(null);
                                setTempDepositMin(null);
                                setTempDepositMax(null);
                                setTempRentMin(null);
                                setTempRentMax(null);
                                setPopoverSearchKeyword("");
                                setFilterSearchKeyword("");
                                setActiveSection("거래유형");

                                // Reset all permanent filter states
                                setFilterTradeTypes([]);
                                setFilterPriceMin(null);
                                setFilterPriceMax(null);
                                setFilterAreaMin(null);
                                setFilterAreaMax(null);
                                setFilterMaintIdx(0);
                                setFilterRoomCount(null);
                                setFilterBathCount(null);
                                setFilterDirection(null);
                                setFilterParking(null);
                                setFilterYearMin(null);
                                setFilterYearMax(null);
                                setFilterUnitMin(null);
                                setFilterUnitMax(null);
                                setFilterFloor(null);
                                setFilterSaleStage([]);
                                setFilterSaleType([]);
                                setFilterOptions([]);
                                setFilterOwnerRole(null);
                                setFilterCommissionType(null);
                                setFilterThemes([]);
                                setAppliedMaemaeMin(null);
                                setAppliedMaemaeMax(null);
                                setAppliedDepositMin(null);
                                setAppliedDepositMax(null);
                                setAppliedRentMin(null);
                                setAppliedRentMax(null);
                                setFilterAuctionDiscount(0);
                                setFilterAuctionBidCount("all");
                                setFilterAuctionStartDate("all");
                                setFilterAuctionAppraisalMin(null);
                                setFilterAuctionAppraisalMax(null);
                                setFilterAuctionBidPriceMin(null);
                                setFilterAuctionBidPriceMax(null);
                              }}
                              style={{
                                flex: 1,
                                padding: "9px 0",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontSize: "13px",
                                color: "#4b5563",
                                background: "#ffffff",
                                cursor: "pointer",
                                fontWeight: "bold",
                                transition: "all 0.15s"
                              }}
                            >
                              초기화
                            </button>
                            <button
                              onClick={() => {
                                setFilterTradeTypes(tempFilterTradeTypes);
                                setAppliedMaemaeMin(tempMaemaeMin);
                                setAppliedMaemaeMax(tempMaemaeMax);
                                setAppliedDepositMin(tempDepositMin);
                                setAppliedDepositMax(tempDepositMax);
                                setAppliedRentMin(tempRentMin);
                                setAppliedRentMax(tempRentMax);
                                setActiveFilterDropdown(null);
                                setIsFilterCollapsed(true);
                                setIsWizardOpen(false); // Add this line to close the wizard
                              }}
                              style={{
                                flex: 2,
                                padding: "9px 0",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "13px",
                                color: "#ffffff",
                                background: "#1a4282", /* Premium Corporate Deep Navy */
                                cursor: "pointer",
                                fontWeight: "bold",
                                transition: "all 0.15s"
                              }}
                            >
                              적용하기
                            </button>
                          </div>
                    </div>
                  )}
    </div>
      )}
    </div>
  );
}

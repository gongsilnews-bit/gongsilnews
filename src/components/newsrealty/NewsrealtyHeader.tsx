"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NewsrealtyHeaderProps {
  onOpenGuide?: () => void;
}

export default function NewsrealtyHeader({ onOpenGuide }: NewsrealtyHeaderProps) {
  const pathname = usePathname();
  const [internalGuideOpen, setInternalGuideOpen] = useState(false);

  const handleGuideClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      setInternalGuideOpen(true);
    }
  };

  const isHomeActive = pathname === "/newsrealty";
  const isApplyActive = pathname === "/newsrealty/apply";

  return (
    <>
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #eaedf0",
          height: "60px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            maxWidth: "1060px",
            margin: "0 auto",
            height: "100%",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* ━━━ 좌측 로고 영역 ━━━ */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Link
              href="/"
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#111827",
                textDecoration: "none",
                letterSpacing: "-0.5px",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="공실뉴스 메인 포털 홈으로"
            >
              공실뉴스
            </Link>
            <span
              style={{
                fontSize: "15px",
                color: "#cbd5e1",
                fontWeight: 300,
                margin: "0 4px",
                userSelect: "none",
              }}
            >
              |
            </span>
            <Link
              href="/newsrealty"
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#fa8258",
                textDecoration: "none",
                letterSpacing: "-0.5px",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="공실뉴스부동산 홈으로"
            >
              공실뉴스부동산
            </Link>
          </div>

          {/* ━━━ 우측 내비게이션 메뉴 (홈 / 신청 / 이용안내) ━━━ */}
          <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Link
              href="/newsrealty"
              style={{
                fontSize: "14px",
                fontWeight: isHomeActive ? 800 : 600,
                color: isHomeActive ? "#fa8258" : "#475569",
                textDecoration: "none",
                transition: "color 0.15s ease",
                position: "relative",
                padding: "6px 0",
              }}
            >
              홈
              {isHomeActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "#fa8258",
                    borderRadius: "2px",
                  }}
                />
              )}
            </Link>

            <Link
              href="/newsrealty/apply"
              style={{
                fontSize: "14px",
                fontWeight: isApplyActive ? 800 : 600,
                color: isApplyActive ? "#fa8258" : "#475569",
                textDecoration: "none",
                transition: "color 0.15s ease",
                position: "relative",
                padding: "6px 0",
              }}
            >
              신청
              {isApplyActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "#fa8258",
                    borderRadius: "2px",
                  }}
                />
              )}
            </Link>

            <button
              type="button"
              onClick={handleGuideClick}
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#475569",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 0",
                fontFamily: "inherit",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fa8258")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            >
              이용안내
            </button>
          </nav>
        </div>
      </header>

      {/* ━━━ 기본 이용안내 가이드 모달 (onOpenGuide 없을 때 자체 팝업) ━━━ */}
      {internalGuideOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setInternalGuideOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              padding: "36px 32px 32px 32px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setInternalGuideOpen(false)}
              style={{
                position: "absolute",
                top: "22px",
                right: "22px",
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {/* 타이틀 */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "inline-block",
                  background: "#fff2e8",
                  color: "#ea580c",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: "14px",
                  marginBottom: "10px",
                }}
              >
                공실뉴스부동산 입점 안내
              </div>
              <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                회원가입 및 이용 절차 안내
              </h3>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                공실뉴스부동산 파트너 입점은 아래 4단계를 거쳐 신속하게 진행됩니다.
              </p>
            </div>

            {/* 4단계 스텝 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* 1단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#fa8258", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>1단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>회원가입 및 중개업소 등록</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• 공실뉴스 포털에서 기본 <strong>부동산 회원가입</strong>을 진행합니다.</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 대표 공인중개사 정보 및 소속 중개업소 기본 정보를 등록합니다.</p>
                </div>
              </div>

              {/* 2단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#fa8258", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>2단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>신청하기</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• <strong>로그인 상태</strong>에서 공실뉴스부동산 파트너 입점 신청서를 제출합니다.</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 신청자 성함, 연락처, 사무소 명칭을 확인하고 약관 동의 후 원클릭 접수</p>
                </div>
              </div>

              {/* 3단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#fa8258", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>3단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>1~2일 내 담당자 확인 및 승인</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• 담당 매니저가 관할 지역 중개사무소 정보 확인 및 유선 확인을 진행합니다.</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 입점 승인이 완료되면 즉시 알림 문자(SMS) 및 권한이 자동 부여됩니다.</p>
                </div>
              </div>

              {/* 4단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#fa8258", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>4단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>로컬기자 활동 및 마케팅 시작</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• <strong>매월 공실 매물 20건</strong> 등록 및 <strong>뉴스 보도기사 4건</strong> 발행 시작</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• AI 원클릭 블로그/유튜브 쇼츠 제작기 활용 및 관할 지역 로컬기자 혜택을 누리세요.</p>
                </div>
              </div>
            </div>

            {/* 하단 닫기 버튼 */}
            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setInternalGuideOpen(false)}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  backgroundColor: "#fa8258",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 800,
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(250, 130, 88, 0.25)",
                }}
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

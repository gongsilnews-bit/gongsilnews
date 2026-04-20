import React from "react";
import Link from "next/link";

export default function Footer() {
  const linkStyle: React.CSSProperties = {
    color: "#555", fontSize: 13, textDecoration: "none", fontWeight: 500,
    transition: "color 0.15s",
  };
  const boldLinkStyle: React.CSSProperties = { ...linkStyle, color: "#111", fontWeight: 700 };
  const divider = <span style={{ color: "#d1d5db", margin: "0 10px", fontSize: 11, userSelect: "none" }}>|</span>;

  return (
    <footer style={{ borderTop: "1px solid #e5e7eb", background: "#fff", fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif" }}>
      {/* ── 상단 내비게이션 링크 ── */}
      <div style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
            <Link href="#" style={linkStyle}>회사소개</Link>
            {divider}
            <Link href="#" style={linkStyle}>광고안내</Link>
            {divider}
            <Link href="#" style={linkStyle}>제휴문의</Link>
            {divider}
            <Link href="/terms" style={linkStyle}>이용약관</Link>
            {divider}
            <Link href="#" style={boldLinkStyle}>개인정보 처리방침</Link>
            {divider}
            <Link href="/youth-policy" style={linkStyle}>청소년 보호정책</Link>
            {divider}
            <Link href="#" style={linkStyle}>고충처리</Link>
          </div>
          {/* 우측 파트너 로고/링크 (선택) */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>DATA PARTNER</span>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 600, padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 4 }}>공공데이터포털</span>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 600, padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 4 }}>국토교통부</span>
          </div>
        </div>
      </div>

      {/* ── 하단 회사 정보 ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 20px", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* 로고 */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#111", letterSpacing: -1, lineHeight: 1.2 }}>
            공실뉴스
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 2, letterSpacing: -0.3 }}>GONGSIL NEWS</div>
        </div>

        {/* 회사 정보 */}
        <div style={{ flex: 1, minWidth: 300, fontSize: 12, color: "#888", lineHeight: 1.8, letterSpacing: -0.2 }}>
          <div>
            주소 : 서울특별시 강남구 강남대로 123
            <span style={{ color: "#d1d5db", margin: "0 8px" }}>|</span>
            전화 : 02-1234-5678
            <span style={{ color: "#d1d5db", margin: "0 8px" }}>|</span>
            등록번호 : 서울 아 01234
            <span style={{ color: "#d1d5db", margin: "0 8px" }}>|</span>
            등록일자 : 2026.01.01
          </div>
          <div>
            사업자등록 : 123-45-67890
            <span style={{ color: "#d1d5db", margin: "0 8px" }}>|</span>
            사업자정보확인
            <span style={{ color: "#d1d5db", margin: "0 8px" }}>|</span>
            통신판매업신고번호 : 2026-서울강남-1234
          </div>
          <div>
            대표이사 : 능산이
            <span style={{ color: "#d1d5db", margin: "0 8px" }}>|</span>
            발행인 · 편집인 : 능산이
            <span style={{ color: "#d1d5db", margin: "0 8px" }}>|</span>
            고객센터 : 1588-1234 (평일 10:00~18:00)
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#aaa", lineHeight: 1.6 }}>
            공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단 전재, 복사, 배포 등을 금합니다.(저작권 문의는 별도 안내)
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#bbb" }}>
            Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

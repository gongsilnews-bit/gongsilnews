"use client";

import React from "react";
import Link from "next/link";
import { openChannelTalk } from "@/utils/channelTalk";

/**
 * 공실마케팅 풋터 (/marketing 아래 모든 페이지, 2026-10-26 사장님)
 * 위: 공실마케팅 아이콘 + 주요 기능 5칸(펼침 판과 같은 목록) + 고객지원 · 회사
 * 아래: 회사 정보 — 사이트 풋터(src/components/Footer.tsx)와 같은 실제 값만 (인터넷신문 등록번호 · 제호 · 편집인처럼 뉴스 전용 줄은 뺐다)
 */
const BG = "#1f1714";
const DIM = "rgba(255,255,255,0.6)";


export default function StudioFooter() {
  return (
    <footer style={{ background: BG, color: "#fff", fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", wordBreak: "keep-all" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 40px" }}>
        {/* 위쪽 로고·문구·무료로 시작하기·고객지원 칸은 뺐다 (2026-11-09 사장님) — 회사 정보만 */}
        {/* 아래 줄: 약관 · 회사 정보 */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
          <Link href="/" style={{ color: "#fff", fontWeight: 700, textDecoration: "none" }}>공실뉴스</Link>
          <Link href="/about" style={{ color: DIM, textDecoration: "none" }}>회사소개</Link>
          <Link href="/terms" style={{ color: DIM, textDecoration: "none" }}>이용약관</Link>
          <Link href="/com/privacy.html" style={{ color: "#fff", fontWeight: 700, textDecoration: "none" }}>개인정보 처리방침</Link>
        </div>
        <div style={{ marginTop: 16, fontSize: 12.5, lineHeight: 1.9, color: DIM }}>
          <div>법인명 : (주)공실마케팅 · 대표자 : 김윤경 · 사업자등록번호 : 337-81-03010</div>
          <div>주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동) · 이메일 : master@gongsilnews.com</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <span>고객센터 : <strong style={{ color: "#fff" }}>1555-5343</strong> (평일 10:00~17:00)</span>
            <button type="button" onClick={() => openChannelTalk()} style={{ padding: "4px 11px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>실시간 상담</button>
          </div>
          <div style={{ marginTop: 10 }}>Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.</div>
        </div>
      </div>
    </footer>
  );
}

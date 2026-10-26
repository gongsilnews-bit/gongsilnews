"use client";

import React from "react";
import Link from "next/link";
import { openChannelTalk } from "@/utils/channelTalk";
import { FEATURE_GROUPS, featureBySlug } from "@/components/studio-site/studioFeatures";

/**
 * 공실스튜디오 풋터 (/studio 아래 모든 페이지, 2026-10-26 사장님)
 * 위: 공실스튜디오 아이콘 + 주요 기능 5칸(펼침 판과 같은 목록) + 고객지원 · 회사
 * 아래: 회사 정보 — 사이트 풋터(src/components/Footer.tsx)와 같은 실제 값만 (인터넷신문 등록번호 · 제호 · 편집인처럼 뉴스 전용 줄은 뺐다)
 */
const BG = "#1f1714";
const DIM = "rgba(255,255,255,0.6)";

const link: React.CSSProperties = { display: "block", padding: "5px 0", fontSize: 14, color: "rgba(255,255,255,0.82)", textDecoration: "none" };
const head: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: DIM, marginBottom: 12 };

export default function StudioFooter() {
  return (
    <footer style={{ background: BG, color: "#fff", fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", wordBreak: "keep-all" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px 40px" }}>
        <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
          {/* 브랜드 */}
          <div style={{ minWidth: 200 }}>
            <Link href="/studio" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/studio-app-icon.png" alt="" style={{ width: 36, height: 36, borderRadius: 8 }} />
              <span style={{ fontSize: 20, fontWeight: 900 }}>공실스튜디오</span>
            </Link>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: DIM, margin: "14px 0 18px" }}>공실만 등록하면<br />뉴스 · 블로그 · SNS · 영상까지</p>
            <Link href="/studio#download" style={{ display: "inline-flex", padding: "9px 16px", borderRadius: 8, background: "#e8890c", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>앱 받기</Link>
          </div>

          {/* 주요 기능 */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${FEATURE_GROUPS.length + 1}, minmax(120px, 1fr))`, gap: 24 }}>
            {FEATURE_GROUPS.map((g) => (
              <div key={g.name}>
                <div style={head}>{g.name}</div>
                {g.slugs.map((sl) => {
                  const f = featureBySlug(sl);
                  return f ? <Link key={sl} href={`/studio/feature/${sl}`} style={link}>{f.name}</Link> : null;
                })}
              </div>
            ))}
            <div>
              <div style={head}>고객지원</div>
              <Link href="/studio/guide" style={link}>사용법 배우기</Link>
              <Link href="/studio/pricing" style={link}>금액안내</Link>
              <Link href="/studio/resources" style={link}>자료실</Link>
              <Link href="/studio/community" style={link}>커뮤니티</Link>
              <Link href="/help" style={link}>고객센터</Link>
            </div>
          </div>
        </div>

        {/* 아래 줄: 약관 · 회사 정보 */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
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

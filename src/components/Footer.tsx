"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif" }}>
      <style>{`
        /* ── 사이트맵 스타일 ── */
        .pc-sitemap { display: none; background: #fafafa; padding: 40px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
        @media (min-width: 768px) {
          .pc-sitemap { display: block !important; }
        }
        .sitemap-col { display: flex; flex-direction: column; gap: 10px; }
        .sitemap-title { font-size: 16px; font-weight: 800; color: #111; margin-bottom: 12px; }
        .sitemap-link { font-size: 15px; color: #555; text-decoration: none; transition: color 0.15s; letter-spacing: -0.3px; }
        .sitemap-link:hover { color: #2563eb; font-weight: 700; }

        /* ── 다크 테마 하단 푸터 스타일 ── */
        .contact-footer {
          background: #1e293b;
          color: #fff;
          padding: 60px 20px;
        }
        .contact-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
        }
        .contact-links {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .contact-links a {
          font-size: 14px;
          color: #cbd5e1;
          text-decoration: none;
          transition: color 0.2s;
        }
        .contact-links a:hover {
          color: #fff;
        }
        .scroll-top-btn {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          transition: background 0.2s;
        }
        .scroll-top-btn:hover {
          background: rgba(255,255,255,0.2);
        }
        @media (min-width: 768px) {
          .contact-footer { padding: 80px 40px; }
          .contact-links { gap: 24px; }
          .scroll-top-btn { bottom: -20px; background: rgba(255,255,255,0.8); color: #1e293b; border: none; }
          .scroll-top-btn:hover { background: #fff; }
        }
      `}</style>

      {/* ── 사이트맵 (PC 전용) ── */}
      <div className="pc-sitemap">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 40 }}>
          {/* 1. 공실뉴스 */}
          <div className="sitemap-col">
            <div className="sitemap-title" style={{ fontSize: 18 }}>공실뉴스</div>
            <Link href="/news_gongsil" className="sitemap-link">아파트/오피스텔</Link>
            <Link href="/news_gongsil" className="sitemap-link">빌라/주택</Link>
            <Link href="/news_gongsil" className="sitemap-link">원룸/투룸(풀옵션)</Link>
            <Link href="/news_gongsil" className="sitemap-link">상가/사무실/공장/토지</Link>
            <Link href="/news_gongsil" className="sitemap-link">신축/분양/경매</Link>
          </div>

          {/* 2. 부동산 경제 */}
          <div className="sitemap-col">
            <div className="sitemap-title" style={{ fontSize: 18 }}>부동산 경제</div>
            <Link href="/news_politics" className="sitemap-link">부동산 정책/동향</Link>
            <Link href="/news_politics" className="sitemap-link">경제/재테크/주식</Link>
            <Link href="/news_politics" className="sitemap-link">법률/세무 지식</Link>
          </div>

          {/* 3. AI마케팅 */}
          <div className="sitemap-col">
            <div className="sitemap-title" style={{ fontSize: 18 }}>AI마케팅</div>
            <Link href="/news_marketing" className="sitemap-link">AI/NEWS</Link>
            <Link href="/news_marketing" className="sitemap-link">부동산유튜브/블로그</Link>
            <Link href="/news_marketing" className="sitemap-link">공실/임대관리</Link>
          </div>

          {/* 4. 라이프.오피니언 */}
          <div className="sitemap-col">
            <div className="sitemap-title" style={{ fontSize: 18 }}>라이프·오피니언</div>
            <Link href="/news_etc" className="sitemap-link">인물/인터뷰</Link>
            <Link href="/news_etc" className="sitemap-link">부동산/인테리어 꿀팁</Link>
            <Link href="/news_etc" className="sitemap-link">맛집/여행/건강</Link>
            <Link href="/news_etc" className="sitemap-link">자유 에세이</Link>
          </div>
          
          {/* 5. 플랫폼 서비스 */}
          <div className="sitemap-col">
            <div className="sitemap-title" style={{ fontSize: 18 }}>플랫폼 서비스</div>
            <Link href="/news_map" className="sitemap-link">우리동네뉴스 (공실열람)</Link>
            <Link href="/#special-lecture" className="sitemap-link">부동산특강</Link>
            <Link href="/board" className="sitemap-link">자료실 (드론/서식 등)</Link>
            <Link href="/board?id=free" className="sitemap-link">커뮤니티</Link>
          </div>
        </div>
      </div>
      
      <div className="contact-footer">
        <div className="contact-footer-inner">
        {/* ── 상단 내비게이션 링크 ── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div className="contact-links">
              <Link href="/about">회사소개</Link>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
              <Link href="/marketing">광고안내</Link>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
              <Link href="/partnership">제휴문의</Link>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
              <Link href="/terms">이용약관</Link>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
              <Link href="#" style={{ fontWeight: 700, color: "#fff" }}>개인정보 처리방침</Link>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
              <Link href="/youth-policy">청소년 보호정책</Link>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
              <Link href="#">고충처리</Link>
            </div>
            {/* 우측 파트너 로고/링크 */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>DATA PARTNER</span>
              <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4 }}>공공데이터포털</span>
              <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4 }}>국토교통부</span>
            </div>
          </div>
        </div>

        {/* ── 하단 회사 정보 ── */}
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* 로고 */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.2 }}>
              공실뉴스
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: -0.3 }}>GONGSIL NEWS</div>
          </div>

          {/* 회사 정보 */}
          <div style={{ flex: 1, minWidth: 300, fontSize: 13, color: "#94a3b8", lineHeight: 1.8, letterSpacing: -0.2 }}>
            <div>
              주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동)
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
              인터넷신문 등록번호 : 서울 아55037
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
              등록일자 : 2023.09.05
            </div>
            <div>
              제호 : 공실뉴스
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
              법인명 : (주)공실마케팅
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
              사업자등록번호 : 337-81-03010
            </div>
            <div>
              대표자·발행인 : 김윤경
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
              편집인 : 김동현
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 8px" }}>|</span>
              이메일 : master@gongsilnews.com
            </div>
            <div>
              고객센터 : 1555-5343 (평일 10:00~18:00)
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단 전재, 복사, 배포 등을 금합니다.(저작권 문의는 별도 안내)
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        <button 
          className="scroll-top-btn" 
          onClick={() => { if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          aria-label="맨 위로 가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>
      </div>
      </div>
    </footer>
  );
}

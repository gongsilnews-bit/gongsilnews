"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className="footer-container" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <style>{`
        .footer-container {
          width: 100%;
          background: #1e293b;
          color: #fff;
        }
        
        /* ── 사이트맵 (PC 전용) ── */
        .footer-sitemap-wrap {
          display: none;
          background: #f8f9fa;
          padding: 40px 20px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        @media (min-width: 768px) {
          .footer-sitemap-wrap {
            display: block;
          }
        }
        .footer-sitemap-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 30px;
        }
        .sitemap-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sitemap-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }
        .sitemap-link {
          font-size: 14px;
          color: #475569;
          text-decoration: none;
          transition: color 0.15s, font-weight 0.15s;
        }
        .sitemap-link:hover {
          color: #2563eb;
          font-weight: 600;
        }

        /* ── 메인 푸터 정보 ── */
        .footer-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 20px;
          box-sizing: border-box;
        }
        .footer-top-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 24px;
          margin-bottom: 32px;
        }
        .footer-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
        }
        .footer-links a {
          font-size: 14px;
          color: #cbd5e1;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: #fff;
        }
        .footer-links .divider {
          color: rgba(255, 255, 255, 0.15);
          font-size: 12px;
        }
        
        .footer-partners {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .partner-label {
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          letter-spacing: 0.5px;
        }
        .partner-badge {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
          padding: 4px 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.03);
        }

        /* 회사 정보 */
        .footer-info-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .footer-info-section {
            flex-direction: row;
            gap: 48px;
          }
        }
        .footer-brand {
          flex-shrink: 0;
        }
        .brand-logo {
          font-size: 22px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .brand-sub {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
          letter-spacing: 1px;
        }
        
        .footer-details {
          flex: 1;
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.8;
        }
        .details-row {
          margin-bottom: 4px;
        }
        .details-row span {
          color: rgba(255, 255, 255, 0.15);
          margin: 0 8px;
        }
        .footer-copyrights {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 12px;
          color: #64748b;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
      `}</style>

      {/* ── 사이트맵 (PC 전용) ── */}
      <div className="footer-sitemap-wrap">
        <div className="footer-sitemap-inner">
          <div className="sitemap-col">
            <h4 className="sitemap-title">공실뉴스</h4>
            <Link href="/news_gongsil" className="sitemap-link">아파트/오피스텔</Link>
            <Link href="/news_gongsil" className="sitemap-link">빌라/주택</Link>
            <Link href="/news_gongsil" className="sitemap-link">원룸/투룸(풀옵션)</Link>
            <Link href="/news_gongsil" className="sitemap-link">상가/사무실/공장/토지</Link>
            <Link href="/news_gongsil" className="sitemap-link">신축/분양/경매</Link>
          </div>
          <div className="sitemap-col">
            <h4 className="sitemap-title">부동산 경제</h4>
            <Link href="/news_politics" className="sitemap-link">부동산 정책/동향</Link>
            <Link href="/news_politics" className="sitemap-link">경제/재테크/주식</Link>
            <Link href="/news_politics" className="sitemap-link">법률/세무 지식</Link>
          </div>
          <div className="sitemap-col">
            <h4 className="sitemap-title">AI마케팅</h4>
            <Link href="/news_marketing" className="sitemap-link">AI/NEWS</Link>
            <Link href="/news_marketing" className="sitemap-link">부동산유튜브/블로그</Link>
            <Link href="/news_marketing" className="sitemap-link">공실/임대관리</Link>
          </div>
          <div className="sitemap-col">
            <h4 className="sitemap-title">라이프·오피니언</h4>
            <Link href="/news_etc" className="sitemap-link">인물/인터뷰</Link>
            <Link href="/news_etc" className="sitemap-link">부동산/인테리어 꿀팁</Link>
            <Link href="/news_etc" className="sitemap-link">맛집/여행/건강</Link>
            <Link href="/news_etc" className="sitemap-link">스포츠</Link>
            <Link href="/news_etc" className="sitemap-link">연예</Link>
            <Link href="/news_etc" className="sitemap-link">기타</Link>
          </div>
          <div className="sitemap-col">
            <h4 className="sitemap-title">공실마케팅</h4>
            <Link href="/gongsil" className="sitemap-link">공실열람</Link>
            <Link href="/news_map" className="sitemap-link">우리동네뉴스</Link>
            <Link href="/#special-lecture" className="sitemap-link">부동산특강</Link>
            <Link href="/board" className="sitemap-link">자료실</Link>
            <Link href="/board?id=free" className="sitemap-link">커뮤니티</Link>
          </div>
        </div>
      </div>

      {/* ── 메인 푸터 정보 ── */}
      <div className="footer-main">
        {/* 상단 링크 바 */}
        <div className="footer-top-bar">
          <div className="footer-links">
            <Link href="/about" onClick={scrollToTop}>회사소개</Link>
            <span className="divider">|</span>
            <Link href="/marketing" onClick={scrollToTop}>광고안내</Link>
            <span className="divider">|</span>
            <Link href="/partnership" onClick={scrollToTop}>제휴문의</Link>
            <span className="divider">|</span>
            <Link href="/terms" onClick={scrollToTop}>이용약관</Link>
            <span className="divider">|</span>
            <Link href="#" style={{ fontWeight: 700, color: "#fff" }}>개인정보 처리방침</Link>
            <span className="divider">|</span>
            <Link href="/youth-policy" onClick={scrollToTop}>청소년 보호정책</Link>
          </div>
          
          <div className="footer-partners">
            <span className="partner-label">DATA PARTNER</span>
            <span className="partner-badge">공공데이터포털</span>
            <span className="partner-badge">국토교통부</span>
          </div>
        </div>

        {/* 하단 회사 정보 */}
        <div className="footer-info-section">
          <div className="footer-brand">
            <div className="brand-logo">공실뉴스</div>
            <div className="brand-sub">GONGSIL NEWS</div>
          </div>
          
          <div className="footer-details">
            <div className="details-row">
              주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동)
              <span>|</span>
              인터넷신문 등록번호 : 서울 아55037
              <span>|</span>
              등록일자 : 2023.09.05
            </div>
            <div className="details-row">
              제호 : 공실뉴스
              <span>|</span>
              법인명 : (주)공실마케팅
              <span>|</span>
              사업자등록번호 : 337-81-03010
            </div>
            <div className="details-row">
              대표자·발행인 : 김윤경
              <span>|</span>
              편집인 : 김동현
              <span>|</span>
              이메일 : master@gongsilnews.com
            </div>
            <div className="details-row" style={{ fontWeight: 600, color: "#f1f5f9", marginTop: "8px" }}>
              고객센터 : 1555-5343 (평일 10:00~18:00)
            </div>
            
            <div className="footer-copyrights">
              <p>공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단 전재, 복사, 배포 등을 금합니다.(저작권 문의는 별도 안내)</p>
              <p>Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

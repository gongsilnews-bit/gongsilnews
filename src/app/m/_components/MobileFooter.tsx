import React from "react";
import Link from "next/link";
import FooterAuthButtons from "./FooterAuthButtons";

const CATEGORIES = [
  { label: "공실뉴스", href: "/m/news_gongsil" },
  { label: "부동산·경제", href: "/m/news_politics" },
  { label: "AI마케팅", href: "/m/news_marketing" },
  { label: "라이프·오피니언", href: "/m/news_etc" },
  { label: "공실열람", href: "/gongsil" },
  { label: "부동산특강", href: "/m/study" },
  { label: "자료실", href: "/m/board?id=drone" },
];

export default function MobileFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid #e5e7eb",
        background: "#f9fafb",
        fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif",
      }}
    >
      {/* ── 로고 ── */}
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid #ececec", textAlign: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#222", letterSpacing: -0.5 }}>
          공실뉴스
        </span>
        <span style={{ fontSize: 10, color: "#aaa", letterSpacing: 0.5, marginLeft: 6 }}>
          GONGSIL NEWS
        </span>
      </div>

      {/* ── 카테고리 바로가기 ── */}
      <div>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "15px 16px",
              borderBottom: "1px solid #f0f0f0",
              textDecoration: "none",
              color: "#333",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.3px",
            }}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* ── 로그인/PC보기 버튼 (Client Component) ── */}
      <FooterAuthButtons />

      {/* ── 법적 링크 ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "4px 0",
          padding: "14px 16px 10px",
          borderTop: "1px solid #ececec",
        }}
      >
        {[
          { label: "회사소개", href: "/m/about", bold: true },
          { label: "제휴문의", href: "/m/partnership", bold: true },
          { label: "이용약관", href: "/m/terms", bold: true },
          { label: "개인정보 처리방침", href: "#", bold: true },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <Link
              href={item.href}
              style={{
                fontSize: 12,
                color: item.bold ? "#222" : "#888",
                fontWeight: item.bold ? 700 : 400,
                textDecoration: "none",
                lineHeight: 1,
              }}
            >
              {item.label}
            </Link>
            {i < arr.length - 1 && (
              <span style={{ color: "#d1d5db", margin: "0 8px", fontSize: 10, userSelect: "none", lineHeight: 1 }}>
                |
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── 회사 정보 ── */}
      <div style={{ padding: "8px 16px 20px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            color: "#999",
            lineHeight: 1.8,
            letterSpacing: -0.2,
            wordBreak: "keep-all",
          }}
        >
          <div>주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동)</div>
          <div>
            인터넷신문 등록번호 : 서울 아55037
            <span style={{ color: "#d5d5d5", margin: "0 4px" }}>|</span>
            등록일자 : 2023.09.05
          </div>
          <div>
            제호 : 공실뉴스
            <span style={{ color: "#d5d5d5", margin: "0 4px" }}>|</span>
            법인명 : (주)공실마케팅
          </div>
          <div>사업자등록번호 : 337-81-03010</div>
          <div>
            대표자·발행인 : 김윤경
            <span style={{ color: "#d5d5d5", margin: "0 4px" }}>|</span>
            편집인 : 김동현
          </div>
          <div>이메일 : master@gongsilnews.com</div>
          <div>고객센터 : 1555-5343 (평일 10:00~18:00)</div>
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: "#bbb", lineHeight: 1.5 }}>
          공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단
          전재, 복사, 배포 등을 금합니다.
        </div>
        <div style={{ marginTop: 4, fontSize: 9.5, color: "#ccc" }}>
          Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

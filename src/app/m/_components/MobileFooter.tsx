import React from "react";
import Link from "next/link";

export default function MobileFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid #e5e7eb",
        background: "#f7f8fa",
        fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif",
        padding: "0 16px",
      }}
    >
      {/* ── 링크 영역 ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 0",
          padding: "14px 0 10px",
          borderBottom: "1px solid #ececec",
        }}
      >
        {[
          { label: "회사소개", href: "#" },
          { label: "광고안내", href: "#" },
          { label: "제휴문의", href: "#" },
          { label: "이용약관", href: "/terms" },
          { label: "개인정보 처리방침", href: "#", bold: true },
          { label: "청소년 보호정책", href: "/youth-policy" },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <Link
              href={item.href}
              style={{
                fontSize: 11,
                color: item.bold ? "#222" : "#777",
                fontWeight: item.bold ? 700 : 400,
                textDecoration: "none",
                lineHeight: 1,
              }}
            >
              {item.label}
            </Link>
            {i < arr.length - 1 && (
              <span
                style={{
                  color: "#d1d5db",
                  margin: "0 6px",
                  fontSize: 9,
                  userSelect: "none",
                  lineHeight: 1,
                }}
              >
                |
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── 회사 정보 ── */}
      <div style={{ padding: "12px 0 16px" }}>
        {/* 로고 */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: "#222",
              letterSpacing: -0.5,
            }}
          >
            공실뉴스
          </span>
          <span style={{ fontSize: 9, color: "#aaa", letterSpacing: 0.5 }}>
            GONGSIL NEWS
          </span>
        </div>

        {/* 정보 텍스트 */}
        <div
          style={{
            fontSize: 10.5,
            color: "#999",
            lineHeight: 1.75,
            letterSpacing: -0.2,
            wordBreak: "keep-all",
          }}
        >
          <div>
            주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동)
          </div>
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
          <div>
            사업자등록번호 : 337-81-03010
          </div>
          <div>
            대표자·발행인 : 김윤경
            <span style={{ color: "#d5d5d5", margin: "0 4px" }}>|</span>
            편집인 : 김동현
          </div>
          <div>
            고객센터 : 1555-5343 (평일 10:00~18:00)
          </div>
        </div>

        {/* 저작권 */}
        <div
          style={{
            marginTop: 10,
            fontSize: 9.5,
            color: "#bbb",
            lineHeight: 1.5,
          }}
        >
          공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단
          전재, 복사, 배포 등을 금합니다.
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 9,
            color: "#ccc",
          }}
        >
          Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

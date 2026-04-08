import React from "react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="f-logos">
          <div className="f-logo">공공데이터포털</div>
          <div className="f-logo">서울특별시</div>
          <div className="f-logo">국토교통부 실거래가</div>
        </div>
        <div className="f-links">
          <a href="#">회사소개</a> | <a href="#">이용약관</a> | <a href="#" style={{ color: "#000" }}>개인정보처리방침</a> | <a href="#">운영정책</a> | <a href="#">공지사항</a>
        </div>
        <div className="f-info">
          상호명: (주)공실뉴스 | 대표자: 능산이 | 사업자등록번호: 123-45-67890<br />
          통신판매업신고번호: 2026-서울강남-1234호 | 주소: 서울특별시 강남구 강남대로 123<br />
          고객센터: 1588-1234 (평일 10:00 ~ 18:00) | Email: help@gongsil.net
        </div>
        <div className="f-copyright">
          Copyright © GONGSIL NEWS. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

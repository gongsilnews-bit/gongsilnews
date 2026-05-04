import React from "react";
import Link from "next/link";

export const metadata = {
  title: "개인정보 처리방침 및 계정 삭제 안내 | 공실뉴스",
  description: "공실뉴스 앱 계정 삭제(회원 탈퇴) 및 개인정보 처리방침 안내입니다.",
};

export default function PrivacyHtmlPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", fontFamily: "'Noto Sans KR', sans-serif", lineHeight: 1.6, color: "#333" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", borderBottom: "2px solid #111", paddingBottom: "16px", marginBottom: "32px" }}>
        개인정보 처리방침 및 계정 삭제(회원 탈퇴) 안내
      </h1>
      
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1a73e8", marginBottom: "16px" }}>1. 계정 삭제(회원 탈퇴) 방법안내</h2>
        <p style={{ marginBottom: "12px" }}>공실뉴스 앱 사용자는 언제든지 본인의 계정 삭제(회원 탈퇴)를 요청할 수 있습니다. 계정을 삭제하면 회원님의 개인정보 및 서비스 이용 기록이 안전하게 파기됩니다.</p>
        
        <div style={{ background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", marginTop: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>📌 앱 내에서 직접 탈퇴하는 방법</h3>
          <ol style={{ paddingLeft: "20px", marginBottom: 0 }}>
            <li style={{ marginBottom: "8px" }}>공실뉴스 앱을 실행하고 로그인합니다.</li>
            <li style={{ marginBottom: "8px" }}>우측 상단의 <strong>[메뉴(☰)]</strong> 또는 하단의 <strong>[마이페이지]</strong>로 이동합니다.</li>
            <li style={{ marginBottom: "8px" }}>설정 메뉴 중 <strong>[회원 탈퇴]</strong> 메뉴를 선택합니다.</li>
            <li style={{ marginBottom: "0" }}>안내 사항을 확인한 후 탈퇴를 완료합니다.</li>
          </ol>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", marginTop: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>✉️ 고객센터를 통한 삭제 요청 방법</h3>
          <p style={{ marginBottom: "8px" }}>앱에 접근할 수 없거나 직접 탈퇴가 어려운 경우, 아래 고객센터로 요청해 주시면 본인 확인 후 즉시 삭제 처리해 드립니다.</p>
          <ul style={{ paddingLeft: "20px", marginBottom: 0 }}>
            <li><strong>이메일:</strong> gongsilnews@gmail.com (가입하신 이메일 주소 및 연락처 기재)</li>
            <li><strong>전화번호:</strong> 1588-0000 (공실뉴스 고객센터)</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1a73e8", marginBottom: "16px" }}>2. 데이터 보관 및 파기 정책</h2>
        <p style={{ marginBottom: "12px" }}>회원 탈퇴 시 원칙적으로 사용자의 모든 개인정보와 활동 기록(작성 게시물, 관심 매물 등)은 지체 없이 영구적으로 파기됩니다.</p>
        <p style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
          단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 관련 법령에서 정한 일정한 기간 동안 회원정보를 보관할 수 있습니다.
        </p>
      </section>

      <div style={{ textAlign: "center", marginTop: "48px" }}>
        <Link href="/" style={{ display: "inline-block", background: "#1a73e8", color: "#fff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>
          공실뉴스 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

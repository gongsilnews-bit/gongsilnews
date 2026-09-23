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
            <li><strong>이메일:</strong> master@gongsilnews.com (가입하신 이메일 주소 및 연락처 기재)</li>
            <li><strong>전화번호:</strong> 1555-5343 (공실뉴스 고객센터)</li>
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

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1a73e8", marginBottom: "16px" }}>3. 물건접수웹페이지를 통해 수집되는 정보</h2>
        <p style={{ marginBottom: "12px" }}>
          공실뉴스는 중개사 회원에게 물건접수웹페이지(<code>&#123;아이디&#125;.gongsilnews.com</code>)를 제공합니다.
          이 페이지의 접수 폼을 통해 임대인·임차인 등 <strong>회원이 아닌 분의 정보</strong>가 수집될 수 있으며, 그 처리 기준은 다음과 같습니다.
        </p>
        <ul style={{ marginBottom: "12px", paddingLeft: "20px", lineHeight: 1.9 }}>
          <li><strong>수집 항목</strong> — 이름, 연락처, 문의 내용(지역·희망 금액·메모·입주 희망일), 접수자가 직접 첨부한 물건 사진, 접속 정보(스팸 방지 목적으로만 쓰며 <strong>원본은 저장하지 않고 가림 처리한 값만</strong> 보관합니다)</li>
          <li><strong>수집 목적</strong> — 접수하신 물건에 대한 중개사의 상담 및 연락</li>
          <li><strong>보유 기간</strong> — <strong>마지막 상담일로부터 1년</strong>. 상담이 이어지는 동안에는 마지막 연락 시점을 기준으로 다시 계산합니다</li>
          <li><strong>기간이 지난 뒤</strong> — 첨부하신 사진은 삭제되고, 이름과 연락처는 다시 알아볼 수 없도록 가림 처리(예: 홍○○ / 010-****-1234)됩니다. 접수가 있었다는 기록만 남습니다</li>
          <li><strong>파기·열람 요청</strong> — 기간이 지나기 전이라도 접수하신 중개사무소 또는 공실뉴스(gongsilnews@gmail.com)로 요청하시면 지체 없이 파기합니다</li>
        </ul>
        <p style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
          접수하신 정보는 해당 중개사무소와 공실뉴스가 함께 보관하며, 상담 외의 목적으로 이용하거나 제3자에게 제공하지 않습니다.
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

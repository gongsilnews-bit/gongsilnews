import React from "react";
import Link from "next/link";

export const metadata = {
  title: "청소년 보호정책 | 공실뉴스",
  description: "공실뉴스 청소년 보호정책 안내 페이지입니다.",
};

export default function YouthPolicyPage() {
  const sectionStyle: React.CSSProperties = { marginBottom: 36 };
  const h2Style: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 12, paddingBottom: 10, borderBottom: "2px solid #111" };
  const h3Style: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#333", marginBottom: 8, marginTop: 20 };
  const pStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.85, color: "#444", marginBottom: 10, wordBreak: "keep-all" };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 36, borderBottom: "3px solid #1e56a0", paddingBottom: 16 }}>
        <Link href="/" style={{ textDecoration: "none", color: "#1e56a0", fontSize: 14, fontWeight: 600 }}>← 공실뉴스 홈</Link>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", margin: "16px 0 0", letterSpacing: -1 }}>청소년 보호정책</h1>
        <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>시행일: 2026년 1월 1일</p>
      </div>

      {/* 본문 */}
      <div style={sectionStyle}>
        <h2 style={h2Style}>1. 목적</h2>
        <p style={pStyle}>
          (주)공실뉴스(이하 &quot;회사&quot;)는 청소년이 건전한 인터넷 환경에서 부동산 정보를 이용할 수 있도록 청소년 보호를 위한 정책을 수립하고 시행합니다. 회사는 「청소년 보호법」 및 관련 법령에 따라 청소년에게 유해한 매체물 및 정보로부터 청소년을 보호하고, 건전한 성장을 지원하기 위해 다음과 같은 정책을 운영합니다.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>2. 청소년 보호를 위한 기본 원칙</h2>
        <p style={pStyle}>
          회사는 청소년이 유해 정보에 접근할 수 없도록 방지하며, 만 19세 미만의 청소년이 유해 매체물을 이용하지 못하도록 연령 확인 절차 등의 보호 장치를 마련합니다.
        </p>
        <ul style={{ ...pStyle, paddingLeft: 20, listStyleType: "disc" }}>
          <li>유해정보에 대한 청소년의 접근을 제한하고, 관리·감독합니다.</li>
          <li>유해정보로부터 청소년을 보호하기 위한 기술적 조치를 강구합니다.</li>
          <li>청소년 유해정보로 인한 피해 상담 및 고충 처리를 위한 전담 인력을 배치합니다.</li>
          <li>청소년 보호 관련 법령 및 제반 규정을 준수합니다.</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>3. 유해정보에 대한 청소년 접근 제한 및 관리</h2>
        <p style={pStyle}>
          회사는 서비스 내에서 청소년에게 유해한 정보가 노출되지 않도록 다음과 같은 조치를 시행합니다.
        </p>
        <h3 style={h3Style}>가. 유해정보 차단</h3>
        <p style={pStyle}>
          회사가 제공하는 부동산 뉴스, 공실 정보, 매물 정보, 커뮤니티 게시판 등에서 청소년에게 유해한 내용(폭력적·선정적·사행적 내용 등)이 게시되지 않도록 모니터링하며, 발견 시 즉시 삭제 또는 접근 차단 조치를 취합니다.
        </p>
        <h3 style={h3Style}>나. 게시물 모니터링</h3>
        <p style={pStyle}>
          회사는 이용자가 게시한 콘텐츠(댓글, 게시글, 이미지 등)를 주기적으로 모니터링하여 유해 게시물을 차단합니다. 또한, 이용자 신고 시스템을 운영하여 유해 정보에 대한 신속한 대응 체계를 유지합니다.
        </p>
        <h3 style={h3Style}>다. 연령 확인 조치</h3>
        <p style={pStyle}>
          유료 콘텐츠, 포인트 거래 등 특정 서비스 이용 시 본인인증(소셜 로그인 등)을 통해 연령을 확인하고, 만 19세 미만의 청소년의 경우 법정 대리인의 동의 없이는 결제 및 거래가 불가하도록 제한합니다.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>4. 청소년 유해정보 신고 및 상담</h2>
        <p style={pStyle}>
          회사는 청소년 유해정보로 인한 피해를 예방하고 상담할 수 있는 창구를 운영합니다. 이용자는 아래의 방법으로 유해정보를 신고하거나 상담을 요청할 수 있습니다.
        </p>
        <div style={{ background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "20px 24px", margin: "16px 0" }}>
          <p style={{ ...pStyle, marginBottom: 4 }}><strong>📧 이메일:</strong> help@gongsil.net</p>
          <p style={{ ...pStyle, marginBottom: 4 }}><strong>📞 전화:</strong> 1588-1234 (평일 10:00 ~ 18:00)</p>
          <p style={{ ...pStyle, marginBottom: 0 }}><strong>📮 주소:</strong> 서울특별시 강남구 강남대로 123, (주)공실뉴스 청소년보호 담당</p>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>5. 청소년 보호 책임자</h2>
        <p style={pStyle}>
          회사는 청소년 보호를 위하여 아래와 같이 청소년 보호 책임자를 지정하고 있습니다.
        </p>
        <div style={{ background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "20px 24px", margin: "16px 0" }}>
          <p style={{ ...pStyle, marginBottom: 4 }}><strong>청소년보호 책임자:</strong> 능산이 (대표이사)</p>
          <p style={{ ...pStyle, marginBottom: 4 }}><strong>청소년보호 담당자:</strong> 공실뉴스 운영팀</p>
          <p style={{ ...pStyle, marginBottom: 0 }}><strong>이메일:</strong> youth@gongsil.net</p>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>6. 청소년 보호를 위한 활동</h2>
        <ul style={{ ...pStyle, paddingLeft: 20, listStyleType: "disc" }}>
          <li>내부 정기 교육: 직원 대상 청소년 보호 관련 정기 교육 실시</li>
          <li>기술적 보호 조치: 유해 콘텐츠 필터링 시스템 운영</li>
          <li>자율 규제: 자체 콘텐츠 가이드라인 수립 및 준수</li>
          <li>외부 기관 협력: 방송통신심의위원회, 한국인터넷진흥원 등과 협력하여 청소년 보호 활동 강화</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>7. 기타</h2>
        <p style={pStyle}>
          본 정책은 2026년 1월 1일부터 시행됩니다. 본 정책의 내용 추가, 삭제 또는 수정이 있을 경우에는 시행 7일 전부터 공실뉴스 공지사항을 통하여 고지할 것입니다.
        </p>
      </div>

      {/* 하단 안내 */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20, fontSize: 12, color: "#aaa", textAlign: "center" }}>
        Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.
      </div>
    </div>
  );
}

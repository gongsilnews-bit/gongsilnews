import React from "react";
import Link from "next/link";

export const metadata = {
  title: "이용약관 | 공실뉴스",
  description: "공실뉴스 서비스 이용약관 안내 페이지입니다.",
};

export default function TermsPage() {
  const sectionStyle: React.CSSProperties = { marginBottom: 36 };
  const h2Style: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 12, paddingBottom: 10, borderBottom: "2px solid #111" };
  const h3Style: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#333", marginBottom: 8, marginTop: 20 };
  const pStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.85, color: "#444", marginBottom: 10, wordBreak: "keep-all" };
  const olStyle: React.CSSProperties = { ...pStyle, paddingLeft: 20 };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 36, borderBottom: "3px solid #1e56a0", paddingBottom: 16 }}>
        <Link href="/" style={{ textDecoration: "none", color: "#1e56a0", fontSize: 14, fontWeight: 600 }}>← 공실뉴스 홈</Link>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", margin: "16px 0 0", letterSpacing: -1 }}>이용약관</h1>
        <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>시행일: 2026년 1월 1일 | 최종 수정일: 2026년 4월 1일</p>
      </div>

      {/* 제1장 총칙 */}
      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "14px 20px", marginBottom: 28, fontSize: 14, fontWeight: 700, color: "#1e56a0" }}>제1장 총칙</div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제1조 (목적)</h2>
        <p style={pStyle}>
          본 약관은 (주)공실뉴스(이하 &quot;회사&quot;)가 운영하는 인터넷 사이트 &quot;공실뉴스&quot;(https://gongsil.net, 이하 &quot;사이트&quot;)에서 제공하는 부동산 정보 서비스, 공실·매물 중개망 서비스, 뉴스 콘텐츠 서비스 및 기타 관련 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제2조 (정의)</h2>
        <ol style={olStyle}>
          <li>&quot;서비스&quot;란 회사가 사이트를 통해 이용자에게 제공하는 부동산 뉴스, 공실 열람, 매물 등록, 공동중개, 포인트 거래, 자료실, 특강 등 일체의 서비스를 말합니다.</li>
          <li>&quot;이용자&quot;란 사이트에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
          <li>&quot;회원&quot;이란 사이트에 회원가입을 한 자로서, 회사가 제공하는 서비스를 이용할 수 있는 자를 말합니다.</li>
          <li>&quot;공인중개사 회원&quot;(이하 &quot;부동산 회원&quot;)이란 공인중개사 자격을 보유하고 별도의 인증 절차를 거쳐 매물 등록 및 공동중개 서비스를 이용하는 회원을 말합니다.</li>
          <li>&quot;포인트&quot;란 서비스 내에서 콘텐츠 구매, 자료 열람 등에 사용할 수 있는 회사가 발행하는 디지털 재화를 말합니다.</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제3조 (약관의 효력 및 변경)</h2>
        <ol style={olStyle}>
          <li>본 약관은 사이트에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.</li>
          <li>회사는 관련 법령에 위배되지 않는 범위에서 본 약관을 개정할 수 있으며, 약관이 변경되는 경우 최소 7일 전에 공지합니다.</li>
          <li>회원이 변경된 약관에 동의하지 않는 경우, 회원 탈퇴를 요청할 수 있으며, 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용할 경우 변경된 약관에 동의한 것으로 봅니다.</li>
        </ol>
      </div>

      {/* 제2장 회원가입 */}
      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "14px 20px", marginBottom: 28, fontSize: 14, fontWeight: 700, color: "#1e56a0" }}>제2장 서비스 이용 계약</div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제4조 (이용 계약의 체결)</h2>
        <ol style={olStyle}>
          <li>이용 계약은 이용자가 회원가입 시 본 약관에 동의하고, 회사가 이를 승낙함으로써 체결됩니다.</li>
          <li>회원가입은 소셜 로그인(Google, 카카오 등) 방식으로 이루어지며, 회사는 추가적인 본인 정보(이름, 연락처 등)를 요청할 수 있습니다.</li>
          <li>부동산 회원의 경우, 공인중개사 자격증 및 사업자 정보를 추가로 인증해야 합니다.</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제5조 (이용 계약의 거절 및 제한)</h2>
        <p style={pStyle}>회사는 다음 각 호에 해당하는 경우 이용 계약을 거절하거나 사후에 해지할 수 있습니다.</p>
        <ol style={olStyle}>
          <li>타인의 명의 또는 허위 정보를 이용하여 가입한 경우</li>
          <li>회사가 정하는 필수 정보를 입력하지 않은 경우</li>
          <li>이전에 본 약관 위반으로 회원 자격이 상실된 적이 있는 경우</li>
          <li>기타 관련 법령에 위배되거나 세부 지침에 반하는 경우</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제6조 (서비스의 내용)</h2>
        <p style={pStyle}>회사가 제공하는 서비스는 다음과 같습니다.</p>
        <ol style={olStyle}>
          <li>부동산 뉴스 및 칼럼 열람 서비스</li>
          <li>공실·매물 검색 및 열람 서비스 (공실열람, 지도 기반 탐색)</li>
          <li>공실·매물 등록 및 공동중개 서비스</li>
          <li>드론 영상 자료실 및 특강 서비스</li>
          <li>포인트 적립·사용·전송 서비스</li>
          <li>회원 간 커뮤니티(댓글, 리뷰 등) 서비스</li>
          <li>기타 회사가 추가 개발하거나 제휴를 통해 제공하는 일체의 서비스</li>
        </ol>
      </div>

      {/* 제3장 */}
      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "14px 20px", marginBottom: 28, fontSize: 14, fontWeight: 700, color: "#1e56a0" }}>제3장 서비스 이용</div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제7조 (서비스 이용 시간)</h2>
        <p style={pStyle}>
          서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간을 원칙으로 합니다. 다만, 시스템 점검, 긴급 보수 등의 사유가 발생하는 경우 서비스를 일시적으로 중단할 수 있으며, 이 경우 사전에 공지합니다.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제8조 (이용자의 의무)</h2>
        <p style={pStyle}>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
        <ol style={olStyle}>
          <li>허위 매물 정보를 등록하거나 타인의 정보를 도용하는 행위</li>
          <li>서비스를 통해 얻은 정보를 회사의 사전 승낙 없이 복제·유통·상업적으로 이용하는 행위</li>
          <li>타인의 명예를 손상시키거나 불이익을 주는 행위</li>
          <li>음란물, 불법 정보 등을 게시하거나 링크하는 행위</li>
          <li>회사의 서비스 운영을 고의로 방해하는 행위</li>
          <li>기타 관련 법령에 위반되는 행위</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제9조 (게시물의 관리)</h2>
        <ol style={olStyle}>
          <li>이용자가 서비스 내에 게시한 게시물의 저작권은 해당 이용자에게 있습니다.</li>
          <li>회사는 게시물이 관련 법령에 위반되거나 본 약관에 반하는 경우, 사전 통지 없이 해당 게시물을 삭제하거나 게시를 거부할 수 있습니다.</li>
          <li>회사는 서비스 운영·홍보 목적으로 이용자의 게시물을 사이트 내에서 노출할 수 있으며, 이를 위해 필요한 범위에서 수정·복제·편집할 수 있습니다.</li>
        </ol>
      </div>

      {/* 제4장 */}
      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "14px 20px", marginBottom: 28, fontSize: 14, fontWeight: 700, color: "#1e56a0" }}>제4장 포인트 및 결제</div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제10조 (포인트 정책)</h2>
        <ol style={olStyle}>
          <li>회사는 회원가입, 공실 등록, 이벤트 참여 등 특정 활동에 대해 포인트를 지급할 수 있습니다.</li>
          <li>포인트는 자료 열람, 특강 구매 등 서비스 내에서 지정된 용도로 사용할 수 있으며, 현금으로 환급되지 않습니다.</li>
          <li>포인트의 유효기간, 지급 기준, 사용 조건 등은 별도의 정책에 따르며, 회사는 정책을 변경할 수 있습니다.</li>
          <li>부정한 방법으로 포인트를 취득한 경우, 회사는 해당 포인트를 회수하고 이용을 제한할 수 있습니다.</li>
        </ol>
      </div>

      {/* 제5장 */}
      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "14px 20px", marginBottom: 28, fontSize: 14, fontWeight: 700, color: "#1e56a0" }}>제5장 기타</div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제11조 (면책 조항)</h2>
        <ol style={olStyle}>
          <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인해 서비스를 제공할 수 없는 경우에는 서비스 제공의 책임이 면제됩니다.</li>
          <li>회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
          <li>회사는 이용자가 서비스를 통해 게시 또는 전달하는 정보의 신뢰도, 정확성에 대해서는 보증하지 않으며, 이용자 간 또는 이용자와 제3자 간에 서비스를 매개로 한 거래에 대해 개입하지 않고 책임을 지지 않습니다.</li>
          <li>매물 정보의 정확성은 해당 매물을 등록한 이용자(부동산 회원 등)에게 있으며, 회사는 매물 정보의 사실 여부에 대해 보증하지 않습니다.</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>제12조 (분쟁 해결)</h2>
        <ol style={olStyle}>
          <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법령에 따르며, 서울중앙지방법원을 관할 법원으로 합니다.</li>
          <li>회사와 이용자 간에 제기된 소송에는 대한민국 법을 적용합니다.</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>부칙</h2>
        <p style={pStyle}>본 약관은 2026년 1월 1일부터 시행합니다.</p>
        <p style={pStyle}>본 약관에 명시되지 않은 사항은 관련 법령 및 회사가 정한 세부 이용 지침에 따릅니다.</p>
      </div>

      {/* 하단 */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20, fontSize: 12, color: "#aaa", textAlign: "center" }}>
        Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.
      </div>
    </div>
  );
}
